import { ClientItem, ClientVisit, ClientVisitType, NoteItem } from "@/types/kam";
export type { ClientVisit, ClientVisitType };

export const DEFAULT_REVISIT_INTERVAL_DAYS = 30;

export const REVISIT_INTERVAL_OPTIONS = [
  { value: 0, label: "Désactivé (Aucune re-visite automatique)" },
  { value: 15, label: "Tous les 15 jours (Haute fréquence)" },
  { value: 30, label: "Tous les 30 jours (Mensuel — Standard)" },
  { value: 45, label: "Tous les 45 jours (6 semaines)" },
  { value: 60, label: "Tous les 60 jours (Bimestriel)" },
  { value: 90, label: "Tous les 90 jours (Trimestriel)" },
];

/**
 * Récupère le délai de re-visite paramétré pour un client donné (en jours)
 */
export function getClientRevisitInterval(clientId: string): number {
  if (typeof window === "undefined") return DEFAULT_REVISIT_INTERVAL_DAYS;
  const stored = localStorage.getItem(`apflow_revisit_interval_${clientId}`);
  if (stored !== null && stored !== "") {
    const val = parseInt(stored, 10);
    if (!isNaN(val) && val >= 0) return val;
  }
  // Check global default override if any
  const globalDefault = localStorage.getItem("apflow_global_revisit_interval");
  if (globalDefault !== null && globalDefault !== "") {
    const val = parseInt(globalDefault, 10);
    if (!isNaN(val) && val >= 0) return val;
  }
  return DEFAULT_REVISIT_INTERVAL_DAYS;
}

/**
 * Paramètre le délai de re-visite pour un client (en jours)
 */
export function setClientRevisitInterval(clientId: string, days: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`apflow_revisit_interval_${clientId}`, days.toString());
  window.dispatchEvent(
    new CustomEvent("apflow_visits_updated", { detail: { clientId } })
  );
}

/**
 * Récupère les visites d'un client.
 * Combine les visites enregistrées spécifiquement et les notes de type "VISITE".
 */
export function getClientVisits(
  clientId: string,
  clientNotes?: NoteItem[]
): ClientVisit[] {
  if (typeof window === "undefined") return [];

  let visits: ClientVisit[] = [];
  try {
    const stored = localStorage.getItem(`apflow_visits_${clientId}`);
    if (stored) {
      visits = JSON.parse(stored);
    }
  } catch (err) {
    console.error("Error reading client visits:", err);
  }

  // Si des notes de catégorie "VISITE" existent dans l'historique et ne sont pas déjà incluses
  if (clientNotes && clientNotes.length > 0) {
    const existingDates = new Set(visits.map((v) => v.date.slice(0, 10)));
    clientNotes
      .filter((n) => n.category === "VISITE")
      .forEach((note) => {
        const noteDate = note.createdAt.slice(0, 10);
        if (!existingDates.has(noteDate)) {
          visits.push({
            id: `note_visit_${note.id}`,
            clientId,
            date: noteDate,
            type: "ROUTINE",
            interlocutor: note.client?.contactName || "Contact magasin",
            summary: note.content,
            status: "EFFECTUEE",
            createdAt: note.createdAt,
          });
        }
      });
  }

  // Tri par date décroissante
  return visits.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Enregistre une nouvelle visite client ou met à jour une visite existante
 */
export function saveClientVisit(
  visit: Omit<ClientVisit, "id" | "createdAt"> & { id?: string }
): ClientVisit {
  if (typeof window === "undefined") {
    return {
      ...visit,
      id: visit.id || `v_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }

  const clientId = visit.clientId;
  const current = getClientVisits(clientId);
  let saved: ClientVisit;

  if (visit.id) {
    saved = {
      ...visit,
      id: visit.id,
      createdAt: new Date().toISOString(),
    };
    const next = current.map((v) => (v.id === visit.id ? saved : v));
    localStorage.setItem(`apflow_visits_${clientId}`, JSON.stringify(next));
  } else {
    saved = {
      ...visit,
      id: `visit_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [saved, ...current];
    localStorage.setItem(`apflow_visits_${clientId}`, JSON.stringify(next));
  }

  window.dispatchEvent(
    new CustomEvent("apflow_visits_updated", { detail: { clientId } })
  );
  return saved;
}

/**
 * Supprime une visite client
 */
export function deleteClientVisit(clientId: string, visitId: string): void {
  if (typeof window === "undefined") return;
  const current = getClientVisits(clientId);
  const next = current.filter((v) => v.id !== visitId);
  localStorage.setItem(`apflow_visits_${clientId}`, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("apflow_visits_updated", { detail: { clientId } })
  );
}

export type VisitUrgency = "OK" | "SOON" | "OVERDUE" | "NEVER" | "DISABLED";

export interface ClientVisitStatusSummary {
  lastVisit: ClientVisit | null;
  lastVisitDate: Date | null;
  daysSinceLastVisit: number | null;
  revisitIntervalDays: number;
  isOverdue: boolean;
  daysOverdue: number;
  urgency: VisitUrgency;
  nextPlannedVisit: ClientVisit | null;
}

/**
 * Calcule l'état de re-visite d'un client :
 * - Date de dernière visite effectuée
 * - Jours écoulés
 * - Retard par rapport au rythme fixé (ex: 30 jours)
 * - Prochaine visite planifiée
 */
export function getClientVisitStatus(
  client: ClientItem,
  preloadedVisits?: ClientVisit[]
): ClientVisitStatusSummary {
  const visits = preloadedVisits ?? getClientVisits(client.id, client.notes);
  const intervalDays = getClientRevisitInterval(client.id);

  // Visites effectuées
  const completedVisits = visits.filter((v) => v.status === "EFFECTUEE");
  // Visites planifiées futures
  const plannedVisits = visits.filter(
    (v) => v.status === "PLANIFIEE" && new Date(v.date) >= new Date()
  );

  const nextPlannedVisit =
    plannedVisits.length > 0
      ? plannedVisits.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0]
      : null;

  // Si le rythme est désactivé
  if (intervalDays === 0) {
    const latest = completedVisits[0] || null;
    let fallbackDate: Date | null = latest ? new Date(latest.date) : null;
    if (!fallbackDate) {
      const noteVisit = client.notes?.find((n) => n.category === "VISITE");
      if (noteVisit) fallbackDate = new Date(noteVisit.createdAt);
    }
    const daysSince = fallbackDate
      ? Math.max(
          0,
          Math.floor(
            (new Date().getTime() - fallbackDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

    return {
      lastVisit: latest,
      lastVisitDate: fallbackDate,
      daysSinceLastVisit: daysSince,
      revisitIntervalDays: 0,
      isOverdue: false,
      daysOverdue: 0,
      urgency: "DISABLED",
      nextPlannedVisit,
    };
  }

  if (completedVisits.length === 0) {
    // Si aucune visite formelle enregistrée, vérifie si une date de contact ou note existe
    const noteVisit = client.notes?.find((n) => n.category === "VISITE");
    let fallbackDate: Date | null = null;
    if (noteVisit) {
      fallbackDate = new Date(noteVisit.createdAt);
    }

    if (!fallbackDate) {
      return {
        lastVisit: null,
        lastVisitDate: null,
        daysSinceLastVisit: null,
        revisitIntervalDays: intervalDays,
        isOverdue: true,
        daysOverdue: 0,
        urgency: "NEVER",
        nextPlannedVisit,
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - fallbackDate.getTime();
    const daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const isOverdue = daysSince > intervalDays;
    const daysOverdue = Math.max(0, daysSince - intervalDays);

    let urgency: VisitUrgency = "OK";
    if (isOverdue) urgency = "OVERDUE";
    else if (daysSince >= intervalDays - 7) urgency = "SOON";

    return {
      lastVisit: null,
      lastVisitDate: fallbackDate,
      daysSinceLastVisit: daysSince,
      revisitIntervalDays: intervalDays,
      isOverdue,
      daysOverdue,
      urgency,
      nextPlannedVisit,
    };
  }

  const latestVisit = completedVisits[0];
  const lastDate = new Date(latestVisit.date);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isOverdue = daysSince > intervalDays;
  const daysOverdue = Math.max(0, daysSince - intervalDays);

  let urgency: VisitUrgency = "OK";
  if (isOverdue) urgency = "OVERDUE";
  else if (daysSince >= intervalDays - 7) urgency = "SOON";

  return {
    lastVisit: latestVisit,
    lastVisitDate: lastDate,
    daysSinceLastVisit: daysSince,
    revisitIntervalDays: intervalDays,
    isOverdue,
    daysOverdue,
    urgency,
    nextPlannedVisit,
  };
}

/**
 * Récupère toutes les visites de l'ensemble du portefeuille clients
 */
export function getAllPortfolioVisits(
  clients: ClientItem[]
): (ClientVisit & { client: ClientItem })[] {
  if (typeof window === "undefined" || !clients) return [];
  const all: (ClientVisit & { client: ClientItem })[] = [];
  for (const client of clients) {
    const visits = getClientVisits(client.id, client.notes);
    for (const v of visits) {
      all.push({ ...v, client });
    }
  }
  return all.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

