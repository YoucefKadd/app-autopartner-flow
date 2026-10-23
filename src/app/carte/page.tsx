"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Map,
  Building2,
  TrendingUp,
  Navigation,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { ClientsMapView } from "@/components/ClientsMapView";
import { CaStatsMapView } from "@/components/CaStatsMapView";
import { AddVisitModal } from "@/components/AddVisitModal";

type CarteActiveTab = "stores" | "ca_stats";

export default function CarteTerritoiresPage() {
  const router = useRouter();
  const { clients, activeUser, loading, refreshWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<CarteActiveTab>("stores");

  // Add visit modal state for the store map
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [addVisitClientId, setAddVisitClientId] = useState<string | null>(null);

  if (loading || !activeUser) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin text-[#d90416]" />
        Chargement de la cartographie...
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 lg:px-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416]">
              <Map className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Cartographie &amp; Territoires
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Visualisation géographique de votre portefeuille, préparation des tournées de visites et analyse spatiale du chiffre d&apos;affaires.
          </p>
        </div>

        {/* Global tab switcher pills in header */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("stores")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "stores"
                ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Magasins &amp; Tournées</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "stores"
                  ? "bg-red-50 dark:bg-red-950/50 text-[#d90416]"
                  : "bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"
              }`}
            >
              {clients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ca_stats")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ca_stats"
                ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Chiffres d&apos;Affaires &amp; Stats</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "ca_stats"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
                  : "bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"
              }`}
            >
              Zones CA
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT 1 : CARTE DES MAGASINS & TOURNÉES TERRAIN */}
      {activeTab === "stores" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              📍 Localisation individuelle de chaque magasin avec son statut client et son constructeur d&apos;itinéraire routier Google Maps.
            </span>
          </div>

          <ClientsMapView
            clients={clients}
            onSelectClient={(c) => router.push(`/clients/${c.id}`)}
            onAddVisitForClient={(clientId) => {
              setAddVisitClientId(clientId);
              setIsAddVisitModalOpen(true);
            }}
          />
        </div>
      )}

      {/* 3. TAB CONTENT 2 : CARTE CHIFFRE D'AFFAIRES & ZONES STATS */}
      {activeTab === "ca_stats" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              📊 Visualisation de l&apos;intensité du Chiffre d&apos;Affaires par zone géographique (bulles proportionnelles par ville, département et région).
            </span>
          </div>

          <CaStatsMapView
            clients={clients}
            activeKamId={activeUser?.id}
          />
        </div>
      )}

      {/* Add Visit Modal when triggered from store map */}
      {isAddVisitModalOpen && (
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
