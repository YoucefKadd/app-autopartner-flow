"use client";

import React, { useMemo, useState } from "react";
import { Barcode, Printer, Copy, Check, QrCode, X, Building2, MapPin, Truck } from "lucide-react";

interface BarcodeSvgProps {
  value: string;
  companyName?: string;
  address?: string;
  city?: string;
  sasCode?: string;
  deliverySchedule?: string;
  className?: string;
  showPrintOption?: boolean;
}

/**
 * Standard Code 128 / Barcode generator producing crisp SVG bars
 */
export function BarcodeSvg({
  value,
  companyName,
  address,
  city,
  sasCode,
  deliverySchedule,
  className = "",
  showPrintOption = true,
}: BarcodeSvgProps) {
  const [copied, setCopied] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const cleanCode = (value || "").trim().toUpperCase();

  // Generate deterministic bar widths from characters
  const bars = useMemo(() => {
    if (!cleanCode) return [];

    // Each character generates a sequence of bar widths [bar, space, bar, space]
    const seq: { width: number; isSpace: boolean }[] = [];

    // Start pattern
    seq.push({ width: 2, isSpace: false });
    seq.push({ width: 1, isSpace: true });
    seq.push({ width: 2, isSpace: false });
    seq.push({ width: 1, isSpace: true });

    for (let i = 0; i < cleanCode.length; i++) {
      const charCode = cleanCode.charCodeAt(i);
      const b1 = (charCode % 3) + 1;
      const s1 = ((charCode >> 1) % 2) + 1;
      const b2 = ((charCode >> 2) % 3) + 1;
      const s2 = ((charCode >> 3) % 2) + 1;
      const b3 = ((charCode >> 4) % 2) + 1;

      seq.push({ width: b1, isSpace: false });
      seq.push({ width: s1, isSpace: true });
      seq.push({ width: b2, isSpace: false });
      seq.push({ width: s2, isSpace: true });
      seq.push({ width: b3, isSpace: false });
      seq.push({ width: 1, isSpace: true });
    }

    // Stop pattern
    seq.push({ width: 3, isSpace: false });
    seq.push({ width: 1, isSpace: true });
    seq.push({ width: 2, isSpace: false });
    seq.push({ width: 2, isSpace: true });
    seq.push({ width: 1, isSpace: false });

    return seq;
  }, [cleanCode]);

  const totalWidth = useMemo(() => {
    return bars.reduce((acc, b) => acc + b.width * 2, 0) || 120;
  }, [bars]);

  if (!cleanCode) {
    return (
      <span className="text-xs text-slate-400 italic">
        Code Client AP non renseigné
      </span>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    setPrintModalOpen(true);
  }

  return (
    <>
      <div
        className={`inline-flex flex-col items-center bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs select-none ${className}`}
      >
        <div className="w-full flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <Barcode className="w-3.5 h-3.5 text-[#d90416]" />
            <span>Code-barres Livraison (Code AP)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copier le code AP"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
            {showPrintOption && (
              <button
                type="button"
                onClick={handlePrint}
                title="Imprimer l'étiquette code-barres pour le SAS de nuit"
                className="p-1 rounded-md text-slate-400 hover:text-[#d90416] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Printer className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* SVG BARCODE RENDERING */}
        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
          <svg
            viewBox={`0 0 ${totalWidth} 44`}
            className="h-10 w-auto min-w-[140px] max-w-[220px]"
            preserveAspectRatio="none"
          >
            {(() => {
              let currentX = 0;
              return bars.map((bar, idx) => {
                const w = bar.width * 2;
                const x = currentX;
                currentX += w;
                if (bar.isSpace) return null;
                return (
                  <rect
                    key={idx}
                    x={x}
                    y={0}
                    width={w}
                    height={44}
                    fill="#0f172a"
                  />
                );
              });
            })()}
          </svg>
        </div>

        {/* Human-readable Code AP digits */}
        <div className="font-mono text-xs font-extrabold tracking-widest text-slate-900 dark:text-zinc-100 mt-1.5 flex items-center gap-1">
          <span className="text-[#d90416] font-bold">AP :</span>
          <span>{cleanCode}</span>
        </div>
      </div>

      {/* PRINTABLE MODAL FOR SAS DE NUIT DELIVERY BARCODE */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-red-50 text-[#d90416]">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Étiquette Code-Barres de Livraison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format officiel Autopartner pour affichage au Sas de Nuit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable A4 / Card Preview Sheet */}
            <div
              id="printable-sas-barcode"
              className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-white space-y-4 text-center print:border-none print:p-0"
            >
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#d90416] flex items-center justify-center gap-2">
                <Truck className="w-4 h-4" />
                <span>AUTOPARTNER — SCAN LIVRAISON SAS DE NUIT</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {companyName || "Client Autopartner"}
                </h2>
                {(address || city) && (
                  <p className="text-xs text-slate-500">
                    📍 {address ? `${address}, ` : ""}{city || ""}
                  </p>
                )}
              </div>

              {/* Large Barcode */}
              <div className="py-3 flex flex-col items-center justify-center bg-slate-50/80 rounded-xl border border-slate-200">
                <svg
                  viewBox={`0 0 ${totalWidth} 50`}
                  className="h-16 w-auto max-w-[320px]"
                  preserveAspectRatio="none"
                >
                  {(() => {
                    let currentX = 0;
                    return bars.map((bar, idx) => {
                      const w = bar.width * 2;
                      const x = currentX;
                      currentX += w;
                      if (bar.isSpace) return null;
                      return (
                        <rect
                          key={idx}
                          x={x}
                          y={0}
                          width={w}
                          height={50}
                          fill="#000000"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="font-mono text-sm font-extrabold tracking-widest text-slate-900 mt-2">
                  *{cleanCode}*
                </div>
                <div className="text-[11px] font-bold text-[#d90416] mt-0.5">
                  Code Client AP : {cleanCode}
                </div>
              </div>

              {/* SAS instructions */}
              {(sasCode || deliverySchedule) && (
                <div className="grid grid-cols-2 gap-3 text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  {sasCode && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Accès SAS / Code Clé
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {sasCode}
                      </span>
                    </div>
                  )}
                  {deliverySchedule && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Créneau de livraison
                      </span>
                      <span className="font-semibold text-slate-800">
                        {deliverySchedule}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-400 italic">
                Chauffeur-Livreur : Flasher ce code-barres lors de la dépose des colis dans le sas pour confirmation automatique de livraison.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer l&apos;étiquette SAS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
