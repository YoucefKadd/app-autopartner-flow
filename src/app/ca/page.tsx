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
  LineChart,
  Layers,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  ShieldAlert,
  RotateCcw,
  Eye,
  Table as TableIcon,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { ClientItem, hasPermission, getAssignedManagerIds } from "@/types/kam";
import { MONTH_NAMES, SHORT_MONTHS, MonthlyTurnover } from "@/components/ClientCaSection";
import { CaImportModal } from "@/components/CaImportModal";

type CaSortField =
  | "apCode"
  | "company"
  | "city"
  | "totalTurnover"
  | "selectedMonthTurnover"
  | "target"
  | "achievementRate"
  | string;

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
  const [chartType, setChartType] = useState<"bar" | "line" | "cumulative">("bar");
  // Multi-Month selection state: empty array or 12 items means "Année complète"
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const isAllMonthsSelected = selectedMonths.length === 0 || selectedMonths.length === 12;

  const activeMonthList = useMemo(() => {
    return isAllMonthsSelected
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [...selectedMonths].sort((a, b) => a - b);
  }, [isAllMonthsSelected, selectedMonths]);

  function toggleMonth(monthNum: number) {
    setSelectedMonths((prev) => {
      if (prev.length === 0 || prev.length === 12) {
        return [monthNum];
      }
      if (prev.includes(monthNum)) {
        const next = prev.filter((m) => m !== monthNum);
        return next;
      } else {
        const next = [...prev, monthNum].sort((a, b) => a - b);
        return next.length === 12 ? [] : next;
      }
    });
  }

  function selectPreset(preset: "ALL" | "T1" | "T2" | "T3" | "T4" | "S1" | "S2") {
    if (preset === "ALL") setSelectedMonths([]);
    else if (preset === "T1") setSelectedMonths([1, 2, 3]);
    else if (preset === "T2") setSelectedMonths([4, 5, 6]);
    else if (preset === "T3") setSelectedMonths([7, 8, 9]);
    else if (preset === "T4") setSelectedMonths([10, 11, 12]);
    else if (preset === "S1") setSelectedMonths([1, 2, 3, 4, 5, 6]);
    else if (preset === "S2") setSelectedMonths([7, 8, 9, 10, 11, 12]);
  }

  const periodLabel = useMemo(() => {
    if (isAllMonthsSelected) return "Année Complète (12 mois)";
    if (selectedMonths.length === 1) return MONTH_NAMES[selectedMonths[0] - 1];
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    const s = JSON.stringify(sorted);
    if (s === JSON.stringify([1, 2, 3])) return "Trimestre 1 (Jan-Mar)";
    if (s === JSON.stringify([4, 5, 6])) return "Trimestre 2 (Avr-Juin)";
    if (s === JSON.stringify([7, 8, 9])) return "Trimestre 3 (Juil-Sep)";
    if (s === JSON.stringify([10, 11, 12])) return "Trimestre 4 (Oct-Déc)";
    if (s === JSON.stringify([1, 2, 3, 4, 5, 6])) return "Semestre 1 (Jan-Juin)";
    if (s === JSON.stringify([7, 8, 9, 10, 11, 12])) return "Semestre 2 (Juil-Déc)";
    return `${sorted.length} mois (${sorted.map((m) => SHORT_MONTHS[m - 1]).join(", ")})`;
  }, [isAllMonthsSelected, selectedMonths]);

  const [tableMode, setTableMode] = useState<"summary" | "grid12">("summary"); // summary | grid12
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
      setSortOrder(
        field === "company" || field === "city" || field === "apCode" ? "asc" : "desc"
      );
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
      const targetItem =
        clientTurnovers.find((t: any) => t.month === 0) ||
        clientTurnovers.find((t: any) => t.target && t.target > 0);
      let target = targetItem && targetItem.target > 0 ? Number(targetItem.target) : 0;
      if (!target && typeof window !== "undefined") {
        const savedTarget = localStorage.getItem(`apflow_ca_target_${client.id}_${selectedYear}`);
        if (savedTarget) {
          const parsed = parseInt(savedTarget, 10);
          if (!isNaN(parsed) && parsed > 0) target = parsed;
        }
      }

      // Retrieve AP Code
      const apCode =
        client.apClientNumber ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`apflow_apcode_${client.id}`) || ""
          : "");

      const totalTurnover = monthly.reduce((acc, m) => acc + m.amount, 0);
      const totalOrders = monthly.reduce((acc, m) => acc + m.ordersCount, 0);
      const achievementRate = target > 0 ? Math.round((totalTurnover / target) * 100) : 0;

      const selectedMonthTurnover = isAllMonthsSelected
        ? totalTurnover
        : monthly
            .filter((m) => selectedMonths.includes(m.month))
            .reduce((acc, m) => acc + m.amount, 0);
      const selectedMonthOrders = isAllMonthsSelected
        ? totalOrders
        : monthly
            .filter((m) => selectedMonths.includes(m.month))
            .reduce((acc, m) => acc + m.ordersCount, 0);

      return {
        ...client,
        apCode,
        monthly,
        target,
        totalTurnover,
        totalOrders,
        achievementRate,
        selectedMonthTurnover,
        selectedMonthOrders,
      };
    });
  }, [clients, dbTurnovers, selectedYear, isAllMonthsSelected, selectedMonths]);

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
      } else if (sortField === "selectedMonthTurnover") {
        comparison = a.selectedMonthTurnover - b.selectedMonthTurnover;
      } else if (sortField.startsWith("month_")) {
        const mIdx = parseInt(sortField.replace("month_", ""), 10) - 1;
        const aAmt = a.monthly[mIdx]?.amount || 0;
        const bAmt = b.monthly[mIdx]?.amount || 0;
        comparison = aAmt - bAmt;
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
    const totalAnnualCa = filteredClients.reduce((acc, c) => acc + c.totalTurnover, 0);
    const totalAnnualOrders = filteredClients.reduce((acc, c) => acc + c.totalOrders, 0);

    // Selected Month / Period Aggregates (or Annual if ALL)
    const activeCa = isAllMonthsSelected
      ? totalAnnualCa
      : filteredClients.reduce((acc, c) => acc + c.selectedMonthTurnover, 0);

    const activeOrders = isAllMonthsSelected
      ? totalAnnualOrders
      : filteredClients.reduce((acc, c) => acc + c.selectedMonthOrders, 0);

    const totalTarget = filteredClients.reduce((acc, c) => acc + c.target, 0);
    const globalRate = totalTarget > 0 ? Math.round((totalAnnualCa / totalTarget) * 100) : 0;
    const avgBasket = activeOrders > 0 ? Math.round(activeCa / activeOrders) : 0;

    // Monthly cumulative across filtered clients
    const monthlyTotals = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const sum = filteredClients.reduce((acc, c) => {
        const m = c.monthly.find((item) => item.month === monthNum);
        return acc + (m ? m.amount : 0);
      }, 0);
      const orders = filteredClients.reduce((acc, c) => {
        const m = c.monthly.find((item) => item.month === monthNum);
        return acc + (m ? m.ordersCount : 0);
      }, 0);
      return {
        month: monthNum,
        name: SHORT_MONTHS[idx],
        fullName: name,
        amount: sum,
        orders,
      };
    });

    const maxMonthAmount = Math.max(...monthlyTotals.map((m) => m.amount), 1000);

    // Breakdown by City (based on active period: selected months or annual)
    const cityMap = new Map<string, number>();
    filteredClients.forEach((c) => {
      const city = c.city || "Autres";
      const amt = isAllMonthsSelected ? c.totalTurnover : c.selectedMonthTurnover;
      cityMap.set(city, (cityMap.get(city) || 0) + amt);
    });
    const cityBreakdown = Array.from(cityMap.entries())
      .map(([city, ca]) => ({
        city,
        ca,
        pct: activeCa > 0 ? Math.round((ca / activeCa) * 100) : 0,
      }))
      .sort((a, b) => b.ca - a.ca);

    // Top 5 Clients by active period CA
    const topClients = [...filteredClients]
      .sort((a, b) => {
        const aVal = isAllMonthsSelected ? a.totalTurnover : a.selectedMonthTurnover;
        const bVal = isAllMonthsSelected ? b.totalTurnover : b.selectedMonthTurnover;
        return bVal - aVal;
      })
      .slice(0, 5)
      .map((c) => ({
        ...c,
        activeTurnover: isAllMonthsSelected ? c.totalTurnover : c.selectedMonthTurnover,
      }));

    return {
      totalAnnualCa,
      totalAnnualOrders,
      activeCa,
      activeOrders,
      totalTarget,
      globalRate,
      avgBasket,
      monthlyTotals,
      maxMonthAmount,
      cityBreakdown,
      topClients,
    };
  }, [filteredClients, isAllMonthsSelected, selectedMonths]);

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
      ...(!isAllMonthsSelected ? [`CA Période (${periodLabel}) HT`, `Commandes Période`] : []),
      "CA Total Annuel HT",
      "Objectif Annuel HT",
      "% Atteinte",
      "Commandes Annuelles",
      ...MONTH_NAMES.map((m) => `CA ${m}`),
    ];

    const rows = filteredClients.map((c) => [
      c.apCode || "—",
      c.company,
      c.city,
      c.status,
      selectedYear,
      ...(!isAllMonthsSelected ? [c.selectedMonthTurnover, c.selectedMonthOrders] : []),
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
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
                Vue analytique consolidée, visualisation mensuelle du CA et objectifs de vente par client
              </p>
            </div>
          </div>
        </div>

        {/* Top Right: Exercise Selector + Month Selector + Import CSV + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* KAM / Team Scope Selector for Manager, Directeur & Super Admin */}
          {(loggedUser?.role === "SUPER_ADMIN" ||
            loggedUser?.role === "DIRECTEUR" ||
            loggedUser?.role === "MANAGER") && (
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
                      return (
                        getAssignedManagerIds(u).includes(loggedUser.id) ||
                        u.id === loggedUser.id
                      );
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

          {/* Month / Period Selector Dropdown */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-xs">
            <BarChart3 className="w-3.5 h-3.5 text-[#d90416]" />
            <span className="text-slate-500 text-[11px]">Période :</span>
            <select
              value={
                isAllMonthsSelected
                  ? "ALL"
                  : selectedMonths.length === 1
                  ? String(selectedMonths[0])
                  : JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3])
                  ? "T1"
                  : JSON.stringify(activeMonthList) === JSON.stringify([4, 5, 6])
                  ? "T2"
                  : JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9])
                  ? "T3"
                  : JSON.stringify(activeMonthList) === JSON.stringify([10, 11, 12])
                  ? "T4"
                  : JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3, 4, 5, 6])
                  ? "S1"
                  : JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9, 10, 11, 12])
                  ? "S2"
                  : "CUSTOM"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "ALL") selectPreset("ALL");
                else if (
                  val === "T1" ||
                  val === "T2" ||
                  val === "T3" ||
                  val === "T4" ||
                  val === "S1" ||
                  val === "S2"
                ) {
                  selectPreset(val as any);
                } else if (val !== "CUSTOM") {
                  setSelectedMonths([Number(val)]);
                }
              }}
              className="bg-transparent font-bold text-slate-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Année Complète (12 mois)</option>
              <option value="T1">Trimestre 1 (Jan - Mar)</option>
              <option value="T2">Trimestre 2 (Avr - Juin)</option>
              <option value="T3">Trimestre 3 (Juil - Sep)</option>
              <option value="T4">Trimestre 4 (Oct - Déc)</option>
              <option value="S1">Semestre 1 (Jan - Juin)</option>
              <option value="S2">Semestre 2 (Juil - Déc)</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={String(idx + 1)}>
                  Mois : {m}
                </option>
              ))}
              {!isAllMonthsSelected &&
                selectedMonths.length > 1 &&
                !["T1", "T2", "T3", "T4", "S1", "S2"].includes(periodLabel) && (
                  <option value="CUSTOM">Sélection personnalisée ({selectedMonths.length} mois)</option>
                )}
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
            <span className="hidden sm:inline">Importer CSV</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Horizontal Multi-Month Filter & Presets Bar */}
      <div className="p-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Sélection Période &amp; Multi-Mois :
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              {periodLabel}
            </span>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 shrink-0">Raccourcis :</span>
            <button
              type="button"
              onClick={() => selectPreset("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                isAllMonthsSelected
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
            >
              Année (12m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset("T1")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 1 : Janvier à Mars"
            >
              T1
            </button>
            <button
              type="button"
              onClick={() => selectPreset("T2")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([4, 5, 6])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 2 : Avril à Juin"
            >
              T2
            </button>
            <button
              type="button"
              onClick={() => selectPreset("T3")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 3 : Juillet à Septembre"
            >
              T3
            </button>
            <button
              type="button"
              onClick={() => selectPreset("T4")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([10, 11, 12])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 4 : Octobre à Décembre"
            >
              T4
            </button>
            <button
              type="button"
              onClick={() => selectPreset("S1")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3, 4, 5, 6])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Semestre 1 : Janvier à Juin"
            >
              S1
            </button>
            <button
              type="button"
              onClick={() => selectPreset("S2")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9, 10, 11, 12])
                  ? "bg-[#d90416] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Semestre 2 : Juillet à Décembre"
            >
              S2
            </button>
          </div>
        </div>

        {/* 12 Month Toggle Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {MONTH_NAMES.map((name, idx) => {
            const monthNum = idx + 1;
            const isSelected = !isAllMonthsSelected && selectedMonths.includes(monthNum);
            const monthTotal = globalStats.monthlyTotals[idx]?.amount || 0;

            return (
              <button
                key={monthNum}
                type="button"
                onClick={() => toggleMonth(monthNum)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#d90416] text-white shadow-xs ring-2 ring-[#d90416]/30"
                    : isAllMonthsSelected
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                    : "bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 hover:text-slate-700 border border-slate-200/50 dark:border-zinc-800"
                }`}
                title={`Cliquer pour inclure/exclure ${name}`}
              >
                <span>{SHORT_MONTHS[idx]}</span>
                {monthTotal > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isSelected
                        ? "bg-white/20 text-white font-extrabold"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                    }`}
                  >
                    {Math.round(monthTotal / 1000)}k€
                  </span>
                )}
              </button>
            );
          })}

          {!isAllMonthsSelected && (
            <button
              type="button"
              onClick={() => selectPreset("ALL")}
              className="text-xs font-bold text-[#d90416] hover:underline flex items-center gap-1 px-2.5 py-1.5 shrink-0 cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tout afficher (Annuel)</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Top Consolidated KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Turnover */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isAllMonthsSelected ? "CA Global Réalisé" : `CA Période (${periodLabel})`}
            </span>
            <DollarSign className="w-4 h-4 text-[#d90416]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {formatEuro(globalStats.activeCa)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
            <span>
              {isAllMonthsSelected
                ? `Exercice ${selectedYear} (Cumul 12 mois)`
                : `Période ${periodLabel} ${selectedYear}`}
            </span>
            <span>•</span>
            <span>
              {isAllMonthsSelected
                ? `${filteredClients.length} clients suivis`
                : `${
                    filteredClients.filter((c) => c.selectedMonthTurnover > 0).length
                  } magasins actifs`}
            </span>
          </div>
        </div>

        {/* Card 2: Annual Target & Achievement */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isAllMonthsSelected ? "Objectif Global Fixé" : `Cumul Annuel ${selectedYear}`}
            </span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {isAllMonthsSelected
              ? globalStats.totalTarget > 0
                ? formatEuro(globalStats.totalTarget)
                : "NC"
              : formatEuro(globalStats.totalAnnualCa)}
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
                {globalStats.globalRate}% atteint
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              {isAllMonthsSelected
                ? "Aucun objectif fixé pour cet exercice"
                : `Objectif annuel : non renseigné`}
            </div>
          )}
        </div>

        {/* Card 3: Total Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isAllMonthsSelected ? "Volume de Commandes" : `Commandes (${periodLabel})`}
            </span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {globalStats.activeOrders.toLocaleString("fr-FR")}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {isAllMonthsSelected
              ? "Flux de commandes facturées sur l'année"
              : `Commandes facturées sur ${periodLabel}`}
          </div>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isAllMonthsSelected ? "Panier Moyen Magasin" : `Panier Moyen (${periodLabel})`}
            </span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
            {formatEuro(globalStats.avgBasket)}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {isAllMonthsSelected
              ? "Montant HT moyen par commande client"
              : `Moyenne HT sur ${periodLabel}`}
          </div>
        </div>
      </div>

      {/* 4. Consolidated Monthly Turnover Chart + Geographic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Multi-Type Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {chartType === "bar" ? (
                <BarChart3 className="w-4 h-4 text-[#d90416]" />
              ) : chartType === "line" ? (
                <LineChart className="w-4 h-4 text-[#d90416]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-[#d90416]" />
              )}
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {chartType === "bar" && `Évolution Mensuelle Consolidée du CA (${selectedYear})`}
                  {chartType === "line" && `Courbe & Tendance Consolidée (${selectedYear})`}
                  {chartType === "cumulative" && `Progression Annuelle Cumulée YTD (${selectedYear})`}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {chartType === "bar" && "Cliquez sur les barres mensuelles pour filtrer les performances."}
                  {chartType === "line" && "Courbe continue de facturation consolidée avec gradient et moyenne."}
                  {chartType === "cumulative" && "Progression cumulée mois par mois vers l'objectif annuel global."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart Type Selector */}
              <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === "bar"
                      ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200"
                  }`}
                  title="Histogramme en barres"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Barres</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType("line")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === "line"
                      ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200"
                  }`}
                  title="Courbe & Tendance lissée"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Courbe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType("cumulative")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === "cumulative"
                      ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200"
                  }`}
                  title="Progression cumulée annuelle"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Cumulé</span>
                </button>
              </div>

              <span className="text-xs font-mono font-bold text-[#d90416] hidden sm:inline-block">
                {formatEuro(globalStats.totalAnnualCa)} Total
              </span>
            </div>
          </div>

          {/* 1. BAR CHART */}
          {chartType === "bar" && (
            <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-100 dark:border-zinc-800">
              {globalStats.monthlyTotals.map((m) => {
                const heightPct =
                  globalStats.maxMonthAmount > 0
                    ? Math.max(4, Math.round((m.amount / globalStats.maxMonthAmount) * 100))
                    : 4;
                const isSelected = !isAllMonthsSelected && selectedMonths.includes(m.month);

                return (
                  <div
                    key={m.month}
                    onClick={() => toggleMonth(m.month)}
                    className={`flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer transition-all duration-200 ${
                      !isAllMonthsSelected && !isSelected ? "opacity-35 hover:opacity-75" : "opacity-100"
                    }`}
                    title={`${m.fullName} : ${formatEuro(m.amount)} (${m.orders} commandes). Cliquer pour inclure/exclure.`}
                  >
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white dark:bg-zinc-800 text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-md text-center">
                      <div className="font-bold">{m.fullName}</div>
                      <div>{formatEuro(m.amount)}</div>
                      <div className="text-[9px] text-slate-400">
                        {m.orders} commande{m.orders > 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Value on top of bar if > 0 */}
                    {m.amount > 0 && (
                      <span
                        className={`text-[9px] font-mono font-semibold mb-1 transition-opacity hidden sm:block ${
                          isSelected
                            ? "text-[#d90416] font-bold"
                            : "text-slate-500 dark:text-zinc-400 opacity-80 group-hover:opacity-100"
                        }`}
                      >
                        {Math.round(m.amount / 1000)}k
                      </span>
                    )}

                    {/* The Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[32px] rounded-t-lg transition-all ${
                        isSelected
                          ? "bg-[#d90416] ring-4 ring-[#d90416]/30 shadow-md"
                          : m.amount > 0
                          ? "bg-[#d90416]/80 hover:bg-[#d90416] shadow-xs"
                          : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200"
                      }`}
                    />

                    {/* Month Label */}
                    <span
                      className={`text-[10px] font-semibold mt-2 transition-colors ${
                        isSelected
                          ? "text-[#d90416] font-extrabold underline"
                          : "text-slate-500 dark:text-zinc-400"
                      }`}
                    >
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. LINE / AREA CHART */}
          {chartType === "line" && (() => {
            const maxVal = globalStats.maxMonthAmount > 0 ? globalStats.maxMonthAmount * 1.15 : 1000;
            const avgMonthly = Math.round(globalStats.totalAnnualCa / 12);
            const svgPoints = globalStats.monthlyTotals.map((m, idx) => {
              const x = 40 + idx * (920 / 11);
              const y = 190 - (m.amount / maxVal) * 150;
              return { x, y, ...m };
            });
            const pathD = svgPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
            const areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} 190 L ${svgPoints[0].x} 190 Z`;
            const yAvg = 190 - (avgMonthly / maxVal) * 150;

            return (
              <div className="pt-2">
                <svg viewBox="0 0 1000 220" className="w-full h-56 overflow-visible">
                  <defs>
                    <linearGradient id="ca-global-line-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d90416" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#d90416" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="40" x2="960" y2="40" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="40" y1="115" x2="960" y2="115" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="40" y1="190" x2="960" y2="190" stroke="currentColor" strokeOpacity="0.2" />

                  {avgMonthly > 0 && (
                    <g>
                      <line x1="40" y1={yAvg} x2="960" y2={yAvg} stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="1.5" />
                      <text x="950" y={yAvg - 5} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                        Moyenne ({formatEuro(avgMonthly)})
                      </text>
                    </g>
                  )}

                  <path d={areaD} fill="url(#ca-global-line-grad)" />
                  <path d={pathD} fill="none" stroke="#d90416" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                  {svgPoints.map((p, idx) => {
                    const isSelected = !isAllMonthsSelected && selectedMonths.includes(p.month);
                    return (
                      <g key={p.month} onClick={() => toggleMonth(p.month)} className="cursor-pointer group/dot">
                        <circle cx={p.x} cy={p.y} r={isSelected ? 7 : 5} fill={p.amount > 0 ? "#d90416" : "#cbd5e1"} className="group-hover/dot:r-8 transition-all" />
                        <circle cx={p.x} cy={p.y} r={2.5} fill="#ffffff" />
                        <text x={p.x} y="208" textAnchor="middle" className={`text-[10px] font-bold ${isSelected ? "fill-[#d90416] font-extrabold" : "fill-slate-500 dark:fill-zinc-400"}`}>
                          {p.name}
                        </text>
                        {p.amount > 0 && (
                          <text x={p.x} y={p.y - 9} textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-700 dark:fill-zinc-200">
                            {Math.round(p.amount / 1000)}k
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}

          {/* 3. CUMULATIVE CHART */}
          {chartType === "cumulative" && (() => {
            let running = 0;
            const cumData = globalStats.monthlyTotals.map((m, idx) => {
              running += m.amount;
              const targetSoFar = globalStats.totalTarget > 0 ? Math.round((globalStats.totalTarget / 12) * (idx + 1)) : 0;
              return { ...m, cumAmount: running, targetSoFar };
            });
            const maxCum = Math.max(running, globalStats.totalTarget) * 1.15 || 1000;
            const svgPoints = cumData.map((p, idx) => {
              const x = 40 + idx * (920 / 11);
              const y = 190 - (p.cumAmount / maxCum) * 150;
              return { x, y, ...p };
            });
            const pathD = svgPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
            const areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} 190 L ${svgPoints[0].x} 190 Z`;

            return (
              <div className="pt-2">
                <svg viewBox="0 0 1000 220" className="w-full h-56 overflow-visible">
                  <defs>
                    <linearGradient id="ca-global-cum-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="40" x2="960" y2="40" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="40" y1="115" x2="960" y2="115" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="40" y1="190" x2="960" y2="190" stroke="currentColor" strokeOpacity="0.2" />

                  {globalStats.totalTarget > 0 && (
                    <g>
                      <line x1="40" y1="190" x2="960" y2={190 - (globalStats.totalTarget / maxCum) * 150} stroke="#94a3b8" strokeDasharray="6,4" strokeWidth="2" />
                      <text x="950" y={190 - (globalStats.totalTarget / maxCum) * 150 - 6} textAnchor="end" className="text-[10px] fill-slate-500 font-bold font-mono">
                        Objectif Consolidé : {formatEuro(globalStats.totalTarget)}
                      </text>
                    </g>
                  )}

                  <path d={areaD} fill="url(#ca-global-cum-grad)" />
                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                  {svgPoints.map((p) => (
                    <g key={p.month} className="cursor-pointer group/cumpoint">
                      <circle cx={p.x} cy={p.y} r={5} fill="#10b981" className="group-hover/cumpoint:r-7 transition-all" />
                      <circle cx={p.x} cy={p.y} r={2.5} fill="#ffffff" />
                      <text x={p.x} y="208" textAnchor="middle" className="text-[10px] font-bold fill-slate-500 dark:fill-zinc-400">
                        {p.name}
                      </text>
                      {p.cumAmount > 0 && (
                        <text x={p.x} y={p.y - 9} textAnchor="middle" className="text-[9px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400">
                          {Math.round(p.cumAmount / 1000)}k€
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}
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
            <span className="text-[11px] text-slate-400 truncate max-w-[140px] text-right">
              {periodLabel}
            </span>
          </div>

          {/* City Progress Bars */}
          <div className="space-y-3 pt-1">
            {globalStats.cityBreakdown.slice(0, 5).map((city) => (
              <div key={city.city} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                    {city.city}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-slate-600 dark:text-zinc-300">
                      {formatEuro(city.ca)}
                    </span>
                    <span className="font-bold text-[#d90416] text-[11px]">{city.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="bg-[#d90416] h-full rounded-full" style={{ width: `${city.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5">
              Top 3 Magasins ({periodLabel})
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
                    {formatEuro(top.activeTurnover)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Clients Table with Direct Target Modification & Monthly Details */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Détail des Chiffres d&apos;Affaires &amp; Objectifs par Client
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  {filteredClients.length}
                </span>
              </h2>

              {!isAllMonthsSelected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#d90416] border border-red-200 dark:bg-red-950/40 dark:border-red-900/60">
                  Période : {periodLabel} ({selectedYear})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Visualisez le CA par mois ou sélection de plusieurs mois, comparez aux objectifs et analysez les tendances.
            </p>
          </div>

          {/* Mode Switcher + Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Summary vs 12-Month Matrix */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-zinc-800 p-0.5 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTableMode("summary")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  tableMode === "summary"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                Vue Synthétique
              </button>
              <button
                type="button"
                onClick={() => setTableMode("grid12")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  tableMode === "grid12"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
                title="Afficher la matrice complète des 12 mois pour tous les magasins"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrice 12 Mois</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher client, code AP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] w-44"
              />
            </div>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer max-w-[150px] truncate"
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
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value="ALL">Tous Statuts</option>
              <option value="VIP">VIP</option>
              <option value="ACTIVE">Actif</option>
              <option value="NEW">Nouveau</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1 : SYNTHESIS TABLE (With optional selected month)  */}
        {/* ========================================================= */}
        {tableMode === "summary" && (
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
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "apCode" ? "text-[#d90416]" : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort("company")}
                    className="py-2.5 px-3 cursor-pointer hover:text-[#d90416] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Client / Magasin</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "company" ? "text-[#d90416]" : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort("city")}
                    className="py-2.5 px-3 cursor-pointer hover:text-[#d90416] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Ville</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "city" ? "text-[#d90416]" : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>

                  {/* If multi-month or single month is selected: show Period CA column */}
                  {!isAllMonthsSelected && (
                    <th
                      onClick={() => handleToggleSort("selectedMonthTurnover")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] transition-colors bg-red-50/40 dark:bg-red-950/20"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[#d90416]">
                          CA Période ({periodLabel})
                        </span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === "selectedMonthTurnover"
                              ? "text-[#d90416]"
                              : "text-slate-400 opacity-60"
                          }`}
                        />
                      </div>
                    </th>
                  )}

                  <th
                    onClick={() => handleToggleSort("totalTurnover")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Cumul Annuel {selectedYear}</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "totalTurnover"
                            ? "text-[#d90416]"
                            : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort("target")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Objectif Annuel HT</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "target" ? "text-[#d90416]" : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort("achievementRate")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#d90416] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>% Atteinte</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortField === "achievementRate"
                            ? "text-[#d90416]"
                            : "text-slate-400 opacity-60"
                        }`}
                      />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Historique 12 Mois</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={!isAllMonthsSelected ? 9 : 8} className="py-8 text-center text-slate-400">
                      Aucun client ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
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
                          <div className="text-[11px] text-slate-400">{client.contactName}</div>
                        </td>

                        {/* City */}
                        <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">
                          {client.city}
                        </td>

                        {/* Selected Month / Period Turnover */}
                        {!isAllMonthsSelected && (
                          <td className="py-3 px-3 text-right font-bold text-[#d90416] font-mono text-sm bg-red-50/30 dark:bg-red-950/10">
                            {formatEuro(client.selectedMonthTurnover)}
                            {client.selectedMonthOrders > 0 && (
                              <div className="text-[10px] font-normal text-slate-400">
                                {client.selectedMonthOrders} cde{client.selectedMonthOrders > 1 ? "s" : ""}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Total Annual CA */}
                        <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-zinc-100">
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
                                  setEditingTargetValue(
                                    client.target > 0 ? client.target.toString() : ""
                                  );
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

                        {/* Monthly Mini Sparkline / Grid with selected months highlighted */}
                        <td className="py-3 px-3">
                          <div className="flex items-end justify-center gap-1 h-7">
                            {client.monthly.map((m) => {
                              const maxClient = Math.max(
                                ...client.monthly.map((x) => x.amount),
                                2000
                              );
                              const h =
                                m.amount > 0
                                  ? Math.max(3, Math.round((m.amount / maxClient) * 24))
                                  : 2;
                              const isThisMonth = !isAllMonthsSelected && selectedMonths.includes(m.month);

                              return (
                                <div
                                  key={m.month}
                                  onClick={() => toggleMonth(m.month)}
                                  title={`${m.monthName}: ${formatEuro(m.amount)} (${m.ordersCount} cmd). Cliquer pour filtrer.`}
                                  style={{ height: `${h}px` }}
                                  className={`w-1.5 rounded-xs transition-colors cursor-pointer ${
                                    isThisMonth
                                      ? "bg-[#d90416] ring-1 ring-[#d90416]"
                                      : m.amount > 0
                                      ? "bg-slate-700 dark:bg-zinc-400 hover:bg-[#d90416]"
                                      : "bg-slate-200 dark:bg-zinc-800"
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2 : FULL 12-MONTH MATRIX VIEW (All months displayed) */}
        {/* ========================================================= */}
        {tableMode === "grid12" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-zinc-950/40 text-slate-700 dark:text-zinc-300 font-bold border-y border-slate-100 dark:border-zinc-800 select-none">
                <tr>
                  <th
                    onClick={() => handleToggleSort("apCode")}
                    className="py-2.5 px-2.5 cursor-pointer hover:text-[#d90416] whitespace-nowrap"
                  >
                    Code AP
                  </th>
                  <th
                    onClick={() => handleToggleSort("company")}
                    className="py-2.5 px-2.5 cursor-pointer hover:text-[#d90416] whitespace-nowrap min-w-[140px]"
                  >
                    Client / Magasin
                  </th>
                  <th
                    onClick={() => handleToggleSort("city")}
                    className="py-2.5 px-2 cursor-pointer hover:text-[#d90416] whitespace-nowrap"
                  >
                    Ville
                  </th>

                  {/* 12 Month Headers (Sortable by each month!) */}
                  {SHORT_MONTHS.map((m, idx) => {
                    const monthNum = idx + 1;
                    const isSelected = !isAllMonthsSelected && selectedMonths.includes(monthNum);
                    const fieldKey = `month_${monthNum}`;

                    return (
                      <th
                        key={monthNum}
                        onClick={() => handleToggleSort(fieldKey)}
                        className={`py-2.5 px-2 text-right cursor-pointer whitespace-nowrap transition ${
                          isSelected
                            ? "bg-red-50 dark:bg-red-950/40 text-[#d90416] font-black"
                            : "hover:text-[#d90416]"
                        }`}
                        title={`Trier par CA ${MONTH_NAMES[idx]}`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{m}</span>
                          {sortField === fieldKey && (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#d90416]" />
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* If multi-month selected: Subtotal Period column */}
                  {!isAllMonthsSelected && (
                    <th
                      onClick={() => handleToggleSort("selectedMonthTurnover")}
                      className="py-2.5 px-2.5 text-right cursor-pointer whitespace-nowrap font-black bg-red-100/60 dark:bg-red-950/60 text-[#d90416]"
                      title={`Sous-total cumulé pour ${periodLabel}`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Période ({selectedMonths.length}m)</span>
                        {sortField === "selectedMonthTurnover" && (
                          <ArrowUpDown className="w-2.5 h-2.5 text-[#d90416]" />
                        )}
                      </div>
                    </th>
                  )}

                  <th
                    onClick={() => handleToggleSort("totalTurnover")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-[#d90416] whitespace-nowrap font-black bg-slate-100/60 dark:bg-zinc-800/40"
                  >
                    Total {selectedYear}
                  </th>
                  <th
                    onClick={() => handleToggleSort("target")}
                    className="py-2.5 px-2.5 text-right cursor-pointer hover:text-[#d90416] whitespace-nowrap"
                  >
                    Objectif
                  </th>
                  <th
                    onClick={() => handleToggleSort("achievementRate")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#d90416] whitespace-nowrap"
                  >
                    %
                  </th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900 font-mono">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={!isAllMonthsSelected ? 20 : 19} className="py-8 text-center text-slate-400 font-sans">
                      Aucun magasin ne correspond aux filtres.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors text-[11px]"
                      >
                        <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                          {client.apCode || "—"}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[150px]">
                          <Link
                            href={`/clients/${client.id}`}
                            className="hover:text-[#d90416] transition"
                          >
                            {client.company}
                          </Link>
                        </td>
                        <td className="py-2 px-2 font-sans text-slate-600 dark:text-zinc-300 truncate max-w-[100px]">
                          {client.city}
                        </td>

                        {/* 12 Months Cells */}
                        {client.monthly.map((m) => {
                          const isSelected = !isAllMonthsSelected && selectedMonths.includes(m.month);
                          const hasCa = m.amount > 0;

                          return (
                            <td
                              key={m.month}
                              className={`py-2 px-2 text-right whitespace-nowrap ${
                                isSelected
                                  ? "bg-red-50/40 dark:bg-red-950/20 font-bold text-[#d90416]"
                                  : hasCa
                                  ? "font-semibold text-slate-900 dark:text-zinc-100"
                                  : "text-slate-300 dark:text-zinc-700"
                              }`}
                              title={`${m.monthName} : ${formatEuro(m.amount)} (${m.ordersCount} commandes)`}
                            >
                              {hasCa ? formatEuro(m.amount) : "—"}
                            </td>
                          );
                        })}

                        {/* Subtotal Period Cell if multi-month selected */}
                        {!isAllMonthsSelected && (
                          <td className="py-2 px-2.5 text-right font-black text-[#d90416] bg-red-50/50 dark:bg-red-950/30 whitespace-nowrap">
                            {formatEuro(client.selectedMonthTurnover)}
                          </td>
                        )}

                        {/* Total Annual */}
                        <td className="py-2 px-3 text-right font-black text-[#d90416] bg-slate-50/50 dark:bg-zinc-800/30 whitespace-nowrap">
                          {formatEuro(client.totalTurnover)}
                        </td>

                        {/* Target */}
                        <td className="py-2 px-2.5 text-right font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {client.target > 0 ? formatEuro(client.target) : "—"}
                        </td>

                        {/* % Rate */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {client.target > 0 ? (
                            <span
                              className={`font-bold ${
                                client.achievementRate >= 100
                                  ? "text-emerald-600"
                                  : client.achievementRate >= 60
                                  ? "text-blue-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {client.achievementRate}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Fiche link */}
                        <td className="py-2 px-2 text-right whitespace-nowrap font-sans">
                          <Link
                            href={`/clients/${client.id}`}
                            className="p-1 rounded text-slate-400 hover:text-[#d90416] transition"
                            title="Ouvrir la fiche client"
                          >
                            <ChevronRight className="w-3.5 h-3.5 inline" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Summary Footer Row */}
              {filteredClients.length > 0 && (
                <tfoot className="bg-slate-100/90 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-bold border-t-2 border-slate-300 dark:border-zinc-700 font-mono text-[11px]">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 font-sans font-black uppercase text-xs">
                      Total ({filteredClients.length} magasins)
                    </td>

                    {/* Total for each of the 12 months */}
                    {globalStats.monthlyTotals.map((m) => {
                      const isSelected = !isAllMonthsSelected && selectedMonths.includes(m.month);

                      return (
                        <td
                          key={m.month}
                          className={`py-3 px-2 text-right whitespace-nowrap ${
                            isSelected
                              ? "bg-red-100/60 dark:bg-red-950/60 text-[#d90416] font-black"
                              : m.amount > 0
                              ? "text-slate-900 dark:text-zinc-100 font-extrabold"
                              : "text-slate-400"
                          }`}
                        >
                          {m.amount > 0 ? formatEuro(m.amount) : "0 €"}
                        </td>
                      );
                    })}

                    {/* Subtotal Period in footer */}
                    {!isAllMonthsSelected && (
                      <td className="py-3 px-2.5 text-right font-black text-[#d90416] text-xs whitespace-nowrap bg-red-100/70 dark:bg-red-950/80">
                        {formatEuro(globalStats.activeCa)}
                      </td>
                    )}

                    <td className="py-3 px-3 text-right font-black text-[#d90416] text-xs whitespace-nowrap">
                      {formatEuro(globalStats.totalAnnualCa)}
                    </td>

                    <td className="py-3 px-2.5 text-right font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                      {globalStats.totalTarget > 0 ? formatEuro(globalStats.totalTarget) : "—"}
                    </td>

                    <td className="py-3 px-2 text-center font-black whitespace-nowrap text-emerald-600">
                      {globalStats.globalRate}%
                    </td>

                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
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
