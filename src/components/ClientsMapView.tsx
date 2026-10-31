"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  Navigation,
  Search,
  Filter,
  Eye,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  X,
  Route,
  Layers,
  Maximize2,
  Minimize2,
  EyeOff,
  Sliders,
  Sparkles,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Car,
  RotateCcw,
} from "lucide-react";
import { ClientItem, ClientStatus, CLIENT_STATUS_CONFIG, formatRelativeDate } from "@/types/kam";
import { getClientVisitStatus, VisitUrgency } from "@/lib/visits";
import { batchGeocodeClients, GeocodedAddress } from "@/lib/addressGeocoder";

// Approximate coordinates for major French cities / departments as reliable fallback
const FRENCH_CITIES_COORDINATES: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  marseille: [43.2965, 5.3698],
  lyon: [45.764, 4.8357],
  toulouse: [43.6047, 1.4442],
  nice: [43.7102, 7.262],
  nantes: [47.2184, -1.5536],
  strasbourg: [48.5734, 7.7521],
  montpellier: [43.6108, 3.8767],
  bordeaux: [44.8378, -0.5792],
  lille: [50.6292, 3.0573],
  rennes: [48.1173, -1.6778],
  reims: [49.2583, 4.0317],
  toulon: [43.1242, 5.928],
  saint_etienne: [45.4397, 4.3872],
  le_havre: [49.4944, 0.1079],
  grenoble: [45.1885, 5.7245],
  dijon: [47.322, 5.0415],
  angers: [47.4784, -0.5632],
  nimes: [43.8367, 4.36],
  villeurbanne: [45.7719, 4.8902],
  clermont_ferrand: [45.7772, 3.087],
  le_mans: [48.0061, 0.1996],
  aix_en_provence: [43.5297, 5.4474],
  brest: [48.3904, -4.4861],
  tours: [47.3941, 0.6848],
  amiens: [49.8941, 2.2957],
  limoges: [45.8336, 1.2611],
  annecy: [45.8992, 6.1294],
  perpignan: [42.6887, 2.8948],
  besancon: [47.2378, 6.0241],
  orleans: [47.9029, 1.9093],
  metz: [49.1193, 6.1757],
  rouen: [49.4432, 1.0999],
  mulhouse: [47.7508, 7.3359],
  caen: [49.1829, -0.3707],
  nancy: [48.6921, 6.1844],
  avignon: [43.9493, 4.8055],
  poitiers: [46.5802, 0.3404],
  dunkerque: [51.0343, 2.3768],
  beziers: [43.3442, 3.2158],
  la_rochelle: [46.1603, -1.1511],
  pau: [43.2951, -0.3708],
  calais: [50.9513, 1.8587],
  antibes: [43.5804, 7.1251],
  cannes: [43.5528, 7.0174],
  valence: [44.9334, 4.8924],
  chambery: [45.5646, 5.9178],
  lorient: [47.7483, -3.3667],
  troyes: [48.2973, 4.0744],
  montauban: [44.0176, 1.3547],
  tarbes: [43.2329, 0.0781],
  albi: [43.9298, 2.148],
  agen: [44.2031, 0.6164],
  muret: [43.4608, 1.3267],
  colomiers: [43.6139, 1.3364],
  blagnac: [43.6361, 1.3917],
  bastia: [42.7028, 9.45],
  ajaccio: [41.9192, 8.7386],
};

// Exact visual styling according to ClientStatus
export const STATUS_PIN_COLORS: Record<
  ClientStatus,
  { bg: string; ring: string; label: string }
> = {
  VIP: {
    bg: "#f59e0b", // Amber / Gold
    ring: "#fef3c7",
    label: "VIP",
  },
  ACTIVE: {
    bg: "#10b981", // Emerald Green
    ring: "#d1fae5",
    label: "Active",
  },
  PROSPECT: {
    bg: "#a855f7", // Purple / Violet
    ring: "#f3e8ff",
    label: "Prospect",
  },
  NEW: {
    bg: "#0284c7", // Sky Blue
    ring: "#e0f2fe",
    label: "Nouveau",
  },
  FOLLOW_UP: {
    bg: "#f97316", // Orange
    ring: "#ffedd5",
    label: "À relancer",
  },
  INACTIVE: {
    bg: "#71717a", // Slate gray
    ring: "#f4f4f5",
    label: "Inactif",
  },
  ARCHIVED: {
    bg: "#94a3b8", // Light slate
    ring: "#f1f5f9",
    label: "Archivé",
  },
};

// Colors based on visit urgency
export const VISIT_URGENCY_COLORS: Record<
  VisitUrgency,
  { bg: string; ring: string; label: string }
> = {
  OVERDUE: { bg: "#dc2626", ring: "#fee2e2", label: "Re-visite en retard" },
  SOON: { bg: "#f59e0b", ring: "#fef3c7", label: "Re-visite imminente (< 7j)" },
  OK: { bg: "#10b981", ring: "#d1fae5", label: "Visite à jour" },
  NEVER: { bg: "#64748b", ring: "#f1f5f9", label: "Aucune visite consignée" },
  DISABLED: { bg: "#94a3b8", ring: "#f1f5f9", label: "Cadence désactivée" },
};

// Map Tile Styles (Fonds de carte)
export type MapStyleType = "osm" | "satellite" | "dark" | "light";

export const MAP_TILES: Record<
  MapStyleType,
  { name: string; url: string; attribution: string; maxZoom: number; icon: string }
> = {
  osm: {
    name: "Plan Routier",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    icon: "🗺️",
  },
  satellite: {
    name: "Satellite Aérien",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri & Maxar Earthstar',
    maxZoom: 19,
    icon: "🛰️",
  },
  dark: {
    name: "Mode Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; CARTO',
    maxZoom: 19,
    icon: "🌙",
  },
  light: {
    name: "Clair Minimal",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; CARTO',
    maxZoom: 19,
    icon: "☀️",
  },
};

// Map Heights (Tailles de la carte)
export type MapHeightType = "compact" | "standard" | "maxi";

// Quick Filter Categories
export type QuickFilterCategory = "ALL" | "ACTIVE_VIP" | "PROSPECTS" | "OVERDUE";

// Color Mode
export type ColorModeType = "STATUS" | "URGENCY";

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_");
}

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitterCoordinates(
  lat: number,
  lng: number,
  id: string,
  distanceKm = 1.0
): [number, number] {
  const hash = hashStringToNumber(id);
  const angle = (hash % 360) * (Math.PI / 180);
  const dLat = (distanceKm * Math.cos(angle)) / 111;
  const dLng = (distanceKm * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

interface ClientsMapViewProps {
  clients: ClientItem[];
  onSelectClient?: (client: ClientItem) => void;
  onAddVisitForClient?: (clientId: string) => void;
}

export function ClientsMapView({
  clients,
  onSelectClient,
  onAddVisitForClient,
}: ClientsMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);

  // VIEW CONTROLS (Taille, Visibilité, Carte, Couleurs)
  const [mapStyle, setMapStyle] = useState<MapStyleType>("osm");
  const [mapHeight, setMapHeight] = useState<MapHeightType>("standard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [colorMode, setColorMode] = useState<ColorModeType>("STATUS");
  const [quickFilter, setQuickFilter] = useState<QuickFilterCategory>("ALL");

  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Tournée Terrain Builder state
  const [sidebarTab, setSidebarTab] = useState<"stores" | "tournee">("stores");
  const [tourStopIds, setTourStopIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("apflow_tournee_stops");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  // Tournée resolved client stops
  const tourStops = useMemo(() => {
    return tourStopIds
      .map((id) => clients.find((c) => c.id === id))
      .filter(Boolean) as ClientItem[];
  }, [tourStopIds, clients]);

  // Real street address geocoding map: clientId -> GeocodedAddress
  const [realAddressCoords, setRealAddressCoords] = useState<Map<string, GeocodedAddress>>(() => {
    const initialMap = new Map<string, GeocodedAddress>();
    if (typeof window !== "undefined") {
      clients.forEach((c) => {
        const cleanAddress = (c.address || "").trim();
        const cleanCity = (c.city || "").trim();
        const cleanZip = (c.postalCode || "").trim();
        const norm = `${cleanAddress}_${cleanZip}_${cleanCity}`
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        const cacheKey = `apflow_geo_${c.id}_${norm}`;
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            initialMap.set(c.id, JSON.parse(stored));
          }
        } catch {}
      });
    }
    return initialMap;
  });

  // Batch geocode clients with actual street addresses via French Government BAN API
  useEffect(() => {
    let isCancelled = false;
    const clientsToGeocode = clients.map((c) => ({
      id: c.id,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
    }));

    batchGeocodeClients(clientsToGeocode, (newResults) => {
      if (!isCancelled) {
        setRealAddressCoords((prev) => {
          const merged = new Map(prev);
          newResults.forEach((val, key) => merged.set(key, val));
          return merged;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [clients]);

  // Geocode clients from real street address BAN API, saved addresses, or city dictionary
  const geocodedClients = useMemo(() => {
    return clients.map((c) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let postalCode = c.postalCode || "";
      let isExactAddress = false;

      // 1. Try real street address coordinates from BAN API
      const realGeo = realAddressCoords.get(c.id);
      if (realGeo && typeof realGeo.lat === "number" && typeof realGeo.lng === "number") {
        lat = realGeo.lat;
        lng = realGeo.lng;
        isExactAddress = true;
        if (realGeo.postcode && !postalCode) {
          postalCode = realGeo.postcode;
        }
      }

      // 2. Try saved custom lat/lng in localStorage
      if (lat === null && typeof window !== "undefined") {
        const savedLat = localStorage.getItem(`apflow_lat_${c.id}`);
        const savedLng = localStorage.getItem(`apflow_lng_${c.id}`);
        const savedCp = localStorage.getItem(`apflow_cp_${c.id}`);
        if (savedLat && savedLng) {
          const pLat = parseFloat(savedLat);
          const pLng = parseFloat(savedLng);
          if (!isNaN(pLat) && !isNaN(pLng)) {
            lat = pLat;
            lng = pLng;
            isExactAddress = true;
          }
        }
        if (savedCp && !postalCode) {
          postalCode = savedCp;
        }
      }

      // 3. Fallback: Lookup approximate coordinates in major French cities dictionary
      if (lat === null && c.city) {
        const normCity = normalizeCity(c.city);
        const cityCoord = FRENCH_CITIES_COORDINATES[normCity];
        if (cityCoord) {
          const [baseLat, baseLng] = cityCoord;
          const [jLat, jLng] = jitterCoordinates(baseLat, baseLng, c.id, 1.2);
          lat = jLat;
          lng = jLng;
        }
      }

      // 4. Ultimate fallback: Center of France
      if (lat === null || lng === null) {
        const [jLat, jLng] = jitterCoordinates(46.603354, 1.888334, c.id, 5.0);
        lat = jLat;
        lng = jLng;
      }

      const visitStatus = getClientVisitStatus(c);

      return {
        client: c,
        lat,
        lng,
        postalCode,
        isExactAddress,
        visitStatus,
      };
    });
  }, [clients, realAddressCoords]);

  // Filtered clients for the map based on search, status filter, and quickFilter
  const filteredList = useMemo(() => {
    let list = geocodedClients;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.client.company.toLowerCase().includes(q) ||
          item.client.city.toLowerCase().includes(q) ||
          item.postalCode.includes(q) ||
          (item.client.apClientNumber && item.client.apClientNumber.toLowerCase().includes(q))
      );
    }

    // Status select
    if (filterStatus !== "ALL") {
      list = list.filter((item) => item.client.status === filterStatus);
    }

    // Quick filter pills
    if (quickFilter === "ACTIVE_VIP") {
      list = list.filter((item) => item.client.status === "ACTIVE" || item.client.status === "VIP");
    } else if (quickFilter === "PROSPECTS") {
      list = list.filter((item) => item.client.status === "PROSPECT");
    } else if (quickFilter === "OVERDUE") {
      list = list.filter((item) => item.visitStatus.urgency === "OVERDUE");
    }

    return list;
  }, [geocodedClients, searchQuery, filterStatus, quickFilter]);

  // Global window handler for Leaflet popup click
  useEffect(() => {
    (window as any).__apflow_toggle_tour_stop = (clientId: string) => {
      setTourStopIds((prev) => {
        let next: string[];
        if (prev.includes(clientId)) {
          next = prev.filter((id) => id !== clientId);
        } else {
          next = [...prev, clientId];
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("apflow_tournee_stops", JSON.stringify(next));
        }
        return next;
      });
    };

    (window as any).__apflow_add_visit_direct = (clientId: string) => {
      if (onAddVisitForClient) {
        onAddVisitForClient(clientId);
      }
    };

    return () => {
      delete (window as any).__apflow_toggle_tour_stop;
      delete (window as any).__apflow_add_visit_direct;
    };
  }, [onAddVisitForClient]);

  // ESC key listener for Fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Invalidate Leaflet size when height, sidebar or fullscreen changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mapHeight, isFullscreen, isSidebarOpen, mapStyle]);

  function toggleTourStop(clientId: string) {
    setTourStopIds((prev) => {
      let next: string[];
      if (prev.includes(clientId)) {
        next = prev.filter((id) => id !== clientId);
      } else {
        next = [...prev, clientId];
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("apflow_tournee_stops", JSON.stringify(next));
      }
      return next;
    });
  }

  function handleMoveTourStop(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tourStopIds.length) return;
    setTourStopIds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      if (typeof window !== "undefined") {
        localStorage.setItem("apflow_tournee_stops", JSON.stringify(copy));
      }
      return copy;
    });
  }

  function handleRemoveTourStop(id: string) {
    setTourStopIds((prev) => {
      const next = prev.filter((item) => item !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("apflow_tournee_stops", JSON.stringify(next));
      }
      return next;
    });
  }

  function handleClearTour() {
    if (typeof window !== "undefined" && window.confirm("Vider toutes les étapes de la tournée ?")) {
      setTourStopIds([]);
      localStorage.removeItem("apflow_tournee_stops");
    }
  }

  function handleAddAllFilteredToTour() {
    setTourStopIds((prev) => {
      const set = new Set(prev);
      filteredList.forEach((item) => set.add(item.client.id));
      const next = Array.from(set);
      if (typeof window !== "undefined") {
        localStorage.setItem("apflow_tournee_stops", JSON.stringify(next));
      }
      return next;
    });
    setSidebarTab("tournee");
  }

  function handleLaunchGoogleMapsTour() {
    if (tourStops.length === 0) return;
    const stops = tourStops.map((c) => {
      let postal = "";
      if (typeof window !== "undefined") {
        postal = localStorage.getItem(`apflow_cp_${c.id}`) || "";
      }
      return encodeURIComponent([c.company, c.address, postal, c.city, "France"].filter(Boolean).join(" "));
    });
    const url = `https://www.google.com/maps/dir/${stops.join("/")}`;
    window.open(url, "_blank");
  }

  // Recenter on all visible markers
  function handleRecenterMap() {
    if (!mapInstanceRef.current || filteredList.length === 0) return;
    import("leaflet").then((L) => {
      const bounds = L.default.latLngBounds([]);
      filteredList.forEach((item) => bounds.extend([item.lat, item.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    });
  }

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted) return;

      // Create map centered on France
      const map = L.map(mapContainerRef.current, {
        center: [46.603354, 1.888334],
        zoom: 6,
        zoomControl: false,
      });

      // Add selected Tile Layer
      const tileCfg = MAP_TILES[mapStyle] || MAP_TILES.osm;
      tileLayerRef.current = L.tileLayer(tileCfg.url, {
        attribution: tileCfg.attribution,
        maxZoom: tileCfg.maxZoom,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      updateMarkers(L, map, tourStopIds, showLabels, colorMode);
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

  // Handle mapStyle changes (swapping tile layers)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
      }
      const tileCfg = MAP_TILES[mapStyle] || MAP_TILES.osm;
      tileLayerRef.current = L.default.tileLayer(tileCfg.url, {
        attribution: tileCfg.attribution,
        maxZoom: tileCfg.maxZoom,
      }).addTo(mapInstanceRef.current);
    });
  }, [mapStyle]);

  // Update markers when filteredList, tourStopIds, showLabels or colorMode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      updateMarkers(L.default, mapInstanceRef.current, tourStopIds, showLabels, colorMode);
    });
  }, [filteredList, tourStopIds, showLabels, colorMode]);

  function updateMarkers(
    L: any,
    map: any,
    currentTourIds: string[],
    currentShowLabels: boolean,
    currentColorMode: ColorModeType
  ) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredList.forEach((item) => {
      const { client, lat, lng, visitStatus } = item;

      // Color choice: Status vs Visit Urgency
      let markerBg = "#d90416";
      let ringColor = "#fee2e2";
      let statusLabel: string = client.status;

      if (currentColorMode === "STATUS") {
        const sc = STATUS_PIN_COLORS[client.status] || {
          bg: "#d90416",
          ring: "#fee2e2",
          label: client.status,
        };
        markerBg = sc.bg;
        ringColor = sc.ring;
        statusLabel = CLIENT_STATUS_CONFIG[client.status]?.label || client.status;
      } else {
        // Color by visit urgency
        const uc = VISIT_URGENCY_COLORS[visitStatus.urgency] || VISIT_URGENCY_COLORS.NEVER;
        markerBg = uc.bg;
        ringColor = uc.ring;
        statusLabel = uc.label;
      }

      const isTour = currentTourIds.includes(client.id);
      const tourIndex = currentTourIds.indexOf(client.id) + 1;

      // Distinct Tour Badge if included in route
      const badgeHtml = isTour
        ? `<div style="
            position: absolute;
            top: -10px;
            right: -10px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #d90416;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            transform: rotate(45deg);
          ">${tourIndex}</div>`
        : "";

      // Custom HTML Pin Marker
      const iconHtml = `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: ${markerBg};
          transform: rotate(-45deg);
          border: ${isTour ? "3px solid #d90416" : "2px solid #ffffff"};
          box-shadow: ${isTour ? "0 0 0 2px #fee2e2, 0 4px 12px rgba(217,4,22,0.4)" : "0 4px 10px rgba(0,0,0,0.3)"};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          <div style="
            width: 14px;
            height: 14px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${markerBg};"></div>
          </div>
          ${badgeHtml}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Tooltip label above marker if showLabels is active
      if (currentShowLabels) {
        marker.bindTooltip(
          `<div style="font-weight: 800; font-size: 10px; color: #0f172a; white-space: nowrap;">${client.company}</div>`,
          {
            permanent: true,
            direction: "top",
            offset: [0, -32],
            className: "apflow-map-permanent-tooltip",
          }
        );
      }

      // Popup Content
      const exactAddressLabel = client.address
        ? `${client.address}, ${item.postalCode ? `${item.postalCode} ` : ""}${client.city}`
        : `${client.city} ${item.postalCode ? `(${item.postalCode})` : ""}`;

      const apCodeLabel = client.apClientNumber
        ? `<span style="font-family: monospace; font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">Code AP : #${client.apClientNumber}</span>`
        : "";

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">
              ${client.company}
            </div>
          </div>
          ${apCodeLabel ? `<div style="margin-bottom: 4px;">${apCodeLabel}</div>` : ""}
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
            📍 ${exactAddressLabel}
          </div>
          ${
            item.isExactAddress
              ? `<div style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ecfdf5; color: #047857; font-size: 9px; font-weight: 700; margin-bottom: 6px; border: 1px solid #a7f3d0;">✓ Adresse réelle GPS vérifiée</div>`
              : `<div style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #f8fafc; color: #64748b; font-size: 9px; font-weight: 600; margin-bottom: 6px;">📍 Agglomération ${client.city}</div>`
          }
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: ${ringColor}; color: ${markerBg}; border: 1px solid ${markerBg}40;">
              ● ${statusLabel}
            </span>
            ${isTour ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #fee2e2; color: #d90416; border: 1px solid #f87171;">Étape ${tourIndex}</span>` : ""}
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 4px;">
              <button
                type="button"
                onclick="window.__apflow_toggle_tour_stop && window.__apflow_toggle_tour_stop('${client.id}')"
                style="flex: 1; cursor: pointer; border: 1px solid ${isTour ? '#fca5a5' : '#cbd5e1'}; background: ${isTour ? '#fff1f2' : '#f8fafc'}; color: ${isTour ? '#e11d48' : '#0f172a'}; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-align: center;"
              >
                ${isTour ? "✓ Retirer tournée" : "+ Ajouter tournée"}
              </button>
              <button
                type="button"
                onclick="window.__apflow_add_visit_direct && window.__apflow_add_visit_direct('${client.id}')"
                style="cursor: pointer; border: 1px solid #fed7aa; background: #fff7ed; color: #c2410c; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-align: center;"
                title="Consigner une visite terrain"
              >
                🚗 Visiter
              </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <a href="/clients/${client.id}" style="color: #d90416; font-weight: 700; text-decoration: none; font-size: 11px;">
                Ouvrir fiche →
              </a>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([client.company, client.address, item.postalCode, client.city, "France"].filter(Boolean).join(" "))}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 11px;">
                GPS Direct ↗
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        setSelectedClient(client);
      });

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    if (filteredList.length > 0 && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }

  function handleFocusClient(client: ClientItem, lat: number, lng: number) {
    setSelectedClient(client);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  }

  // Height container class based on mapHeight state
  const heightClass = useMemo(() => {
    if (isFullscreen) return "h-full flex-1";
    if (mapHeight === "compact") return "h-[500px]";
    if (mapHeight === "maxi") return "h-[860px]";
    return "h-[680px]";
  }, [mapHeight, isFullscreen]);

  return (
    <>
      {/* Global CSS for permanent Leaflet tooltips */}
      <style jsx global>{`
        .apflow-map-permanent-tooltip {
          background-color: rgba(255, 255, 255, 0.95);
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          border-radius: 6px;
          padding: 2px 6px;
          pointer-events: none;
        }
        .dark .apflow-map-permanent-tooltip {
          background-color: rgba(24, 24, 27, 0.95);
          border-color: #3f3f46;
          color: #f4f4f5;
        }
      `}</style>

      <div
        className={`${
          isFullscreen
            ? "fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex flex-col w-screen h-screen"
            : "space-y-3"
        }`}
      >
        {/* =========================================================================
            TOP CONTROL TOOLBAR (TAILLE, VISIBILITÉ, CARTE, COULEURS)
           ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
          {/* Group 1: Map Tile Styles (Fonds de carte) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
              Fond :
            </span>
            {(Object.keys(MAP_TILES) as MapStyleType[]).map((st) => {
              const cfg = MAP_TILES[st];
              const isActive = mapStyle === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setMapStyle(st)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-zinc-900 text-[#d90416] shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                  title={`Passer au fond ${cfg.name}`}
                >
                  <span>{cfg.icon}</span>
                  <span className="hidden md:inline">{cfg.name}</span>
                </button>
              );
            })}
          </div>

          {/* Group 2: Quick Filter Category Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
              Vue :
            </span>
            <button
              type="button"
              onClick={() => setQuickFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                quickFilter === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tous ({geocodedClients.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("ACTIVE_VIP")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                quickFilter === "ACTIVE_VIP"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-900"
              }`}
            >
              <span>Actifs &amp; VIP</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("PROSPECTS")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                quickFilter === "PROSPECTS"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-purple-700 dark:text-purple-400 hover:text-purple-900"
              }`}
            >
              <span>Prospects</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("OVERDUE")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                quickFilter === "OVERDUE"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "text-red-700 dark:text-red-400 hover:text-red-900"
              }`}
            >
              <span>Retard Re-visite</span>
            </button>
          </div>

          {/* Group 3: Color Mode + Labels Toggle + Recenter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Color Mode Switcher */}
            <button
              type="button"
              onClick={() => setColorMode(colorMode === "STATUS" ? "URGENCY" : "STATUS")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:border-[#d90416] transition cursor-pointer"
              title="Basculer la coloration des pins : Statut commercial vs Urgence de re-visite"
            >
              <Sliders className="w-3.5 h-3.5 text-[#d90416]" />
              <span className="hidden sm:inline">Pins :</span>
              <span className="font-bold">
                {colorMode === "STATUS" ? "Statuts Clients" : "Urgences Visites"}
              </span>
            </button>

            {/* Permanent Labels Toggle */}
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                showLabels
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-slate-900"
                  : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:border-[#d90416]"
              }`}
              title="Afficher ou masquer les noms des magasins directement au-dessus des pins"
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Noms sur carte</span>
            </button>

            {/* Recenter / FitBounds button */}
            <button
              type="button"
              onClick={handleRecenterMap}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-[#d90416] transition cursor-pointer"
              title="Recentrer la carte sur tous les magasins affichés"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Height Selector (non-fullscreen mode) */}
            {!isFullscreen && (
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setMapHeight("compact")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    mapHeight === "compact"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                      : "text-slate-500"
                  }`}
                  title="Hauteur compacte (500px)"
                >
                  Compact
                </button>
                <button
                  type="button"
                  onClick={() => setMapHeight("standard")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    mapHeight === "standard"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                      : "text-slate-500"
                  }`}
                  title="Hauteur standard (680px)"
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setMapHeight("maxi")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    mapHeight === "maxi"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                      : "text-slate-500"
                  }`}
                  title="Hauteur maxi (860px)"
                >
                  Maxi
                </button>
              </div>
            )}

            {/* Sidebar toggle button (expand map to 100% width) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:border-[#d90416] transition cursor-pointer"
              title={isSidebarOpen ? "Masquer le volet latéral pour agrandir la carte" : "Afficher le volet latéral"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isSidebarOpen ? "Plein large" : "Volet"}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-[#d90416] transition cursor-pointer"
              title={isFullscreen ? "Quitter le plein écran (Échap)" : "Passer en plein écran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* =========================================================================
            MAP + COLLAPSIBLE SIDEBAR CONTAINER
           ========================================================================= */}
        <div
          className={`flex flex-col lg:flex-row gap-0 ${heightClass} rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs relative`}
        >
          {/* MAP CANVAS CONTAINER */}
          <div className="relative flex-1 h-full min-h-[400px]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Search & Status Select On Map */}
            <div className="absolute top-3.5 left-3.5 right-3.5 sm:right-auto z-[1000] flex flex-wrap items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-md">
              <div className="relative w-44 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher client, code AP..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
                />
              </div>

              {/* Filter by Client Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-[#d90416] cursor-pointer"
              >
                <option value="ALL">Tous les statuts clients</option>
                {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {CLIENT_STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>

              {/* Shortcut to Tournée tab */}
              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(true);
                  setSidebarTab("tournee");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  tourStopIds.length > 0
                    ? "bg-[#d90416] text-white border-[#d90416] shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Tournée ({tourStopIds.length})</span>
              </button>

              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 px-1">
                {filteredList.length} affiché(s)
              </span>
            </div>

            {/* Dynamic Legend at bottom left */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-md text-[11px] flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {colorMode === "STATUS" ? "Légende Statuts :" : "Légende Visites :"}
              </span>
              {colorMode === "STATUS" ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-slate-600 dark:text-zinc-400">VIP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-600 dark:text-zinc-400">Actif</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                    <span className="text-slate-600 dark:text-zinc-400">Prospect</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                    <span className="text-slate-600 dark:text-zinc-400">Nouveau</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                    <span className="text-slate-600 dark:text-zinc-400">À relancer</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#71717a]" />
                    <span className="text-slate-600 dark:text-zinc-400">Inactif</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-600 dark:text-zinc-400">À jour</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-slate-600 dark:text-zinc-400">&lt; 7j</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                    <span className="text-slate-600 dark:text-zinc-400 font-bold">En retard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                    <span className="text-slate-600 dark:text-zinc-400">Jamais</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* =========================================================================
              COLLAPSIBLE RIGHT SIDEBAR : DUAL TABS (MAGASINS vs TOURNÉE TERRAIN)
             ========================================================================= */}
          {isSidebarOpen && (
            <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 shrink-0">
              {/* Navigation Tabs Header */}
              <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarTab("stores")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === "stores"
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Magasins ({filteredList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab("tournee")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === "tournee"
                      ? "bg-[#d90416] text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Ma Tournée</span>
                  {tourStopIds.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        sidebarTab === "tournee" ? "bg-white text-[#d90416]" : "bg-[#d90416] text-white"
                      }`}
                    >
                      {tourStopIds.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: STORES DIRECTORY */}
              {sidebarTab === "stores" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Selected Store Card (if any) */}
                  {selectedClient ? (
                    <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shadow-xs shrink-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-[#d90416]" />
                            <span>{selectedClient.company}</span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedClient.city}</span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                CLIENT_STATUS_CONFIG[selectedClient.status]?.badgeClass
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  CLIENT_STATUS_CONFIG[selectedClient.status]?.dotClass
                                }`}
                              />
                              {CLIENT_STATUS_CONFIG[selectedClient.status]?.label || selectedClient.status}
                            </span>

                            {selectedClient.apClientNumber && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                AP #{selectedClient.apClientNumber}
                              </span>
                            )}

                            {tourStopIds.includes(selectedClient.id) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#d90416] border border-rose-200">
                                Étape #{tourStopIds.indexOf(selectedClient.id) + 1} de la tournée
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClient(null)}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          Fermer
                        </button>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <Link
                          href={`/clients/${selectedClient.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-[#d90416] dark:hover:bg-[#d90416] dark:hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Fiche</span>
                        </Link>

                        {onAddVisitForClient && (
                          <button
                            type="button"
                            onClick={() => onAddVisitForClient(selectedClient.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold hover:bg-orange-100 transition"
                            title="Consigner une visite"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>Visiter</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleTourStop(selectedClient.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            tourStopIds.includes(selectedClient.id)
                              ? "bg-rose-50 dark:bg-rose-950/40 text-[#d90416] border border-rose-300 dark:border-rose-900 hover:bg-rose-100"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200"
                          }`}
                          title={
                            tourStopIds.includes(selectedClient.id)
                              ? "Retirer ce magasin de la tournée"
                              : "Ajouter ce magasin à la tournée"
                          }
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#d90416]" />
                          <span>
                            {tourStopIds.includes(selectedClient.id)
                              ? "Retirer"
                              : "+ Tournée"}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Add All Filtered to Tour button */}
                  {filteredList.length > 0 && (
                    <div className="p-2 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 flex items-center justify-between text-xs shrink-0">
                      <span className="text-[11px] text-slate-500">
                        {filteredList.length} magasin(s) trouvés
                      </span>
                      <button
                        type="button"
                        onClick={handleAddAllFilteredToTour}
                        className="text-[#d90416] font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        title="Ajouter tous ces magasins dans votre tournée Google Maps"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Tout ajouter à la tournée</span>
                      </button>
                    </div>
                  )}

                  {/* Stores List Scrollable */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
                    {filteredList.map((item) => {
                      const { client, lat, lng, postalCode, isExactAddress, visitStatus } = item;
                      const isSelected = selectedClient?.id === client.id;
                      const isTour = tourStopIds.includes(client.id);

                      return (
                        <div
                          key={client.id}
                          onClick={() => handleFocusClient(client, lat, lng)}
                          className={`p-3 transition-colors cursor-pointer text-xs ${
                            isSelected
                              ? "bg-red-50/70 dark:bg-red-950/30 border-l-4 border-[#d90416]"
                              : "hover:bg-slate-100/70 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  colorMode === "STATUS"
                                    ? CLIENT_STATUS_CONFIG[client.status]?.dotClass || "bg-[#d90416]"
                                    : VISIT_URGENCY_COLORS[visitStatus.urgency]?.bg || "bg-slate-400"
                                }`}
                              />
                              <span className="line-clamp-1">{client.company}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTourStop(client.id);
                              }}
                              className={`shrink-0 p-1 rounded-md text-[10px] font-bold border transition ${
                                isTour
                                  ? "bg-[#d90416] text-white border-[#d90416]"
                                  : "bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
                              }`}
                              title={isTour ? "Retirer de la tournée" : "Ajouter à la tournée"}
                            >
                              {isTour ? `✓ #${tourStopIds.indexOf(client.id) + 1}` : "+ Tournée"}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{client.city}</span>
                              {postalCode && <span>({postalCode})</span>}
                            </span>
                            {client.apClientNumber && (
                              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                #{client.apClientNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: TOURNÉE TERRAIN BUILDER */}
              {sidebarTab === "tournee" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tour summary bar */}
                  <div className="p-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-zinc-100">
                        {tourStops.length} étape(s) sélectionnée(s)
                      </span>
                    </div>
                    {tourStops.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearTour}
                        className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Tout vider</span>
                      </button>
                    )}
                  </div>

                  {/* List of stops with re-ordering */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2 space-y-1.5">
                    {tourStops.length === 0 ? (
                      <div className="py-16 text-center text-xs text-slate-400 px-4 space-y-2">
                        <Route className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                        <p className="font-semibold text-slate-600 dark:text-zinc-300">
                          Votre tournée est vide
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Cliquez sur les marqueurs de la carte ou sur le bouton &quot;+ Tournée&quot; d&apos;un magasin pour construire votre itinéraire terrain.
                        </p>
                      </div>
                    ) : (
                      tourStops.map((c, index) => {
                        const isFirst = index === 0;
                        const isLast = index === tourStops.length - 1;

                        return (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Step Sequence Badge */}
                              <div className="w-7 h-7 rounded-xl bg-[#d90416] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                                {index + 1}
                              </div>

                              {/* Store Info */}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/clients/${c.id}`}
                                  className="font-bold text-xs text-slate-900 dark:text-zinc-100 hover:text-[#d90416] transition truncate block"
                                >
                                  {c.company}
                                </Link>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                                  <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                                  <span>{c.city}</span>
                                  {c.postalCode && <span>({c.postalCode})</span>}
                                </div>
                              </div>

                              {/* Reorder and Delete Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMoveTourStop(index, -1)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                                  title="Monter cette étape"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMoveTourStop(index, 1)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                                  title="Descendre cette étape"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTourStop(c.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                  title="Retirer de la tournée"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom Launch Button */}
                  {tourStops.length > 0 && (
                    <div className="p-3 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 shadow-md shrink-0 space-y-2">
                      <button
                        type="button"
                        onClick={handleLaunchGoogleMapsTour}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Navigation className="w-4 h-4 fill-white" />
                        <span>Lancer l&apos;itinéraire Google Maps ({tourStops.length} étapes)</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </button>
                      <p className="text-[10px] text-center text-slate-400">
                        Ouvre l&apos;itinéraire routier multi-destinations direct dans Google Maps
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
