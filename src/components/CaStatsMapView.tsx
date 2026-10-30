"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  MapPin,
  Building2,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  Navigation,
  Eye,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown,
  X,
  Award,
  Crown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ClientItem, CLIENT_STATUS_CONFIG } from "@/types/kam";
import { MONTH_NAMES, SHORT_MONTHS } from "@/components/ClientCaSection";
import {
  FRENCH_REGIONS,
  FRENCH_DEPARTMENTS,
  resolveClientGeoData,
  normalizeGeoKey,
} from "@/lib/geoData";

interface CaStatsMapViewProps {
  clients: ClientItem[];
  activeKamId?: string;
}

export type GeoGroupingMode = "city" | "department" | "region";

export interface ZoneData {
  key: string;
  name: string;
  grouping: GeoGroupingMode;
  deptCode?: string;
  region: string;
  coords: [number, number];
  totalCa: number;
  totalOrders: number;
  stores: Array<{
    client: ClientItem;
    ca: number;
    ordersCount: number;
  }>;
}

export function CaStatsMapView({ clients, activeKamId }: CaStatsMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filters & State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const isAllMonthsSelected = selectedMonths.length === 0 || selectedMonths.length === 12;

  const activeMonthList = useMemo(() => {
    return isAllMonthsSelected
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [...selectedMonths].sort((a, b) => a - b);
  }, [isAllMonthsSelected, selectedMonths]);

  function selectPreset(preset: "ALL" | "T1" | "T2" | "T3" | "T4" | "S1" | "S2") {
    if (preset === "ALL") setSelectedMonths([]);
    else if (preset === "T1") setSelectedMonths([1, 2, 3]);
    else if (preset === "T2") setSelectedMonths([4, 5, 6]);
    else if (preset === "T3") setSelectedMonths([7, 8, 9]);
    else if (preset === "T4") setSelectedMonths([10, 11, 12]);
    else if (preset === "S1") setSelectedMonths([1, 2, 3, 4, 5, 6]);
    else if (preset === "S2") setSelectedMonths([7, 8, 9, 10, 11, 12]);
  }

  const periodLabel = useMemo(() => {
    if (isAllMonthsSelected) return "Année Complète (12 mois)";
    if (selectedMonths.length === 1) return MONTH_NAMES[selectedMonths[0] - 1];
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    const s = JSON.stringify(sorted);
    if (s === JSON.stringify([1, 2, 3])) return "Trimestre 1 (Jan-Mar)";
    if (s === JSON.stringify([4, 5, 6])) return "Trimestre 2 (Avr-Juin)";
    if (s === JSON.stringify([7, 8, 9])) return "Trimestre 3 (Juil-Sep)";
    if (s === JSON.stringify([10, 11, 12])) return "Trimestre 4 (Oct-Déc)";
    if (s === JSON.stringify([1, 2, 3, 4, 5, 6])) return "Semestre 1 (Jan-Juin)";
    if (s === JSON.stringify([7, 8, 9, 10, 11, 12])) return "Semestre 2 (Juil-Déc)";
    return `${sorted.length} mois (${sorted.map((m) => SHORT_MONTHS[m - 1]).join(", ")})`;
  }, [isAllMonthsSelected, selectedMonths]);

  const [grouping, setGrouping] = useState<GeoGroupingMode>("city");
  const [minCaFilter, setMinCaFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);

  // Turnovers from database
  const [turnovers, setTurnovers] = useState<any[]>([]);
  const [loadingTurnovers, setLoadingTurnovers] = useState(true);

  // Load CA from API
  const fetchTurnovers = useCallback(async () => {
    setLoadingTurnovers(true);
    try {
      const kamParam = activeKamId && activeKamId !== "ALL" ? `&kamId=${activeKamId}` : "";
      const res = await fetch(`/api/ca?year=${selectedYear}${kamParam}`);
      if (res.ok) {
        const data = await res.json();
        setTurnovers(data.turnovers || []);
      }
    } catch (err) {
      console.error("Error loading CA data for map:", err);
    } finally {
      setLoadingTurnovers(false);
    }
  }, [selectedYear, activeKamId]);

  useEffect(() => {
    fetchTurnovers();
  }, [fetchTurnovers]);

  // Map each client to resolved geo info & total CA
  const enrichedClients = useMemo(() => {
    return clients.map((client) => {
      // CA for selected year & optional selected multi-months
      const clientTurnovers = turnovers.filter((t: any) => {
        if (t.clientId !== client.id) return false;
        if (!isAllMonthsSelected && !selectedMonths.includes(t.month)) return false;
        return true;
      });
      const totalCa = clientTurnovers.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const totalOrders = clientTurnovers.reduce(
        (acc, t) => acc + (Number(t.ordersCount) || 0),
        0
      );

      // Postal code & custom coords
      let postalCode = "";
      let customCoords: [number, number] | null = null;
      if (typeof window !== "undefined") {
        postalCode = localStorage.getItem(`apflow_cp_${client.id}`) || "";
        try {
          const stored = localStorage.getItem(`apflow_addresses_v4_${client.id}`);
          if (stored) {
            const list = JSON.parse(stored);
            const primary = list.find((item: any) => item.isPrimary) || list[0];
            if (primary?.coordinates && Array.isArray(primary.coordinates)) {
              customCoords = [primary.coordinates[1], primary.coordinates[0]];
            }
            if (!postalCode && primary?.postalCode) postalCode = primary.postalCode;
          }
        } catch {}
      }

      const geo = resolveClientGeoData(client.city, postalCode, customCoords);

      return {
        client,
        totalCa,
        totalOrders,
        postalCode,
        ...geo,
      };
    });
  }, [clients, turnovers, isAllMonthsSelected, selectedMonths]);

  // Aggregate by chosen grouping mode
  const rawZones = useMemo(() => {
    const map = new Map<string, ZoneData>();

    enrichedClients.forEach((item) => {
      let key = "";
      let name = "";
      let coords: [number, number] = item.coords;
      let region = item.region;
      let deptCode = item.deptCode;

      if (grouping === "city") {
        key = normalizeGeoKey(item.city);
        name = item.city;
      } else if (grouping === "department") {
        key = item.deptCode;
        const deptInfo = FRENCH_DEPARTMENTS[item.deptCode];
        name = deptInfo ? `${deptInfo.code} — ${deptInfo.name}` : item.deptCode;
        if (deptInfo) coords = deptInfo.centroid;
      } else {
        key = normalizeGeoKey(item.region);
        name = item.region;
        if (FRENCH_REGIONS[item.region]) coords = FRENCH_REGIONS[item.region];
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          grouping,
          deptCode,
          region,
          coords,
          totalCa: 0,
          totalOrders: 0,
          stores: [],
        });
      }

      const zone = map.get(key)!;
      zone.totalCa += item.totalCa;
      zone.totalOrders += item.totalOrders;
      zone.stores.push({
        client: item.client,
        ca: item.totalCa,
        ordersCount: item.totalOrders,
      });
    });

    // Sort stores within each zone by CA descending
    map.forEach((zone) => {
      zone.stores.sort((a, b) => b.ca - a.ca);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCa - a.totalCa);
  }, [enrichedClients, grouping]);

  // National metrics
  const nationalMetrics = useMemo(() => {
    const totalCa = rawZones.reduce((acc, z) => acc + z.totalCa, 0);
    const totalStores = clients.length;
    const activeStoresWithCa = enrichedClients.filter((c) => c.totalCa > 0).length;
    const topZone = rawZones.length > 0 && rawZones[0].totalCa > 0 ? rawZones[0] : null;
    const avgCaPerStore = activeStoresWithCa > 0 ? Math.round(totalCa / activeStoresWithCa) : 0;

    return {
      totalCa,
      totalStores,
      activeStoresWithCa,
      topZone,
      avgCaPerStore,
    };
  }, [rawZones, clients, enrichedClients]);

  // Filtered zones according to search and minimum CA threshold
  const filteredZones = useMemo(() => {
    return rawZones.filter((zone) => {
      if (zone.totalCa < minCaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = zone.name.toLowerCase().includes(q);
        const matchesRegion = zone.region.toLowerCase().includes(q);
        const matchesStore = zone.stores.some((s) =>
          s.client.company.toLowerCase().includes(q)
        );
        return matchesName || matchesRegion || matchesStore;
      }

      return true;
    });
  }, [rawZones, minCaFilter, searchQuery]);

  // Maximum CA in filtered zones for bubble scaling
  const maxZoneCa = useMemo(() => {
    return filteredZones.length > 0 ? Math.max(...filteredZones.map((z) => z.totalCa)) : 1;
  }, [filteredZones]);

  // Active zone details when inspected
  const selectedZone = useMemo(() => {
    if (!selectedZoneKey) return null;
    return rawZones.find((z) => z.key === selectedZoneKey) || null;
  }, [selectedZoneKey, rawZones]);

  // Calculate rank of inspected zone
  const selectedZoneRank = useMemo(() => {
    if (!selectedZone) return 0;
    return rawZones.findIndex((z) => z.key === selectedZone.key) + 1;
  }, [selectedZone, rawZones]);

  // Global window handler for popup click
  useEffect(() => {
    (window as any).__apflow_select_ca_zone = (zoneKey: string) => {
      setSelectedZoneKey(zoneKey);
    };
    return () => {
      delete (window as any).__apflow_select_ca_zone;
    };
  }, []);

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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      renderZoneMarkers(L, map, filteredZones, maxZoneCa, selectedZoneKey);
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

  // Re-render markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      renderZoneMarkers(L.default, mapInstanceRef.current, filteredZones, maxZoneCa, selectedZoneKey);
    });
  }, [filteredZones, maxZoneCa, selectedZoneKey]);

  function renderZoneMarkers(
    L: any,
    map: any,
    zonesList: ZoneData[],
    maxCa: number,
    activeKey: string | null
  ) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    zonesList.forEach((zone, index) => {
      const isTop1 = index === 0 && zone.totalCa > 0;
      const isSelected = activeKey === zone.key;
      const ca = zone.totalCa;

      // Color scheme according to CA intensity
      let bgGrad = "linear-gradient(135deg, #64748b, #475569)";
      let borderColor = "#94a3b8";
      let ringGlow = "rgba(100, 116, 139, 0.3)";

      if (ca >= 100000 || isTop1) {
        bgGrad = "linear-gradient(135deg, #f59e0b, #d97706)";
        borderColor = "#fef3c7";
        ringGlow = "rgba(245, 158, 11, 0.45)";
      } else if (ca >= 50000) {
        bgGrad = "linear-gradient(135deg, #10b981, #059669)";
        borderColor = "#d1fae5";
        ringGlow = "rgba(16, 185, 129, 0.4)";
      } else if (ca >= 15000) {
        bgGrad = "linear-gradient(135deg, #0284c7, #0369a1)";
        borderColor = "#e0f2fe";
        ringGlow = "rgba(2, 132, 199, 0.35)";
      } else if (ca >= 1000) {
        bgGrad = "linear-gradient(135deg, #8b5cf6, #6d28d9)";
        borderColor = "#ede9fe";
        ringGlow = "rgba(139, 92, 246, 0.35)";
      }

      // Proportional bubble diameter
      const safeMax = Math.max(maxCa, 1);
      const ratio = Math.sqrt(ca / safeMax);
      const bubbleSize = Math.min(84, Math.max(38, Math.round(38 + ratio * 46)));

      // Formatted text inside bubble
      const caFormatted =
        ca >= 1000
          ? `${(ca / 1000).toFixed(ca >= 10000 ? 0 : 1)} k€`
          : ca > 0
          ? `${Math.round(ca)} €`
          : "0 €";

      // Pulsing Crown / Star for Top 1
      const crownBadge = isTop1
        ? `<div style="
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffffff;
            color: #d97706;
            font-size: 11px;
            font-weight: 900;
            padding: 1px 6px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 1.5px solid #f59e0b;
            display: flex;
            align-items: center;
            gap: 2px;
            white-space: nowrap;
          ">👑 N°1</div>`
        : "";

      const iconHtml = `
        <div style="
          position: relative;
          width: ${bubbleSize}px;
          height: ${bubbleSize}px;
          border-radius: 50%;
          background: ${bgGrad};
          border: ${isSelected ? "3px solid #ffffff" : `2px solid ${borderColor}`};
          box-shadow: ${
            isSelected
              ? `0 0 0 4px #d90416, 0 8px 24px rgba(0,0,0,0.5)`
              : isTop1
              ? `0 0 0 4px ${ringGlow}, 0 6px 18px rgba(245, 158, 11, 0.5)`
              : `0 4px 12px ${ringGlow}`
          };
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, sans-serif;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: center;
          padding: 2px;
        ">
          ${crownBadge}
          <div style="font-weight: 800; font-size: ${bubbleSize >= 60 ? "13px" : "11px"}; line-height: 1.1;">
            ${caFormatted}
          </div>
          <div style="font-size: 9px; opacity: 0.9; margin-top: 1px; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${zone.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-ca-bubble-pin",
        html: iconHtml,
        iconSize: [bubbleSize, bubbleSize],
        iconAnchor: [bubbleSize / 2, bubbleSize / 2],
        popupAnchor: [0, -bubbleSize / 2],
      });

      const marker = L.marker(zone.coords, { icon: customIcon }).addTo(map);

      // Popup Content
      const sharePct =
        nationalMetrics.totalCa > 0
          ? Math.round((zone.totalCa / nationalMetrics.totalCa) * 100)
          : 0;

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 180px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 2px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">
              ${zone.name}
            </div>
            <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 6px;">
              Rang #${index + 1}
            </span>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            📍 ${zone.region}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; margin-bottom: 8px;">
            <div style="font-size: 16px; font-weight: 900; color: #0f172a;">
              ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(zone.totalCa)}
            </div>
            <div style="font-size: 10px; color: #64748b; display: flex; justify-content: space-between; margin-top: 2px;">
              <span>${zone.stores.length} magasin${zone.stores.length > 1 ? "s" : ""}</span>
              <span style="font-weight: 700; color: #d90416;">${sharePct}% du CA total</span>
            </div>
          </div>
          <button
            type="button"
            onclick="window.__apflow_select_ca_zone && window.__apflow_select_ca_zone('${zone.key}')"
            style="width: 100%; cursor: pointer; border: none; background: #d90416; color: #ffffff; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-align: center;"
          >
            Inspecter la zone (${zone.stores.length} magasins) →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        setSelectedZoneKey(zone.key);
      });

      markersRef.current.push(marker);
      bounds.extend(zone.coords);
    });

    if (zonesList.length > 0 && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }

  function handleFocusZone(zone: ZoneData) {
    setSelectedZoneKey(zone.key);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(zone.coords, 10, { duration: 1.2 });
    }
  }

  function handleLaunchZoneTour(zone: ZoneData) {
    if (zone.stores.length === 0) return;
    const stops = zone.stores.map((s) => {
      let postal = "";
      if (typeof window !== "undefined") {
        postal = localStorage.getItem(`apflow_cp_${s.client.id}`) || "";
      }
      return encodeURIComponent(
        [s.client.company, s.client.address, postal, s.client.city, "France"]
          .filter(Boolean)
          .join(" ")
      );
    });
    const url = `https://www.google.com/maps/dir/${stops.join("/")}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* 1. TOP STATS STRIP : METRICS DU TERRITOIRE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: CA Global Cartographié */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>CA Total Cartographié</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(nationalMetrics.totalCa)}
          </div>
          <p className="text-[11px] text-slate-400">
            {!isAllMonthsSelected
              ? `${periodLabel} ${selectedYear} • ${nationalMetrics.activeStoresWithCa} magasins actifs`
              : `Exercice ${selectedYear} (Cumul 12 mois) • ${nationalMetrics.activeStoresWithCa} magasins actifs`}
          </p>
        </div>

        {/* Card 2: Zone N°1 en France */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Zone N°1 France</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 truncate">
            {nationalMetrics.topZone ? nationalMetrics.topZone.name : "Aucune zone"}
          </div>
          <p className="text-[11px] text-slate-500">
            {nationalMetrics.topZone
              ? `${new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(nationalMetrics.topZone.totalCa)} (${Math.round(
                  (nationalMetrics.topZone.totalCa /
                    Math.max(1, nationalMetrics.totalCa)) *
                    100
                )}% du total)`
              : "0 €"}
          </p>
        </div>

        {/* Card 3: Zones Détectées */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Territoires Détectés</span>
            <MapPin className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {filteredZones.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Groupement {grouping === "city" ? "par ville" : grouping === "department" ? "par département" : "par région"}
          </p>
        </div>

        {/* Card 4: CA Moyen par Magasin Actif */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Moyenne par Magasin</span>
            <TrendingUp className="w-4 h-4 text-[#d90416]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(nationalMetrics.avgCaPerStore)}
          </div>
          <p className="text-[11px] text-slate-400">
            sur {nationalMetrics.activeStoresWithCa} magasin{nationalMetrics.activeStoresWithCa > 1 ? "s" : ""} facturé{nationalMetrics.activeStoresWithCa > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* 2. MAIN MAP & SIDEBAR CONTAINER */}
      <div className="flex flex-col lg:flex-row gap-4 h-[720px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        {/* MAP CONTAINER */}
        <div className="relative flex-1 h-full min-h-[400px]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Control Bar over map */}
          <div className="absolute top-3.5 left-3.5 right-3.5 sm:right-auto z-[1000] flex flex-wrap items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-md">
            {/* Search */}
            <div className="relative w-44 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher zone, ville..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
              />
            </div>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value={2026}>Année 2026</option>
              <option value={2025}>Année 2025</option>
              <option value={2024}>Année 2024</option>
            </select>

            {/* Multi-Month / Period Selector */}
            <select
              value={
                isAllMonthsSelected
                  ? "ALL"
                  : selectedMonths.length === 1
                  ? String(selectedMonths[0])
                  : JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3])
                  ? "T1"
                  : JSON.stringify(activeMonthList) === JSON.stringify([4, 5, 6])
                  ? "T2"
                  : JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9])
                  ? "T3"
                  : JSON.stringify(activeMonthList) === JSON.stringify([10, 11, 12])
                  ? "T4"
                  : JSON.stringify(activeMonthList) === JSON.stringify([1, 2, 3, 4, 5, 6])
                  ? "S1"
                  : JSON.stringify(activeMonthList) === JSON.stringify([7, 8, 9, 10, 11, 12])
                  ? "S2"
                  : "CUSTOM"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "ALL") selectPreset("ALL");
                else if (
                  val === "T1" ||
                  val === "T2" ||
                  val === "T3" ||
                  val === "T4" ||
                  val === "S1" ||
                  val === "S2"
                ) {
                  selectPreset(val as any);
                } else if (val !== "CUSTOM") {
                  setSelectedMonths([Number(val)]);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-[#d90416] cursor-pointer"
              title="Filtrer la carte par période ou mois"
            >
              <option value="ALL">📅 Tous les mois (Annuel)</option>
              <option value="T1">Trimestre 1 (Jan-Mar)</option>
              <option value="T2">Trimestre 2 (Avr-Juin)</option>
              <option value="T3">Trimestre 3 (Juil-Sep)</option>
              <option value="T4">Trimestre 4 (Oct-Déc)</option>
              <option value="S1">Semestre 1 (Jan-Juin)</option>
              <option value="S2">Semestre 2 (Juil-Déc)</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={String(idx + 1)}>
                  Mois : {m}
                </option>
              ))}
              {!isAllMonthsSelected &&
                selectedMonths.length > 1 &&
                !["T1", "T2", "T3", "T4", "S1", "S2"].includes(periodLabel) && (
                  <option value="CUSTOM">Sélection : {periodLabel}</option>
                )}
            </select>

            {/* Grouping switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-zinc-800 p-0.5 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGrouping("city")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  grouping === "city"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
                title="Analyser par ville / agglomération"
              >
                Par Ville
              </button>
              <button
                type="button"
                onClick={() => setGrouping("department")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  grouping === "department"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
                title="Analyser par département"
              >
                Département
              </button>
              <button
                type="button"
                onClick={() => setGrouping("region")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  grouping === "region"
                    ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
                title="Analyser par région"
              >
                Région
              </button>
            </div>

            {/* Min CA Filter dropdown */}
            <select
              value={minCaFilter}
              onChange={(e) => setMinCaFilter(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-[#d90416] cursor-pointer"
            >
              <option value={0}>Tous les montants</option>
              <option value={1000}>CA &gt; 1 000 €</option>
              <option value={5000}>CA &gt; 5 000 €</option>
              <option value={10000}>CA &gt; 10 000 €</option>
              <option value={50000}>Top CA &gt; 50 000 €</option>
            </select>

            {loadingTurnovers && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#d90416]" />
            )}
          </div>

          {/* Legend Overlay at bottom left: Heat Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-md text-[11px] flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700 dark:text-zinc-300">Intensité CA :</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span className="text-slate-600 dark:text-zinc-400">&gt; 50 k€ (N°1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span className="text-slate-600 dark:text-zinc-400">15 - 50 k€</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
              <span className="text-slate-600 dark:text-zinc-400">5 - 15 k€</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
              <span className="text-slate-600 dark:text-zinc-400">1 - 5 k€</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
              <span className="text-slate-600 dark:text-zinc-400">&lt; 1 k€</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR : LEADERBOARD OR ZONE INSPECTOR */}
        <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 overflow-hidden">
          {/* INSPECTOR MODE : A ZONE IS SELECTED */}
          {selectedZone ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shadow-xs shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Rang #{selectedZoneRank}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        {selectedZone.region}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#d90416]" />
                      <span>{selectedZone.name}</span>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedZoneKey(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    title="Fermer l'inspection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* KPI block of inspected zone */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      CA Zone
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-zinc-100">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(selectedZone.totalCa)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Part Nationale
                    </span>
                    <div className="text-base font-black text-[#d90416]">
                      {nationalMetrics.totalCa > 0
                        ? `${Math.round(
                            (selectedZone.totalCa / nationalMetrics.totalCa) * 100
                          )}%`
                        : "0%"}
                    </div>
                  </div>
                </div>

                {/* Action: Launch multi-stop tour for this zone */}
                <button
                  type="button"
                  onClick={() => handleLaunchZoneTour(selectedZone)}
                  className="w-full mt-3 py-2 px-3 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Itinéraire Google Maps ({selectedZone.stores.length} magasins)</span>
                </button>
              </div>

              {/* Stores in this zone */}
              <div className="p-3 bg-slate-100/60 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 flex items-center justify-between shrink-0">
                <span>Magasins dans cette zone ({selectedZone.stores.length})</span>
                <span className="text-[10px] text-slate-400">Classés par CA</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {selectedZone.stores.map((s, idx) => {
                  const statusCfg = CLIENT_STATUS_CONFIG[s.client.status];
                  const storeShare =
                    selectedZone.totalCa > 0
                      ? Math.round((s.ca / selectedZone.totalCa) * 100)
                      : 0;

                  return (
                    <div
                      key={s.client.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/clients/${s.client.id}`}
                            className="text-xs font-bold text-slate-900 dark:text-zinc-100 hover:text-[#d90416] transition flex items-center gap-1"
                          >
                            <span>{s.client.company}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            📍 {s.client.city}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            statusCfg?.badgeClass || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusCfg?.label || s.client.status}
                        </span>
                      </div>

                      {/* CA amount & contribution bar */}
                      <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900 dark:text-zinc-100">
                            {new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                              maximumFractionDigits: 0,
                            }).format(s.ca)}
                          </span>
                          <span className="text-[10px] font-bold text-[#d90416]">
                            {storeShare}% de la zone
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#d90416]"
                            style={{ width: `${Math.min(100, Math.max(4, storeShare))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* LEADERBOARD MODE : TOP ZONES RANKING */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-[#d90416]" />
                  <span>Classement des Territoires ({filteredZones.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Cliquez sur une zone pour l&apos;isoler sur la carte et voir ses magasins.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredZones.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <p>Aucun territoire ne correspond aux filtres.</p>
                  </div>
                ) : (
                  filteredZones.map((z, idx) => {
                    const isTop1 = idx === 0 && z.totalCa > 0;
                    const isTop2 = idx === 1 && z.totalCa > 0;
                    const isTop3 = idx === 2 && z.totalCa > 0;

                    const sharePct =
                      nationalMetrics.totalCa > 0
                        ? Math.round((z.totalCa / nationalMetrics.totalCa) * 100)
                        : 0;

                    const barWidth =
                      nationalMetrics.topZone && nationalMetrics.topZone.totalCa > 0
                        ? Math.round((z.totalCa / nationalMetrics.topZone.totalCa) * 100)
                        : 0;

                    return (
                      <div
                        key={z.key}
                        onClick={() => handleFocusZone(z)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isTop1
                            ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 hover:border-amber-400"
                            : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Rank badge */}
                            <div
                              className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                                isTop1
                                  ? "bg-amber-500 text-white shadow-2xs"
                                  : isTop2
                                  ? "bg-slate-400 text-white"
                                  : isTop3
                                  ? "bg-amber-700 text-white"
                                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                              }`}
                            >
                              {idx + 1}
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate block">
                                {z.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {z.region} • {z.stores.length} magasin{z.stores.length > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-xs text-slate-900 dark:text-zinc-100 block">
                              {new Intl.NumberFormat("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                                maximumFractionDigits: 0,
                              }).format(z.totalCa)}
                            </span>
                            <span className="text-[10px] font-bold text-[#d90416]">
                              {sharePct}% national
                            </span>
                          </div>
                        </div>

                        {/* Progress bar vs Top 1 */}
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isTop1 ? "bg-amber-500" : "bg-[#d90416]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, barWidth))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
