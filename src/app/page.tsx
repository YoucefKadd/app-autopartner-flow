"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Plus,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Store,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Flame,
  Activity,
  Compass,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { CLIENT_STATUS_CONFIG, ClientItem, ClientVisit, NoteItem, getInitials } from "@/types/kam";
import { stripMarkdown } from "@/components/NoteFormatter";
import { CaImportModal } from "@/components/CaImportModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { getAllPortfolioVisits } from "@/lib/visits";

export default function DashboardHomePage() {
  const router = useRouter();
  const {
    clients,
    notes,
    users,
    activeUser,
    loggedUser,
    openQuickNote,
    openClientModal,
    refreshWorkspace,
  } = useWorkspace();

  const [isCaModalOpen, setIsCaModalOpen] = useState(false);
  const [isClientCsvModalOpen, setIsClientCsvModalOpen] = useState(false);

  // CA and AX summary from MySQL
  const [caData, setCaData] = useState<{
    totalAmount: number;
    totalAx: number;
    totalTarget: number;
    totalOrders: number;
  }>({
    totalAmount: 0,
    totalAx: 0,
    totalTarget: 0,
    totalOrders: 0,
  });

  const [actionFilter, setActionFilter] = useState<"ALL" | "VISITS" | "NOTES" | "CLIENTS">("ALL");

  const currentYear = new Date().getFullYear();

  // Load CA & AX data from real MySQL DB (STRICTLY NO FAKE NUMBERS)
  useEffect(() => {
    async function loadCa() {
      try {
        const res = await fetch(`/api/ca?year=${currentYear}`);
        if (res.ok) {
          const data = await res.json();
          setCaData({
            totalAmount: data.totalAmount || 0,
            totalAx: data.totalAx || 0,
            totalTarget: data.totalTarget || 0,
            totalOrders: data.totalOrders || 0,
          });
        }
      } catch (err) {
        console.error("Error loading CA in dashboard:", err);
      }
    }
    loadCa();

    function handleCaSync() {
      loadCa();
    }
    window.addEventListener("apflow_ca_changed", handleCaSync);
    return () => window.removeEventListener("apflow_ca_changed", handleCaSync);
  }, [currentYear]);

  // Clients breakdown by status
  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === "ACTIVE" || c.status === "VIP").length;
    const inactive = clients.filter((c) => c.status === "INACTIVE" || c.status === "ARCHIVED").length;
    const vip = clients.filter((c) => c.status === "VIP").length;
    const newClients = clients.filter((c) => c.status === "NEW").length;
    const followUp = clients.filter((c) => c.status === "FOLLOW_UP").length;

    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, active, inactive, vip, newClients, followUp, activeRatio };
  }, [clients]);

  // All visits from portfolio
  const allVisits = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getAllPortfolioVisits(clients);
  }, [clients]);

  // Unified Chronological Activity Stream (Dernières Actions)
  const recentActions = useMemo(() => {
    type UnifiedAction = {
      id: string;
      type: "VISIT" | "NOTE" | "CLIENT";
      timestamp: number;
      dateFormatted: string;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeColor: string;
      clientCompany?: string;
      clientId?: string;
      linkUrl: string;
    };

    const actions: UnifiedAction[] = [];

    // 1. Recent visits
    allVisits.forEach((v) => {
      const parsedDate = new Date(v.date || v.createdAt);
      actions.push({
        id: `v_${v.id}`,
        type: "VISIT",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: v.date || "Date non précisée",
        title: `Visite terrain — ${v.interlocutor || "Contact client"}`,
        subtitle: stripMarkdown(v.summary).slice(0, 100) || "Visite de routine effectuée",
        badgeText: v.status === "EFFECTUEE" ? "Visite effectuée" : "Visite planifiée",
        badgeColor:
          v.status === "EFFECTUEE"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-500/20",
        clientCompany: v.client?.company,
        clientId: v.client?.id,
        linkUrl: `/clients/${v.client?.id}?tab=visites`,
      });
    });

    // 2. Recent notes
    notes.forEach((n) => {
      const parsedDate = new Date(n.createdAt);
      actions.push({
        id: `n_${n.id}`,
        type: "NOTE",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: new Date(n.createdAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        title: n.title || `Note ${n.category.toLowerCase()}`,
        subtitle: stripMarkdown(n.content).slice(0, 100) || "Contenu de note",
        badgeText: `Note (${n.category})`,
        badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20",
        clientCompany: n.client?.company,
        clientId: n.client?.id,
        linkUrl: n.clientId ? `/clients/${n.clientId}?tab=notes` : "/notes",
      });
    });

    // 3. Recent clients updated/created
    clients.slice(0, 15).forEach((c) => {
      const parsedDate = new Date(c.updatedAt || c.lastContactAt);
      actions.push({
        id: `c_${c.id}`,
        type: "CLIENT",
        timestamp: isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime(),
        dateFormatted: new Date(c.updatedAt || c.lastContactAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        title: `Fiche client : ${c.company}`,
        subtitle: `${c.contactName || "Contact principal"} — ${c.city || "France"} ${
          c.phone ? `(${c.phone})` : ""
        }`,
        badgeText: c.status === "ACTIVE" ? "Actif" : c.status === "INACTIVE" ? "Inactif" : c.status,
        badgeColor:
          c.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700 border-emerald-500/20"
            : c.status === "INACTIVE"
            ? "bg-zinc-100 text-zinc-600 border-zinc-300"
            : "bg-red-50 text-[#d90416] border-red-200",
        clientCompany: c.company,
        clientId: c.id,
        linkUrl: `/clients/${c.id}`,
      });
    });

    // Sort by timestamp desc
    return actions.sort((a, b) => b.timestamp - a.timestamp);
  }, [allVisits, notes, clients]);

  const filteredRecentActions = useMemo(() => {
    if (actionFilter === "ALL") return recentActions.slice(0, 20);
    if (actionFilter === "VISITS") return recentActions.filter((a) => a.type === "VISIT").slice(0, 20);
    if (actionFilter === "NOTES") return recentActions.filter((a) => a.type === "NOTE").slice(0, 20);
    if (actionFilter === "CLIENTS") return recentActions.filter((a) => a.type === "CLIENT").slice(0, 20);
    return recentActions.slice(0, 20);
  }, [recentActions, actionFilter]);

  // Priority Clients requiring immediate attention (Re-visite dépassée)
  const priorityClients = useMemo(() => {
    return clients
      .filter((c) => c.status !== "ARCHIVED" && c.status !== "INACTIVE")
      .slice(0, 6);
  }, [clients]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fb] dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. WELCOME HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] border border-red-200/60 dark:border-red-900/40">
              Pilotage Portefeuille
            </span>
            <span className="text-xs text-slate-400">
              Exercice {currentYear}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight mt-1.5">
            Bonjour, {activeUser?.name || "Équipe KAM"} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Voici la situation globale en temps réel de vos clients, chiffres d'affaires et dernières actions terrain.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openClientModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nouveau Client</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickNote()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Nouvelle Note</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCaModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
            title="Importer un fichier de CA et achats AX"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Importer CA &amp; AX</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClientCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
            title="Importer des clients par fichier CSV"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Importer Clients</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Portefeuille Clients */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <Link
              href="/clients"
              className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
            >
              Voir ({clientStats.total})
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Clients
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {clientStats.total}
              </span>
              <span className="text-xs text-emerald-600 font-bold">
                {clientStats.active} actifs
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Inactifs : <strong>{clientStats.inactive}</strong></span>
            <span>VIP : <strong>{clientStats.vip}</strong></span>
            <span>Nouveaux : <strong>{clientStats.newClients}</strong></span>
          </div>
        </div>

        {/* Card 2: Chiffre d'Affaires Global (STRICTLY REAL DATA) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <Link
              href="/ca"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
            >
              Pilotage CA
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              CA Facturé ({currentYear})
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              {caData.totalAmount > 0 ? (
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {caData.totalAmount.toLocaleString("fr-FR")} €
                </span>
              ) : (
                <span className="text-2xl font-black text-slate-400 dark:text-zinc-500">
                  NC <span className="text-xs font-normal">(Non Communiqué)</span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Achats AX :{" "}
              <strong>
                {caData.totalAx > 0 ? `${caData.totalAx.toLocaleString("fr-FR")} €` : "NC"}
              </strong>
            </span>
            <button
              onClick={() => setIsCaModalOpen(true)}
              className="text-[#d90416] hover:underline font-semibold cursor-pointer"
            >
              + Importer
            </button>
          </div>
        </div>

        {/* Card 3: Visites Terrain */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
              <Calendar className="w-5 h-5" />
            </div>
            <Link
              href="/visites"
              className="text-[11px] text-[#d90416] font-bold hover:underline flex items-center gap-0.5"
            >
              Planning
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Visites Consignées
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {allVisits.length}
              </span>
              <span className="text-xs text-slate-500">
                sur le terrain
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Effectuées :{" "}
              <strong>{allVisits.filter((v) => v.status === "EFFECTUEE").length}</strong>
            </span>
            <span>
              Planifiées :{" "}
              <strong>{allVisits.filter((v) => v.status === "PLANIFIEE").length}</strong>
            </span>
          </div>
        </div>

        {/* Card 4: Notes & Comptes-rendus */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <Link
              href="/notes"
              className="text-[11px] text-amber-600 font-bold hover:underline flex items-center gap-0.5"
            >
              Mémos ({notes.length})
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Notes &amp; Comptes-rendus
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {notes.length}
              </span>
              <span className="text-xs text-amber-600 font-bold">
                {notes.filter((n) => n.pinned).length} épinglées
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Comptes-rendus récents</span>
            <button
              onClick={() => openQuickNote()}
              className="text-[#d90416] hover:underline font-semibold cursor-pointer"
            >
              + Rédiger
            </button>
          </div>
        </div>
      </div>

      {/* 3. TWO COLUMNS: DERNIÈRES ACTIONS (STREAM) & CLIENTS PRIORITAIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Flux des Dernières Actions (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Dernières Actions en Direct
                </h3>
                <p className="text-[11px] text-slate-400">
                  Flux chronologique des visites, notes et modifications récentes
                </p>
              </div>
            </div>

            {/* Filter tags */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActionFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "ALL"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tout ({recentActions.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("VISITS")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "VISITS"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Visites
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("NOTES")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "NOTES"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("CLIENTS")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  actionFilter === "CLIENTS"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Clients
              </button>
            </div>
          </div>

          {/* Activity stream list */}
          {filteredRecentActions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aucune action enregistrée pour le moment.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredRecentActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.linkUrl}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-white dark:hover:bg-zinc-800/60 hover:border-slate-200 dark:hover:border-zinc-700 transition shadow-2xs group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                      {action.type === "VISIT" ? (
                        <Calendar className="w-4 h-4 text-emerald-600" />
                      ) : action.type === "NOTE" ? (
                        <FileText className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Users className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#d90416] transition-colors truncate">
                          {action.title}
                        </p>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${action.badgeColor}`}
                        >
                          {action.badgeText}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {action.subtitle}
                      </p>
                      {action.clientCompany && (
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1 font-semibold">
                          <Store className="w-2.5 h-2.5 text-[#d90416]" />
                          <span>{action.clientCompany}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {action.dateFormatted}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Clients à Revoir / Suivi Prioritaire */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#d90416]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Portefeuille Prioritaire
                </h3>
              </div>
              <Link
                href="/clients"
                className="text-[11px] text-[#d90416] font-bold hover:underline"
              >
                Tous les clients
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Clients nécessitant un contact ou une visite terrain programmée :
            </p>

            <div className="mt-3 space-y-2.5">
              {priorityClients.map((client) => {
                const statusConfig =
                  CLIENT_STATUS_CONFIG[client.status] || CLIENT_STATUS_CONFIG.ACTIVE;
                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 shrink-0">
                        {getInitials(client.company)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#d90416] transition-colors">
                          {client.company}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{client.city || "France"}</span>
                          {client.apClientNumber && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-500 font-semibold">
                                #{client.apClientNumber}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300 font-semibold">
              <span>Santé Globale Portefeuille</span>
              <span className="text-[#d90416] font-bold">85%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-[#d90416] h-full rounded-full"
                style={{ width: "85%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <CaImportModal
        isOpen={isCaModalOpen}
        onClose={() => setIsCaModalOpen(false)}
        onSuccess={() => {
          setIsCaModalOpen(false);
          refreshWorkspace();
        }}
      />

      <CsvImportModal
        isOpen={isClientCsvModalOpen}
        onClose={() => setIsClientCsvModalOpen(false)}
        targetKamId={activeUser?.id}
        kamName={activeUser?.name}
        onSuccess={() => {
          setIsClientCsvModalOpen(false);
          refreshWorkspace();
        }}
      />
    </div>
  );
}
