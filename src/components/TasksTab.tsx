"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Search,
  Flame,
  Calendar,
  Clock,
  Building2,
  Tag,
  Trash2,
  Pencil,
  Kanban,
  List,
  Table as TableIcon,
  Check,
  ChevronRight,
  AlertTriangle,
  PanelRightOpen,
  CheckCircle2,
  Circle,
  Filter,
  X,
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
import { FormattedNoteText } from "@/components/NoteFormatter";

export interface TasksTabProps {
  tasks: TaskItem[];
  clients: ClientItem[];
  activeKamId: string;
  onRefresh: () => void;
  onOpenTaskDrawer: (options?: {
    clientId?: string | null;
    task?: TaskItem | null;
    defaultStatus?: TaskStatus;
  }) => void;
  defaultClientId?: string | null;
  compactClientMode?: boolean;
}

export function TasksTab({
  tasks,
  clients,
  activeKamId,
  onRefresh,
  onOpenTaskDrawer,
  defaultClientId = null,
  compactClientMode = false,
}: TasksTabProps) {
  // View mode: "kanban" (default Trello style), "list", "table"
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "table">("kanban");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>(defaultClientId || "ALL");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");

  // Quick inline add card in Kanban column
  const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState(false);
  const [quickAddClientId, setQuickAddClientId] = useState<string | null>(
    defaultClientId || null
  );
  const [quickClientDropdownOpen, setQuickClientDropdownOpen] = useState(false);
  const [quickClientSearch, setQuickClientSearch] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const selectedQuickClient = useMemo(
    () => clients.find((c) => c.id === quickAddClientId) || null,
    [clients, quickAddClientId]
  );

  const filteredQuickClients = useMemo(() => {
    const q = quickClientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.apClientNumber && c.apClientNumber.toLowerCase().includes(q))
    );
  }, [clients, quickClientSearch]);

  // Drag & drop state for Kanban
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (defaultClientId && t.clientId !== defaultClientId) return false;
      if (!defaultClientId && clientFilter !== "ALL" && t.clientId !== clientFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityOnly && !t.priority) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchClient = t.client?.company.toLowerCase().includes(q);
        const matchAp = t.client?.apClientNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchClient && !matchAp) return false;
      }

      return true;
    });
  }, [tasks, defaultClientId, clientFilter, categoryFilter, statusFilter, priorityOnly, searchQuery]);

  // KPI counts
  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE");
  const priorityTasksCount = filteredTasks.filter((t) => t.priority && t.status !== "DONE").length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = filteredTasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < todayStr
  ).length;

  async function handleStatusChange(task: TaskItem, nextStatus: TaskStatus) {
    if (task.status === nextStatus) return;
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    onRefresh();
  }

  async function handleTogglePriority(task: TaskItem, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: !task.priority }),
    });
    onRefresh();
  }

  async function handleToggleChecklistItemOnCard(
    task: TaskItem,
    checkItemId: string,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    const currentList = parseTaskChecklist(task.checklist);
    const updatedList = currentList.map((item) =>
      item.id === checkItemId ? { ...item, completed: !item.completed } : item
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: updatedList }),
    });
    onRefresh();
  }

  async function handleDeleteTask(taskId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    onRefresh();
  }

  function openQuickAddForColumn(colStatus: TaskStatus) {
    setQuickAddColumn(colStatus);
    setQuickAddTitle("");
    setQuickAddPriority(false);
    setQuickAddClientId(defaultClientId || (clientFilter !== "ALL" ? clientFilter : null));
    setQuickClientDropdownOpen(false);
    setQuickClientSearch("");
  }

  async function handleQuickAddSubmit(colStatus: TaskStatus) {
    if (!quickAddTitle.trim()) return;
    setQuickSaving(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickAddTitle.trim(),
          status: colStatus,
          category: "COMMERCIAL",
          priority: quickAddPriority,
          clientId: quickAddClientId || defaultClientId || null,
          kamId: activeKamId,
        }),
      });
      setQuickAddTitle("");
      setQuickAddPriority(false);
      setQuickAddClientId(defaultClientId || (clientFilter !== "ALL" ? clientFilter : null));
      setQuickClientDropdownOpen(false);
      setQuickClientSearch("");
      setQuickAddColumn(null);
      onRefresh();
    } finally {
      setQuickSaving(false);
    }
  }

  function getDueBadge(task: TaskItem) {
    if (!task.dueDate) return null;
    const isDone = task.status === "DONE";
    const isOverdue = !isDone && task.dueDate < todayStr;
    const isToday = !isDone && task.dueDate === todayStr;

    const formatted = new Date(task.dueDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });

    if (isDone) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <Calendar className="w-3 h-3" />
          <span>{formatted}</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Retard : {formatted}</span>
        </span>
      );
    }
    if (isToday) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
          <Calendar className="w-3 h-3 text-amber-600" />
          <span>Aujourd&apos;hui {task.dueTime || ""}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>
          {formatted} {task.dueTime ? `à ${task.dueTime}` : ""}
        </span>
      </span>
    );
  }

  return (
    <div className={compactClientMode ? "space-y-4" : "p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto"}>
      {/* 1. HEADER & KPI SUMMARY */}
      {!compactClientMode ? (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#d90416]/10 text-[#d90416] flex items-center justify-center shadow-2xs">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                  <span>Tâches &amp; Kanban (Trello)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-[#d90416] font-bold border border-red-500/20">
                    {todoTasks.length + inProgressTasks.length} à traiter
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Organisation visuelle en Kanban, Liste et Tableau avec checklists, priorités, échéances et liaison client
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Switcher: Kanban / Liste / Tableau */}
            <div className="inline-flex items-center bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Liste</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tableau</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenTaskDrawer({ clientId: defaultClientId })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>
      ) : (
        /* Compact Header when inside ClientFullPage */
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-[#d90416] flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tâches &amp; Actions du Client ({filteredTasks.length})</span>
                {todoTasks.length + inProgressTasks.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                    {todoTasks.length + inProgressTasks.length} en cours / à faire
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Suivez les actions commerciales, checklists et échéances liées à ce client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Liste</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-500"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tableau</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenTaskDrawer({ clientId: defaultClientId })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ajouter une tâche</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. KPI CARDS (Non-compact mode) */}
      {!compactClientMode && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              À Faire
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {todoTasks.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-amber-200/70 dark:border-amber-900/40 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              En Cours
            </span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {inProgressTasks.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Terminées
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {doneTasks.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-rose-900/40 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-current" />
              Prioritaires
            </span>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {priorityTasksCount}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              En Retard
            </span>
            <div
              className={`text-2xl font-extrabold mt-1 ${
                overdueCount > 0 ? "text-rose-600" : "text-slate-900 dark:text-white"
              }`}
            >
              {overdueCount}
            </div>
          </div>
        </div>
      )}

      {/* 3. FILTER BAR */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tâche, checklist, client..."
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 pl-8 pr-8 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Client filter if not locked to a client */}
          {!defaultClientId && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] max-w-[220px]"
            >
              <option value="ALL">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.city})
                </option>
              ))}
            </select>
          )}

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
          >
            <option value="ALL">Toutes catégories</option>
            {TASK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <button
            type="button"
            onClick={() => setPriorityOnly((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              priorityOnly
                ? "bg-rose-500 text-white border-rose-600 shadow-2xs"
                : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-rose-400"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${priorityOnly ? "fill-current" : "text-rose-500"}`} />
            <span>Prioritaires</span>
          </button>
        </div>

        {viewMode !== "kanban" && (
          <div className="flex items-center gap-1">
            {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                }`}
              >
                {st === "ALL" ? "Tous états" : TASK_STATUS_CONFIG[st].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          VIEW 1: KANBAN BOARD (TRELLO STYLE: À FAIRE | EN COURS | TERMINÉ)
         ===================================================================== */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((colStatus) => {
            const colCfg = TASK_STATUS_CONFIG[colStatus];
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            const isOver = dragOverColumn === colStatus;

            return (
              <div
                key={colStatus}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(colStatus);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  if (!draggedTaskId) return;
                  const found = tasks.find((t) => t.id === draggedTaskId);
                  setDraggedTaskId(null);
                  if (found && found.status !== colStatus) {
                    await handleStatusChange(found, colStatus);
                  }
                }}
                className={`rounded-2xl border-2 transition-all p-3.5 space-y-3 min-h-[420px] ${
                  colCfg.columnBgClass
                } ${
                  isOver
                    ? "border-[#d90416] ring-2 ring-[#d90416]/20"
                    : "border-slate-200/80 dark:border-zinc-800"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200/70 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colCfg.dotClass}`} />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                      {colCfg.label}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTaskDrawer({
                          clientId: defaultClientId || (clientFilter !== "ALL" ? clientFilter : null),
                          defaultStatus: colStatus,
                        })
                      }
                      title="Ouvrir l'éditeur complet sur le côté"
                      className="p-1 rounded-lg text-slate-500 hover:text-[#d90416] hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <PanelRightOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickAddForColumn(colStatus)}
                      title="Ajout rapide d'une carte"
                      className="p-1 rounded-lg text-slate-500 hover:text-[#d90416] hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick inline add card box */}
                {quickAddColumn === colStatus && (
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border-2 border-[#d90416] shadow-md space-y-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddSubmit(colStatus);
                        } else if (e.key === "Escape") {
                          setQuickAddColumn(null);
                          setQuickClientDropdownOpen(false);
                        }
                      }}
                      placeholder="Titre de la carte Trello..."
                      className="w-full text-xs font-semibold text-slate-900 dark:text-zinc-100 bg-transparent focus:outline-none"
                    />

                    {/* Sélecteur de client direct dans la carte */}
                    {!defaultClientId && (
                      <div className="relative">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setQuickClientDropdownOpen((o) => !o)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer max-w-full ${
                              selectedQuickClient
                                ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] border-red-200 dark:border-red-900/50"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#d90416] hover:text-[#d90416]"
                            }`}
                          >
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {selectedQuickClient
                                ? `${selectedQuickClient.company} (${selectedQuickClient.city})`
                                : "+ Choisir un client"}
                            </span>
                          </button>

                          {selectedQuickClient && (
                            <button
                              type="button"
                              onClick={() => setQuickAddClientId(null)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Retirer le client"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {quickClientDropdownOpen && (
                          <div className="mt-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-xl p-2 space-y-1.5 z-30">
                            <div className="relative">
                              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={quickClientSearch}
                                onChange={(e) => setQuickClientSearch(e.target.value)}
                                placeholder="Rechercher un client, ville, code AP..."
                                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 pl-7 pr-2.5 py-1.5 text-[11px] text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickAddClientId(null);
                                  setQuickClientDropdownOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-md cursor-pointer"
                              >
                                — Aucun client (Tâche générale) —
                              </button>
                              {filteredQuickClients.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setQuickAddClientId(c.id);
                                    setQuickClientDropdownOpen(false);
                                    setQuickClientSearch("");
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-[11px] flex items-center justify-between gap-2 hover:bg-red-50/60 dark:hover:bg-zinc-900 rounded-md cursor-pointer ${
                                    quickAddClientId === c.id
                                      ? "bg-red-50 dark:bg-red-950/30 text-[#d90416] font-bold"
                                      : "text-slate-800 dark:text-zinc-200 font-medium"
                                  }`}
                                >
                                  <span className="truncate">{c.company}</span>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {c.city}
                                  </span>
                                </button>
                              ))}
                              {filteredQuickClients.length === 0 && (
                                <div className="px-2 py-2 text-[11px] text-slate-400 text-center">
                                  Aucun client trouvé
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickAddPriority((p) => !p)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                          quickAddPriority
                            ? "bg-rose-500 text-white border-rose-600"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 border-transparent"
                        }`}
                      >
                        <Flame className="w-2.5 h-2.5" />
                        <span>Prioritaire</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddColumn(null);
                            setQuickClientDropdownOpen(false);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={quickSaving || !quickAddTitle.trim()}
                          onClick={() => handleQuickAddSubmit(colStatus)}
                          className="px-3 py-1 rounded-lg bg-[#d90416] text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cards list */}
                <div className="space-y-3">
                  {colTasks.map((task) => {
                    const catCfg =
                      TASK_CATEGORIES.find((c) => c.value === task.category) || TASK_CATEGORIES[0];
                    const checks = parseTaskChecklist(task.checklist);
                    const doneChecks = checks.filter((i) => i.completed).length;
                    const checkPct =
                      checks.length > 0 ? Math.round((doneChecks / checks.length) * 100) : 0;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => onOpenTaskDrawer({ task })}
                        className={`group rounded-2xl bg-white dark:bg-zinc-900 border p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 ${
                          task.priority && task.status !== "DONE"
                            ? "border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-500/15"
                            : "border-slate-200/90 dark:border-zinc-800 hover:border-[#d90416]/50"
                        }`}
                      >
                        {/* Top row: Category + Priority + Side drawer button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.priority && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
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

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => handleTogglePriority(task, e)}
                              title={
                                task.priority
                                  ? "Retirer l'étiquette prioritaire"
                                  : "Étiqueter comme prioritaire"
                              }
                              className={`p-1 rounded-lg transition-colors ${
                                task.priority
                                  ? "text-rose-500 bg-rose-50 dark:bg-rose-950/40"
                                  : "text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <Flame className={`w-3.5 h-3.5 ${task.priority ? "fill-current" : ""}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTaskDrawer({ task });
                              }}
                              title="Ouvrir la fiche complète sur le côté"
                              className="p-1 rounded-lg text-slate-400 hover:text-[#d90416] hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <PanelRightOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title="Supprimer cette tâche"
                              className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4
                          className={`text-sm font-bold leading-snug ${
                            task.status === "DONE"
                              ? "line-through text-slate-400 dark:text-zinc-500"
                              : "text-slate-900 dark:text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </h4>

                        {/* Linked Client Pill */}
                        {task.client && !defaultClientId && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/clients/${task.client.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-zinc-200 hover:text-[#d90416] text-[11px] font-semibold transition-colors max-w-full"
                            >
                              <Building2 className="w-3 h-3 text-[#d90416] shrink-0" />
                              <span className="truncate">{task.client.company}</span>
                              {task.client.apClientNumber && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  #{task.client.apClientNumber}
                                </span>
                              )}
                            </Link>
                          </div>
                        )}

                        {/* Rich Text Description Snippet */}
                        {task.description && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-100 dark:border-zinc-800/80 text-xs text-slate-600 dark:text-zinc-300 line-clamp-3 overflow-hidden">
                            <FormattedNoteText content={task.description} />
                          </div>
                        )}

                        {/* Interactive Checklist Preview */}
                        {checks.length > 0 && (
                          <div
                            className="space-y-1.5 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                Checklist ({doneChecks}/{checks.length})
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                {checkPct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${checkPct}%` }}
                              />
                            </div>
                            <div className="space-y-1 pt-0.5 max-h-28 overflow-y-auto pr-1">
                              {checks.slice(0, 5).map((chk) => (
                                <button
                                  key={chk.id}
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleChecklistItemOnCard(task, chk.id, e)
                                  }
                                  className="w-full flex items-center gap-2 text-left text-[11px] py-0.5 px-1 rounded hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                                      chk.completed
                                        ? "bg-emerald-500 text-white"
                                        : "border border-slate-300 dark:border-zinc-600"
                                    }`}
                                  >
                                    {chk.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span
                                    className={`truncate ${
                                      chk.completed
                                        ? "line-through text-slate-400"
                                        : "text-slate-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    {chk.text}
                                  </span>
                                </button>
                              ))}
                              {checks.length > 5 && (
                                <div className="text-[10px] text-slate-400 pl-5">
                                  + {checks.length - 5} autre(s) sous-tâche(s)...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Footer: Due date + Timestamp + Quick Status Move */}
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getDueBadge(task)}
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400"
                              title={`Horodaté le ${formatFullTimestamp(task.createdAt)}`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {formatFullTimestamp(task.createdAt)}
                            </span>
                          </div>

                          {/* Move status buttons */}
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {colStatus !== "TODO" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task, "TODO")}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
                              >
                                À faire
                              </button>
                            )}
                            {colStatus !== "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                              >
                                En cours
                              </button>
                            )}
                            {colStatus !== "DONE" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task, "DONE")}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                              >
                                Terminé ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state or Add Card button at bottom of column */}
                  <button
                    type="button"
                    onClick={() => openQuickAddForColumn(colStatus)}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#d90416] text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-[#d90416] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une carte ({colCfg.shortLabel})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          VIEW 2: LIST VIEW (VUE LISTE DÉTAILLÉE)
         ===================================================================== */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-center space-y-2">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                Aucune tâche à afficher
              </p>
              <button
                type="button"
                onClick={() => onOpenTaskDrawer({ clientId: defaultClientId })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-bold mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer une première tâche</span>
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const stCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.TODO;
              const catCfg =
                TASK_CATEGORIES.find((c) => c.value === task.category) || TASK_CATEGORIES[0];
              const checks = parseTaskChecklist(task.checklist);
              const doneChecks = checks.filter((i) => i.completed).length;

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTaskDrawer({ task })}
                  className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-[#d90416]/50 transition-all shadow-2xs cursor-pointer space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${stCfg.badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${stCfg.dotClass}`} />
                        {stCfg.label}
                      </span>

                      {task.priority && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">
                          <Flame className="w-3 h-3 fill-current" />
                          Prioritaire
                        </span>
                      )}

                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${catCfg.badgeClass}`}
                      >
                        {catCfg.label}
                      </span>

                      <h4
                        className={`text-sm font-bold ${
                          task.status === "DONE"
                            ? "line-through text-slate-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>

                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(task, st)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            task.status === st
                              ? TASK_STATUS_CONFIG[st].badgeClass
                              : "bg-slate-50 dark:bg-zinc-800 text-slate-500 border-transparent hover:border-slate-300"
                          }`}
                        >
                          {TASK_STATUS_CONFIG[st].label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onOpenTaskDrawer({ task })}
                        title="Ouvrir sur le côté"
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-[#d90416]"
                      >
                        <PanelRightOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        title="Supprimer"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 text-xs">
                      <FormattedNoteText content={task.description} />
                    </div>
                  )}

                  {checks.length > 0 && (
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {checks.map((chk) => (
                        <button
                          key={chk.id}
                          type="button"
                          onClick={(e) => handleToggleChecklistItemOnCard(task, chk.id, e)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 text-left text-xs hover:border-[#d90416]/40 cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              chk.completed
                                ? "bg-emerald-500 text-white"
                                : "border border-slate-300 dark:border-zinc-600"
                            }`}
                          >
                            {chk.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span
                            className={`truncate ${
                              chk.completed
                                ? "line-through text-slate-400"
                                : "text-slate-800 dark:text-zinc-200 font-medium"
                            }`}
                          >
                            {chk.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      {task.client && (
                        <Link
                          href={`/clients/${task.client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200 hover:text-[#d90416]"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                          <span>{task.client.company}</span>
                        </Link>
                      )}
                      {getDueBadge(task)}
                      {checks.length > 0 && (
                        <span className="text-xs font-semibold text-emerald-600">
                          Checklist : {doneChecks}/{checks.length}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Horodaté le {formatFullTimestamp(task.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 3: TABLE VIEW (VUE TABLEAU CRM)
         ===================================================================== */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Priorité</th>
                  <th className="py-3.5 px-4">Tâche &amp; Description</th>
                  {!defaultClientId && <th className="py-3.5 px-4">Client Associé</th>}
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4">État (Kanban)</th>
                  <th className="py-3.5 px-4">Checklist</th>
                  <th className="py-3.5 px-4">Date Limite</th>
                  <th className="py-3.5 px-4">Horodatage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-400 font-medium"
                    >
                      Aucune tâche trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const catCfg =
                      TASK_CATEGORIES.find((c) => c.value === task.category) ||
                      TASK_CATEGORIES[0];
                    const checks = parseTaskChecklist(task.checklist);
                    const doneChecks = checks.filter((i) => i.completed).length;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTaskDrawer({ task })}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      >
                        <td
                          className="py-3 px-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleTogglePriority(task, e)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                              task.priority
                                ? "bg-rose-500 text-white border-rose-600"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700"
                            }`}
                          >
                            <Flame
                              className={`w-3 h-3 ${task.priority ? "fill-current" : ""}`}
                            />
                            <span>{task.priority ? "Prioritaire" : "Standard"}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 max-w-[320px]">
                          <div
                            className={`font-bold ${
                              task.status === "DONE"
                                ? "line-through text-slate-400"
                                : "text-slate-900 dark:text-zinc-100"
                            }`}
                          >
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </td>

                        {!defaultClientId && (
                          <td
                            className="py-3 px-4 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.client ? (
                              <Link
                                href={`/clients/${task.client.id}`}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200 hover:text-[#d90416]"
                              >
                                <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                                <span>{task.client.company}</span>
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${catCfg.badgeClass}`}
                          >
                            {catCfg.label}
                          </span>
                        </td>

                        <td
                          className="py-3 px-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleStatusChange(task, e.target.value as TaskStatus)
                            }
                            className={`rounded-xl px-2.5 py-1 text-xs font-bold border focus:outline-none cursor-pointer ${
                              TASK_STATUS_CONFIG[task.status]?.badgeClass
                            }`}
                          >
                            <option value="TODO">À faire</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="DONE">Terminé</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {checks.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{
                                    width: `${Math.round(
                                      (doneChecks / checks.length) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                {doneChecks}/{checks.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getDueBadge(task) || <span className="text-slate-400">—</span>}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-400">
                          {formatFullTimestamp(task.createdAt)}
                        </td>

                        <td
                          className="py-3 px-4 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenTaskDrawer({ task })}
                              title="Ouvrir sur le côté"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#d90416] hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <PanelRightOpen className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
