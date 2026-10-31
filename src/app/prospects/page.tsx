"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Building2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronRight,
  Plus,
  ArrowRight,
  Kanban,
  Table as TableIcon,
  Sparkles,
  ExternalLink,
  Pencil,
  AlertCircle,
  FileText,
  CheckSquare,
  X,
  Check,
  Compass,
  DollarSign,
  Flame,
  Award,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { ClientItem, ClientStatus, formatRelativeDate } from "@/types/kam";
import { AddressAutocomplete, AddressSuggestion } from "@/components/AddressAutocomplete";

type ProspectStage =
  | "NOUVEAU"
  | "CONTACTE"
  | "PROPOSITION"
  | "NEGOCIATION"
  | "FINALISATION"
  | "PERDU";

interface ProspectStageConfig {
  value: ProspectStage;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  headerBorder: string;
  columnBg: string;
}

const PROSPECT_STAGES: ProspectStageConfig[] = [
  {
    value: "NOUVEAU",
    label: "Nouveau Prospect",
    shortLabel: "Nouveau",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotClass: "bg-blue-500",
    headerBorder: "border-blue-400",
    columnBg: "bg-blue-50/30 dark:bg-blue-950/15",
  },
  {
    value: "CONTACTE",
    label: "Premier Contact & Échange",
    shortLabel: "Contacté",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
    headerBorder: "border-amber-400",
    columnBg: "bg-amber-50/30 dark:bg-amber-950/15",
  },
  {
    value: "PROPOSITION",
    label: "Proposition & Devis Envoyé",
    shortLabel: "Proposition",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotClass: "bg-purple-500",
    headerBorder: "border-purple-400",
    columnBg: "bg-purple-50/30 dark:bg-purple-950/15",
  },
  {
    value: "NEGOCIATION",
    label: "En Négociation",
    shortLabel: "Négociation",
    badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
    dotClass: "bg-orange-500",
    headerBorder: "border-orange-400",
    columnBg: "bg-orange-50/30 dark:bg-orange-950/15",
  },
  {
    value: "FINALISATION",
    label: "Prêt à Signer / Finalisation",
    shortLabel: "Prêt à signer",
    badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-500",
    headerBorder: "border-emerald-500",
    columnBg: "bg-emerald-50/40 dark:bg-emerald-950/20",
  },
  {
    value: "PERDU",
    label: "Sans Suite / En Veille",
    shortLabel: "Sans suite",
    badgeClass: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/25",
    dotClass: "bg-zinc-400",
    headerBorder: "border-zinc-400",
    columnBg: "bg-zinc-100/40 dark:bg-zinc-900/40",
  },
];

export default function ProspectsPipelinePage() {
  const router = useRouter();
  const { clients, users, activeUser, refreshWorkspace, openQuickNote, openQuickTask } =
    useWorkspace();

  // View state: "kanban" (default pipeline) | "table"
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");

  // Track stages locally per prospect: clientId -> ProspectStage
  const [prospectStages, setProspectStages] = useState<Record<string, ProspectStage>>({});
  const [prospectPotentials, setProspectPotentials] = useState<Record<string, number>>({});

  // Drag and drop in Kanban
  const [draggedProspectId, setDraggedProspectId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProspectStage | null>(null);

  // Conversion Modal State
  const [convertingProspect, setConvertingProspect] = useState<ClientItem | null>(null);
  const [convertApCode, setConvertApCode] = useState("");
  const [convertStatus, setConvertStatus] = useState<ClientStatus>("ACTIVE");
  const [convertTarget, setConvertTarget] = useState<string>("50000");
  const [convertCreateOnboardingTasks, setConvertCreateOnboardingTasks] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionSuccessMessage, setConversionSuccessMessage] = useState<string | null>(null);

  // New Prospect Modal State
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPotential, setNewPotential] = useState("30000");
  const [newStage, setNewStage] = useState<ProspectStage>("NOUVEAU");
  const [newNotes, setNewNotes] = useState("");
  const [isAddingProspect, setIsAddingProspect] = useState(false);

  // Quick edit potential inline
  const [editingPotentialId, setEditingPotentialId] = useState<string | null>(null);
  const [editingPotentialVal, setEditingPotentialVal] = useState("");

  // Load prospect stages & potentials from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadedStages: Record<string, ProspectStage> = {};
    const loadedPots: Record<string, number> = {};

    clients.forEach((c) => {
      if (c.status === "PROSPECT") {
        const storedStage = localStorage.getItem(`apflow_prospect_stage_${c.id}`);
        if (storedStage && PROSPECT_STAGES.some((s) => s.value === storedStage)) {
          loadedStages[c.id] = storedStage as ProspectStage;
        } else {
          loadedStages[c.id] = "NOUVEAU";
        }

        const storedPot = localStorage.getItem(`apflow_prospect_pot_${c.id}`);
        if (storedPot) {
          const val = parseInt(storedPot, 10);
          if (!isNaN(val)) loadedPots[c.id] = val;
        } else {
          loadedPots[c.id] = 25000; // default estimated potential
        }
      }
    });

    setProspectStages(loadedStages);
    setProspectPotentials(loadedPots);
  }, [clients]);

  // Filter only prospects
  const prospectClients = useMemo(() => {
    return clients.filter((c) => c.status === "PROSPECT");
  }, [clients]);

  // Filtered prospects list based on search and filters
  const filteredProspects = useMemo(() => {
    return prospectClients.filter((c) => {
      const stage = prospectStages[c.id] || "NOUVEAU";
      if (stageFilter !== "ALL" && stage !== stageFilter) return false;
      if (cityFilter !== "ALL" && c.city !== cityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCompany = c.company.toLowerCase().includes(q);
        const matchContact = c.contactName?.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        if (!matchCompany && !matchContact && !matchCity && !matchEmail) return false;
      }

      return true;
    });
  }, [prospectClients, prospectStages, stageFilter, cityFilter, searchQuery]);

  // City options for filtering
  const cities = useMemo(() => {
    const set = new Set<string>();
    prospectClients.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [prospectClients]);

  // KPIs
  const totalPotential = useMemo(() => {
    return prospectClients.reduce((acc, c) => acc + (prospectPotentials[c.id] || 0), 0);
  }, [prospectClients, prospectPotentials]);

  const readyToSignCount = useMemo(() => {
    return prospectClients.filter((c) => (prospectStages[c.id] || "NOUVEAU") === "FINALISATION")
      .length;
  }, [prospectClients, prospectStages]);

  const activeInPipeCount = useMemo(() => {
    return prospectClients.filter(
      (c) => (prospectStages[c.id] || "NOUVEAU") !== "PERDU"
    ).length;
  }, [prospectClients, prospectStages]);

  // Update stage handler
  function handleMoveStage(prospectId: string, nextStage: ProspectStage) {
    setProspectStages((prev) => ({ ...prev, [prospectId]: nextStage }));
    if (typeof window !== "undefined") {
      localStorage.setItem(`apflow_prospect_stage_${prospectId}`, nextStage);
    }
  }

  // Update potential handler
  function handleSavePotential(prospectId: string, value: number) {
    setProspectPotentials((prev) => ({ ...prev, [prospectId]: value }));
    if (typeof window !== "undefined") {
      localStorage.setItem(`apflow_prospect_pot_${prospectId}`, value.toString());
    }
    setEditingPotentialId(null);
  }

  // Start conversion modal
  function openConversionModal(prospect: ClientItem) {
    setConvertingProspect(prospect);
    setConvertApCode(prospect.apClientNumber || "");
    setConvertStatus("ACTIVE");
    const currentPot = prospectPotentials[prospect.id] || 50000;
    setConvertTarget(currentPot.toString());
    setConvertCreateOnboardingTasks(true);
    setConversionSuccessMessage(null);
  }

  // Submit conversion
  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!convertingProspect) return;
    if (!convertApCode.trim()) {
      alert("Veuillez renseigner un Code Client AP valide pour activer ce client.");
      return;
    }

    setIsConverting(true);
    try {
      // 1. Update client status and AP number in database
      const res = await fetch(`/api/clients/${convertingProspect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: convertStatus,
          apClientNumber: convertApCode.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour du prospect.");
      }

      // 2. Set annual target for current year
      const targetNum = parseInt(convertTarget.replace(/\D/g, ""), 10) || 0;
      if (targetNum > 0) {
        const curYear = new Date().getFullYear();
        localStorage.setItem(
          `apflow_ca_target_${convertingProspect.id}_${curYear}`,
          targetNum.toString()
        );
        try {
          await fetch("/api/ca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: convertingProspect.id,
              year: curYear,
              month: 0,
              target: targetNum,
            }),
          });
        } catch {}
      }

      // 3. Create initial onboarding tasks if checked
      if (convertCreateOnboardingTasks) {
        const onboardingTasks = [
          {
            title: `Collecter RIB & Kbis pour ouverture compte (${convertingProspect.company})`,
            category: "ADMINISTRATIF",
            priority: true,
          },
          {
            title: `Vérifier code clé & accès SAS de nuit (${convertingProspect.company})`,
            category: "TECHNIQUE",
            priority: true,
          },
          {
            title: `Planifier 1ère visite d'intégration et présentation catalogue (${convertingProspect.company})`,
            category: "COMMERCIAL",
            priority: false,
          },
        ];

        for (const task of onboardingTasks) {
          try {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: task.title,
                status: "TODO",
                category: task.category,
                priority: task.priority,
                clientId: convertingProspect.id,
                kamId: activeUser?.id || convertingProspect.kamId || "default_kam",
              }),
            });
          } catch {}
        }
      }

      setConversionSuccessMessage(
        `Félicitations ! ${convertingProspect.company} a été converti avec succès en Client Actif (#${convertApCode.trim()}).`
      );

      // Refresh workspace data
      if (activeUser?.id) refreshWorkspace(activeUser.id);
      else refreshWorkspace();
    } catch (err: any) {
      alert(err.message || "Erreur de conversion.");
    } finally {
      setIsConverting(false);
    }
  }

  // Create new prospect
  async function handleAddProspectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany.trim() || !newCity.trim()) {
      alert("Le nom de l'entreprise et la ville sont obligatoires.");
      return;
    }

    setIsAddingProspect(true);
    try {
      const targetKamId = activeUser?.id || users[0]?.id || "default_kam";
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: newCompany.trim(),
          contactName: newContact.trim() || "Contact Commercial",
          position: "Dirigeant / Responsable",
          phone: newPhone.trim() || "NC",
          email: newEmail.trim() || "contact@prospect.fr",
          address: newAddress.trim() || null,
          postalCode: newPostalCode.trim() || null,
          city: newCity.trim(),
          status: "PROSPECT",
          kamId: targetKamId,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la création du prospect.");
      }

      const created = await res.json();

      // Store potential and initial stage
      if (created?.id) {
        const potNum = parseInt(newPotential.replace(/\D/g, ""), 10) || 25000;
        localStorage.setItem(`apflow_prospect_pot_${created.id}`, potNum.toString());
        localStorage.setItem(`apflow_prospect_stage_${created.id}`, newStage);

        setProspectPotentials((prev) => ({ ...prev, [created.id]: potNum }));
        setProspectStages((prev) => ({ ...prev, [created.id]: newStage }));

        // Add initial note if provided
        if (newNotes.trim()) {
          try {
            await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Prospection initiale & Découverte",
                content: newNotes.trim(),
                category: "PROSPECTION",
                clientId: created.id,
                kamId: targetKamId,
              }),
            });
          } catch {}
        }
      }

      // Reset form
      setNewCompany("");
      setNewContact("");
      setNewPhone("");
      setNewEmail("");
      setNewCity("");
      setNewPostalCode("");
      setNewAddress("");
      setNewPotential("30000");
      setNewStage("NOUVEAU");
      setNewNotes("");
      setIsAddProspectOpen(false);

      if (activeUser?.id) refreshWorkspace(activeUser.id);
      else refreshWorkspace();
    } catch (err: any) {
      alert(err.message || "Erreur de création.");
    } finally {
      setIsAddingProspect(false);
    }
  }

  function formatEuro(num: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(num);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header with Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-700 dark:text-purple-300">
              <UserPlus className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Pipeline &amp; Suivi des Prospects
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  {prospectClients.length} prospects
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Gérez vos opportunités commerciales, suivez les étapes de qualification et transformez vos prospects en clients en 1 clic
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tableau Commercial</span>
            </button>
          </div>

          {/* Add Prospect Button */}
          <button
            type="button"
            onClick={() => setIsAddProspectOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouveau Prospect</span>
          </button>
        </div>
      </div>

      {/* 2. Commercial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Prospects en Cours
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
            {activeInPipeCount}
          </div>
          <div className="text-[11px] text-slate-400">
            Opportunités actives dans le pipe
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-purple-200/70 dark:border-purple-900/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Potentiel CA Estimé
          </span>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {formatEuro(totalPotential)}
          </div>
          <div className="text-[11px] text-slate-400">
            CA annuel projeté si signé
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            Prêts à Signer
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {readyToSignCount}
          </div>
          <div className="text-[11px] text-slate-400">
            En étape de finalisation / ouverture
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Portefeuille Actif
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
            {clients.filter((c) => c.status !== "PROSPECT").length}
          </div>
          <div className="text-[11px] text-slate-400">
            Clients déjà convertis &amp; actifs
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center flex-wrap gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par enseigne, contact, ville..."
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 pl-8 pr-8 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
          >
            <option value="ALL">Toutes les étapes du pipeline</option>
            {PROSPECT_STAGES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
          >
            <option value="ALL">Toutes les villes ({cities.length})</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Global Conversion Helper Hint */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Bouton « Convertir en Client » sur chaque prospect</span>
        </div>
      </div>

      {/* =====================================================================
          VIEW 1: COMMERCIAL PIPELINE KANBAN (TRELLO FOR PROSPECTS)
         ===================================================================== */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {PROSPECT_STAGES.map((col) => {
            const colProspects = filteredProspects.filter(
              (p) => (prospectStages[p.id] || "NOUVEAU") === col.value
            );
            const isOver = dragOverColumn === col.value;
            const colTotalPotential = colProspects.reduce(
              (acc, p) => acc + (prospectPotentials[p.id] || 0),
              0
            );

            return (
              <div
                key={col.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.value);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  if (draggedProspectId) {
                    handleMoveStage(draggedProspectId, col.value);
                    setDraggedProspectId(null);
                  }
                }}
                className={`rounded-2xl border-2 transition-all p-3 space-y-3 min-h-[460px] ${
                  col.columnBg
                } ${
                  isOver
                    ? "border-purple-500 ring-2 ring-purple-500/20 shadow-md"
                    : "border-slate-200/80 dark:border-zinc-800"
                }`}
              >
                {/* Column Header */}
                <div className="px-1 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-100 truncate">
                        {col.shortLabel}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700">
                      {colProspects.length}
                    </span>
                  </div>
                  {colTotalPotential > 0 && (
                    <div className="text-[10px] font-mono text-slate-400 font-bold mt-1">
                      {formatEuro(colTotalPotential)}
                    </div>
                  )}
                </div>

                {/* Cards List */}
                <div className="space-y-3">
                  {colProspects.map((prospect) => {
                    const potential = prospectPotentials[prospect.id] || 25000;
                    const isEditingPot = editingPotentialId === prospect.id;

                    return (
                      <div
                        key={prospect.id}
                        draggable
                        onDragStart={() => setDraggedProspectId(prospect.id)}
                        onDragEnd={() => {
                          setDraggedProspectId(null);
                          setDragOverColumn(null);
                        }}
                        className="group rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-purple-400 p-3 shadow-xs hover:shadow-md transition-all space-y-2.5"
                      >
                        {/* Company & City */}
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 line-clamp-1">
                              {prospect.company}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                              Prospect
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                            <span className="truncate">{prospect.city}</span>
                          </div>
                        </div>

                        {/* Contact info snippet */}
                        <div className="text-[11px] text-slate-600 dark:text-zinc-300 space-y-0.5">
                          {prospect.contactName && (
                            <div className="font-semibold truncate">
                              👤 {prospect.contactName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            {prospect.phone && (
                              <a
                                href={`tel:${prospect.phone}`}
                                title={`Appeler ${prospect.phone}`}
                                className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-emerald-600 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                title={`Envoyer un email à ${prospect.email}`}
                                className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-blue-600 transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                [prospect.company, prospect.address, prospect.postalCode, prospect.city].filter(Boolean).join(" ")
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              title="GPS direct vers le prospect"
                              className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-[#d90416] transition-colors"
                            >
                              <Compass className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => openQuickNote({ clientId: prospect.id })}
                              title="Ajouter une note de contact / compte-rendu"
                              className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-purple-600 transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openQuickTask({ clientId: prospect.id })}
                              title="Planifier un rappel ou tâche"
                              className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-amber-600 transition-colors"
                            >
                              <CheckSquare className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Potential CA pill */}
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Potentiel :
                          </span>
                          {isEditingPot ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingPotentialVal}
                                onChange={(e) => setEditingPotentialVal(e.target.value)}
                                className="w-16 px-1 py-0.5 text-[10px] font-bold rounded border border-purple-500 bg-white dark:bg-zinc-900"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const n = parseInt(editingPotentialVal.replace(/\D/g, ""), 10) || 0;
                                  handleSavePotential(prospect.id, n);
                                }}
                                className="p-0.5 text-emerald-600"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPotentialId(prospect.id);
                                setEditingPotentialVal(potential.toString());
                              }}
                              className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                              title="Cliquer pour ajuster le potentiel estimé"
                            >
                              <span>{formatEuro(potential)}</span>
                              <Pencil className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          )}
                        </div>

                        {/* Stage Selector Dropdown */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-zinc-800">
                          <select
                            value={col.value}
                            onChange={(e) =>
                              handleMoveStage(prospect.id, e.target.value as ProspectStage)
                            }
                            className="text-[10px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 py-1 px-1.5 text-slate-700 dark:text-zinc-200 focus:outline-none"
                          >
                            {PROSPECT_STAGES.map((s) => (
                              <option key={s.value} value={s.value}>
                                → {s.shortLabel}
                              </option>
                            ))}
                          </select>

                          {/* PROMINENT CONVERT BUTTON */}
                          <button
                            type="button"
                            onClick={() => openConversionModal(prospect)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                            title="Transformer ce prospect en client actif"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Convertir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colProspects.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-300/80 dark:border-zinc-700 rounded-xl text-slate-400 text-[11px]">
                      Aucun prospect
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          VIEW 2: COMMERCIAL TABLE VIEW (CRM PROSPECTS TABLE)
         ===================================================================== */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Enseigne / Prospect</th>
                  <th className="py-3.5 px-4">Contact &amp; Coordonnées</th>
                  <th className="py-3.5 px-4">Ville &amp; Territoire</th>
                  <th className="py-3.5 px-4">Étape Pipeline</th>
                  <th className="py-3.5 px-4">Potentiel Estimé</th>
                  <th className="py-3.5 px-4">Dernier Contact</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Aucun prospect trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => {
                    const currentStage = prospectStages[prospect.id] || "NOUVEAU";
                    const stageCfg =
                      PROSPECT_STAGES.find((s) => s.value === currentStage) || PROSPECT_STAGES[0];
                    const potential = prospectPotentials[prospect.id] || 25000;

                    return (
                      <tr
                        key={prospect.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {/* Company */}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-zinc-100">
                          <Link
                            href={`/clients/${prospect.id}`}
                            className="hover:text-purple-600 flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{prospect.company}</span>
                          </Link>
                          {prospect.address && (
                            <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                              {prospect.address}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-zinc-200">
                            {prospect.contactName || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {prospect.phone && (
                              <a href={`tel:${prospect.phone}`} className="hover:text-emerald-600">
                                {prospect.phone}
                              </a>
                            )}
                            {prospect.email && (
                              <a href={`mailto:${prospect.email}`} className="hover:text-blue-600 truncate max-w-[140px]">
                                {prospect.email}
                              </a>
                            )}
                          </div>
                        </td>

                        {/* City */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-700 dark:text-zinc-300">
                            📍 {prospect.city}
                          </span>
                        </td>

                        {/* Pipeline Stage */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={currentStage}
                            onChange={(e) =>
                              handleMoveStage(prospect.id, e.target.value as ProspectStage)
                            }
                            className={`rounded-xl px-2.5 py-1 text-xs font-bold border focus:outline-none cursor-pointer ${stageCfg.badgeClass}`}
                          >
                            {PROSPECT_STAGES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Estimated Potential */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-purple-700 dark:text-purple-300">
                          {formatEuro(potential)}
                        </td>

                        {/* Last Contact */}
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-400">
                          {formatRelativeDate(prospect.lastContactAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openQuickNote({ clientId: prospect.id })}
                              title="Ajouter une note"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openQuickTask({ clientId: prospect.id })}
                              title="Créer une tâche"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openConversionModal(prospect)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Convertir en Client</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: CONVERT PROSPECT TO CLIENT (TRANSFORMER EN CLIENT)
         ===================================================================== */}
      {convertingProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Convertir en Client Actif
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {convertingProspect.company} ({convertingProspect.city})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingProspect(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success state */}
            {conversionSuccessMessage ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold leading-relaxed">
                  {conversionSuccessMessage}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Link
                    href={`/clients/${convertingProspect.id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Ouvrir la fiche client →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConvertingProspect(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              /* Conversion Form */
              <form onSubmit={handleConvertSubmit} className="space-y-4">
                {/* AP Client Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Code Client AP (obligatoire) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={convertApCode}
                    onChange={(e) => setConvertApCode(e.target.value)}
                    placeholder="Ex: AP102450"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Ce numéro officiel identifie le client dans le système ERP / AX et active la gestion de son CA.
                  </p>
                </div>

                {/* Initial Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Statut initial du client
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConvertStatus("ACTIVE")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        convertStatus === "ACTIVE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                      }`}
                    >
                      <span>Client Actif Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConvertStatus("VIP")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        convertStatus === "VIP"
                          ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                          : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Client VIP / Clé</span>
                    </button>
                  </div>
                </div>

                {/* Initial Annual Target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Objectif CA annuel initial (€ HT)
                  </label>
                  <input
                    type="text"
                    value={convertTarget}
                    onChange={(e) => setConvertTarget(e.target.value)}
                    placeholder="Ex: 50000"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Automated Onboarding Tasks */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={convertCreateOnboardingTasks}
                      onChange={(e) => setConvertCreateOnboardingTasks(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 block">
                        Générer automatiquement les tâches d&apos;Onboarding
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Crée 3 tâches dans votre Kanban : Collecter RIB/Kbis, Vérifier accès SAS nuit, et Planifier 1ère visite.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertingProspect(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isConverting || !convertApCode.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isConverting ? "Conversion en cours..." : "Valider la conversion"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD NEW PROSPECT (NOUVEAU PROSPECT)
         ===================================================================== */}
      {isAddProspectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-700">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Ajouter un Nouveau Prospect
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProspectOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProspectSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Nom de l&apos;entreprise / Enseigne *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Ex: Garage du Centre Auto"
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Contact Principal
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="Ex: Marc Martin"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ex: 06 12 34 56 78"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ex: contact@garagecentre.fr"
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* Address with autocomplete */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Adresse postale complète
                </label>
                <AddressAutocomplete
                  value={newAddress}
                  onChange={setNewAddress}
                  onSelectAddress={(suggestion: AddressSuggestion) => {
                    setNewAddress(suggestion.street || suggestion.label);
                    setNewCity(suggestion.city);
                    setNewPostalCode(suggestion.postalCode);
                  }}
                  placeholder="Tapez le numéro et la rue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Ex: Lyon"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Code Postal
                  </label>
                  <input
                    type="text"
                    value={newPostalCode}
                    onChange={(e) => setNewPostalCode(e.target.value)}
                    placeholder="Ex: 69002"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Potentiel estimé (€)
                  </label>
                  <input
                    type="text"
                    value={newPotential}
                    onChange={(e) => setNewPotential(e.target.value)}
                    placeholder="Ex: 35000"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono font-bold text-purple-700 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Étape Initiale
                  </label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as ProspectStage)}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600"
                  >
                    {PROSPECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Note initiale / Contexte
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes sur les besoins, distributeur actuel, opportunités..."
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProspectOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddingProspect || !newCompany.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isAddingProspect ? "Création..." : "Enregistrer le Prospect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
