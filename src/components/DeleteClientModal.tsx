"use client";

import React, { useState } from "react";
import { AlertTriangle, Archive, Trash2, X, ShieldAlert } from "lucide-react";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirmDelete: () => void;
  onConfirmArchive: () => void;
  isDeleting?: boolean;
}

export function DeleteClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirmDelete,
  onConfirmArchive,
  isDeleting = false,
}: DeleteClientModalProps) {
  const [confirmNameInput, setConfirmNameInput] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-950 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Action sur le client
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Suppression définitive ou archivage
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 dark:text-zinc-300">
            Que souhaitez-vous faire avec le client{" "}
            <strong className="text-slate-900 dark:text-zinc-100 font-bold">
              {clientName}
            </strong>{" "}
            ?
          </p>

          {/* Option 1 : Archiver (Recommandé) */}
          <div
            onClick={onConfirmArchive}
            className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 hover:border-slate-400 dark:hover:border-zinc-700 cursor-pointer transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 group-hover:bg-[#d90416] group-hover:text-white transition-colors shrink-0">
                <Archive className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Archiver le client
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Recommandé
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Le client passe au statut <strong>Archivé</strong>. Son historique, ses commandes et ses notes restent conservés en toute sécurité.
                </p>
              </div>
            </div>
          </div>

          {/* Option 2 : Supprimer définitivement */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-rose-700 dark:text-rose-400">
                  Suppression définitive
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Cette action efface définitivement le client et ses données associées. Cette opération est irréversible.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-100 dark:border-rose-900/30 space-y-1.5">
              <label className="text-[11px] text-slate-600 dark:text-zinc-400 block font-medium">
                Pour confirmer la suppression, tapez le nom du magasin :{" "}
                <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 select-all">
                  {clientName}
                </span>
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={(e) => setConfirmNameInput(e.target.value)}
                placeholder="Recopier le nom exact ici..."
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={confirmNameInput.trim().toLowerCase() !== clientName.trim().toLowerCase() || isDeleting}
            onClick={onConfirmDelete}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
