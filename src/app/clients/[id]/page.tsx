"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { ClientItem, ClientStatus, NoteItem } from "@/types/kam";
import { useWorkspace } from "@/components/AppShell";
import { ClientFullPage } from "@/components/ClientFullPage";
import { DeleteClientModal } from "@/components/DeleteClientModal";

export default function SingleClientRoutePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    activeUser,
    clients,
    refreshWorkspace,
    openQuickNote,
    openClientModal,
  } = useWorkspace();

  const [client, setClient] = useState<ClientItem | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!params?.id) return;
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      } else {
        setClient(null);
      }
    } finally {
      setLoadingClient(false);
    }
  }, [params?.id]);

  // Also sync whenever global workspace clients refresh (e.g. after editing client or adding note via modal)
  useEffect(() => {
    fetchClient();
  }, [fetchClient, clients]);

  async function handleConfirmDelete() {
    if (!client) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      await refreshWorkspace(activeUser?.id);
      router.push("/clients");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmArchive() {
    if (!client) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      setIsDeleteModalOpen(false);
      await fetchClient();
      await refreshWorkspace(activeUser?.id);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleChangeStatus(clientId: string, status: ClientStatus) {
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchClient();
    await refreshWorkspace(activeUser?.id);
  }

  async function handleDeleteNote(noteId: string) {
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    await fetchClient();
    await refreshWorkspace(activeUser?.id);
  }

  async function handleTogglePinNote(note: NoteItem) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    await fetchClient();
    await refreshWorkspace(activeUser?.id);
  }

  if (loadingClient) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement de la fiche client...
      </div>
    );
  }

  if (!client || !activeUser) {
    return (
      <div className="p-16 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Client introuvable
        </p>
        <button
          type="button"
          onClick={() => router.push("/clients")}
          className="px-4 py-2 rounded-lg bg-[#d90416] text-white text-xs font-semibold"
        >
          Retour aux clients
        </button>
      </div>
    );
  }

  return (
    <>
      <ClientFullPage
        client={client}
        activeKamId={activeUser.id}
        onBack={() => router.push("/clients")}
        onEditClient={(c) => openClientModal(c)}
        onDeleteClient={() => setIsDeleteModalOpen(true)}
        onChangeStatus={handleChangeStatus}
        onEditNote={(note) => openQuickNote({ note, clientId: client.id })}
        onDeleteNote={handleDeleteNote}
        onTogglePinNote={handleTogglePinNote}
        onRefresh={async () => {
          await fetchClient();
          await refreshWorkspace(activeUser.id);
        }}
      />

      {isDeleteModalOpen && client && (
        <DeleteClientModal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          clientName={client.company}
          onConfirmDelete={handleConfirmDelete}
          onConfirmArchive={handleConfirmArchive}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
