"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Building2,
  User,
  Tag,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  Sliders,
  AlertTriangle,
  Search,
  Check,
  CheckSquare,
  Flame,
} from "lucide-react";
import {
  ClientItem,
  ClientVisit,
  ClientVisitType,
  ClientVisitStatus,
  CLIENT_VISIT_TYPES,
} from "@/types/kam";
import {
  saveClientVisit,
  getClientRevisitInterval,
  setClientRevisitInterval,
  REVISIT_INTERVAL_OPTIONS,
} from "@/lib/visits";
import { NoteFormattingToolbar } from "@/components/NoteFormatter";

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientItem[];
  defaultClientId?: string | null;
  activeKamId: string;
  onSaved: () => void;
}

export function AddVisitModal({
  isOpen,
  onClose,
  clients,
  defaultClientId,
  activeKamId,
  onSaved,
}: AddVisitModalProps) {
  const [clientId, setClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
  const [type, setType] = useState<ClientVisitType>("ROUTINE");
  const [status, setStatus] = useState<ClientVisitStatus>("EFFECTUEE");
  const [interlocutor, setInterlocutor] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [revisitInterval, setRevisitInterval] = useState<number>(30);
  const [createFollowUpTask, setCreateFollowUpTask] = useState<boolean>(false);
  const [followUpTaskTitle, setFollowUpTaskTitle] = useState<string>("");
  const [followUpTaskDueDate, setFollowUpTaskDueDate] = useState<string>("");
  const [followUpTaskPriority, setFollowUpTaskPriority] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to get client AP Code from localStorage or client item
  function getClientApCode(cId: string): string {
    if (typeof window === "undefined") return "";
    const directCode = localStorage.getItem(`apflow_apcode_${cId}`);
    if (directCode) return directCode;
    try {
      const savedFiche = localStorage.getItem(`apflow_fiche_v4_${cId}`);
      if (savedFiche) {
        const parsed = JSON.parse(savedFiche);
        if (parsed.apClientNumber) return parsed.apClientNumber;
      }
    } catch {}
    const c = clients.find((x) => x.id === cId);
    return c?.apClientNumber || "";
  }

  useEffect(() => {
    if (isOpen) {
      const selectedId = defaultClientId || (clients.length > 0 ? clients[0].id : "");
      setClientId(selectedId);
      setDate(new Date().toISOString().slice(0, 10));
      setTime(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setType("ROUTINE");
      setStatus("EFFECTUEE");
      setSummary("");
      setNextVisitDate("");
      setCreateFollowUpTask(false);
      setFollowUpTaskTitle("");
      setFollowUpTaskDueDate("");
      setFollowUpTaskPriority(false);
      setIsClientDropdownOpen(false);

      if (selectedId) {
        const found = clients.find((c) => c.id === selectedId);
        const apCode = getClientApCode(selectedId);
        setClientSearch(
          found
            ? `${found.company} ${apCode ? `(N° AP: ${apCode})` : ""} — ${found.city || ""}`
            : ""
        );
        setInterlocutor(found?.contactName || "");
        setRevisitInterval(getClientRevisitInterval(selectedId));
      } else {
        setClientSearch("");
      }
    }
  }, [isOpen, defaultClientId, clients]);

  // Click outside to close client dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleClientSelect(c: ClientItem) {
    setClientId(c.id);
    const apCode = getClientApCode(c.id);
    setClientSearch(
      `${c.company} ${apCode ? `(N° AP: ${apCode})` : ""} — ${c.city || ""}`
    );
    setIsClientDropdownOpen(false);
    setInterlocutor(c.contactName || "");
    setRevisitInterval(getClientRevisitInterval(c.id));
  }

  // Filter clients by company name OR AP code OR city
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const apCode = getClientApCode(c.id).toLowerCase();
      const matchComp = c.company.toLowerCase().includes(q);
      const matchAp = apCode.includes(q);
      const matchCity = c.city?.toLowerCase().includes(q) || false;
      const matchContact = c.contactName?.toLowerCase().includes(q) || false;
      return matchComp || matchAp || matchCity || matchContact;
    });
  }, [clients, clientSearch]);

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !date || !summary.trim()) return;

    setSaving(true);
    try {
      // 1. Sauvegarder la visite en base via l'API dédiée
      // ET créer automatiquement la note associée (le compte-rendu devient la note unique)
      let visitId: string | undefined = undefined;
      try {
        const res = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            kamId: activeKamId,
            date,
            time,
            type,
            status,
            interlocutor:
              interlocutor.trim() || selectedClient?.contactName || "Contact magasin",
            summary: summary.trim(),
            nextVisitDate: nextVisitDate || null,
            createLinkedNote: true, // La note est créée directement avec le compte-rendu
            noteTitle: `Visite terrain : ${CLIENT_VISIT_TYPES[type].label}`,
            noteContent: `${summary.trim()}${
              interlocutor ? `\n\n**Interlocuteur rencontré :** ${interlocutor}` : ""
            }${
              nextVisitDate ? `\n**Prochaine visite convenue :** ${nextVisitDate}` : ""
            }`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          visitId = data.visit?.id;
        }
      } catch (errApi) {
        console.warn("API /api/visits error:", errApi);
      }

      // 2. Sauvegarder en local pour persistance immédiate
      saveClientVisit({
        clientId,
        date,
        time,
        type,
        status,
        interlocutor:
          interlocutor.trim() || selectedClient?.contactName || "Contact magasin",
        summary: summary.trim(),
        nextVisitDate: nextVisitDate || null,
      });

      // 3. Mettre à jour l'intervalle de re-visite paramétré si modifié
      setClientRevisitInterval(clientId, revisitInterval);

      // 4. Créer automatiquement une tâche de suivi dans le Kanban si l'option est cochée
      if (createFollowUpTask) {
        const finalTaskTitle =
          followUpTaskTitle.trim() ||
          `Suivi visite terrain — ${selectedClient?.company || "Client"} (${CLIENT_VISIT_TYPES[type].label})`;
        try {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: finalTaskTitle,
              description: `${summary.trim()}${
                interlocutor ? `\n\n**Interlocuteur :** ${interlocutor}` : ""
              }`,
              status: "TODO",
              category: "VISITE",
              priority: followUpTaskPriority,
              dueDate: followUpTaskDueDate || nextVisitDate || null,
              clientId,
              kamId: activeKamId,
            }),
          });
        } catch (errTask) {
          console.warn("Erreur création tâche de suivi visite:", errTask);
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Erreur enregistrement visite:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Consigner une visite client terrain
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Le compte-rendu alimentera directement les visites et les notes du client
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Recherche Client par Nom ou Code AP */}
          <div className="space-y-1 relative" ref={clientDropdownRef}>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                Client visité (Nom ou N° Client AP) *
              </span>
              {selectedClient && (
                <span className="text-[10px] font-mono text-[#d90416] font-bold">
                  N° AP : {getClientApCode(selectedClient.id) || "Non défini"}
                </span>
              )}
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setIsClientDropdownOpen(true);
                }}
                onFocus={() => setIsClientDropdownOpen(true)}
                placeholder="Tapez le nom de l'enseigne ou son code AP (ex: 3306131, CASZALOT)..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-9 pr-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Dropdown suggestions */}
            {isClientDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredClients.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Aucun client trouvé avec ce nom ou ce N° AP.
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const apCode = getClientApCode(c.id);
                    const isSelected = c.id === clientId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleClientSelect(c)}
                        className={`p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer flex items-center justify-between transition ${
                          isSelected ? "bg-red-50/50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>{c.company}</span>
                            {apCode && (
                              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-900 text-white font-bold">
                                AP: {apCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {c.city} — {c.contactName || "Sans contact"}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-[#d90416]" />}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Date, Heure et Statut de la visite */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                Date de la visite *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#d90416]" />
                Heure / Moment
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#d90416]" />
                État de la visite
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientVisitStatus)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              >
                <option value="EFFECTUEE">Visite effectuée</option>
                <option value="PLANIFIEE">Visite planifiée (à venir)</option>
                <option value="ANNULEE">Visite annulée</option>
              </select>
            </div>
          </div>

          {/* Type de visite & Interlocuteur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#d90416]" />
                Type de visite
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ClientVisitType)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              >
                {(Object.keys(CLIENT_VISIT_TYPES) as ClientVisitType[]).map((t) => (
                  <option key={t} value={t}>
                    {CLIENT_VISIT_TYPES[t].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#d90416]" />
                Interlocuteur rencontré
              </label>
              <input
                type="text"
                value={interlocutor}
                onChange={(e) => setInterlocutor(e.target.value)}
                placeholder="Ex: Responsable magasin, Gérant, Comptable..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>
          </div>

          {/* Compte-rendu & Échanges terrain (Note unique) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d90416]" />
                Compte-rendu & Échanges terrain *
              </label>
              <span className="text-[11px] text-slate-400 font-normal">
                Cette saisie sera la note créée sur le dossier
              </span>
            </div>
            <NoteFormattingToolbar
              textareaRef={textareaRef}
              value={summary}
              onChange={setSummary}
            />
            <textarea
              ref={textareaRef}
              rows={4}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Détails des points abordés : stock, livraisons, commandes en cours, conditions de remise, besoins pièces..."
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] resize-none leading-relaxed"
            />
          </div>

          {/* Paramétrage du rythme de Re-visite & Prochaine visite */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-100">
                <Sliders className="w-3.5 h-3.5 text-[#d90416]" />
                Rythme de re-visite client
              </div>
              <span className="text-[11px] font-semibold text-[#d90416] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                Tous les {revisitInterval} jours
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                  Fréquence souhaitée pour ce client :
                </label>
                <select
                  value={revisitInterval}
                  onChange={(e) => setRevisitInterval(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
                >
                  {REVISIT_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                  Prochaine visite convenue (optionnel) :
                </label>
                <input
                  type="date"
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
                />
              </div>
            </div>
          </div>

          {/* Option Création de Tâche de suivi Kanban */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-red-50/30 dark:bg-zinc-950/60 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createFollowUpTask}
                onChange={(e) => {
                  setCreateFollowUpTask(e.target.checked);
                  if (e.target.checked && !followUpTaskTitle) {
                    setFollowUpTaskTitle(
                      `Suivi visite ${selectedClient?.company || "client"} : action / relance`
                    );
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded text-[#d90416] focus:ring-[#d90416] border-slate-300 dark:border-zinc-700 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#d90416]" />
                  Créer une tâche de suivi dans le Kanban (Rappel / Action)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Crée automatiquement une carte Trello liée au client avec échéance et rappel
                </p>
              </div>
            </label>

            {createFollowUpTask && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Titre de la tâche de suivi :
                  </label>
                  <input
                    type="text"
                    value={followUpTaskTitle}
                    onChange={(e) => setFollowUpTaskTitle(e.target.value)}
                    placeholder="Ex: Relancer le client pour le RIB mardi, Envoyer devis pièces..."
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                      Date limite / Échéance :
                    </label>
                    <input
                      type="date"
                      value={followUpTaskDueDate}
                      onChange={(e) => setFollowUpTaskDueDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
                    />
                  </div>

                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={followUpTaskPriority}
                        onChange={(e) => setFollowUpTaskPriority(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#d90416] focus:ring-[#d90416] cursor-pointer"
                      />
                      <span className="flex items-center gap-1 text-[#d90416]">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        Marquer comme Prioritaire
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !clientId || !summary.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#d90416] text-white hover:bg-[#b80312] disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{saving ? "Enregistrement..." : "Enregistrer la visite"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
