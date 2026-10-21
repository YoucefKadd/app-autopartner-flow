export type ClientStatus = "VIP" | "ACTIVE" | "PROSPECT" | "NEW" | "FOLLOW_UP" | "INACTIVE" | "ARCHIVED";

export type NoteCategory =
  | "LIBRE"
  | "VISITE"
  | "COMPTE_RENDU"
  | "RELANCE"
  | "STRATEGIE"
  | "SUIVI"
  | "ALERTE";

export type ClientVisitType =
  | "ROUTINE"
  | "COMMERCIALE"
  | "PROSPECTION"
  | "TECHNIQUE"
  | "LIVRAISON_SAS"
  | "LITIGE"
  | "AUTRE";

export type ClientVisitStatus = "EFFECTUEE" | "PLANIFIEE" | "ANNULEE";

export interface ClientVisit {
  id: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: ClientVisitType;
  interlocutor: string;
  summary: string;
  nextVisitDate?: string | null;
  status: ClientVisitStatus;
  createdAt: string;
  updatedAt?: string;
  kamId?: string;
  kam?: {
    id: string;
    name: string;
    email?: string;
  };
  client?: {
    id: string;
    company: string;
    contactName?: string;
    status?: string;
    city?: string;
  };
  notes?: NoteItem[];
}

export const CLIENT_VISIT_TYPES: Record<
  ClientVisitType,
  { label: string; badgeClass: string; icon: string }
> = {
  ROUTINE: {
    label: "Visite de routine / Suivi",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    icon: "Calendar",
  },
  COMMERCIALE: {
    label: "Rdv commercial / Remises",
    badgeClass: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
    icon: "TrendingUp",
  },
  PROSPECTION: {
    label: "Prospection terrain",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    icon: "Compass",
  },
  TECHNIQUE: {
    label: "Point technique & Sas",
    badgeClass: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
    icon: "Wrench",
  },
  LIVRAISON_SAS: {
    label: "Livraison & Sas de nuit",
    badgeClass: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20",
    icon: "Truck",
  },
  LITIGE: {
    label: "Traitement réclamation / Litige",
    badgeClass: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20",
    icon: "AlertTriangle",
  },
  AUTRE: {
    label: "Autre visite",
    badgeClass: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
    icon: "FileText",
  },
};

export interface KamUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "DIRECTEUR" | "MANAGER" | "KAM";
  title?: string | null;
  avatar?: string | null;
  status: "ACTIVE" | "DISABLED";
  permissions?: string | null;
  managerId?: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  kams?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  _count?: {
    clients: number;
    notes: number;
    kams?: number;
  };
}

export interface NoteItem {
  id: string;
  title: string | null;
  content: string;
  category: NoteCategory | string;
  pinned: boolean;
  clientId: string | null;
  visitId?: string | null;
  visit?: {
    id: string;
    date: string;
    type: string;
    status: string;
  } | null;
  client?: {
    id: string;
    company: string;
    contactName: string;
    status: string;
  } | null;
  kamId: string;
  kam?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClientItem {
  id: string;
  company: string;
  contactName: string;
  position: string;
  email: string;
  phone: string;
  city: string;
  postalCode?: string;
  apClientNumber?: string;
  logo?: string;
  logoUrl?: string;
  status: ClientStatus;
  healthScore: number;
  lastContactAt: string;
  kamId: string;
  kam?: {
    id: string;
    name: string;
    email: string;
  };
  notes?: NoteItem[];
  _count?: {
    notes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  VIP: {
    label: "VIP",
    badgeClass:
      "bg-amber-500/12 text-amber-800 border-amber-500/20 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/20",
    dotClass: "bg-amber-500",
  },
  ACTIVE: {
    label: "Active",
    badgeClass:
      "bg-emerald-500/12 text-emerald-800 border-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/20",
    dotClass: "bg-emerald-500",
  },
  PROSPECT: {
    label: "Prospect",
    badgeClass:
      "bg-purple-500/12 text-purple-700 border-purple-500/20 dark:bg-purple-400/15 dark:text-purple-300 dark:border-purple-400/20",
    dotClass: "bg-purple-500",
  },
  NEW: {
    label: "New",
    badgeClass:
      "bg-sky-500/12 text-sky-800 border-sky-500/20 dark:bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/20",
    dotClass: "bg-sky-500",
  },
  FOLLOW_UP: {
    label: "À relancer",
    badgeClass:
      "bg-orange-500/12 text-orange-800 border-orange-500/20 dark:bg-orange-400/15 dark:text-orange-300 dark:border-orange-400/20",
    dotClass: "bg-orange-500",
  },
  INACTIVE: {
    label: "Inactif",
    badgeClass:
      "bg-zinc-500/12 text-zinc-700 border-zinc-500/20 dark:bg-zinc-400/15 dark:text-zinc-300 dark:border-zinc-400/20",
    dotClass: "bg-zinc-400",
  },
  ARCHIVED: {
    label: "Archivé",
    badgeClass:
      "bg-slate-500/12 text-slate-700 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-300 dark:border-slate-400/20",
    dotClass: "bg-slate-500",
  },
};

export const NOTE_CATEGORIES: {
  value: NoteCategory;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "LIBRE",
    label: "Note libre",
    badgeClass:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  },
  {
    value: "VISITE",
    label: "Visite terrain",
    badgeClass:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-bold shadow-2xs ring-1 ring-emerald-500/20",
  },
  {
    value: "COMPTE_RENDU",
    label: "Compte-rendu",
    badgeClass:
      "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/20",
  },
  {
    value: "RELANCE",
    label: "Relance",
    badgeClass:
      "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/20",
  },
  {
    value: "STRATEGIE",
    label: "Stratégie",
    badgeClass:
      "bg-sky-500/10 text-sky-800 border-sky-500/20 dark:bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/20",
  },
  {
    value: "SUIVI",
    label: "Suivi client",
    badgeClass:
      "bg-violet-500/10 text-violet-800 border-violet-500/20 dark:bg-violet-400/15 dark:text-violet-300 dark:border-violet-400/20",
  },
  {
    value: "ALERTE",
    label: "Point d'attention",
    badgeClass:
      "bg-rose-500/10 text-rose-800 border-rose-500/20 dark:bg-rose-400/15 dark:text-rose-300 dark:border-rose-400/20",
  },
];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatFullTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} à ${timePart}`;
  } catch {
    return dateStr;
  }
}

export function hasPermission(
  user: KamUser | null | undefined,
  permissionId: string
): boolean {
  if (!user) return false;
  // SUPER_ADMIN and DIRECTEUR have universal access
  if (user.role === "SUPER_ADMIN" || user.role === "DIRECTEUR") return true;
  // If user has no permissions specified or empty
  if (!user.permissions) return false;
  const list = user.permissions.split(",").map((p) => p.trim());
  return list.includes(permissionId);
}

