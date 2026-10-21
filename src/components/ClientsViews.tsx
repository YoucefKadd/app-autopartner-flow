"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Mail,
  Phone,
  Clock,
  Check,
  X,
  ArrowUpDown,
  Search,
  Store,
  Building2,
  User,
  Copy,
  Camera,
  Calendar,
  AlertTriangle,
} from "lucide-react";

import {
  ClientItem,
  ClientStatus,
  CLIENT_STATUS_CONFIG,
  KamUser,
  formatRelativeDate,
  getInitials,
} from "@/types/kam";
import { getClientVisitStatus } from "@/lib/visits";

interface ClientsViewsProps {
  viewMode: "table" | "compact" | "grid" | "kanban";
  clients: ClientItem[];
  activeUser: KamUser | null;
  tableSearch: string;
  onTableSearchChange: (val: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: ClientStatus) => void;
  onSelectClient: (client: ClientItem) => void;
  onEditClient: (client: ClientItem) => void;
  onDeleteClient: (clientId: string) => void;
  onQuickNoteForClient: (clientId: string) => void;
  onAddVisitForClient?: (clientId: string) => void;
  onChangeStatus: (clientId: string, status: ClientStatus) => void;
}

const AVATAR_PALETTES = [
  "bg-[#d90416] text-white",
  "bg-slate-800 text-white dark:bg-slate-700",
  "bg-emerald-600 text-white",
  "bg-sky-600 text-white",
  "bg-amber-600 text-white",
  "bg-violet-600 text-white",
];

function getAvatarPalette(str: string) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
}

function getStoreInitials(str: string) {
  if (!str) return "MP";
  const clean = str.trim().split(/\s+/);
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return (clean[0][0] + clean[1][0]).toUpperCase();
}

function renderVisitStatusBadge(client: ClientItem) {
  const vs = getClientVisitStatus(client);
  if (vs.urgency === "DISABLED" || vs.revisitIntervalDays === 0) {
    return (
      <span
        title="Rythme de re-visite automatique désactivé pour ce client"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
      >
        <Clock className="w-2.5 h-2.5 text-slate-400" />
        Désactivé
      </span>
    );
  }
  if (vs.urgency === "NEVER") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400">
        <Clock className="w-2.5 h-2.5" />
        Jamais visité
      </span>
    );
  }
  if (vs.urgency === "OVERDUE") {
    return (
      <span
        title={`Dernière visite il y a ${vs.daysSinceLastVisit}j (délai fixé : ${vs.revisitIntervalDays}j)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
        En retard (+{vs.daysOverdue}j)
      </span>
    );
  }
  if (vs.urgency === "SOON") {
    const remaining = Math.max(0, vs.revisitIntervalDays - (vs.daysSinceLastVisit || 0));
    return (
      <span
        title={`Dernière visite il y a ${vs.daysSinceLastVisit}j. Re-visite sous ${remaining}j`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
      >
        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
        À re-visiter ({remaining}j)
      </span>
    );
  }
  return (
    <span
      title={`Dernière visite il y a ${vs.daysSinceLastVisit}j (rythme fixé : ${vs.revisitIntervalDays}j)`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
    >
      <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
      Il y a {vs.daysSinceLastVisit}j
    </span>
  );
}

export type TableSortField =
  | "company"
  | "apCode"
  | "city"
  | "postalCode"
  | "email"
  | "phone"
  | "status"
  | "lastVisit"
  | "visit";

export function ClientsViews({
  viewMode,
  clients,
  activeUser,
  tableSearch,
  onTableSearchChange,
  pageSize,
  onPageSizeChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  onSelectClient,
  onEditClient,
  onDeleteClient,
  onQuickNoteForClient,
  onAddVisitForClient,
  onChangeStatus,
}: ClientsViewsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [logoUpdateTrigger, setLogoUpdateTrigger] = useState(0);
  const [targetClientForLogo, setTargetClientForLogo] = useState<string | null>(null);
  const quickLogoInputRef = useRef<HTMLInputElement>(null);

  // Sorting state for table
  const [sortField, setSortField] = useState<TableSortField | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  function handleToggleSort(field: TableSortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  useEffect(() => {
    function handleSync() {
      setLogoUpdateTrigger((prev) => prev + 1);
    }
    window.addEventListener("apflow_logo_changed", handleSync);
    window.addEventListener("apflow_visits_updated", handleSync);
    window.addEventListener("apflow_apcode_changed", handleSync);
    window.addEventListener("apflow_cp_changed", handleSync);
    return () => {
      window.removeEventListener("apflow_logo_changed", handleSync);
      window.removeEventListener("apflow_visits_updated", handleSync);
      window.removeEventListener("apflow_apcode_changed", handleSync);
      window.removeEventListener("apflow_cp_changed", handleSync);
    };
  }, []);

  function triggerQuickLogoUpload(clientId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTargetClientForLogo(clientId);
    quickLogoInputRef.current?.click();
  }

  function handleQuickLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !targetClientForLogo) return;

    const clientId = targetClientForLogo;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          localStorage.setItem(`apflow_logo_${clientId}`, compressed);
          setLogoUpdateTrigger((prev) => prev + 1);
          window.dispatchEvent(
            new CustomEvent("apflow_logo_changed", {
              detail: { clientId, logo: compressed },
            })
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCopy(text: string, key: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1500);
  }


  // Sort clients if a sortField is active
  const sortedClients = React.useMemo(() => {
    if (!sortField) return clients;

    const helperGetApCode = (id: string) => {
      if (typeof window === "undefined") return "";
      let code = localStorage.getItem(`apflow_apcode_${id}`) || "";
      if (!code) {
        try {
          const f = localStorage.getItem(`apflow_fiche_v4_${id}`);
          if (f) {
            const p = JSON.parse(f);
            if (p.apClientNumber) code = p.apClientNumber;
          }
        } catch {}
      }
      return code || String(3300000 + Math.abs(id.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 900000, 0)));
    };

    const helperGetPostalCode = (id: string) => {
      if (typeof window === "undefined") return "";
      return localStorage.getItem(`apflow_cp_${id}`) || "";
    };

    return [...clients].sort((a, b) => {
      let cmp = 0;
      if (sortField === "company") {
        cmp = a.company.localeCompare(b.company, "fr", { sensitivity: "base" });
      } else if (sortField === "city") {
        cmp = a.city.localeCompare(b.city, "fr", { sensitivity: "base" });
      } else if (sortField === "email") {
        cmp = (a.email || "").localeCompare(b.email || "", "fr", { sensitivity: "base" });
      } else if (sortField === "phone") {
        cmp = (a.phone || "").localeCompare(b.phone || "");
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sortField === "apCode") {
        cmp = helperGetApCode(a.id).localeCompare(helperGetApCode(b.id), "fr", { numeric: true });
      } else if (sortField === "postalCode") {
        cmp = helperGetPostalCode(a.id).localeCompare(helperGetPostalCode(b.id), "fr", { numeric: true });
      } else if (sortField === "visit") {
        const vsA = getClientVisitStatus(a);
        const vsB = getClientVisitStatus(b);
        const daysA = vsA.daysSinceLastVisit ?? 99999;
        const daysB = vsB.daysSinceLastVisit ?? 99999;
        cmp = daysA - daysB;
      } else if (sortField === "lastVisit") {
        const vsA = getClientVisitStatus(a);
        const vsB = getClientVisitStatus(b);
        const timeA = vsA.lastVisitDate ? new Date(vsA.lastVisitDate).getTime() : 0;
        const timeB = vsB.lastVisitDate ? new Date(vsB.lastVisitDate).getTime() : 0;
        cmp = timeA - timeB;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [clients, sortField, sortOrder, logoUpdateTrigger]);

  const displayedClients = sortedClients.slice(0, pageSize);
  const allSelected =
    displayedClients.length > 0 &&
    displayedClients.every((c) => selectedIds.includes(c.id));

  return (
    <div className="relative w-full">
      {/* Hidden file input for quick logo upload from table / grid */}
      <input
        ref={quickLogoInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickLogoFile}
        className="hidden"
      />

      {/* VIEW 1: TABLE (Standard & Compact) */}
      {(viewMode === "table" || viewMode === "compact") && (
        <div className="w-full rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Card top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => onTableSearchChange(e.target.value)}
                placeholder="Filtrer dans le tableau..."
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span>Affichage</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                sur{" "}
                <strong className="text-slate-800 dark:text-zinc-200">
                  {clients.length}
                </strong>{" "}
                clients
              </span>
            </div>
          </div>

          {displayedClients.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Aucun client ne correspond à votre recherche
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Essayez d&apos;autres filtres ou créez un nouveau client.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200/70 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    <th className={`${viewMode === "compact" ? "py-2.5 pl-4 pr-2" : "py-3.5 pl-6 pr-3"} w-[44px] border-r border-slate-100 dark:border-zinc-800/60`}>
                      <button
                        type="button"
                        onClick={onToggleSelectAll}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          allSelected
                            ? "bg-[#d90416] border-[#d90416] text-white"
                            : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {allSelected && (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </button>
                    </th>
                    {/* Colonne 1 : Nom du Magasin */}
                    <th
                      onClick={() => handleToggleSort("company")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-5"} font-bold text-slate-700 dark:text-zinc-200 border-r border-slate-100 dark:border-zinc-800/60 min-w-[200px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>NOM DU MAG</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "company" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 2 : Code AP */}
                    <th
                      onClick={() => handleToggleSort("apCode")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} font-bold text-[#d90416] border-r border-slate-100 dark:border-zinc-800/60 min-w-[110px] cursor-pointer hover:underline transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>CODE AP</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "apCode" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 3 : Ville */}
                    <th
                      onClick={() => handleToggleSort("city")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[120px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>VILLE</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "city" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 4 : CP */}
                    <th
                      onClick={() => handleToggleSort("postalCode")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[80px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>CP</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "postalCode" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 5 : Mail */}
                    <th
                      onClick={() => handleToggleSort("email")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[160px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>LE MAIL</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "email" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 6 : Tel */}
                    <th
                      onClick={() => handleToggleSort("phone")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[120px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>LE TEL</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "phone" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 7 : Statut (sans santé) */}
                    <th
                      onClick={() => handleToggleSort("status")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[110px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>LE STATUT</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "status" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne : Dernière Visite */}
                    <th
                      onClick={() => handleToggleSort("lastVisit")}
                      className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-4"} border-r border-slate-100 dark:border-zinc-800/60 min-w-[145px] cursor-pointer hover:text-[#d90416] transition-colors select-none`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>DERNIÈRE VISITE</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === "lastVisit" ? "text-[#d90416]" : "text-slate-400 opacity-60"}`} />
                      </div>
                    </th>
                    {/* Colonne 9 : Actions */}
                    <th className={`${viewMode === "compact" ? "py-2.5 px-3" : "py-3.5 px-5"} text-right min-w-[130px]`}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-xs">
                  {displayedClients.map((client) => {
                    const isSelected = selectedIds.includes(client.id);
                    const statusCfg =
                      CLIENT_STATUS_CONFIG[client.status] ||
                      CLIENT_STATUS_CONFIG.ACTIVE;

                    // Code AP (numeric format 7 digits like 3306131)
                    let apCode = "";
                    let postalCode = "";
                    let logo = "";
                    if (typeof window !== "undefined") {
                      apCode = localStorage.getItem(`apflow_apcode_${client.id}`) || "";
                      if (!apCode) {
                        try {
                          const savedFiche = localStorage.getItem(`apflow_fiche_v4_${client.id}`);
                          if (savedFiche) {
                            const parsed = JSON.parse(savedFiche);
                            if (parsed.apClientNumber) apCode = parsed.apClientNumber;
                          }
                        } catch {}
                      }
                      postalCode = localStorage.getItem(`apflow_cp_${client.id}`) || "";
                      if (!postalCode) {
                        try {
                          const savedAddr = localStorage.getItem(`apflow_addresses_v4_${client.id}`);
                          if (savedAddr) {
                            const parsed = JSON.parse(savedAddr);
                            const primary = parsed.find((a: any) => a.isPrimary) || parsed[0];
                            if (primary?.postalCode) postalCode = primary.postalCode;
                            else if (primary?.zipCity) {
                              const match = primary.zipCity.match(/\b\d{5}\b/);
                              if (match) postalCode = match[0];
                            }
                          }
                        } catch {}
                      }
                      logo = localStorage.getItem(`apflow_logo_${client.id}`) || "";
                    }

                    // Default AP code formatted as 7 digits like 3306131 if not customized
                    if (!apCode) {
                      let hash = 0;
                      for (let i = 0; i < client.id.length; i++) {
                        hash = (hash * 31 + client.id.charCodeAt(i)) % 900000;
                      }
                      apCode = String(3300000 + Math.abs(hash));
                    }

                    // Default postal code fallback if not set
                    if (!postalCode) {
                      if (client.city?.toLowerCase().includes("lyon")) postalCode = "69007";
                      else if (client.city?.toLowerCase().includes("toulouse")) postalCode = "31200";
                      else if (client.city?.toLowerCase().includes("marseille")) postalCode = "13008";
                      else if (client.city?.toLowerCase().includes("lille")) postalCode = "59000";
                      else if (client.city?.toLowerCase().includes("paris") || client.city?.toLowerCase().includes("saint-denis")) postalCode = "93200";
                      else postalCode = "—";
                    }

                    const rowPadding = viewMode === "compact" ? "py-2" : "py-3.5";

                    return (
                      <tr
                        key={client.id}
                        onClick={() => onSelectClient(client)}
                        className={`group cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-red-50/40 dark:bg-zinc-800/70"
                            : "hover:bg-slate-50/90 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className={`${rowPadding} ${viewMode === "compact" ? "pl-4 pr-2" : "pl-6 pr-3"} border-r border-slate-50 dark:border-zinc-800/40`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(client.id);
                          }}
                        >
                          <button
                            type="button"
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected
                                ? "bg-[#d90416] border-[#d90416] text-white"
                                : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-slate-400"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            )}
                          </button>
                        </td>

                        {/* 1. NOM DU MAG (avec logo ou avatar initiales + Clic pour modifier le logo) */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-5"} border-r border-slate-50 dark:border-zinc-800/40`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              onClick={(e) => triggerQuickLogoUpload(client.id, e)}
                              className="relative group/logo cursor-pointer shrink-0"
                              title="Cliquer pour changer ou ajouter le logo de ce magasin"
                            >
                              {logo ? (
                                <div className={`${viewMode === "compact" ? "w-6 h-6" : "w-8 h-8"} rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0.5 overflow-hidden shadow-xs flex items-center justify-center`}>
                                  <img src={logo} alt={client.company} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div
                                  className={`${viewMode === "compact" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"} rounded-lg font-bold flex items-center justify-center shadow-xs ${getAvatarPalette(
                                    client.company
                                  )}`}
                                >
                                  {getStoreInitials(client.company)}
                                </div>
                              )}
                              {/* Overlay caméra au survol */}
                              <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Camera className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#d90416] transition-colors truncate">
                              {client.company}
                            </span>
                          </div>
                        </td>

                        {/* 2. CODE AP (Format numérique 3306131 + Bouton Copier) */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40`}>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                              {apCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(apCode, `ap_${client.id}`, e)}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Copier le code AP"
                            >
                              {copiedKey === `ap_${client.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 3. VILLE */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40 font-medium text-slate-800 dark:text-zinc-200 truncate`}>
                          {client.city || "—"}
                        </td>

                        {/* 4. CP */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40 font-mono text-slate-600 dark:text-zinc-400`}>
                          {postalCode}
                        </td>

                        {/* 5. LE MAIL (+ Bouton Copier) */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40`}>
                          {client.email ? (
                            <div className="flex items-center justify-between gap-1 max-w-[200px]">
                              <a
                                href={`mailto:${client.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-700 dark:text-zinc-300 hover:text-[#d90416] hover:underline truncate"
                              >
                                {client.email}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(client.email, `mail_${client.id}`, e)}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                                title="Copier le mail"
                              >
                                {copiedKey === `mail_${client.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. LE TEL (+ Bouton Copier) */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40 font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap`}>
                          {client.phone ? (
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={`tel:${client.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline hover:text-[#d90416]"
                              >
                                {client.phone}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(client.phone, `tel_${client.id}`, e)}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Copier le téléphone"
                              >
                                {copiedKey === `tel_${client.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 7. LE STATUT (sans la santé) */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40`}>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                            />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* DERNIÈRE VISITE */}
                        <td className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-4"} border-r border-slate-50 dark:border-zinc-800/40 whitespace-nowrap`}>
                          {(() => {
                            const vs = getClientVisitStatus(client);
                            if (!vs.lastVisitDate) {
                              return <span className="text-slate-400 text-[11px] italic">Jamais visité</span>;
                            }
                            const d = new Date(vs.lastVisitDate);
                            const formattedDate = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-800 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                                  {formattedDate}
                                </span>
                                {vs.daysSinceLastVisit !== null && (
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 pl-5">
                                    {vs.daysSinceLastVisit === 0 ? "Aujourd'hui" : `Il y a ${vs.daysSinceLastVisit} j`}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 9. ACTIONS */}
                        <td
                          className={`${rowPadding} ${viewMode === "compact" ? "px-3" : "px-5"} text-right`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {onAddVisitForClient && (
                              <button
                                type="button"
                                onClick={() => onAddVisitForClient(client.id)}
                                title="Consigner une visite terrain datée"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#d90416] hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onQuickNoteForClient(client.id)}
                              title="Ajouter une note ou compte-rendu"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#d90416] hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditClient(client)}
                              title="Modifier"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteClient(client.id)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GRID (Clean Minimalist Cards) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map((client) => {
            const statusCfg =
              CLIENT_STATUS_CONFIG[client.status] ||
              CLIENT_STATUS_CONFIG.ACTIVE;
            const notesCount =
              client._count?.notes ?? client.notes?.length ?? 0;
            const gridLogo =
              typeof window !== "undefined"
                ? localStorage.getItem(`apflow_logo_${client.id}`) || ""
                : "";

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="group cursor-pointer rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-[#d90416]/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        onClick={(e) => triggerQuickLogoUpload(client.id, e)}
                        className="relative group/gridlogo cursor-pointer shrink-0"
                        title="Cliquer pour changer le logo de ce magasin"
                      >
                        {gridLogo ? (
                          <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src={gridLogo} alt={client.company} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center shadow-sm ${getAvatarPalette(
                              client.company
                            )}`}
                          >
                            {getStoreInitials(client.company)}
                          </div>
                        )}
                        <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover/gridlogo:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight group-hover:text-[#d90416] transition-colors truncate">
                          {client.company}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                          <span className="truncate">{client.city || "Magasin"}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400 py-3 border-y border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-200">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold truncate">{client.contactName}</span>
                      <span className="text-[11px] text-slate-400 font-normal truncate">
                        ({client.position || "Gérant"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{client.phone || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderVisitStatusBadge(client)}
                      </div>
                      <span className="text-slate-400 shrink-0 text-[10px]">
                        Contact {formatRelativeDate(client.lastContactAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      Santé{" "}
                      <strong className="text-slate-700 dark:text-zinc-200">
                        {client.healthScore}%
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span className="text-[11px] text-slate-400">
                      {notesCount} note{notesCount > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onAddVisitForClient && (
                      <button
                        type="button"
                        onClick={() => onAddVisitForClient(client.id)}
                        className="px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/40 text-[11px] font-semibold text-[#d90416] hover:bg-[#d90416] hover:text-white transition-colors"
                        title="Consigner une visite pour ce client"
                      >
                        + Visite
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onQuickNoteForClient(client.id)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      + Note
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditClient(client)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: KANBAN (By Client Status) */}
      {viewMode === "kanban" && (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-4 min-w-max">
            {(["VIP", "ACTIVE", "PROSPECT", "NEW", "FOLLOW_UP"] as ClientStatus[]).map(
              (statusKey) => {
                const cfg = CLIENT_STATUS_CONFIG[statusKey];
                const colClients = clients.filter(
                  (c) => c.status === statusKey
                );

                return (
                  <div
                    key={statusKey}
                    className="w-[280px] sm:w-[310px] shrink-0 rounded-xl bg-slate-100/80 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-800 p-3.5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${cfg.dotClass}`}
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700">
                        {colClients.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[180px]">
                      {colClients.map((client) => {
                        const notesCount =
                          client._count?.notes ?? client.notes?.length ?? 0;
                        const kanbanLogo =
                          typeof window !== "undefined"
                            ? localStorage.getItem(`apflow_logo_${client.id}`) || ""
                            : "";
                        return (
                          <div
                            key={client.id}
                            onClick={() => onSelectClient(client)}
                            className="cursor-pointer rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-3.5 shadow-sm hover:border-[#d90416]/50 transition-all space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  onClick={(e) => triggerQuickLogoUpload(client.id, e)}
                                  className="relative group/kanbanlogo cursor-pointer shrink-0"
                                  title="Cliquer pour changer le logo de ce magasin"
                                >
                                  {kanbanLogo ? (
                                    <div className="w-7 h-7 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0.5 overflow-hidden shadow-xs flex items-center justify-center">
                                      <img src={kanbanLogo} alt={client.company} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${getAvatarPalette(
                                        client.company
                                      )}`}
                                    >
                                      {getStoreInitials(client.company)}
                                    </div>
                                  )}
                                  <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover/kanbanlogo:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Camera className="w-2.5 h-2.5 text-white" />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-[#d90416]">
                                    {client.company}
                                  </p>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{client.contactName}</span>
                                    <span className="text-[10px] text-slate-400 truncate">({client.position || "Gérant"})</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                {client.healthScore}%
                              </span>
                            </div>

                            {/* Visit badge in Kanban */}
                            <div className="pt-0.5">
                              {renderVisitStatusBadge(client)}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                                {client.city || "Magasin"}
                              </span>
                              {notesCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                                  <FileText className="w-2.5 h-2.5" />
                                  {notesCount}
                                </span>
                              )}
                            </div>

                            <div
                              className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={client.status}
                                onChange={(e) =>
                                  onChangeStatus(
                                    client.id,
                                    e.target.value as ClientStatus
                                  )
                                }
                                className="text-[10px] bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-zinc-300 focus:outline-none"
                              >
                                {(
                                  Object.keys(
                                    CLIENT_STATUS_CONFIG
                                  ) as ClientStatus[]
                                ).map((st) => (
                                  <option key={st} value={st}>
                                    {CLIENT_STATUS_CONFIG[st].label}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1.5">
                                {notesCount > 0 && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <FileText className="w-2.5 h-2.5" />
                                    {notesCount}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    onQuickNoteForClient(client.id)
                                  }
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-[#d90416] hover:text-white transition-colors"
                                >
                                  + Note
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#161920] text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 animate-in slide-in-from-bottom-3">
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Désélectionner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium px-2 border-r border-slate-700">
            Sélectionnés : {selectedIds.length}
          </span>
          <button
            type="button"
            onClick={() => onBulkStatusChange("VIP")}
            className="text-[11px] px-2.5 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            Passer VIP
          </button>
          <button
            type="button"
            onClick={() => onBulkStatusChange("ACTIVE")}
            className="text-[11px] px-2.5 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            Passer Active
          </button>
          <button
            type="button"
            onClick={onBulkDelete}
            className="p-1.5 rounded hover:bg-rose-600/20 text-rose-400 transition-colors"
            title="Supprimer la sélection"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
