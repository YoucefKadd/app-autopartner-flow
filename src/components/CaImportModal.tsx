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
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";

interface CaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetKamId?: string;
  kamName?: string;
  onSuccess?: () => void;
}

interface CaTargetField {
  id: string;
  label: string;
  required: boolean;
  description: string;
  defaultMatches: string[];
}

const CA_TARGET_FIELDS: CaTargetField[] = [
  {
    id: "apClientNumber",
    label: "Code Client AP",
    required: true,
    description: "Numéro de compte client (ex: ACCOUNTNUM, Code AP)",
    defaultMatches: ["accountnum", "codeap", "codeclient", "numclient", "compte", "clientap", "no_client"],
  },
  {
    id: "company",
    label: "Nom de l'Enseigne (Optionnel si Code AP)",
    required: false,
    description: "Raison sociale ou enseigne client (ex: NAMEALIAS)",
    defaultMatches: ["namealias", "company", "nom", "enseigne", "client", "raisonsociale", "nomclient"],
  },
  {
    id: "year",
    label: "Année / Exercice",
    required: false,
    description: "Année comptable (ex: 2025, 2026)",
    defaultMatches: ["annee", "year", "exercice", "periode_annee"],
  },
  {
    id: "month",
    label: "Mois (1 à 12 ou Date)",
    required: false,
    description: "Numéro du mois ou date (1=Janvier...)",
    defaultMatches: ["mois", "month", "periode", "date", "invoicedate", "datefacture"],
  },
  {
    id: "amount",
    label: "Montant CA Facturé (€ HT)",
    required: true,
    description: "Chiffre d'affaires facturé HT (ex: AMOUNT, CA_HT)",
    defaultMatches: ["amount", "ca", "montant", "caht", "chiffreaffaires", "totalca", "ventes", "ca_ht"],
  },
  {
    id: "axPurchases",
    label: "Montant Achats AX (€)",
    required: false,
    description: "Achats enregistrés dans AX (ex: ACHATS, AX, ACHATS_AX)",
    defaultMatches: ["ax", "achats", "achatsax", "montantax", "achat", "purchases", "achats_ax"],
  },
  {
    id: "ordersCount",
    label: "Nombre de Commandes",
    required: false,
    description: "Volume ou nombre de factures/commandes",
    defaultMatches: ["orders", "commandes", "qte", "nbcommandes", "volume", "nb_commandes"],
  },
  {
    id: "target",
    label: "Objectif (€ HT)",
    required: false,
    description: "Objectif annuel ou mensuel (Optionnel)",
    defaultMatches: ["target", "objectif", "obj", "cible"],
  },
];

function cleanNumber(val: string | undefined): number {
  if (!val) return 0;
  const str = val.toString().replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function CaImportModal({ isOpen, onClose, onSuccess }: CaImportModalProps) {
  const { clients, refreshWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "success">("upload");
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [selectedDefaultYear, setSelectedDefaultYear] = useState<number>(new Date().getFullYear());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<{
    total: number;
    matchedCount: number;
    unmatchedCount: number;
    unmatchedItems: string[];
  } | null>(null);



  function resetState() {
    setStep("upload");
    setFileName("");
    setRawHeaders([]);
    setRawRows([]);
    setFieldMapping({});
    setErrorMsg(null);
    setImportResult(null);
  }

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

        const firstLine = lines[0].replace(/^\uFEFF/, "");
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

        const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
        setRawHeaders(headers);

        const parsedRows: string[][] = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
          parsedRows.push(cells);
        }
        setRawRows(parsedRows);

        // Smart mapping
        const autoMap: Record<string, string> = {};
        CA_TARGET_FIELDS.forEach((target) => {
          const matched = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return target.defaultMatches.some((m) => cleanH.includes(m.replace(/[^a-z0-9]/g, "")));
          });
          if (matched) autoMap[target.id] = matched;
        });

        setFieldMapping(autoMap);
        setStep("mapping");
      } catch (err: any) {
        setErrorMsg("Erreur lors de la lecture du fichier : " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const parsedPreviewRows = useMemo(() => {
    if (!fieldMapping.apClientNumber && !fieldMapping.company) return [];

    const apIdx = fieldMapping.apClientNumber ? rawHeaders.indexOf(fieldMapping.apClientNumber) : -1;
    const companyIdx = fieldMapping.company ? rawHeaders.indexOf(fieldMapping.company) : -1;
    const yearIdx = fieldMapping.year ? rawHeaders.indexOf(fieldMapping.year) : -1;
    const monthIdx = fieldMapping.month ? rawHeaders.indexOf(fieldMapping.month) : -1;
    const amountIdx = fieldMapping.amount ? rawHeaders.indexOf(fieldMapping.amount) : -1;
    const axIdx = fieldMapping.axPurchases ? rawHeaders.indexOf(fieldMapping.axPurchases) : -1;
    const ordersIdx = fieldMapping.ordersCount ? rawHeaders.indexOf(fieldMapping.ordersCount) : -1;
    const targetIdx = fieldMapping.target ? rawHeaders.indexOf(fieldMapping.target) : -1;

    return rawRows.slice(0, 50).map((row, index) => {
      const apCode = apIdx >= 0 ? row[apIdx]?.trim() : "";
      const company = companyIdx >= 0 ? row[companyIdx]?.trim() : "";
      const yearVal = yearIdx >= 0 ? parseInt(row[yearIdx], 10) : selectedDefaultYear;
      const monthVal = monthIdx >= 0 ? parseInt(row[monthIdx], 10) : 0;
      const amountVal = amountIdx >= 0 ? cleanNumber(row[amountIdx]) : 0;
      const axVal = axIdx >= 0 ? cleanNumber(row[axIdx]) : 0;
      const ordersVal = ordersIdx >= 0 ? parseInt(row[ordersIdx], 10) || 0 : 0;
      const targetVal = targetIdx >= 0 ? cleanNumber(row[targetIdx]) : 0;

      // Match check
      const matched = clients.find(
        (c) =>
          (apCode && c.apClientNumber && c.apClientNumber.trim().toLowerCase() === apCode.toLowerCase()) ||
          (company && c.company.toLowerCase().includes(company.toLowerCase()))
      );

      return {
        id: index,
        apCode,
        company,
        matchedClient: matched ? matched.company : null,
        year: isNaN(yearVal) ? selectedDefaultYear : yearVal,
        month: isNaN(monthVal) ? 0 : monthVal,
        amount: amountVal,
        axPurchases: axVal,
        ordersCount: ordersVal,
        target: targetVal,
      };
    });
  }, [rawRows, rawHeaders, fieldMapping, selectedDefaultYear, clients]);

  async function handleConfirmImport() {
    setStep("importing");
    setErrorMsg(null);

    const apIdx = fieldMapping.apClientNumber ? rawHeaders.indexOf(fieldMapping.apClientNumber) : -1;
    const companyIdx = fieldMapping.company ? rawHeaders.indexOf(fieldMapping.company) : -1;
    const yearIdx = fieldMapping.year ? rawHeaders.indexOf(fieldMapping.year) : -1;
    const monthIdx = fieldMapping.month ? rawHeaders.indexOf(fieldMapping.month) : -1;
    const amountIdx = fieldMapping.amount ? rawHeaders.indexOf(fieldMapping.amount) : -1;
    const axIdx = fieldMapping.axPurchases ? rawHeaders.indexOf(fieldMapping.axPurchases) : -1;
    const ordersIdx = fieldMapping.ordersCount ? rawHeaders.indexOf(fieldMapping.ordersCount) : -1;
    const targetIdx = fieldMapping.target ? rawHeaders.indexOf(fieldMapping.target) : -1;

    const payloadRows = rawRows.map((row) => {
      const apCode = apIdx >= 0 ? row[apIdx]?.trim() : undefined;
      const company = companyIdx >= 0 ? row[companyIdx]?.trim() : undefined;
      let year = yearIdx >= 0 ? parseInt(row[yearIdx], 10) : selectedDefaultYear;
      if (isNaN(year)) year = selectedDefaultYear;

      let month = 0;
      if (monthIdx >= 0) {
        const rawM = (row[monthIdx] || "").trim();
        const numM = parseInt(rawM, 10);
        if (!isNaN(numM) && numM >= 1 && numM <= 12) {
          month = numM;
        } else {
          // If date like YYYY-MM
          const mMatch = rawM.match(/(\d{4})[-/](\d{1,2})/);
          if (mMatch) {
            year = parseInt(mMatch[1], 10);
            month = parseInt(mMatch[2], 10);
          }
        }
      }

      return {
        apClientNumber: apCode,
        company,
        year,
        month,
        amount: amountIdx >= 0 ? cleanNumber(row[amountIdx]) : 0,
        axPurchases: axIdx >= 0 ? cleanNumber(row[axIdx]) : 0,
        ordersCount: ordersIdx >= 0 ? parseInt(row[ordersIdx], 10) || 0 : 0,
        target: targetIdx >= 0 ? cleanNumber(row[targetIdx]) : 0,
      };
    });

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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Importer Fichier CA &amp; Achats AX</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  Direct MySQL
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Synchronisation automatique par Code AP — Aucune donnée factice générée
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

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#d90416] rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                    Déposez votre fichier de ventes ou AX (.csv)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Séparateur virgule ou point-virgule (Export standard ERP AX, Excel ou BI)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Colonnes reconnues automatiquement :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li><strong>Code Client AP :</strong> ACCOUNTNUM, Code AP, Compte...</li>
                  <li><strong>Montant CA :</strong> AMOUNT, CA HT, Montant, Total...</li>
                  <li><strong>Achats AX :</strong> AX, Achats, Achats AX...</li>
                  <li><strong>Période :</strong> Date, Année, Mois...</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-[#d90416]" />
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{fileName}</span>
                  <span className="text-slate-400">({rawRows.length} lignes)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Année par défaut :</span>
                  <select
                    value={selectedDefaultYear}
                    onChange={(e) => setSelectedDefaultYear(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold text-xs text-slate-800 dark:text-zinc-100"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Associez les colonnes de votre fichier aux champs de gestion du CA :
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CA_TARGET_FIELDS.map((field) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1.5 shadow-2xs"
                    >
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                        <span>
                          {field.label} {field.required && <span className="text-[#d90416]">*</span>}
                        </span>
                        {fieldMapping[field.id] && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Lié
                          </span>
                        )}
                      </label>
                      <select
                        value={fieldMapping[field.id] || ""}
                        onChange={(e) =>
                          setFieldMapping((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-[#d90416]"
                      >
                        <option value="">-- Ignorer ce champ --</option>
                        {rawHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Aperçu des <strong>{parsedPreviewRows.length}</strong> premières lignes :
                </span>
                <button
                  type="button"
                  onClick={() => setStep("mapping")}
                  className="text-[#d90416] hover:underline font-semibold"
                >
                  Modifier le mappage
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Code AP</th>
                      <th className="p-2.5">Client Trouvé</th>
                      <th className="p-2.5">Mois/Année</th>
                      <th className="p-2.5 text-right">CA Facturé</th>
                      <th className="p-2.5 text-right">Achats AX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {parsedPreviewRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                          {r.apCode || "—"}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                          {r.matchedClient ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              ✓ {r.matchedClient}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">
                              Non identifié ({r.company || r.apCode})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {r.month > 0 ? `${r.month}/` : "Annuel "}{r.year}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {r.amount.toLocaleString("fr-FR")} €
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-600 dark:text-zinc-300">
                          {r.axPurchases ? `${r.axPurchases.toLocaleString("fr-FR")} €` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORTING */}
          {step === "importing" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#d90416] border-t-transparent animate-spin mx-auto" />
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Enregistrement dans la base de données Hostinger...
              </p>
              <p className="text-xs text-slate-400">
                Mise à jour en direct des chiffres d'affaires et achats AX par Code AP
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === "success" && importResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Importation CA &amp; AX terminée avec succès !
              </h4>
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.matchedCount}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Lignes enregistrées</p>
                </div>
                {importResult.unmatchedCount > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-rose-600">
                      {importResult.unmatchedCount}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">Clients non trouvés</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
          >
            {step === "success" ? "Fermer" : "Annuler"}
          </button>

          <div className="flex items-center gap-2">
            {step === "mapping" && (
              <button
                type="button"
                onClick={() => setStep("preview")}
                disabled={!fieldMapping.apClientNumber && !fieldMapping.company}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] text-white text-xs font-bold hover:bg-[#b80312] transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <span>Aperçu avant enregistrement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === "preview" && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#d90416] text-white text-xs font-bold hover:bg-[#b80312] transition shadow-xs cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Enregistrer dans MySQL ({rawRows.length} lignes)</span>
              </button>
            )}

            {step === "success" && (
              <button
                type="button"
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#d90416] text-white text-xs font-bold hover:bg-[#b80312] transition shadow-xs cursor-pointer"
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
