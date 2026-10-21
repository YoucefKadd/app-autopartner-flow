"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { stripMarkdown } from "@/components/NoteFormatter";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  FileText,
  MapPin,
  Plus,
  ExternalLink,
  Filter,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { ClientVisit, NoteItem, CLIENT_VISIT_TYPES, NOTE_CATEGORIES } from "@/types/kam";

export interface CalendarEventItem {
  id: string;
  kind: "VISIT" | "NOTE";
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  summary: string;
  categoryOrType: string;
  badgeLabel: string;
  badgeClass: string;
  clientName?: string;
  clientId?: string;
  status?: string;
  rawVisit?: ClientVisit;
  rawNote?: NoteItem;
}

interface CalendarViewProps {
  visits: ClientVisit[];
  notes?: NoteItem[];
  defaultClientId?: string; // If provided, scoped to this client
  onSelectVisit?: (visit: ClientVisit) => void;
  onSelectNote?: (note: NoteItem) => void;
  onAddVisit?: (dateStr?: string) => void;
  onAddNote?: (dateStr?: string) => void;
}

const MONTH_NAMES_FR = [
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

const DAYS_HEADER_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendarView({
  visits,
  notes = [],
  defaultClientId,
  onSelectVisit,
  onSelectNote,
  onAddVisit,
  onAddNote,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Filter toggles: Show Visits, Show Notes
  const [showVisits, setShowVisits] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function handleMonthChange(newMonth: number) {
    setCurrentDate(new Date(year, newMonth, 1));
  }

  function handleYearChange(newYear: number) {
    setCurrentDate(new Date(newYear, month, 1));
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToToday() {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const pad = (n: number) => String(n).padStart(2, "0");
    setSelectedDayStr(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
  }

  // Convert visits and notes into unified CalendarEventItems
  const allEvents = useMemo(() => {
    const list: CalendarEventItem[] = [];

    // 1. Process visits (distinct emerald/blue events)
    if (showVisits) {
      for (const v of visits) {
        if (defaultClientId && v.clientId !== defaultClientId) continue;
        const typeCfg = CLIENT_VISIT_TYPES[v.type] || CLIENT_VISIT_TYPES.ROUTINE;
        const isCompleted = v.status === "EFFECTUEE";

        list.push({
          id: `visit_${v.id}`,
          kind: "VISIT",
          date: v.date.slice(0, 10),
          time: v.time || undefined,
          title: `Visite : ${typeCfg.label}`,
          summary: v.summary,
          categoryOrType: v.type,
          badgeLabel: isCompleted ? "Visite Effectuée" : "Visite Planifiée",
          badgeClass: isCompleted
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
            : "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30",
          clientName: v.client?.company,
          clientId: v.clientId,
          status: v.status,
          rawVisit: v,
        });

        // Also if nextPlannedVisit is set on this visit, show it as an upcoming planned slot
        if (v.nextVisitDate && v.nextVisitDate.slice(0, 10) !== v.date.slice(0, 10)) {
          list.push({
            id: `visit_next_${v.id}`,
            kind: "VISIT",
            date: v.nextVisitDate.slice(0, 10),
            title: `Re-visite prévue : ${v.client?.company || "Client"}`,
            summary: `Re-visite convenue suite au passage du ${v.date}`,
            categoryOrType: "PLANNED",
            badgeLabel: "Re-visite convenue",
            badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
            clientName: v.client?.company,
            clientId: v.clientId,
            status: "PLANIFIEE",
            rawVisit: v,
          });
        }
      }
    }

    // 2. Process notes (distinct amber/violet/slate events)
    if (showNotes) {
      for (const n of notes) {
        if (defaultClientId && n.clientId !== defaultClientId) continue;
        const catCfg =
          NOTE_CATEGORIES.find((c) => c.value === n.category) || NOTE_CATEGORIES[0];
        const dateStr = n.createdAt.slice(0, 10);

        list.push({
          id: `note_${n.id}`,
          kind: "NOTE",
          date: dateStr,
          time: n.createdAt.length >= 16 ? n.createdAt.slice(11, 16) : undefined,
          title: n.title || `Note ${catCfg.label}`,
          summary: n.content,
          categoryOrType: n.category,
          badgeLabel: `Note : ${catCfg.label}`,
          badgeClass: catCfg.badgeClass,
          clientName: n.client?.company,
          clientId: n.clientId || undefined,
          rawNote: n,
        });
      }
    }

    return list;
  }, [visits, notes, showVisits, showNotes, defaultClientId]);

  // Group events by day key 'YYYY-MM-DD'
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const evt of allEvents) {
      const existing = map.get(evt.date) || [];
      existing.push(evt);
      map.set(evt.date, existing);
    }
    return map;
  }, [allEvents]);

  // Build Month Grid Matrix
  // Helper to format local date without UTC shift
  function formatLocalDate(y: number, m: number, d: number): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  // Build Month Grid Matrix
  const monthMatrix = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const totalDaysInMonth = lastDay.getDate();
    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      days.push({
        day: d,
        dateStr: formatLocalDate(prevYear, prevMonth, d),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({
        day: d,
        dateStr: formatLocalDate(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          dateStr: formatLocalDate(nextYear, nextMonth, i),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDayStr) return [];
    return eventsByDay.get(selectedDayStr) || [];
  }, [selectedDayStr, eventsByDay]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
      {/* LEFT / MAIN : CALENDAR GRID */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Calendar Header with Navigation and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={month}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-sm sm:text-base px-2.5 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-[#d90416] dark:hover:border-[#d90416] focus:outline-none focus:ring-2 focus:ring-[#d90416]/20 transition cursor-pointer"
                  title="Sélectionner le mois"
                >
                  {MONTH_NAMES_FR.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-sm sm:text-base px-2.5 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-[#d90416] dark:hover:border-[#d90416] focus:outline-none focus:ring-2 focus:ring-[#d90416]/20 transition cursor-pointer"
                  title="Sélectionner l'année"
                >
                  {Array.from({ length: 15 }, (_, i) => year - 7 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-400">
                {defaultClientId
                  ? "Calendrier des visites et mémos de ce client"
                  : "Vue globale des déplacements terrain et des notes clés"}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition"
            >
              Aujourd&apos;hui
            </button>

            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Button */}
            {onAddVisit && (
              <button
                type="button"
                onClick={() => onAddVisit(selectedDayStr || undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Visite</span>
              </button>
            )}
          </div>
        </div>

        {/* Legend & Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-zinc-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Affichage :</span>
            <button
              type="button"
              onClick={() => setShowVisits(!showVisits)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                showVisits
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-50 dark:bg-zinc-800/60 text-slate-400 border-transparent opacity-60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Visites ({visits.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                showNotes
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-slate-50 dark:bg-zinc-800/60 text-slate-400 border-transparent opacity-60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Notes & Suivis ({notes.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Cliquez sur un jour pour voir les détails ci-contre
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-px mt-3 mb-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider">
          {DAYS_HEADER_FR.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Month Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 auto-rows-fr">
          {monthMatrix.map((item, idx) => {
            const isToday = item.dateStr === todayStr;
            const isSelected = item.dateStr === selectedDayStr;
            const dayEvents = eventsByDay.get(item.dateStr) || [];
            const visitCount = dayEvents.filter((e) => e.kind === "VISIT").length;
            const noteCount = dayEvents.filter((e) => e.kind === "NOTE").length;

            return (
              <div
                key={`${item.dateStr}_${idx}`}
                onClick={() => setSelectedDayStr(item.dateStr)}
                className={`min-h-[72px] sm:min-h-[88px] rounded-2xl p-1.5 sm:p-2 border cursor-pointer transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? "border-[#d90416] bg-red-50/20 dark:bg-red-950/20 ring-2 ring-red-500/20 shadow-xs"
                    : isToday
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50/15 dark:bg-blue-950/20"
                    : item.isCurrentMonth
                    ? "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700"
                    : "border-slate-100 dark:border-zinc-800/40 bg-slate-50/50 dark:bg-zinc-950/40 opacity-40 hover:opacity-75"
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-lg w-5 h-5 sm:w-6 sm:h-6 ${
                      isToday
                        ? "bg-[#d90416] text-white"
                        : isSelected
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : item.isCurrentMonth
                        ? "text-slate-700 dark:text-zinc-200"
                        : "text-slate-400"
                    }`}
                  >
                    {item.day}
                  </span>

                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1 rounded">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event previews in calendar tile */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((evt) => (
                    <div
                      key={evt.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold border ${
                        evt.kind === "VISIT"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                          : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                      }`}
                      title={`${evt.title} ${evt.clientName ? `— ${evt.clientName}` : ""}`}
                    >
                      <span className="font-bold">
                        {evt.kind === "VISIT" ? "📍 " : "📝 "}
                      </span>
                      {evt.clientName ? `${evt.clientName} - ` : ""}
                      {evt.title}
                    </div>
                  ))}

                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-slate-400 font-semibold block text-center">
                      +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDEBAR : DAY DETAILS & AGENDA */}
      <div className="xl:w-80 2xl:w-96 flex flex-col min-w-0 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-zinc-800 pt-5 xl:pt-0 xl:pl-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Agenda du jour
            </h3>
            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {selectedDayStr
                ? new Date(selectedDayStr).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Sélectionnez un jour"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {onAddVisit && (
              <button
                type="button"
                onClick={() => onAddVisit(selectedDayStr || undefined)}
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 hover:bg-emerald-100 transition"
                title="Consigner une visite sur ce jour"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {onAddNote && (
              <button
                type="button"
                onClick={() => onAddNote(selectedDayStr || undefined)}
                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 hover:bg-amber-100 transition"
                title="Ajouter une note sur ce jour"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List of events for selected day */}
        <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1 max-h-[500px]">
          {selectedDayEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
              <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 dark:text-zinc-300">
                Aucun événement ce jour-ci
              </p>
              <p className="mt-1">
                Aucune visite ni note enregistrée pour le{" "}
                {selectedDayStr ? new Date(selectedDayStr).toLocaleDateString("fr-FR") : ""}.
              </p>
            </div>
          ) : (
            selectedDayEvents.map((evt) => {
              const isVisit = evt.kind === "VISIT";
              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (isVisit && evt.rawVisit && onSelectVisit) {
                      onSelectVisit(evt.rawVisit);
                    } else if (!isVisit && evt.rawNote && onSelectNote) {
                      onSelectNote(evt.rawNote);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-xs group ${
                    isVisit
                      ? "border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 hover:border-emerald-400"
                      : "border-amber-200/90 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 hover:border-amber-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${evt.badgeClass}`}
                    >
                      {isVisit ? <CalendarIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {evt.badgeLabel}
                    </span>

                    {evt.time && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#d90416]" />
                        {evt.time}
                      </span>
                    )}
                  </div>

                  {evt.clientName && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-100 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                      <span>{evt.clientName}</span>
                    </div>
                  )}

                  <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                    {evt.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-3 leading-relaxed bg-white/70 dark:bg-zinc-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                    {stripMarkdown(evt.summary)}
                  </p>

                  {/* If visit has linked notes */}
                  {evt.rawVisit?.notes && evt.rawVisit.notes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-950 flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      <FileText className="w-3 h-3" />
                      <span>{evt.rawVisit.notes.length} note(s) liée(s)</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
