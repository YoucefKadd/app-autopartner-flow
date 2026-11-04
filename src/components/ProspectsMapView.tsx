"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Search,
  ExternalLink,
  Navigation,
  Compass,
  Phone,
  Mail,
  User,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpDown,
  RotateCcw,
  Check,
  ChevronRight,
  Car,
  FileText,
  DollarSign,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ClientItem } from "@/types/kam";
import {
  FRENCH_REGIONS,
  FRENCH_DEPARTMENTS,
  resolveClientGeoData,
  normalizeGeoKey,
} from "@/lib/geoData";
import { ProspectStage, PROSPECT_STAGES } from "@/types/prospects";

export type ProspectGeoGroupingMode = "individual" | "city" | "department" | "region";

interface ProspectsMapViewProps {
  prospects: ClientItem[];
  prospectStages: Record<string, ProspectStage>;
  prospectPotentials: Record<string, number>;
  prospectActivities: Record<string, string>;
  prospectSuppliers: Record<string, string>;
  onSelectProspect?: (prospect: ClientItem) => void;
  onConvertProspect?: (prospect: ClientItem) => void;
  onAddVisitForProspect?: (prospectId: string) => void;
  onOpenNote?: (prospectId: string) => void;
}

export function ProspectsMapView({
  prospects,
  prospectStages,
  prospectPotentials,
  prospectActivities,
  prospectSuppliers,
  onSelectProspect,
  onConvertProspect,
  onAddVisitForProspect,
  onOpenNote,
}: ProspectsMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Grouping mode: individual pins, or clustered by city, department, region
  const [grouping, setGrouping] = useState<ProspectGeoGroupingMode>("individual");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [activityFilter, setActivityFilter] = useState<string>("ALL");
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ClientItem | null>(null);
  // Mobile active tab: "map" | "list"
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  // Fallback coords parser from localStorage if any
  const enrichedProspects = useMemo(() => {
    return prospects.map((p) => {
      let customCoords: [number, number] | null = null;
      if (typeof window !== "undefined") {
        const savedLat = localStorage.getItem(`apflow_lat_${p.id}`);
        const savedLng = localStorage.getItem(`apflow_lng_${p.id}`);
        if (savedLat && savedLng) {
          const lat = parseFloat(savedLat);
          const lng = parseFloat(savedLng);
          if (!isNaN(lat) && !isNaN(lng)) {
            customCoords = [lat, lng];
          }
        }
      }

      const geo = resolveClientGeoData(p.city, p.postalCode, customCoords);
      const stage = prospectStages[p.id] || "A_DEMARCHER";
      const potential = prospectPotentials[p.id] || 25000;
      const activity = prospectActivities[p.id] || "REVENDEUR_PIECES";
      const supplier = prospectSuppliers[p.id] || "Autre distributeur local";

      return {
        prospect: p,
        stage,
        potential,
        activity,
        supplier,
        geo,
      };
    });
  }, [prospects, prospectStages, prospectPotentials, prospectActivities, prospectSuppliers]);

  // Filtered prospects list
  const filteredList = useMemo(() => {
    return enrichedProspects.filter((item) => {
      if (stageFilter !== "ALL" && item.stage !== stageFilter) return false;
      if (activityFilter !== "ALL" && item.activity !== activityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchComp = item.prospect.company.toLowerCase().includes(q);
        const matchCity = item.prospect.city.toLowerCase().includes(q);
        const matchContact = item.prospect.contactName?.toLowerCase().includes(q);
        const matchDept = item.geo.deptName.toLowerCase().includes(q) || item.geo.deptCode.includes(q);
        const matchRegion = item.geo.region.toLowerCase().includes(q);
        if (!matchComp && !matchCity && !matchContact && !matchDept && !matchRegion) return false;
      }
      return true;
    });
  }, [enrichedProspects, stageFilter, activityFilter, searchQuery]);

  // Aggregated zones for city / department / region
  const zones = useMemo(() => {
    if (grouping === "individual") return [];

    const map = new Map<
      string,
      {
        key: string;
        name: string;
        coords: [number, number];
        deptCode?: string;
        region: string;
        totalPotential: number;
        items: typeof filteredList;
      }
    >();

    filteredList.forEach((item) => {
      let key = "";
      let name = "";
      let coords: [number, number] = item.geo.coords;
      let deptCode = item.geo.deptCode;
      let region = item.geo.region;

      if (grouping === "city") {
        key = `city_${normalizeGeoKey(item.geo.city)}_${deptCode}`;
        name = item.geo.city;
        coords = item.geo.coords;
      } else if (grouping === "department") {
        key = `dept_${deptCode}`;
        name = `${item.geo.deptName} (${deptCode})`;
        const deptInfo = FRENCH_DEPARTMENTS[deptCode];
        if (deptInfo) coords = deptInfo.centroid;
      } else if (grouping === "region") {
        key = `reg_${normalizeGeoKey(region)}`;
        name = region;
        const regCoords = FRENCH_REGIONS[region];
        if (regCoords) coords = regCoords;
      }

      const existing = map.get(key);
      if (existing) {
        existing.totalPotential += item.potential;
        existing.items.push(item);
      } else {
        map.set(key, {
          key,
          name,
          coords,
          deptCode,
          region,
          totalPotential: item.potential,
          items: [item],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPotential - a.totalPotential);
  }, [filteredList, grouping]);

  // Active selected zone
  const activeZone = useMemo(() => {
    if (!selectedZoneKey) return null;
    return zones.find((z) => z.key === selectedZoneKey) || null;
  }, [zones, selectedZoneKey]);

  // Global window functions for Leaflet popups
  useEffect(() => {
    (window as any).__apflow_prospect_convert = (id: string) => {
      const found = prospects.find((p) => p.id === id);
      if (found && onConvertProspect) onConvertProspect(found);
    };
    (window as any).__apflow_prospect_visit = (id: string) => {
      if (onAddVisitForProspect) onAddVisitForProspect(id);
    };
    (window as any).__apflow_prospect_note = (id: string) => {
      if (onOpenNote) onOpenNote(id);
    };
    return () => {
      delete (window as any).__apflow_prospect_convert;
      delete (window as any).__apflow_prospect_visit;
      delete (window as any).__apflow_prospect_note;
    };
  }, [prospects, onConvertProspect, onAddVisitForProspect, onOpenNote]);

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      const L = (await import("leaflet")).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted) return;

      const map = L.map(mapContainerRef.current, {
        center: [46.603354, 1.888334],
        zoom: 6,
        zoomControl: false,
      });

      // Esri Light Canvas by default for high contrast commercial map
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "&copy; Esri, HERE, Garmin",
          maxZoom: 16,
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      renderMarkers(L, map);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Re-render markers when filters or grouping change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      renderMarkers(L.default, mapInstanceRef.current);
    });
  }, [filteredList, zones, grouping]);

  function formatEuro(num: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(num);
  }

  function renderMarkers(L: any, map: any) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    if (grouping === "individual") {
      // INDIVIDUAL PIN VIEW
      filteredList.forEach((item) => {
        const { prospect, stage, potential, activity, supplier, geo } = item;
        const [lat, lng] = geo.coords;

        // Stage colors
        const stageCfg =
          PROSPECT_STAGES.find((s) => s.value === stage) || PROSPECT_STAGES[0];
        const pinColor =
          stage === "PRET_CODE_AP"
            ? "#10b981"
            : stage === "EN_TEST"
            ? "#a855f7"
            : stage === "EN_ECHANGE"
            ? "#f59e0b"
            : stage === "SANS_SUITE"
            ? "#71717a"
            : "#3b82f6";

        const iconHtml = `
          <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 26px; 
              height: 26px; 
              border-radius: 50%; 
              background: ${pinColor}; 
              border: 2px solid white; 
              box-shadow: 0 4px 10px rgba(0,0,0,0.25); 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-size: 11px; 
              font-weight: 800;
            ">
              🏢
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.9);
              color: white;
              font-size: 10px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 4px;
              margin-top: 2px;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              ${prospect.company}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: "prospect-map-pin",
          html: iconHtml,
          iconSize: [120, 48],
          iconAnchor: [60, 24],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        const popupHtml = `
          <div style="font-family: inherit; font-size: 12px; min-width: 230px; padding: 4px 2px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 3px;">
              ${prospect.company}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
              📍 ${prospect.address ? `${prospect.address}, ` : ""}${prospect.city} (${geo.deptName} - ${geo.region})
            </div>
            
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
              <span style="background: #f3e8ff; color: #7e22ce; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                ${stageCfg.shortLabel}
              </span>
              <span style="background: #ecfdf5; color: #047857; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                Potentiel: ${formatEuro(potential)}
              </span>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 8px; font-size: 11px;">
              <div>👤 Contact : <strong>${prospect.contactName || "—"}</strong></div>
              ${prospect.email ? `<div>✉️ Email : <a href="mailto:${prospect.email}" style="color: #2563eb;">${prospect.email}</a></div>` : ""}
              ${prospect.phone ? `<div>📞 Tél : <a href="tel:${prospect.phone}" style="color: #059669;">${prospect.phone}</a></div>` : ""}
            </div>

            <div style="display: flex; gap: 4px;">
              <button 
                type="button"
                onclick="window.__apflow_prospect_convert && window.__apflow_prospect_convert('${prospect.id}')"
                style="flex: 1; background: #059669; color: white; border: none; padding: 5px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;"
              >
                ✨ Convertir en Client
              </button>
              <button 
                type="button"
                onclick="window.__apflow_prospect_visit && window.__apflow_prospect_visit('${prospect.id}')"
                style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 5px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;"
                title="Consigner une visite"
              >
                🚗
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        marker.on("click", () => {
          setSelectedProspect(prospect);
          if (onSelectProspect) onSelectProspect(prospect);
        });

        markersRef.current.push(marker);
        bounds.extend([lat, lng]);
      });
    } else {
      // AGGREGATED BUBBLES VIEW (VILLE / DÉPARTEMENT / RÉGION)
      zones.forEach((z) => {
        const [lat, lng] = z.coords;
        const count = z.items.length;
        const radius = Math.min(Math.max(14 + Math.sqrt(count) * 6, 16), 38);

        const bubbleHtml = `
          <div style="
            width: ${radius * 2}px; 
            height: ${radius * 2}px; 
            border-radius: 50%; 
            background: rgba(147, 51, 234, 0.85); 
            border: 2px solid white; 
            box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            cursor: pointer; 
            transition: transform 0.2s;
          ">
            <span style="font-size: 13px; font-weight: 900; line-height: 1;">${count}</span>
            <span style="font-size: 9px; opacity: 0.9; line-height: 1; margin-top: 1px;">prospects</span>
          </div>
        `;

        const icon = L.divIcon({
          className: "zone-bubble",
          html: bubbleHtml,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        marker.on("click", () => {
          setSelectedZoneKey(z.key);
        });

        marker.bindTooltip(
          `<strong>${z.name}</strong><br/>${count} prospect(s)<br/>Potentiel : ${formatEuro(z.totalPotential)}`,
          { direction: "top", offset: [0, -radius] }
        );

        markersRef.current.push(marker);
        bounds.extend([lat, lng]);
      });
    }

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
    }
  }

  function handleRecenter() {
    if (!mapInstanceRef.current || filteredList.length === 0) return;
    import("leaflet").then((L) => {
      const bounds = L.default.latLngBounds([]);
      filteredList.forEach((item) => bounds.extend(item.geo.coords));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    });
  }

  return (
    <div className="space-y-3">
      {/* 1. Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
        {/* Grouping switcher: Individuel / Par Ville / Par Département / Par Région */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/80 overflow-x-auto max-w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden sm:inline shrink-0">
            Affichage :
          </span>
          <button
            type="button"
            onClick={() => {
              setGrouping("individual");
              setSelectedZoneKey(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              grouping === "individual"
                ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            📍 Points Réels ({filteredList.length})
          </button>
          <button
            type="button"
            onClick={() => setGrouping("city")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              grouping === "city"
                ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            🏙️ Par Ville
          </button>
          <button
            type="button"
            onClick={() => setGrouping("department")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              grouping === "department"
                ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            🗺️ Par Département
          </button>
          <button
            type="button"
            onClick={() => setGrouping("region")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              grouping === "region"
                ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            🌐 Par Région
          </button>
        </div>

        {/* Filters and Recenter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher ville, dép, nom..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
            />
          </div>

          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-purple-600 transition cursor-pointer shrink-0"
            title="Recentrer la carte sur tous les prospects"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Toggle Bar between Map and List */}
      <div className="flex lg:hidden items-center bg-slate-100 dark:bg-zinc-800/90 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setMobileTab("map");
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "map"
              ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
              : "text-slate-600 dark:text-zinc-400"
          }`}
        >
          <span>🗺️ Vue Carte</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("list")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "list"
              ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs"
              : "text-slate-600 dark:text-zinc-400"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-purple-600" />
          <span>
            {grouping === "individual"
              ? `Prospects (${filteredList.length})`
              : `Zones (${zones.length})`}
          </span>
        </button>
      </div>

      {/* 2. Map Container with Sidebar */}
      <div className="flex flex-col lg:flex-row h-[520px] sm:h-[620px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs relative">
        {/* Leaflet Container */}
        <div
          className={`relative flex-1 h-full min-h-[350px] ${
            mobileTab !== "map" ? "hidden lg:block" : "block"
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Quick info chip top-left */}
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-md text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span>
              {filteredList.length} prospect(s) géolocalisé(s)
            </span>
          </div>
        </div>

        {/* Side Panel: Zones / Details */}
        <div
          className={`w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40 flex flex-col shrink-0 overflow-hidden ${
            mobileTab === "map" ? "hidden lg:flex" : "flex flex-1 h-full"
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-600" />
              <span>
                {grouping === "individual"
                  ? "Liste des Prospects"
                  : `Zones (${zones.length})`}
              </span>
            </div>
            {selectedZoneKey && (
              <button
                type="button"
                onClick={() => setSelectedZoneKey(null)}
                className="text-[11px] text-purple-600 font-semibold hover:underline"
              >
                Voir tout
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 p-2 space-y-1">
            {grouping === "individual" ? (
              filteredList.map((item) => (
                <div
                  key={item.prospect.id}
                  onClick={() => {
                    setSelectedProspect(item.prospect);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(item.geo.coords, 13, { duration: 1 });
                    }
                  }}
                  className={`p-2.5 rounded-xl transition cursor-pointer text-xs space-y-1 ${
                    selectedProspect?.id === item.prospect.id
                      ? "bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800"
                      : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {item.prospect.company}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 shrink-0">
                      {formatEuro(item.potential)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                    <span>{item.prospect.city}</span>
                    <span className="text-slate-400">({item.geo.deptCode})</span>
                  </div>
                </div>
              ))
            ) : activeZone ? (
              // Selected Zone Details
              <div className="space-y-2">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="font-extrabold text-xs text-purple-900 dark:text-purple-200">
                    {activeZone.name}
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                    {activeZone.items.length} prospect(s) • Total : {formatEuro(activeZone.totalPotential)}
                  </div>
                </div>
                {activeZone.items.map((item) => (
                  <div
                    key={item.prospect.id}
                    className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 dark:text-zinc-100">
                        {item.prospect.company}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600">
                        {formatEuro(item.potential)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      📍 {item.prospect.city} ({item.geo.deptCode})
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      {item.prospect.phone && item.prospect.phone !== "NC" && (
                        <a
                          href={`tel:${item.prospect.phone}`}
                          className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Appeler</span>
                        </a>
                      )}
                      {onConvertProspect && (
                        <button
                          type="button"
                          onClick={() => onConvertProspect(item.prospect)}
                          className="px-2 py-1 rounded-lg bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Convertir</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Zones List
              zones.map((z) => (
                <div
                  key={z.key}
                  onClick={() => {
                    setSelectedZoneKey(z.key);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(z.coords, grouping === "city" ? 11 : grouping === "department" ? 9 : 7, { duration: 1 });
                    }
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-800/80 transition cursor-pointer text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {z.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                      {z.items.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{z.region}</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatEuro(z.totalPotential)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
