"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Pin,
  Building2,
  Pencil,
  Trash2,
  Search,
  Tag,
  FileText,
  Clock,
  Calendar,
  Compass,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Maximize2,
  CheckSquare,
} from "lucide-react";
import {
  ClientItem,
  NOTE_CATEGORIES,
  NoteCategory,
  NoteItem,
  formatFullTimestamp,
} from "@/types/kam";
import { NoteFormattingToolbar, FormattedNoteText, stripMarkdown } from "@/components/NoteFormatter";
import { useWorkspace } from "@/components/AppShell";

interface NotesTabProps {
  notes: NoteItem[];
  clients: ClientItem[];
  activeKamId: string;
  onRefresh: () => void;
  onOpenNewNoteModal: () => void;
  onEditNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (note: NoteItem) => void;
  onOpenAddVisitModal?: () => void;
}


export function NotesTab({
  notes,
  clients,
  activeKamId,
  onRefresh,
  onOpenNewNoteModal,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onOpenAddVisitModal,
}: NotesTabProps) {
  const { openQuickTask, refreshWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [convertingNoteId, setConvertingNoteId] = useState<string | null>(null);

  async function handleConvertNoteToTask(note: NoteItem) {
    setConvertingNoteId(note.id);
    try {
      const taskTitle =
        note.title?.trim() ||
        stripMarkdown(note.content).slice(0, 75) ||
        "Suivi de note KAM";
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: note.content,
          status: "TODO",
          category: note.category === "VISITE" ? "VISITE" : "SUIVI",
          priority: Boolean(note.pinned),
          clientId: note.clientId || null,
          kamId: activeKamId,
        }),
      });
      if (res.ok) {
        const createdTask = await res.json();
        await refreshWorkspace();
        onRefresh();
        openQuickTask({ task: createdTask, clientId: note.clientId || null });
      }
    } finally {
      setConvertingNoteId(null);
    }
  }
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  // Inline note composer state
  const [inlineContent, setInlineContent] = useState("");
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineCategory, setInlineCategory] = useState<NoteCategory>("VISITE");
  const [inlineClientId, setInlineClientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Client Autocomplete / Searchable dropdown state for inline composer
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matchingClients = clients.filter((c) => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      c.company.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const selectedClientObject = clients.find((c) => c.id === inlineClientId);

  async function handleInlineCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inlineTitle,
          content: inlineContent,
          category: inlineCategory,
          clientId: inlineClientId || null,
          kamId: activeKamId,
        }),
      });
      if (res.ok) {
        setInlineTitle("");
        setInlineContent("");
        setInlineCategory("VISITE");
        setInlineClientId("");
        setClientSearchQuery("");
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !search.trim() ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
      (n.client?.company &&
        n.client.company.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || n.category === selectedCategory;

    const matchesClient =
      selectedClientFilter === "ALL" ||
      (selectedClientFilter === "FREE_ONLY" && !n.clientId) ||
      n.clientId === selectedClientFilter;

    return matchesSearch && matchesCategory && matchesClient;
  });

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      {/* Quick Inline Capture Box */}
      <form
        onSubmit={handleInlineCreate}
        className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            placeholder="Titre de la note ou compte-rendu (ex: Visite de routine, Négociation remise, Compte-rendu terrain...)"
            className="w-full text-sm font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            {onOpenAddVisitModal && (
              <button
                type="button"
                onClick={onOpenAddVisitModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-[#d90416] hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                title="Consigner ou planifier une visite avec interlocuteur, type et délai de re-visite"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>+ Visite complète</span>
              </button>
            )}
            <span className="text-[11px] text-[#d90416] font-bold uppercase tracking-wider shrink-0 hidden sm:inline px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40">
              Prise de note & Visite KAM
            </span>
          </div>
        </div>

        <NoteFormattingToolbar
          textareaRef={inlineTextareaRef}
          value={inlineContent}
          onChange={setInlineContent}
        />

        <textarea
          ref={inlineTextareaRef}
          rows={3}
          value={inlineContent}
          onChange={(e) => setInlineContent(e.target.value)}
          placeholder="Rédigez les détails de votre visite ou note (objectifs abordés, stock magasin, commandes en attente, interlocuteurs rencontrés)..."
          className="w-full text-xs bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-3.5 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-[#d90416] resize-none leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Searchable Client Input with Autocomplete */}
            <div ref={clientDropdownRef} className="relative w-full sm:w-auto">
              <div
                onClick={() => setIsClientDropdownOpen(true)}
                className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-auto"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                  <input
                    type="text"
                    value={
                      isClientDropdownOpen
                        ? clientSearchQuery
                        : selectedClientObject
                        ? selectedClientObject.company
                        : clientSearchQuery
                    }
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Taper pour rechercher un client..."
                    className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none w-full sm:w-56 font-medium"
                  />
                </div>
                {inlineClientId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineClientId("");
                      setClientSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs ml-1 p-0.5"
                  >
                    ×
                  </button>
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isClientDropdownOpen && (
                <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-72 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-zinc-800">
                  <div
                    onClick={() => {
                      setInlineClientId("");
                      setClientSearchQuery("");
                      setIsClientDropdownOpen(false);
                    }}
                    className="p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                  >
                    <span>— Note libre (aucun client) —</span>
                    {!inlineClientId && <Check className="w-3.5 h-3.5 text-[#d90416]" />}
                  </div>

                  {matchingClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setInlineClientId(c.id);
                        setClientSearchQuery(c.company);
                        setIsClientDropdownOpen(false);
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                        inlineClientId === c.id ? "bg-red-50 dark:bg-zinc-800 font-bold" : ""
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100">
                          {c.company}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                          {c.contactName} {c.city ? `• ${c.city}` : ""}
                        </p>
                      </div>
                      {inlineClientId === c.id && (
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
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 w-full sm:w-auto">
              <Tag className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
              <select
                value={inlineCategory}
                onChange={(e) => setInlineCategory(e.target.value as NoteCategory)}
                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                {NOTE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !inlineContent.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#d90416] text-white hover:bg-[#b80312] disabled:opacity-40 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            {submitting ? "Enregistrement..." : "Enregistrer la note"}
          </button>
        </div>
      </form>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills horizontally scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-colors ${
              selectedCategory === "ALL"
                ? "bg-[#d90416] text-white shadow-sm"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Toutes ({notes.length})
          </button>
          {NOTE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? "bg-[#d90416] text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="w-full sm:w-auto rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tous les types (Clients + Libres)</option>
            <option value="FREE_ONLY">Notes libres uniquement</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                Client : {c.company}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-0.5 bg-white dark:bg-zinc-900 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Vue Grille / Cartes"
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === "cards"
                  ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold shadow-2xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Vue Liste Détaillée & Lisible"
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === "list"
                  ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold shadow-2xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une note..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900">
          <FileText className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Aucune note trouvée
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Ajoutez une note de visite ou compte-rendu ci-dessus.
          </p>
        </div>
      ) : (
        viewMode === "list" ? (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const catCfg =
              NOTE_CATEGORIES.find((c) => c.value === note.category) ||
              NOTE_CATEGORIES[0];
            return (
              <div
                key={note.id}
                className="group rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/30">
                        <Pin className="w-3 h-3 fill-current" /> Épinglée
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${catCfg.badgeClass}`}>
                      {catCfg.label}
                    </span>
                    {note.client ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100">
                        <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                        {note.client.company}
                        {note.client.contactName && (
                          <span className="text-slate-400 font-normal">({note.client.contactName})</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
                        Note libre
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <Clock className="w-3.5 h-3.5 text-[#d90416]" />
                      {formatFullTimestamp(note.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleConvertNoteToTask(note)}
                        disabled={convertingNoteId === note.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-[#d90416] text-[#d90416] hover:text-white dark:bg-red-950/40 dark:hover:bg-[#d90416] text-[11px] font-bold transition cursor-pointer"
                        title="Transformer cette note en tâche Kanban / rappel lié au client"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{convertingNoteId === note.id ? "Création..." : "+ Tâche / Rappel"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePin(note)}
                        title={note.pinned ? "Désépingler" : "Épingler"}
                        className={`p-1.5 rounded-lg transition ${
                          note.pinned
                            ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
                            : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {note.title && (
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    {note.title}
                  </h3>
                )}

                <div className="bg-slate-50/70 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 text-xs sm:text-sm">
                  <FormattedNoteText content={note.content} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const catCfg =
              NOTE_CATEGORIES.find((c) => c.value === note.category) ||
              NOTE_CATEGORIES[0];

            return (
              <div
                key={note.id}
                className="group rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${catCfg.badgeClass}`}
                      >
                        {catCfg.label}
                      </span>
                      {note.client ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                          <Building2 className="w-3 h-3 text-[#d90416]" />
                          {note.client.company}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                          Libre
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleConvertNoteToTask(note)}
                        disabled={convertingNoteId === note.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-[#d90416] text-[#d90416] hover:text-white dark:bg-red-950/40 dark:hover:bg-[#d90416] text-[10px] font-bold transition cursor-pointer"
                        title="Transformer en tâche Kanban / rappel"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>{convertingNoteId === note.id ? "..." : "+ Tâche"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePin(note)}
                        title={note.pinned ? "Désépingler" : "Épingler"}
                        className={`p-1 rounded transition-colors ${
                          note.pinned
                            ? "text-amber-500"
                            : "text-zinc-400 dark:text-zinc-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        className="p-1 rounded text-zinc-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-zinc-800 dark:hover:text-zinc-200 transition-opacity"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 rounded text-zinc-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 transition-opacity"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {note.title && (
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
                      {note.title}
                    </h4>
                  )}

                  <FormattedNoteText content={note.content} />
                </div>

                {/* Note Footer : Horodatage précis (date + heure) */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                    <Clock className="w-3 h-3 text-[#d90416]" />
                    <span>{formatFullTimestamp(note.createdAt)}</span>
                  </div>
                  {note.client && (
                    <span className="truncate max-w-[130px] font-medium text-slate-700 dark:text-zinc-300">
                      {note.client.contactName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )
      )}
    </div>
  );
}
