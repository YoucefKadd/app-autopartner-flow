"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  Search,
  UploadCloud,
  Download,
  Target,
  Pencil,
  Check,
  X,
  ArrowUpDown,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  ShieldAlert,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { ClientItem, hasPermission } from "@/types/kam";
import { MONTH_NAMES, SHORT_MONTHS, MonthlyTurnover } from "@/components/ClientCaSection";
import { CaImportModal } from "@/components/CaImportModal";

type CaSortField = "apCode" | "company" | "city" | "totalTurnover" | "target" | "achievementRate";

export default function CaGlobalDashboardPage() {
  const router = useRouter();
  const { clients, users, activeUser, loggedUser, switchKam, refreshWorkspace, loading } =
    useWorkspace();
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0 to 11

  // Guard: if user has no view_ca permission
  const canViewCa = loggedUser ? hasPermission(loggedUser, "view_ca") : true;

  useEffect(() => {
    if (!loading && loggedUser && !hasPermission(loggedUser, "view_ca")) {
      router.replace("/clients");
    }
  }, [loading, loggedUser, router]);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [dbTurnovers, setDbTurnovers] = useState<any[]>([]);
  const [loadingTurnovers, setLoadingTurnovers] = useState(true);

  const fetchTurnovers = useCallback(async () => {
    setLoadingTurnovers(true);
    try {
      const targetKamId =
        loggedUser?.role === "KAM"
          ? loggedUser.id
          : activeUser?.id && activeUser.id !== "ALL"
          ? activeUser.id
          : "ALL";

      const res = await fetch(`/api/ca?year=${selectedYear}&kamId=${targetKamId}`);
      if (res.ok) {
        const data = await res.json();
        setDbTurnovers(data.turnovers || []);
      }
    } catch (err) {
      console.error("Error loading turnovers:", err);
    } finally {
      setLoadingTurnovers(false);
    }
  }, [selectedYear, loggedUser?.id, loggedUser?.role, activeUser?.id]);

  useEffect(() => {
    fetchTurnovers();
  }, [fetchTurnovers, dataVersion]);


  // Sorting state
  const [sortField, setSortField] = useState<CaSortField>("totalTurnover");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  function handleToggleSort(field: CaSortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "company" || field === "city" || field === "apCode" ? "asc" : "desc");
    }
  }

  // Objective edition modal state
  const [editingTargetClientId, setEditingTargetClientId] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState<string>("");

  // Listen to CA updates
  useEffect(() => {
    function handleSync() {
      setDataVersion((prev) => prev + 1);
    }
    window.addEventListener("apflow_ca_changed", handleSync);
    window.addEventListener("apflow_apcode_changed", handleSync);
    return () => {
      window.removeEventListener("apflow_ca_changed", handleSync);
      window.removeEventListener("apflow_apcode_changed", handleSync);
    };
  }, []);

  // Unique cities from clients
  const cities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [clients]);

  // Load CA & Objectives for all clients strictly from real data (STRICTLY 0 € IF NO DATA)
  const clientsWithCa = useMemo(() => {
    return clients.map((client) => {
      // Find client's turnovers from MySQL DB
      const clientTurnovers = dbTurnovers.filter((t: any) => t.clientId === client.id);

      // Monthly data: 12 months, STRICTLY 0 € for any month without data!
      const monthly: MonthlyTurnover[] = MONTH_NAMES.map((name, idx) => {
        const monthNum = idx + 1;
        const found = clientTurnovers.find((t: any) => t.month === monthNum);
        const amount = found ? Number(found.amount) || 0 : 0;
        const ordersCount = found ? Number(found.ordersCount) || 0 : 0;
        return {
          month: monthNum,
          monthName: name,
          amount,
          ordersCount,
          status: amount > 0 ? "FACTURE" : "NON_COMMUNIQUE",
        };
      });

      // Target: check db month 0 or target field, then localStorage fallback, else 0
      const targetItem = clientTurnovers.find((t: any) => t.month === 0) || clientTurnovers.find((t: any) => t.target && t.target > 0);
      let target = targetItem && targetItem.target > 0 ? Number(targetItem.target) : 0;
      if (!target && typeof window !== "undefined") {
        const savedTarget = localStorage.getItem(`apflow_ca_target_${client.id}_${selectedYear}`);
        if (savedTarget) {
          const parsed = parseInt(savedTarget, 10);
          if (!isNaN(parsed) && parsed > 0) target = parsed;
        }
      }

      // Retrieve AP Code
      const apCode = client.apClientNumber || (typeof window !== "undefined" ? localStorage.getItem(`apflow_apcode_${client.id}`) || "" : "");

      const totalTurnover = monthly.reduce((acc, m) => acc + m.amount, 0);
      const totalOrders = monthly.reduce((acc, m) => acc + m.ordersCount, 0);
      const achievementRate = target > 0 ? Math.round((totalTurnover / target) * 100) : 0;

      return {
        ...client,
        apCode,
        monthly,
        target,
        totalTurnover,
        totalOrders,
        achievementRate,
      };
    });
  }, [clients, dbTurnovers, selectedYear]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    const list = clientsWithCa.filter((c) => {
      if (selectedCity !== "ALL" && c.city !== selectedCity) return false;
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.company.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.apCode && c.apCode.toLowerCase().includes(q))
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "company") {
        comparison = a.company.localeCompare(b.company, "fr", { sensitivity: "base" });
      } else if (sortField === "city") {
        comparison = a.city.localeCompare(b.city, "fr", { sensitivity: "base" });
      } else if (sortField === "apCode") {
        comparison = (a.apCode || "").localeCompare(b.apCode || "", "fr", { numeric: true });
      } else if (sortField === "totalTurnover") {
        comparison = a.totalTurnover - b.totalTurnover;
      } else if (sortField === "target") {
        comparison = a.target - b.target;
      } else if (sortField === "achievementRate") {
        comparison = a.achievementRate - b.achievementRate;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [clientsWithCa, selectedCity, selectedStatus, searchTerm, sortField, sortOrder]);

  // Global Aggregate KPI Stats
  const globalStats = useMemo(() => {
    const totalCa = filteredClients.reduce((acc, c) => acc + c.totalTurnover, 0);
    const totalTarget = filteredClients.reduce((acc, c) => acc + c.target, 0);
    const totalOrders = filteredClients.reduce((acc, c) => acc + c.totalOrders, 0);
    const globalRate = totalTarget > 0 ? Math.round((totalCa / totalTarget) * 100) : 0;
    const avgBasket = totalOrders > 0 ? Math.round(totalCa / totalOrders) : 0;

    // Monthly cumulative across filtered clients
    const monthlyTotals = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const sum = filteredClients.reduce((acc, c) => {
        const m = c.monthly.find((item) => item.month === monthNum);
        return acc + (m ? m.amount : 0);
      }, 0);
      return {
        month: monthNum,
        name: SHORT_MONTHS[idx],
        fullName: name,
        amount: sum,
      };
    });

    const maxMonthAmount = Math.max(...monthlyTotals.map((m) => m.amount), 1000);

    // Breakdown by City
    const cityMap = new Map<string, number>();
    filteredClients.forEach((c) => {
      const city = c.city || "Autres";
      cityMap.set(city, (cityMap.get(city) || 0) + c.totalTurnover);
    });
    const cityBreakdown = Array.from(cityMap.entries())
      .map(([city, ca]) => ({
        city,
        ca,
        pct: totalCa > 0 ? Math.round((ca / totalCa) * 100) : 0,
      }))
      .sort((a, b) => b.ca - a.ca);

    // Top 5 Clients by CA
    const topClients = [...filteredClients]
      .sort((a, b) => b.totalTurnover - a.totalTurnover)
      .slice(0, 5);

    return {
      totalCa,
      totalTarget,
      totalOrders,
      globalRate,
      avgBasket,
      monthlyTotals,
      maxMonthAmount,
      cityBreakdown,
      topClients,
    };
  }, [filteredClients]);

  // Handle Target Update
  async function handleSaveTarget(clientId: string) {
    const num = parseInt(editingTargetValue.replace(/\D/g, ""), 10) || 0;
    localStorage.setItem(`apflow_ca_target_${clientId}_${selectedYear}`, num.toString());
    setDataVersion((prev) => prev + 1);
    setEditingTargetClientId(null);

    try {
      await fetch("/api/ca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          year: selectedYear,
          month: 0,
          target: num,
        }),
      });
      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
    } catch (err) {
      console.error("Error saving target to DB:", err);
    }
  }

  function formatEuro(val: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  function handleExportCsv() {
    const headers = [
      "Code AP",
      "Client / Magasin",
      "Ville",
      "Statut",
      "Exercice",
      "CA Total HT",
      "Objectif Annuel HT",
      "% Atteinte",
      "Commandes",
      ...MONTH_NAMES.map((m) => `CA ${m}`),
    ];

    const rows = filteredClients.map((c) => [
      c.apCode || "—",
      c.company,
      c.city,
      c.status,
      selectedYear,
      c.totalTurnover,
      c.target,
      `${c.achievementRate}%`,
      c.totalOrders,
      ...c.monthly.map((m) => m.amount),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers, ...rows].map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_ca_global_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!loading && !canViewCa) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#d90416] flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
          Accès restreint au Chiffre d&apos;Affaires
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Votre compte ne dispose pas des autorisations nécessaires pour consulter les données financières et le Chiffre d&apos;Affaires.
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

  return (
    <div className="p-3.5 sm:p-6 lg:px-8 lg:py-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Header with Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Chiffre d&apos;Affaires Global &amp; Pilotage
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#d90416]/10 text-[#d90416] font-bold">
                  Auto Partner
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Vue analytique consolidée, objectifs de vente par client et répartition géographique
              </p>
            </div>
          </div>
        </div>

        {/* Top Right: Exercise Selector + Import CSV + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* KAM / Team Scope Selector for Manager, Directeur & Super Admin */}
          {(loggedUser?.role === "SUPER_ADMIN" || loggedUser?.role === "DIRECTEUR" || loggedUser?.role === "MANAGER") && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-xs">
              <span className="text-slate-500 text-[11px]">Périmètre :</span>
              <select
                value={activeUser?.id || "ALL"}
                onChange={(e) => switchKam(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-zinc-100 focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">
                  {loggedUser?.role === "MANAGER"
                    ? "Toute mon équipe (CA consolidé)"
                    : "Tous les KAM (CA consolidé)"}
                </option>
                {users
                  .filter((u) => {
                    if (loggedUser?.role === "MANAGER") {
                      return u.managerId === loggedUser.id || u.id === loggedUser.id;
                    }
                    return u.role === "KAM";
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      KAM : {u.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Year Selector */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
            <span className="text-slate-500 text-[11px]">Exercice :</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors shadow-xs"
            title="Importer un fichier de CA et achats AX au format CSV"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Importer Fichier CA & AX (CSV)</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Rapport</span>
          </button>
        </div>
      </div>

      {/* 2. Top Consolidated KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Turnover */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">CA Global Réalisé</span>
            <DollarSign className="w-4 h-4 text-[#d90416]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {formatEuro(globalStats.totalCa)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Exercice {selectedYear}</span>
            <span>•</span>
            <span>{filteredClients.length} clients suivis</span>
          </div>
        </div>

        {/* Card 2: Annual Target & Achievement */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Objectif Global Fixé</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {globalStats.totalTarget > 0 ? formatEuro(globalStats.totalTarget) : "NC"}
          </div>
          {globalStats.totalTarget > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, globalStats.globalRate)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {globalStats.globalRate}%
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              Aucun objectif fixé pour cet exercice
            </div>
          )}
        </div>

        {/* Card 3: Total Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Volume de Commandes</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {globalStats.totalOrders.toLocaleString("fr-FR")}
          </div>
          <div className="text-[11px] text-slate-500">
            Flux de commandes facturées sur l&apos;année
          </div>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Panier Moyen Magasin</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {formatEuro(globalStats.avgBasket)}
          </div>
          <div className="text-[11px] text-slate-500">
            Montant HT moyen par commande client
          </div>
        </div>
      </div>

      {/* 3. Consolidated Monthly Turnover Chart + Geographic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Bar Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#d90416]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Évolution Mensuelle Consolidée du CA ({selectedYear})
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-[#d90416]">
              {formatEuro(globalStats.totalCa)} Total
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-100 dark:border-zinc-800">
            {globalStats.monthlyTotals.map((m) => {
              const heightPct =
                globalStats.maxMonthAmount > 0
                  ? Math.max(4, Math.round((m.amount / globalStats.maxMonthAmount) * 100))
                  : 4;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white dark:bg-zinc-800 text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                    <span className="font-bold">{m.fullName}</span>: {formatEuro(m.amount)}
                  </div>

                  {/* Value on top of bar if > 0 */}
                  {m.amount > 0 && (
                    <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-zinc-400 mb-1 opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block">
                      {Math.round(m.amount / 1000)}k
                    </span>
                  )}

                  {/* The Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[32px] rounded-t-lg transition-all ${
                      m.amount > 0
                        ? "bg-[#d90416] hover:bg-[#b80312] shadow-xs"
                        : "bg-slate-100 dark:bg-zinc-800"
                    }`}
                  />

                  {/* Month Label */}
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-2">
                    {m.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographic Breakdown & Top 5 Clients (1 col) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#d90416]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Répartition Géographique
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Par Ville</span>
          </div>

          {/* City Progress Bars */}
          <div className="space-y-3 pt-1">
            {globalStats.cityBreakdown.slice(0, 5).map((city) => (
              <div key={city.city} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {city.city}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 dark:text-zinc-300">
                      {formatEuro(city.ca)}
                    </span>
                    <span className="font-bold text-[#d90416] text-[11px]">
                      {city.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="bg-[#d90416] h-full rounded-full"
                    style={{ width: `${city.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5">
              Top 3 Magasins Leader
            </h3>
            <div className="space-y-2">
              {globalStats.topClients.slice(0, 3).map((top, idx) => (
                <div
                  key={top.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#d90416] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold truncate text-slate-800 dark:text-zinc-200">
                      {top.company}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-[#d90416] shrink-0">
                    {formatEuro(top.totalTurnover)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Clients Table with Direct Target Modification & Monthly Details */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              Détail des Chiffres d&apos;Affaires &amp; Objectifs par Client
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                {filteredClients.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Cliquez sur l&apos;icône crayon pour ajuster l&apos;objectif annuel de chaque compte
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher client, code AP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] w-48"
              />
            </div>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value="ALL">Toutes les Villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="VIP">VIP</option>
              <option value="ACTIVE">Actif</option>
              <option value="NEW">Nouveau</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-zinc-950/40 text-slate-700 dark:text-zinc-300 font-bold border-y border-slate-100 dark:border-zinc-800 select-none">
              <tr>
                <th
                  onClick={() => handleToggleSort("apCode")}
                  className="py-2.5 px-3 cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Code AP</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "apCode" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort("company")}
                  className="py-2.5 px-3 cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Client / Magasin</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "company" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort("city")}
                  className="py-2.5 px-3 cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ville</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "city" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort("totalTurnover")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>CA Réalisé {selectedYear}</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "totalTurnover" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort("target")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Objectif Annuel HT</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "target" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort("achievementRate")}
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-[#d90416] transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>% Atteinte</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "achievementRate" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Historique Mensuel</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
              {filteredClients.map((client) => {
                const isEditingThisTarget = editingTargetClientId === client.id;

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Code AP */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-zinc-100">
                      {client.apCode || "—"}
                    </td>

                    {/* Client Name + Link */}
                    <td className="py-3 px-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-bold text-slate-900 dark:text-zinc-100 hover:text-[#d90416] transition-colors flex items-center gap-1.5"
                      >
                        <span>{client.company}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {client.contactName}
                      </div>
                    </td>

                    {/* City */}
                    <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">
                      {client.city}
                    </td>

                    {/* Total CA */}
                    <td className="py-3 px-3 text-right font-bold text-[#d90416] font-mono text-sm">
                      {formatEuro(client.totalTurnover)}
                    </td>

                    {/* Target with Inline Modification */}
                    <td className="py-3 px-3 text-right">
                      {isEditingThisTarget ? (
                        <div className="inline-flex items-center gap-1 justify-end">
                          <input
                            type="text"
                            value={editingTargetValue}
                            onChange={(e) => setEditingTargetValue(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-[#d90416] text-xs font-mono font-bold text-right bg-white dark:bg-zinc-900 focus:outline-none"
                            placeholder="Ex: 120000"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTarget(client.id)}
                            className="p-1 rounded bg-[#d90416] text-white hover:bg-[#b80312]"
                            title="Enregistrer l'objectif"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTargetClientId(null)}
                            className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">
                            {client.target > 0 ? formatEuro(client.target) : "NC"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTargetClientId(client.id);
                              setEditingTargetValue(client.target > 0 ? client.target.toString() : "");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Modifier l'objectif annuel de ce client"
                          >
                            <Pencil className="w-3 h-3 text-[#d90416]" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* % Achievement */}
                    <td className="py-3 px-3 text-center">
                      {client.target > 0 ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                            client.achievementRate >= 100
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : client.achievementRate >= 60
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {client.achievementRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">NC</span>
                      )}
                    </td>

                    {/* Monthly Mini Sparkline / Grid */}
                    <td className="py-3 px-3">
                      <div className="flex items-end justify-center gap-1 h-7">
                        {client.monthly.map((m) => {
                          const maxClient = Math.max(...client.monthly.map((x) => x.amount), 2000);
                          const h = m.amount > 0 ? Math.max(3, Math.round((m.amount / maxClient) * 24)) : 2;
                          return (
                            <div
                              key={m.month}
                              title={`${m.monthName}: ${formatEuro(m.amount)}`}
                              style={{ height: `${h}px` }}
                              className={`w-1.5 rounded-xs transition-colors ${
                                m.amount > 0 ? "bg-[#d90416]" : "bg-slate-200 dark:bg-zinc-800"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </td>

                    {/* Action Link to Single Client CA Tab */}
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-[#d90416] hover:border-[#d90416]/50 text-[11px] font-medium transition-colors"
                      >
                        <span>Fiche CA</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Csv Import Modal */}
      <CaImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={async () => {
          await refreshWorkspace(activeUser?.id);
          setDataVersion((prev) => prev + 1);
        }}
      />
    </div>
  );
}
