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
  Sparkles,
  Download,
  UploadCloud,
  AlertCircle,
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
  status: "FACTURE" | "ESTIME" | "CLOTURE";
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

  // Editing state for monthly inputs
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editOrders, setEditOrders] = useState<string>("");

  const [annualTarget, setAnnualTarget] = useState<number>(() => {
    if (client.status === "VIP") return 240000;
    if (client.status === "ACTIVE") return 120000;
    if (client.status === "NEW") return 40000;
    if (client.status === "PROSPECT") return 30000;
    return 60000;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTargetInput, setEditTargetInput] = useState("");

  const [monthlyData, setMonthlyData] = useState<MonthlyTurnover[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [caRefreshKey, setCaRefreshKey] = useState(0);

  // Generate realistic default turnover data for a client based on status
  function generateDefaultMonthlyData(year: number): MonthlyTurnover[] {
    const baseAmount =
      client.status === "VIP"
        ? 18500
        : client.status === "ACTIVE"
        ? 9500
        : client.status === "NEW"
        ? 3200
        : client.status === "PROSPECT"
        ? 1800
        : 4500;

    // Deterministic seed based on client.id
    let seed = 0;
    for (let i = 0; i < client.id.length; i++) {
      seed = (seed * 31 + client.id.charCodeAt(i)) % 1000;
    }

    return MONTH_NAMES.map((name, idx) => {
      // Future months in the current year default to 0 or estimated
      const isPastOrCurrent = year < currentYear || (year === currentYear && idx <= currentMonthIdx);
      const variance = (((seed + idx * 77) % 35) - 15) / 100; // -15% to +20%
      const amount = isPastOrCurrent
        ? Math.round(baseAmount * (1 + variance))
        : 0;
      const orders = isPastOrCurrent ? Math.max(2, Math.round(amount / 450)) : 0;

      return {
        month: idx + 1,
        monthName: name,
        amount,
        ordersCount: orders,
        status: idx < currentMonthIdx ? "CLOTURE" : idx === currentMonthIdx ? "FACTURE" : "ESTIME",
      };
    });
  }

  // Load from local storage or initialize
  useEffect(() => {
    // 1. Turnover data
    const key = `apflow_ca_${client.id}_${selectedYear}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setMonthlyData(JSON.parse(saved));
      } catch {
        const initial = generateDefaultMonthlyData(selectedYear);
        setMonthlyData(initial);
        localStorage.setItem(key, JSON.stringify(initial));
      }
    } else {
      const initial = generateDefaultMonthlyData(selectedYear);
      setMonthlyData(initial);
      localStorage.setItem(key, JSON.stringify(initial));
    }

    // 2. Annual Target
    const targetKey = `apflow_ca_target_${client.id}_${selectedYear}`;
    const savedTarget = localStorage.getItem(targetKey);
    if (savedTarget) {
      const parsed = parseInt(savedTarget, 10);
      if (!isNaN(parsed) && parsed >= 0) setAnnualTarget(parsed);
    }
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

  function handleSaveEdit(monthNumber: number) {
    const numericAmount = parseFloat(editAmount.replace(/[^0-9.]/g, "")) || 0;
    const numericOrders = parseInt(editOrders, 10) || 0;

    const updated = monthlyData.map((m) =>
      m.month === monthNumber
        ? {
            ...m,
            amount: numericAmount,
            ordersCount: numericOrders,
            status: (numericAmount > 0 ? "FACTURE" : "ESTIME") as any,
          }
        : m
    );

    setMonthlyData(updated);
    localStorage.setItem(`apflow_ca_${client.id}_${selectedYear}`, JSON.stringify(updated));
    setEditingMonth(null);
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
              {formatEuro(stats.peakMonth.amount)}
            </div>
            <div className="text-[11px] text-slate-400">
              {stats.peakMonth.monthName} ({stats.peakMonth.ordersCount} cmd)
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
                  onClick={() => {
                    const num = parseInt(editTargetInput.replace(/\D/g, ""), 10);
                    if (!isNaN(num) && num >= 0) {
                      setAnnualTarget(num);
                      localStorage.setItem(`apflow_ca_target_${client.id}_${selectedYear}`, num.toString());
                      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
                    }
                    setIsEditingTarget(false);
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
                {formatEuro(annualTarget)}
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

      {/* 2. Visual Interactive Bar Chart (Graphique Mensuel) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#d90416]" />
              Évolution Graphique du Chiffre d&apos;Affaires Mensuel ({selectedYear})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Visualisation mois par mois des facturations magasin en euros HT
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#d90416]" />
              <span className="text-slate-500 dark:text-zinc-400">Facturé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-200 dark:bg-zinc-700" />
              <span className="text-slate-400">Prévisionnel</span>
            </div>
          </div>
        </div>

        {/* SVG Custom Bar Chart */}
        <div className="pt-4">
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
            {monthlyData.map((item, idx) => {
              const heightPct =
                stats.maxBarAmount > 0
                  ? Math.min(100, Math.max(item.amount > 0 ? 6 : 2, Math.round((item.amount / stats.maxBarAmount) * 100)))
                  : 0;

              const isCurrentMonth = selectedYear === currentYear && idx === currentMonthIdx;
              const hasData = item.amount > 0;

              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar cursor-pointer"
                  onClick={() => {
                    setEditingMonth(item.month);
                    setEditAmount(item.amount ? item.amount.toString() : "");
                    setEditOrders(item.ordersCount ? item.ordersCount.toString() : "");
                  }}
                  title={`${item.monthName} ${selectedYear} : ${formatEuro(item.amount)} (${item.ordersCount} commandes). Cliquer pour modifier.`}
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
                    className={`text-[11px] font-semibold ${
                      isCurrentMonth
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
      </div>

      {/* 3. Monthly Table & Quick In-line Input */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
              Détail Mensuel des Facturations ({selectedYear})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cliquez sur le crayon d&apos;un mois pour saisir ou modifier le chiffre d&apos;affaires réel
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
            12 mois
          </span>
        </div>

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
              {monthlyData.map((item, idx) => {
                const isEditing = editingMonth === item.month;
                const prevMonth = idx > 0 ? monthlyData[idx - 1] : null;
                const evolution =
                  prevMonth && prevMonth.amount > 0 && item.amount > 0
                    ? Math.round(((item.amount - prevMonth.amount) / prevMonth.amount) * 100)
                    : null;

                const shareOfAnnual =
                  stats.totalTurnover > 0
                    ? Math.round((item.amount / stats.totalTurnover) * 100)
                    : 0;

                const avgBasket =
                  item.ordersCount > 0 ? Math.round(item.amount / item.ordersCount) : 0;

                return (
                  <tr
                    key={item.month}
                    className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Mois */}
                    <td className="py-3 px-6 font-semibold text-slate-900 dark:text-zinc-100">
                      {item.monthName} {selectedYear}
                    </td>

                    {/* CA Réalisé */}
                    <td className="py-3 px-6 font-mono font-bold text-slate-900 dark:text-zinc-100">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="Ex: 12500"
                          className="w-28 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono font-bold text-[#d90416]"
                        />
                      ) : (
                        <span className={item.amount > 0 ? "text-[#d90416]" : "text-slate-400"}>
                          {formatEuro(item.amount)}
                        </span>
                      )}
                    </td>

                    {/* Nb Commandes */}
                    <td className="py-3 px-6">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editOrders}
                          onChange={(e) => setEditOrders(e.target.value)}
                          placeholder="Ex: 24"
                          className="w-16 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-zinc-300">
                          {item.ordersCount} cmd
                        </span>
                      )}
                    </td>

                    {/* Panier Moyen */}
                    <td className="py-3 px-6 font-mono text-slate-600 dark:text-zinc-300">
                      {avgBasket > 0 ? formatEuro(avgBasket) : "—"}
                    </td>

                    {/* Part CA Annuel */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300 w-8">
                          {shareOfAnnual}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-400 dark:bg-zinc-500 rounded-full"
                            style={{ width: `${shareOfAnnual}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.amount > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {item.amount > 0 ? "Facturé" : "À venir"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-6 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.month)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            title="Valider"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMonth(null)}
                            className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMonth(item.month);
                            setEditAmount(item.amount ? item.amount.toString() : "");
                            setEditOrders(item.ordersCount ? item.ordersCount.toString() : "");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Modifier le CA de ce mois"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
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
