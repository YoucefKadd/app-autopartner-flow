"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Building2,
  Tag,
  Clock,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Flame,
  Calendar,
  Search,
  Columns,
  Split,
  Maximize2,
  ChevronDown,
  Check,
  Pencil,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Circle,
  ListChecks,
} from "lucide-react";
import {
  ClientItem,
  TaskItem,
  TaskStatus,
  TaskCategory,
  TaskChecklistItem,
  TASK_CATEGORIES,
  TASK_STATUS_CONFIG,
  parseTaskChecklist,
  formatFullTimestamp,
} from "@/types/kam";
import { NoteFormattingToolbar, FormattedNoteText } from "@/components/NoteFormatter";

export type TaskDockMode = "dock" | "split" | "floating";

export interface TaskWorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientItem[];
  tasks: TaskItem[];
  activeKamId: string;
  defaultClientId?: string | null;
  defaultStatus?: TaskStatus;
  selectedTask?: TaskItem | null;
  onRefresh: () => void;
  dockMode?: TaskDockMode;
  onDockModeChange?: (mode: TaskDockMode) => void;
}

export function TaskWorkspaceDrawer({
  isOpen,
  onClose,
  clients,
  tasks,
  activeKamId,
  defaultClientId = null,
  defaultStatus = "TODO",
  selectedTask = null,
  onRefresh,
  dockMode: controlledDockMode,
  onDockModeChange,
}: TaskWorkspaceDrawerProps) {
  const [localDockMode, setLocalDockMode] = useState<TaskDockMode>("dock");
  const dockMode = controlledDockMode !== undefined ? controlledDockMode : localDockMode;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [category, setCategory] = useState<TaskCategory>("COMMERCIAL");
  const [priority, setPriority] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [clientId, setClientId] = useState("");
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newCheckItemText, setNewCheckItemText] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentEditingTask, setCurrentEditingTask] = useState<TaskItem | null>(null);
  const [previewFormatted, setPreviewFormatted] = useState(false);

  // Drawer tabs: "editor" or "list"
  const [activeTab, setActiveTab] = useState<"editor" | "list">("editor");
  const [listSearch, setListSearch] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [listPriorityOnly, setListPriorityOnly] = useState(false);

  // Client searchable dropdown
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Floating window position
  const [floatingPos, setFloatingPos] = useState({ x: 120, y: 75 });
  const [floatingSize] = useState({ width: 560, height: 660 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 120,
    posY: 75,
  });

  useEffect(() => {
    const saved = localStorage.getItem("apflow_tasks_dock_mode") as TaskDockMode;
    if (saved && (saved === "dock" || saved === "split" || saved === "floating")) {
      if (onDockModeChange) {
        onDockModeChange(saved);
      } else {
        setLocalDockMode(saved);
      }
    }
  }, []);

  function changeDockMode(mode: TaskDockMode) {
    if (onDockModeChange) {
      onDockModeChange(mode);
    } else {
      setLocalDockMode(mode);
    }
    localStorage.setItem("apflow_tasks_dock_mode", mode);
  }

  // Close client dropdown on click outside
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

  // Sync form when selectedTask or defaultClientId changes
  useEffect(() => {
    if (selectedTask) {
      setCurrentEditingTask(selectedTask);
      setTitle(selectedTask.title || "");
      setDescription(selectedTask.description || "");
      setStatus((selectedTask.status as TaskStatus) || "TODO");
      setCategory((selectedTask.category as TaskCategory) || "COMMERCIAL");
      setPriority(Boolean(selectedTask.priority));
      setDueDate(selectedTask.dueDate || "");
      setDueTime(selectedTask.dueTime || "");
      setClientId(selectedTask.clientId || "");
      setChecklist(parseTaskChecklist(selectedTask.checklist));
      const matched = clients.find((c) => c.id === selectedTask.clientId);
      setClientSearchQuery(matched ? matched.company : selectedTask.client?.company || "");
      setActiveTab("editor");
    } else {
      setCurrentEditingTask(null);
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "TODO");
      setCategory("COMMERCIAL");
      setPriority(false);
      setDueDate("");
      setDueTime("");
      setClientId(defaultClientId || "");
      setChecklist([]);
      const matched = clients.find((c) => c.id === defaultClientId);
      setClientSearchQuery(matched ? matched.company : "");
    }
  }, [selectedTask, defaultClientId, defaultStatus, isOpen, clients]);

  // Dragging for floating window
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setFloatingPos({
        x: Math.max(10, Math.min(window.innerWidth - 320, dragRef.current.posX + deltaX)),
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

  function handleAddChecklistItem() {
    const trimmed = newCheckItemText.trim();
    if (!trimmed) return;
    setChecklist((prev) => [
      ...prev,
      { id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: trimmed, completed: false },
    ]);
    setNewCheckItemText("");
  }

  function handleToggleCheckItem(itemId: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  }

  function handleUpdateCheckItemText(itemId: string, text: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, text } : item))
    );
  }

  function handleRemoveCheckItem(itemId: string) {
    setChecklist((prev) => prev.filter((item) => item.id !== itemId));
  }

  function setQuickDueDate(daysFromNow: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDueDate(d.toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      if (currentEditingTask) {
        const res = await fetch(`/api/tasks/${currentEditingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
            category,
            priority,
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            clientId: clientId || null,
            checklist,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCurrentEditingTask(updated);
          onRefresh();
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
            category,
            priority,
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            clientId: clientId || null,
            checklist,
            kamId: activeKamId,
          }),
        });
        if (res.ok) {
          setTitle("");
          setDescription("");
          setChecklist([]);
          setPriority(false);
          setDueDate("");
          setDueTime("");
          onRefresh();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatusChange(task: TaskItem, nextStatus: TaskStatus) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (currentEditingTask?.id === task.id) {
      setStatus(nextStatus);
    }
    onRefresh();
  }

  async function handleDeleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (currentEditingTask?.id === taskId) {
      setCurrentEditingTask(null);
      setTitle("");
      setDescription("");
      setChecklist([]);
    }
    onRefresh();
  }

  const completedChecks = checklist.filter((i) => i.completed).length;
  const totalChecks = checklist.length;
  const checkProgress = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  const filteredClients = clients.filter((c) => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.company.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.apClientNumber && c.apClientNumber.toLowerCase().includes(q))
    );
  });

  const filteredDrawerTasks = tasks.filter((t) => {
    if (defaultClientId && t.clientId !== defaultClientId && activeTab === "list" && !listSearch) {
      // If opened from a client context and not searching globally, show all or filter
    }
    if (listStatusFilter !== "ALL" && t.status !== listStatusFilter) return false;
    if (listPriorityOnly && !t.priority) return false;
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchClient = t.client?.company.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchClient) return false;
    }
    return true;
  });

  const selectedClientObj = clients.find((c) => c.id === clientId);

  const containerClasses =
    dockMode === "floating"
      ? "fixed z-50 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
      : dockMode === "split"
      ? "fixed top-14 right-0 bottom-0 z-30 w-full md:w-1/2 lg:w-[48%] border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
      : "fixed top-14 right-0 bottom-0 z-30 w-full sm:w-[480px] lg:w-[520px] border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden";

  const containerStyle =
    dockMode === "floating"
      ? {
          left: `${floatingPos.x}px`,
          top: `${floatingPos.y}px`,
          width: `${floatingSize.width}px`,
          height: `${floatingSize.height}px`,
        }
      : undefined;

  return (
    <div className={containerClasses} style={containerStyle}>
      {/* TOP BAR */}
      <div
        onMouseDown={(e) => {
          if (dockMode === "floating") {
            setIsDragging(true);
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              posX: floatingPos.x,
              posY: floatingPos.y,
            };
          }
        }}
        className={`px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 flex items-center justify-between shrink-0 ${
          dockMode === "floating" ? "cursor-move select-none" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 text-[#d90416] flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                {currentEditingTask ? "Modifier la Tâche" : "Tâches & Checklist (Trello)"}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                {tasks.filter((t) => t.status !== "DONE").length} actives
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {dockMode === "dock"
                ? "Volet latéral droit"
                : dockMode === "split"
                ? "Écran partagé 50/50"
                : "Fenêtre flottante libre"}
            </p>
          </div>
        </div>

        {/* Display mode switchers + Link to /taches + Close */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-200/70 dark:bg-zinc-800 p-0.5 rounded-lg mr-1">
            <button
              type="button"
              onClick={() => changeDockMode("dock")}
              title="Afficher sur le côté (Volet latéral)"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                dockMode === "dock"
                  ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeDockMode("split")}
              title="Partager l'écran en 2 (50/50)"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                dockMode === "split"
                  ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeDockMode("floating")}
              title="Fenêtre flottante déplaçable"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                dockMode === "floating"
                  ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            href="/taches"
            onClick={onClose}
            title="Ouvrir le grand tableau Kanban des tâches"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#d90416] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* INTERNAL TABS: ÉDITEUR vs LISTE DES TÂCHES */}
      <div className="px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "editor"
                ? "bg-[#d90416] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{currentEditingTask ? "Fiche Tâche" : "Nouvelle Tâche"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "list"
                ? "bg-[#d90416] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Toutes les tâches ({tasks.length})</span>
          </button>
        </div>

        {currentEditingTask && (
          <button
            type="button"
            onClick={() => {
              setCurrentEditingTask(null);
              setTitle("");
              setDescription("");
              setChecklist([]);
              setPriority(false);
              setDueDate("");
              setDueTime("");
              setActiveTab("editor");
            }}
            className="text-[11px] font-semibold text-[#d90416] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Créer une autre</span>
          </button>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "editor" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Timestamp info if editing */}
            {currentEditingTask && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d90416]" />
                  <span>Créée le {formatFullTimestamp(currentEditingTask.createdAt)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(currentEditingTask.id)}
                  className="text-rose-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              </div>
            )}

            {/* 1. TITLE + PRIORITY TOGGLE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Titre de la tâche *
                </label>
                <button
                  type="button"
                  onClick={() => setPriority((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    priority
                      ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-rose-400"
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${priority ? "fill-current" : ""}`} />
                  <span>{priority ? "Prioritaire / Urgent" : "Marquer prioritaire"}</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Relancer le devis équipements garage / Vérifier code SAS..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* 2. STATUS (KANBAN COLUMN) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                État d&apos;avancement (Kanban)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((st) => {
                  const cfg = TASK_STATUS_CONFIG[st];
                  const isSelected = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? st === "DONE"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : st === "IN_PROGRESS"
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                            : "bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-slate-800 shadow-xs"
                          : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-400"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? "bg-white dark:bg-current" : cfg.dotClass
                        }`}
                      />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CLIENT ASSOCIÉ + CATÉGORIE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Client selector */}
              <div className="space-y-1.5 relative" ref={clientDropdownRef}>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#d90416]" />
                  <span>Client associé</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                      if (!e.target.value) setClientId("");
                    }}
                    placeholder="Rechercher un client / Code AP..."
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                  />
                  {clientId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setClientId("");
                        setClientSearchQuery("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>

                {selectedClientObj && (
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                    <span className="truncate font-semibold">
                      Lié à : {selectedClientObj.company}
                    </span>
                    <Link
                      href={`/clients/${selectedClientObj.id}`}
                      className="underline font-bold ml-2 shrink-0"
                    >
                      Voir fiche
                    </Link>
                  </div>
                )}

                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl z-40 divide-y divide-slate-100 dark:divide-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setClientId("");
                        setClientSearchQuery("");
                        setIsClientDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      — Tâche générale (sans client) —
                    </button>
                    {filteredClients.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(c.id);
                          setClientSearchQuery(c.company);
                          setIsClientDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-50/60 dark:hover:bg-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 dark:text-zinc-100">
                            {c.company}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            ({c.city})
                          </span>
                        </div>
                        {c.apClientNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 shrink-0">
                            {c.apClientNumber}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#d90416]" />
                  <span>Catégorie</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. DUE DATE & TIME */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                  <span>Date limite / Échéance</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDueDate(0)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
                  >
                    Aujourd&apos;hui
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDueDate(1)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDueDate(7)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
                  >
                    +7 jours
                  </button>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDueDate("");
                        setDueTime("");
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] text-rose-500 hover:bg-rose-50"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  placeholder="Heure optionnelle"
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                />
              </div>
            </div>

            {/* 5. INTERACTIVE CHECKLIST (TRELLO STYLE) */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#d90416]" />
                  <span>Checklist ({completedChecks}/{totalChecks})</span>
                </label>
                {totalChecks > 0 && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {checkProgress}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {totalChecks > 0 && (
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${checkProgress}%` }}
                  />
                </div>
              )}

              {/* Checklist items */}
              {checklist.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 group"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCheckItem(item.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          item.completed
                            ? "bg-emerald-500 text-white"
                            : "border border-slate-300 dark:border-zinc-600 hover:border-[#d90416]"
                        }`}
                      >
                        {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleUpdateCheckItemText(item.id, e.target.value)}
                        className={`flex-1 bg-transparent text-xs focus:outline-none ${
                          item.completed
                            ? "line-through text-slate-400 dark:text-zinc-500"
                            : "text-slate-800 dark:text-zinc-200 font-medium"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCheckItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 transition-opacity"
                        title="Supprimer cet élément"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new checklist item */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newCheckItemText}
                  onChange={(e) => setNewCheckItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Ajouter une sous-tâche à cocher..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-[#d90416] text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>
            </div>

            {/* 6. RICH TEXT DESCRIPTION BOX ("un encart de texte pour mettre tout ce qu'on peut mettre") */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Encart de texte / Notes détaillées & Instructions
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewFormatted((p) => !p)}
                  className="text-[11px] font-semibold text-[#d90416] hover:underline"
                >
                  {previewFormatted ? "Mode Édition" : "Aperçu formaté"}
                </button>
              </div>

              {!previewFormatted ? (
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:border-[#d90416]">
                  <NoteFormattingToolbar
                    textareaRef={textareaRef}
                    value={description}
                    onChange={setDescription}
                  />
                  <textarea
                    ref={textareaRef}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mettez ici tout le détail souhaité : notes, numéros, références pièces, compte-rendu, liens, listes..."
                    className="w-full p-3 text-xs text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none resize-y"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 min-h-[110px]">
                  {description.trim() ? (
                    <FormattedNoteText content={description} />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Aucun texte saisi.</span>
                  )}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#d90416] hover:bg-[#b80312] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {saving
                  ? "Enregistrement..."
                  : currentEditingTask
                  ? "Enregistrer les modifications"
                  : "Créer la tâche"}
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: QUICK LIST OF TASKS IN THE SIDE DRAWER */
          <div className="space-y-3">
            {/* Search & Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Rechercher une tâche ou un client..."
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#d90416]"
                />
              </div>
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setListStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        listStatusFilter === st
                          ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {st === "ALL" ? "Toutes" : TASK_STATUS_CONFIG[st].shortLabel}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setListPriorityOnly((p) => !p)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                    listPriorityOnly
                      ? "bg-rose-500 text-white border-rose-600"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-transparent"
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>Prioritaires</span>
                </button>
              </div>
            </div>

            {filteredDrawerTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Aucune tâche trouvée.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredDrawerTasks.map((t) => {
                  const stCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.TODO;
                  const catCfg =
                    TASK_CATEGORIES.find((c) => c.value === t.category) || TASK_CATEGORIES[0];
                  const checks = parseTaskChecklist(t.checklist);
                  const doneCount = checks.filter((i) => i.completed).length;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setCurrentEditingTask(t);
                        setTitle(t.title);
                        setDescription(t.description || "");
                        setStatus(t.status);
                        setCategory((t.category as TaskCategory) || "COMMERCIAL");
                        setPriority(Boolean(t.priority));
                        setDueDate(t.dueDate || "");
                        setDueTime(t.dueTime || "");
                        setClientId(t.clientId || "");
                        setChecklist(checks);
                        setClientSearchQuery(t.client?.company || "");
                        setActiveTab("editor");
                      }}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#d90416]/50 transition-all cursor-pointer space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.priority && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              Prioritaire
                            </span>
                          )}
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catCfg.badgeClass}`}
                          >
                            {catCfg.label}
                          </span>
                        </div>

                        {/* Quick status cycle */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickStatusChange(t, st)}
                              title={`Passer en : ${TASK_STATUS_CONFIG[st].label}`}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                t.status === st
                                  ? stCfg.badgeClass
                                  : "border-transparent text-slate-400 hover:text-slate-700"
                              }`}
                            >
                              {TASK_STATUS_CONFIG[st].shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>

                      <h4
                        className={`text-xs font-bold ${
                          t.status === "DONE"
                            ? "line-through text-slate-400"
                            : "text-slate-900 dark:text-zinc-100"
                        }`}
                      >
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 flex-wrap">
                        {t.client ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                            <Building2 className="w-3 h-3 text-[#d90416]" />
                            {t.client.company}
                          </span>
                        ) : (
                          <span className="text-slate-400">Tâche générale</span>
                        )}

                        <div className="flex items-center gap-2">
                          {checks.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800">
                              <CheckSquare className="w-3 h-3 text-emerald-500" />
                              {doneCount}/{checks.length}
                            </span>
                          )}
                          {t.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(t.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
