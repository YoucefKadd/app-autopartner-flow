"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Clock,
  Building2,
  Filter,
  X,
  Check,
  FileText,
  CheckSquare,
  Sparkles,
  Search,
  User,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ClientItem,
  ClientVisit,
  NoteItem,
  TaskItem,
  CLIENT_VISIT_TYPES,
  TASK_CATEGORIES,
  TASK_STATUS_CONFIG,
} from "@/types/kam";
import { stripMarkdown } from "@/components/NoteFormatter";

export type ReportPeriodType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface ActivityReportRow {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  companyName: string;
  customerNumber: string;
  purposePlan: string; // Purpose of the visit (PLAN)
  resultOutcome: string; // Result of the visit (OUTCOME)
  comments: string; // Comments
  type: "VISIT" | "NOTE" | "TASK" | "CLIENT";
}

interface ActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientItem[];
  visits: ClientVisit[];
  notes: NoteItem[];
  tasks: TaskItem[];
  kamName?: string;
}

export function ActivityReportModal({
  isOpen,
  onClose,
  clients,
  visits,
  notes,
  tasks,
  kamName = "Espace Commercial",
}: ActivityReportModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter States
  const [periodType, setPeriodType] = useState<ReportPeriodType>("WEEKLY");
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(todayStr);

  // For weekly: start of current week (Monday)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // For monthly
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Search filter inside report table
  const [searchQuery, setSearchQuery] = useState("");

  // Source filters
  const [includeVisits, setIncludeVisits] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeClients, setIncludeClients] = useState(true);

  // Calculate effective start and end dates based on periodType
  const { effectiveStartDate, effectiveEndDate, periodLabel } = useMemo(() => {
    if (periodType === "DAILY") {
      return {
        effectiveStartDate: selectedDailyDate,
        effectiveEndDate: selectedDailyDate,
        periodLabel: `Journalier (${new Date(selectedDailyDate).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })})`,
      };
    }

    if (periodType === "WEEKLY") {
      // Last 7 days or current week
      const dEnd = new Date();
      const dStart = new Date();
      dStart.setDate(dEnd.getDate() - 7);
      const startIso = dStart.toISOString().slice(0, 10);
      const endIso = dEnd.toISOString().slice(0, 10);
      return {
        effectiveStartDate: startIso,
        effectiveEndDate: endIso,
        periodLabel: `Hebdomadaire (7 derniers jours : du ${startIso} au ${endIso})`,
      };
    }

    if (periodType === "MONTHLY") {
      const start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().slice(0, 10);
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);
      const monthNames = [
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
      return {
        effectiveStartDate: start,
        effectiveEndDate: end,
        periodLabel: `Mensuel (${monthNames[selectedMonth - 1]} ${selectedYear})`,
      };
    }

    // CUSTOM
    return {
      effectiveStartDate: customStartDate,
      effectiveEndDate: customEndDate,
      periodLabel: `Personnalisé (du ${customStartDate} au ${customEndDate})`,
    };
  }, [
    periodType,
    selectedDailyDate,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
  ]);

  // Client lookup map for fast details retrieval
  const clientMap = useMemo(() => {
    const map = new Map<string, ClientItem>();
    clients.forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);

  // Aggregate all activities into normalized ActivityReportRow
  const aggregatedRows = useMemo(() => {
    const rows: ActivityReportRow[] = [];

    function formatTime(isoOrDateStr?: string | null): string {
      if (!isoOrDateStr) return "09:00";
      if (isoOrDateStr.includes("T")) {
        try {
          const d = new Date(isoOrDateStr);
          return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        } catch {
          return "09:00";
        }
      }
      return isoOrDateStr.length >= 5 ? isoOrDateStr.slice(0, 5) : "09:00";
    }

    function formatDate(isoOrDateStr?: string | null): string {
      if (!isoOrDateStr) return todayStr;
      return isoOrDateStr.slice(0, 10);
    }

    function getClientDetails(
      clientId?: string | null,
      fallbackClient?: { id?: string; company?: string } | null
    ) {
      const cid = clientId || fallbackClient?.id;
      const full = cid ? clientMap.get(cid) : null;
      const company = full?.company || fallbackClient?.company || "Activité Générale / Autopartner";
      let apNumber = full?.apClientNumber || "";

      if (!apNumber && cid && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(`apflow_fiche_${cid}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.apClientNumber) apNumber = parsed.apClientNumber;
          }
        } catch {
          // ignore
        }
      }

      return { company, apNumber };
    }

    // 1. VISITS
    if (includeVisits) {
      visits.forEach((v) => {
        const vDate = formatDate(v.date);
        if (vDate >= effectiveStartDate && vDate <= effectiveEndDate) {
          const { company: compName, apNumber: custNum } = getClientDetails(v.clientId, v.client);
          const typeLabel = CLIENT_VISIT_TYPES[v.type]?.label || v.type || "Visite de suivi";
          const statusLabel =
            v.status === "EFFECTUEE"
              ? "Visite effectuée ✓"
              : v.status === "PLANIFIEE"
              ? "Visite planifiée"
              : "Visite annulée";

          rows.push({
            id: `visit-${v.id}`,
            date: vDate,
            time: formatTime(v.time),
            companyName: compName || "Client non renseigné",
            customerNumber: custNum || "",
            purposePlan: `Visite terrain : ${typeLabel}${v.interlocutor ? ` (Interlocuteur : ${v.interlocutor})` : ""}`,
            resultOutcome: statusLabel,
            comments: stripMarkdown(v.summary || "Aucun compte-rendu textuel."),
            type: "VISIT",
          });
        }
      });
    }

    // 2. NOTES
    if (includeNotes) {
      notes.forEach((n) => {
        const nDate = formatDate(n.createdAt);
        if (nDate >= effectiveStartDate && nDate <= effectiveEndDate) {
          const { company: compName, apNumber: custNum } = getClientDetails(n.clientId, n.client);
          const catName = n.category || "LIBRE";

          rows.push({
            id: `note-${n.id}`,
            date: nDate,
            time: formatTime(n.createdAt),
            companyName: compName,
            customerNumber: custNum || "",
            purposePlan: `Note commerciale : ${n.title ? n.title.trim() : catName}`,
            resultOutcome: `Note consignée (${catName})`,
            comments: stripMarkdown(n.content || ""),
            type: "NOTE",
          });
        }
      });
    }

    // 3. TASKS
    if (includeTasks) {
      tasks.forEach((t) => {
        const tDate = formatDate(t.createdAt);
        if (tDate >= effectiveStartDate && tDate <= effectiveEndDate) {
          const { company: compName, apNumber: custNum } = getClientDetails(t.clientId, t.client);
          const stLabel = TASK_STATUS_CONFIG[t.status]?.label || t.status;
          const catLabel =
            TASK_CATEGORIES.find((c) => c.value === t.category)?.label || t.category;

          rows.push({
            id: `task-${t.id}`,
            date: tDate,
            time: formatTime(t.createdAt),
            companyName: compName,
            customerNumber: custNum || "",
            purposePlan: `Action Kanban : ${t.title} [Catégorie : ${catLabel}]`,
            resultOutcome: `Statut : ${stLabel}${t.priority ? " (Prioritaire 🔥)" : ""}`,
            comments: stripMarkdown(t.description || "Tâche suivie dans le Kanban."),
            type: "TASK",
          });
        }
      });
    }

    // 4. CLIENTS CREATED OR UPDATED
    if (includeClients) {
      clients.forEach((c) => {
        const cDate = formatDate(c.createdAt);
        if (cDate >= effectiveStartDate && cDate <= effectiveEndDate) {
          const { company: compName, apNumber: custNum } = getClientDetails(c.id, c);
          rows.push({
            id: `client-${c.id}`,
            date: cDate,
            time: formatTime(c.createdAt),
            companyName: compName || c.company,
            customerNumber: custNum || c.apClientNumber || "En attente",
            purposePlan: `Création fiche : ${c.status === "PROSPECT" ? "Nouveau Prospect" : "Nouveau Client Actif"} (${c.city})`,
            resultOutcome: `Compte initialisé (${c.status})`,
            comments: `Contact : ${c.contactName || "—"} | Tél : ${c.phone || "—"} | Email : ${c.email || "—"}${c.address ? ` | Adresse : ${c.address}` : ""}`,
            type: "CLIENT",
          });
        }
      });
    }

    // Sort chronologically descending (Date DESC, Time DESC)
    rows.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return b.time.localeCompare(a.time);
    });

    return rows;
  }, [
    visits,
    notes,
    tasks,
    clients,
    clientMap,
    effectiveStartDate,
    effectiveEndDate,
    includeVisits,
    includeNotes,
    includeTasks,
    includeClients,
    todayStr,
  ]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return aggregatedRows;
    const q = searchQuery.trim().toLowerCase();
    return aggregatedRows.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        r.customerNumber.toLowerCase().includes(q) ||
        r.purposePlan.toLowerCase().includes(q) ||
        r.resultOutcome.toLowerCase().includes(q) ||
        r.comments.toLowerCase().includes(q)
    );
  }, [aggregatedRows, searchQuery]);

  // Count by type
  const counts = useMemo(() => {
    return {
      visits: aggregatedRows.filter((r) => r.type === "VISIT").length,
      notes: aggregatedRows.filter((r) => r.type === "NOTE").length,
      tasks: aggregatedRows.filter((r) => r.type === "TASK").length,
      clients: aggregatedRows.filter((r) => r.type === "CLIENT").length,
      total: aggregatedRows.length,
    };
  }, [aggregatedRows]);

  // CSV EXPORT with exact required headers
  function handleDownloadCsv() {
    // Exact headers required:
    // Date	Time	Company Name	Customer Number	Purpose of the visit (PLAN)	Result of the visit (OUTCOME)	Comments
    const headers = [
      "Date",
      "Time",
      "Company Name",
      "Customer Number",
      "Purpose of the visit (PLAN)",
      "Result of the visit (OUTCOME)",
      "Comments",
    ];

    const escapeCsv = (val: string) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""').replace(/\r?\n/g, " ");
      return `"${clean}"`;
    };

    const csvLines = [
      headers.map(escapeCsv).join(";"),
      ...filteredRows.map((r) =>
        [
          escapeCsv(r.date),
          escapeCsv(r.time),
          escapeCsv(r.companyName),
          escapeCsv(r.customerNumber),
          escapeCsv(r.purposePlan),
          escapeCsv(r.resultOutcome),
          escapeCsv(r.comments),
        ].join(";")
      ),
    ];

    // UTF-8 BOM for perfect Microsoft Excel French character rendering
    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanPeriodName = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `Rapport_Activite_${cleanPeriodName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // EXCEL EXPORT (.xls HTML Table format with exact headers)
  function handleDownloadExcel() {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
          th { background-color: #d90416; color: #ffffff; font-weight: bold; border: 1px solid #999999; padding: 8px; text-align: left; }
          td { border: 1px solid #cccccc; padding: 6px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h2>Rapport d'Activité Commerciale — ${periodLabel}</h2>
        <p>Généré le ${new Date().toLocaleDateString("fr-FR")} | KAM : ${kamName} | Total entrées : ${filteredRows.length}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Company Name</th>
              <th>Customer Number</th>
              <th>Purpose of the visit (PLAN)</th>
              <th>Result of the visit (OUTCOME)</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRows
              .map(
                (r) => `
              <tr>
                <td>${r.date}</td>
                <td>${r.time}</td>
                <td><strong>${r.companyName}</strong></td>
                <td>${r.customerNumber}</td>
                <td>${r.purposePlan}</td>
                <td>${r.resultOutcome}</td>
                <td>${r.comments.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + tableHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanPeriodName = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `Rapport_Activite_${cleanPeriodName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // PDF PRINT VIEW
  function handlePrintPdf() {
    window.print();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Générateur de Rapport d&apos;Activité Commerciale
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#d90416]/10 text-[#d90416] font-mono font-bold">
                  {filteredRows.length} entrées
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Export consolidé de toutes les actions (visites, notes, kanban, clients) sous format officiel CSV, Excel ou PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Filters & Period Selector Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 space-y-4 shrink-0 bg-white dark:bg-zinc-900">
          {/* Row 1: Period Presets & Type Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 mr-1">
                Périodicité :
              </span>
              <button
                type="button"
                onClick={() => setPeriodType("DAILY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodType === "DAILY"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                Journalier
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("WEEKLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodType === "WEEKLY"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                Hebdomadaire (7j)
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("MONTHLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodType === "MONTHLY"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("CUSTOM")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodType === "CUSTOM"
                    ? "bg-[#d90416] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                Personnalisé
              </button>
            </div>

            {/* Quick Export Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Exporter sous format CSV avec les entêtes exactes"
              >
                <Download className="w-3.5 h-3.5 text-[#d90416]" />
                <span>Format CSV</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Exporter directement au format Microsoft Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Format Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Imprimer ou enregistrer le rapport sous format PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>

          {/* Row 2: Date Pickers depending on period */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 flex-wrap">
              {periodType === "DAILY" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Journée du :</span>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 font-bold text-slate-800 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDailyDate(todayStr)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#d90416] hover:bg-red-50"
                  >
                    Aujourd&apos;hui
                  </button>
                </div>
              )}

              {periodType === "MONTHLY" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Mois :</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 font-bold text-slate-800 dark:text-zinc-200"
                  >
                    {[
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
                    ].map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 font-bold text-slate-800 dark:text-zinc-200"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
              )}

              {periodType === "CUSTOM" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Du :</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-2.5 py-1.5 font-bold text-slate-800 dark:text-zinc-200"
                  />
                  <span className="text-slate-500 font-semibold">Au :</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-2.5 py-1.5 font-bold text-slate-800 dark:text-zinc-200"
                  />
                </div>
              )}

              {/* Source inclusion checkboxes */}
              <div className="flex items-center gap-3 text-xs font-semibold pl-2 border-l border-slate-200 dark:border-zinc-700">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVisits}
                    onChange={(e) => setIncludeVisits(e.target.checked)}
                    className="rounded text-[#d90416]"
                  />
                  <span>Visites ({counts.visits})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="rounded text-[#d90416]"
                  />
                  <span>Notes ({counts.notes})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTasks}
                    onChange={(e) => setIncludeTasks(e.target.checked)}
                    className="rounded text-[#d90416]"
                  />
                  <span>Kanban ({counts.tasks})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeClients}
                    onChange={(e) => setIncludeClients(e.target.checked)}
                    className="rounded text-[#d90416]"
                  />
                  <span>Clients/MAJ ({counts.clients})</span>
                </label>
              </div>
            </div>

            {/* In-table search input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer dans le rapport..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
              />
            </div>
          </div>
        </div>

        {/* 3. Table Content Area (Printable formatted area) */}
        <div id="activity-report-printable-area" className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/50">
          {/* Printable Report Header */}
          <div className="mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#d90416]">
                AUTOPARTNER FRANCE — RAPPORT COMMERCIAL CONSOLIDÉ
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {periodLabel}
              </h3>
              <p className="text-xs text-slate-500">
                Périmètre : {kamName} &bull; Total actions consignées : {filteredRows.length}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                {counts.visits} Visites
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold">
                {counts.notes} Notes
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                {counts.tasks} Kanban
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold">
                {counts.clients} Clients
              </span>
            </div>
          </div>

          {/* Table with EXACT specified headers */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white dark:bg-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 border-b border-slate-800">Date</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Time</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Company Name</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Customer Number</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Purpose of the visit (PLAN)</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Result of the visit (OUTCOME)</th>
                    <th className="py-3 px-3.5 border-b border-slate-800">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucune activité enregistrée sur cette période ({periodLabel}).
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-zinc-200">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-slate-500">
                          {row.time}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                          {row.companyName}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#d90416] whitespace-nowrap">
                          {row.customerNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3.5 max-w-[260px] text-slate-800 dark:text-zinc-200 font-medium">
                          {row.purposePlan}
                        </td>
                        <td className="py-2.5 px-3.5 max-w-[220px] text-slate-700 dark:text-zinc-300">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              row.type === "VISIT"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : row.type === "NOTE"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : row.type === "TASK"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {row.resultOutcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 max-w-[360px] text-slate-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          {row.comments}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. Bottom Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-zinc-950 text-xs">
          <div className="text-slate-500 flex items-center gap-2">
            <span>Entêtes conformes : <code>Date, Time, Company Name, Customer Number, Purpose, Outcome, Comments</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 font-bold text-slate-700 dark:text-zinc-200 cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
