"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Building2, Upload, Trash2, Image as ImageIcon, MapPin } from "lucide-react";
import { ClientItem, ClientStatus, CLIENT_STATUS_CONFIG } from "@/types/kam";
import { AddressAutocomplete, AddressSuggestion } from "@/components/AddressAutocomplete";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeKamId: string;
  editingClient?: ClientItem | null;
  onSaved: () => void;
}

export function ClientFormModal({
  isOpen,
  onClose,
  activeKamId,
  editingClient = null,
  onSaved,
}: ClientFormModalProps) {
  // All fields are strictly blank for new client creation as requested
  const [company, setCompany] = useState("");
  const [apClientNumber, setApClientNumber] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<ClientStatus>("NEW");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingClient) {
      setCompany(editingClient.company || "");
      setContactName(editingClient.contactName || "");
      setPosition(editingClient.position || "");
      setEmail(editingClient.email || "");
      setPhone(editingClient.phone || "");
      setCity(editingClient.city || "");
      setStatus(editingClient.status || "ACTIVE");

      // Load extended local data if present
      const savedAp = localStorage.getItem(`apflow_apcode_${editingClient.id}`);
      setApClientNumber(savedAp || "");

      const savedCp = localStorage.getItem(`apflow_cp_${editingClient.id}`);
      setPostalCode(savedCp || "");

      const savedStreet = localStorage.getItem(`apflow_street_${editingClient.id}`);
      setAddressStreet(savedStreet || "");

      const savedCoords = localStorage.getItem(`apflow_coords_${editingClient.id}`);
      if (savedCoords) {
        try {
          setCoordinates(JSON.parse(savedCoords));
        } catch {}
      }

      const savedLogo = localStorage.getItem(`apflow_logo_${editingClient.id}`);
      setLogoUrl(savedLogo || "");
    } else {
      // Strictly blank fields for a new client!
      setCompany("");
      setApClientNumber("");
      setAddressStreet("");
      setContactName("");
      setPosition("");
      setEmail("");
      setPhone("");
      setCity("");
      setPostalCode("");
      setCoordinates(null);
      setStatus("NEW");
      setLogoUrl("");
    }
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert and compress logo to JPEG/WebP dataUrl
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setLogoUrl(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !contactName.trim()) return;
    setSaving(true);
    try {
      const url = editingClient
        ? `/api/clients/${editingClient.id}`
        : "/api/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          contactName: contactName.trim(),
          position: position.trim() || "Responsable Magasin",
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          status,
          healthScore: 85,
          lastContactAt: new Date().toISOString(),
          kamId: activeKamId,
        }),
      });

      if (res.ok) {
        const createdClient: ClientItem = await res.json();
        const targetId = editingClient?.id || createdClient.id;

        // Persist local extra properties (Logo, Code AP, Code Postal, Adresse, Coordonnées)
        if (targetId) {
          if (logoUrl) {
            localStorage.setItem(`apflow_logo_${targetId}`, logoUrl);
          } else {
            localStorage.removeItem(`apflow_logo_${targetId}`);
          }
          window.dispatchEvent(
            new CustomEvent("apflow_logo_changed", {
              detail: { clientId: targetId, logo: logoUrl },
            })
          );

          if (apClientNumber.trim()) {
            localStorage.setItem(`apflow_apcode_${targetId}`, apClientNumber.trim());
            try {
              const existingFiche = localStorage.getItem(`apflow_fiche_v4_${targetId}`);
              const fObj = existingFiche ? JSON.parse(existingFiche) : {};
              fObj.apClientNumber = apClientNumber.trim();
              localStorage.setItem(`apflow_fiche_v4_${targetId}`, JSON.stringify(fObj));
            } catch {}
            window.dispatchEvent(
              new CustomEvent("apflow_apcode_changed", {
                detail: { clientId: targetId, apCode: apClientNumber.trim() },
              })
            );
          }

          if (postalCode.trim()) {
            localStorage.setItem(`apflow_cp_${targetId}`, postalCode.trim());
            window.dispatchEvent(
              new CustomEvent("apflow_cp_changed", {
                detail: { clientId: targetId, cp: postalCode.trim() },
              })
            );
          }

          if (addressStreet.trim()) {
            localStorage.setItem(`apflow_street_${targetId}`, addressStreet.trim());
          }

          if (coordinates) {
            localStorage.setItem(`apflow_coords_${targetId}`, JSON.stringify(coordinates));
          }

          // Initialiser les contacts, adresses et canaux si création ou si non existants
          const existingAddresses = localStorage.getItem(`apflow_addresses_v4_${targetId}`);
          if (!existingAddresses || !editingClient) {
            const initialAddresses = (addressStreet.trim() || postalCode.trim() || city.trim())
              ? [
                  {
                    id: `a_siege_${Date.now()}`,
                    type: "SIEGE",
                    label: "Magasin Principal & Comptoir",
                    street: addressStreet.trim(),
                    postalCode: postalCode.trim(),
                    city: city.trim(),
                    zipCity: `${postalCode.trim()} ${city.trim()}`.trim(),
                    complement: "",
                    coordinates: coordinates || null,
                    isPrimary: true,
                  },
                ]
              : [];
            localStorage.setItem(`apflow_addresses_v4_${targetId}`, JSON.stringify(initialAddresses));
          }

          const existingContacts = localStorage.getItem(`apflow_contacts_v4_${targetId}`);
          if (!existingContacts || !editingClient) {
            const initialContacts = (contactName.trim() || email.trim() || phone.trim())
              ? [
                  {
                    id: `c_prim_${Date.now()}`,
                    role: position.trim() || "Responsable / Contact Principal",
                    name: contactName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    isPrimary: true,
                  },
                ]
              : [];
            localStorage.setItem(`apflow_contacts_v4_${targetId}`, JSON.stringify(initialContacts));
          }

          const existingChannels = localStorage.getItem(`apflow_channels_v4_${targetId}`);
          if (!existingChannels || !editingClient) {
            const initialChannels = (email.trim() || phone.trim())
              ? [
                  {
                    id: `ch_prim_${Date.now()}`,
                    type: "PRINCIPAL",
                    label: "Contact Général / Direction",
                    email: email.trim(),
                    phone: phone.trim(),
                  },
                ]
              : [];
            localStorage.setItem(`apflow_channels_v4_${targetId}`, JSON.stringify(initialChannels));
          }
        }

        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingClient
                  ? "Modifier la fiche distributeur / magasin"
                  : "Nouveau client (Création de compte)"}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Champs vierges à remplir pour enregistrer le nouveau compte client
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Logo Upload Section */}
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
            <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo client"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[9px] uppercase font-bold mt-0.5">Logo</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block mb-0.5">
                Logo du magasin / enseigne
              </label>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
                Format PNG, JPG ou WebP (converti et optimisé automatiquement)
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#d90416]" />
                  {logoUrl ? "Changer le logo" : "Téléverser un logo"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom du magasin */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nom du magasin / Enseigne *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nom du magasin (ex: Auto Pièces Express 31)"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Code AP */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Code Client AP (7 chiffres)
              </label>
              <input
                type="text"
                value={apClientNumber}
                onChange={(e) => setApClientNumber(e.target.value)}
                placeholder="Ex: 3306131"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Statut */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Statut du compte
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416] cursor-pointer"
              >
                {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map(
                  (st) => (
                    <option key={st} value={st}>
                      {CLIENT_STATUS_CONFIG[st].label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Adresse du Magasin avec autocomplétion BAN */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Adresse postale réelle (Recherche certifiée BAN)</span>
                <span className="text-[10px] text-emerald-600 font-medium">Auto-remplit CP & Ville</span>
              </label>
              <AddressAutocomplete
                value={addressStreet}
                onChange={setAddressStreet}
                onSelectAddress={(suggestion: AddressSuggestion) => {
                  setAddressStreet(suggestion.street || suggestion.label);
                  if (suggestion.postalCode) setPostalCode(suggestion.postalCode);
                  if (suggestion.city) setCity(suggestion.city);
                  if (suggestion.coordinates) setCoordinates(suggestion.coordinates);
                }}
                placeholder="Tapez l'adresse postale... (ex: 14 Rue de l'Industrie)"
              />
            </div>

            {/* Ville */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Ville
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Toulouse, Lyon, Paris..."
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Code Postal (CP) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Code Postal (CP)
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Ex: 31200"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: contact@magasin.fr"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Téléphone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 05 61 00 00 00"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Interlocuteur principal */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Interlocuteur principal *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nom & Prénom (ex: Nicolas Marty)"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Fonction */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Fonction
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex: Responsable Comptoir / Gérant"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !company.trim() || !contactName.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#d90416] text-white hover:bg-[#b80312] disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving
                ? "Enregistrement..."
                : editingClient
                ? "Valider les modifications"
                : "Créer le compte client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
