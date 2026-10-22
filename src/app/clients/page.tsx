"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ListFilter,
  LayoutList,
  AlignJustify,
  LayoutGrid,
  Columns3,
  Plus,
  ChevronDown,
  RefreshCw,
  Download,
  UploadCloud,
  Calendar,
  AlertTriangle,
  Clock,
  Sliders,
  Check,
} from "lucide-react";
import {
  ClientStatus,
  CLIENT_STATUS_CONFIG,
  ClientItem,
  getAssignedManagerIds,
} from "@/types/kam";
import { useWorkspace } from "@/components/AppShell";
import { ClientsViews } from "@/components/ClientsViews";
import { ClientsMapView } from "@/components/ClientsMapView";
import { Map as MapIcon } from "lucide-react";
import { DeleteClientModal } from "@/components/DeleteClientModal";
import { AddVisitModal } from "@/components/AddVisitModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { CaImportModal } from "@/components/CaImportModal";
import { TrendingUp } from "lucide-react";
import {
  getClientVisitStatus,
  REVISIT_INTERVAL_OPTIONS,
  DEFAULT_REVISIT_INTERVAL_DAYS,
} from "@/lib/visits";

export default function ClientsRoutePage() {
  const router = useRouter();
  const {
    users,
    activeUser,
    loggedUser,
    clients,
    tasks,
    loading,
    globalSearch,
    refreshWorkspace,
    switchKam,
    openQuickNote,
    openQuickTask,
    openClientModal,
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<"table" | "compact" | "grid" | "kanban" | "map">(
    "table"
  );
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [visitFilter, setVisitFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(100);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // CSV Import modal state
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isCaAxImportOpen, setIsCaAxImportOpen] = useState(false);

  // Visit modal & settings state
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [addVisitClientId, setAddVisitClientId] = useState<string | null>(null);
  const [isRevisitSettingsModalOpen, setIsRevisitSettingsModalOpen] = useState(false);
  const [globalRevisitInterval, setGlobalRevisitInterval] = useState<number>(DEFAULT_REVISIT_INTERVAL_DAYS);
  const [visitSyncTrigger, setVisitSyncTrigger] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("apflow_global_revisit_interval");
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) setGlobalRevisitInterval(val);
      }
    }
  }, []);

  useEffect(() => {
    function handleSync() {
      setVisitSyncTrigger((prev) => prev + 1);
    }
    window.addEventListener("apflow_visits_updated", handleSync);
    window.addEventListener("apflow_apcode_changed", handleSync);
    window.addEventListener("apflow_cp_changed", handleSync);
    window.addEventListener("apflow_logo_changed", handleSync);
    return () => {
      window.removeEventListener("apflow_visits_updated", handleSync);
      window.removeEventListener("apflow_apcode_changed", handleSync);
      window.removeEventListener("apflow_cp_changed", handleSync);
      window.removeEventListener("apflow_logo_changed", handleSync);
    };
  }, []);

  // Delete modal state
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Client CRUD handlers
  function promptDeleteClient(clientId: string) {
    const target = clients.find((c) => c.id === clientId);
    if (target) {
      setClientToDelete(target);
    }
  }

  async function handleConfirmDelete() {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/clients/${clientToDelete.id}`, { method: "DELETE" });
      setSelectedClientIds((prev) => prev.filter((id) => id !== clientToDelete.id));
      setClientToDelete(null);
      refreshWorkspace(activeUser?.id);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmArchive() {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      setClientToDelete(null);
      refreshWorkspace(activeUser?.id);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleChangeClientStatus(
    clientId: string,
    status: ClientStatus
  ) {
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refreshWorkspace(activeUser?.id);
  }

  async function handleBulkDelete() {
    await Promise.all(
      selectedClientIds.map((id) =>
        fetch(`/api/clients/${id}`, { method: "DELETE" })
      )
    );
    setSelectedClientIds([]);
    refreshWorkspace(activeUser?.id);
  }

  async function handleBulkStatusChange(status: ClientStatus) {
    await Promise.all(
      selectedClientIds.map((id) =>
        fetch(`/api/clients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setSelectedClientIds([]);
    refreshWorkspace(activeUser?.id);
  }

  // Distinct cities for dropdown filter
  const cities = Array.from(
    new Set(clients.map((c) => c.city).filter(Boolean))
  );

  // Calculate visit statistics across clients
  const visitStats = useMemo(() => {
    let overdueCount = 0;
    let soonCount = 0;
    let okCount = 0;
    let neverCount = 0;
    let plannedCount = 0;
    let prospectsCount = 0;

    clients.forEach((c) => {
      if (c.status === "PROSPECT") prospectsCount++;
      const vs = getClientVisitStatus(c);
      if (vs.urgency === "OVERDUE") overdueCount++;
      else if (vs.urgency === "SOON") soonCount++;
      else if (vs.urgency === "OK") okCount++;
      else if (vs.urgency === "NEVER") neverCount++;
      if (vs.nextPlannedVisit) plannedCount++;
    });

    return {
      overdueCount,
      soonCount,
      okCount,
      neverCount,
      plannedCount,
      prospectsCount,
      total: clients.length,
    };
  }, [clients, visitSyncTrigger]);

  // Filtered clients
  const filteredClients = clients.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (cityFilter !== "ALL" && c.city !== cityFilter) return false;

    // Visit filter
    if (visitFilter !== "ALL") {
      const vs = getClientVisitStatus(c);
      if (visitFilter === "OVERDUE" && vs.urgency !== "OVERDUE") return false;
      if (
        visitFilter === "OVER_30" &&
        (vs.daysSinceLastVisit === null || vs.daysSinceLastVisit <= 30)
      )
        return false;
      if (
        visitFilter === "OVER_60" &&
        (vs.daysSinceLastVisit === null || vs.daysSinceLastVisit <= 60)
      )
        return false;
      if (visitFilter === "NEVER" && vs.urgency !== "NEVER") return false;
      if (visitFilter === "PLANNED" && !vs.nextPlannedVisit) return false;
    }

    const combinedQuery = (globalSearch + " " + tableSearch)
      .trim()
      .toLowerCase();
    if (combinedQuery) {
      let apCode = c.apClientNumber || "";
      let postalCode = c.postalCode || "";
      if (typeof window !== "undefined") {
        if (!apCode) {
          apCode = localStorage.getItem(`apflow_apcode_${c.id}`) || "";
          if (!apCode) {
            try {
              const f = localStorage.getItem(`apflow_fiche_v4_${c.id}`);
              if (f) {
                const parsed = JSON.parse(f);
                if (parsed.apClientNumber) apCode = parsed.apClientNumber;
              }
            } catch {}
          }
        }
        if (!apCode) {
          apCode = String(
            3300000 +
              Math.abs(
                c.id
                  .split("")
                  .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 900000, 0)
              )
          );
        }
        if (!postalCode) {
          postalCode = localStorage.getItem(`apflow_cp_${c.id}`) || "";
          if (!postalCode) {
            try {
              const a = localStorage.getItem(`apflow_addresses_v4_${c.id}`);
              if (a) {
                const parsed = JSON.parse(a);
                const primary = parsed.find((item: any) => item.isPrimary) || parsed[0];
                if (primary?.postalCode) postalCode = primary.postalCode;
                else if (primary?.zipCity) {
                  const match = primary.zipCity.match(/\b\d{5}\b/);
                  if (match) postalCode = match[0];
                }
              }
            } catch {}
          }
        }
      }

      // Check all search tokens against client fields
      const tokens = combinedQuery.split(/\s+/).filter(Boolean);
      return tokens.every((token) => {
        return (
          c.company.toLowerCase().includes(token) ||
          c.contactName.toLowerCase().includes(token) ||
          c.email.toLowerCase().includes(token) ||
          (c.phone && c.phone.toLowerCase().includes(token)) ||
          c.city.toLowerCase().includes(token) ||
          (postalCode && postalCode.toLowerCase().includes(token)) ||
          (apCode && apCode.toLowerCase().includes(token)) ||
          c.position.toLowerCase().includes(token) ||
          c.status.toLowerCase().includes(token)
        );
      });
    }
    return true;
  });

  function handleExportCsv() {
    const headers = [
      "Magasin / Enseigne",
      "Ville",
      "Interlocuteur Principal",
      "Fonction",
      "Email",
      "Telephone",
      "Statut",
      "Score Sante",
    ];
    const rows = filteredClients.map((c) => [
      c.company,
      c.city,
      c.contactName,
      c.position,
      c.email,
      c.phone,
      c.status,
      `${c.healthScore}%`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "portefeuille_clients_kam.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleToggleSelectClient(id: string) {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll() {
    const displayed = filteredClients.slice(0, pageSize);
    if (
      displayed.length > 0 &&
      displayed.every((c) => selectedClientIds.includes(c.id))
    ) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(displayed.map((c) => c.id));
    }
  }

  if (loading) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement de votre portefeuille clients...
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 lg:px-8 lg:py-6 space-y-4 sm:space-y-5 w-full">
      {/* Prominent Count Header + Quick status filter pills (avec PROSPECT) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {filteredClients.length} client
            {filteredClients.length > 1 ? "s" : ""}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Suivi des comptes, visites terrain et rythme de re-visite KAM
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs overflow-x-auto max-w-full pb-1">
          {(["ALL", "VIP", "ACTIVE", "PROSPECT", "FOLLOW_UP", "NEW"] as const).map((st) => {
            const label =
              st === "ALL" ? "Tous" : CLIENT_STATUS_CONFIG[st].label;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  statusFilter === st
                    ? "bg-[#d90416] text-white"
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50"
                }`}
              >
                {label}
                {st === "PROSPECT" && visitStats.prospectsCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === st ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"}`}>
                    {visitStats.prospectsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* BANDEAU MÉTIER : VISIBILITÉ VISITES CLIENTS & ALERTES RE-VISITE */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Suivi des Visites Clients Terrain
                <span className="text-[11px] font-normal normal-case text-slate-500 dark:text-zinc-400">
                  (Rythme par défaut : tous les <strong>{globalRevisitInterval} jours</strong>)
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Surveillance automatique des délais d&apos;inactivité et alertes de retard de re-visite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton réglage rythme re-visite */}
            <button
              type="button"
              onClick={() => setIsRevisitSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title="Configurer la fréquence de re-visite souhaitée pour les clients"
            >
              <Sliders className="w-3.5 h-3.5 text-[#d90416]" />
              Rythme de re-visite
            </button>

            {/* Bouton Consigner une visite */}
            <button
              type="button"
              onClick={() => {
                setAddVisitClientId(clients[0]?.id || null);
                setIsAddVisitModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
              + Consigner une visite
            </button>
          </div>
        </div>

        {/* Boutons filtres dynamiques de visites */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setVisitFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "ALL"
                ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
            }`}
          >
            <span>Toutes les visites ({clients.length})</span>
          </button>

          {/* En retard de re-visite */}
          <button
            type="button"
            onClick={() => setVisitFilter("OVERDUE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "OVERDUE"
                ? "bg-rose-600 text-white shadow-xs"
                : visitStats.overdueCount > 0
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100"
                : "bg-slate-50 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-slate-200/60 dark:border-zinc-800"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${visitStats.overdueCount > 0 ? "text-rose-600 animate-pulse" : ""}`} />
            <span>En retard de re-visite</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${visitFilter === "OVERDUE" ? "bg-white/20 text-white" : "bg-rose-600 text-white"}`}>
              {visitStats.overdueCount}
            </span>
          </button>

          {/* Non visités > 30 jours */}
          <button
            type="button"
            onClick={() => setVisitFilter("OVER_30")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "OVER_30"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Non visité &gt; 30 jours</span>
          </button>

          {/* Non visités > 60 jours */}
          <button
            type="button"
            onClick={() => setVisitFilter("OVER_60")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "OVER_60"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>Non visité &gt; 60 jours</span>
          </button>

          {/* Jamais visité */}
          <button
            type="button"
            onClick={() => setVisitFilter("NEVER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "NEVER"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200"
            }`}
          >
            <span>Jamais visité</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200">
              {visitStats.neverCount}
            </span>
          </button>

          {/* Visites planifiées */}
          <button
            type="button"
            onClick={() => setVisitFilter("PLANNED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              visitFilter === "PLANNED"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Visites planifiées ({visitStats.plannedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value="ALL">Statut du compte</option>
              {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map(
                (st) => (
                  <option key={st} value={st}>
                    {CLIENT_STATUS_CONFIG[st].label}
                  </option>
                )
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* KAM Owner pill - Visible to Super Admin, Directeur, and Manager */}
          {(loggedUser?.role === "SUPER_ADMIN" || loggedUser?.role === "DIRECTEUR" || loggedUser?.role === "MANAGER") && (
            <div className="relative">
              <select
                value={activeUser?.id || "ALL"}
                onChange={(e) => switchKam(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#d90416] cursor-pointer"
              >
                <option value="ALL">
                  {loggedUser?.role === "MANAGER" ? "Mon Équipe (Tous les KAM)" : "Tous les portefeuilles (Vue globale)"}
                </option>
                {users
                  .filter((u) => {
                    if (loggedUser?.role === "MANAGER") {
                      return getAssignedManagerIds(u).includes(loggedUser.id) || u.id === loggedUser.id;
                    }
                    return u.role === "KAM";
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      KAM : {u.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* City / More filter */}
          <div className="relative">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="appearance-none rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value="ALL">Plus de filtres (Ville)</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <ListFilter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Controls: 3-View Toggle + Export + Red Create Contact CTA */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-between sm:justify-end w-full md:w-auto">
          {/* 4 Views Switcher (Table / Compact / Kanban / Grid) */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Vue Tableau Standard"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              title="Vue Compacte"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "compact"
                  ? "bg-slate-100 dark:bg-zinc-800 text-[#d90416] font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              title="Vue Kanban"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "kanban"
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Vue Grille"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              title="Vue Carte Géographique"
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                viewMode === "map"
                  ? "bg-[#d90416] text-white font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="text-[11px] font-bold hidden sm:inline pr-0.5">Carte</span>
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Import CSV Rapport button */}
          <button
            type="button"
            onClick={() => setIsCsvImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 transition-colors shadow-xs"
            title="Importer un fichier CSV (Sales_City.csv, etc.) pour créer/mettre à jour la base clients et l'historique CA"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Importer CSV</span>
          </button>

          {/* Import CA & AX button */}
          <button
            type="button"
            onClick={() => setIsCaAxImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold text-purple-900 dark:text-purple-200 transition-colors shadow-xs"
            title="Importer et rapprocher les 2 fichiers CSV (Ventes CA & Achats AX)"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Importer CA &amp; AX</span>
          </button>

          {/* Primary Auto Partner Red Button ("Nouveau client") */}
          <button
            type="button"
            onClick={() => openClientModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau client</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <ClientsMapView
          clients={filteredClients}
          onSelectClient={(client) => router.push(`/clients/${client.id}`)}
          onAddVisitForClient={(clientId) => {
            setAddVisitClientId(clientId);
            setIsAddVisitModalOpen(true);
          }}
        />
      ) : (
        <ClientsViews
        viewMode={viewMode}
        clients={filteredClients}
        activeUser={activeUser}
        tableSearch={tableSearch}
        onTableSearchChange={setTableSearch}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        selectedIds={selectedClientIds}
        onToggleSelect={handleToggleSelectClient}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedClientIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onSelectClient={(client) => router.push(`/clients/${client.id}`)}
        onEditClient={(client) => openClientModal(client)}
        onDeleteClient={promptDeleteClient}
        onQuickNoteForClient={(clientId) => openQuickNote({ clientId })}
        onQuickTaskForClient={(clientId, task) => openQuickTask({ clientId, task })}
        tasks={tasks}
        onAddVisitForClient={(clientId) => {
          setAddVisitClientId(clientId);
          setIsAddVisitModalOpen(true);
        }}
        onChangeStatus={handleChangeClientStatus}
      />
      )}

      {/* Add Visit Modal */}
      <AddVisitModal
        isOpen={isAddVisitModalOpen}
        onClose={() => {
          setIsAddVisitModalOpen(false);
          setAddVisitClientId(null);
        }}
        clients={clients}
        defaultClientId={addVisitClientId}
        activeKamId={activeUser?.id || ""}
        onSaved={() => {
          refreshWorkspace(activeUser?.id);
          setVisitSyncTrigger((p) => p + 1);
        }}
      />

      {/* Revisit Rhythm Global Settings Modal */}
      {isRevisitSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Rythme de re-visite client
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Délai standard entre 2 visites terrain
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevisitSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Définissez la fréquence cible à laquelle vos clients doivent être visités. Lorsque ce délai est dépassé, le client passe automatiquement en alerte <strong className="text-rose-600 font-bold">&quot;En retard de re-visite&quot;</strong>.
            </p>

            <div className="space-y-2 pt-1">
              {REVISIT_INTERVAL_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    setGlobalRevisitInterval(opt.value);
                    localStorage.setItem("apflow_global_revisit_interval", opt.value.toString());
                    window.dispatchEvent(new CustomEvent("apflow_visits_updated", { detail: {} }));
                    setIsRevisitSettingsModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                    globalRevisitInterval === opt.value
                      ? "border-[#d90416] bg-red-50/60 dark:bg-red-950/30 text-[#d90416]"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{opt.label}</span>
                  {globalRevisitInterval === opt.value && (
                    <Check className="w-4 h-4 text-[#d90416]" />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 dark:text-zinc-500">
              Astuce : Vous pouvez aussi personnaliser un rythme spécifique propre à chaque client depuis sa fiche.
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal with interactive mapping and CA synchronization */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={async () => {
          await refreshWorkspace(activeUser?.id);
        }}
      />

      {/* CA & AX Dual CSV Import Modal */}
      <CaImportModal
        isOpen={isCaAxImportOpen}
        onClose={() => setIsCaAxImportOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={async () => {
          await refreshWorkspace(activeUser?.id);
        }}
      />

      {/* Delete / Archive Confirmation Modal */}
      {clientToDelete && (
        <DeleteClientModal
          isOpen={true}
          onClose={() => setClientToDelete(null)}
          clientName={clientToDelete.company}
          onConfirmDelete={handleConfirmDelete}
          onConfirmArchive={handleConfirmArchive}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
