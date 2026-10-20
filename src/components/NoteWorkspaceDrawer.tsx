"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Pin,
  Building2,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
  Maximize2,
  Minimize2,
  Columns,
  Square,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Compass,
  ArrowRight,
  Split,
  ChevronDown,
  Check,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import {
  ClientItem,
  NoteItem,
  NoteCategory,
  NOTE_CATEGORIES,
  formatFullTimestamp,
} from "@/types/kam";
import { NoteFormattingToolbar, FormattedNoteText } from "@/components/NoteFormatter";

export type NoteDockMode = "dock" | "split" | "floating";

export interface NoteWorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientItem[];
  notes: NoteItem[];
  activeKamId: string;
  defaultClientId?: string | null;
  selectedNote?: NoteItem | null;
  onRefresh: () => void;
  onSelectNote?: (note: NoteItem | null) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (note: NoteItem) => void;
  dockMode?: NoteDockMode;
  onDockModeChange?: (mode: NoteDockMode) => void;
}

export function NoteWorkspaceDrawer({
  isOpen,
  onClose,
  clients,
  notes,
  activeKamId,
  defaultClientId = null,
  selectedNote = null,
  onRefresh,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
  dockMode: controlledDockMode,
  onDockModeChange,
}: NoteWorkspaceDrawerProps) {
  // Mode: "dock" (volet droit glissant 460px), "split" (partage moitié écran 50%), "floating" (fenêtre libre déplaçable / modale style navigateur)
  const [localDockMode, setLocalDockMode] = useState<NoteDockMode>("dock");
  const dockMode = controlledDockMode !== undefined ? controlledDockMode : localDockMode;

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategory>("VISITE");
  const [clientId, setClientId] = useState<string>("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentEditingNote, setCurrentEditingNote] = useState<NoteItem | null>(null);

  // Tab inside drawer: "editor" or "browser"
  const [activeTab, setActiveTab] = useState<"editor" | "list">("editor");

  // Filter in drawer note list
  const [listSearch, setListSearch] = useState("");
  const [listCategory, setListCategory] = useState<string>("ALL");

  // Searchable client state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Floating window position and size state
  const [floatingPos, setFloatingPos] = useState({ x: 100, y: 70 });
  const [floatingSize, setFloatingSize] = useState({ width: 540, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 100,
    posY: 70,
  });

  // Load dock mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("apflow_notes_dock_mode") as NoteDockMode;
    if (saved && (saved === "dock" || saved === "split" || saved === "floating")) {
      if (onDockModeChange) {
        onDockModeChange(saved);
      } else {
        setLocalDockMode(saved);
      }
    }
  }, []);

  function changeDockMode(mode: NoteDockMode) {
    if (onDockModeChange) {
      onDockModeChange(mode);
    } else {
      setLocalDockMode(mode);
    }
    localStorage.setItem("apflow_notes_dock_mode", mode);
  }

  // Handle outside click for client dropdown
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

  // Sync when selectedNote changes or drawer opens
  useEffect(() => {
    if (selectedNote) {
      setCurrentEditingNote(selectedNote);
      setTitle(selectedNote.title || "");
      setContent(selectedNote.content || "");
      setCategory((selectedNote.category as NoteCategory) || "VISITE");
      setClientId(selectedNote.clientId || "");
      setPinned(selectedNote.pinned || false);
      const matched = clients.find((c) => c.id === selectedNote.clientId);
      setClientSearchQuery(matched ? matched.company : "");
      setActiveTab("editor");
    } else {
      setCurrentEditingNote(null);
      setTitle("");
      setContent("");
      setCategory("VISITE");
      setClientId(defaultClientId || "");
      setPinned(false);
      const matched = clients.find((c) => c.id === defaultClientId);
      setClientSearchQuery(matched ? matched.company : "");
    }
  }, [selectedNote, defaultClientId, isOpen, clients]);

  // Handle Dragging in Floating window mode
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setFloatingPos({
        x: Math.max(10, Math.min(window.innerWidth - 300, dragRef.current.posX + deltaX)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.posY + deltaY)),
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

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
      const url = currentEditingNote ? `/api/notes/${currentEditingNote.id}` : "/api/notes";
      const method = currentEditingNote ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
          pinned,
          clientId: clientId || null,
          kamId: activeKamId,
        }),
      });
      if (res.ok) {
        onRefresh();
        // If it was a new note, clear or keep in editor mode
        if (!currentEditingNote) {
          setTitle("");
          setContent("");
          setPinned(false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCreateNew() {
    setCurrentEditingNote(null);
    setTitle("");
    setContent("");
    setPinned(false);
    setCategory("VISITE");
    if (defaultClientId) {
      setClientId(defaultClientId);
      const matched = clients.find((c) => c.id === defaultClientId);
      setClientSearchQuery(matched ? matched.company : "");
    } else {
      setClientId("");
      setClientSearchQuery("");
    }
    setActiveTab("editor");
  }

  function handleSelectFromList(note: NoteItem) {
    setCurrentEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setCategory((note.category as NoteCategory) || "VISITE");
    setClientId(note.clientId || "");
    setPinned(note.pinned || false);
    const matched = clients.find((c) => c.id === note.clientId);
    setClientSearchQuery(matched ? matched.company : "");
    setActiveTab("editor");
    if (onSelectNote) onSelectNote(note);
  }

  // Filter notes in the browser drawer tab
  const drawerFilteredNotes = notes.filter((n) => {
    const q = listSearch.toLowerCase();
    const matchQ =
      !q ||
      n.content.toLowerCase().includes(q) ||
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.client?.company && n.client.company.toLowerCase().includes(q));
    const matchCat = listCategory === "ALL" || n.category === listCategory;
    return matchQ && matchCat;
  });

  // Calculate panel dimensions according to dockMode
  // dock: fixed width on right (460px or max screen)
  // split: 50% width on right (split screen)
  // floating: draggable window with window-bar
  const isFloating = dockMode === "floating";
  const isSplit = dockMode === "split";

  return (
    <>
      {/* Backdrop ONLY for mobile or when floating window is minimized */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Main Drawer / Split-Screen / Floating Window Panel */}
      <div
        style={
          isFloating
            ? {
                left: `${floatingPos.x}px`,
                top: `${floatingPos.y}px`,
                width: `${floatingSize.width}px`,
                height: `${floatingSize.height}px`,
                position: "fixed",
                zIndex: 50,
              }
            : undefined
        }
        className={`bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-200 z-40 ${
          isFloating
            ? "rounded-2xl border border-slate-300 dark:border-zinc-700 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden"
            : `fixed top-0 right-0 bottom-0 ${
                isSplit ? "w-full md:w-1/2 lg:w-[48%]" : "w-full sm:w-[480px] lg:w-[500px]"
              }`
        }`}
      >
        {/* Top Window Bar (Browser / Window controls style) */}
        <div
          onMouseDown={(e) => {
            if (isFloating) {
              setIsDragging(true);
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                posX: floatingPos.x,
                posY: floatingPos.y,
              };
            }
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-950/80 select-none ${
            isFloating ? "cursor-move" : ""
          }`}
        >
          {/* Left: Window Tab / Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d90416]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === "editor"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                <Pencil className="w-3 h-3" />
                <span>{currentEditingNote ? "Éditer Note" : "Nouvelle Note"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === "list"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                <span>Consulter ({notes.length})</span>
              </button>
            </div>
          </div>

          {/* Right: Split Screen / Dock / Floating Controls + Close */}
          <div className="flex items-center gap-1">
            {/* Mode: Volet standard (Dock) */}
            <button
              type="button"
              onClick={() => changeDockMode("dock")}
              title="Mode Volet Latéral droit (480px)"
              className={`p-1.5 rounded-lg text-xs transition ${
                dockMode === "dock"
                  ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              }`}
            >
              <PanelRightClose className="w-4 h-4" />
            </button>

            {/* Mode: Split Screen 50% */}
            <button
              type="button"
              onClick={() => changeDockMode("split")}
              title="Mode Split Screen (50% de l'écran pour travailler en parallèle)"
              className={`p-1.5 rounded-lg text-xs transition hidden sm:inline-flex ${
                dockMode === "split"
                  ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              }`}
            >
              <Columns className="w-4 h-4" />
            </button>

            {/* Mode: Fenêtre Flottante libre (Style navigateur) */}
            <button
              type="button"
              onClick={() => changeDockMode("floating")}
              title="Mode Fenêtre Flottante déplaçable (comme une fenêtre de navigateur)"
              className={`p-1.5 rounded-lg text-xs transition hidden sm:inline-flex ${
                dockMode === "floating"
                  ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              }`}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-200 dark:border-zinc-800 mx-1" />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              title="Fermer le volet (votre brouillon reste accessible)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: NOTE EDITOR FORM */}
        {activeTab === "editor" && (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Editor Action Header */}
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de la note ou compte-rendu..."
                  className="w-full text-sm font-bold text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPinned(!pinned)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition ${
                      pinned
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{pinned ? "Épinglée" : "Épingler"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateNew}
                    title="Nouvelle note vierge"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Client Autocomplete & Category Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Searchable Client Picker */}
                <div ref={clientDropdownRef} className="relative flex-1">
                  <div
                    onClick={() => setIsClientDropdownOpen(true)}
                    className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Building2 className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                      <input
                        type="text"
                        value={
                          isClientDropdownOpen
                            ? clientSearchQuery
                            : selectedClient
                            ? selectedClient.company
                            : clientSearchQuery
                        }
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setIsClientDropdownOpen(true);
                        }}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        placeholder="Associer à un client (optionnel)..."
                        className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none w-full font-medium"
                      />
                    </div>
                    {clientId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientId("");
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

                  {/* Dropdown Options */}
                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-zinc-800">
                      <div
                        onClick={() => {
                          setClientId("");
                          setClientSearchQuery("");
                          setIsClientDropdownOpen(false);
                        }}
                        className="p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                      >
                        <span>— Note libre (aucun client associé) —</span>
                        {!clientId && <Check className="w-3.5 h-3.5 text-[#d90416]" />}
                      </div>

                      {matchingClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setClientId(c.id);
                            setClientSearchQuery(c.company);
                            setIsClientDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer hover:bg-red-50/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                            clientId === c.id ? "bg-red-50 dark:bg-zinc-800 font-bold" : ""
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
                          {clientId === c.id && (
                            <Check className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NoteCategory)}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    {NOTE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Markdown / Rich Text Toolbar */}
            <div className="px-4 py-2 bg-slate-50/60 dark:bg-zinc-950/40 border-b border-slate-100 dark:border-zinc-800">
              <NoteFormattingToolbar
                textareaRef={textareaRef}
                value={content}
                onChange={setContent}
              />
            </div>

            {/* Note Textarea */}
            <div className="flex-1 p-4 relative overflow-hidden flex flex-col">
              <textarea
                ref={textareaRef}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez ici vos notes, remarques client, besoin en pièces, relances, conditions commerciales ou compte-rendu terrain..."
                className="w-full flex-1 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/40 text-slate-900 dark:text-zinc-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] focus:bg-white dark:focus:bg-zinc-900 resize-none leading-relaxed transition-all"
              />
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/80 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d90416]" />
                <span>Raccourci : <strong>/</strong> ou <strong>N</strong> pour ouvrir</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition"
                >
                  Fermer
                </button>

                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{saving ? "Enregistrement..." : currentEditingNote ? "Mettre à jour" : "Enregistrer la note"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: NOTE LIST BROWSER (Consultation instantanée) */}
        {activeTab === "list" && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-zinc-950/30">
            {/* Search and Category Filter Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 space-y-2.5 bg-white dark:bg-zinc-900">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Rechercher dans toutes vos notes..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
                />
              </div>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setListCategory("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition ${
                    listCategory === "ALL"
                      ? "bg-[#d90416] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  Toutes ({notes.length})
                </button>
                {NOTE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setListCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition ${
                      listCategory === cat.value
                        ? "bg-[#d90416] text-white shadow-xs"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Cards Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {drawerFilteredNotes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aucune note trouvée.
                </div>
              ) : (
                drawerFilteredNotes.map((note) => {
                  const catCfg =
                    NOTE_CATEGORIES.find((c) => c.value === note.category) ||
                    NOTE_CATEGORIES[0];
                  const isCurrent = currentEditingNote?.id === note.id;

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleSelectFromList(note)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group bg-white dark:bg-zinc-900 ${
                        isCurrent
                          ? "border-[#d90416] ring-1 ring-[#d90416] shadow-sm"
                          : "border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catCfg.badgeClass}`}
                          >
                            {catCfg.label}
                          </span>
                          {note.client ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                              <Building2 className="w-2.5 h-2.5 text-[#d90416]" />
                              {note.client.company}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Libre</span>
                          )}
                          {note.pinned && (
                            <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onTogglePin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(note);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-500"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {note.title && (
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mb-1">
                          {note.title}
                        </h4>
                      )}

                      <div className="line-clamp-3 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                        <FormattedNoteText content={note.content} />
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5 text-[#d90416]" />
                          {formatFullTimestamp(note.createdAt)}
                        </span>
                        <span className="text-[#d90416] font-semibold group-hover:underline flex items-center gap-0.5">
                          Ouvrir <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick button to add new note */}
            <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full py-2 px-3 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Rédiger une nouvelle note</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
