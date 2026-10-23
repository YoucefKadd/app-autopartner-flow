"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Plus,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Store,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Flame,
  Activity,
  Compass,
  CheckSquare,
  ListChecks,
  Check,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import {
  CLIENT_STATUS_CONFIG,
  ClientItem,
  ClientVisit,
  NoteItem,
  TaskItem,
  TaskStatus,
  TASK_STATUS_CONFIG,
  TASK_CATEGORIES,
  parseTaskChecklist,
  getInitials,
} from "@/types/kam";
import { stripMarkdown } from "@/components/NoteFormatter";
import { CaImportModal } from "@/components/CaImportModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { getAllPortfolioVisits } from "@/lib/visits";

export default function DashboardHomePage() {
  const router = useRouter();
  const {
    clients,
    notes,
    tasks,
    users,
    activeUser,
    loggedUser,
    openQuickNote,
    openQuickTask,
    openClientModal,
    refreshWorkspace,
  } = useWorkspace();

  const [isCaModalOpen, setIsCaModalOpen] = useState(false);
  const [isClientCsvModalOpen, setIsClientCsvModalOpen] = useState(false);
  const [taskWidgetFilter, setTaskWidgetFilter] = useState<"URGENT" | "PRIORITY" | "DUE_TODAY" | "IN_PROGRESS" | "ALL_ACTIVE">("URGENT");
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [creatingQuickTask, setCreatingQuickTask] = useState(false);

  // CA and AX summary from MySQL
  const [caData, setCaData] = useState<{
    totalAmount: number;
    totalAx: number;
    totalTarget: number;
    totalOrders: number;
  }>({
    totalAmount: 0,
    totalAx: 0,
    totalTarget: 0,
    totalOrders: 0,
  });

  const [actionFilter, setActionFilter] = useState<"ALL" | "VISITS" | "TASKS" | "NOTES" | "CLIENTS">("ALL");

  const currentYear = new Date().getFullYear();

  // Load CA & AX data from real MySQL DB filtered by active KAM portfolio
  useEffect(() => {
    async function loadCa() {
      try {
        const targetKamId =
          loggedUser?.role === "KAM"
            ? loggedUser.id
            : activeUser?.id && activeUser.id !== "ALL"
            ? activeUser.id
            : "ALL";

        const res = await fetch(`/api/ca?year=${currentYear}&kamId=${targetKamId}`);
        if (res.ok) {
          const data = await res.json();
          setCaData({
            totalAmount: data.totalAmount || 0,
            totalAx: data.totalAx || 0,
            totalTarget: data.totalTarget || 0,
            totalOrders: data.totalOrders || 0,
          });
        }
      } catch (err) {
        console.error("Error loading CA in dashboard:", err);
      }
    }
    loadCa();

    function handleCaSync() {
      loadCa();
    }
    window.addEventListener("apflow_ca_changed", handleCaSync);
    return () => window.removeEventListener("apflow_ca_changed", handleCaSync);
  }, [currentYear, loggedUser?.id, loggedUser?.role, activeUser?.id]);

  // Clients breakdown by status
  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === "ACTIVE" || c.status === "VIP").length;
    const inactive = clients.filter((c) => c.status === "INACTIVE" || c.status === "ARCHIVED").length;
    const vip = clients.filter((c) => c.status === "VIP").length;
    const newClients = clients.filter((c) => c.status === "NEW").length;
    const followUp = clients.filter((c) => c.status === "FOLLOW_UP").length;

    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, active, inactive, vip, newClients, followUp, activeRatio };
  }, [clients]);

  // All visits from portfolio
  const allVisits = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getAllPortfolioVisits(clients);
  }, [clients]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Task stats & Priority / Due Today / Overdue breakdown
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const activeTasks = tasks.filter((t) => t.status !== "DONE");
    const priorityActive = activeTasks.filter((t) => t.priority).length;
    const dueTodayOrOverdue = activeTasks.filter(
      (t) => Boolean(t.dueDate && t.dueDate <= todayStr)
    ).length;

    return {
      total,
      todo,
      inProgress,
      done,
      activeCount: activeTasks.length,
      priorityActive,
      dueTodayOrOverdue,
    };
  }, [tasks, todayStr]);

  // Filtered tasks for the Dashboard Priority & Due Today Widget
  const dashboardTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "DONE");
    let list = active;
    if (taskWidgetFilter === "URGENT") {
      const urgent = active.filter(
        (t) =>
          t.priority ||
          Boolean(t.dueDate && t.dueDate <= todayStr) ||
          t.status === "IN_PROGRESS"
      );
      list = urgent.length > 0 ? urgent : active;
    } else if (taskWidgetFilter === "PRIORITY") {
      list = active.filter((t) => t.priority);
    } else if (taskWidgetFilter === "DUE_TODAY") {
      list = active.filter((t) => Boolean(t.dueDate && t.dueDate <= todayStr));
    } else if (taskWidgetFilter === "IN_PROGRESS") {
      list = active.filter((t) => t.status === "IN_PROGRESS");
    }

    return [...list].sort((a, b) => {
      const aOverdue = Boolean(a.dueDate && a.dueDate <= todayStr);
      const bOverdue = Boolean(b.dueDate && b.dueDate <= todayStr);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, taskWidgetFilter, todayStr]);

  async function handleQuickToggleTaskDone(task: TaskItem, e: React.MouseEvent) {
    e.stopPropagation();
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    refreshWorkspace();
  }

  async function handleQuickStatusSelect(task: TaskItem, nextStatus: TaskStatus) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    refreshWorkspace();
  }

  async function handleDashboardQuickAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !activeUser?.id) return;
    setCreatingQuickTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          status: "TODO",
          category: "ACTION",
          priority: true,
          dueDate: todayStr,
          kamId: activeUser.id,
        }),
      });
      if (res.ok) {
        setQuickTaskTitle("");
        refreshWorkspace();
      }
    } finally {
      setCreatingQuickTask(false);
    }
  }

  // Unified Chronological Activity Stream (Dernières Actions)
  const recentActions = useMemo(() => {
    type UnifiedAction = {
      id: string;
      type: "VISIT" | "TASK" | "NOTE" | "CLIENT";
      timestamp: number;
      dateFormatted: string;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeColor: string;
      clientCompany?: string;
      clientId?: string;
      linkUrl: string;
      taskItem?: TaskItem;
    };

    const actions: UnifiedAction[] = [];

    // 1. Recent visits
    allVisits.forEach((v) => {
      const parsedDate = new Date(v.date || v.createdAt);
      actions.push({
        id: `v_${v.id}`,
        type: "VISIT",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: v.date || "Date non précisée",
        title: `Visite terrain — ${v.interlocutor || "Contact client"}`,
        subtitle: stripMarkdown(v.summary).slice(0, 100) || "Visite de routine effectuée",
        badgeText: v.status === "EFFECTUEE" ? "Visite effectuée" : "Visite planifiée",
        badgeColor:
          v.status === "EFFECTUEE"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-500/20",
        clientCompany: v.client?.company,
        clientId: v.client?.id,
        linkUrl: `/clients/${v.client?.id}?tab=visites`,
      });
    });

    // 2. Recent tasks
    tasks.forEach((t) => {
      const parsedDate = new Date(t.updatedAt || t.createdAt);
      const stCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.TODO;
      const cl = parseTaskChecklist(t.checklist);
      const clSummary =
        cl.length > 0
          ? `Checklist : ${cl.filter((i) => i.completed).length}/${cl.length} cochées`
          : "";
      actions.push({
        id: `t_${t.id}`,
        type: "TASK",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: new Date(t.updatedAt || t.createdAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        title: `Tâche : ${t.title}`,
        subtitle:
          stripMarkdown(t.description || "").slice(0, 100) ||
          clSummary ||
          (t.dueDate ? `Échéance : ${new Date(t.dueDate).toLocaleDateString("fr-FR")}` : "Carte Kanban"),
        badgeText: `${stCfg.label}${t.priority ? " • Prioritaire" : ""}`,
        badgeColor: stCfg.badgeClass,
        clientCompany: t.client?.company,
        clientId: t.clientId || undefined,
        linkUrl: t.clientId ? `/clients/${t.clientId}` : "/taches",
        taskItem: t,
      });
    });

    // 3. Recent notes
    notes.forEach((n) => {
      const parsedDate = new Date(n.createdAt);
      actions.push({
        id: `n_${n.id}`,
        type: "NOTE",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: new Date(n.createdAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        title: n.title || `Note ${n.category.toLowerCase()}`,
        subtitle: stripMarkdown(n.content).slice(0, 100) || "Contenu de note",
        badgeText: `Note (${n.category})`,
        badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20",
        clientCompany: n.client?.company,
        clientId: n.client?.id,
        linkUrl: n.clientId ? `/clients/${n.clientId}?tab=notes` : "/notes",
      });
    });

    // 4. Recent clients updated/created
    clients.slice(0, 15).forEach((c) => {
      const parsedDate = new Date(c.updatedAt || c.lastContactAt);
      actions.push({
        id: `c_${c.id}`,
        type: "CLIENT",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: new Date(c.updatedAt || c.lastContactAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        title: `Fiche client : ${c.company}`,
        subtitle: `${c.contactName || "Contact principal"} — ${c.city || "France"} ${
          c.phone ? `(${c.phone})` : ""
        }`,
        badgeText: c.status === "ACTIVE" ? "Actif" : c.status === "INACTIVE" ? "Inactif" : c.status,
        badgeColor:
          c.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700 border-emerald-500/20"
            : c.status === "INACTIVE"
            ? "bg-zinc-100 text-zinc-600 border-zinc-300"
            : "bg-red-50 text-[#d90416] border-red-200",
        clientCompany: c.company,
        clientId: c.id,
        linkUrl: `/clients/${c.id}`,
      });
    });

    // Sort by timestamp desc
    return actions.sort((a, b) => b.timestamp - a.timestamp);
  }, [allVisits, tasks, notes, clients]);

  const filteredRecentActions = useMemo(() => {
    if (actionFilter === "ALL") return recentActions.slice(0, 20);
    if (actionFilter === "VISITS") return recentActions.filter((a) => a.type === "VISIT").slice(0, 20);
    if (actionFilter === "TASKS") return recentActions.filter((a) => a.type === "TASK").slice(0, 20);
    if (actionFilter === "NOTES") return recentActions.filter((a) => a.type === "NOTE").slice(0, 20);
    if (actionFilter === "CLIENTS") return recentActions.filter((a) => a.type === "CLIENT").slice(0, 20);
    return recentActions.slice(0, 20);
  }, [recentActions, actionFilter]);

  // Priority Clients requiring immediate attention (Re-visite dépassée)
  const priorityClients = useMemo(() => {
    return clients
      .filter((c) => c.status !== "ARCHIVED" && c.status !== "INACTIVE")
      .slice(0, 6);
  }, [clients]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fb] dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. WELCOME HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] border border-red-200/60 dark:border-red-900/40">
              Pilotage Portefeuille
            </span>
            <span className="text-xs text-slate-400">
              Exercice {currentYear}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight mt-1.5">
            Bonjour, {activeUser?.name || "Équipe KAM"} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Voici la situation globale en temps réel de vos clients, tâches prioritaires, chiffres d'affaires et dernières actions terrain.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openClientModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nouveau Client</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickTask()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Nouvelle Tâche</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickNote()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Nouvelle Note</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCaModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
            title="Importer un fichier de CA et achats AX"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Importer CA &amp; AX</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClientCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
            title="Importer des clients par fichier CSV"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Importer Clients</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS (5 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Portefeuille Clients */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <Link
              href="/clients"
              className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
            >
              Voir ({clientStats.total})
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Clients
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {clientStats.total}
              </span>
              <span className="text-xs text-emerald-600 font-bold">
                {clientStats.active} actifs
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Inactifs : <strong>{clientStats.inactive}</strong></span>
            <span>VIP : <strong>{clientStats.vip}</strong></span>
            <span>Nouveaux : <strong>{clientStats.newClients}</strong></span>
          </div>
        </div>

        {/* Card 2: Chiffre d'Affaires Global (STRICTLY REAL DATA) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <Link
              href="/ca"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
            >
              Pilotage CA
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              CA Facturé ({currentYear})
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              {caData.totalAmount > 0 ? (
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {caData.totalAmount.toLocaleString("fr-FR")} €
                </span>
              ) : (
                <span className="text-2xl font-black text-slate-400 dark:text-zinc-500">
                  NC <span className="text-xs font-normal">(Non Communiqué)</span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Achats AX :{" "}
              <strong>
                {caData.totalAx > 0 ? `${caData.totalAx.toLocaleString("fr-FR")} €` : "NC"}
              </strong>
            </span>
            <button
              onClick={() => setIsCaModalOpen(true)}
              className="text-[#d90416] hover:underline font-semibold cursor-pointer"
            >
              + Importer
            </button>
          </div>
        </div>

        {/* Card 3: Tâches & Kanban */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#d90416]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <Link
              href="/taches"
              className="text-[11px] text-[#d90416] font-bold hover:underline flex items-center gap-0.5"
            >
              Kanban ({taskStats.total})
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tâches Actives
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {taskStats.activeCount}
              </span>
              {taskStats.priorityActive > 0 ? (
                <span className="text-xs text-[#d90416] font-bold flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-current" />
                  {taskStats.priorityActive} prio
                </span>
              ) : (
                <span className="text-xs text-emerald-600 font-bold">
                  {taskStats.done} terminées
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>À faire : <strong>{taskStats.todo}</strong></span>
            <span>En cours : <strong>{taskStats.inProgress}</strong></span>
            <button
              onClick={() => openQuickTask()}
              className="text-[#d90416] hover:underline font-semibold cursor-pointer"
            >
              + Tâche
            </button>
          </div>
        </div>

        {/* Card 4: Visites Terrain */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
              <Calendar className="w-5 h-5" />
            </div>
            <Link
              href="/visites"
              className="text-[11px] text-[#d90416] font-bold hover:underline flex items-center gap-0.5"
            >
              Planning
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Visites Consignées
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {allVisits.length}
              </span>
              <span className="text-xs text-slate-500">
                sur le terrain
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Effectuées :{" "}
              <strong>{allVisits.filter((v) => v.status === "EFFECTUEE").length}</strong>
            </span>
            <span>
              Planifiées :{" "}
              <strong>{allVisits.filter((v) => v.status === "PLANIFIEE").length}</strong>
            </span>
          </div>
        </div>

        {/* Card 5: Notes & Comptes-rendus */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <Link
              href="/notes"
              className="text-[11px] text-amber-600 font-bold hover:underline flex items-center gap-0.5"
            >
              Mémos ({notes.length})
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Notes &amp; Comptes-rendus
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {notes.length}
              </span>
              <span className="text-xs text-amber-600 font-bold">
                {notes.filter((n) => n.pinned).length} épinglées
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Comptes-rendus récents</span>
            <button
              onClick={() => openQuickNote()}
              className="text-[#d90416] hover:underline font-semibold cursor-pointer"
            >
              + Rédiger
            </button>
          </div>
        </div>
      </div>

      {/* 2B. ENCART : TÂCHES PRIORITAIRES & ÉCHÉANCES DU JOUR */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Tâches Prioritaires &amp; Échéances du jour
                </h3>
                {taskStats.dueTodayOrOverdue > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    {taskStats.dueTodayOrOverdue} à échéance / en retard
                  </span>
                )}
                {taskStats.priorityActive > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d90416] text-white">
                    <Flame className="w-3 h-3 fill-current" />
                    {taskStats.priorityActive} prioritaire{taskStats.priorityActive > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cochez vos actions terminées en 1 clic sans quitter l&apos;accueil ou ouvrez-les dans le volet latéral
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setTaskWidgetFilter("URGENT")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  taskWidgetFilter === "URGENT"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Urgentes &amp; En cours
              </button>
              <button
                type="button"
                onClick={() => setTaskWidgetFilter("PRIORITY")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  taskWidgetFilter === "PRIORITY"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Prioritaires ({taskStats.priorityActive})
              </button>
              <button
                type="button"
                onClick={() => setTaskWidgetFilter("DUE_TODAY")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  taskWidgetFilter === "DUE_TODAY"
                    ? "bg-white dark:bg-zinc-900 text-rose-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Aujourd&apos;hui / Retard ({taskStats.dueTodayOrOverdue})
              </button>
              <button
                type="button"
                onClick={() => setTaskWidgetFilter("ALL_ACTIVE")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  taskWidgetFilter === "ALL_ACTIVE"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Toutes ({taskStats.activeCount})
              </button>
            </div>

            <Link
              href="/taches"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:border-[#d90416] hover:text-[#d90416] transition"
            >
              <span>Ouvrir Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick 1-line Task Add on Dashboard */}
        <form onSubmit={handleDashboardQuickAddTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Plus className="w-3.5 h-3.5 text-[#d90416] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Ajouter rapidement une tâche prioritaire du jour (ex: Relancer client pour RIB, Appeler responsable dépôt)..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={creatingQuickTask || !quickTaskTitle.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
            >
              {creatingQuickTask ? "Ajout..." : "+ Ajout rapide"}
            </button>
            <button
              type="button"
              onClick={() => openQuickTask()}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Ouvrir le panneau latéral complet avec client, catégorie et checklist"
            >
              Tâche détaillée
            </button>
          </div>
        </form>

        {/* Task Cards Grid */}
        {dashboardTasks.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/30 space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Aucune tâche en attente dans cette vue !
            </p>
            <p className="text-[11px] text-slate-400">
              Toutes vos tâches prioritaires et échéances du jour sont à jour.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboardTasks.slice(0, 9).map((task) => {
              const catCfg =
                TASK_CATEGORIES.find((c) => c.value === task.category) ||
                TASK_CATEGORIES[0];
              const statusCfg =
                TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.TODO;
              const checklist = parseTaskChecklist(task.checklist);
              const doneCheckCount = checklist.filter((i) => i.completed).length;
              const isOverdue = Boolean(task.dueDate && task.dueDate < todayStr);
              const isDueToday = Boolean(task.dueDate && task.dueDate === todayStr);

              return (
                <div
                  key={task.id}
                  onClick={() => openQuickTask({ task, clientId: task.clientId })}
                  className={`group rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between bg-slate-50/50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-800/70 shadow-2xs ${
                    isOverdue
                      ? "border-rose-300 dark:border-rose-900/60"
                      : task.priority
                      ? "border-red-200 dark:border-red-900/50"
                      : "border-slate-200/80 dark:border-zinc-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* 1-Click Complete Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggleTaskDone(task, e)}
                          title="Cliquer pour marquer comme Terminé en 1 clic"
                          className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center shrink-0 transition-colors cursor-pointer group/check"
                        >
                          <Check className="w-3 h-3 text-transparent group-hover/check:text-emerald-600 transition-colors stroke-[3]" />
                        </button>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#d90416] transition-colors line-clamp-2">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                              {stripMarkdown(task.description)}
                            </p>
                          )}
                        </div>
                      </div>

                      {task.priority && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#d90416] text-white shrink-0">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          Prio
                        </span>
                      )}
                    </div>

                    {/* Badges row: Category, Client, Checklist, DueDate */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pl-7">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${catCfg.badgeClass}`}
                      >
                        {catCfg.label}
                      </span>

                      {task.client && (
                        <Link
                          href={`/clients/${task.client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-[#d90416] hover:text-[#d90416] transition"
                        >
                          <Store className="w-2.5 h-2.5 text-[#d90416]" />
                          <span className="truncate max-w-[120px]">{task.client.company}</span>
                        </Link>
                      )}

                      {checklist.length > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            doneCheckCount === checklist.length
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          <ListChecks className="w-2.5 h-2.5" />
                          {doneCheckCount}/{checklist.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Due Date & 1-Click Status Selector */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-200/60 dark:border-zinc-800/80 pl-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      {task.dueDate ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isOverdue
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                              : isDueToday
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          {isOverdue
                            ? `En retard (${new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })})`
                            : isDueToday
                            ? "Aujourd'hui"
                            : new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sans échéance</span>
                      )}
                    </div>

                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleQuickStatusSelect(task, e.target.value as TaskStatus)
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none ${statusCfg.badgeClass}`}
                    >
                      <option value="TODO">À faire</option>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="DONE">✓ Terminé</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. TWO COLUMNS: DERNIÈRES ACTIONS (STREAM) & CLIENTS PRIORITAIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Flux des Dernières Actions (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Dernières Actions en Direct
                </h3>
                <p className="text-[11px] text-slate-400">
                  Flux chronologique des visites, tâches, notes et modifications récentes
                </p>
              </div>
            </div>

            {/* Filter tags */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActionFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "ALL"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tout ({recentActions.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("VISITS")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "VISITS"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Visites
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("TASKS")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "TASKS"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tâches
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("NOTES")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "NOTES"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("CLIENTS")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "CLIENTS"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Clients
              </button>
            </div>
          </div>

          {/* Activity stream list */}
          {filteredRecentActions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aucune action enregistrée pour le moment.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredRecentActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.linkUrl}
                  onClick={(e) => {
                    if (action.type === "TASK" && action.taskItem) {
                      e.preventDefault();
                      openQuickTask({
                        task: action.taskItem,
                        clientId: action.taskItem.clientId,
                      });
                    }
                  }}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-white dark:hover:bg-zinc-800/60 hover:border-slate-200 dark:hover:border-zinc-700 transition shadow-2xs group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                      {action.type === "VISIT" ? (
                        <Calendar className="w-4 h-4 text-emerald-600" />
                      ) : action.type === "TASK" ? (
                        <CheckSquare className="w-4 h-4 text-[#d90416]" />
                      ) : action.type === "NOTE" ? (
                        <FileText className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Users className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#d90416] transition-colors truncate">
                          {action.title}
                        </p>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${action.badgeColor}`}
                        >
                          {action.badgeText}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {action.subtitle}
                      </p>
                      {action.clientCompany && (
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1 font-semibold">
                          <Store className="w-2.5 h-2.5 text-[#d90416]" />
                          <span>{action.clientCompany}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {action.dateFormatted}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Clients à Revoir / Suivi Prioritaire */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#d90416]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Portefeuille Prioritaire
                </h3>
              </div>
              <Link
                href="/clients"
                className="text-[11px] text-[#d90416] font-bold hover:underline"
              >
                Tous les clients
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Clients nécessitant un contact ou une visite terrain programmée :
            </p>

            <div className="mt-3 space-y-2.5">
              {priorityClients.map((client) => {
                const statusConfig =
                  CLIENT_STATUS_CONFIG[client.status] || CLIENT_STATUS_CONFIG.ACTIVE;
                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 shrink-0">
                        {getInitials(client.company)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#d90416] transition-colors">
                          {client.company}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{client.city || "France"}</span>
                          {client.apClientNumber && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-500 font-semibold">
                                #{client.apClientNumber}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300 font-semibold">
              <span>Santé Globale Portefeuille</span>
              <span className="text-[#d90416] font-bold">85%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-[#d90416] h-full rounded-full"
                style={{ width: "85%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <CaImportModal
        isOpen={isCaModalOpen}
        onClose={() => setIsCaModalOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={() => {
          setIsCaModalOpen(false);
          refreshWorkspace();
        }}
      />

      <CsvImportModal
        isOpen={isClientCsvModalOpen}
        onClose={() => setIsClientCsvModalOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={() => {
          setIsClientCsvModalOpen(false);
          refreshWorkspace();
        }}
      />
    </div>
  );
}
