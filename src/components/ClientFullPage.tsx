"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  PanelRightClose,
  AppWindow,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Pin,
  FileText,
  Building2,
  UserCheck,
  Tag,
  Activity,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Truck,
  Sparkles,
  Camera,
  KeyRound,
  QrCode,
  Upload,
  Check,
  FileCheck2,
  ShieldCheck,
  Printer,
  Copy,
  Send,
  UserPlus,
  X,
  Save,
  Star,
  Store,
  Navigation,
  ExternalLink,
  Download,
  Maximize2,
  Loader2,
  Eye,
  ImageIcon,
  Clock,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import {
  ClientItem,
  ClientStatus,
  CLIENT_STATUS_CONFIG,
  NOTE_CATEGORIES,
  NoteCategory,
  NoteItem,
  formatRelativeDate,
  formatFullTimestamp,
  getInitials,
  CLIENT_VISIT_TYPES,
  hasPermission,
} from "@/types/kam";
import { useWorkspace } from "@/components/AppShell";
import { NoteFormattingToolbar, FormattedNoteText } from "@/components/NoteFormatter";
import { AddVisitModal } from "@/components/AddVisitModal";
import { CalendarView } from "@/components/CalendarView";
import { VisitsNotesTableView } from "@/components/VisitsNotesTableView";
import { ClientCaSection } from "@/components/ClientCaSection";
import { AddressAutocomplete, AddressSuggestion } from "@/components/AddressAutocomplete";
import {
  getClientVisitStatus,
  getClientVisits,
  getClientRevisitInterval,
  setClientRevisitInterval,
  deleteClientVisit,
  REVISIT_INTERVAL_OPTIONS,
  ClientVisit,
  ClientVisitType,
} from "@/lib/visits";

interface ClientFullPageProps {
  client: ClientItem;
  activeKamId: string;
  onBack: () => void;
  onEditClient: (client: ClientItem) => void;
  onDeleteClient: (clientId: string) => void;
  onChangeStatus: (clientId: string, status: ClientStatus) => void;
  onEditNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePinNote: (note: NoteItem) => void;
  onRefresh: () => void;
}

type MainTab = "overview" | "fiche" | "visites" | "ca" | "onboarding" | "notes";
type FicheSubTab = "general" | "contacts" | "admin" | "compte_ap" | "logistique";

export interface ContactPerson {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

export interface CustomAddress {
  id: string;
  type: "LIVRAISON" | "SIEGE" | "AUTRE";
  label: string;
  street: string;
  postalCode?: string;
  city?: string;
  zipCity: string;
  complement?: string;
  coordinates?: [number, number];
  isPrimary?: boolean;
}

export interface CustomEmailPhone {
  id: string;
  type: string;
  label: string;
  email: string;
  phone: string;
}

export interface DeliveryPhoto {
  id: string;
  label: string;
  category: "SAS" | "ACCES_CAMIONNETTE" | "CLE_DIGICODE" | "EMPLACEMENT_COLIS";
  url: string;
  note: string;
  createdAt: string;
  sizeKb?: number;
  originalSizeKb?: number;
  format?: string;
}

interface OnboardingStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  phase:
    | "1. Visite & Collecte Terrain"
    | "2. Retour Documents Client"
    | "3. Traitement Interne AP & Transport"
    | "4. Activation Finale";
  completed: boolean;
  completedAt?: string | null;
}

const AP_ONBOARDING_WORKFLOW: OnboardingStep[] = [
  {
    id: "visite_client",
    stepNumber: 1,
    title: "Visite du client sur site (Magasin / Dépôt)",
    description:
      "Rencontre avec le gérant ou responsable achats, découverte du point de vente et évaluation du potentiel pièces.",
    phase: "1. Visite & Collecte Terrain",
    completed: true,
  },
  {
    id: "envoi_mail_fiche_tech",
    stepNumber: 2,
    title:
      "Envoi du mail récapitulatif (Infos commerciales & admin + Fiche Technique à remplir)",
    description:
      "Transmission des conditions commerciales, infos administratives et de la Fiche Technique d'ouverture de compte.",
    phase: "1. Visite & Collecte Terrain",
    completed: true,
  },
  {
    id: "photos_logistique_sas",
    stepNumber: 3,
    title:
      "Prise des photos logistiques de livraison (Sas, accès camionnette, clé ou digicode)",
    description:
      "Reportage photo complet sur place : sas de livraison nuit/jour, accès camionnette, boîte à clés / code d'accès.",
    phase: "1. Visite & Collecte Terrain",
    completed: true,
  },
  {
    id: "reception_fiche_technique",
    stepNumber: 4,
    title: "Réception de la Fiche Technique remplie et signée par le client",
    description:
      "Vérification que toutes les informations magasin, horaires et signataire sont complètes.",
    phase: "2. Retour Documents Client",
    completed: true,
  },
  {
    id: "reception_kbis",
    stepNumber: 5,
    title: "Réception de l'extrait Kbis (- de 3 mois)",
    description:
      "Contrôle du SIREN/SIRET et de l'inscription au Registre du Commerce et des Sociétés (RCS).",
    phase: "2. Retour Documents Client",
    completed: true,
  },
  {
    id: "reception_rib",
    stepNumber: 6,
    title: "Réception du RIB (IBAN / BIC) du client",
    description:
      "Validation des coordonnées bancaires complètes pour la mise en place des prélèvements / LCR.",
    phase: "2. Retour Documents Client",
    completed: false,
  },
  {
    id: "envoi_service_client",
    stepNumber: 7,
    title:
      "Envoi du dossier complet au Service Client AP (Fiche Technique + Kbis + RIB)",
    description:
      "Transmission du dossier complet au service administration des ventes Auto Partner.",
    phase: "3. Traitement Interne AP & Transport",
    completed: false,
  },
  {
    id: "envoi_photos_transport",
    stepNumber: 8,
    title:
      "Envoi des photos et consignes d'accès au Service Transport & Livraison",
    description:
      "Demande d'intégration du client sur la tournée / route de livraison avec photos du sas et codes/clés.",
    phase: "3. Traitement Interne AP & Transport",
    completed: false,
  },
  {
    id: "reception_numero_codes_ap",
    stepNumber: 9,
    title: "Réception du Numéro Client AP et de ses codes d'accès Webshop",
    description:
      "Attribution de l'identifiant client Auto Partner et des accès catalogue en ligne / TecDoc.",
    phase: "4. Activation Finale",
    completed: false,
  },
  {
    id: "confirmation_code_barre_livraison",
    stepNumber: 10,
    title:
      "Réception confirmation Transport & Code-barres de livraison",
    description:
      "Validation de la tournée de livraison par le transporteur et génération du code-barres de scan sas.",
    phase: "4. Activation Finale",
    completed: false,
  },
  {
    id: "envoi_mail_onboarding_client",
    stepNumber: 11,
    title:
      "Envoi du mail d'onboarding au client avec son compte AP & le code-barres à imprimer",
    description:
      "Envoi officiel au client de ses identifiants Webshop, numéro client AP, consignes de première commande et code-barres à imprimer pour affichage au sas.",
    phase: "4. Activation Finale",
    completed: false,
  },
];

function createSvgPlaceholder(title: string, subtitle: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#181b22"/>
    <rect x="24" y="24" width="552" height="352" rx="16" fill="#222631" stroke="${accent}" stroke-width="2" stroke-dasharray="6 6"/>
    <circle cx="300" cy="155" r="38" fill="${accent}" fill-opacity="0.18"/>
    <path d="M286 155h28M300 141v28" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
    <text x="300" y="235" text-anchor="middle" fill="#f8fafc" font-family="Inter, sans-serif" font-size="20" font-weight="700">${title}</text>
    <text x="300" y="268" text-anchor="middle" fill="#94a3b8" font-family="Inter, sans-serif" font-size="14">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_DELIVERY_PHOTOS: DeliveryPhoto[] = [
  {
    id: "photo_sas",
    label: "Sas de livraison nuit / jour",
    category: "SAS",
    url: createSvgPlaceholder(
      "SAS DE LIVRAISON",
      "Porte latérale droite côté cour — Rideau métallique",
      "#d90416"
    ),
    note: "Déposer les bacs et colis derrière la ligne jaune à gauche en entrant.",
    createdAt: "Visite terrain",
  },
  {
    id: "photo_camionnette",
    label: "Accès Camionnette & Stationnement",
    category: "ACCES_CAMIONNETTE",
    url: createSvgPlaceholder(
      "ACCÈS CAMIONNETTE 3.5T",
      "Entrée par le portail principal (Hauteur max 3m20)",
      "#0ea5e9"
    ),
    note: "Marche arrière conseillée dans la cour pour déchargement direct au sas.",
    createdAt: "Visite terrain",
  },
  {
    id: "photo_cle_code",
    label: "Boîte à clés / Digicode Sas",
    category: "CLE_DIGICODE",
    url: createSvgPlaceholder(
      "DIGICODE & BOÎTE À CLÉS",
      "Boîtier sécurisé à gauche du rideau métallique",
      "#10b981"
    ),
    note: "Clé du sas dans le coffre sécurisé + interrupteur alarme à droite.",
    createdAt: "Visite terrain",
    sizeKb: 145,
    originalSizeKb: 1850,
    format: "JPG",
  },
];

interface CompressedImageResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

function processAndCompressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.78
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Redimensionnement proportionnel si supérieur à maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Impossible d'initialiser le contexte canvas"));
          return;
        }

        // Fond blanc en cas de transparence PNG/WebP pour garantir un JPG propre
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Dessin de l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Conversion forcée en format JPEG avec compression
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          originalSizeKb,
          compressedSizeKb,
          width,
          height,
        });
      };

      img.onerror = () => reject(new Error("Échec du décodage de l'image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Échec de la lecture du fichier"));
    reader.readAsDataURL(file);
  });
}

export function ClientFullPage({
  client,
  activeKamId,
  onBack,
  onEditClient,
  onDeleteClient,
  onChangeStatus,
  onEditNote,
  onDeleteNote,
  onTogglePinNote,
  onRefresh,
}: ClientFullPageProps) {
  const { loggedUser, openQuickNote } = useWorkspace();
  const [noteViewMode, setNoteViewMode] = useState<"grid" | "list">("grid");
  const canViewCa = loggedUser ? hasPermission(loggedUser, "view_ca") : true;
  const canViewVisits = loggedUser ? hasPermission(loggedUser, "add_visits") : true;

  // 1st tab = Vue d'ensemble
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [ficheSubTab, setFicheSubTab] = useState<FicheSubTab>("general");
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  // Section edit states (Clean view-mode by default, pencil toggles edit mode)
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalFormData, setGeneralFormData] = useState({
    company: client.company,
    status: client.status,
    healthScore: client.healthScore,
    lastContactAt: client.lastContactAt
      ? new Date(client.lastContactAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  });

  // Unified single-source-of-truth states for contact & address selection in general tab
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [contactForm, setContactForm] = useState({
    name: client.contactName,
    role: client.position,
    email: client.email,
    phone: client.phone,
  });
  const [addressForm, setAddressForm] = useState({
    street: "",
    postalCode: "",
    city: client.city,
    complement: "",
    coordinates: undefined as [number, number] | undefined,
  });
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [isEditingCompteAP, setIsEditingCompteAP] = useState(false);
  const [isEditingLogistique, setIsEditingLogistique] = useState(false);

  // Modal / Row edit states for tables
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  // Note composer state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] =
    useState<NoteCategory>("COMPTE_RENDU");
  const [notePinned, setNotePinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Onboarding workflow
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(
    AP_ONBOARDING_WORKFLOW
  );

  // Delivery photos
  const [deliveryPhotos, setDeliveryPhotos] = useState<DeliveryPhoto[]>(
    DEFAULT_DELIVERY_PHOTOS
  );
  const [newPhotoLabel, setNewPhotoLabel] = useState("");
  const [newPhotoCategory, setNewPhotoCategory] =
    useState<DeliveryPhoto["category"]>("SAS");
  const [newPhotoNote, setNewPhotoNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Photo compression & Lightbox modal states
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [compressionStatusMsg, setCompressionStatusMsg] = useState<string | null>(null);
  const [compressionSuccessMsg, setCompressionSuccessMsg] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<DeliveryPhoto | null>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Visit tracking & Revisit interval state
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [clientRevisitInterval, setLocalRevisitInterval] = useState<number>(30);
  const [clientVisits, setClientVisits] = useState<ClientVisit[]>([]);
  const [clientVisitFilterStatus, setClientVisitFilterStatus] = useState<"ALL" | "EFFECTUEE" | "PLANIFIEE">("ALL");
  const [clientVisitSubTab, setClientVisitSubTab] = useState<"calendar" | "table" | "list">("calendar");
  const [clientVisitFilterType, setClientVisitFilterType] = useState<string>("ALL");

  function handleDeleteVisit(visitId: string) {
    if (typeof window !== "undefined" && window.confirm("Confirmer la suppression de cette visite ?")) {
      deleteClientVisit(client.id, visitId);
      setClientVisits(getClientVisits(client.id, client.notes));
    }
  }

  useEffect(() => {
    setLocalRevisitInterval(getClientRevisitInterval(client.id));
    setClientVisits(getClientVisits(client.id, client.notes));
  }, [client.id, client.notes]);

  useEffect(() => {
    function handleVisitSync() {
      setClientVisits(getClientVisits(client.id, client.notes));
      setLocalRevisitInterval(getClientRevisitInterval(client.id));
    }
    window.addEventListener("apflow_visits_updated", handleVisitSync);
    return () => window.removeEventListener("apflow_visits_updated", handleVisitSync);
  }, [client.id, client.notes]);

  // Sync logo when updated from elsewhere or local changes
  useEffect(() => {
    function handleLogoSync(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.clientId === client.id) {
        setClientLogoUrl(detail.logo || "");
      }
    }
    window.addEventListener("apflow_logo_changed", handleLogoSync);
    return () => window.removeEventListener("apflow_logo_changed", handleLogoSync);
  }, [client.id]);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
          localStorage.setItem(`apflow_logo_${client.id}`, compressed);
          setClientLogoUrl(compressed);
          window.dispatchEvent(
            new CustomEvent("apflow_logo_changed", {
              detail: { clientId: client.id, logo: compressed },
            })
          );
          // Persist logo to MySQL BDD
          fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logo: compressed }),
          }).catch((e) => console.error("Error saving logo to DB:", e));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleRemoveLogo(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    localStorage.removeItem(`apflow_logo_${client.id}`);
    setClientLogoUrl("");
    window.dispatchEvent(
      new CustomEvent("apflow_logo_changed", {
        detail: { clientId: client.id, logo: "" },
      })
    );
    // Remove logo from MySQL BDD
    fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: null }),
    }).catch((e) => console.error("Error removing logo from DB:", e));
  }

  // Contacts list initialized ONLY with client's actual entered contact
  const [contactsList, setContactsList] = useState<ContactPerson[]>(() => {
    if (client.contactName && client.contactName !== "—") {
      return [
        {
          id: "c1",
          role: client.position || "Responsable / Contact Principal",
          name: client.contactName,
          email: client.email || "",
          phone: client.phone || "",
          isPrimary: true,
        },
      ];
    }
    return [];
  });

  const primaryContact =
    contactsList.find((c) => c.isPrimary) || contactsList[0];

  // Addresses initialized ONLY with client's actual entered address
  const [addresses, setAddresses] = useState<CustomAddress[]>(() => {
    if (client.city) {
      return [
        {
          id: "a1",
          type: "SIEGE",
          label: "Adresse Principale / Siège",
          street: "",
          postalCode: "",
          city: client.city,
          zipCity: client.city,
          complement: "",
          isPrimary: true,
        },
      ];
    }
    return [];
  });

  const primaryAddress =
    addresses.find((a) => a.isPrimary) ||
    addresses.find((a) => a.type === "LIVRAISON") ||
    addresses[0];

  // Channels initialized ONLY with client's actual entered email/phone
  const [channels, setChannels] = useState<CustomEmailPhone[]>(() => {
    if (client.email || client.phone) {
      return [
        {
          id: "ch1",
          type: "PRINCIPAL",
          label: "Contact Principal",
          email: client.email || "",
          phone: client.phone || "",
        },
      ];
    }
    return [];
  });

  // Administrative, Account & Logistics Data (No test data, blank defaults)
  const [ficheData, setFicheData] = useState({
    // Admin & RCS / Bancaire
    legalName: client.company ? `${client.company}` : "",
    rcsCity: client.city ? `RCS ${client.city}` : "",
    rcsNumber: "",
    rcsRegistrationDate: "",
    capitalSocial: "",
    siret: "",
    siren: "",
    vatNumber: "",
    iban: "",
    bic: "",
    bankName: "",
    docFicheTechStatus: "ATTENTE" as "ATTENTE" | "RECUE" | "SIGNEE",
    docKbisStatus: "ATTENTE" as "ATTENTE" | "RECU",
    docRibStatus: "ATTENTE" as "ATTENTE" | "RECU",

    // Compte Auto Partner
    apClientNumber: "",
    webshopLogin: client.email || "",
    webshopPasswordStatus: "En attente d'activation",
    tecdocAccess: "Non activé",
    discountGrid: "Grille Standard Distributeur",
    creditLimit: "0 €",
    paymentTerms: "Paiement à réception",
    annualTarget: "0 € HT",
    rfaAgreement: "Non défini",

    // Logistique
    hubDepot: client.city ? `Dépôt Régional — ${client.city}` : "",
    routeTourCode: "",
    deliverySchedule: "",
    sasAccessType: "",
    sasAccessCode: "",
    alarmInstructions: "",
    vanConstraints: "",
    deliveryBarcode: "",
    barcodeConfirmedByTransport: false,
    mailOnboardingSent: false,
  });

  // Draft state while editing a section
  const [tempFicheData, setTempFicheData] = useState(ficheData);

  // Load saved state
  useEffect(() => {
    const savedSteps = localStorage.getItem(`apflow_onboarding_v4_${client.id}`);
    if (savedSteps) {
      try {
        setOnboardingSteps(JSON.parse(savedSteps));
      } catch {
        setOnboardingSteps(AP_ONBOARDING_WORKFLOW);
      }
    } else {
      const defaultCompletedCount =
        client.status === "NEW" ? 4 : client.status === "VIP" ? 11 : 8;
      setOnboardingSteps(
        AP_ONBOARDING_WORKFLOW.map((s, idx) => ({
          ...s,
          completed: idx < defaultCompletedCount,
        }))
      );
    }

    // Load photos from MySQL BDD first, fallback to localStorage
    fetch(`/api/clients/${client.id}/photos`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDeliveryPhotos(data);
          localStorage.setItem(`apflow_photos_v4_${client.id}`, JSON.stringify(data));
        } else {
          const savedPhotos = localStorage.getItem(`apflow_photos_v4_${client.id}`);
          if (savedPhotos) {
            try {
              const parsed = JSON.parse(savedPhotos);
              setDeliveryPhotos(parsed);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((ph) => {
                  fetch(`/api/clients/${client.id}/photos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ph),
                  }).catch(() => {});
                });
              }
            } catch {
              setDeliveryPhotos(DEFAULT_DELIVERY_PHOTOS);
            }
          }
        }
      })
      .catch(() => {
        const savedPhotos = localStorage.getItem(`apflow_photos_v4_${client.id}`);
        if (savedPhotos) {
          try {
            setDeliveryPhotos(JSON.parse(savedPhotos));
          } catch {
            setDeliveryPhotos(DEFAULT_DELIVERY_PHOTOS);
          }
        }
      });

    const savedFiche = localStorage.getItem(`apflow_fiche_v4_${client.id}`);
    const customApCode = localStorage.getItem(`apflow_apcode_${client.id}`);
    const customLogo = (client as any).logo || localStorage.getItem(`apflow_logo_${client.id}`);
    if (customLogo) {
      setClientLogoUrl(customLogo);
      localStorage.setItem(`apflow_logo_${client.id}`, customLogo);
    }

    if (savedFiche) {
      try {
        const parsed = JSON.parse(savedFiche);
        const merged = { ...ficheData, ...parsed };
        if (customApCode) merged.apClientNumber = customApCode;
        setFicheData(merged);
        setTempFicheData(merged);
      } catch {
        // ignore
      }
    } else {
      if (customApCode) {
        setFicheData((prev) => ({ ...prev, apClientNumber: customApCode }));
        setTempFicheData((prev) => ({ ...prev, apClientNumber: customApCode }));
      } else {
        setTempFicheData(ficheData);
      }
    }

    const savedContacts = localStorage.getItem(`apflow_contacts_v4_${client.id}`);
    if (savedContacts) {
      try {
        const parsed: ContactPerson[] = JSON.parse(savedContacts);
        if (parsed.length > 0) {
          if (!parsed.some((c) => c.isPrimary)) {
            parsed[0].isPrimary = true;
          }
          setContactsList(parsed);
        }
      } catch {
        // ignore
      }
    } else {
      const initialContacts: ContactPerson[] = client.contactName && client.contactName !== "—"
        ? [
            {
              id: `c_prim_${client.id}`,
              role: client.position || "Responsable / Contact Principal",
              name: client.contactName,
              email: client.email || "",
              phone: client.phone || "",
              isPrimary: true,
            },
          ]
        : [];
      setContactsList(initialContacts);
      if (initialContacts.length > 0) {
        localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(initialContacts));
      }
    }

    const savedAddresses = localStorage.getItem(`apflow_addresses_v4_${client.id}`);
    if (savedAddresses) {
      try {
        const parsed: CustomAddress[] = JSON.parse(savedAddresses);
        if (parsed.length > 0) {
          if (!parsed.some((a) => a.isPrimary)) {
            parsed[0].isPrimary = true;
          }
          const savedCp = localStorage.getItem(`apflow_cp_${client.id}`) || "";
          parsed.forEach((a) => {
            if (!a.postalCode && savedCp) a.postalCode = savedCp;
            if (!a.city && client.city) a.city = client.city;
            if (!a.postalCode && a.zipCity) {
              const m = a.zipCity.match(/\b\d{5}\b/);
              if (m) {
                a.postalCode = m[0];
                if (!a.city) a.city = a.zipCity.replace(m[0], "").trim();
              }
            }
          });
          setAddresses(parsed);
        }
      } catch {
        // ignore
      }
    } else {
      const savedCp = localStorage.getItem(`apflow_cp_${client.id}`) || "";
      const savedStreet = localStorage.getItem(`apflow_street_${client.id}`) || "";
      const savedCoordsStr = localStorage.getItem(`apflow_coords_${client.id}`);
      let savedCoords: [number, number] | undefined = undefined;
      if (savedCoordsStr) {
        try {
          savedCoords = JSON.parse(savedCoordsStr);
        } catch {}
      }

      const initialAddresses: CustomAddress[] =
        savedStreet || client.city || savedCp
          ? [
              {
                id: `a_siege_${client.id}`,
                type: "SIEGE",
                label: "Adresse Principale / Siège",
                street: savedStreet || "",
                postalCode: savedCp || "",
                city: client.city || "",
                zipCity: `${savedCp || ""} ${client.city || ""}`.trim(),
                complement: "",
                coordinates: savedCoords,
                isPrimary: true,
              },
            ]
          : [];
      setAddresses(initialAddresses);
      if (initialAddresses.length > 0) {
        localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(initialAddresses));
      }
    }

    const savedChannels = localStorage.getItem(`apflow_channels_v4_${client.id}`);
    if (savedChannels) {
      try {
        setChannels(JSON.parse(savedChannels));
      } catch {
        // ignore
      }
    }
  }, [client.id, client.status]);

  // Sync general form data when client prop updates
  useEffect(() => {
    setGeneralFormData({
      company: client.company,
      status: client.status,
      healthScore: client.healthScore,
      lastContactAt: client.lastContactAt
        ? new Date(client.lastContactAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });

    const primC = contactsList.find((c) => c.isPrimary) || contactsList[0];
    if (primC) {
      setSelectedContactId(primC.id);
      setContactForm({
        name: primC.name,
        role: primC.role,
        email: primC.email,
        phone: primC.phone,
      });
    }

    const primA = addresses.find((a) => a.isPrimary) || addresses[0];
    if (primA) {
      setSelectedAddressId(primA.id);
      setAddressForm({
        street: primA.street || "",
        postalCode: primA.postalCode || "",
        city: primA.city || client.city,
        complement: primA.complement || "",
        coordinates: primA.coordinates,
      });
    }
  }, [client]);

  function handleSelectContact(id: string) {
    setSelectedContactId(id);
    const found = contactsList.find((c) => c.id === id);
    if (found) {
      setContactForm({
        name: found.name,
        role: found.role,
        email: found.email,
        phone: found.phone,
      });
    }
  }

  function handleSelectAddress(id: string) {
    setSelectedAddressId(id);
    const found = addresses.find((a) => a.id === id);
    if (found) {
      setAddressForm({
        street: found.street || "",
        postalCode: found.postalCode || "",
        city: found.city || client.city,
        complement: found.complement || "",
        coordinates: found.coordinates,
      });
    }
  }

  async function handleSaveGeneral() {
    setIsSavingGeneral(true);
    try {
      const activeContactId = selectedContactId || primaryContact?.id || contactsList[0]?.id;
      const activeAddressId = selectedAddressId || primaryAddress?.id || addresses[0]?.id;

      // 1. Update contactsList: set selected contact as primary and update its details
      const updatedContacts = contactsList.map((c) =>
        c.id === activeContactId
          ? {
              ...c,
              name: contactForm.name.trim(),
              role: contactForm.role.trim(),
              email: contactForm.email.trim(),
              phone: contactForm.phone.trim(),
              isPrimary: true,
            }
          : { ...c, isPrimary: false }
      );
      setContactsList(updatedContacts);
      localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(updatedContacts));

      // 2. Update addresses: set selected address as primary and update its details
      const updatedAddresses = addresses.map((a) =>
        a.id === activeAddressId
          ? {
              ...a,
              street: addressForm.street.trim(),
              postalCode: addressForm.postalCode.trim(),
              city: addressForm.city.trim(),
              zipCity: `${addressForm.postalCode.trim()} ${addressForm.city.trim()}`.trim(),
              complement: addressForm.complement.trim(),
              coordinates: addressForm.coordinates || a.coordinates,
              isPrimary: true,
            }
          : { ...a, isPrimary: false }
      );
      setAddresses(updatedAddresses);
      localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(updatedAddresses));

      if (addressForm.postalCode.trim()) {
        localStorage.setItem(`apflow_cp_${client.id}`, addressForm.postalCode.trim());
        window.dispatchEvent(
          new CustomEvent("apflow_cp_changed", {
            detail: { clientId: client.id, cp: addressForm.postalCode.trim() },
          })
        );
      }
      if (addressForm.street.trim()) {
        localStorage.setItem(`apflow_street_${client.id}`, addressForm.street.trim());
      }
      if (addressForm.coordinates) {
        localStorage.setItem(`apflow_coords_${client.id}`, JSON.stringify(addressForm.coordinates));
      }

      // 3. Save to database
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: generalFormData.company.trim(),
          contactName: contactForm.name.trim(),
          position: contactForm.role.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          city: addressForm.city.trim(),
          status: generalFormData.status,
          healthScore: Number(generalFormData.healthScore),
          lastContactAt: generalFormData.lastContactAt
            ? new Date(generalFormData.lastContactAt).toISOString()
            : new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setIsEditingGeneral(false);
        onRefresh();
      }
    } catch (err) {
      console.error("Erreur sauvegarde distributeur:", err);
    } finally {
      setIsSavingGeneral(false);
    }
  }

  function handleCancelGeneral() {
    setGeneralFormData({
      company: client.company,
      status: client.status,
      healthScore: client.healthScore,
      lastContactAt: client.lastContactAt
        ? new Date(client.lastContactAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    if (primaryContact) {
      setSelectedContactId(primaryContact.id);
      setContactForm({
        name: primaryContact.name,
        role: primaryContact.role,
        email: primaryContact.email,
        phone: primaryContact.phone,
      });
    }
    if (primaryAddress) {
      setSelectedAddressId(primaryAddress.id);
      setAddressForm({
        street: primaryAddress.street || "",
        postalCode: primaryAddress.postalCode || "",
        city: primaryAddress.city || client.city,
        complement: primaryAddress.complement || "",
        coordinates: primaryAddress.coordinates,
      });
    }
    setIsEditingGeneral(false);
  }

  // Section Save & Cancel helpers
  function saveSection(section: "admin" | "compte_ap" | "logistique") {
    setFicheData(tempFicheData);
    localStorage.setItem(
      `apflow_fiche_v4_${client.id}`,
      JSON.stringify(tempFicheData)
    );
    if (section === "compte_ap" && tempFicheData.apClientNumber) {
      const code = tempFicheData.apClientNumber.trim();
      localStorage.setItem(`apflow_apcode_${client.id}`, code);
      window.dispatchEvent(
        new CustomEvent("apflow_apcode_changed", {
          detail: { clientId: client.id, apCode: code },
        })
      );
    }
    if (section === "admin") setIsEditingAdmin(false);
    if (section === "compte_ap") setIsEditingCompteAP(false);
    if (section === "logistique") setIsEditingLogistique(false);
  }

  function cancelSection(section: "admin" | "compte_ap" | "logistique") {
    setTempFicheData(ficheData);
    if (section === "admin") setIsEditingAdmin(false);
    if (section === "compte_ap") setIsEditingCompteAP(false);
    if (section === "logistique") setIsEditingLogistique(false);
  }

  function toggleOnboardingStep(stepId: string) {
    const updated = onboardingSteps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            completed: !s.completed,
            completedAt: !s.completed
              ? new Date().toLocaleDateString("fr-FR")
              : null,
          }
        : s
    );
    setOnboardingSteps(updated);
    localStorage.setItem(
      `apflow_onboarding_v4_${client.id}`,
      JSON.stringify(updated)
    );
  }

  // Contact list helpers
  function handleAddNewContact() {
    const newId = `c_${Date.now()}`;
    const newC: ContactPerson = {
      id: newId,
      role: "Nouveau Rôle",
      name: "Nom Prénom",
      email: "contact@client.fr",
      phone: "01 00 00 00 00",
      isPrimary: false,
    };
    const next = [...contactsList, newC];
    setContactsList(next);
    setEditingContactId(newId);
    localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(next));
  }

  async function handleSetContactAsPrimary(contactId: string) {
    const next = contactsList.map((c) => ({
      ...c,
      isPrimary: c.id === contactId,
    }));
    setContactsList(next);
    localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(next));

    const selected = next.find((c) => c.id === contactId);
    if (selected) {
      setGeneralFormData((prev) => ({
        ...prev,
        contactName: selected.name,
        position: selected.role,
        email: selected.email,
        phone: selected.phone,
      }));

      // Synchronize directly with the database
      try {
        await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactName: selected.name,
            position: selected.role,
            email: selected.email,
            phone: selected.phone,
          }),
        });
        onRefresh();
      } catch (err) {
        console.error("Erreur sync contact principal:", err);
      }
    }
  }

  function updateContact(id: string, field: keyof ContactPerson, val: any) {
    const next = contactsList.map((c) =>
      c.id === id ? { ...c, [field]: val } : c
    );
    setContactsList(next);
    localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(next));

    const updatedItem = next.find((c) => c.id === id);
    if (
      updatedItem &&
      (updatedItem.isPrimary || id === (primaryContact?.id || contactsList[0]?.id))
    ) {
      setContactForm((prev) => ({
        ...prev,
        name: field === "name" ? val : prev.name,
        role: field === "role" ? val : prev.role,
        email: field === "email" ? val : prev.email,
        phone: field === "phone" ? val : prev.phone,
      }));
    }
  }

  async function handleValidateContactRow(contactId: string) {
    setEditingContactId(null);
    const contact = contactsList.find((c) => c.id === contactId);
    if (
      contact &&
      (contact.isPrimary || contactId === (primaryContact?.id || contactsList[0]?.id))
    ) {
      try {
        await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactName: contact.name,
            position: contact.role,
            email: contact.email,
            phone: contact.phone,
          }),
        });
        onRefresh();
      } catch (err) {
        console.error("Erreur mise à jour contact principal:", err);
      }
    }
  }

  function deleteContact(id: string) {
    const next = contactsList.filter((c) => c.id !== id);
    if (next.length > 0 && !next.some((c) => c.isPrimary)) {
      next[0].isPrimary = true;
    }
    setContactsList(next);
    localStorage.setItem(`apflow_contacts_v4_${client.id}`, JSON.stringify(next));
  }

  // Address helpers
  function handleAddNewAddress() {
    const newId = `a_${Date.now()}`;
    const next: CustomAddress[] = [
      ...addresses,
      {
        id: newId,
        type: "AUTRE",
        label: "Nouveau Dépôt / Magasin",
        street: "",
        postalCode: "",
        city: client.city || "Lyon",
        zipCity: client.city || "Lyon",
        complement: "",
        isPrimary: addresses.length === 0,
      },
    ];
    setAddresses(next);
    setEditingAddressId(newId);
    localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(next));
  }

  function updateAddress(id: string, field: keyof CustomAddress, val: any) {
    const next = addresses.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: val };
      if (field === "postalCode" || field === "city") {
        const cp = field === "postalCode" ? val : updated.postalCode || "";
        const city = field === "city" ? val : updated.city || "";
        updated.zipCity = `${cp} ${city}`.trim();
      }
      return updated;
    });
    setAddresses(next);
    localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(next));
  }

  async function handleSetAddressAsPrimary(addressId: string) {
    const next = addresses.map((a) => ({
      ...a,
      isPrimary: a.id === addressId,
    }));
    setAddresses(next);
    localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(next));

    const selected = next.find((a) => a.id === addressId);
    if (selected) {
      if (selected.postalCode) {
        localStorage.setItem(`apflow_cp_${client.id}`, selected.postalCode);
        window.dispatchEvent(
          new CustomEvent("apflow_cp_changed", {
            detail: { clientId: client.id, cp: selected.postalCode },
          })
        );
      }
      if (selected.street) {
        localStorage.setItem(`apflow_street_${client.id}`, selected.street);
      }
      if (selected.coordinates) {
        localStorage.setItem(`apflow_coords_${client.id}`, JSON.stringify(selected.coordinates));
      }
      if (selected.city && selected.city !== client.city) {
        try {
          await fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: selected.city }),
          });
          onRefresh();
        } catch {}
      }
    }
  }

  async function handleValidateAddressRow(addressId: string) {
    setEditingAddressId(null);
    localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(addresses));

    const addr = addresses.find((a) => a.id === addressId);
    if (addr && (addr.isPrimary || addressId === (primaryAddress?.id || addresses[0]?.id))) {
      if (addr.postalCode) {
        localStorage.setItem(`apflow_cp_${client.id}`, addr.postalCode);
        window.dispatchEvent(
          new CustomEvent("apflow_cp_changed", {
            detail: { clientId: client.id, cp: addr.postalCode },
          })
        );
      }
      if (addr.street) {
        localStorage.setItem(`apflow_street_${client.id}`, addr.street);
      }
      if (addr.coordinates) {
        localStorage.setItem(`apflow_coords_${client.id}`, JSON.stringify(addr.coordinates));
      }
      if (addr.city && addr.city !== client.city) {
        try {
          await fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: addr.city }),
          });
          onRefresh();
        } catch {}
      }
    }
  }

  function deleteAddress(id: string) {
    const next = addresses.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isPrimary)) {
      next[0].isPrimary = true;
    }
    setAddresses(next);
    localStorage.setItem(`apflow_addresses_v4_${client.id}`, JSON.stringify(next));
  }

  // Channels helpers
  function handleAddNewChannel() {
    const newId = `ch_${Date.now()}`;
    const next: CustomEmailPhone[] = [
      ...channels,
      {
        id: newId,
        type: "AUTRE",
        label: "Nouveau Service",
        email: "service@client.fr",
        phone: "01 00 00 00 00",
      },
    ];
    setChannels(next);
    setEditingChannelId(newId);
    localStorage.setItem(`apflow_channels_v4_${client.id}`, JSON.stringify(next));
  }

  function updateChannel(id: string, field: keyof CustomEmailPhone, val: string) {
    const next = channels.map((c) =>
      c.id === id ? { ...c, [field]: val } : c
    );
    setChannels(next);
    localStorage.setItem(`apflow_channels_v4_${client.id}`, JSON.stringify(next));
  }

  function deleteChannel(id: string) {
    const next = channels.filter((c) => c.id !== id);
    setChannels(next);
    localStorage.setItem(`apflow_channels_v4_${client.id}`, JSON.stringify(next));
  }

  // Photo helpers with JPG conversion & compression
  async function handleUploadPhotoFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setIsCompressingPhotos(true);
    setCompressionStatusMsg(
      `Conversion et compression de ${files.length} photo(s) en JPG haute qualité...`
    );

    try {
      const newPhotos: DeliveryPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        // Convertit toute image (PNG, WebP, etc.) en JPG compressé (max 1600px, 78% qualité)
        const { dataUrl, originalSizeKb, compressedSizeKb } =
          await processAndCompressImage(file, 1600, 0.78);

        const defaultName = file.name.replace(/\.[^/.]+$/, "");
        const newPhoto: DeliveryPhoto = {
          id: `photo_${Date.now()}_${i}`,
          label:
            newPhotoLabel.trim() ||
            defaultName ||
            (newPhotoCategory === "SAS"
              ? "Photo Sas de livraison"
              : newPhotoCategory === "ACCES_CAMIONNETTE"
              ? "Accès Camionnette"
              : newPhotoCategory === "CLE_DIGICODE"
              ? "Clé / Digicode"
              : "Zone dépôt colis"),
          category: newPhotoCategory,
          url: dataUrl,
          note:
            newPhotoNote.trim() ||
            `Photo JPG compressée (${compressedSizeKb} Ko)`,
          createdAt: new Date().toLocaleDateString("fr-FR"),
          sizeKb: compressedSizeKb,
          originalSizeKb: originalSizeKb,
          format: "JPG",
        };
        newPhotos.push(newPhoto);
      }

      if (newPhotos.length > 0) {
        const next = [...newPhotos, ...deliveryPhotos];
        setDeliveryPhotos(next);
        localStorage.setItem(
          `apflow_photos_v4_${client.id}`,
          JSON.stringify(next)
        );
        // Persist each new photo in MySQL BDD
        for (const ph of newPhotos) {
          fetch(`/api/clients/${client.id}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ph),
          }).catch((e) => console.error("Error saving photo to DB:", e));
        }
        setNewPhotoLabel("");
        setNewPhotoNote("");
        setCompressionSuccessMsg(
          `${newPhotos.length} photo(s) convertie(s) en JPG et compressée(s) avec succès !`
        );
        setTimeout(() => setCompressionSuccessMsg(null), 4500);
      }
    } catch (err) {
      console.error("Erreur compression image:", err);
    } finally {
      setIsCompressingPhotos(false);
      setCompressionStatusMsg(null);
    }
  }

  function handleUploadPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadPhotoFiles(e.target.files);
      e.target.value = "";
    }
  }

  function handleDownloadPhoto(photo: DeliveryPhoto) {
    const link = document.createElement("a");
    link.href = photo.url;
    const safeName = (photo.label || "photo_logistique")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");
    link.download = `${safeName}_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDeletePhoto(photoId: string) {
    const next = deliveryPhotos.filter((p) => p.id !== photoId);
    setDeliveryPhotos(next);
    localStorage.setItem(`apflow_photos_v4_${client.id}`, JSON.stringify(next));
    fetch(`/api/clients/${client.id}/photos?photoId=${photoId}`, {
      method: "DELETE",
    }).catch((e) => console.error("Error deleting photo from DB:", e));
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  }

  // Handle Note submit
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          category: noteCategory,
          pinned: notePinned,
          clientId: client.id,
          kamId: activeKamId,
        }),
      });
      if (res.ok) {
        setNoteTitle("");
        setNoteContent("");
        setNoteCategory("COMPTE_RENDU");
        setNotePinned(false);
        onRefresh();
      }
    } finally {
      setSavingNote(false);
    }
  }

  const statusConfig =
    CLIENT_STATUS_CONFIG[client.status] || CLIENT_STATUS_CONFIG.ACTIVE;
  const clientNotes = client.notes || [];
  const filteredNotes = clientNotes.filter(
    (n) => categoryFilter === "ALL" || n.category === categoryFilter
  );

  const completedStepsCount = onboardingSteps.filter((s) => s.completed).length;
  const onboardingProgress = Math.round(
    (completedStepsCount / onboardingSteps.length) * 100
  );

  const phases = [
    "1. Visite & Collecte Terrain",
    "2. Retour Documents Client",
    "3. Traitement Interne AP & Transport",
    "4. Activation Finale",
  ] as const;

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* 1. TOP HEADER BANNER: RETOUR + INFOS RAPIDES CLIENT + MENU HORIZONTAL */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800">
        {/* Barre de retour */}
        <div className="px-6 lg:px-8 pt-4 pb-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portefeuille clients</span>
          </button>
        </div>

        {/* INFOS RAPIDES DU CLIENT (AU-DESSUS DU MENU HORIZONTAL) */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6 text-center sm:text-left">
              {/* Hidden file input for direct logo upload */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
              />

              {/* Photo / Enseigne Magasin à gauche — cliquable avec survol pour changer le logo */}
              <div
                onClick={() => logoInputRef.current?.click()}
                className="group/logo cursor-pointer w-32 sm:w-44 sm:self-stretch shrink-0 rounded-2xl relative select-none mx-auto sm:mx-0 transition-all hover:scale-[1.01] shadow-sm hover:shadow-md flex flex-col"
                title="Cliquer pour changer ou ajouter le logo du magasin"
              >
                {/* Overlay au survol */}
                <div className="absolute inset-0 z-30 bg-black/60 rounded-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-center pointer-events-none backdrop-blur-[1px]">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-white leading-tight">
                    {clientLogoUrl ? "Changer le logo" : "Ajouter un logo"}
                  </span>
                </div>

                {/* Bouton supprimer le logo */}
                {clientLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    title="Supprimer le logo (revenir aux initiales)"
                    className="absolute -top-1.5 -right-1.5 z-40 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-md opacity-0 group-hover/logo:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {clientLogoUrl ? (
                  <div className="w-full h-full rounded-2xl border-2 border-slate-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2.5 flex flex-col items-center justify-between shadow-2xs">
                    <div className="w-full flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                      <img
                        src={clientLogoUrl}
                        alt={client.company}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] text-[9px] font-bold uppercase tracking-wider border border-red-200/60 dark:border-red-900/40 shrink-0 mt-1.5">
                      <Store className="w-2.5 h-2.5" />
                      Magasin
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#d90416] via-[#c40314] to-[#99020e] text-white flex flex-col items-center justify-center p-3 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />
                    <span className="text-2xl sm:text-3xl font-black tracking-wider relative z-10 drop-shadow-sm">
                      {getInitials(primaryContact?.name || client.contactName || client.company)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/95 mt-1.5 px-2.5 py-0.5 rounded-full bg-black/25 border border-white/20 relative z-10 flex items-center gap-1 shadow-xs">
                      <Store className="w-2.5 h-2.5" />
                      Magasin
                    </span>
                  </div>
                )}
              </div>

              {/* Lignes d'informations rapides avec espacement aéré */}
              <div className="space-y-3.5 sm:space-y-4 py-0.5 min-w-0 flex-1">
                {/* Ligne 1 : Enseigne & Code Client AP copiable en 1 clic & Statut */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    {client.company}
                  </h1>

                  {/* Code Client AP copiable en 1 clic */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ficheData.apClientNumber, "header_ap_code")}
                    className="group/ap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-mono font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="Cliquer pour copier le N° Client AP"
                  >
                    <span className="text-[#d90416] font-bold">N° AP :</span>
                    <span>{ficheData.apClientNumber}</span>
                    {copiedField === "header_ap_code" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-sans font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded ml-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copié !
                      </span>
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover/ap:text-white transition-colors ml-0.5" />
                    )}
                  </button>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
                    />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Ligne 2 : Interlocuteur Référent (Copiable en 1 clic) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-[#d90416]" />
                    Interlocuteur :
                  </span>
                  <strong className="text-slate-900 dark:text-zinc-100 font-semibold text-xs select-all">
                    {primaryContact?.name || client.contactName}
                  </strong>
                  <span className="text-slate-400">
                    — {primaryContact?.role || client.position}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${primaryContact?.name || client.contactName} — ${primaryContact?.role || client.position}`,
                        "header_contact"
                      )
                    }
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copier l'interlocuteur"
                  >
                    {copiedField === "header_contact" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3 h-3 text-emerald-500" /> Copié !
                      </span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("fiche");
                      setFicheSubTab("contacts");
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[#d90416] hover:bg-red-50 dark:hover:bg-zinc-700 text-[11px] font-semibold transition-colors ml-1"
                    title="Voir et gérer tous les contacts de ce client dans l'onglet Contacts"
                  >
                    <span>{contactsList.length} contact{contactsList.length > 1 ? "s" : ""}</span>
                    <span className="text-[10px]">→</span>
                  </button>
                </div>

                {/* Ligne 3 : Adresse Principale (issue de Contacts & Adresses) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-[#d90416]" />
                    {primaryAddress?.label || (primaryAddress?.type === "SIEGE" ? "Siège Social :" : "Livraison :")}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${primaryAddress?.street || ""}, ${primaryAddress?.postalCode ? primaryAddress.postalCode + " " : ""}${primaryAddress?.city || primaryAddress?.zipCity || client.city || ""}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 hover:text-[#d90416] dark:hover:text-[#d90416] hover:underline transition-colors font-medium cursor-pointer group/gps"
                    title="Cliquer pour lancer l'itinéraire GPS dans Google Maps"
                  >
                    <span className="font-semibold underline decoration-dotted decoration-slate-300 dark:decoration-zinc-700 underline-offset-4 group-hover/gps:decoration-[#d90416]">
                      {primaryAddress?.street ? `${primaryAddress.street}, ` : ""}{primaryAddress?.postalCode ? `${primaryAddress.postalCode} ` : ""}{primaryAddress?.city || primaryAddress?.zipCity || client.city}
                    </span>
                    {primaryAddress?.complement ? (
                      <span className="text-slate-400 text-[11px] no-underline">
                        ({primaryAddress.complement})
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#d90416] bg-red-50 dark:bg-red-950/40 hover:bg-[#d90416] hover:text-white dark:hover:bg-[#d90416] px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50 transition-colors shrink-0 shadow-xs">
                      <Navigation className="w-2.5 h-2.5 fill-current" />
                      <span>Ouvrir GPS</span>
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${primaryAddress?.street ? `${primaryAddress.street}, ` : ""}${primaryAddress?.postalCode ? `${primaryAddress.postalCode} ` : ""}${primaryAddress?.city || primaryAddress?.zipCity || client.city}${primaryAddress?.complement ? ` (${primaryAddress.complement})` : ""}`,
                        "header_address"
                      )
                    }
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copier l'adresse principale"
                  >
                    {copiedField === "header_address" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3 h-3 text-emerald-500" /> Copié !
                      </span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("fiche");
                      setFicheSubTab("contacts");
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[#d90416] hover:bg-red-50 dark:hover:bg-zinc-700 text-[11px] font-semibold transition-colors ml-1"
                    title="Gérer les adresses dans Contacts & Adresses"
                  >
                    <span>{addresses.length} adresse{addresses.length > 1 ? "s" : ""}</span>
                    <span className="text-[10px]">→</span>
                  </button>
                </div>

                {/* Ligne 4 : Tournée AP & Dépôt (Copiable en 1 clic) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <Truck className="w-3.5 h-3.5 text-[#d90416]" />
                    Tournée AP :
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-mono text-[11px]">
                    {ficheData.routeTourCode}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        ficheData.routeTourCode,
                        "header_tour"
                      )
                    }
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copier le code de tournée"
                  >
                    {copiedField === "header_tour" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3 h-3 text-emerald-500" /> Copié !
                      </span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Ligne 5 : KAM en charge (Copiable en 1 clic) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-[#d90416]" />
                    KAM référent :
                  </span>
                  <strong className="text-slate-800 dark:text-zinc-200 font-semibold">
                    {client.kam?.name || "Youcef K."}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(client.kam?.name || "Youcef K.", "header_kam")
                    }
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copier le nom du KAM"
                  >
                    {copiedField === "header_kam" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3 h-3 text-emerald-500" /> Copié !
                      </span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Ligne 6 : Suivi des Visites Terrain & Rythme de Re-visite */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                    Visites terrain :
                  </span>
                  {(() => {
                    const vs = getClientVisitStatus(client, clientVisits);
                    if (vs.urgency === "DISABLED") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400">
                          <Circle className="w-2.5 h-2.5 text-slate-400" />
                          Re-visite désactivée
                        </span>
                      );
                    }
                    if (vs.urgency === "NEVER") {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400">
                          <Clock className="w-3 h-3" />
                          Jamais visité
                        </span>
                      );
                    }
                    if (vs.urgency === "OVERDUE") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          En retard de re-visite (+{vs.daysOverdue}j)
                        </span>
                      );
                    }
                    if (vs.urgency === "SOON") {
                      const daysLeft = Math.max(0, vs.revisitIntervalDays - (vs.daysSinceLastVisit || 0));
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          À re-visiter sous {daysLeft}j (dernière il y a {vs.daysSinceLastVisit}j)
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        Visité il y a {vs.daysSinceLastVisit}j ({vs.lastVisit?.date ? new Date(vs.lastVisit.date).toLocaleDateString("fr-FR") : "Récent"})
                      </span>
                    );
                  })()}

                  {/* Paramétrer le délai de re-visite pour ce client */}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] border border-slate-200/60 dark:border-zinc-700">
                    <Sliders className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">Rythme :</span>
                    <select
                      value={clientRevisitInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setClientRevisitInterval(client.id, val);
                        setLocalRevisitInterval(val);
                      }}
                      className="bg-transparent font-bold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      {REVISIT_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bouton direct consigner une visite */}
                  <button
                    type="button"
                    onClick={() => setIsAddVisitModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 hover:bg-[#d90416] hover:text-white dark:bg-red-950/40 text-[#d90416] text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer ml-1"
                  >
                    <Plus className="w-3 h-3" />
                    Consigner une visite
                  </button>
                </div>
              </div>
            </div>

            {/* Actions & Contrôles (Placés en dessous des informations) */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="min-w-[145px] rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Onboarding AP
                  </span>
                  <span className="font-bold text-[#d90416]">
                    {onboardingProgress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#d90416]"
                    style={{ width: `${onboardingProgress}%` }}
                  />
                </div>
              </div>

              <select
                value={client.status}
                onChange={(e) =>
                  onChangeStatus(client.id, e.target.value as ClientStatus)
                }
                className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] cursor-pointer"
              >
                {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map(
                  (st) => (
                    <option key={st} value={st}>
                      Statut : {CLIENT_STATUS_CONFIG[st].label}
                    </option>
                  )
                )}
              </select>

              {/* Bouton Consigner une visite dans la barre d'action */}
              <button
                type="button"
                onClick={() => setIsAddVisitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                + Visite
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("fiche");
                  setFicheSubTab("general");
                  setIsEditingGeneral(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>

              <button
                type="button"
                onClick={() => onDeleteClient(client.id)}
                className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                title="Supprimer le client"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. MENU HORIZONTAL DE NAVIGATION (SOUS LES INFOS RAPIDES CLIENT) */}
        <div className="px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-zinc-800 flex items-center gap-4 sm:gap-8 text-xs font-medium overflow-x-auto no-scrollbar bg-slate-50/50 dark:bg-zinc-950/40">
          {/* 1er onglet : VUE D'ENSEMBLE */}
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#d90416] text-[#d90416] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Vue d&apos;ensemble</span>
          </button>

          {/* 2ème onglet : FICHE CLIENT */}
          <button
            type="button"
            onClick={() => setActiveTab("fiche")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "fiche"
                ? "border-[#d90416] text-[#d90416] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Fiche Client</span>
          </button>

          {/* 3ème onglet : VISITES TERRAIN */}
          {canViewVisits && (
            <button
              type="button"
              onClick={() => setActiveTab("visites")}
              className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === "visites"
                  ? "border-[#d90416] text-[#d90416] font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Visites Terrain</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-50 dark:bg-zinc-800 text-[#d90416] font-semibold">
                {clientVisits.length}
              </span>
            </button>
          )}

          {/* 4ème onglet : CHIFFRE D'AFFAIRES (CA) */}
          {canViewCa && (
            <button
              type="button"
              onClick={() => setActiveTab("ca")}
              className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === "ca"
                  ? "border-[#d90416] text-[#d90416] font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Chiffre d&apos;Affaires</span>
            </button>
          )}

          {/* 5ème onglet : ONBOARDING & CRÉATION */}
          <button
            type="button"
            onClick={() => setActiveTab("onboarding")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "onboarding"
                ? "border-[#d90416] text-[#d90416] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Onboarding & Création</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-50 dark:bg-zinc-800 text-[#d90416] font-semibold">
              {completedStepsCount}/{onboardingSteps.length}
            </span>
          </button>

          {/* 4ème onglet : NOTES ET SUIVI KAM */}
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === "notes"
                ? "border-[#d90416] text-[#d90416] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Notes & Suivi KAM</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              {clientNotes.length}
            </span>
          </button>
        </div>
      </div>

      {/* PAGE BODY */}
      <div className="p-3.5 sm:p-6 lg:px-8 lg:py-6 space-y-5 sm:space-y-6 w-full animate-in fade-in duration-150">

        {/* =========================================================
            ONGLET 1: VUE D'ENSEMBLE (OVERVIEW)
           ========================================================= */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              {/* Résumé Compte AP */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Compte Auto Partner
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("fiche");
                      setFicheSubTab("compte_ap");
                    }}
                    className="text-xs text-[#d90416] font-medium hover:underline"
                  >
                    Détails
                  </button>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">N° Client AP</span>
                  <span className="font-mono font-bold text-[#d90416]">
                    {ficheData.apClientNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Code-barres Livraison</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                    {ficheData.deliveryBarcode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Accès Sas</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">
                    {ficheData.sasAccessCode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Encours & Modalités</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {ficheData.creditLimit}
                  </span>
                </div>
              </div>

              {/* Contacts clés rapide */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contacts ({contactsList.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("fiche");
                      setFicheSubTab("contacts");
                    }}
                    className="text-xs text-[#d90416] font-medium hover:underline"
                  >
                    Tableau complet
                  </button>
                </div>
                <div className="space-y-2">
                  {contactsList.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{c.role}</p>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="text-[#d90416] font-semibold text-[11px]"
                      >
                        {c.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding raccourci */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Onboarding Client ({completedStepsCount}/11)
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("onboarding")}
                    className="text-xs text-[#d90416] font-medium hover:underline"
                  >
                    Ouvrir
                  </button>
                </div>
                <div className="space-y-2">
                  {onboardingSteps.slice(0, 5).map((step) => (
                    <div
                      key={step.id}
                      onClick={() => toggleOnboardingStep(step.id)}
                      className="flex items-center gap-2.5 text-xs cursor-pointer"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          step.completed
                            ? "line-through text-slate-400"
                            : "text-slate-700 dark:text-zinc-200 font-medium"
                        }`}
                      >
                        {step.stepNumber}. {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Carte Prise de note rapide avec raccourci Split-screen / Drawer */}
              <form
                onSubmit={handleAddNote}
                className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                        Ajouter une note rapide
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Pour {client.company}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bouton pour ouvrir en Volet Coulissant / Split-screen */}
                    <button
                      type="button"
                      onClick={() => openQuickNote({ clientId: client.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-[#d90416] text-xs font-semibold transition-all hover:scale-[1.02] shadow-2xs"
                      title="Ouvrir le panneau latéral pour continuer à naviguer dans l'application tout en prenant des notes"
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                      Prise de note latérale / Split-screen
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotePinned(!notePinned)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        notePinned
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {notePinned ? "Épinglée" : "Épingler"}
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Objet ou titre de la note (ex: Accord commercial, Re-visite, RFA...)..."
                  className="w-full text-xs font-semibold bg-transparent border-b border-slate-200 dark:border-zinc-800 pb-2 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
                />

                <NoteFormattingToolbar
                  textareaRef={noteTextareaRef}
                  value={noteContent}
                  onChange={setNoteContent}
                />

                <textarea
                  ref={noteTextareaRef}
                  rows={3}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={`Saisissez votre note, compte-rendu, besoin en pièces pour ${client.company}...`}
                  className="w-full rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/70 p-3.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] resize-none focus:ring-1 focus:ring-red-500/20"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">Catégorie :</span>
                    <select
                      value={noteCategory}
                      onChange={(e) =>
                        setNoteCategory(e.target.value as NoteCategory)
                      }
                      className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200"
                    >
                      {NOTE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={savingNote || !noteContent.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm disabled:opacity-40 transition-all hover:shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {savingNote ? "Enregistrement..." : "Ajouter la note"}
                  </button>
                </div>
              </form>

              {/* Bloc Notes Récentes Haute Visibilité */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Notes récentes ({clientNotes.length})
                  </h3>
                  {clientNotes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("notes")}
                      className="text-xs font-semibold text-[#d90416] hover:underline"
                    >
                      Voir tout ({clientNotes.length}) →
                    </button>
                  )}
                </div>

                {clientNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 text-center text-xs text-slate-400">
                    Aucune note pour le moment sur {client.company}. Utilisez le formulaire ci-dessus pour en ajouter une.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientNotes.slice(0, 3).map((note) => {
                      const catConfig =
                        NOTE_CATEGORIES.find((c) => c.value === note.category) ||
                        NOTE_CATEGORIES[0];
                      return (
                        <div
                          key={note.id}
                          className="group relative rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-red-300 dark:hover:border-red-900/40 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-2">
                              {note.pinned && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                  <Pin className="w-3 h-3" /> Épinglée
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catConfig.badgeClass}`}
                              >
                                {catConfig.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#d90416]" />
                                {formatFullTimestamp(note.createdAt)}
                              </span>

                              {/* Bouton pour ouvrir cette note dans le drawer / split-screen */}
                              <button
                                type="button"
                                onClick={() => openQuickNote({ clientId: client.id, note })}
                                className="p-1 rounded-lg text-slate-400 hover:text-[#d90416] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Ouvrir dans le panneau latéral / split-screen"
                              >
                                <PanelRightClose className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {note.title && (
                            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1.5">
                              {note.title}
                            </h4>
                          )}

                          <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50/70 dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/60">
                            <FormattedNoteText content={note.content} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET 2: FICHE CLIENT (5 SOUS-ONGLETS AVEC AFFICHAGE INFORMATIONS, TABLEAUX & MODIFICATION AU CRAYON)
           ========================================================= */}
        {activeTab === "fiche" && (
          <div className="space-y-6">
            {/* 5 Sous-onglets */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFicheSubTab("general")}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  ficheSubTab === "general"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                1. Distributeur & Magasin
              </button>
              <button
                type="button"
                onClick={() => setFicheSubTab("contacts")}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  ficheSubTab === "contacts"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                2. Contacts & Adresses ({contactsList.length})
              </button>
              <button
                type="button"
                onClick={() => setFicheSubTab("admin")}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  ficheSubTab === "admin"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                3. Administratif & RCS / Bancaire
              </button>
              <button
                type="button"
                onClick={() => setFicheSubTab("compte_ap")}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  ficheSubTab === "compte_ap"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                4. Compte Auto Partner (AP)
              </button>
              <button
                type="button"
                onClick={() => setFicheSubTab("logistique")}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  ficheSubTab === "logistique"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                5. Logistique, Sas & Photos ({deliveryPhotos.length})
              </button>
            </div>

            {/* SOUS-ONGLET 1: INFORMATIONS GÉNÉRALES / DISTRIBUTEUR & MAGASIN */}
            {ficheSubTab === "general" && (
              <div className="space-y-6">
                {!isEditingGeneral ? (
                  /* MODE CONSULTATION */
                  <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
                          <Building2 className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                            Informations Distributeur & Magasin
                          </h3>
                          <p className="text-xs text-slate-400">
                            Coordonnées générales, type de point de vente, interlocuteur principal et indicateurs commerciaux.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingGeneral(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#d90416]" />
                        Modifier les informations
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      {/* Bloc 1: Point de vente */}
                      <div className="space-y-4 p-5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                            Point de vente & Enseigne
                          </h4>
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold text-[#d90416] hover:bg-red-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                          >
                            <Camera className="w-3 h-3 text-[#d90416]" />
                            <span>{clientLogoUrl ? "Changer le logo" : "Ajouter un logo"}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {clientLogoUrl ? (
                            <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group/sublogo">
                              <img src={clientLogoUrl} alt={client.company} className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                title="Supprimer le logo"
                                className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover/sublogo:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold flex items-center justify-center shrink-0 text-sm">
                              {getInitials(client.company)}
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 text-[11px] block mb-0.5">
                              Enseigne / Distributeur
                            </span>
                            <span className="font-bold text-base text-slate-900 dark:text-zinc-100">
                              {client.company}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">
                            Adresse & Localisation Principale
                          </span>
                          <span className="font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#d90416]" />
                            {primaryAddress?.street ? `${primaryAddress.street}, ` : ""}{primaryAddress?.postalCode ? `${primaryAddress.postalCode} ` : ""}{primaryAddress?.city || primaryAddress?.zipCity || client.city || "Non spécifié"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-1">
                            Statut du compte
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
                            />
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Bloc 2: Contact principal issu de l'onglet Contacts */}
                      <div className="space-y-4 p-5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                            Contact Référent & Coordonnées Directes
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("fiche");
                              setFicheSubTab("contacts");
                            }}
                            className="text-xs text-[#d90416] font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <span>Gérer les {contactsList.length} contacts</span>
                            <span>→</span>
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 text-[11px]">
                              Interlocuteur principal
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-[#d90416] border border-red-200 dark:border-red-900">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Contact Référent AP
                            </span>
                          </div>
                          <span className="font-bold text-base text-slate-900 dark:text-zinc-100 block">
                            {primaryContact?.name || client.contactName}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {primaryContact?.role || client.position || "Non spécifié"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">
                            Email direct
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a
                              href={`mailto:${primaryContact?.email || client.email}`}
                              className="font-medium text-[#d90416] hover:underline flex items-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {primaryContact?.email || client.email || "Non renseigné"}
                            </a>
                            {(primaryContact?.email || client.email) && (
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    primaryContact?.email || client.email,
                                    "Email"
                                  )
                                }
                                className="p-1 rounded text-slate-400 hover:text-slate-700"
                                title="Copier l'email"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">
                            Téléphone direct
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a
                              href={`tel:${primaryContact?.phone || client.phone}`}
                              className="font-medium text-slate-800 dark:text-zinc-200 hover:underline flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {primaryContact?.phone || client.phone || "Non renseigné"}
                            </a>
                            {(primaryContact?.phone || client.phone) && (
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    primaryContact?.phone || client.phone,
                                    "Téléphone"
                                  )
                                }
                                className="p-1 rounded text-slate-400 hover:text-slate-700"
                                title="Copier le numéro"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">
                            Dernier contact / visite
                          </span>
                          <span className="font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {client.lastContactAt
                              ? new Date(client.lastContactAt).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )
                              : "Non renseigné"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Santé commerciale & régularité d'achat */}
                    <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#d90416]" />
                          Santé commerciale & régularité d&apos;achat
                        </span>
                        <span className="font-bold text-base text-[#d90416]">
                          {client.healthScore}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-[#d90416]"
                          style={{ width: `${client.healthScore}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>
                          {client.healthScore >= 75
                            ? "Excellente régularité — Commandes quotidiennes et respect des encours"
                            : client.healthScore >= 50
                            ? "Flux régulier — Potentiel de développement et diversification des pièces"
                            : "Faible activité d'achat — Relance commerciale KAM recommandée"}
                        </span>
                        <span className="font-medium text-slate-500">
                          KAM référent : {client.kam?.name || "Attribué"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODE ÉDITION AU CRAYON AVEC VALIDATION */
                  <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/70 text-[#d90416]">
                          <Pencil className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                            Modifier le distributeur / magasin
                          </h3>
                          <p className="text-xs text-slate-400">
                            Modifiez les champs ci-dessous puis validez votre saisie pour mettre à jour la fiche.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelGeneral}
                          disabled={isSavingGeneral}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveGeneral}
                          disabled={
                            isSavingGeneral ||
                            !generalFormData.company.trim() ||
                            !contactForm.name.trim() ||
                            !addressForm.city.trim()
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isSavingGeneral ? "Enregistrement..." : "Valider et Enregistrer"}
                        </button>
                      </div>
                    </div>

                    {/* Section Logo du magasin */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800">
                      <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {clientLogoUrl ? (
                          <img src={clientLogoUrl} alt={client.company} className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                            <span className="text-[9px] uppercase font-bold mt-0.5">Logo</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block mb-0.5">
                          Logo de l&apos;enseigne / magasin
                        </label>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
                          Format PNG, JPG ou WebP (converti et optimisé automatiquement)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#d90416]" />
                            {clientLogoUrl ? "Changer le logo" : "Téléverser un logo"}
                          </button>
                          {clientLogoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Supprimer le logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grille unifiée sans doublons ni conflits */}
                    <div className="space-y-6 text-xs">
                      {/* Section 1: Identité du Magasin & Statut */}
                      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                          <Store className="w-3.5 h-3.5 text-[#d90416]" />
                          Établissement / Magasin
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5 sm:col-span-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Enseigne / Distributeur *
                            </label>
                            <input
                              type="text"
                              required
                              value={generalFormData.company}
                              onChange={(e) =>
                                setGeneralFormData({
                                  ...generalFormData,
                                  company: e.target.value,
                                })
                              }
                              placeholder="Ex: Auto Pièces Express 31"
                              className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Statut du compte
                            </label>
                            <select
                              value={generalFormData.status}
                              onChange={(e) =>
                                setGeneralFormData({
                                  ...generalFormData,
                                  status: e.target.value as ClientStatus,
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416] cursor-pointer"
                            >
                              {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map(
                                (st) => (
                                  <option key={st} value={st}>
                                    {CLIENT_STATUS_CONFIG[st].label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Dernier contact / visite
                            </label>
                            <input
                              type="date"
                              value={generalFormData.lastContactAt}
                              onChange={(e) =>
                                setGeneralFormData({
                                  ...generalFormData,
                                  lastContactAt: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Interlocuteur Référent (Source Unique: Contacts) */}
                      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                            <UserCheck className="w-3.5 h-3.5 text-[#d90416]" />
                            Interlocuteur Référent
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 lowercase">
                              (lié à l&apos;onglet Contacts)
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("fiche");
                              setFicheSubTab("contacts");
                            }}
                            className="text-[11px] font-semibold text-[#d90416] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Gérer les {contactsList.length} contacts</span>
                            <span>→</span>
                          </button>
                        </div>

                        {/* Sélecteur de contact */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            Sélectionner le contact référent pour ce magasin *
                          </label>
                          <select
                            value={selectedContactId || primaryContact?.id}
                            onChange={(e) => handleSelectContact(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416] cursor-pointer"
                          >
                            {contactsList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} — {c.role} {c.isPrimary ? "⭐ (Actuel)" : ""} ({c.phone || c.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Coordonnées en direct du contact sélectionné */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Nom & Prénom *
                            </label>
                            <input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                              placeholder="Nom du contact"
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Fonction / Rôle
                            </label>
                            <input
                              type="text"
                              value={contactForm.role}
                              onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                              placeholder="Ex: Gérant, Responsable..."
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Email direct
                            </label>
                            <input
                              type="email"
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              placeholder="email@magasin.fr"
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Téléphone direct
                            </label>
                            <input
                              type="text"
                              value={contactForm.phone}
                              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                              placeholder="06 00 00 00 00"
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Localisation & Adresse Principale (Source Unique: Adresses) */}
                      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-[#d90416]" />
                            Adresse & Localisation Principale
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 lowercase">
                              (liée à l&apos;onglet Adresses)
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("fiche");
                              setFicheSubTab("contacts");
                            }}
                            className="text-[11px] font-semibold text-[#d90416] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Gérer les {addresses.length} adresses</span>
                            <span>→</span>
                          </button>
                        </div>

                        {/* Sélecteur d'adresse principale */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            Sélectionner l&apos;adresse principale de référence *
                          </label>
                          <select
                            value={selectedAddressId || primaryAddress?.id}
                            onChange={(e) => handleSelectAddress(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416] cursor-pointer"
                          >
                            {addresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.label} ({a.type}) — {a.street}, {a.postalCode ? a.postalCode + ' ' : ''}{a.city || a.zipCity} {a.isPrimary ? "⭐ (Actuelle)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Détails en direct de l'adresse sélectionnée */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Rue & Voie (Certifiée BAN)
                            </label>
                            <AddressAutocomplete
                              value={addressForm.street}
                              onChange={(val) => setAddressForm({ ...addressForm, street: val })}
                              placeholder="Rechercher une adresse certifiée BAN..."
                              onSelectAddress={(sugg) => {
                                setAddressForm({
                                  ...addressForm,
                                  street: sugg.street,
                                  postalCode: sugg.postalCode,
                                  city: sugg.city,
                                  coordinates: sugg.coordinates,
                                });
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Code Postal (CP)
                            </label>
                            <input
                              type="text"
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                              placeholder="Ex: 31000"
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                              Ville / Commune *
                            </label>
                            <input
                              type="text"
                              required
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              placeholder="Ex: Toulouse"
                              className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Santé commerciale slider */}
                    <div className="space-y-2 pt-2 p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          Santé commerciale & régularité d&apos;achat
                        </span>
                        <span className="font-bold text-sm text-[#d90416]">
                          {generalFormData.healthScore}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={2}
                        value={generalFormData.healthScore}
                        onChange={(e) =>
                          setGeneralFormData({
                            ...generalFormData,
                            healthScore: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#d90416] cursor-pointer h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg"
                      />
                    </div>

                    {/* Bottom buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleCancelGeneral}
                        disabled={isSavingGeneral}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveGeneral}
                        disabled={
                          isSavingGeneral ||
                          !generalFormData.company.trim() ||
                          !contactForm.name.trim() ||
                          !addressForm.city.trim()
                        }
                        className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#d90416] text-white hover:bg-[#b80312] disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSavingGeneral ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SOUS-ONGLET 2: TABLEAUX CONTACTS, ADRESSES & CANAUX */}
            {ficheSubTab === "contacts" && (
              <div className="space-y-6">
                {/* TABLEAU 1: INTERLOCUTEURS */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Tableau des Interlocuteurs ({contactsList.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Cliquez sur le crayon pour modifier un contact puis validez avec l&apos;icône verte.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewContact}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Ajouter un contact
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-zinc-950/50 border-b border-slate-200/70 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-6">Fonction / Rôle</th>
                          <th className="py-3 px-6">Nom & Prénom</th>
                          <th className="py-3 px-6">Email professionnel</th>
                          <th className="py-3 px-6">Téléphone direct</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {contactsList.map((contact) => {
                          const isRowEditing = editingContactId === contact.id;
                          return (
                            <tr
                              key={contact.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                            >
                              {/* Rôle */}
                              <td className="py-3 px-6">
                                {isRowEditing ? (
                                  <input
                                    type="text"
                                    value={contact.role}
                                    onChange={(e) =>
                                      updateContact(contact.id, "role", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <span className="font-bold text-[#d90416]">
                                    {contact.role}
                                  </span>
                                )}
                              </td>

                              {/* Nom */}
                              <td className="py-3 px-6 font-semibold text-slate-800 dark:text-zinc-200">
                                {isRowEditing ? (
                                  <input
                                    type="text"
                                    value={contact.name}
                                    onChange={(e) =>
                                      updateContact(contact.id, "name", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{contact.name}</span>
                                    {contact.isPrimary && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/70 text-[#d90416] border border-red-200 dark:border-red-900 shrink-0">
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        Principal
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Email */}
                              <td className="py-3 px-6 text-slate-600 dark:text-zinc-300">
                                {isRowEditing ? (
                                  <input
                                    type="email"
                                    value={contact.email}
                                    onChange={(e) =>
                                      updateContact(contact.id, "email", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="hover:underline text-slate-700 dark:text-zinc-300"
                                  >
                                    {contact.email}
                                  </a>
                                )}
                              </td>

                              {/* Téléphone */}
                              <td className="py-3 px-6 font-medium text-slate-700 dark:text-zinc-300">
                                {isRowEditing ? (
                                  <input
                                    type="text"
                                    value={contact.phone}
                                    onChange={(e) =>
                                      updateContact(contact.id, "phone", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="hover:underline"
                                  >
                                    {contact.phone}
                                  </a>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-6 text-right">
                                {isRowEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleValidateContactRow(contact.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Valider
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    {!contact.isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetContactAsPrimary(contact.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-[#d90416] text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#d90416] hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                                        title="Définir ce contact comme interlocuteur principal pour le client"
                                      >
                                        <Star className="w-3 h-3" />
                                        <span>Définir principal</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingContactId(contact.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100"
                                      title="Modifier ce contact"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {contactsList.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => deleteContact(contact.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        title="Supprimer ce contact"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLEAU 2: ADRESSES POSTALES (LIVRAISON & SIÈGE) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Tableau des Adresses Postales (Livraison & Siège Social)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Adresse de livraison pour les camions et adresse légale du siège.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewAddress}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une adresse
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-zinc-950/50 border-b border-slate-200/70 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-6">Type d&apos;adresse</th>
                          <th className="py-3 px-6">Libellé du site</th>
                          <th className="py-3 px-6 min-w-[260px]">Rue & Voie (Certifiée BAN)</th>
                          <th className="py-3 px-6 w-[120px]">Code Postal (CP)</th>
                          <th className="py-3 px-6 w-[160px]">Ville</th>
                          <th className="py-3 px-6">Complément / Sas</th>
                          <th className="py-3 px-6 text-right min-w-[150px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {addresses.map((addr) => {
                          const isAddrEditing = editingAddressId === addr.id;
                          return (
                            <tr
                              key={addr.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                            >
                              <td className="py-3 px-6">
                                {isAddrEditing ? (
                                  <select
                                    value={addr.type}
                                    onChange={(e) =>
                                      updateAddress(
                                        addr.id,
                                        "type",
                                        e.target.value as any
                                      )
                                    }
                                    className="rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  >
                                    <option value="LIVRAISON">LIVRAISON</option>
                                    <option value="SIEGE">SIÈGE SOCIAL</option>
                                    <option value="AUTRE">AUTRE</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      addr.type === "LIVRAISON"
                                        ? "bg-red-50 text-[#d90416]"
                                        : addr.type === "SIEGE"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                        : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    }`}
                                  >
                                    {addr.type === "LIVRAISON"
                                      ? "LIVRAISON"
                                      : addr.type === "SIEGE"
                                      ? "SIÈGE SOCIAL"
                                      : "ANNEXE"}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-6 font-semibold text-slate-800 dark:text-zinc-200">
                                {isAddrEditing ? (
                                  <input
                                    type="text"
                                    value={addr.label}
                                    onChange={(e) =>
                                      updateAddress(addr.id, "label", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span>{addr.label}</span>
                                    {addr.isPrimary && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        Principale
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-6 text-slate-700 dark:text-zinc-300">
                                {isAddrEditing ? (
                                  <div className="w-full">
                                    <AddressAutocomplete
                                      value={addr.street}
                                      onChange={(val) => updateAddress(addr.id, "street", val)}
                                      placeholder="Saisir ou rechercher une adresse BAN..."
                                      onSelectAddress={(suggestion) => {
                                        const next = addresses.map((a) => {
                                          if (a.id !== addr.id) return a;
                                          return {
                                            ...a,
                                            street: suggestion.street,
                                            postalCode: suggestion.postalCode,
                                            city: suggestion.city,
                                            zipCity: `${suggestion.postalCode} ${suggestion.city}`.trim(),
                                            coordinates: suggestion.coordinates,
                                          };
                                        });
                                        setAddresses(next);
                                        localStorage.setItem(
                                          `apflow_addresses_v4_${client.id}`,
                                          JSON.stringify(next)
                                        );
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span>{addr.street || "—"}</span>
                                    {addr.coordinates && (
                                      <span
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shrink-0"
                                        title={`Coordonnées GPS validées BAN : ${addr.coordinates[1].toFixed(4)}, ${addr.coordinates[0].toFixed(4)}`}
                                      >
                                        ✓ BAN
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Colonne séparée : CP */}
                              <td className="py-3 px-6 text-slate-700 dark:text-zinc-300">
                                {isAddrEditing ? (
                                  <input
                                    type="text"
                                    value={addr.postalCode || ""}
                                    onChange={(e) =>
                                      updateAddress(addr.id, "postalCode", e.target.value)
                                    }
                                    placeholder="CP (ex: 69007)"
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 font-mono text-xs font-semibold"
                                  />
                                ) : (
                                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                    {addr.postalCode || "—"}
                                  </span>
                                )}
                              </td>

                              {/* Colonne séparée : Ville */}
                              <td className="py-3 px-6 text-slate-700 dark:text-zinc-300 font-semibold">
                                {isAddrEditing ? (
                                  <input
                                    type="text"
                                    value={addr.city || ""}
                                    onChange={(e) =>
                                      updateAddress(addr.id, "city", e.target.value)
                                    }
                                    placeholder="Ville (ex: Lyon)"
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-semibold"
                                  />
                                ) : (
                                  addr.city || addr.zipCity
                                )}
                              </td>

                              <td className="py-3 px-6 text-slate-500">
                                {isAddrEditing ? (
                                  <input
                                    type="text"
                                    value={addr.complement || ""}
                                    onChange={(e) =>
                                      updateAddress(
                                        addr.id,
                                        "complement",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Complément d'adresse"
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  addr.complement || "—"
                                )}
                              </td>

                              <td className="py-3 px-6 text-right">
                                {isAddrEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleValidateAddressRow(addr.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Valider
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    {!addr.isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetAddressAsPrimary(addr.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-[#d90416] text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#d90416] hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                                        title="Définir comme adresse principale affichée sur la fiche client et le tableau"
                                      >
                                        <Star className="w-3 h-3" />
                                        <span>Définir principale</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingAddressId(addr.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100"
                                      title="Modifier cette adresse"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {addresses.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => deleteAddress(addr.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        title="Supprimer cette adresse"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLEAU 3: CANAUX, EMAILS & TÉLÉPHONES PAR SERVICE */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Tableau des Canaux Spécialisés (Emails & Téléphones par Service)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Adresses email et lignes directes : Facturation, Sas/Livraison, Commandes comptoir, Direction.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewChannel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un canal
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-zinc-950/50 border-b border-slate-200/70 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-6">Service / Usage</th>
                          <th className="py-3 px-6">Libellé</th>
                          <th className="py-3 px-6">Email dédié</th>
                          <th className="py-3 px-6">Numéro de téléphone</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {channels.map((chan) => {
                          const isChanEditing = editingChannelId === chan.id;
                          return (
                            <tr
                              key={chan.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                            >
                              <td className="py-3 px-6">
                                {isChanEditing ? (
                                  <input
                                    type="text"
                                    value={chan.type}
                                    onChange={(e) =>
                                      updateChannel(chan.id, "type", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs uppercase font-bold"
                                  />
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 font-bold text-[10px]">
                                    {chan.type}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-6 font-semibold text-slate-800 dark:text-zinc-200">
                                {isChanEditing ? (
                                  <input
                                    type="text"
                                    value={chan.label}
                                    onChange={(e) =>
                                      updateChannel(chan.id, "label", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  chan.label
                                )}
                              </td>

                              <td className="py-3 px-6 text-slate-700 dark:text-zinc-300">
                                {isChanEditing ? (
                                  <input
                                    type="email"
                                    value={chan.email}
                                    onChange={(e) =>
                                      updateChannel(chan.id, "email", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <a
                                    href={`mailto:${chan.email}`}
                                    className="hover:underline text-slate-700 dark:text-zinc-300"
                                  >
                                    {chan.email}
                                  </a>
                                )}
                              </td>

                              <td className="py-3 px-6 font-medium text-slate-700 dark:text-zinc-300">
                                {isChanEditing ? (
                                  <input
                                    type="text"
                                    value={chan.phone}
                                    onChange={(e) =>
                                      updateChannel(chan.id, "phone", e.target.value)
                                    }
                                    className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <a
                                    href={`tel:${chan.phone}`}
                                    className="hover:underline font-semibold text-[#d90416]"
                                  >
                                    {chan.phone}
                                  </a>
                                )}
                              </td>

                              <td className="py-3 px-6 text-right">
                                {isChanEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditingChannelId(null)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Valider
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingChannelId(chan.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                      title="Modifier ce canal"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {channels.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => deleteChannel(chan.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        title="Supprimer ce canal"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SOUS-ONGLET 2: ADMINISTRATIF, RCS, IBAN & BIC (Affichage fiche sobre + Bouton Crayon pour modifier) */}
            {ficheSubTab === "admin" && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Informations Juridiques, Registre du Commerce (RCS) & Coordonnées Bancaires
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEditingAdmin
                        ? "Mode modification actif : modifiez les champs puis cliquez sur 'Valider et Enregistrer'."
                        : "Les informations sont protégées en affichage. Cliquez sur le crayon pour les modifier."}
                    </p>
                  </div>

                  {isEditingAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cancelSection("admin")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSection("admin")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider et Enregistrer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempFicheData(ficheData);
                        setIsEditingAdmin(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#d90416]" />
                      Modifier les données administratives
                    </button>
                  )}
                </div>

                {/* Bloc 1: Registre du Commerce & Identité Juridique */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Registre du Commerce & Sociétés (RCS) & Immatriculation
                    </h4>
                    {!isEditingAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const rcsSummary = `Raison Sociale: ${ficheData.legalName}\nRCS: ${ficheData.rcsCity} (${ficheData.rcsNumber})\nDate: ${ficheData.rcsRegistrationDate}\nCapital: ${ficheData.capitalSocial}\nSIRET: ${ficheData.siret}\nSIREN: ${ficheData.siren}\nTVA: ${ficheData.vatNumber}`;
                          copyToClipboard(rcsSummary, "all_rcs");
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {copiedField === "all_rcs" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Tout le RCS copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copier tout le bloc RCS</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Ligne par ligne: Conteneur liste avec bordures et séparateurs */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-sm">
                    {/* 1. Raison Sociale */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Raison Sociale Officielle
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.legalName || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                legalName: e.target.value,
                              })
                            }
                            placeholder="Ex: AUTO PIECES SERVICES SAS"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 select-all">
                              {ficheData.legalName || "Non renseigné"}
                            </span>
                            {ficheData.legalName && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.legalName, "legalName")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "legalName"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier la raison sociale"
                              >
                                {copiedField === "legalName" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. Inscription RCS (Greffe) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Greffe RCS d&apos;Immatriculation
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.rcsCity || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                rcsCity: e.target.value,
                              })
                            }
                            placeholder="Ex: RCS Lyon"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.rcsCity || "Non renseigné"}
                            </span>
                            {ficheData.rcsCity && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.rcsCity, "rcsCity")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "rcsCity"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le greffe RCS"
                              >
                                {copiedField === "rcsCity" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 3. N° d'Immatriculation RCS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          N° d&apos;Immatriculation RCS
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.rcsNumber || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                rcsNumber: e.target.value,
                              })
                            }
                            placeholder="Ex: 842 910 384 B 01928"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.rcsNumber || "Non renseigné"}
                            </span>
                            {ficheData.rcsNumber && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.rcsNumber, "rcsNumber")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "rcsNumber"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le N° RCS"
                              >
                                {copiedField === "rcsNumber" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 4. Date d'immatriculation RCS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Date d&apos;Immatriculation RCS
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.rcsRegistrationDate || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                rcsRegistrationDate: e.target.value,
                              })
                            }
                            placeholder="JJ/MM/AAAA"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.rcsRegistrationDate || "15/03/2014"}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ficheData.rcsRegistrationDate || "15/03/2014", "rcsRegistrationDate")}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                copiedField === "rcsRegistrationDate"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              title="Copier la date d'immatriculation"
                            >
                              {copiedField === "rcsRegistrationDate" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-semibold text-[11px]">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px]">Copier</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 5. Capital Social */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Capital Social
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.capitalSocial || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                capitalSocial: e.target.value,
                              })
                            }
                            placeholder="Ex: 150 000 €"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.capitalSocial || "150 000 €"}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ficheData.capitalSocial || "150 000 €", "capitalSocial")}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                copiedField === "capitalSocial"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              title="Copier le capital social"
                            >
                              {copiedField === "capitalSocial" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-semibold text-[11px]">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px]">Copier</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 6. Numéro SIRET */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Numéro SIRET (14 chiffres)
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.siret || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                siret: e.target.value,
                              })
                            }
                            placeholder="Ex: 842 910 384 00019"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.siret || "Non renseigné"}
                            </span>
                            {ficheData.siret && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.siret, "siret")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "siret"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le SIRET"
                              >
                                {copiedField === "siret" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 7. Numéro SIREN */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Numéro SIREN (9 chiffres)
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.siren || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                siren: e.target.value,
                              })
                            }
                            placeholder="Ex: 842 910 384"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.siren || "Non renseigné"}
                            </span>
                            {ficheData.siren && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.siren, "siren")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "siren"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le SIREN"
                              >
                                {copiedField === "siren" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 8. TVA Intracommunautaire */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          N° TVA Intracommunautaire
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.vatNumber || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                vatNumber: e.target.value,
                              })
                            }
                            placeholder="Ex: FR 45 842910384"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.vatNumber || "Non renseigné"}
                            </span>
                            {ficheData.vatNumber && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.vatNumber, "vatNumber")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "vatNumber"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le N° de TVA"
                              >
                                {copiedField === "vatNumber" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloc 2: Coordonnées Bancaires (IBAN, BIC, Banque) */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Coordonnées Bancaires (IBAN, BIC & Banque)
                    </h4>
                    {!isEditingAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const ribText = `IBAN: ${ficheData.iban}\nBIC: ${ficheData.bic}\nBanque: ${ficheData.bankName}\nTitulaire: ${ficheData.legalName}`;
                          copyToClipboard(ribText, "all_rib");
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {copiedField === "all_rib" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">RIB complet copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copier le RIB complet</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Ligne par ligne: Conteneur bancaire */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-sm">
                    {/* IBAN */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Numéro IBAN
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.iban || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                iban: e.target.value,
                              })
                            }
                            placeholder="Ex: FR76 3000 4008 9200 0102 9384 756"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-100 select-all tracking-wider">
                              {ficheData.iban || "Non renseigné"}
                            </span>
                            {ficheData.iban && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.iban, "iban")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "iban"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier l'IBAN"
                              >
                                {copiedField === "iban" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* BIC */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Code BIC / SWIFT
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.bic || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                bic: e.target.value,
                              })
                            }
                            placeholder="Ex: BNPAFRPPXXX"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-100 select-all tracking-wider">
                              {ficheData.bic || "Non renseigné"}
                            </span>
                            {ficheData.bic && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.bic, "bic")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "bic"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier le BIC"
                              >
                                {copiedField === "bic" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Établissement Bancaire */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Établissement Bancaire
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <input
                            type="text"
                            value={tempFicheData.bankName || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                bankName: e.target.value,
                              })
                            }
                            placeholder="Ex: BNP Paribas Entreprises"
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          />
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 select-all">
                              {ficheData.bankName || "Non renseigné"}
                            </span>
                            {ficheData.bankName && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ficheData.bankName, "bankName")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  copiedField === "bankName"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                title="Copier la banque"
                              >
                                {copiedField === "bankName" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-[11px]">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">Copier</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloc 3: Pièces Justificatives Client (Kbis, RIB, Fiche Tech) */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Justificatifs & Documents Légaux de Conformité
                  </h4>

                  <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-sm">
                    {/* Document Extrait Kbis */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Extrait Kbis (- de 3 mois)
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <select
                            value={tempFicheData.docKbisStatus || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                docKbisStatus: e.target.value as any,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          >
                            <option value="ATTENTE">En attente client</option>
                            <option value="RECU">Reçu & Conforme (- de 3 mois)</option>
                          </select>
                        ) : (
                          <>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                ficheData.docKbisStatus === "RECU"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {ficheData.docKbisStatus === "RECU"
                                ? "✓ Reçu & Conforme (- de 3 mois)"
                                : "⏳ En attente document client"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  ficheData.docKbisStatus === "RECU"
                                    ? "Extrait Kbis : Reçu & Conforme (- de 3 mois)"
                                    : "Extrait Kbis : En attente client",
                                  "docKbis"
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                copiedField === "docKbis"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              title="Copier le statut Kbis"
                            >
                              {copiedField === "docKbis" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-semibold text-[11px]">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px]">Copier</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Document Relevé d'Identité Bancaire (RIB) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Relevé d&apos;Identité Bancaire (RIB)
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <select
                            value={tempFicheData.docRibStatus || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                docRibStatus: e.target.value as any,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          >
                            <option value="ATTENTE">En attente client</option>
                            <option value="RECU">Reçu & Conforme</option>
                          </select>
                        ) : (
                          <>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                ficheData.docRibStatus === "RECU"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {ficheData.docRibStatus === "RECU"
                                ? "✓ Reçu & Conforme"
                                : "⏳ En attente document client"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  ficheData.docRibStatus === "RECU"
                                    ? "RIB : Reçu & Conforme"
                                    : "RIB : En attente client",
                                  "docRib"
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                copiedField === "docRib"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              title="Copier le statut RIB"
                            >
                              {copiedField === "docRib" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-semibold text-[11px]">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px]">Copier</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Document Fiche Technique signée */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 gap-2.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="sm:w-1/3 min-w-[210px]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400 block">
                          Fiche Technique Signée
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {isEditingAdmin ? (
                          <select
                            value={tempFicheData.docFicheTechStatus || ""}
                            onChange={(e) =>
                              setTempFicheData({
                                ...tempFicheData,
                                docFicheTechStatus: e.target.value as any,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                          >
                            <option value="ATTENTE">En attente client</option>
                            <option value="RECUE">Reçue (En cours d&apos;analyse)</option>
                            <option value="SIGNEE">Remplie & Signée conforme</option>
                          </select>
                        ) : (
                          <>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                ficheData.docFicheTechStatus === "SIGNEE"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : ficheData.docFicheTechStatus === "RECUE"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {ficheData.docFicheTechStatus === "SIGNEE"
                                ? "✓ Remplie & Signée conforme"
                                : ficheData.docFicheTechStatus === "RECUE"
                                ? "⏳ Reçue (En cours d'analyse)"
                                : "⏳ En attente retour client"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  ficheData.docFicheTechStatus === "SIGNEE"
                                    ? "Fiche Technique : Signée conforme"
                                    : "Fiche Technique : En attente",
                                  "docFicheTech"
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                copiedField === "docFicheTech"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              title="Copier le statut Fiche Technique"
                            >
                              {copiedField === "docFicheTech" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-semibold text-[11px]">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px]">Copier</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SOUS-ONGLET 3: COMPTE AUTO PARTNER (Affichage propre + Crayon) */}
            {ficheSubTab === "compte_ap" && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Paramètres du Compte Auto Partner (ERP, Webshop & Accords)
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEditingCompteAP
                        ? "Mode modification actif : modifiez les paramètres puis validez."
                        : "Identifiants, grille de remises et encours. Cliquez sur le crayon pour modifier."}
                    </p>
                  </div>

                  {isEditingCompteAP ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cancelSection("compte_ap")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSection("compte_ap")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider et Enregistrer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempFicheData(ficheData);
                        setIsEditingCompteAP(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#d90416]" />
                      Modifier les paramètres Compte AP
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      N° Client Auto Partner (ERP)
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.apClientNumber || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            apClientNumber: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 font-mono font-bold text-sm text-[#d90416]"
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-sm text-[#d90416]">
                          {ficheData.apClientNumber}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(ficheData.apClientNumber, "apNum")
                          }
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Copier le N° Client AP"
                        >
                          {copiedField === "apNum" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Identifiant Connexion Webshop AP
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.webshopLogin || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            webshopLogin: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                        {ficheData.webshopLogin}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Catalogue TecDoc / Recherche Plaque & VIN
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.tecdocAccess || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            tecdocAccess: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-medium text-slate-700 dark:text-zinc-300">
                        {ficheData.tecdocAccess}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Grille de Remises Pièces
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.discountGrid || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            discountGrid: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                        {ficheData.discountGrid}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Plafond d&apos;Encours Crédit
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.creditLimit || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            creditLimit: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold"
                      />
                    ) : (
                      <p className="font-bold text-slate-900 dark:text-zinc-100">
                        {ficheData.creditLimit}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Modalités de Règlement
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.paymentTerms || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            paymentTerms: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-medium text-slate-700 dark:text-zinc-300">
                        {ficheData.paymentTerms}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Objectif Annuel HT
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.annualTarget || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            annualTarget: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                        {ficheData.annualTarget}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Accord RFA Annuel
                    </span>
                    {isEditingCompteAP ? (
                      <input
                        type="text"
                        value={tempFicheData.rfaAgreement || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            rfaAgreement: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                        {ficheData.rfaAgreement}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SOUS-ONGLET 4: LOGISTIQUE, SAS, CODE-BARRES & PHOTOS */}
            {ficheSubTab === "logistique" && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Dossier Logistique, Sas de Livraison & Photos
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEditingLogistique
                        ? "Mode modification actif : modifiez les accès sas puis validez."
                        : "Consignes transmises au service Transport. Cliquez sur le crayon pour modifier."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Code-barres de livraison */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
                      <QrCode className="w-5 h-5 text-slate-800 dark:text-zinc-200 shrink-0" />
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {ficheData.deliveryBarcode}
                      </span>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="ml-1 p-1 rounded bg-slate-900 text-white hover:bg-slate-800"
                        title="Imprimer"
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                    </div>

                    {isEditingLogistique ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cancelSection("logistique")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold"
                        >
                          <X className="w-3.5 h-3.5" />
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection("logistique")}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Valider
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTempFicheData(ficheData);
                          setIsEditingLogistique(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#d90416]" />
                        Modifier logistique
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Dépôt AP de Rattachement
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.hubDepot || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            hubDepot: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                        {ficheData.hubDepot}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Code Tournée Chauffeur
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.routeTourCode || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            routeTourCode: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono font-bold"
                      />
                    ) : (
                      <p className="font-mono font-bold text-[#d90416]">
                        {ficheData.routeTourCode}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Horaires de Passage
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.deliverySchedule || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            deliverySchedule: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-medium text-slate-700 dark:text-zinc-300">
                        {ficheData.deliverySchedule}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Type d&apos;accès Sas
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.sasAccessType || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            sasAccessType: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                    ) : (
                      <p className="font-medium text-slate-700 dark:text-zinc-300">
                        {ficheData.sasAccessType}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1 md:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-[#d90416] block flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Digicode Sas & Clé / Boîte à clés
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.sasAccessCode || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            sasAccessCode: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono font-bold"
                      />
                    ) : (
                      <p className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                        {ficheData.sasAccessCode}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/80 space-y-1 md:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Instructions Alarme, Emplacement Colis & Reprise des Consignes
                    </span>
                    {isEditingLogistique ? (
                      <input
                        type="text"
                        value={tempFicheData.alarmInstructions || ""}
                        onChange={(e) =>
                          setTempFicheData({
                            ...tempFicheData,
                            alarmInstructions: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                    ) : (
                      <p className="text-slate-700 dark:text-zinc-300">
                        {ficheData.alarmInstructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Galerie de photos logistiques */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#d90416]" />
                        Photos Sas, Camionnette & Clés ({deliveryPhotos.length})
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Conversion automatique JPG, redimensionnement et compression haute fidélité.
                      </p>
                    </div>

                    {/* Upload actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={newPhotoCategory}
                        onChange={(e) =>
                          setNewPhotoCategory(
                            e.target.value as DeliveryPhoto["category"]
                          )
                        }
                        className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#d90416]"
                      >
                        <option value="SAS">Sas de livraison</option>
                        <option value="ACCES_CAMIONNETTE">Accès Camionnette</option>
                        <option value="CLE_DIGICODE">Clé / Digicode</option>
                        <option value="EMPLACEMENT_COLIS">Zone Colis</option>
                      </select>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUploadPhotoFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingPhotos}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isCompressingPhotos ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Ajouter photo(s)
                      </button>
                    </div>
                  </div>

                  {/* Compression Feedback Notifications */}
                  {isCompressingPhotos && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
                      <span>{compressionStatusMsg || "Conversion en JPG et compression en cours..."}</span>
                    </div>
                  )}

                  {compressionSuccessMsg && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs animate-in fade-in">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="font-medium">{compressionSuccessMsg}</span>
                    </div>
                  )}

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPhotos(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingPhotos(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPhotos(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleUploadPhotoFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDraggingPhotos
                        ? "border-[#d90416] bg-[#d90416]/5 scale-[0.99]"
                        : "border-slate-200 dark:border-zinc-800 hover:border-[#d90416]/60 hover:bg-slate-50/50 dark:hover:bg-zinc-950/50"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-zinc-400">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[#d90416]">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Glissez-déposez vos photos ici, ou <span className="text-[#d90416] underline">parcourez</span>
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        PNG, JPG, HEIC, WebP convertis automatiquement en JPG compressé et optimisé (max 1600px)
                      </p>
                    </div>
                  </div>

                  {/* Photos Grid */}
                  {deliveryPhotos.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-zinc-500 text-xs">
                      Aucune photo logistique enregistrée pour ce client.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {deliveryPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="group rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div>
                            <div className="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setPreviewPhotoModal(photo)}>
                              <img
                                src={photo.url}
                                alt={photo.label}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 shadow-lg">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  Agrandir
                                </span>
                              </div>
                              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-semibold backdrop-blur-sm">
                                {photo.category}
                              </span>
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPhoto(photo);
                                  }}
                                  className="p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-[#d90416] transition-all"
                                  title="Télécharger le JPG compressé"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(photo.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                                  title="Supprimer la photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {/* Format & Size badge */}
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-zinc-200 text-[10px] font-mono backdrop-blur-sm">
                                JPG {photo.sizeKb ? `• ${photo.sizeKb} Ko` : ""}
                              </div>
                            </div>
                            <div className="p-3.5 space-y-1">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                {photo.label}
                              </h4>
                              {photo.note && (
                                <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                                  {photo.note}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800">
                                Ajouté le {photo.createdAt}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            ONGLET 3: ONBOARDING & CRÉATION (11 ÉTAPES DONT LE MAIL FINAL)
           ========================================================= */}
        {activeTab === "onboarding" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Résumé */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#d90416]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Progression Onboarding Client
                  </h2>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
                    {onboardingProgress}%
                  </span>
                  <span className="text-xs font-semibold text-[#d90416]">
                    {completedStepsCount} / {onboardingSteps.length} étapes validées
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d90416] rounded-full transition-all duration-300"
                    style={{ width: `${onboardingProgress}%` }}
                  />
                </div>

                {/* Focus sur l'étape 11 : Mail d'onboarding */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 dark:text-zinc-200">
                    Dernière étape clé :
                  </p>
                  <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/50 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
                      <Send className="w-4 h-4 text-[#d90416]" />
                      <span>Étape 11 : Mail d&apos;onboarding client</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                      Envoyer le N° Client AP ({ficheData.apClientNumber}) et le code-barres de livraison ({ficheData.deliveryBarcode}) à imprimer par le client.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        toggleOnboardingStep("envoi_mail_onboarding_client");
                      }}
                      className="w-full py-1.5 rounded-lg bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312]"
                    >
                      {onboardingSteps.find(
                        (s) => s.id === "envoi_mail_onboarding_client"
                      )?.completed
                        ? "✓ Mail d'onboarding validé"
                        : "Marquer comme envoyé au client"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Le workflow complet en 11 étapes regroupées */}
            <div className="lg:col-span-2 space-y-4">
              {phases.map((phaseTitle) => {
                const phaseSteps = onboardingSteps.filter(
                  (s) => s.phase === phaseTitle
                );
                return (
                  <div
                    key={phaseTitle}
                    className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#d90416]">
                      {phaseTitle}
                    </h3>

                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {phaseSteps.map((step) => (
                        <div
                          key={step.id}
                          onClick={() => toggleOnboardingStep(step.id)}
                          className={`py-3.5 flex items-start gap-3.5 cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 px-3 rounded-xl transition-colors ${
                            step.id === "envoi_mail_onboarding_client"
                              ? "bg-red-50/30 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30"
                              : ""
                          }`}
                        >
                          <button type="button" className="mt-0.5 shrink-0">
                            {step.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-zinc-600 group-hover:text-[#d90416]" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-semibold ${
                                  step.completed
                                    ? "line-through text-slate-400 dark:text-zinc-500"
                                    : "text-slate-900 dark:text-zinc-100"
                                }`}
                              >
                                Étape {step.stepNumber} — {step.title}
                              </p>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                                  step.completed
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {step.completed ? "Validé" : "À faire"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET 3: VISITES TERRAIN & PLANIFICATION
           ========================================================= */}
        {activeTab === "visites" && (
          <div className="space-y-6">
            {/* Header de l'onglet Visites */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      Visites Terrain & Rythme de Re-visite — {client.company}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Suivi complet des passages magasin, interlocuteurs rencontrés et planification des prochains rendez-vous
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    <Sliders className="w-3.5 h-3.5 text-[#d90416]" />
                    <span>Délai de re-visite :</span>
                    <select
                      value={clientRevisitInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setClientRevisitInterval(client.id, val);
                        setLocalRevisitInterval(val);
                      }}
                      className="bg-transparent font-bold text-slate-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                    >
                      {REVISIT_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Tous les {opt.value} jours
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddVisitModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Consigner une visite
                  </button>
                </div>
              </div>

              {/* 4 Cartes Métriques Visites */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* 1. Statut de re-visite */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Statut de re-visite
                  </span>
                  <div>
                    {(() => {
                      const vs = getClientVisitStatus(client, clientVisits);
                      if (vs.urgency === "DISABLED") {
                        return (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                              Re-visite désactivée
                            </span>
                            <p className="text-[10px] text-slate-400">Aucun rappel automatique</p>
                          </div>
                        );
                      }
                      if (vs.urgency === "NEVER") {
                        return (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Jamais visité sur place
                            </span>
                            <p className="text-[10px] text-slate-400">Aucun passage consigné</p>
                          </div>
                        );
                      }
                      if (vs.urgency === "OVERDUE") {
                        return (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                              En retard (+{vs.daysOverdue}j)
                            </span>
                            <p className="text-[10px] text-rose-500 font-medium">Re-visite dépassée (rythme {vs.revisitIntervalDays}j)</p>
                          </div>
                        );
                      }
                      if (vs.urgency === "SOON") {
                        const daysLeft = Math.max(0, vs.revisitIntervalDays - (vs.daysSinceLastVisit || 0));
                        return (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              À re-visiter sous {daysLeft}j
                            </span>
                            <p className="text-[10px] text-amber-500 font-medium">Échéance imminente</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            À jour
                          </span>
                          <p className="text-[10px] text-emerald-500 font-medium">Rythme respecté ({vs.revisitIntervalDays}j)</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Dernière visite effectuée */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Dernière visite réalisée
                  </span>
                  <div>
                    {(() => {
                      const vs = getClientVisitStatus(client, clientVisits);
                      if (!vs.lastVisitDate) return <span className="text-xs text-slate-400">Aucune visite</span>;
                      return (
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                            {vs.lastVisitDate.toLocaleDateString("fr-FR")}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Il y a {vs.daysSinceLastVisit} jour{vs.daysSinceLastVisit && vs.daysSinceLastVisit > 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Prochaine visite convenue */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Prochaine visite programmée
                  </span>
                  <div>
                    {(() => {
                      const vs = getClientVisitStatus(client, clientVisits);
                      if (!vs.nextPlannedVisit) {
                        return (
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400">Non planifiée</span>
                            <p className="text-[10px] text-slate-400">Aucun créneau réservé</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(vs.nextPlannedVisit.date).toLocaleDateString("fr-FR")}
                            {vs.nextPlannedVisit.time ? ` à ${vs.nextPlannedVisit.time}` : ""}
                          </span>
                          <p className="text-[10px] text-blue-500 font-medium">Rdv terrain programmé</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Total Visites */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Total au dossier
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                      {clientVisits.length}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      <div>Effectuées : <strong className="text-slate-600 dark:text-zinc-300">{clientVisits.filter(v => v.status === "EFFECTUEE").length}</strong></div>
                      <div>Planifiées : <strong className="text-blue-600">{clientVisits.filter(v => v.status === "PLANIFIEE").length}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barre de sélection de vue : Calendrier vs Liste */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setClientVisitSubTab("calendar")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clientVisitSubTab === "calendar"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                  <span>Vue Calendrier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientVisitSubTab("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clientVisitSubTab === "table"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Vue Tableau Compact</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientVisitSubTab("list")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clientVisitSubTab === "list"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Vue Cartes Détaillées ({clientVisits.length})</span>
                </button>
              </div>

              <span className="text-xs text-slate-400 hidden sm:inline">
                {clientVisitSubTab === "calendar"
                  ? "Calendrier mensuel interactif"
                  : clientVisitSubTab === "table"
                  ? "Tableau compact des visites & notes"
                  : "Historique chronologique détaillé"}
              </span>
            </div>

            {clientVisitSubTab === "calendar" ? (
              <CalendarView
                visits={clientVisits}
                notes={clientNotes}
                defaultClientId={client.id}
                onAddVisit={() => setIsAddVisitModalOpen(true)}
                onAddNote={() => openQuickNote({ clientId: client.id })}
                onSelectVisit={(v) => {
                  const linked = clientNotes.find((n) => n.visitId === v.id || n.content.includes(v.summary.slice(0, 30)));
                  openQuickNote({ clientId: client.id, note: linked || null });
                }}
                onSelectNote={(n) => openQuickNote({ clientId: client.id, note: n })}
              />
            ) : clientVisitSubTab === "table" ? (
              <VisitsNotesTableView
                visits={clientVisits}
                notes={clientNotes}
                defaultClientId={client.id}
                onSelectVisit={(v) => {
                  const linked = clientNotes.find((n) => n.visitId === v.id || n.content.includes(v.summary.slice(0, 30)));
                  openQuickNote({ clientId: client.id, note: linked || null });
                }}
                onSelectNote={(n) => openQuickNote({ clientId: client.id, note: n })}
              />
            ) : (
              <div className="space-y-6">
                {/* Barre de Filtres de l'onglet Visites */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setClientVisitFilterStatus("ALL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                        clientVisitFilterStatus === "ALL"
                          ? "bg-[#d90416] text-white shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50"
                      }`}
                    >
                      Toutes ({clientVisits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientVisitFilterStatus("EFFECTUEE")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                        clientVisitFilterStatus === "EFFECTUEE"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50"
                      }`}
                    >
                      Effectuées ({clientVisits.filter(v => v.status === "EFFECTUEE").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientVisitFilterStatus("PLANIFIEE")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                        clientVisitFilterStatus === "PLANIFIEE"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50"
                      }`}
                    >
                      Planifiées ({clientVisits.filter(v => v.status === "PLANIFIEE").length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={clientVisitFilterType}
                      onChange={(e) => setClientVisitFilterType(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tous les types de visites</option>
                      {(Object.keys(CLIENT_VISIT_TYPES) as ClientVisitType[]).map((t) => (
                        <option key={t} value={t}>
                          {CLIENT_VISIT_TYPES[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Liste complète des cartes de visites */}
                {(() => {
                  const filteredVisits = clientVisits.filter((v) => {
                    const matchStatus = clientVisitFilterStatus === "ALL" || v.status === clientVisitFilterStatus;
                    const matchType = clientVisitFilterType === "ALL" || v.type === clientVisitFilterType;
                    return matchStatus && matchType;
                  });

                  if (filteredVisits.length === 0) {
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 p-12 text-center bg-white dark:bg-zinc-900 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center mx-auto">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                          Aucune visite ne correspond aux filtres
                        </h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Consignez vos passages en magasin ou planifiez vos prochains déplacements terrain pour ce client.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddVisitModalOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-semibold hover:bg-[#b80312] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Consigner une visite maintenant
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5">
                      {filteredVisits.map((visit) => {
                        const typeCfg = CLIENT_VISIT_TYPES[visit.type] || CLIENT_VISIT_TYPES.ROUTINE;
                        const isCompleted = visit.status === "EFFECTUEE";
                        const isPlanned = visit.status === "PLANIFIEE";

                        return (
                          <div
                            key={visit.id}
                            className={`rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md ${
                              isCompleted
                                ? "border-l-4 border-l-emerald-500 border-slate-200/80 dark:border-zinc-800"
                                : isPlanned
                                ? "border-l-4 border-l-blue-500 border-slate-200/80 dark:border-zinc-800"
                                : "border-slate-200/80 dark:border-zinc-800"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeCfg.badgeClass}`}
                                >
                                  {typeCfg.label}
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isCompleted
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : isPlanned
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  }`}
                                >
                                  {isCompleted ? "Effectuée" : isPlanned ? "Planifiée" : "Annulée"}
                                </span>

                                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#d90416]" />
                                  {new Date(visit.date).toLocaleDateString("fr-FR", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                  {visit.time && <span className="font-mono text-slate-500">à {visit.time}</span>}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {visit.interlocutor && (
                                  <span className="text-xs text-slate-600 dark:text-zinc-300 flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                                    <span className="text-slate-400 font-normal">Interlocuteur :</span>
                                    <strong className="font-semibold">{visit.interlocutor}</strong>
                                  </span>
                                )}

                                {/* Bouton direct : Ouvrir la note associée */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const linked = clientNotes.find((n) => n.visitId === visit.id || n.content.includes(visit.summary.slice(0, 30)));
                                    openQuickNote({ clientId: client.id, note: linked || null });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-red-50 hover:text-[#d90416] text-xs font-semibold text-slate-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer"
                                  title="Ouvrir la note associée dans le volet / split-screen"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#d90416]" />
                                  <span>Voir Note</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteVisit(visit.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Supprimer cette visite"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Compte-rendu formaté */}
                            <div className="pt-3.5 text-xs text-slate-700 dark:text-zinc-200 leading-relaxed">
                              <FormattedNoteText content={visit.summary} />
                            </div>

                            {/* Prochaine visite convenue si présente */}
                            {visit.nextVisitDate && (
                              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>Prochaine visite convenue :</span>
                                <strong>
                                  {new Date(visit.nextVisitDate).toLocaleDateString("fr-FR", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </strong>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            ONGLET 4: CHIFFRE D'AFFAIRES (CA MENSUEL & STATISTIQUES)
           ========================================================= */}
        {activeTab === "ca" && (
          <ClientCaSection client={client} />
        )}

        {/* =========================================================
            ONGLET 5: NOTES & SUIVI KAM
           ========================================================= */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            {/* Bannière d'outils et raccourcis Split-screen / Volet latéral */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-gradient-to-r from-red-50/70 via-white to-slate-50/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-xl bg-[#d90416] text-white shadow-sm">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    Espace Notes & Suivi KAM
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#d90416] text-[11px] font-bold">
                      {clientNotes.length} notes
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Comptes-rendus, mémos stratégiques, suivi des litiges et historique commercial de {client.company}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Bouton pour lancer la prise de note latérale / split-screen */}
                <button
                  type="button"
                  onClick={() => openQuickNote({ clientId: client.id })}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition-all hover:shadow hover:scale-[1.01]"
                  title="Ouvrir le panneau rétractable à droite ou le mode split-screen pour naviguer librement dans APFLOW tout en écrivant"
                >
                  <PanelRightClose className="w-4 h-4" />
                  Prise de note latérale / Split-screen
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("visites")}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:border-[#d90416] transition-colors"
                >
                  Voir Visites ({clientVisits.length})
                </button>
              </div>
            </div>

            {/* Formulaire de prise de note amélioré et plus lisible */}
            <form
              onSubmit={handleAddNote}
              className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    Rédiger une nouvelle note sur {client.company}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setNotePinned(!notePinned)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    notePinned
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {notePinned ? "Épinglée en haut" : "Épingler la note"}
                </button>
              </div>

              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Objet de la note (ex: Point visite comptoir, Avenant RFA, Litige livraison)..."
                className="w-full text-xs font-semibold bg-transparent border-b border-slate-200 dark:border-zinc-800 pb-2 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
              />

              <NoteFormattingToolbar
                textareaRef={noteTextareaRef}
                value={noteContent}
                onChange={setNoteContent}
              />

              <textarea
                ref={noteTextareaRef}
                rows={4}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={`Saisissez votre compte-rendu ou votre mémo pour ${client.company}... (Markdown supporté : **gras**, listes, code...)`}
                className="w-full rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/70 p-3.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-[#d90416] resize-none focus:ring-1 focus:ring-red-500/20"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Catégorie :</span>
                  <select
                    value={noteCategory}
                    onChange={(e) =>
                      setNoteCategory(e.target.value as NoteCategory)
                    }
                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#d90416]"
                  >
                    {NOTE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingNote || !noteContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm disabled:opacity-40 transition-all hover:shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {savingNote ? "Enregistrement..." : "Ajouter la note"}
                </button>
              </div>
            </form>

            {/* Barre de contrôle : Filtres par catégorie et Commutateur Vue Grille / Vue Liste */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Historique ({filteredNotes.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Commutateur de Vue (Grille vs Liste) */}
                <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setNoteViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      noteViewMode === "grid"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Grille
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteViewMode("list")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      noteViewMode === "list"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Liste détaillée
                  </button>
                </div>

                {/* Filtres par catégorie */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      categoryFilter === "ALL"
                        ? "bg-[#d90416] text-white"
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-slate-300"
                    }`}
                  >
                    Toutes
                  </button>
                  {NOTE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategoryFilter(cat.value)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        categoryFilter === cat.value
                          ? "bg-[#d90416] text-white"
                          : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-slate-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Affichage des notes selon le mode choisi (Grille ou Liste Détaillée) */}
            {filteredNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 text-center text-xs text-slate-400">
                Aucune note ne correspond aux critères sélectionnés.
              </div>
            ) : noteViewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map((note) => {
                  const catConfig =
                    NOTE_CATEGORIES.find((c) => c.value === note.category) ||
                    NOTE_CATEGORIES[0];
                  return (
                    <div
                      key={note.id}
                      className="group rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-red-300 dark:hover:border-red-900/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            {note.pinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                <Pin className="w-3 h-3" /> Épinglée
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catConfig.badgeClass}`}
                            >
                              {catConfig.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#d90416]" />
                              {formatFullTimestamp(note.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openQuickNote({ clientId: client.id, note })}
                              className="p-1 rounded text-slate-400 hover:text-[#d90416] hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Ouvrir dans le panneau latéral / split-screen"
                            >
                              <PanelRightClose className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditNote(note)}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200"
                              title="Modifier la note"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Supprimer la note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {note.title && (
                          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1.5">
                            {note.title}
                          </h4>
                        )}

                        <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50/70 dark:bg-zinc-950/50 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/60">
                          <FormattedNoteText content={note.content} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Vue Liste Détaillée & Ultra-Lisible */
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const catConfig =
                    NOTE_CATEGORIES.find((c) => c.value === note.category) ||
                    NOTE_CATEGORIES[0];
                  return (
                    <div
                      key={note.id}
                      className="group rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-red-300 dark:hover:border-red-900/40 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {note.pinned && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/30">
                              <Pin className="w-3 h-3" /> Épinglée
                            </span>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${catConfig.badgeClass}`}
                          >
                            {catConfig.label}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#d90416]" />
                            {formatFullTimestamp(note.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openQuickNote({ clientId: client.id, note })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#d90416] hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                            title="Ouvrir dans le panneau latéral / split-screen"
                          >
                            <PanelRightClose className="w-3.5 h-3.5 text-[#d90416]" />
                            Split-screen
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditNote(note)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {note.title && (
                        <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
                          {note.title}
                        </h4>
                      )}

                      <div className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed bg-slate-50/80 dark:bg-zinc-950/60 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                        <FormattedNoteText content={note.content} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal for Logistics Photos */}
      {previewPhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#d90416] text-white text-[11px] font-bold">
                  {previewPhotoModal.category}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {previewPhotoModal.label}
                </h3>
                {previewPhotoModal.sizeKb && (
                  <span className="text-xs text-zinc-400 font-mono">
                    (JPG • {previewPhotoModal.sizeKb} Ko)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(previewPhotoModal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPhotoModal(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="relative max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50 p-2">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.label}
                className="max-h-[72vh] max-w-full object-contain rounded-lg"
              />
            </div>

            {/* Footer */}
            {previewPhotoModal.note && (
              <div className="px-5 py-3 bg-zinc-950/80 border-t border-zinc-800 text-xs text-zinc-300">
                <span className="font-semibold text-zinc-400">Note : </span>
                {previewPhotoModal.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Visit Modal */}
      <AddVisitModal
        isOpen={isAddVisitModalOpen}
        onClose={() => setIsAddVisitModalOpen(false)}
        clients={[client]}
        defaultClientId={client.id}
        activeKamId={activeKamId}
        onSaved={() => {
          setClientVisits(getClientVisits(client.id, client.notes));
          onRefresh();
        }}
      />
    </div>
  );
}
