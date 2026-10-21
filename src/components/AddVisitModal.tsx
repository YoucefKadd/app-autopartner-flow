"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [createLinkedNote, setCreateLinkedNote] = useState<boolean>(true);
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setCreateLinkedNote(true);
      setNoteTitle("");

      if (selectedId) {
        const found = clients.find((c) => c.id === selectedId);
        setInterlocutor(found?.contactName || "");
        setRevisitInterval(getClientRevisitInterval(selectedId));
      }
    }
  }, [isOpen, defaultClientId, clients]);

  // When client changes, update default interlocutor and interval
  function handleClientSelect(newClientId: string) {
    setClientId(newClientId);
    const found = clients.find((c) => c.id === newClientId);
    if (found) {
      setInterlocutor(found.contactName || "");
      setRevisitInterval(getClientRevisitInterval(newClientId));
    }
  }

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !date || !summary.trim()) return;

    setSaving(true);
    try {
      // 1. Sauvegarder la visite structurée
      saveClientVisit({
        clientId,
        date,
        time,
        type,
        status,
        interlocutor: interlocutor.trim() || selectedClient?.contactName || "Contact magasin",
        summary: summary.trim(),
        nextVisitDate: nextVisitDate || null,
      });

      // 2. Mettre à jour l'intervalle de re-visite paramétré si modifié
      setClientRevisitInterval(clientId, revisitInterval);

      // 3. Créer une note synchronisée dans l'API sous la catégorie "VISITE"
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Visite terrain : ${CLIENT_VISIT_TYPES[type].label}`,
          content: `${summary.trim()}${
            interlocutor ? `\n\n**Interlocuteur rencontré :** ${interlocutor}` : ""
          }${
            nextVisitDate ? `\n**Prochaine visite convenue :** ${nextVisitDate}` : ""
          }`,
          category: "VISITE",
          clientId,
          kamId: activeKamId,
        }),
      });

      // 4. Mettre à jour lastContactAt du client dans l'API si la visite est effectuée
      if (status === "EFFECTUEE") {
        await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastContactAt: new Date(date).toISOString(),
          }),
        });
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
                Enregistrement daté, suivi et paramétrage du rythme de re-visite
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Sélection du Client */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
              Client visité *
            </label>
            <select
              required
              value={clientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} — {c.city || "Sans ville"} ({c.contactName})
                </option>
              ))}
            </select>
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
                <option value="ANNULEE">Visite annulée / reportée</option>
              </select>
            </div>
          </div>

          {/* Type de visite & Interlocuteur rencontré */}
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
                placeholder="Ex: M. Dupont (Gérant), Responsable atelier..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>
          </div>

          {/* Compte-rendu de la visite avec Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Compte-rendu & Échanges terrain *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Mise en forme supportée
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

          {/* Option Lier une note */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createLinkedNote}
                onChange={(e) => setCreateLinkedNote(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-zinc-700"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Lier automatiquement un compte-rendu dans les Notes du client</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  Recommandé
                </span>
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-6">
              Permet de retrouver ce compte-rendu dans le flux global des notes, dans le volet rétractable et dans l'historique du dossier.
            </p>

            {createLinkedNote && (
              <div className="pl-6 pt-1">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={`Objet personnalisé de la note (ex: Point visite comptoir ${selectedClient?.company || ""})...`}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}
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
              {saving ? "Enregistrement..." : "Enregistrer la visite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
