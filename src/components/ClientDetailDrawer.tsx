"use client";

import React from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Pin,
  FileText,
} from "lucide-react";
import {
  ClientItem,
  CLIENT_STATUS_CONFIG,
  NOTE_CATEGORIES,
  NoteItem,
  formatRelativeDate,
  getInitials,
} from "@/types/kam";

interface ClientDetailDrawerProps {
  client: ClientItem | null;
  onClose: () => void;
  onEditClient: (client: ClientItem) => void;
  onDeleteClient: (clientId: string) => void;
  onAddNoteForClient: (clientId: string) => void;
  onEditNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
}

export function ClientDetailDrawer({
  client,
  onClose,
  onEditClient,
  onDeleteClient,
  onAddNoteForClient,
  onEditNote,
  onDeleteNote,
}: ClientDetailDrawerProps) {
  if (!client) return null;

  const statusConfig =
    CLIENT_STATUS_CONFIG[client.status] || CLIENT_STATUS_CONFIG.ACTIVE;
  const clientNotes = client.notes || [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#d90416] to-[#a80210] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {client.company.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {client.company}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {client.contactName} · {client.position}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditClient(client)}
              title="Modifier le client"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteClient(client.id)}
              title="Supprimer le client"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Health */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 bg-zinc-50/40 dark:bg-zinc-950/40">
              <span className="text-[11px] text-zinc-400 block mb-1.5">
                Statut
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusConfig.badgeClass}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
                />
                {statusConfig.label}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-zinc-400">Santé (Health)</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {client.healthScore}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    client.healthScore >= 80
                      ? "bg-emerald-500"
                      : client.healthScore >= 60
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${client.healthScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <a
                href={`mailto:${client.email}`}
                className="font-medium text-zinc-800 dark:text-zinc-200 hover:underline"
              >
                {client.email || "Non renseigné"}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Phone className="w-3.5 h-3.5" /> Téléphone
              </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {client.phone || "Non renseigné"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5" /> Ville
              </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {client.city || "Non renseignée"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3.5 h-3.5" /> Dernier contact
              </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {formatRelativeDate(client.lastContactAt)}
              </span>
            </div>
          </div>

          {/* Notes linked to this client */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Notes liées ({clientNotes.length})
              </h3>
              <button
                onClick={() => onAddNoteForClient(client.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une note
              </button>
            </div>

            {clientNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
                <FileText className="w-5 h-5 text-zinc-400 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Aucune note pour ce client.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {clientNotes.map((note) => {
                  const catConfig =
                    NOTE_CATEGORIES.find((c) => c.value === note.category) ||
                    NOTE_CATEGORIES[0];
                  return (
                    <div
                      key={note.id}
                      className="group rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 bg-zinc-50/40 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {note.pinned && (
                            <Pin className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${catConfig.badgeClass}`}
                          >
                            {catConfig.label}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {formatRelativeDate(note.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditNote(note)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {note.title && (
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                          {note.title}
                        </p>
                      )}
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
