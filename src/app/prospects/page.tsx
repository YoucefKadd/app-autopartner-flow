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
  Car,
  Wrench,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { ClientItem, ClientStatus, formatRelativeDate } from "@/types/kam";
import { AddressAutocomplete, AddressSuggestion } from "@/components/AddressAutocomplete";
import { AddVisitModal } from "@/components/AddVisitModal";

/**
 * Trade-adapted pipeline stages for wholesale automotive spare parts distribution (Autopartner)
 * Replaces generic SaaS columns with the real commercial representative (KAM) sales cycle:
 * 1. À démarcher (Atelier identifié / Nouveau sur le secteur)
 * 2. 1ère Visite (Visite de découverte effectuée, catalogue AP & portail présentés)
 * 3. En Test (Essai tournées de livraison, devis pièces, conditions tarifaires)
 * 4. Prêt Code AP (Dossier administratif Kbis/RIB complet, prêt pour création compte AP)
 * 5. Sans suite (Optionnel / Masquable pour garder le Kanban épuré)
 */
export type ProspectStage =
  | "A_DEMARCHER"
  | "EN_ECHANGE"
  | "EN_TEST"
  | "PRET_CODE_AP"
  | "SANS_SUITE";

interface ProspectStageConfig {
  value: ProspectStage;
  label: string;
  shortLabel: string;
  subtitle: string;
  badgeClass: string;
  dotClass: string;
  headerBorder: string;
  columnBg: string;
}

// 4 Core Active Stages (Spacious 4-column layout)
const CORE_PROSPECT_STAGES: ProspectStageConfig[] = [
  {
    value: "A_DEMARCHER",
    label: "1. Atelier à démarcher",
    shortLabel: "1. À démarcher",
    subtitle: "Atelier identifié sur le secteur, potentiel à qualifier",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotClass: "bg-blue-500",
    headerBorder: "border-blue-400",
    columnBg: "bg-blue-50/20 dark:bg-blue-950/15",
  },
  {
    value: "EN_ECHANGE",
    label: "2. Visite & Découverte atelier",
    shortLabel: "2. Visité / En échange",
    subtitle: "Rencontre gérant ou chef d'atelier, catalogue AP présenté",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
    headerBorder: "border-amber-400",
    columnBg: "bg-amber-50/20 dark:bg-amber-950/15",
  },
  {
    value: "EN_TEST",
    label: "3. En Test & Conditions tarifaires",
    shortLabel: "3. En Test / Remises",
    subtitle: "Test des tournées livraison, devis pièces & comparaison remises",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotClass: "bg-purple-500",
    headerBorder: "border-purple-400",
    columnBg: "bg-purple-50/20 dark:bg-purple-950/15",
  },
  {
    value: "PRET_CODE_AP",
    label: "4. Prêt pour Ouverture Compte AP",
    shortLabel: "4. Prêt Code AP",
    subtitle: "Dossier Kbis/RIB complet, prêt pour attribution Code AP & Sas de nuit",
    badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-500",
    headerBorder: "border-emerald-500",
    columnBg: "bg-emerald-50/30 dark:bg-emerald-950/20",
  },
];

// Collapsible 5th Stage (Closed / On hold)
const SANS_SUITE_STAGE: ProspectStageConfig = {
  value: "SANS_SUITE",
  label: "Sans suite / En veille",
  shortLabel: "Sans suite",
  subtitle: "Non retenu, conditions non réunies ou en veille",
  badgeClass: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/25",
  dotClass: "bg-zinc-400",
  headerBorder: "border-zinc-400",
  columnBg: "bg-zinc-100/30 dark:bg-zinc-900/30",
};

// All stages combined for dropdowns and filters
const ALL_PROSPECT_STAGES = [...CORE_PROSPECT_STAGES, SANS_SUITE_STAGE];

// Normalization function to ensure backwards compatibility with previous stage keys
function normalizeProspectStage(raw?: string | null): ProspectStage {
  if (!raw) return "A_DEMARCHER";
  if (raw === "NOUVEAU" || raw === "A_DEMARCHER") return "A_DEMARCHER";
  if (raw === "CONTACTE" || raw === "EN_ECHANGE") return "EN_ECHANGE";
  if (raw === "PROPOSITION" || raw === "NEGOCIATION" || raw === "EN_TEST") return "EN_TEST";
  if (raw === "FINALISATION" || raw === "PRET_CODE_AP") return "PRET_CODE_AP";
  if (raw === "PERDU" || raw === "SANS_SUITE") return "SANS_SUITE";
  return "A_DEMARCHER";
}

// Automotive workshop types (Garages, carrosseries, etc.)
const WORKSHOP_ACTIVITY_TYPES = [
  { value: "GARAGE_MRA", label: "Garage MRA (Mécanique)", icon: "🔧" },
  { value: "CARROSSERIE", label: "Carrosserie & Peinture", icon: "🎨" },
  { value: "CENTRE_AUTO", label: "Centre Auto / Pneumatique", icon: "🛞" },
  { value: "CONCESSION", label: "Concession / Agent de Marque", icon: "🏢" },
  { value: "FLOTTE", label: "Flotte / Transporteur", icon: "🚚" },
  { value: "REVENDEUR", label: "Revendeur Pièces Détachées", icon: "📦" },
];

// Main competitors in automotive parts wholesale
const MAIN_COMPETITORS = [
  "Alliance Automotive Group (Groupauto / Precisium)",
  "Autodistribution (AD)",
  "LKQ / Rhiag",
  "Doyen Auto (API)",
  "Flauraud",
  "Autre distributeur local",
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
  const [showSansSuite, setShowSansSuite] = useState(false);

  // Track stages locally per prospect: clientId -> ProspectStage
  const [prospectStages, setProspectStages] = useState<Record<string, ProspectStage>>({});
  const [prospectPotentials, setProspectPotentials] = useState<Record<string, number>>({});
  const [prospectActivities, setProspectActivities] = useState<Record<string, string>>({});
  const [prospectSuppliers, setProspectSuppliers] = useState<Record<string, string>>({});

  // Drag and drop in Kanban
  const [draggedProspectId, setDraggedProspectId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProspectStage | null>(null);

  // Add Visit Modal State from Prospect Card
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [addVisitClientId, setAddVisitClientId] = useState<string | null>(null);

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
  const [newActivity, setNewActivity] = useState("GARAGE_MRA");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPotential, setNewPotential] = useState("30000");
  const [newStage, setNewStage] = useState<ProspectStage>("A_DEMARCHER");
  const [newSupplier, setNewSupplier] = useState(MAIN_COMPETITORS[0]);
  const [newSasAvailable, setNewSasAvailable] = useState("A_INSTALLER");
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
    const loadedActs: Record<string, string> = {};
    const loadedSups: Record<string, string> = {};

    clients.forEach((c) => {
      if (c.status === "PROSPECT") {
        const storedStage = localStorage.getItem(`apflow_prospect_stage_${c.id}`);
        loadedStages[c.id] = normalizeProspectStage(storedStage);

        const storedPot = localStorage.getItem(`apflow_prospect_pot_${c.id}`);
        if (storedPot) {
          const val = parseInt(storedPot, 10);
          if (!isNaN(val)) loadedPots[c.id] = val;
        } else {
          loadedPots[c.id] = 25000; // default estimated potential
        }

        const storedAct = localStorage.getItem(`apflow_prospect_activity_${c.id}`);
        if (storedAct) loadedActs[c.id] = storedAct;

        const storedSup = localStorage.getItem(`apflow_prospect_supplier_${c.id}`);
        if (storedSup) loadedSups[c.id] = storedSup;
      }
    });

    setProspectStages(loadedStages);
    setProspectPotentials(loadedPots);
    setProspectActivities(loadedActs);
    setProspectSuppliers(loadedSups);
  }, [clients]);

  // Filter only prospects
  const prospectClients = useMemo(() => {
    return clients.filter((c) => c.status === "PROSPECT");
  }, [clients]);

  // Filtered prospects list based on search and filters
  const filteredProspects = useMemo(() => {
    return prospectClients.filter((c) => {
      const stage = prospectStages[c.id] || "A_DEMARCHER";
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
    return prospectClients.filter((c) => (prospectStages[c.id] || "A_DEMARCHER") === "PRET_CODE_AP")
      .length;
  }, [prospectClients, prospectStages]);

  const activeInPipeCount = useMemo(() => {
    return prospectClients.filter(
      (c) => (prospectStages[c.id] || "A_DEMARCHER") !== "SANS_SUITE"
    ).length;
  }, [prospectClients, prospectStages]);

  const sansSuiteCount = useMemo(() => {
    return prospectClients.filter(
      (c) => (prospectStages[c.id] || "A_DEMARCHER") === "SANS_SUITE"
    ).length;
  }, [prospectClients, prospectStages]);

  // Visible stages in Kanban
  const visibleKanbanStages = useMemo(() => {
    return showSansSuite ? ALL_PROSPECT_STAGES : CORE_PROSPECT_STAGES;
  }, [showSansSuite]);

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

      // Also ensure deliveryBarcode is saved identical to Code AP
      try {
        const savedFiche = localStorage.getItem(`apflow_fiche_${convertingProspect.id}`);
        const parsed = savedFiche ? JSON.parse(savedFiche) : {};
        parsed.apClientNumber = convertApCode.trim();
        parsed.deliveryBarcode = convertApCode.trim();
        localStorage.setItem(`apflow_fiche_${convertingProspect.id}`, JSON.stringify(parsed));
      } catch {}

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
            title: `Installer affiche code-barres & clé SAS de nuit (${convertingProspect.company})`,
            category: "TECHNIQUE",
            priority: true,
          },
          {
            title: `Paramétrer tournée de livraison & seuils de franco (${convertingProspect.company})`,
            category: "LOGISTIQUE",
            priority: true,
          },
          {
            title: `Planifier 1ère commande d'approvisionnement stock (${convertingProspect.company})`,
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
          contactName: newContact.trim() || "Gérant Atelier",
          position: "Dirigeant / Responsable d'atelier",
          phone: newPhone.trim() || "NC",
          email: newEmail.trim() || "contact@atelier.fr",
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

      // Store trade metadata in localStorage
      if (created?.id) {
        const potNum = parseInt(newPotential.replace(/\D/g, ""), 10) || 25000;
        localStorage.setItem(`apflow_prospect_pot_${created.id}`, potNum.toString());
        localStorage.setItem(`apflow_prospect_stage_${created.id}`, newStage);
        localStorage.setItem(`apflow_prospect_activity_${created.id}`, newActivity);
        localStorage.setItem(`apflow_prospect_supplier_${created.id}`, newSupplier);
        localStorage.setItem(`apflow_prospect_sas_${created.id}`, newSasAvailable);

        setProspectPotentials((prev) => ({ ...prev, [created.id]: potNum }));
        setProspectStages((prev) => ({ ...prev, [created.id]: newStage }));
        setProspectActivities((prev) => ({ ...prev, [created.id]: newActivity }));
        setProspectSuppliers((prev) => ({ ...prev, [created.id]: newSupplier }));

        // Add initial note if provided
        if (newNotes.trim()) {
          try {
            await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `Prospection atelier : ${newCompany.trim()}`,
                content: `Type : ${newActivity} | Fournisseur actuel : ${newSupplier} | Sas de nuit : ${newSasAvailable}\n\n${newNotes.trim()}`,
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
      setNewActivity("GARAGE_MRA");
      setNewContact("");
      setNewPhone("");
      setNewEmail("");
      setNewCity("");
      setNewPostalCode("");
      setNewAddress("");
      setNewPotential("30000");
      setNewStage("A_DEMARCHER");
      setNewSupplier(MAIN_COMPETITORS[0]);
      setNewSasAvailable("A_INSTALLER");
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
                Cycle commercial adapté au métier de la pièce auto : qualification atelier, test des tournées et attribution Code Client AP.
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
            Ateliers actifs dans le cycle de prospection
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-purple-200/70 dark:border-purple-900/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Potentiel CA Pièces Estimé
          </span>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {formatEuro(totalPotential)}
          </div>
          <div className="text-[11px] text-slate-400">
            CA annuel prévisionnel si convertis
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            Prêts pour Code AP
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {readyToSignCount}
          </div>
          <div className="text-[11px] text-slate-400">
            En phase d'ouverture de compte client
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Portefeuille Actif
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
            {clients.filter((c) => c.status !== "PROSPECT" && c.status !== "ARCHIVED").length}
          </div>
          <div className="text-[11px] text-slate-400">
            Garages &amp; clients avec Code AP actif
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filters Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par enseigne atelier, contact, ville..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 transition"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">Toutes les étapes du pipeline</option>
            {ALL_PROSPECT_STAGES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">Toutes les villes ({cities.length})</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Toggle Collapsible Sans Suite Column */}
          {viewMode === "kanban" && (
            <button
              type="button"
              onClick={() => setShowSansSuite(!showSansSuite)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showSansSuite
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                  : "bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-700"
              }`}
              title="Afficher ou masquer la colonne des prospects classés sans suite"
            >
              {showSansSuite ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Sans suite ({sansSuiteCount})</span>
            </button>
          )}
        </div>

        {/* Global Conversion Helper Hint */}
        <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bouton « Convertir en Client AP » direct</span>
        </div>
      </div>

      {/* =====================================================================
          VIEW 1: COMMERCIAL PIPELINE KANBAN (SIMPLIFIÉ & ADAPTÉ MÉTIER)
         ===================================================================== */}
      {viewMode === "kanban" && (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${
            showSansSuite ? "lg:grid-cols-5" : "lg:grid-cols-4"
          } gap-4 items-start`}
        >
          {visibleKanbanStages.map((col) => {
            const colProspects = filteredProspects.filter(
              (p) => (prospectStages[p.id] || "A_DEMARCHER") === col.value
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
                className={`rounded-2xl border-2 transition-all p-3.5 space-y-3.5 min-h-[500px] ${
                  col.columnBg
                } ${
                  isOver
                    ? "border-purple-500 ring-2 ring-purple-500/20 shadow-md"
                    : "border-slate-200/90 dark:border-zinc-800"
                }`}
              >
                {/* Column Header */}
                <div className="px-1 pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${col.dotClass}`} />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100 truncate">
                        {col.shortLabel}
                      </h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                      {colProspects.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {col.subtitle}
                  </p>
                  {colTotalPotential > 0 && (
                    <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-300 mt-1 bg-white/70 dark:bg-zinc-900/70 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-zinc-800 w-fit">
                      Potentiel : {formatEuro(colTotalPotential)}
                    </div>
                  )}
                </div>

                {/* Cards List */}
                <div className="space-y-3.5">
                  {colProspects.length === 0 ? (
                    <div className="text-center py-10 px-2 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 text-xs">
                      Aucun prospect dans cette étape
                    </div>
                  ) : (
                    colProspects.map((prospect) => {
                      const potential = prospectPotentials[prospect.id] || 25000;
                      const isEditingPot = editingPotentialId === prospect.id;
                      const actCode = prospectActivities[prospect.id] || "GARAGE_MRA";
                      const actCfg =
                        WORKSHOP_ACTIVITY_TYPES.find((a) => a.value === actCode) ||
                        WORKSHOP_ACTIVITY_TYPES[0];
                      const supplier = prospectSuppliers[prospect.id];

                      return (
                        <div
                          key={prospect.id}
                          draggable
                          onDragStart={() => setDraggedProspectId(prospect.id)}
                          onDragEnd={() => {
                            setDraggedProspectId(null);
                            setDragOverColumn(null);
                          }}
                          className="group rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-purple-400 p-3.5 shadow-2xs hover:shadow-md transition-all space-y-3"
                        >
                          {/* Workshop Name & Trade Badge */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                                {prospect.company}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800 shrink-0">
                                {actCfg.icon} {actCfg.label.split(" ")[0]}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-[#d90416] shrink-0" />
                              <span className="truncate font-medium">
                                {prospect.postalCode ? `${prospect.postalCode} ` : ""}
                                {prospect.city}
                              </span>
                            </div>
                          </div>

                          {/* Contact Person & Trade info */}
                          <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-1 bg-slate-50/70 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                            {prospect.contactName && (
                              <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                                <span className="truncate">👤 {prospect.contactName}</span>
                                {supplier && (
                                  <span className="text-[10px] text-slate-400 font-normal truncate max-w-[110px]" title={`Fournisseur actuel : ${supplier}`}>
                                    {supplier.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Action shortcuts: Call, Email, GPS, Visit, Note */}
                            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-zinc-800/80">
                              {prospect.phone && prospect.phone !== "NC" && (
                                <a
                                  href={`tel:${prospect.phone}`}
                                  title={`Appeler ${prospect.phone}`}
                                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 transition"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                              {prospect.email && (
                                <a
                                  href={`mailto:${prospect.email}`}
                                  title={`Envoyer un email à ${prospect.email}`}
                                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-blue-600 transition"
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
                                title="Itinéraire GPS direct vers l'atelier"
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-[#d90416] transition"
                              >
                                <Compass className="w-3 h-3" />
                              </a>
                              <button
                                type="button"
                                onClick={() => openQuickNote({ clientId: prospect.id })}
                                title="Ajouter une note de contact / compte-rendu"
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-purple-600 transition"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddVisitClientId(prospect.id);
                                  setIsAddVisitModalOpen(true);
                                }}
                                title="Consigner ou planifier une visite terrain pour ce prospect"
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-red-600 transition flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Car className="w-3 h-3 text-[#d90416]" />
                                <span className="hidden sm:inline">Visite</span>
                              </button>
                            </div>
                          </div>

                          {/* Potential CA row */}
                          <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-zinc-950/70 border border-purple-100 dark:border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Potentiel Annuel :
                            </span>
                            {isEditingPot ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingPotentialVal}
                                  onChange={(e) => setEditingPotentialVal(e.target.value)}
                                  className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold rounded border border-purple-500 bg-white dark:bg-zinc-900"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const n = parseInt(editingPotentialVal.replace(/\D/g, ""), 10) || 0;
                                    handleSavePotential(prospect.id, n);
                                  }}
                                  className="p-1 text-emerald-600"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPotentialId(prospect.id);
                                  setEditingPotentialVal(potential.toString());
                                }}
                                className="text-xs font-mono font-black text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                                title="Cliquer pour modifier le potentiel"
                              >
                                <span>{formatEuro(potential)}</span>
                                <Pencil className="w-3 h-3 opacity-60" />
                              </button>
                            )}
                          </div>

                          {/* Stage Dropdown + Prominent Convert Button */}
                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                Étape :
                              </span>
                              <select
                                value={col.value}
                                onChange={(e) =>
                                  handleMoveStage(prospect.id, e.target.value as ProspectStage)
                                }
                                className="text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 py-1 px-2 text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer flex-1 max-w-[190px]"
                              >
                                {ALL_PROSPECT_STAGES.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    → {s.shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* PROMINENT CONVERT TO CLIENT BUTTON */}
                            <button
                              type="button"
                              onClick={() => openConversionModal(prospect)}
                              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                              title="Transformer ce prospect en client actif avec Code AP et code-barres livraison"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Convertir en Client AP</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          VIEW 2: COMMERCIAL TABLE VIEW (TABLEAU DÉTAILLÉ)
         ===================================================================== */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-950/70 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Atelier &amp; Enseigne</th>
                  <th className="py-3 px-4">Activité</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Ville</th>
                  <th className="py-3 px-4">Étape Pipeline</th>
                  <th className="py-3 px-4">Potentiel Estimé</th>
                  <th className="py-3 px-4">Fournisseur Actuel</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Aucun prospect ne correspond aux critères
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => {
                    const currentStage = prospectStages[prospect.id] || "A_DEMARCHER";
                    const stageCfg =
                      ALL_PROSPECT_STAGES.find((s) => s.value === currentStage) ||
                      ALL_PROSPECT_STAGES[0];
                    const potential = prospectPotentials[prospect.id] || 25000;
                    const actCode = prospectActivities[prospect.id] || "GARAGE_MRA";
                    const actCfg =
                      WORKSHOP_ACTIVITY_TYPES.find((a) => a.value === actCode) ||
                      WORKSHOP_ACTIVITY_TYPES[0];
                    const supplier = prospectSuppliers[prospect.id] || "Non renseigné";

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

                        {/* Activity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                            {actCfg.icon} {actCfg.label.split(" ")[0]}
                          </span>
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
                            {ALL_PROSPECT_STAGES.map((s) => (
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

                        {/* Competitor */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {supplier.split(" ")[0]}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAddVisitClientId(prospect.id);
                                setIsAddVisitModalOpen(true);
                              }}
                              title="Consigner une visite"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100"
                            >
                              <Car className="w-3.5 h-3.5" />
                            </button>
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
                              onClick={() => openConversionModal(prospect)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Convertir</span>
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
                    Code Client AP officiel (obligatoire) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={convertApCode}
                    onChange={(e) => setConvertApCode(e.target.value)}
                    placeholder="Ex: 3306140"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Ce numéro sera immédiatement synchronisé avec le code-barres de livraison pour le sas de nuit du client.
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
                      <span>Compte Stratégique VIP</span>
                    </button>
                  </div>
                </div>

                {/* Annual Target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Objectif CA annuel (€)
                  </label>
                  <input
                    type="text"
                    value={convertTarget}
                    onChange={(e) => setConvertTarget(e.target.value)}
                    placeholder="Ex: 60000"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Onboarding Checklist Tasks */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={convertCreateOnboardingTasks}
                      onChange={(e) => setConvertCreateOnboardingTasks(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Générer les tâches d'Onboarding dans le Kanban
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-5">
                    Créera automatiquement les tâches : Collecte Kbis/RIB, installation affiche code-barres SAS et paramétrage tournée de livraison.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConvertingProspect(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isConverting || !convertApCode.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isConverting ? (
                      <span>Activation en cours...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Confirmer &amp; Activer le Client</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD NEW PROSPECT (NOUVEAU PROSPECT ATELIER)
         ===================================================================== */}
      {isAddProspectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Nouveau Prospect Atelier
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enregistrez un garage ou revendeur à qualifier sur votre secteur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProspectOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProspectSubmit} className="space-y-3.5 text-xs">
              {/* Company & Activity Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Enseigne / Nom Atelier *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Ex: Garage MRA du Midi"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Activité Atelier
                  </label>
                  <select
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
                  >
                    {WORKSHOP_ACTIVITY_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.icon} {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Contact (Gérant / Chef d'atelier)
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="Ex: M. Dupont"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ex: 05 61 00 00 00"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
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
                    placeholder="Ex: Muret"
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
                    placeholder="Ex: 31600"
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Potential & Stage */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Potentiel annuel estimé (€)
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
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
                  >
                    {ALL_PROSPECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Competitor & Sas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Fournisseur Principal Actuel
                  </label>
                  <select
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
                  >
                    {MAIN_COMPETITORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Accès Sas de nuit
                  </label>
                  <select
                    value={newSasAvailable}
                    onChange={(e) => setNewSasAvailable(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-purple-600"
                  >
                    <option value="DISPONIBLE">Sas disponible</option>
                    <option value="A_INSTALLER">Sas à installer / convenir</option>
                    <option value="NON">Livraison de jour uniquement</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">
                  Notes de découverte
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Besoins récurrents en pièces, cadences de commande, opportunités..."
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-zinc-800">
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

      {/* Add Visit Modal when triggered from a prospect card */}
      {isAddVisitModalOpen && activeUser && (
        <AddVisitModal
          isOpen={isAddVisitModalOpen}
          onClose={() => {
            setIsAddVisitModalOpen(false);
            setAddVisitClientId(null);
          }}
          clients={clients}
          activeKamId={activeUser.id}
          onSaved={() => {
            setIsAddVisitModalOpen(false);
            setAddVisitClientId(null);
            refreshWorkspace();
          }}
          defaultClientId={addVisitClientId || undefined}
        />
      )}
    </div>
  );
}
