"use client";

import React, { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Building2,
  Calendar,
  DollarSign,
  ShoppingCart,
  Layers,
  Sparkles,
  Check,
  Trash2,
  MapPin,
  Mail,
  Phone,
  User,
  Info,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";

interface CaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetKamId?: string;
  kamName?: string;
  onSuccess?: () => void;
}

interface TargetFieldDef {
  id: string;
  label: string;
  required: boolean;
  description: string;
  defaultMatches: string[];
}

// Complete set of CRM, CA and AX fields in the requested table structure
const CA_TABLE_FIELDS: TargetFieldDef[] = [
  {
    id: "company",
    label: "Nom de l'Enseigne / Client",
    required: true,
    description: "Raison sociale ou nom d'enseigne (ex: NAMEALIAS ou Textbox)",
    defaultMatches: ["namealias", "company", "nom", "enseigne", "client", "raisonsociale", "nomclient", "raison_sociale"],
  },
  {
    id: "apClientNumber",
    label: "Code Client AP (Compte)",
    required: true,
    description: "Numéro de compte client Auto Partner (ex: ACCOUNTNUM1, Code AP)",
    defaultMatches: ["accountnum1", "accountnum", "codeap", "code_ap", "numeroap", "codeclient", "numclient", "compte", "clientap", "no_client"],
  },
  {
    id: "vatNumber",
    label: "N° TVA Intracommunautaire",
    required: false,
    description: "Numéro de TVA de l'entreprise (ex: VATNUM1)",
    defaultMatches: ["vatnum1", "vatnum", "tva", "numtva", "vat"],
  },
  {
    id: "address",
    label: "Adresse postale (Rue / Voie)",
    required: false,
    description: "Adresse du magasin (ex: ADDRESS, STREET, RUE)",
    defaultMatches: ["address", "adresse", "street", "rue", "voie", "streetname", "address1", "deliveryaddress", "adressevoie", "adressedistr"],
  },
  {
    id: "postalCode",
    label: "Code Postal",
    required: false,
    description: "Code postal d'implantation (ex: ZIPCODE, CP, CODEPOSTAL)",
    defaultMatches: ["zipcode", "zip", "cp", "codepostal", "postalcode", "code_postal", "postcode"],
  },
  {
    id: "city",
    label: "Ville du Magasin",
    required: false,
    description: "Ville d'implantation (ex: CITY, VILLE)",
    defaultMatches: ["city", "ville", "commune", "localite"],
  },
  {
    id: "contactName",
    label: "Nom Contact Principal (Optionnel)",
    required: false,
    description: "Interlocuteur privilégié / responsable magasin",
    defaultMatches: ["contact", "contactname", "interlocuteur", "responsable", "nom_contact"],
  },
  {
    id: "email",
    label: "Email Contact (Optionnel)",
    required: false,
    description: "Adresse email directe de contact (ex: EMAIL)",
    defaultMatches: ["email", "courriel", "mail", "e_mail"],
  },
  {
    id: "phone",
    label: "Téléphone (Optionnel)",
    required: false,
    description: "Téléphone direct ou portable (ex: PHONE, TEL)",
    defaultMatches: ["phone", "tel", "telephone", "portable", "mobile"],
  },
  {
    id: "kamName",
    label: "Commercial / KAM assigné",
    required: false,
    description: "Gestionnaire du compte (ex: PH, Commercial)",
    defaultMatches: ["ph", "kam", "commercial", "gestionnaire", "responsable_kam"],
  },
  {
    id: "month",
    label: "Date / Période Facture (CA)",
    required: false,
    description: "Format AAAA-MM, JJ/MM/AAAA ou Mois 1-12 (ex: INVOICEDATE)",
    defaultMatches: ["invoicedate", "date", "periode", "mois", "month", "datefacture"],
  },
  {
    id: "year",
    label: "Année / Exercice (Optionnel)",
    required: false,
    description: "Année comptable (ex: 2025, 2026) si séparée de la date",
    defaultMatches: ["annee", "year", "exercice", "periode_annee"],
  },
  {
    id: "amount",
    label: "Montant CA Facturé (€ HT)",
    required: true,
    description: "Chiffre d'affaires facturé mensuel (ex: AMOUNT, CA_HT)",
    defaultMatches: ["amount", "ca", "montant", "caht", "chiffreaffaires", "totalca", "ventes", "ca_ht"],
  },
  {
    id: "ordersCount",
    label: "Nombre de Commandes (Optionnel)",
    required: false,
    description: "Quantité ou volume de commandes du mois (ex: ORDERS)",
    defaultMatches: ["orders", "commandes", "qte", "nbcommandes", "volume", "nb_commandes"],
  },
  {
    id: "target",
    label: "Objectif Commercial (€ HT) (Optionnel)",
    required: false,
    description: "Objectif de chiffre d'affaires (Optionnel)",
    defaultMatches: ["target", "objectif", "obj", "cible"],
  },
];

const AX_TABLE_FIELDS: TargetFieldDef[] = [
  {
    id: "company",
    label: "Nom de l'Enseigne / Client",
    required: false,
    description: "Raison sociale ou nom d'enseigne (ex: NAMEALIAS ou Client)",
    defaultMatches: ["namealias", "company", "nom", "enseigne", "client", "raisonsociale", "nomclient"],
  },
  {
    id: "apClientNumber",
    label: "Code Client AP (Compte)",
    required: true,
    description: "Numéro de compte client Auto Partner (ex: ACCOUNTNUM1, Code AP)",
    defaultMatches: ["accountnum1", "accountnum", "codeap", "code_ap", "numeroap", "codeclient", "numclient", "compte", "clientap", "no_client"],
  },
  {
    id: "month",
    label: "Date ou Période d'Achat AX",
    required: false,
    description: "Format AAAA-MM, JJ/MM/AAAA ou Mois 1-12 (ex: DATE, MOIS)",
    defaultMatches: ["date", "periode", "mois", "month", "invoicedate", "dateachat", "date_achat"],
  },
  {
    id: "year",
    label: "Année / Exercice (Optionnel)",
    required: false,
    description: "Année comptable si séparée (ex: 2025, 2026)",
    defaultMatches: ["annee", "year", "exercice", "periode_annee"],
  },
  {
    id: "axPurchases",
    label: "Montant Achats AX (€ HT)",
    required: true,
    description: "Montant des achats enregistrés dans AX (ex: ACHATS, AX, ACHATS_AX)",
    defaultMatches: ["ax", "achats", "achatsax", "montantax", "achat", "purchases", "achats_ax", "montant_ax", "total_ax"],
  },
  {
    id: "address",
    label: "Adresse postale (Optionnel si dans AX)",
    required: false,
    description: "Adresse du magasin",
    defaultMatches: ["address", "adresse", "street", "rue", "voie"],
  },
  {
    id: "postalCode",
    label: "Code Postal (Optionnel)",
    required: false,
    description: "Code postal d'implantation",
    defaultMatches: ["zipcode", "zip", "cp", "codepostal", "postalcode"],
  },
  {
    id: "city",
    label: "Ville du Magasin (Optionnel)",
    required: false,
    description: "Ville d'implantation",
    defaultMatches: ["city", "ville", "commune"],
  },
  {
    id: "email",
    label: "Email Contact (Optionnel)",
    required: false,
    description: "Adresse email directe",
    defaultMatches: ["email", "courriel", "mail"],
  },
  {
    id: "phone",
    label: "Téléphone (Optionnel)",
    required: false,
    description: "Téléphone direct",
    defaultMatches: ["phone", "tel", "telephone"],
  },
];

function cleanNumber(val: string | undefined): number {
  if (!val) return 0;
  const str = val.toString().replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parsePeriod(rawDate: string | undefined, defaultYear: number): { year: number; month: number } {
  if (!rawDate) return { year: defaultYear, month: 0 };
  const s = rawDate.trim();
  if (!s) return { year: defaultYear, month: 0 };

  // Match YYYY-MM or YYYY/MM or YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    return { year: y, month: m >= 1 && m <= 12 ? m : 0 };
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const frFullMatch = s.match(/^\d{1,2}[-/](\d{1,2})[-/](\d{4})/);
  if (frFullMatch) {
    const m = parseInt(frFullMatch[1], 10);
    const y = parseInt(frFullMatch[2], 10);
    return { year: y, month: m >= 1 && m <= 12 ? m : 0 };
  }

  // Match MM/YYYY or MM-YYYY
  const frMonthYearMatch = s.match(/^(\d{1,2})[-/](\d{4})/);
  if (frMonthYearMatch) {
    const m = parseInt(frMonthYearMatch[1], 10);
    const y = parseInt(frMonthYearMatch[2], 10);
    return { year: y, month: m >= 1 && m <= 12 ? m : 0 };
  }

  // Plain number month (1 to 12)
  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return { year: defaultYear, month: num };
  }

  return { year: defaultYear, month: 0 };
}

interface ParsedCsvFile {
  fileName: string;
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
}

export function CaImportModal({ isOpen, onClose, onSuccess }: CaImportModalProps) {
  const { clients, refreshWorkspace } = useWorkspace();
  const caFileInputRef = useRef<HTMLInputElement>(null);
  const axFileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "success">("upload");
  const [activeMappingTab, setActiveMappingTab] = useState<"CA" | "AX">("CA");
  const [selectedDefaultYear, setSelectedDefaultYear] = useState<number>(new Date().getFullYear());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File 1: CA Sales File
  const [caFile, setCaFile] = useState<ParsedCsvFile | null>(null);

  // File 2: AX Purchases File
  const [axFile, setAxFile] = useState<ParsedCsvFile | null>(null);

  const [importResult, setImportResult] = useState<{
    total: number;
    matchedCount: number;
    unmatchedCount: number;
    unmatchedItems: string[];
  } | null>(null);

  function resetState() {
    setStep("upload");
    setCaFile(null);
    setAxFile(null);
    setActiveMappingTab("CA");
    setErrorMsg(null);
    setImportResult(null);
  }

  function parseCsvContent(text: string): { headers: string[]; rows: string[][] } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error("Le fichier CSV est vide ou ne contient aucune ligne de données.");
    }

    const firstLine = lines[0].replace(/^\uFEFF/, "");
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      rows.push(cells);
    }
    return { headers, rows };
  }

  function handleCaFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";
        const { headers, rows } = parseCsvContent(text);

        // Smart auto-mapping for CA
        const autoMap: Record<string, string> = {};
        CA_TABLE_FIELDS.forEach((target) => {
          const matched = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return target.defaultMatches.some((m) => cleanH.includes(m.replace(/[^a-z0-9]/g, "")));
          });
          if (matched) autoMap[target.id] = matched;
        });

        setCaFile({
          fileName: file.name,
          headers,
          rows,
          mapping: autoMap,
        });
        setActiveMappingTab("CA");
      } catch (err: any) {
        setErrorMsg("Erreur lors de la lecture du fichier CA : " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleAxFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";
        const { headers, rows } = parseCsvContent(text);

        // Smart auto-mapping for AX
        const autoMap: Record<string, string> = {};
        AX_TABLE_FIELDS.forEach((target) => {
          const matched = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return target.defaultMatches.some((m) => cleanH.includes(m.replace(/[^a-z0-9]/g, "")));
          });
          if (matched) autoMap[target.id] = matched;
        });

        setAxFile({
          fileName: file.name,
          headers,
          rows,
          mapping: autoMap,
        });
        if (!caFile) {
          setActiveMappingTab("AX");
        }
      } catch (err: any) {
        setErrorMsg("Erreur lors de la lecture du fichier AX : " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Pre-aggregated preview merging both CA and AX files by Client and Period
  const consolidatedRows = useMemo(() => {
    if (!caFile && !axFile) return [];

    interface ConsolidatedRow {
      key: string;
      apCode: string;
      company: string;
      address?: string;
      postalCode?: string;
      city?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      matchedClient: string | null;
      year: number;
      month: number;
      amount?: number;
      axPurchases?: number;
      ordersCount?: number;
      target?: number;
      source: "BOTH" | "CA_ONLY" | "AX_ONLY";
    }

    const rowMap = new Map<string, ConsolidatedRow>();

    // 1. Process CA file if present
    if (caFile) {
      const apIdx = caFile.mapping.apClientNumber ? caFile.headers.indexOf(caFile.mapping.apClientNumber) : -1;
      const compIdx = caFile.mapping.company ? caFile.headers.indexOf(caFile.mapping.company) : -1;
      const addrIdx = caFile.mapping.address ? caFile.headers.indexOf(caFile.mapping.address) : -1;
      const cpIdx = caFile.mapping.postalCode ? caFile.headers.indexOf(caFile.mapping.postalCode) : -1;
      const cityIdx = caFile.mapping.city ? caFile.headers.indexOf(caFile.mapping.city) : -1;
      const contactIdx = caFile.mapping.contactName ? caFile.headers.indexOf(caFile.mapping.contactName) : -1;
      const emailIdx = caFile.mapping.email ? caFile.headers.indexOf(caFile.mapping.email) : -1;
      const phoneIdx = caFile.mapping.phone ? caFile.headers.indexOf(caFile.mapping.phone) : -1;
      const yearIdx = caFile.mapping.year ? caFile.headers.indexOf(caFile.mapping.year) : -1;
      const monthIdx = caFile.mapping.month ? caFile.headers.indexOf(caFile.mapping.month) : -1;
      const amountIdx = caFile.mapping.amount ? caFile.headers.indexOf(caFile.mapping.amount) : -1;
      const ordersIdx = caFile.mapping.ordersCount ? caFile.headers.indexOf(caFile.mapping.ordersCount) : -1;
      const targetIdx = caFile.mapping.target ? caFile.headers.indexOf(caFile.mapping.target) : -1;

      caFile.rows.forEach((row) => {
        const apCode = apIdx >= 0 ? row[apIdx]?.trim() : "";
        const company = compIdx >= 0 ? row[compIdx]?.trim() : "";
        if (!apCode && !company) return;

        let year = yearIdx >= 0 ? parseInt(row[yearIdx], 10) : selectedDefaultYear;
        if (isNaN(year)) year = selectedDefaultYear;

        let month = 0;
        if (monthIdx >= 0) {
          const parsed = parsePeriod(row[monthIdx], year);
          if (parsed.year) year = parsed.year;
          month = parsed.month;
        }

        const amount = amountIdx >= 0 ? cleanNumber(row[amountIdx]) : 0;
        const orders = ordersIdx >= 0 ? parseInt(row[ordersIdx], 10) || 0 : 0;
        const target = targetIdx >= 0 ? cleanNumber(row[targetIdx]) : 0;

        const addr = addrIdx >= 0 ? row[addrIdx]?.trim() : undefined;
        const cp = cpIdx >= 0 ? row[cpIdx]?.trim() : undefined;
        const city = cityIdx >= 0 ? row[cityIdx]?.trim() : undefined;
        const contact = contactIdx >= 0 ? row[contactIdx]?.trim() : undefined;
        const email = emailIdx >= 0 ? row[emailIdx]?.trim() : undefined;
        const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined;

        const lookupCode = apCode.toLowerCase();
        const matched = clients.find(
          (c) =>
            (lookupCode && c.apClientNumber && c.apClientNumber.trim().toLowerCase() === lookupCode) ||
            (company && c.company.toLowerCase().includes(company.toLowerCase()))
        );

        const groupKey = `${(apCode || company).toLowerCase()}_${year}_${month}`;

        if (!rowMap.has(groupKey)) {
          rowMap.set(groupKey, {
            key: groupKey,
            apCode,
            company: company || (matched ? matched.company : ""),
            address: addr || (matched ? matched.address || undefined : undefined),
            postalCode: cp || (matched ? matched.postalCode || undefined : undefined),
            city: city || (matched ? matched.city : "France"),
            contactName: contact || (matched ? matched.contactName : undefined),
            email: email || (matched ? matched.email : undefined),
            phone: phone || (matched ? matched.phone : undefined),
            matchedClient: matched ? matched.company : null,
            year,
            month,
            amount,
            ordersCount: orders,
            target,
            source: "CA_ONLY",
          });
        } else {
          const existing = rowMap.get(groupKey)!;
          existing.amount = (existing.amount || 0) + amount;
          if (orders) existing.ordersCount = (existing.ordersCount || 0) + orders;
          if (addr && !existing.address) existing.address = addr;
          if (cp && !existing.postalCode) existing.postalCode = cp;
          if (city && !existing.city) existing.city = city;
          if (email && !existing.email) existing.email = email;
          if (phone && !existing.phone) existing.phone = phone;
        }
      });
    }

    // 2. Process AX file if present
    if (axFile) {
      const apIdx = axFile.mapping.apClientNumber ? axFile.headers.indexOf(axFile.mapping.apClientNumber) : -1;
      const compIdx = axFile.mapping.company ? axFile.headers.indexOf(axFile.mapping.company) : -1;
      const addrIdx = axFile.mapping.address ? axFile.headers.indexOf(axFile.mapping.address) : -1;
      const cpIdx = axFile.mapping.postalCode ? axFile.headers.indexOf(axFile.mapping.postalCode) : -1;
      const cityIdx = axFile.mapping.city ? axFile.headers.indexOf(axFile.mapping.city) : -1;
      const emailIdx = axFile.mapping.email ? axFile.headers.indexOf(axFile.mapping.email) : -1;
      const phoneIdx = axFile.mapping.phone ? axFile.headers.indexOf(axFile.mapping.phone) : -1;
      const yearIdx = axFile.mapping.year ? axFile.headers.indexOf(axFile.mapping.year) : -1;
      const monthIdx = axFile.mapping.month ? axFile.headers.indexOf(axFile.mapping.month) : -1;
      const axIdx = axFile.mapping.axPurchases ? axFile.headers.indexOf(axFile.mapping.axPurchases) : -1;

      axFile.rows.forEach((row) => {
        const apCode = apIdx >= 0 ? row[apIdx]?.trim() : "";
        const company = compIdx >= 0 ? row[compIdx]?.trim() : "";
        if (!apCode && !company) return;

        let year = yearIdx >= 0 ? parseInt(row[yearIdx], 10) : selectedDefaultYear;
        if (isNaN(year)) year = selectedDefaultYear;

        let month = 0;
        if (monthIdx >= 0) {
          const parsed = parsePeriod(row[monthIdx], year);
          if (parsed.year) year = parsed.year;
          month = parsed.month;
        }

        const axVal = axIdx >= 0 ? cleanNumber(row[axIdx]) : 0;
        const addr = addrIdx >= 0 ? row[addrIdx]?.trim() : undefined;
        const cp = cpIdx >= 0 ? row[cpIdx]?.trim() : undefined;
        const city = cityIdx >= 0 ? row[cityIdx]?.trim() : undefined;
        const email = emailIdx >= 0 ? row[emailIdx]?.trim() : undefined;
        const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined;

        const lookupCode = apCode.toLowerCase();
        const matched = clients.find(
          (c) =>
            (lookupCode && c.apClientNumber && c.apClientNumber.trim().toLowerCase() === lookupCode) ||
            (company && c.company.toLowerCase().includes(company.toLowerCase()))
        );

        const groupKey = `${(apCode || company).toLowerCase()}_${year}_${month}`;

        if (!rowMap.has(groupKey)) {
          rowMap.set(groupKey, {
            key: groupKey,
            apCode,
            company: company || (matched ? matched.company : ""),
            address: addr || (matched ? matched.address || undefined : undefined),
            postalCode: cp || (matched ? matched.postalCode || undefined : undefined),
            city: city || (matched ? matched.city : "France"),
            email: email || (matched ? matched.email : undefined),
            phone: phone || (matched ? matched.phone : undefined),
            matchedClient: matched ? matched.company : null,
            year,
            month,
            axPurchases: axVal,
            source: "AX_ONLY",
          });
        } else {
          const existing = rowMap.get(groupKey)!;
          existing.axPurchases = (existing.axPurchases || 0) + axVal;
          existing.source = "BOTH";
          if (!existing.matchedClient && matched) {
            existing.matchedClient = matched.company;
          }
          if (addr && !existing.address) existing.address = addr;
          if (cp && !existing.postalCode) existing.postalCode = cp;
          if (city && !existing.city) existing.city = city;
          if (email && !existing.email) existing.email = email;
          if (phone && !existing.phone) existing.phone = phone;
        }
      });
    }

    return Array.from(rowMap.values());
  }, [caFile, axFile, selectedDefaultYear, clients]);

  async function handleConfirmImport() {
    setStep("importing");
    setErrorMsg(null);

    const payloadRows = consolidatedRows.map((r) => ({
      apClientNumber: r.apCode || undefined,
      company: r.company || undefined,
      address: r.address || undefined,
      postalCode: r.postalCode || undefined,
      city: r.city || undefined,
      contactName: r.contactName || undefined,
      email: r.email || undefined,
      phone: r.phone || undefined,
      year: r.year,
      month: r.month,
      amount: r.amount !== undefined ? r.amount : undefined,
      axPurchases: r.axPurchases !== undefined ? r.axPurchases : undefined,
      ordersCount: r.ordersCount !== undefined ? r.ordersCount : undefined,
      target: r.target !== undefined ? r.target : undefined,
    }));

    try {
      const res = await fetch("/api/ca/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payloadRows }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      const result = await res.json();
      setImportResult(result);
      setStep("success");
      window.dispatchEvent(new CustomEvent("apflow_ca_changed"));
      await refreshWorkspace();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur lors du traitement de l'import");
      setStep("mapping");
    }
  }

  if (!isOpen) return null;

  const totalCA = consolidatedRows.reduce((acc, r) => acc + (r.amount || 0), 0);
  const totalAX = consolidatedRows.reduce((acc, r) => acc + (r.axPurchases || 0), 0);
  const bothCount = consolidatedRows.filter((r) => r.source === "BOTH").length;

  // Currently active file and fields for the Table Mapping view
  const currentActiveFile = activeMappingTab === "CA" ? caFile : axFile;
  const currentTableFields = activeMappingTab === "CA" ? CA_TABLE_FIELDS : AX_TABLE_FIELDS;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Importation Données CA &amp; Achats AX</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  Double Fichier CSV &amp; Coordonnées
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Alimentation automatique de la base clients, adresses, contacts, CA et achats AX par Code AP
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-zinc-800/60 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                step === "upload" ? "text-[#d90416] font-bold" : caFile || axFile ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white dark:bg-zinc-900 border font-bold">
                1
              </span>
              <span>1. Choix des fichiers CSV</span>
            </span>

            <span className="text-slate-300">→</span>

            <span
              className={`font-semibold flex items-center gap-1.5 ${
                step === "mapping" ? "text-[#d90416] font-bold" : step === "preview" || step === "success" ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white dark:bg-zinc-900 border font-bold">
                2
              </span>
              <span>2. Validation du Mapping (Tableau)</span>
            </span>

            <span className="text-slate-300">→</span>

            <span
              className={`font-semibold flex items-center gap-1.5 ${
                step === "preview" ? "text-[#d90416] font-bold" : step === "success" ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white dark:bg-zinc-900 border font-bold">
                3
              </span>
              <span>3. Rapprochement &amp; Aperçu</span>
            </span>
          </div>

          {/* Default Year selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 hidden sm:inline">Année par défaut :</span>
            <select
              value={selectedDefaultYear}
              onChange={(e) => setSelectedDefaultYear(Number(e.target.value))}
              className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-xs text-slate-800 dark:text-zinc-100"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: DUAL FILE UPLOAD */}
          {step === "upload" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD 1: CA SALES FILE */}
                <div
                  className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                    caFile
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#d90416] bg-slate-50/40 dark:bg-zinc-950/30"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416] flex items-center justify-center">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                            Fichier 1 : Ventes &amp; CA Facturé
                          </h4>
                          <span className="text-[10px] text-slate-400">Rapport de facturation ventes</span>
                        </div>
                      </div>
                      {caFile && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Fichier prêt
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Rapport CSV contenant les ventes : Code AP, Raison sociale, Adresse, CP, Ville, Mail, Téléphone, et Montant CA HT.
                    </p>

                    {caFile ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/60 space-y-1 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 font-mono truncate">
                          📄 {caFile.fileName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>{caFile.rows.length} lignes analysées</span>
                          <span>{caFile.headers.length} colonnes</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => caFileInputRef.current?.click()}
                        className="py-6 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-center cursor-pointer transition"
                      >
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                          Sélectionnez le fichier CSV CA (Ventes)
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Format .csv (virgule ou point-virgule)</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <input
                      ref={caFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCaFileSelected}
                      className="hidden"
                    />
                    {caFile ? (
                      <>
                        <button
                          type="button"
                          onClick={() => caFileInputRef.current?.click()}
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Remplacer le fichier
                        </button>
                        <button
                          type="button"
                          onClick={() => setCaFile(null)}
                          className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Optionnel si vous n&apos;importez que les achats AX</span>
                    )}
                  </div>
                </div>

                {/* CARD 2: AX PURCHASES FILE */}
                <div
                  className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                    axFile
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-dashed border-slate-300 dark:border-zinc-700 hover:border-purple-600 bg-slate-50/40 dark:bg-zinc-950/30"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                            Fichier 2 : Achats AX (Plateforme ERP)
                          </h4>
                          <span className="text-[10px] text-slate-400">Rapport d&apos;achats magasin</span>
                        </div>
                      </div>
                      {axFile && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Fichier prêt
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Rapport CSV contenant les achats AX : Code Client AP, Période/Mois, et Montant Achats (€ HT).
                    </p>

                    {axFile ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/60 space-y-1 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 font-mono truncate">
                          📄 {axFile.fileName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>{axFile.rows.length} lignes analysées</span>
                          <span>{axFile.headers.length} colonnes</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => axFileInputRef.current?.click()}
                        className="py-6 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-center cursor-pointer transition"
                      >
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                          Sélectionnez le fichier CSV Achats AX
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Format .csv (virgule ou point-virgule)</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <input
                      ref={axFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleAxFileSelected}
                      className="hidden"
                    />
                    {axFile ? (
                      <>
                        <button
                          type="button"
                          onClick={() => axFileInputRef.current?.click()}
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Remplacer le fichier
                        </button>
                        <button
                          type="button"
                          onClick={() => setAxFile(null)}
                          className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Optionnel si vous n&apos;importez que le CA</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bottom */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-zinc-400">
                  {caFile && axFile ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Les 2 fichiers CSV sont prêts. Vous allez pouvoir valider le mapping de chaque fichier sous forme de tableau.
                    </span>
                  ) : caFile ? (
                    <span>Fichier CA chargé. Vous pouvez également ajouter le fichier AX ou continuer directement.</span>
                  ) : axFile ? (
                    <span>Fichier AX chargé. Vous pouvez également ajouter le fichier CA ou continuer directement.</span>
                  ) : (
                    <span>Veuillez sélectionner au moins un fichier CSV (CA ou AX) pour continuer.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!caFile && !axFile}
                  onClick={() => {
                    setActiveMappingTab(caFile ? "CA" : "AX");
                    setStep("mapping");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Passer au Mapping (Tableau)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: EXACT REQUESTED TABLE MAPPING */}
          {step === "mapping" && currentActiveFile && (
            <div className="space-y-4">
              {/* Tab Selector if both files present */}
              {caFile && axFile && (
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setActiveMappingTab("CA")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      activeMappingTab === "CA"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#d90416]" />
                    <span>Tableau Mapping Fichier CA ({caFile.fileName})</span>
                    {caFile.mapping.amount && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Mappé" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMappingTab("AX")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      activeMappingTab === "AX"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tableau Mapping Fichier AX ({axFile.fileName})</span>
                    {axFile.mapping.axPurchases && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Mappé" />
                    )}
                  </button>
                </div>
              )}

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    Fichier en cours de mapping :
                  </span>{" "}
                  <span className="font-mono text-[#d90416] font-bold">{currentActiveFile.fileName}</span> (
                  {currentActiveFile.rows.length} lignes, {currentActiveFile.headers.length} colonnes)
                </div>
                <div className="text-[11px] text-slate-500">
                  Vérifiez ou adaptez les correspondances ci-dessous avant d&apos;importer.
                </div>
              </div>

              {/* THE EXACT REQUESTED MAPPING TABLE */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4 w-1/3">Champ CRM Auto Partner</th>
                      <th className="py-2.5 px-4 w-1/3">Colonne détectée dans votre CSV</th>
                      <th className="py-2.5 px-4 w-1/3">Exemple de valeur (Ligne 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
                    {currentTableFields.map((field) => {
                      const selectedHeader = currentActiveFile.mapping[field.id] || "";
                      const selectedIdx = currentActiveFile.headers.indexOf(selectedHeader);
                      const sampleValue =
                        selectedIdx >= 0 && currentActiveFile.rows[0] ? currentActiveFile.rows[0][selectedIdx] : "—";

                      return (
                        <tr key={field.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
                              <span>{field.label}</span>
                              {field.required && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/50 px-1 rounded">
                                  Requis
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{field.description}</p>
                          </td>

                          <td className="py-2.5 px-4">
                            <select
                              value={selectedHeader}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (activeMappingTab === "CA" && caFile) {
                                  setCaFile({
                                    ...caFile,
                                    mapping: { ...caFile.mapping, [field.id]: val },
                                  });
                                } else if (activeMappingTab === "AX" && axFile) {
                                  setAxFile({
                                    ...axFile,
                                    mapping: { ...axFile.mapping, [field.id]: val },
                                  });
                                }
                              }}
                              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-[#d90416] ${
                                selectedHeader
                                  ? "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-zinc-100 font-bold"
                                  : field.required
                                  ? "border-red-300 bg-red-50/20 text-slate-500"
                                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500"
                              }`}
                            >
                              <option value="">-- Ignorer / Non mappé --</option>
                              {currentActiveFile.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-4">
                            <span className="font-mono text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] max-w-[220px] truncate inline-block">
                              {sampleValue || "(vide)"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Navigation Action */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Changer les fichiers
                </button>

                <div className="flex items-center gap-2">
                  {caFile && axFile && activeMappingTab === "CA" && (
                    <button
                      type="button"
                      onClick={() => setActiveMappingTab("AX")}
                      className="px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-50"
                    >
                      Tableau Fichier AX →
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep("preview")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <span>Prévisualiser les clients ({consolidatedRows.length})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONSOLIDATED PREVIEW TABLE */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Enregistrements</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {consolidatedRows.length}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                    CA + AX Rapprochés
                  </div>
                  <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {bothCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                  <div className="text-[10px] uppercase font-bold text-[#d90416]">Total CA HT</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {totalCA.toLocaleString("fr-FR")} €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                  <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400">Total Achats AX</div>
                  <div className="text-base font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                    {totalAX.toLocaleString("fr-FR")} €
                  </div>
                </div>
              </div>

              {/* Detailed Consolidated Table */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-semibold sticky top-0 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2.5">Code AP</th>
                      <th className="p-2.5">Enseigne / Client</th>
                      <th className="p-2.5">Adresse &amp; CP</th>
                      <th className="p-2.5">Ville</th>
                      <th className="p-2.5">Période</th>
                      <th className="p-2.5 text-right">CA Facturé</th>
                      <th className="p-2.5 text-right">Achats AX</th>
                      <th className="p-2.5 text-center">Rapprochement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
                    {consolidatedRows.slice(0, 100).map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 font-mono text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                          {r.apCode || "—"}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                          <div className="truncate max-w-[180px]">{r.company || r.matchedClient || "Client Inconnu"}</div>
                          {r.contactName && <div className="text-[10px] text-slate-400 font-normal">{r.contactName}</div>}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-zinc-300 text-[11px]">
                          {r.address ? (
                            <div>
                              <div className="truncate max-w-[160px]">{r.address}</div>
                              {r.postalCode && <span className="font-mono text-slate-400 text-[10px]">{r.postalCode}</span>}
                            </div>
                          ) : r.postalCode ? (
                            <span className="font-mono text-[11px]">{r.postalCode}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-zinc-300">
                          {r.city || "—"}
                        </td>
                        <td className="p-2.5 text-slate-500 font-mono">
                          {r.month > 0 ? `${r.month.toString().padStart(2, "0")}/` : "Annuel "}{r.year}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {r.amount !== undefined ? `${r.amount.toLocaleString("fr-FR")} €` : "—"}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-purple-700 dark:text-purple-300">
                          {r.axPurchases !== undefined ? `${r.axPurchases.toLocaleString("fr-FR")} €` : "—"}
                        </td>
                        <td className="p-2.5 text-center">
                          {r.source === "BOTH" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              <Check className="w-3 h-3" /> CA + AX
                            </span>
                          ) : r.source === "CA_ONLY" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 dark:bg-red-950/40 text-[#d90416]">
                              CA seul
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                              AX seul
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {consolidatedRows.length > 100 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Affichage des 100 premières lignes sur {consolidatedRows.length} au total
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("mapping")}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Modifier le mappage
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-md active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Confirmer l&apos;importation ({consolidatedRows.length} enregistrements)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORTING */}
          {step === "importing" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center mx-auto animate-spin">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                  Synchronisation MySQL en cours...
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Enregistrement des adresses, coordonnées, montants CA et achats AX par Code AP
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Importation terminée avec succès !
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {importResult?.matchedCount ?? 0} enregistrements de CA &amp; AX synchronisés en base de données.
                </p>
              </div>

              {importResult && importResult.unmatchedCount > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-left text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">
                    {importResult.unmatchedCount} ligne(s) non rattachée(s) :
                  </p>
                  <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    {importResult.unmatchedItems.join(", ")}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetState();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition"
                >
                  Fermer et afficher les données
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
