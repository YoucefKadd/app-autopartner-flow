"use client";

import React, { useState, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  SlidersHorizontal,
  Table as TableIcon,
  Sparkles,
  Info,
} from "lucide-react";
import { MONTH_NAMES } from "@/components/ClientCaSection";

export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  targetKamId?: string;
  kamName?: string;
}

// System CRM fields that can be mapped
export interface CRMTargetField {
  id: string;
  label: string;
  required: boolean;
  description: string;
  defaultCsvMatches: string[];
}

const CRM_TARGET_FIELDS: CRMTargetField[] = [
  {
    id: "company",
    label: "Nom de l'Enseigne / Client",
    required: true,
    description: "Raison sociale ou nom d'enseigne (ex: NAMEALIAS ou Textbox)",
    defaultCsvMatches: ["namealias", "company", "nom", "enseigne", "client", "raison sociale", "nom client"],
  },
  {
    id: "apClientNumber",
    label: "Code Client AP (Compte)",
    required: false,
    description: "Numéro de compte client Auto Partner (ex: ACCOUNTNUM1)",
    defaultCsvMatches: ["accountnum1", "accountnum", "code ap", "numero ap", "code client", "num client", "compte"],
  },
  {
    id: "vatNumber",
    label: "N° TVA Intracommunautaire",
    required: false,
    description: "Numéro de TVA de l'entreprise (ex: VATNUM1)",
    defaultCsvMatches: ["vatnum1", "vatnum", "tva", "num tva", "vat"],
  },
  {
    id: "address",
    label: "Adresse postale (Voie / Rue)",
    required: false,
    description: "Adresse du magasin (ex: ADDRESS, STREET, RUE)",
    defaultCsvMatches: ["address", "adresse", "street", "rue", "voie", "streetname", "address1", "deliveryaddress", "adressevoie", "adressedistr"],
  },
  {
    id: "postalCode",
    label: "Code Postal",
    required: false,
    description: "Code postal d'implantation (ex: ZIPCODE, CP, CODEPOSTAL)",
    defaultCsvMatches: ["zipcode", "zip", "cp", "codepostal", "postalcode", "code_postal", "postcode"],
  },
  {
    id: "city",
    label: "Ville du Magasin",
    required: false,
    description: "Ville d'implantation (ex: CITY)",
    defaultCsvMatches: ["city", "ville", "commune", "localite"],
  },
  {
    id: "kamName",
    label: "Commercial / KAM assigné",
    required: false,
    description: "Gestionnaire du compte (ex: PH)",
    defaultCsvMatches: ["ph", "kam", "commercial", "gestionnaire", "responsable"],
  },
  {
    id: "invoiceDate",
    label: "Date / Période Facture (CA)",
    required: false,
    description: "Format AAAA-MM ou JJ/MM/AAAA (ex: INVOICEDATE)",
    defaultCsvMatches: ["invoicedate", "date", "periode", "mois", "facture date"],
  },
  {
    id: "amount",
    label: "Montant CA (€ HT)",
    required: false,
    description: "Chiffre d'affaires facturé mensuel (ex: AMOUNT)",
    defaultCsvMatches: ["amount", "ca", "montant", "ca ht", "chiffre affaires", "total ca"],
  },
  {
    id: "ordersCount",
    label: "Nombre de Commandes (Optionnel)",
    required: false,
    description: "Quantité ou volume de commandes du mois",
    defaultCsvMatches: ["orders", "commandes", "qte", "nb commandes", "volume"],
  },
  {
    id: "contactName",
    label: "Nom Contact Principal (Optionnel)",
    required: false,
    description: "Interlocuteur privilégié",
    defaultCsvMatches: ["contact", "contactname", "interlocuteur", "responsable magasin"],
  },
  {
    id: "email",
    label: "Email Contact (Optionnel)",
    required: false,
    description: "Adresse email de contact",
    defaultCsvMatches: ["email", "courriel", "mail"],
  },
  {
    id: "phone",
    label: "Téléphone (Optionnel)",
    required: false,
    description: "Téléphone direct",
    defaultCsvMatches: ["phone", "tel", "telephone", "portable"],
  },
];

// Clean number strings with French spaces, NBSP, commas
function parseFrenchNumber(val: string | undefined): number {
  if (!val) return 0;
  const clean = val.toString().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Clean date strings (e.g. "2026-06", "2026/06", "06/2026")
function parseDateToYearMonth(val: string | undefined): { year: number; month: number } | null {
  if (!val) return null;
  const str = val.trim();
  // Match "YYYY-MM" or "YYYY/MM"
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12) return { year, month };
  }
  // Match "MM/YYYY" or "MM-YYYY"
  const frMatch = str.match(/^(\d{1,2})[-/](\d{4})/);
  if (frMatch) {
    const month = parseInt(frMatch[1], 10);
    const year = parseInt(frMatch[2], 10);
    if (month >= 1 && month <= 12) return { year, month };
  }
  return null;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  targetKamId,
  kamName,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "success">("upload");
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({}); // { crmFieldId: csvHeaderName }
  const [importStats, setImportStats] = useState<{ total: number; created: number; updated: number }>({
    total: 0,
    created: 0,
    updated: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function resetState() {
    setStep("upload");
    setFileName("");
    setRawHeaders([]);
    setRawRows([]);
    setFieldMapping({});
    setErrorMsg(null);
  }

  // File parsing (supports comma or semicolon)
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setErrorMsg("Le fichier CSV est vide ou ne contient aucune ligne de données.");
          return;
        }

        // Detect delimiter: comma or semicolon
        const firstLine = lines[0].replace(/^\uFEFF/, ""); // Remove BOM
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

        // Parse header
        const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
        setRawHeaders(headers);

        // Parse rows
        const parsedRows: string[][] = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
          parsedRows.push(cells);
        }
        setRawRows(parsedRows);

        // Smart automatic mapping based on header names
        const autoMap: Record<string, string> = {};
        CRM_TARGET_FIELDS.forEach((target) => {
          const matched = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return target.defaultCsvMatches.some((match) => cleanH.includes(match.replace(/[^a-z0-9]/g, "")));
          });
          if (matched) {
            autoMap[target.id] = matched;
          }
        });

        setFieldMapping(autoMap);
        setStep("mapping");
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Impossible de lire ce fichier CSV : " + (err.message || "erreur de format"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Pre-aggregated preview grouped by client
  const previewClients = useMemo(() => {
    if (!fieldMapping.company) return [];

    const companyIdx = rawHeaders.indexOf(fieldMapping.company);
    const apCodeIdx = fieldMapping.apClientNumber ? rawHeaders.indexOf(fieldMapping.apClientNumber) : -1;
    const vatIdx = fieldMapping.vatNumber ? rawHeaders.indexOf(fieldMapping.vatNumber) : -1;
    const addressIdx = fieldMapping.address ? rawHeaders.indexOf(fieldMapping.address) : -1;
    const postalCodeIdx = fieldMapping.postalCode ? rawHeaders.indexOf(fieldMapping.postalCode) : -1;
    const cityIdx = fieldMapping.city ? rawHeaders.indexOf(fieldMapping.city) : -1;
    const kamIdx = fieldMapping.kamName ? rawHeaders.indexOf(fieldMapping.kamName) : -1;
    const contactIdx = fieldMapping.contactName ? rawHeaders.indexOf(fieldMapping.contactName) : -1;
    const emailIdx = fieldMapping.email ? rawHeaders.indexOf(fieldMapping.email) : -1;
    const phoneIdx = fieldMapping.phone ? rawHeaders.indexOf(fieldMapping.phone) : -1;
    const dateIdx = fieldMapping.invoiceDate ? rawHeaders.indexOf(fieldMapping.invoiceDate) : -1;
    const amountIdx = fieldMapping.amount ? rawHeaders.indexOf(fieldMapping.amount) : -1;

    const map = new Map<
      string,
      {
        company: string;
        apClientNumber?: string;
        vatNumber?: string;
        address?: string;
        postalCode?: string;
        city: string;
        kamName?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        turnovers: Array<{ year: number; month: number; amount: number }>;
        totalCa: number;
        rowsCount: number;
      }
    >();

    rawRows.forEach((row) => {
      const companyVal = row[companyIdx]?.trim();
      if (!companyVal) return;

      const apVal = apCodeIdx >= 0 ? row[apCodeIdx]?.trim() : undefined;
      const key = apVal ? `${apVal}_${companyVal}` : companyVal;

      if (!map.has(key)) {
        map.set(key, {
          company: companyVal,
          apClientNumber: apVal,
          vatNumber: vatIdx >= 0 ? row[vatIdx]?.trim() : undefined,
          address: addressIdx >= 0 ? row[addressIdx]?.trim() : undefined,
          postalCode: postalCodeIdx >= 0 ? row[postalCodeIdx]?.trim() : undefined,
          city: cityIdx >= 0 ? row[cityIdx]?.trim() : "France",
          kamName: kamIdx >= 0 ? row[kamIdx]?.trim() : undefined,
          contactName: contactIdx >= 0 ? row[contactIdx]?.trim() : undefined,
          email: emailIdx >= 0 ? row[emailIdx]?.trim() : undefined,
          phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined,
          turnovers: [],
          totalCa: 0,
          rowsCount: 0,
        });
      }

      const client = map.get(key)!;
      client.rowsCount++;

      if (dateIdx >= 0 && amountIdx >= 0) {
        const dateParsed = parseDateToYearMonth(row[dateIdx]);
        const amount = parseFrenchNumber(row[amountIdx]);
        if (dateParsed) {
          const existingTurnover = client.turnovers.find(
            (t) => t.year === dateParsed.year && t.month === dateParsed.month
          );
          if (existingTurnover) {
            existingTurnover.amount += amount;
          } else {
            client.turnovers.push({
              year: dateParsed.year,
              month: dateParsed.month,
              amount,
            });
          }
          client.totalCa += amount;
        }
      }
    });

    return Array.from(map.values());
  }, [rawHeaders, rawRows, fieldMapping]);

  // Execute import to server and update local storage CA caches
  async function handleExecuteImport() {
    if (previewClients.length === 0) {
      setErrorMsg("Aucun client valide à importer avec ce mapping.");
      return;
    }

    setStep("importing");
    setErrorMsg(null);

    try {
      const payload = {
        targetKamId,
        clients: previewClients.map((c) => ({
          company: c.company,
          address: c.address,
          postalCode: c.postalCode,
          city: c.city,
          contactName: c.contactName,
          email: c.email,
          phone: c.phone,
          apClientNumber: c.apClientNumber,
          vatNumber: c.vatNumber,
          kamName: c.kamName,
          status: "ACTIVE",
          turnovers: c.turnovers,
        })),
      };

      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Erreur serveur lors de l'import");
      }

      const data = await res.json();
      const serverClients: Array<{
        id: string;
        company: string;
        apClientNumber?: string;
        vatNumber?: string;
        turnovers?: Array<{ year: number; month: number; amount: number }>;
      }> = data.clients || [];

      // Update CA localStorage for each imported client so the "CA" tab displays actual numbers!
      serverClients.forEach((sc) => {
        // Save apClientNumber & vatNumber in fiche & custom keys
        if (sc.apClientNumber) {
          localStorage.setItem(`apflow_apcode_${sc.id}`, sc.apClientNumber);
        }

        // Also merge into fiche if present
        try {
          const ficheKey = `apflow_fiche_v4_${sc.id}`;
          const currentFiche = localStorage.getItem(ficheKey);
          const ficheData = currentFiche ? JSON.parse(currentFiche) : {};
          if (sc.apClientNumber) ficheData.apClientNumber = sc.apClientNumber;
          if (sc.vatNumber) ficheData.vatNumber = sc.vatNumber;
          localStorage.setItem(ficheKey, JSON.stringify(ficheData));
        } catch {}

        // Group turnovers by year
        if (sc.turnovers && sc.turnovers.length > 0) {
          const byYear = new Map<number, Array<{ month: number; amount: number }>>();
          sc.turnovers.forEach((to) => {
            if (!byYear.has(to.year)) byYear.set(to.year, []);
            byYear.get(to.year)!.push({ month: to.month, amount: to.amount });
          });

          byYear.forEach((items, year) => {
            const caStorageKey = `apflow_ca_${sc.id}_${year}`;
            // Structure expected by ClientCaSection: MonthlyTurnover[]
            const monthlyData = MONTH_NAMES.map((name, idx) => {
              const monthNum = idx + 1;
              const matched = items.find((i) => i.month === monthNum);
              const amount = matched ? matched.amount : 0;
              return {
                month: monthNum,
                monthName: name,
                amount: Math.round(amount),
                ordersCount: amount > 0 ? Math.max(1, Math.round(amount / 400)) : 0,
                status: (amount > 0 ? "FACTURE" : "ESTIME") as any,
              };
            });
            localStorage.setItem(caStorageKey, JSON.stringify(monthlyData));
          });
        }
      });

      // Dispatch events to notify other components (ClientsViews, ClientCaSection, etc.)
      window.dispatchEvent(new CustomEvent("apflow_apcode_changed"));
      window.dispatchEvent(new CustomEvent("apflow_cp_changed"));

      setImportStats({
        total: data.count || serverClients.length,
        created: data.createdCount || 0,
        updated: data.updatedCount || 0,
      });
      setStep("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Une erreur inattendue est survenue.");
      setStep("mapping");
    }
  }

  function formatEuro(val: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Import CSV Rapport de Ventes &amp; Base Clients
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#d90416]/10 text-[#d90416] font-bold">
                  Auto Partner
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Alimentation automatique de la base clients, des Codes AP, et intégration directe dans l&apos;onglet CA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center border-b border-slate-100 dark:border-zinc-800 px-5 py-2.5 bg-white dark:bg-zinc-900 text-xs font-semibold gap-4 overflow-x-auto shrink-0">
          <span
            className={`flex items-center gap-1.5 ${
              step === "upload" ? "text-[#d90416]" : "text-slate-400"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-100 dark:bg-zinc-800">
              1
            </span>
            Fichier CSV
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span
            className={`flex items-center gap-1.5 ${
              step === "mapping" ? "text-[#d90416]" : "text-slate-400"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-100 dark:bg-zinc-800">
              2
            </span>
            Validation du Mapping
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span
            className={`flex items-center gap-1.5 ${
              step === "preview" ? "text-[#d90416]" : "text-slate-400"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-100 dark:bg-zinc-800">
              3
            </span>
            Aperçu &amp; Chiffre d&apos;Affaires
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span
            className={`flex items-center gap-1.5 ${
              step === "success" ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-100 dark:bg-zinc-800">
              4
            </span>
            Terminé
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="py-6 space-y-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelected}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#d90416] dark:hover:border-[#d90416] rounded-2xl p-8 sm:p-12 cursor-pointer transition-all bg-slate-50/50 dark:bg-zinc-950/30 hover:bg-red-50/20 max-w-xl mx-auto flex flex-col items-center gap-3"
              >
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 text-[#d90416]">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                    Cliquez pour choisir un rapport CSV ou glissez-le ici
                  </p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                    Compatible avec le rapport Auto Partner (ex: <code>Sales_City.csv</code>)
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  <Sparkles className="w-3 h-3 text-[#d90416]" />
                  Détection automatique des colonnes &amp; montants
                </div>
              </div>

              {/* Sample format hint */}
              <div className="max-w-xl mx-auto text-left rounded-xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-950/40 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300">
                  <Info className="w-4 h-4 text-blue-500" />
                  Format standard du rapport des ventes :
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                  Colonnes détectées automatiquement : <code>INVOICEDATE</code>, <code>CITY</code>, <code>NAMEALIAS</code>, <code>ACCOUNTNUM1</code> (Code AP), <code>VATNUM1</code> (TVA), <code>PH</code> (Commercial), <code>AMOUNT</code> (Montant CA).
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    Fichier analysé :
                  </span>{" "}
                  <span className="font-mono text-[#d90416]">{fileName}</span> ({rawRows.length} lignes, {rawHeaders.length} colonnes)
                </div>
                <div className="text-[11px] text-slate-500">
                  Vérifiez ou adaptez les correspondances ci-dessous avant d&apos;importer.
                </div>
              </div>

              {/* Mapping Table */}
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
                    {CRM_TARGET_FIELDS.map((field) => {
                      const selectedHeader = fieldMapping[field.id] || "";
                      const selectedIdx = rawHeaders.indexOf(selectedHeader);
                      const sampleValue =
                        selectedIdx >= 0 && rawRows[0] ? rawRows[0][selectedIdx] : "—";

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
                              onChange={(e) =>
                                setFieldMapping({
                                  ...fieldMapping,
                                  [field.id]: e.target.value,
                                })
                              }
                              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-[#d90416] ${
                                selectedHeader
                                  ? "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-zinc-100 font-bold"
                                  : field.required
                                  ? "border-red-300 bg-red-50/20 text-slate-500"
                                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500"
                              }`}
                            >
                              <option value="">-- Ignorer / Non mappé --</option>
                              {rawHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-4">
                            <span className="font-mono text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                              {sampleValue || "(vide)"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Changer de fichier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!fieldMapping.company) {
                      setErrorMsg("Veuillez mapper au minimum la colonne du Nom de l'Enseigne / Client.");
                      return;
                    }
                    setErrorMsg(null);
                    setStep("preview");
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Prévisualiser les clients ({previewClients.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  <strong>{previewClients.length} clients uniques</strong> identifiés et prêts à être intégrés dans la BDD et dans l&apos;onglet CA.
                </div>
                <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  CA Total cumulé : {formatEuro(previewClients.reduce((acc, c) => acc + c.totalCa, 0))}
                </div>
              </div>

              {/* Clients Table Preview */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold sticky top-0 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3.5">Code AP</th>
                      <th className="py-2.5 px-3.5">Enseigne / Client</th>
                      <th className="py-2.5 px-3.5">Adresse &amp; CP</th>
                      <th className="py-2.5 px-3.5">Ville</th>
                      <th className="py-2.5 px-3.5">N° TVA</th>
                      <th className="py-2.5 px-3.5">Mois de CA</th>
                      <th className="py-2.5 px-3.5 text-right">CA Total Importé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
                    {previewClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                        <td className="py-2 px-3.5 font-mono font-bold text-slate-800 dark:text-zinc-200">
                          {client.apClientNumber || "Auto-généré"}
                        </td>
                        <td className="py-2 px-3.5 font-semibold text-slate-900 dark:text-zinc-100">
                          {client.company}
                        </td>
                        <td className="py-2 px-3.5 text-slate-600 dark:text-zinc-300">
                          {client.address ? (
                            <div className="text-[11px] leading-tight">
                              <div>{client.address}</div>
                              {client.postalCode && (
                                <span className="text-slate-400 font-mono text-[10px]">{client.postalCode}</span>
                              )}
                            </div>
                          ) : client.postalCode ? (
                            <span className="font-mono text-[11px]">{client.postalCode}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3.5 text-slate-600 dark:text-zinc-300">
                          {client.city}
                        </td>
                        <td className="py-2 px-3.5 font-mono text-[11px] text-slate-500">
                          {client.vatNumber || "—"}
                        </td>
                        <td className="py-2 px-3.5 text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[11px]">
                            {client.turnovers.length} mois
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-right font-bold text-[#d90416]">
                          {formatEuro(client.totalCa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("mapping")}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Retour au mapping
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Confirmer l&apos;importation ({previewClients.length} clients)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORTING LOADER */}
          {step === "importing" && (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-[#d90416] mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Importation et synchronisation en cours...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enregistrement dans la base de données et calcul des historiques CA mensuels
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === "success" && (
            <div className="py-10 text-center space-y-5 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Importation réussie avec succès !
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Vos clients et leurs données de chiffre d&apos;affaires ont été intégrés au CRM.
                </p>
              </div>

              {/* Stats pill */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-950/50 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-zinc-100 text-lg">
                    {importStats.total}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Total traités</div>
                </div>
                <div>
                  <div className="font-bold text-emerald-600 text-lg">
                    {importStats.created}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Nouveaux créés</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600 text-lg">
                    {importStats.updated}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Mis à jour</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSuccess(importStats.total);
                  onClose();
                  resetState();
                }}
                className="w-full py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-sm transition-colors"
              >
                Voir mes clients mis à jour
              </button>
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
