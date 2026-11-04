export type ProspectStage =
  | "A_DEMARCHER"
  | "EN_ECHANGE"
  | "EN_TEST"
  | "PRET_CODE_AP"
  | "SANS_SUITE";

export interface ProspectStageConfig {
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
export const CORE_PROSPECT_STAGES: ProspectStageConfig[] = [
  {
    value: "A_DEMARCHER",
    label: "1. Prospect à qualifier",
    shortLabel: "1. À démarcher",
    subtitle: "Revendeur, jobber ou distributeur identifié sur le secteur",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotClass: "bg-blue-500",
    headerBorder: "border-blue-400",
    columnBg: "bg-blue-50/20 dark:bg-blue-950/15",
  },
  {
    value: "EN_ECHANGE",
    label: "2. Prise de contact & Échange",
    shortLabel: "2. Contact / Découverte",
    subtitle: "Rencontre gérant ou acheteur pièces, catalogue AP & conditions présentés",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
    headerBorder: "border-amber-400",
    columnBg: "bg-amber-50/20 dark:bg-amber-950/15",
  },
  {
    value: "EN_TEST",
    label: "3. En Test & Conditions tarifaires",
    shortLabel: "3. En Test / Remises",
    subtitle: "Test des cadences d'approvisionnement, devis pièces & comparaison remises",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotClass: "bg-purple-500",
    headerBorder: "border-purple-400",
    columnBg: "bg-purple-50/20 dark:bg-purple-950/15",
  },
  {
    value: "PRET_CODE_AP",
    label: "4. Prêt pour Ouverture Compte AP",
    shortLabel: "4. Prêt Code AP",
    subtitle: "Dossier Kbis/RIB complet, prêt pour attribution Code AP & ouverture de compte",
    badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-500",
    headerBorder: "border-emerald-500",
    columnBg: "bg-emerald-50/30 dark:bg-emerald-950/20",
  },
];

// Collapsible 5th Stage (Closed / On hold)
export const SANS_SUITE_STAGE: ProspectStageConfig = {
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
export const ALL_PROSPECT_STAGES = [...CORE_PROSPECT_STAGES, SANS_SUITE_STAGE];
export const PROSPECT_STAGES = ALL_PROSPECT_STAGES;

// Normalization function to ensure backwards compatibility with previous stage keys
export function normalizeProspectStage(raw?: string | null): ProspectStage {
  if (!raw) return "A_DEMARCHER";
  if (raw === "NOUVEAU" || raw === "A_DEMARCHER") return "A_DEMARCHER";
  if (raw === "CONTACTE" || raw === "EN_ECHANGE") return "EN_ECHANGE";
  if (raw === "PROPOSITION" || raw === "NEGOCIATION" || raw === "EN_TEST") return "EN_TEST";
  if (raw === "FINALISATION" || raw === "PRET_CODE_AP") return "PRET_CODE_AP";
  if (raw === "PERDU" || raw === "SANS_SUITE") return "SANS_SUITE";
  return "A_DEMARCHER";
}

// Target client types: Revendeurs de pièces détachées, Jobbers, Distributeurs boutique, etc.
export const PROSPECT_ACTIVITY_TYPES = [
  { value: "REVENDEUR_PIECES", label: "Revendeur Pièces Détachées", icon: "📦" },
  { value: "JOBBER", label: "Jobber Automobile", icon: "🚗" },
  { value: "BOUTIQUE_PIECES", label: "Distributeur Boutique de Pièces", icon: "🏬" },
  { value: "GARAGE_MRA", label: "Garage MRA (Mécanique)", icon: "🔧" },
  { value: "CENTRE_AUTO", label: "Centre Auto / Pneumatique", icon: "🛞" },
  { value: "CARROSSERIE", label: "Carrosserie & Peinture", icon: "🎨" },
  { value: "FLOTTE", label: "Flotte / Transporteur", icon: "🚚" },
];

export const MAIN_COMPETITORS = [
  "Alliance Automotive Group (Groupauto / Precisium)",
  "Autodistribution (AD)",
  "LKQ / Rhiag",
  "Doyen Auto (API)",
  "Flauraud",
  "Autre distributeur local",
];
