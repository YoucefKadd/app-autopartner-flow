"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  Plus,
  Sliders,
  Search,
  Building2,
  Filter,
  User,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Car,
  Compass,
  CheckSquare,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { AddVisitModal } from "@/components/AddVisitModal";
import { CalendarView } from "@/components/CalendarView";
import { VisitsNotesTableView } from "@/components/VisitsNotesTableView";
import { FormattedNoteText } from "@/components/NoteFormatter";
import {
  ClientItem,
  ClientVisit,
  ClientVisitType,
  ClientVisitStatus,
  CLIENT_VISIT_TYPES,
  hasPermission,
} from "@/types/kam";
import {
  getAllPortfolioVisits,
  getClientVisitStatus,
  getClientRevisitInterval,
  deleteClientVisit,
  REVISIT_INTERVAL_OPTIONS,
  DEFAULT_REVISIT_INTERVAL_DAYS,
} from "@/lib/visits";

type ViewTab = "calendar" | "table" | "timeline" | "radar";

export default function VisitesPage() {
  const router = useRouter();
  const { clients, activeUser, loggedUser, loading, refreshWorkspace, openQuickTask } = useWorkspace();

  const canViewVisits = loggedUser ? hasPermission(loggedUser, "add_visits") : true;

  useEffect(() => {
    if (!loading && loggedUser && !hasPermission(loggedUser, "add_visits")) {
      router.replace("/clients");
    }
  }, [loading, loggedUser, router]);

  // Active view tab: timeline (all logged visits) vs radar (clients to visit by urgency)
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");

  // Add visit modal state
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [addVisitClientId, setAddVisitClientId] = useState<string | null>(null);

  // Global settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [globalInterval, setGlobalInterval] = useState<number>(DEFAULT_REVISIT_INTERVAL_DAYS);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ClientVisitStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [radarUrgencyFilter, setRadarUrgencyFilter] = useState<"ALL" | "OVERDUE" | "SOON" | "NEVER" | "OK">("ALL");

  // Local sync trigger
  const [syncTrigger, setSyncTrigger] = useState(0);

  // Load global interval
  useEffect(() => {
    const stored = localStorage.getItem("apflow_global_revisit_interval");
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val)) setGlobalInterval(val);
    }
  }, []);

  // Listen to visits updates
  useEffect(() => {
    function handleSync() {
      setSyncTrigger((p) => p + 1);
    }
    window.addEventListener("apflow_visits_updated", handleSync);
    return () => window.removeEventListener("apflow_visits_updated", handleSync);
  }, []);

  // Retrieve all visits across portfolio
  const allVisits = useMemo(() => {
    return getAllPortfolioVisits(clients);
  }, [clients, syncTrigger]);

  // Calculations for KPI cards
  const kpis = useMemo(() => {
    const totalVisits = allVisits.length;
    const completedVisits = allVisits.filter((v) => v.status === "EFFECTUEE").length;
    const plannedVisits = allVisits.filter((v) => v.status === "PLANIFIEE").length;

    let overdueClientsCount = 0;
    let soonClientsCount = 0;
    let neverClientsCount = 0;
    let okClientsCount = 0;

    clients.forEach((c) => {
      const status = getClientVisitStatus(c);
      if (status.urgency === "OVERDUE") overdueClientsCount++;
      else if (status.urgency === "SOON") soonClientsCount++;
      else if (status.urgency === "NEVER") neverClientsCount++;
      else okClientsCount++;
    });

    const portfolioCount = clients.length;
    const coveragePct =
      portfolioCount > 0
        ? Math.round(((portfolioCount - overdueClientsCount - neverClientsCount) / portfolioCount) * 100)
        : 0;

    return {
      totalVisits,
      completedVisits,
      plannedVisits,
      overdueClientsCount,
      soonClientsCount,
      neverClientsCount,
      okClientsCount,
      portfolioCount,
      coveragePct,
    };
  }, [allVisits, clients, syncTrigger]);

  // Filtered visits for Timeline view
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      const matchesSearch =
        !searchQuery.trim() ||
        v.client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.client.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.interlocutor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.summary?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
      const matchesType = typeFilter === "ALL" || v.type === typeFilter;
      const matchesClient = selectedClientId === "ALL" || v.clientId === selectedClientId;

      return matchesSearch && matchesStatus && matchesType && matchesClient;
    });
  }, [allVisits, searchQuery, statusFilter, typeFilter, selectedClientId]);

  // Clients with calculated visit status for Radar view
  const clientsWithStatus = useMemo(() => {
    return clients
      .map((c) => ({
        client: c,
        status: getClientVisitStatus(c),
      }))
      .filter(({ client, status }) => {
        const matchesSearch =
          !searchQuery.trim() ||
          client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.contactName?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesUrgency =
          radarUrgencyFilter === "ALL" || status.urgency === radarUrgencyFilter;

        return matchesSearch && matchesUrgency;
      })
      .sort((a, b) => {
        // Priority order: OVERDUE > SOON > NEVER > OK > DISABLED
        const order: Record<string, number> = { OVERDUE: 0, SOON: 1, NEVER: 2, OK: 3, DISABLED: 4 };
        const diff = (order[a.status.urgency] ?? 99) - (order[b.status.urgency] ?? 99);
        if (diff !== 0) return diff;
        return (b.status.daysSinceLastVisit || 0) - (a.status.daysSinceLastVisit || 0);
      });
  }, [clients, searchQuery, radarUrgencyFilter, syncTrigger]);

  function handleDeleteVisit(clientId: string, visitId: string) {
    if (typeof window !== "undefined" && window.confirm("Confirmer la suppression de cette visite ?")) {
      deleteClientVisit(clientId, visitId);
      setSyncTrigger((p) => p + 1);
    }
  }

  async function handleCreateFollowUpTask(visit: ClientVisit) {
    const taskTitle = `Suivi visite — ${visit.client?.company || "Client"} (${visit.interlocutor || "Magasin"})`;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: `Compte-rendu de la visite terrain du ${visit.date} :\n\n${visit.summary}${
            visit.nextVisitDate ? `\n\n**Prochaine visite convenue :** ${visit.nextVisitDate}` : ""
          }`,
          status: "TODO",
          category: "VISITE",
          dueDate: visit.nextVisitDate || null,
          priority: false,
          clientId: visit.clientId,
          kamId: activeUser?.id,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        await refreshWorkspace();
        openQuickTask({ task: created, clientId: visit.clientId });
      }
    } catch (e) {
      console.error("Failed to create follow-up task", e);
    }
  }

  function handleSaveGlobalInterval(days: number) {
    setGlobalInterval(days);
    localStorage.setItem("apflow_global_revisit_interval", days.toString());
    setIsSettingsModalOpen(false);
    setSyncTrigger((p) => p + 1);
  }

  if (!loading && !canViewVisits) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#d90416] flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
          Accès restreint aux Visites Terrain
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Votre compte ne dispose pas des autorisations nécessaires pour consulter ou consigner des visites terrain.
        </p>
        <button
          onClick={() => router.push("/clients")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition"
        >
          Retour aux Clients
        </button>
      </div>
    );
  }

  if (loading || !activeUser) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin text-[#d90416]" />
        Chargement des visites terrain...
      </div>
    );
  }


  return (
    <div className="p-3.5 sm:p-6 lg:px-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. TOP HEADER & PRIMARY CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Visites Terrain & Gestion des Re-visites
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Pilotage complet des passages magasins, planning des tournées et suivi des cadences de re-visite client.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Global cadence settings button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:border-[#d90416] transition-colors cursor-pointer shadow-2xs"
            title="Configurer la cadence standard de re-visite"
          >
            <Sliders className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Cadence standard : {globalInterval}j</span>
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              setAddVisitClientId(null);
              setIsAddVisitModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Consigner / Planifier une visite</span>
          </button>
        </div>
      </div>

      {/* 2. TOP METRIC STRIP (5 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Visites Effectuées */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Visites Réalisées</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {kpis.completedVisits}
          </div>
          <p className="text-[11px] text-slate-400">
            sur {kpis.totalVisits} passage{kpis.totalVisits > 1 ? "s" : ""} consigné{kpis.totalVisits > 1 ? "s" : ""}
          </p>
        </div>

        {/* Card 2: Visites Planifiées */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Rdv Planifiés</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {kpis.plannedVisits}
          </div>
          <p className="text-[11px] text-slate-400">
            créneaux futurs programmés
          </p>
        </div>

        {/* Card 3: En Retard de Re-visite */}
        <div
          onClick={() => {
            setActiveTab("radar");
            setRadarUrgencyFilter("OVERDUE");
          }}
          className={`rounded-2xl border p-4 shadow-2xs space-y-1 cursor-pointer transition-all ${
            kpis.overdueClientsCount > 0
              ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 hover:border-red-400"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-rose-600">
            <span>En retard de re-visite</span>
            <AlertTriangle className={`w-4 h-4 text-rose-600 ${kpis.overdueClientsCount > 0 ? "animate-pulse" : ""}`} />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {kpis.overdueClientsCount}
          </div>
          <p className="text-[11px] text-rose-500 font-medium">
            clients ayant dépassé leur délai
          </p>
        </div>

        {/* Card 4: Jamais Visités */}
        <div
          onClick={() => {
            setActiveTab("radar");
            setRadarUrgencyFilter("NEVER");
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Jamais visités</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-zinc-200">
            {kpis.neverClientsCount}
          </div>
          <p className="text-[11px] text-slate-400">
            sans visite physique enregistrée
          </p>
        </div>

        {/* Card 5: Couverture Portefeuille */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Taux de couverture</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.coveragePct}%
          </div>
          <p className="text-[11px] text-slate-400">
            portefeuille à jour ({kpis.portfolioCount - kpis.overdueClientsCount - kpis.neverClientsCount}/{kpis.portfolioCount})
          </p>
        </div>
      </div>

      {/* 3. NAVIGATION VIEW TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-zinc-800 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Onglet 1 : Calendrier Global */}
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "calendar"
                ? "bg-[#d90416] text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendrier Global</span>
          </button>

          {/* Onglet 2 : Vue Tableau Compacte */}
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "table"
                ? "bg-[#d90416] text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Vue Tableau Compacte</span>
          </button>

          {/* Onglet 3 : Historique & Cartes Détaillées */}
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "timeline"
                ? "bg-[#d90416] text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique & Cartes ({allVisits.length})</span>
          </button>

          {/* Onglet 4 : Radar Re-visites */}
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "radar"
                ? "bg-[#d90416] text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Radar Re-visites ({clients.length})</span>
            {kpis.overdueClientsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-[#d90416] font-extrabold animate-pulse">
                {kpis.overdueClientsCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher magasin, ville, interlocuteur..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
          />
        </div>
      </div>

      {/* 4. TAB 1: TIMELINE / HISTORIQUE & PLANNING */}
      {/* 4. TAB CONTENT: GLOBAL CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <CalendarView
          visits={allVisits}
          notes={[]}
          onAddVisit={(dateStr) => {
            setAddVisitClientId(null);
            setIsAddVisitModalOpen(true);
          }}
          onSelectVisit={(v) => {
            if (v.clientId) {
              router.push(`/clients/${v.clientId}`);
            }
          }}
        />
      )}

      {/* ONGLET 2: VUE TABLEAU COMPACTE */}
      {activeTab === "table" && (
        <VisitsNotesTableView
          visits={allVisits}
          notes={[]}
          onSelectVisit={(v) => {
            if (v.clientId) {
              router.push(`/clients/${v.clientId}`);
            }
          }}
        />
      )}

      {/* ONGLET 3: TIMELINE & CARTES */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Secondary filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs">
            {/* Status pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                    : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                }`}
              >
                Toutes ({allVisits.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("EFFECTUEE")}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                  statusFilter === "EFFECTUEE"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                }`}
              >
                Effectuées ({kpis.completedVisits})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PLANIFIEE")}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                  statusFilter === "PLANIFIEE"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                }`}
              >
                Planifiées ({kpis.plannedVisits})
              </button>
            </div>

            {/* Dropdowns for Type & Client */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-medium text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les types de visites</option>
                {(Object.keys(CLIENT_VISIT_TYPES) as ClientVisitType[]).map((t) => (
                  <option key={t} value={t}>
                    {CLIENT_VISIT_TYPES[t].label}
                  </option>
                ))}
              </select>

              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-medium text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">Tous les clients ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visits Cards List */}
          {filteredVisits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                Aucune visite ne correspond à vos critères
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Enregistrez une nouvelle visite terrain ou ajustez vos critères de recherche.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAddVisitClientId(null);
                  setIsAddVisitModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Consigner une visite
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredVisits.map((visit) => {
                const typeCfg = CLIENT_VISIT_TYPES[visit.type] || CLIENT_VISIT_TYPES.ROUTINE;
                const isCompleted = visit.status === "EFFECTUEE";
                const isPlanned = visit.status === "PLANIFIEE";

                return (
                  <div
                    key={visit.id}
                    className={`rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md ${
                      isCompleted
                        ? "border-l-4 border-l-emerald-500 border-slate-200/80 dark:border-zinc-800"
                        : isPlanned
                        ? "border-l-4 border-l-blue-500 border-slate-200/80 dark:border-zinc-800"
                        : "border-slate-200/80 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                      {/* Left: Client name + Link + Badges */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/clients/${visit.client.id}`}
                          className="text-sm font-bold text-slate-900 dark:text-zinc-100 hover:text-[#d90416] transition-colors flex items-center gap-1.5"
                        >
                          <Building2 className="w-4 h-4 text-[#d90416]" />
                          <span>{visit.client.company}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>

                        {visit.client.city && (
                          <span className="text-xs text-slate-400">
                            • {visit.client.city}
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeCfg.badgeClass}`}
                        >
                          {typeCfg.label}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isPlanned
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {isCompleted ? "Effectuée" : isPlanned ? "Planifiée" : "Annulée"}
                        </span>
                      </div>

                      {/* Right: Date + Time + Delete */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                          {new Date(visit.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {visit.time && <span className="font-mono text-slate-500">à {visit.time}</span>}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(visit.clientId, visit.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Supprimer cette visite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Interlocutor row */}
                    {visit.interlocutor && (
                      <div className="pt-2.5 pb-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">Interlocuteur rencontré :</span>
                        <strong className="font-semibold text-slate-800 dark:text-zinc-200">
                          {visit.interlocutor}
                        </strong>
                      </div>
                    )}

                    {/* Formatted summary */}
                    <div className="pt-2 text-xs text-slate-700 dark:text-zinc-200 leading-relaxed">
                      <FormattedNoteText content={visit.summary} />
                    </div>

                    {/* Bottom footer: next visit or direct client actions */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {visit.nextVisitDate ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Prochaine visite programmée le :</span>
                            <strong>
                              {new Date(visit.nextVisitDate).toLocaleDateString("fr-FR")}
                            </strong>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Prochaine re-visite : selon rythme du compte
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateFollowUpTask(visit)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                          title="Créer une tâche de suivi Kanban pour cette visite"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>+ Tâche de suivi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAddVisitClientId(visit.clientId);
                            setIsAddVisitModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#d90416] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Autre visite
                        </button>

                        <Link
                          href={`/clients/${visit.client.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <span>Fiche client</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: RADAR DE RE-VISITE (CLIENTS PAR URGENCE) */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          {/* Radar urgency filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setRadarUrgencyFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                radarUrgencyFilter === "ALL"
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
              }`}
            >
              Tous les clients ({clients.length})
            </button>

            <button
              type="button"
              onClick={() => setRadarUrgencyFilter("OVERDUE")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                radarUrgencyFilter === "OVERDUE"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-rose-600 border border-slate-200 dark:border-zinc-700"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>En retard de re-visite ({kpis.overdueClientsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRadarUrgencyFilter("SOON")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                radarUrgencyFilter === "SOON"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>À re-visiter sous peu ({kpis.soonClientsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRadarUrgencyFilter("NEVER")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                radarUrgencyFilter === "NEVER"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
              }`}
            >
              <span>Jamais visités ({kpis.neverClientsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRadarUrgencyFilter("OK")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                radarUrgencyFilter === "OK"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-zinc-700"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>À jour ({kpis.okClientsCount})</span>
            </button>
          </div>

          {/* Table of clients radar */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-950/50 border-b border-slate-200/70 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Client / Magasin</th>
                    <th className="py-3 px-4">Ville</th>
                    <th className="py-3 px-4">Cadence Re-visite</th>
                    <th className="py-3 px-4">Dernière visite</th>
                    <th className="py-3 px-4">Statut d&apos;Urgence</th>
                    <th className="py-3 px-4">Prochaine visite</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {clientsWithStatus.map(({ client, status }) => {
                    const isOverdue = status.urgency === "OVERDUE";
                    const isSoon = status.urgency === "SOON";
                    const isNever = status.urgency === "NEVER";

                    return (
                      <tr
                        key={client.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${
                          isOverdue ? "bg-red-50/30 dark:bg-red-950/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-slate-900 dark:text-zinc-100 hover:text-[#d90416] transition-colors flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                            <span>{client.company}</span>
                          </Link>
                          <div className="text-[11px] text-slate-400">
                            {client.contactName}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-300 font-medium">
                          {client.city || "—"}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800">
                            Tous les {status.revisitIntervalDays}j
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {status.lastVisitDate ? (
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-zinc-200">
                                {status.lastVisitDate.toLocaleDateString("fr-FR")}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Il y a {status.daysSinceLastVisit} jour{status.daysSinceLastVisit && status.daysSinceLastVisit > 1 ? "s" : ""}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Jamais consigné</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isNever && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Jamais visité
                            </span>
                          )}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                              <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                              En retard (+{status.daysOverdue}j)
                            </span>
                          )}
                          {isSoon && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
                              <Clock className="w-3 h-3 text-amber-600" />
                              À re-visiter sous {Math.max(0, status.revisitIntervalDays - (status.daysSinceLastVisit || 0))}j
                            </span>
                          )}
                          {!isNever && !isOverdue && !isSoon && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                              <Check className="w-3 h-3 text-emerald-600" />
                              À jour
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {status.nextPlannedVisit ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(status.nextPlannedVisit.date).toLocaleDateString("fr-FR")}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openQuickTask({ clientId: client.id })}
                              className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[11px] font-semibold transition-colors"
                              title="Créer une tâche Kanban pour ce client"
                            >
                              + Tâche
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddVisitClientId(client.id);
                                setIsAddVisitModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#d90416] hover:bg-[#b80312] text-white text-[11px] font-semibold transition-colors"
                            >
                              + Visite
                            </button>
                            <Link
                              href={`/clients/${client.id}`}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                              title="Ouvrir la fiche client"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: AJOUT / PLANIFICATION D'UNE VISITE */}
      <AddVisitModal
        isOpen={isAddVisitModalOpen}
        onClose={() => {
          setIsAddVisitModalOpen(false);
          setAddVisitClientId(null);
        }}
        clients={clients}
        defaultClientId={addVisitClientId}
        activeKamId={activeUser.id}
        onSaved={() => {
          refreshWorkspace(activeUser.id);
          setSyncTrigger((p) => p + 1);
        }}
      />

      {/* 7. MODAL: PARAMÈTRE DE CADENCE GLOBALE */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Cadence Standard de Re-visite Portefeuille
                </h3>
                <p className="text-xs text-slate-400">
                  Délai par défaut appliqué à tous les clients sans réglage spécifique.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {REVISIT_INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSaveGlobalInterval(opt.value)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                    globalInterval === opt.value
                      ? "border-[#d90416] bg-red-50/50 dark:bg-red-950/20 text-[#d90416]"
                      : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{opt.label}</span>
                  {globalInterval === opt.value && <Check className="w-4 h-4 text-[#d90416]" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
