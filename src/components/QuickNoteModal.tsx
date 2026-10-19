"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Pin, Building2, Tag, Sparkles, Check, ChevronDown, Search } from "lucide-react";
import { ClientItem, NOTE_CATEGORIES, NoteCategory, NoteItem } from "@/types/kam";
import { NoteFormattingToolbar } from "@/components/NoteFormatter";

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientItem[];
  activeKamId: string;
  defaultClientId?: string | null;
  editingNote?: NoteItem | null;
  onSaved: () => void;
}

export function QuickNoteModal({
  isOpen,
  onClose,
  clients,
  activeKamId,
  defaultClientId = null,
  editingNote = null,
  onSaved,
}: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategory>("VISITE");
  const [clientId, setClientId] = useState<string>("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // Searchable client state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || "");
      setContent(editingNote.content || "");
      setCategory((editingNote.category as NoteCategory) || "VISITE");
      setClientId(editingNote.clientId || "");
      setPinned(editingNote.pinned || false);
      const matched = clients.find((c) => c.id === editingNote.clientId);
      setClientSearchQuery(matched ? matched.company : "");
    } else {
      setTitle("");
      setContent("");
      setCategory("VISITE");
      setClientId(defaultClientId || "");
      setPinned(false);
      const matched = clients.find((c) => c.id === defaultClientId);
      setClientSearchQuery(matched ? matched.company : "");
    }
  }, [editingNote, defaultClientId, isOpen, clients]);

  if (!isOpen) return null;

  const matchingClients = clients.filter((c) => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      c.company.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const selectedClient = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const url = editingNote ? `/api/notes/${editingNote.id}` : "/api/notes";
      const method = editingNote ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
          clientId: clientId || null,
          pinned,
          kamId: activeKamId,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {editingNote ? "Modifier la note / visite" : "Nouvelle note / Visite client"}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              title="Épingler en haut"
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                pinned
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{pinned ? "Épinglée" : "Épingler"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre court (ex: Visite Magasin, Compte-rendu d'appel...)"
              className="w-full text-sm font-semibold bg-transparent border-0 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <NoteFormattingToolbar
              textareaRef={textareaRef}
              value={content}
              onChange={setContent}
            />
            <textarea
              ref={textareaRef}
              rows={4}
              autoFocus
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrivez le contenu de votre visite ou note..."
              className="w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-3.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416] resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Searchable Client Selector */}
            <div ref={dropdownRef} className="space-y-1.5 relative">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                Client associé
              </label>

              <div
                onClick={() => setIsDropdownOpen(true)}
                className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg px-2.5 py-2 cursor-pointer focus-within:border-[#d90416]"
              >
                <input
                  type="text"
                  value={
                    isDropdownOpen
                      ? clientSearchQuery
                      : selectedClient
                      ? selectedClient.company
                      : clientSearchQuery
                  }
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Taper le nom du client..."
                  className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none w-full"
                />
                {clientId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientId("");
                      setClientSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    ×
                  </button>
                ) : (
                  <Search className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </div>

              {/* Dropdown search results */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-zinc-800">
                  <div
                    onClick={() => {
                      setClientId("");
                      setClientSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className="p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                  >
                    <span>— Aucun (Note libre) —</span>
                    {!clientId && <Check className="w-3.5 h-3.5 text-[#d90416]" />}
                  </div>

                  {matchingClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setClientId(c.id);
                        setClientSearchQuery(c.company);
                        setIsDropdownOpen(false);
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                        clientId === c.id ? "bg-red-50 dark:bg-zinc-800 font-bold" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                          {c.company}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {c.contactName} {c.city ? `• ${c.city}` : ""}
                        </p>
                      </div>
                      {clientId === c.id && (
                        <Check className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                      )}
                    </div>
                  ))}

                  {matchingClients.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Aucun client trouvé pour &quot;{clientSearchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Tag className="w-3.5 h-3.5 text-[#d90416]" />
                Type de note
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer"
              >
                {NOTE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[11px] text-zinc-400">
              Note horodatée automatiquement lors de la validation
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !content.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#d90416] text-white hover:bg-[#b80312] disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving
                  ? "Enregistrement..."
                  : editingNote
                  ? "Valider la note"
                  : "Enregistrer la note"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
