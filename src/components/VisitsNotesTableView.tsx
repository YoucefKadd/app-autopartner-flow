import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Building2,
  FileText,
  User,
  ArrowUpDown,
  ExternalLink,
  Tag,
  CheckCircle2,
  CalendarClock,
  Sliders,
  Search,
  Filter,
} from "lucide-react";
import { ClientVisit, NoteItem, CLIENT_VISIT_TYPES, NOTE_CATEGORIES, formatFullTimestamp } from "@/types/kam";

interface VisitsNotesTableViewProps {
  visits?: ClientVisit[];
  notes?: NoteItem[];
  defaultClientId?: string;
  onSelectVisit?: (visit: ClientVisit) => void;
  onSelectNote?: (note: NoteItem) => void;
}

export function VisitsNotesTableView({
  visits = [],
  notes = [],
  defaultClientId,
  onSelectVisit,
  onSelectNote,
}: VisitsNotesTableViewProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "VISITS" | "NOTES">("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "client">("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Combine into unified table rows
  const rows = useMemo(() => {
    const list: Array<{
      id: string;
      kind: "VISIT" | "NOTE";
      date: string;
      time?: string;
      title: string;
      content: string;
      categoryOrType: string;
      badgeLabel: string;
      badgeClass: string;
      clientId?: string;
      clientName?: string;
      interlocutor?: string;
      status?: string;
      linkedCount?: number;
      rawVisit?: ClientVisit;
      rawNote?: NoteItem;
    }> = [];

    if (activeTab === "ALL" || activeTab === "VISITS") {
      for (const v of visits) {
        if (defaultClientId && v.clientId !== defaultClientId) continue;
        const typeCfg = CLIENT_VISIT_TYPES[v.type] || CLIENT_VISIT_TYPES.ROUTINE;
        const isCompleted = v.status === "EFFECTUEE";

        list.push({
          id: `visit_${v.id}`,
          kind: "VISIT",
          date: v.date,
          time: v.time,
          title: `Visite : ${typeCfg.label}`,
          content: v.summary,
          categoryOrType: v.type,
          badgeLabel: isCompleted ? "Effectuée" : "Planifiée",
          badgeClass: isCompleted
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-500/20",
          clientId: v.clientId,
          clientName: v.client?.company,
          interlocutor: v.interlocutor,
          status: v.status,
          linkedCount: v.notes?.length || 0,
          rawVisit: v,
        });
      }
    }

    if (activeTab === "ALL" || activeTab === "NOTES") {
      for (const n of notes) {
        if (defaultClientId && n.clientId !== defaultClientId) continue;
        const catCfg = NOTE_CATEGORIES.find((c) => c.value === n.category) || NOTE_CATEGORIES[0];

        list.push({
          id: `note_${n.id}`,
          kind: "NOTE",
          date: n.createdAt.slice(0, 10),
          time: n.createdAt.length >= 16 ? n.createdAt.slice(11, 16) : undefined,
          title: n.title || `Note ${catCfg.label}`,
          content: n.content,
          categoryOrType: n.category,
          badgeLabel: catCfg.label,
          badgeClass: `border ${catCfg.badgeClass}`,
          clientId: n.clientId || undefined,
          clientName: n.client?.company,
          rawNote: n,
        });
      }
    }

    // Filter by search
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q) ||
            (r.clientName && r.clientName.toLowerCase().includes(q)) ||
            (r.interlocutor && r.interlocutor.toLowerCase().includes(q))
        )
      : list;

    // Sort
    return filtered.sort((a, b) => {
      if (sortField === "client") {
        const cA = a.clientName || "";
        const cB = b.clientName || "";
        return sortAsc ? cA.localeCompare(cB) : cB.localeCompare(cA);
      }
      const dA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const dB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return sortAsc ? dA - dB : dB - dA;
    });
  }, [visits, notes, defaultClientId, activeTab, search, sortField, sortAsc]);

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs space-y-0">
      {/* Table Header controls */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950/50">
        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            Tous ({visits.length + notes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("VISITS")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "VISITS"
                ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Visites ({visits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NOTES")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "NOTES"
                ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Notes ({notes.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer dans le tableau..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1.5 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-zinc-950/80 text-slate-500 font-bold border-b border-slate-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3.5">Type / Entité</th>
              <th
                className="py-2.5 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => {
                  if (sortField === "date") setSortAsc(!sortAsc);
                  else {
                    setSortField("date");
                    setSortAsc(false);
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <span>Date & Heure</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              {!defaultClientId && (
                <th
                  className="py-2.5 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => {
                    if (sortField === "client") setSortAsc(!sortAsc);
                    else {
                      setSortField("client");
                      setSortAsc(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Client / Magasin</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              )}
              <th className="py-2.5 px-3.5">Objet / Titre</th>
              <th className="py-2.5 px-3.5">Contenu / Compte-rendu</th>
              <th className="py-2.5 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Aucun élément ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isVisit = r.kind === "VISIT";
                return (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (isVisit && r.rawVisit && onSelectVisit) onSelectVisit(r.rawVisit);
                      else if (!isVisit && r.rawNote && onSelectNote) onSelectNote(r.rawNote);
                    }}
                    className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 cursor-pointer transition group"
                  >
                    <td className="py-2.5 px-3.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.badgeClass}`}
                      >
                        {isVisit ? <Calendar className="w-2.5 h-2.5 text-emerald-600" /> : <FileText className="w-2.5 h-2.5 text-amber-600" />}
                        {r.badgeLabel}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                      <div>
                        {new Date(r.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      {r.time && <span className="text-[10px] text-slate-400">à {r.time}</span>}
                    </td>

                    {!defaultClientId && (
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                        {r.clientName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                            <span>{r.clientName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {r.interlocutor && (
                          <div className="text-[10px] font-normal text-slate-500">
                            Interlocuteur: {r.interlocutor}
                          </div>
                        )}
                      </td>
                    )}

                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap max-w-[200px] truncate">
                      {r.title}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-zinc-400 max-w-[320px] truncate">
                      {r.content}
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <span className="text-[#d90416] text-[11px] font-semibold group-hover:underline flex items-center justify-end gap-1">
                        Ouvrir →
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
