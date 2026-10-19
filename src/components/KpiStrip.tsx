"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { ClientItem, NoteItem } from "@/types/kam";

interface KpiStripProps {
  clients: ClientItem[];
  notes: NoteItem[];
}

export function KpiStrip({ clients, notes }: KpiStripProps) {
  const totalClients = clients.length;
  const activeAndVip = clients.filter(
    (c) => c.status === "ACTIVE" || c.status === "VIP"
  ).length;
  const activePct =
    totalClients > 0 ? Math.round((activeAndVip / totalClients) * 100) : 0;

  const followUpCount = clients.filter((c) => c.status === "FOLLOW_UP").length;
  const followUpPct =
    totalClients > 0 ? Math.round((followUpCount / totalClients) * 100) : 0;

  const avgHealth =
    totalClients > 0
      ? Math.round(
          clients.reduce((acc, c) => acc + c.healthScore, 0) / totalClients
        )
      : 0;

  const freeNotesCount = notes.filter((n) => !n.clientId).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 py-5 px-6 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40">
      {/* 1. Total Portefeuille */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Total portefeuille</span>
          <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {totalClients}
        </div>
        {/* Subtle minimalist line like reference image */}
        <svg className="w-full h-4 text-zinc-700 dark:text-zinc-300" viewBox="0 0 120 18" fill="none">
          <path
            d="M2 15L26 12L52 13L78 8L102 6L118 3"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle cx="102" cy="6" r="1.8" fill="currentColor" />
        </svg>
      </div>

      {/* 2. Comptes Actifs & VIP */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Comptes Actifs & VIP</span>
          <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeAndVip}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {activePct}%
          </span>
        </div>
        <svg className="w-full h-4 text-zinc-700 dark:text-zinc-300" viewBox="0 0 120 18" fill="none">
          <path
            d="M2 14L30 13L55 9L84 7L118 3"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle cx="84" cy="7" r="1.8" fill="currentColor" />
        </svg>
      </div>

      {/* 3. À relancer (Forgotten / Follow-up) */}
      <div className="space-y-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          À relancer
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {followUpCount}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {followUpPct}%
          </span>
        </div>
        {/* Tick ruler indicator like reference image */}
        <div className="relative pt-1.5">
          <div className="flex items-center justify-between gap-[2px] h-2.5">
            {Array.from({ length: 28 }).map((_, idx) => {
              const active = idx <= Math.round((followUpPct / 100) * 27);
              return (
                <span
                  key={idx}
                  className={`w-[1.5px] h-full rounded-full ${
                    active
                      ? "bg-zinc-800 dark:bg-zinc-200"
                      : "bg-zinc-300/70 dark:bg-zinc-700"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Notes & Suivis */}
      <div className="space-y-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Notes enregistrées
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {notes.length}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            dont {freeNotesCount} libre{freeNotesCount > 1 ? "s" : ""}
          </span>
        </div>
        <div className="relative pt-1.5">
          <div className="flex items-center justify-between gap-[2px] h-2.5">
            {Array.from({ length: 28 }).map((_, idx) => {
              const active = idx <= Math.min(27, notes.length * 3);
              return (
                <span
                  key={idx}
                  className={`w-[1.5px] h-full rounded-full ${
                    active
                      ? "bg-zinc-800 dark:bg-zinc-200"
                      : "bg-zinc-300/70 dark:bg-zinc-700"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Santé portefeuille (Data / Account health) */}
      <div className="space-y-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Santé portefeuille
        </div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {avgHealth}%
        </div>
        <div className="relative pt-1.5">
          <div className="flex items-center justify-between gap-[2px] h-2.5">
            {Array.from({ length: 28 }).map((_, idx) => {
              const active = idx <= Math.round((avgHealth / 100) * 27);
              return (
                <span
                  key={idx}
                  className={`w-[1.5px] h-full rounded-full ${
                    active
                      ? "bg-zinc-800 dark:bg-zinc-200"
                      : "bg-zinc-300/70 dark:bg-zinc-700"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
