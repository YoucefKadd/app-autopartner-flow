"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { NoteItem } from "@/types/kam";
import { useWorkspace } from "@/components/AppShell";
import { NotesTab } from "@/components/NotesTab";
import { AddVisitModal } from "@/components/AddVisitModal";

export default function NotesRoutePage() {
  const {
    activeUser,
    clients,
    notes,
    loading,
    refreshWorkspace,
    openQuickNote,
  } = useWorkspace();

  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);

  async function handleDeleteNote(noteId: string) {
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    refreshWorkspace(activeUser?.id);
  }

  async function handleTogglePin(note: NoteItem) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    refreshWorkspace(activeUser?.id);
  }

  if (loading || !activeUser) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement de vos notes...
      </div>
    );
  }

  return (
    <div className="w-full">
      <NotesTab
        notes={notes}
        clients={clients}
        activeKamId={activeUser.id}
        onRefresh={() => refreshWorkspace(activeUser.id)}
        onOpenNewNoteModal={() => openQuickNote()}
        onEditNote={(note) => openQuickNote({ note })}
        onDeleteNote={handleDeleteNote}
        onTogglePin={handleTogglePin}
        onOpenAddVisitModal={() => setIsAddVisitModalOpen(true)}
      />

      <AddVisitModal
        isOpen={isAddVisitModalOpen}
        onClose={() => setIsAddVisitModalOpen(false)}
        clients={clients}
        activeKamId={activeUser.id}
        onSaved={() => refreshWorkspace(activeUser.id)}
      />
    </div>
  );
}
