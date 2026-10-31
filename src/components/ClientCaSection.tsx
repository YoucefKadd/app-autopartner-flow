"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Plus,
  Pencil,
  Check,
  X,
  ArrowUpRight,
  BarChart3,
  LineChart,
  AreaChart,
  Sparkles,
  Download,
  UploadCloud,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { ClientItem } from "@/types/kam";
import { CsvImportModal } from "@/components/CsvImportModal";

interface ClientCaSectionProps {
  client: ClientItem;
}

export interface MonthlyTurnover {
  month: number;
  monthName: string;
  amount: number;
  ordersCount: number;
  axPurchases?: number;
  status: "FACTURE" | "ESTIME" | "CLOTURE" | "NON_COMMUNIQUE";
}

export const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const SHORT_MONTHS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export function ClientCaSection({ client }: ClientCaSectionProps) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0 to 11
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [chartType, setChartType] = useState<"bar" | "line" | "cumulative">("bar");

  // Multi-Month Selection State for period analysis (e.g. Q1, Q2, custom months)
  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState<number[]>([]);

  const isAllMonthsSelected =
    selectedPeriodMonths.length === 0 || selectedPeriodMonths.length === 12;
  const activePeriodMonths = useMemo(() => {
    return isAllMonthsSelected
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [...selectedPeriodMonths].sort((a, b) => a - b);
  }, [isAllMonthsSelected, selectedPeriodMonths]);

  function togglePeriodMonth(monthNum: number) {
    setSelectedPeriodMonths((prev) => {
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

  function setPeriodPreset(preset: "ALL" | "T1" | "T2" | "T3" | "T4" | "S1" | "S2") {
    if (preset === "ALL") setSelectedPeriodMonths([]);
    else if (preset === "T1") setSelectedPeriodMonths([1, 2, 3]);
    else if (preset === "T2") setSelectedPeriodMonths([4, 5, 6]);
    else if (preset === "T3") setSelectedPeriodMonths([7, 8, 9]);
    else if (preset === "T4") setSelectedPeriodMonths([10, 11, 12]);
    else if (preset === "S1") setSelectedPeriodMonths([1, 2, 3, 4, 5, 6]);
    else if (preset === "S2") setSelectedPeriodMonths([7, 8, 9, 10, 11, 12]);
  }

  // Editing state for monthly inputs
  // Global Table Editing State (Allows editing ALL months at once)
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [allDrafts, setAllDrafts] = useState<Record<number, { amount: string; ordersCount: string }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Single month edit state (kept for backward compatibility, but delegates to global mode)
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editOrders, setEditOrders] = useState<string>("");

  function startEditingAll(focusMonth?: number) {
    const drafts: Record<number, { amount: string; ordersCount: string }> = {};
    monthlyData.forEach((m) => {
      drafts[m.month] = {
        amount: m.amount > 0 ? m.amount.toString() : "0",
        ordersCount: m.ordersCount > 0 ? m.ordersCount.toString() : "0",
      };
    });
    setAllDrafts(drafts);
    setIsEditingAll(true);
    if (focusMonth) {
      setTimeout(() => {
        const el = document.getElementById(`input_ca_month_${focusMonth}`);
        if (el) el.focus();
      }, 50);
    }
  }

  function updateDraft(month: number, field: "amount" | "ordersCount", val: string) {
    setAllDrafts((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        [field]: val,
      },
    }));
  }

  function resetMonthDraft(month: number) {
    setAllDrafts((prev) => ({
      ...prev,
      [month]: {
        amount: "0",
        ordersCount: "0",
      },
    }));
  }

  function fillRemainingMonthsWithZero() {
    setAllDrafts((prev) => {
      const next = { ...prev };
      for (let m = 1; m <= 12; m++) {
        if (!next[m] || !next[m].amount || next[m].amount === "") {
          next[m] = { amount: "0", ordersCount: "0" };
        }
      }
      return next;
    });
  }



  async function handleSaveAll() {
    setIsSavingAll(true);
    try {
      const updated = monthlyData.map((m) => {
        const draft = allDrafts[m.month];
        const numericAmount = draft ? parseFloat(draft.amount.replace(/[^0-9.]/g, "")) || 0 : m.amount;
        const numericOrders = draft ? parseInt(draft.ordersCount.replace(/\D/g, ""), 10) || 0 : m.ordersCount;
        return {
          ...m,
          amount: numericAmount,
          ordersCount: numericOrders,
          status: (numericAmount > 0 ? "FACTURE" : "NON_COMMUNIQUE") as any,
        };
      });

      setMonthlyData(updated);
      localStorage.setItem(`apflow_ca_${client.id}_${selectedYear}`, JSON.stringify(updated));

      // Batch save all 12 months to MySQL API
      await Promise.all(
        updated.map((m) =>
          fetch("/api/ca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: client.id,
              year: selectedYear,
              month: m.month,
              amount: m.amount,
              ordersCount: m.ordersCount,
            }),
          })
        )
      );

      setIsEditingAll(false);
      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
    } catch (err) {
      console.error("Error saving all monthly CA:", err);
    } finally {
      setIsSavingAll(false);
    }
  }

  const [annualTarget, setAnnualTarget] = useState<number>(0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTargetInput, setEditTargetInput] = useState("");

  const [monthlyData, setMonthlyData] = useState<MonthlyTurnover[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [caRefreshKey, setCaRefreshKey] = useState(0);

  // Default zero monthly turnover data (NO FAKE / FICTITIOUS DATA)
  function generateZeroMonthlyData(): MonthlyTurnover[] {
    return MONTH_NAMES.map((name, idx) => ({
      month: idx + 1,
      monthName: name,
      amount: 0,
      ordersCount: 0,
      status: "NON_COMMUNIQUE",
    }));
  }

  // Load real turnover data from MySQL API
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const res = await fetch(`/api/ca?year=${selectedYear}&clientId=${client.id}`);
        if (res.ok) {
          const data = await res.json();
          const items: any[] = data.turnovers || [];
          if (!isCancelled) {
            const mapped: MonthlyTurnover[] = MONTH_NAMES.map((name, idx) => {
              const monthNum = idx + 1;
              const found = items.find((t: any) => t.month === monthNum);
              const amount = found ? Number(found.amount) || 0 : 0;
              const orders = found ? Number(found.ordersCount) || 0 : 0;
              return {
                month: monthNum,
                monthName: name,
                amount,
                ordersCount: orders,
                status: amount > 0 ? "FACTURE" : "NON_COMMUNIQUE",
              };
            });
            setMonthlyData(mapped);

            // Target
            const targetItem = items.find((t: any) => t.month === 0) || items.find((t: any) => t.target && t.target > 0);
            if (targetItem && targetItem.target > 0) {
              setAnnualTarget(Number(targetItem.target));
            } else {
              const savedTarget = localStorage.getItem(`apflow_ca_target_${client.id}_${selectedYear}`);
              if (savedTarget) {
                setAnnualTarget(parseInt(savedTarget, 10) || 0);
              } else {
                setAnnualTarget(0);
              }
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error loading CA for client:", err);
      }

      if (!isCancelled) {
        setMonthlyData(generateZeroMonthlyData());
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [client.id, selectedYear, caRefreshKey]);

  // Calculations
  const stats = useMemo(() => {
    const totalTurnover = monthlyData.reduce((acc, m) => acc + m.amount, 0);
    const monthsWithCa = monthlyData.filter((m) => m.amount > 0);
    const monthlyAverage =
      monthsWithCa.length > 0 ? Math.round(totalTurnover / monthsWithCa.length) : 0;

    const peakMonth = monthlyData.reduce(
      (max, m) => (m.amount > max.amount ? m : max),
      monthlyData[0] || { monthName: "—", amount: 0 }
    );

    const progressPct =
      annualTarget > 0 ? Math.min(100, Math.round((totalTurnover / annualTarget) * 100)) : 0;

    // Max amount for bar chart scaling
    const maxBarAmount = Math.max(...monthlyData.map((m) => m.amount), 5000);

    return {
      totalTurnover,
      monthlyAverage,
      peakMonth,
      progressPct,
      maxBarAmount,
      totalOrders: monthlyData.reduce((acc, m) => acc + m.ordersCount, 0),
    };
  }, [monthlyData, annualTarget]);

  // Statistics calculated specifically for the selected multiple months
  const periodStats = useMemo(() => {
    const periodData = monthlyData.filter((m) => activePeriodMonths.includes(m.month));
    const periodCa = periodData.reduce((acc, m) => acc + m.amount, 0);
    const periodOrders = periodData.reduce((acc, m) => acc + m.ordersCount, 0);
    const periodAverage =
      activePeriodMonths.length > 0 ? Math.round(periodCa / activePeriodMonths.length) : 0;
    const periodShare =
      stats.totalTurnover > 0 ? Math.round((periodCa / stats.totalTurnover) * 100) : 0;

    return {
      periodCa,
      periodOrders,
      periodAverage,
      periodShare,
    };
  }, [monthlyData, activePeriodMonths, stats.totalTurnover]);

  const draftLiveTotal = useMemo(() => {
    if (!isEditingAll) return stats.totalTurnover;
    return Object.values(allDrafts).reduce((sum, d) => {
      const val = parseFloat(d.amount.replace(/[^0-9.]/g, "")) || 0;
      return sum + val;
    }, 0);
  }, [isEditingAll, allDrafts, stats.totalTurnover]);

  const draftTotalOrders = useMemo(() => {
    if (!isEditingAll) return stats.totalOrders;
    return Object.values(allDrafts).reduce((sum, d) => {
      const val = parseInt(d.ordersCount.replace(/\D/g, ""), 10) || 0;
      return sum + val;
    }, 0);
  }, [isEditingAll, allDrafts, stats.totalOrders]);

  async function handleSaveEdit(monthNumber: number) {
    const numericAmount = parseFloat(editAmount.replace(/[^0-9.]/g, "")) || 0;
    const numericOrders = parseInt(editOrders, 10) || 0;

    const updated = monthlyData.map((m) =>
      m.month === monthNumber
        ? {
            ...m,
            amount: numericAmount,
            ordersCount: numericOrders,
            status: (numericAmount > 0 ? "FACTURE" : "NON_COMMUNIQUE") as any,
          }
        : m
    );

    setMonthlyData(updated);
    localStorage.setItem(`apflow_ca_${client.id}_${selectedYear}`, JSON.stringify(updated));
    setEditingMonth(null);

    try {
      await fetch("/api/ca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          year: selectedYear,
          month: monthNumber,
          amount: numericAmount,
          ordersCount: numericOrders,
        }),
      });
      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
    } catch (err) {
      console.error("Error saving CA month to DB:", err);
    }
  }

  function formatEuro(amount: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="space-y-6">
      {/* 1. Header CA Section */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Chiffre d&apos;Affaires Mensuel (CA) — {client.company}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Saisie mensuelle du CA magasin, suivi des volumes de commandes et projection annuelle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* CSV Import Button */}
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors shadow-xs"
              title="Importer un fichier de ventes CSV pour mettre à jour les données de CA"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#d90416]" />
              <span>Importer CSV</span>
            </button>

            {/* Year Selector */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
              <span>Exercice :</span>
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
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Card 1: CA Cumulé YTD */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              CA Cumulé {selectedYear}
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              {formatEuro(stats.totalTurnover)}
            </div>
            <div className="text-[11px] text-slate-400">
              {stats.totalOrders} commande{stats.totalOrders > 1 ? "s" : ""} traitée{stats.totalOrders > 1 ? "s" : ""}
            </div>
          </div>

          {/* Card 2: Moyenne Mensuelle */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Moyenne Mensuelle
            </span>
            <div className="text-xl font-bold text-[#d90416]">
              {formatEuro(stats.monthlyAverage)}
            </div>
            <div className="text-[11px] text-slate-400">
              par mois actif
            </div>
          </div>

          {/* Card 3: Meilleur Mois */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Mois Record
            </span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.peakMonth.amount > 0 ? formatEuro(stats.peakMonth.amount) : "NC"}
            </div>
            <div className="text-[11px] text-slate-400">
              {stats.peakMonth.amount > 0
                ? `${stats.peakMonth.monthName} (${stats.peakMonth.ordersCount} cmd)`
                : "Aucune donnée"}
            </div>
          </div>

          {/* Card 4: Objectif Annuel & Avancement */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <span>Objectif {selectedYear}</span>
                {!isEditingTarget && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTarget(true);
                      setEditTargetInput(annualTarget.toString());
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-[#d90416] transition-colors"
                    title="Modifier l'objectif annuel de ce client"
                  >
                    <Pencil className="w-3 h-3 text-[#d90416]" />
                  </button>
                )}
              </span>
              <span className="text-[#d90416] font-bold">{stats.progressPct}%</span>
            </div>

            {isEditingTarget ? (
              <div className="flex items-center gap-1 pt-0.5">
                <input
                  type="text"
                  value={editTargetInput}
                  onChange={(e) => setEditTargetInput(e.target.value)}
                  className="w-24 px-2 py-0.5 rounded border border-[#d90416] text-sm font-bold bg-white dark:bg-zinc-900 focus:outline-none"
                  autoFocus
                  placeholder="Ex: 120000"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const num = parseInt(editTargetInput.replace(/\D/g, ""), 10) || 0;
                    setAnnualTarget(num);
                    localStorage.setItem(`apflow_ca_target_${client.id}_${selectedYear}`, num.toString());
                    setIsEditingTarget(false);
                    try {
                      await fetch("/api/ca", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          clientId: client.id,
                          year: selectedYear,
                          month: 0,
                          target: num,
                        }),
                      });
                      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
                    } catch (err) {
                      console.error("Error saving target to DB:", err);
                    }
                  }}
                  className="p-1 rounded bg-[#d90416] text-white hover:bg-[#b80312]"
                  title="Enregistrer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(false)}
                  className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                  title="Annuler"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                {annualTarget > 0 ? formatEuro(annualTarget) : "NC (Non défini)"}
              </div>
            )}

            <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#d90416] rounded-full transition-all duration-500"
                style={{ width: `${stats.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Multi-Month Selection & Period Analyzer */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Sélection Multi-Mois &amp; Analyse Périodique
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  {isAllMonthsSelected ? "Année Complète (12 mois)" : `${activePeriodMonths.length} mois sélectionnés`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sélectionnez un ou plusieurs mois (ex: trimestres, semestres, saisons) pour isoler le CA réalisé sur cette période.
              </p>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPeriodPreset("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                isAllMonthsSelected
                  ? "bg-[#d90416] text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              Tous (12m)
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("T1")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([1, 2, 3])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 1 : Janvier à Mars"
            >
              T1
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("T2")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([4, 5, 6])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 2 : Avril à Juin"
            >
              T2
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("T3")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([7, 8, 9])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 3 : Juillet à Septembre"
            >
              T3
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("T4")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([10, 11, 12])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Trimestre 4 : Octobre à Décembre"
            >
              T4
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("S1")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([1, 2, 3, 4, 5, 6])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Semestre 1 : Janvier à Juin"
            >
              S1
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("S2")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                JSON.stringify(activePeriodMonths) === JSON.stringify([7, 8, 9, 10, 11, 12])
                  ? "bg-[#d90416] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
              title="Semestre 2 : Juillet à Décembre"
            >
              S2
            </button>
          </div>
        </div>

        {/* 12 Month Toggle Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {MONTH_NAMES.map((name, idx) => {
            const monthNum = idx + 1;
            const isSelected = activePeriodMonths.includes(monthNum);
            const mData = monthlyData.find((m) => m.month === monthNum);
            const amount = mData ? mData.amount : 0;

            return (
              <button
                key={monthNum}
                type="button"
                onClick={() => togglePeriodMonth(monthNum)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  !isAllMonthsSelected && isSelected
                    ? "bg-[#d90416] text-white shadow-xs ring-2 ring-[#d90416]/30"
                    : isAllMonthsSelected
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                    : "bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 hover:text-slate-700 border border-slate-200/50 dark:border-zinc-800"
                }`}
                title={`Cliquer pour inclure/exclure ${name}`}
              >
                <span>{SHORT_MONTHS[idx]}</span>
                {amount > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      !isAllMonthsSelected && isSelected
                        ? "bg-white/20 text-white font-extrabold"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                    }`}
                  >
                    {Math.round(amount / 1000)}k€
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Period Highlights Banner when a subset is selected */}
        {!isAllMonthsSelected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d90416]">
                CA Période ({activePeriodMonths.length} mois)
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">
                {formatEuro(periodStats.periodCa)}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {activePeriodMonths.map((m) => SHORT_MONTHS[m - 1]).join(", ")}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Moyenne / Mois
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">
                {formatEuro(periodStats.periodAverage)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                sur les {activePeriodMonths.length} mois choisis
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Commandes Période
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">
                {periodStats.periodOrders}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                commandes cumulées
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Part du CA Annuel
              </span>
              <div className="text-xl font-extrabold text-[#d90416]">
                {periodStats.periodShare}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                sur {formatEuro(stats.totalTurnover)} (total {selectedYear})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Visual Interactive Multi-Type Chart (Graphique Mensuel) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              {chartType === "bar" ? (
                <BarChart3 className="w-4 h-4 text-[#d90416]" />
              ) : chartType === "line" ? (
                <LineChart className="w-4 h-4 text-[#d90416]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-[#d90416]" />
              )}
              {chartType === "bar" && `Évolution Mensuelle en Barres (${selectedYear})`}
              {chartType === "line" && `Courbe & Tendance Facturation (${selectedYear})`}
              {chartType === "cumulative" && `Progression Annuelle Cumulée vs Objectif (${selectedYear})`}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {chartType === "bar" && "Visualisation mois par mois des facturations magasin en euros HT"}
              {chartType === "line" && "Courbe continue des ventes mensuelles avec aire sous la courbe et moyenne"}
              {chartType === "cumulative" && "Cumul progressif mois après mois comparé à la trajectoire d'objectif linéaire"}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
                title="Affichage Histogramme en barres"
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
                title="Affichage Courbe & Tendance lissée"
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
                title="Affichage Progression cumulée annuelle vs Objectif"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Cumulé</span>
              </button>
            </div>

            {chartType === "bar" && (
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#d90416]" />
                  <span className="text-slate-500 dark:text-zinc-400">Facturé</span>
                </div>
              </div>
            )}
            {chartType === "cumulative" && (
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#d90416]" />
                  <span className="text-slate-500 dark:text-zinc-400">Réalisé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
                  <span className="text-slate-400">Trajectoire Obj.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. VIEW MODE A: HISTOGRAMME BARRES */}
        {chartType === "bar" && (
          <div className="pt-4">
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
              {monthlyData.map((item, idx) => {
                const heightPct =
                  stats.maxBarAmount > 0
                    ? Math.min(100, Math.max(item.amount > 0 ? 6 : 2, Math.round((item.amount / stats.maxBarAmount) * 100)))
                    : 0;

                const isCurrentMonth = selectedYear === currentYear && idx === currentMonthIdx;
                const hasData = item.amount > 0;
                const isSelectedInPeriod = activePeriodMonths.includes(item.month);

                return (
                  <div
                    key={item.month}
                    className={`flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar cursor-pointer transition-all duration-200 ${
                      !isAllMonthsSelected && !isSelectedInPeriod
                        ? "opacity-35 hover:opacity-75"
                        : "opacity-100"
                    }`}
                    onClick={() => {
                      if (isEditingAll) {
                        startEditingAll(item.month);
                      } else {
                        togglePeriodMonth(item.month);
                      }
                    }}
                    title={`${item.monthName} ${selectedYear} : ${formatEuro(item.amount)} (${item.ordersCount} commandes). Cliquer pour inclure/exclure de la sélection.`}
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] py-1 px-2 rounded-lg font-mono font-bold pointer-events-none whitespace-nowrap shadow-md mb-1">
                      {formatEuro(item.amount)}
                    </div>

                    {/* The Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover/bar:brightness-110 relative ${
                        hasData
                          ? isCurrentMonth
                            ? "bg-gradient-to-t from-[#d90416] to-red-400 ring-2 ring-red-300 dark:ring-red-900"
                            : !isAllMonthsSelected && isSelectedInPeriod
                            ? "bg-[#d90416] ring-2 ring-[#d90416]/40 shadow-xs"
                            : "bg-[#d90416]"
                          : "bg-slate-100 dark:bg-zinc-800"
                      }`}
                    >
                      {isCurrentMonth && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      )}
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[11px] font-semibold transition-colors ${
                        !isAllMonthsSelected && isSelectedInPeriod
                          ? "text-[#d90416] font-bold"
                          : isCurrentMonth
                          ? "text-[#d90416] font-bold"
                          : "text-slate-500 dark:text-zinc-400"
                      }`}
                    >
                      {SHORT_MONTHS[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Average reference line label */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2">
              <span>0 €</span>
              <span className="font-mono text-[#d90416] font-semibold">
                Moyenne : {formatEuro(stats.monthlyAverage)} / mois
              </span>
              <span>Max : {formatEuro(stats.maxBarAmount)}</span>
            </div>
          </div>
        )}

        {/* 2. VIEW MODE B: COURBE & TENDANCE (SVG SMOOTH LINE CHART) */}
        {chartType === "line" && (() => {
          const maxVal = stats.maxBarAmount > 0 ? stats.maxBarAmount * 1.15 : 1000;
          const svgPoints = monthlyData.map((m, idx) => {
            const x = 50 + idx * (900 / 11);
            const y = 210 - (m.amount / maxVal) * 170;
            return { x, y, ...m };
          });
          const pathD = svgPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
          const areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} 210 L ${svgPoints[0].x} 210 Z`;
          const yAvg = 210 - (stats.monthlyAverage / maxVal) * 170;

          return (
            <div className="pt-2">
              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 1000 240" className="w-full h-64 overflow-visible">
                  <defs>
                    <linearGradient id="client-ca-line-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d90416" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#d90416" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="50" y1="40" x2="950" y2="40" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="50" y1="125" x2="950" y2="125" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="50" y1="210" x2="950" y2="210" stroke="currentColor" strokeOpacity="0.2" />

                  {/* Monthly average dashed line */}
                  {stats.monthlyAverage > 0 && (
                    <g>
                      <line
                        x1="50"
                        y1={yAvg}
                        x2="950"
                        y2={yAvg}
                        stroke="#94a3b8"
                        strokeDasharray="5,5"
                        strokeWidth="1.5"
                      />
                      <text
                        x="940"
                        y={yAvg - 6}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        Moyenne ({formatEuro(stats.monthlyAverage)})
                      </text>
                    </g>
                  )}

                  {/* Area fill under curve */}
                  <path d={areaD} fill="url(#client-ca-line-grad)" />

                  {/* The main stroke line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#d90416"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Month Points */}
                  {svgPoints.map((p, idx) => {
                    const isSelected = activePeriodMonths.includes(p.month);
                    const isCurrent = selectedYear === currentYear && idx === currentMonthIdx;

                    return (
                      <g
                        key={p.month}
                        onClick={() => togglePeriodMonth(p.month)}
                        className="cursor-pointer group/dot"
                      >
                        {/* Hover vertical guideline */}
                        <line
                          x1={p.x}
                          y1="40"
                          x2={p.x}
                          y2="210"
                          stroke="#d90416"
                          strokeWidth="1"
                          strokeDasharray="3,3"
                          className="opacity-0 group-hover/dot:opacity-60 transition-opacity"
                        />

                        {/* Outer Glow Circle */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelected || isCurrent ? 7 : 5}
                          fill={p.amount > 0 ? "#d90416" : "#cbd5e1"}
                          className="transition-all group-hover/dot:r-8"
                        />
                        <circle cx={p.x} cy={p.y} r={3} fill="#ffffff" />

                        {/* Month Label */}
                        <text
                          x={p.x}
                          y="228"
                          textAnchor="middle"
                          className={`text-[11px] font-bold ${
                            isSelected ? "fill-[#d90416] font-extrabold" : "fill-slate-500 dark:fill-zinc-400"
                          }`}
                        >
                          {SHORT_MONTHS[idx]}
                        </text>

                        {/* Value Label above point */}
                        {p.amount > 0 && (
                          <text
                            x={p.x}
                            y={p.y - 10}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-bold fill-slate-700 dark:fill-zinc-200 group-hover/dot:fill-[#d90416]"
                          >
                            {Math.round(p.amount / 1000)}k€
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2">
                <span>0 €</span>
                <span className="font-mono text-[#d90416] font-semibold">
                  Moyenne active : {formatEuro(stats.monthlyAverage)} / mois
                </span>
                <span>Pic : {formatEuro(stats.maxBarAmount)}</span>
              </div>
            </div>
          );
        })()}

        {/* 3. VIEW MODE C: PROGRESSION CUMULÉE YTD VS OBJECTIF ANNUEL */}
        {chartType === "cumulative" && (() => {
          let runningTotal = 0;
          const cumPoints = monthlyData.map((m, idx) => {
            runningTotal += m.amount;
            const targetLine = annualTarget > 0 ? Math.round((annualTarget / 12) * (idx + 1)) : 0;
            return {
              ...m,
              cumAmount: runningTotal,
              targetLine,
            };
          });

          const maxCum = Math.max(runningTotal, annualTarget) * 1.15 || 1000;
          const svgCumPoints = cumPoints.map((p, idx) => {
            const x = 50 + idx * (900 / 11);
            const y = 210 - (p.cumAmount / maxCum) * 170;
            const yTarget = 210 - (p.targetLine / maxCum) * 170;
            return { x, y, yTarget, ...p };
          });

          const pathCum = svgCumPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
          const areaCum = `${pathCum} L ${svgCumPoints[svgCumPoints.length - 1].x} 210 L ${svgCumPoints[0].x} 210 Z`;

          return (
            <div className="pt-2">
              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 1000 240" className="w-full h-64 overflow-visible">
                  <defs>
                    <linearGradient id="client-ca-cum-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="50" y1="40" x2="950" y2="40" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="50" y1="125" x2="950" y2="125" stroke="currentColor" strokeOpacity="0.08" />
                  <line x1="50" y1="210" x2="950" y2="210" stroke="currentColor" strokeOpacity="0.2" />

                  {/* Target linear trajectory line */}
                  {annualTarget > 0 && (
                    <g>
                      <line
                        x1="50"
                        y1="210"
                        x2="950"
                        y2={210 - (annualTarget / maxCum) * 170}
                        stroke="#94a3b8"
                        strokeDasharray="6,4"
                        strokeWidth="2"
                      />
                      <text
                        x="940"
                        y={210 - (annualTarget / maxCum) * 170 - 8}
                        textAnchor="end"
                        className="text-[10px] fill-slate-500 font-bold font-mono"
                      >
                        Objectif annuel : {formatEuro(annualTarget)}
                      </text>
                    </g>
                  )}

                  {/* Area fill */}
                  <path d={areaCum} fill="url(#client-ca-cum-grad)" />

                  {/* The cumulative curve */}
                  <path
                    d={pathCum}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points on cumulative curve */}
                  {svgCumPoints.map((p, idx) => (
                    <g key={p.month} className="cursor-pointer group/cumpoint">
                      <circle cx={p.x} cy={p.y} r={5} fill="#10b981" className="group-hover/cumpoint:r-7 transition-all" />
                      <circle cx={p.x} cy={p.y} r={2.5} fill="#ffffff" />

                      {/* Month label */}
                      <text
                        x={p.x}
                        y="228"
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-slate-500 dark:fill-zinc-400"
                      >
                        {SHORT_MONTHS[idx]}
                      </text>

                      {/* Cumulative total on top of point */}
                      {p.cumAmount > 0 && (
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          className="text-[10px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400"
                        >
                          {Math.round(p.cumAmount / 1000)}k€
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2">
                <span>0 €</span>
                <span className="font-mono text-emerald-600 font-bold">
                  Total Cumulé : {formatEuro(stats.totalTurnover)}
                </span>
                <span>
                  Objectif Trajectoire : {annualTarget > 0 ? formatEuro(annualTarget) : "Non défini"}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Monthly Table & Quick In-line Input */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/30">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Détail Mensuel des Facturations ({selectedYear})
              </h3>
              {isEditingAll && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <Pencil className="w-2.5 h-2.5" />
                  Mode Modification Actif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {isEditingAll
                ? "Tous les mois sont éditables en même temps ci-dessous. Modifiez les montants et validez tout le tableau en un clic."
                : "Cliquez sur « Modifier tout le tableau » ou sur n'importe quel crayon pour éditer l'ensemble des mois en une seule fois."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isEditingAll ? (
              <>
                <button
                  type="button"
                  onClick={fillRemainingMonthsWithZero}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 transition-colors"
                  title="Mettre à 0€ les mois non renseignés"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Mettre les vides à 0€</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAll(false)}
                  disabled={isSavingAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Annuler</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSavingAll}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSavingAll ? "Enregistrement..." : "Enregistrer tout"}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => startEditingAll()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5 text-[#d90416]" />
                <span>Modifier tout le tableau</span>
              </button>
            )}
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-950/50 border-b border-slate-200/70 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-6">Mois</th>
                <th className="py-3 px-6">CA Réalisé (€ HT)</th>
                <th className="py-3 px-6">Nb Commandes</th>
                <th className="py-3 px-6">Panier Moyen</th>
                <th className="py-3 px-6">Part du CA Annuel</th>
                <th className="py-3 px-6">Statut</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {monthlyData.map((item) => {
                const draft = allDrafts[item.month] || {
                  amount: item.amount > 0 ? item.amount.toString() : "0",
                  ordersCount: item.ordersCount > 0 ? item.ordersCount.toString() : "0",
                };

                const currentAmount = isEditingAll
                  ? parseFloat(draft.amount.replace(/[^0-9.]/g, "")) || 0
                  : item.amount;
                const currentOrders = isEditingAll
                  ? parseInt(draft.ordersCount.replace(/\D/g, ""), 10) || 0
                  : item.ordersCount;

                const baseTotal = isEditingAll ? draftLiveTotal : stats.totalTurnover;
                const shareOfAnnual =
                  baseTotal > 0 ? Math.round((currentAmount / baseTotal) * 100) : 0;
                const avgBasket =
                  currentOrders > 0 ? Math.round(currentAmount / currentOrders) : 0;

                const isSelectedInPeriod = activePeriodMonths.includes(item.month);

                return (
                  <tr
                    key={item.month}
                    className={`transition-colors ${
                      isEditingAll
                        ? "bg-amber-50/15 dark:bg-amber-950/10 hover:bg-amber-50/25 dark:hover:bg-amber-950/20"
                        : !isAllMonthsSelected && isSelectedInPeriod
                        ? "bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/60"
                        : "hover:bg-slate-50/50 dark:hover:bg-zinc-800/30"
                    }`}
                  >
                    {/* Mois */}
                    <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{item.monthName}</span>
                        <span className="text-slate-400 font-normal">{selectedYear}</span>
                        {!isAllMonthsSelected && isSelectedInPeriod && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-red-100 text-[#d90416] dark:bg-red-950/60 dark:text-red-300">
                            Période
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CA Réalisé (€ HT) */}
                    <td className="py-3.5 px-6">
                      {isEditingAll ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            id={`input_ca_month_${item.month}`}
                            type="number"
                            step="any"
                            value={draft.amount}
                            onChange={(e) => updateDraft(item.month, "amount", e.target.value)}
                            placeholder="0"
                            className="w-28 sm:w-32 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-mono font-bold text-[#d90416] focus:outline-none focus:border-[#d90416] focus:ring-1 focus:ring-[#d90416]"
                          />
                          <span className="text-slate-400 font-mono text-xs">€</span>
                        </div>
                      ) : (
                        <span
                          className={`font-mono font-bold ${
                            item.amount > 0 ? "text-[#d90416]" : "text-slate-400"
                          }`}
                        >
                          {formatEuro(item.amount)}
                        </span>
                      )}
                    </td>

                    {/* Nb Commandes */}
                    <td className="py-3.5 px-6">
                      {isEditingAll ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            value={draft.ordersCount}
                            onChange={(e) => updateDraft(item.month, "ordersCount", e.target.value)}
                            placeholder="0"
                            className="w-20 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                          />
                          <span className="text-slate-400 text-[11px]">cmd</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 dark:text-zinc-300">
                          {item.ordersCount} cmd
                        </span>
                      )}
                    </td>

                    {/* Panier Moyen */}
                    <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-zinc-300">
                      {avgBasket > 0 ? formatEuro(avgBasket) : "—"}
                    </td>

                    {/* Part du CA Annuel */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300 w-8">
                          {shareOfAnnual}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-400 dark:bg-zinc-500 rounded-full transition-all"
                            style={{ width: `${shareOfAnnual}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          currentAmount > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {currentAmount > 0 ? "Facturé" : "0 € (Non communiqué)"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-right">
                      {isEditingAll ? (
                        <button
                          type="button"
                          onClick={() => resetMonthDraft(item.month)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-[#d90416] transition-colors"
                          title="Remettre ce mois à 0€"
                        >
                          Mettre à 0€
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingAll(item.month)}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-400 hover:text-[#d90416] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Modifier tout le tableau à partir de ce mois"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-medium hidden sm:inline">Modifier</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Row Footer */}
            <tfoot className="border-t-2 border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/70 font-semibold">
              {/* Optional Multi-Month Period Subtotal Row */}
              {!isAllMonthsSelected && (
                <tr className="border-b border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-slate-900 dark:text-zinc-100">
                  <td className="py-3 px-6 text-[#d90416] font-bold uppercase tracking-wider text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#d90416]" />
                      <span>Sous-Total Période ({activePeriodMonths.length} mois)</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 font-mono font-extrabold text-[#d90416] text-sm">
                    {formatEuro(periodStats.periodCa)}
                  </td>
                  <td className="py-3 px-6 text-[#d90416] font-mono font-bold">
                    {periodStats.periodOrders} cmd
                  </td>
                  <td className="py-3 px-6 font-mono font-bold text-[#d90416]">
                    {periodStats.periodOrders > 0
                      ? formatEuro(Math.round(periodStats.periodCa / periodStats.periodOrders))
                      : "—"}
                  </td>
                  <td className="py-3 px-6 font-bold text-[#d90416]">
                    {periodStats.periodShare}%
                  </td>
                  <td colSpan={2} className="py-3 px-6 text-[11px] text-[#d90416]/80 font-medium">
                    {activePeriodMonths.map((m) => SHORT_MONTHS[m - 1]).join(", ")}
                  </td>
                </tr>
              )}

              <tr>
                <td className="py-3.5 px-6 text-slate-900 dark:text-zinc-100 font-bold uppercase tracking-wider text-[11px]">
                  Total Annuel {selectedYear}
                </td>
                <td className="py-3.5 px-6 font-mono font-extrabold text-[#d90416] text-sm">
                  {formatEuro(isEditingAll ? draftLiveTotal : stats.totalTurnover)}
                </td>
                <td className="py-3.5 px-6 text-slate-900 dark:text-zinc-100 font-mono">
                  {isEditingAll ? draftTotalOrders : stats.totalOrders} cmd
                </td>
                <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-zinc-300">
                  {(isEditingAll ? draftTotalOrders : stats.totalOrders) > 0
                    ? formatEuro(
                        Math.round(
                          (isEditingAll ? draftLiveTotal : stats.totalTurnover) /
                            (isEditingAll ? draftTotalOrders : stats.totalOrders)
                        )
                      )
                    : "—"}
                </td>
                <td className="py-3.5 px-6 font-bold text-slate-700 dark:text-zinc-300">
                  100%
                </td>
                <td className="py-3.5 px-6" />
                <td className="py-3.5 px-6 text-right">
                  {isEditingAll && (
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={isSavingAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingAll ? "Sauvegarde..." : "Valider tout"}</span>
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Csv Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        targetKamId={client.kamId}
        onSuccess={() => {
          setCaRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
