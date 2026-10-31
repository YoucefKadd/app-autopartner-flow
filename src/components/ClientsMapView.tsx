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
} from "lucide-react";
import { ClientItem, ClientStatus, CLIENT_STATUS_CONFIG, formatRelativeDate } from "@/types/kam";
import { getClientVisitStatus } from "@/lib/visits";
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
  bastia: [42.7028, 9.45],
  ajaccio: [41.9192, 8.7386],
};

// Exact visual styling according to ClientStatus (VIP, Active, Prospect, New, A relancer, Inactif, Archivé)
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
    bg: "#a855f7", // Purple
    ring: "#f3e8ff",
    label: "Prospect",
  },
  NEW: {
    bg: "#0284c7", // Sky Blue
    ring: "#e0f2fe",
    label: "New",
  },
  FOLLOW_UP: {
    bg: "#f97316", // Orange
    ring: "#ffedd5",
    label: "À relancer",
  },
  INACTIVE: {
    bg: "#71717a", // Zinc / Gray
    ring: "#f4f4f5",
    label: "Inactif",
  },
  ARCHIVED: {
    bg: "#64748b", // Slate
    ring: "#f1f5f9",
    label: "Archivé",
  },
};

function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Spread stores located in the same city slightly so markers don't overlap completely
function getDisplacedCoordinates(lat: number, lng: number, id: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distanceKm = ((Math.abs(hash >> 3) % 25) + 5) / 100; // 0.05km to 0.30km
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
      if (realGeo && realGeo.isExactAddress) {
        lat = realGeo.lat;
        lng = realGeo.lng;
        isExactAddress = true;
        if (!postalCode && realGeo.postcode) postalCode = realGeo.postcode;
      }

      // 2. Try saved custom coordinates in localStorage
      if (lat === null || lng === null) {
        if (typeof window !== "undefined") {
          const storedZip = localStorage.getItem(`apflow_cp_${c.id}`);
          if (storedZip) postalCode = storedZip;
          try {
            const stored = localStorage.getItem(`apflow_addresses_v4_${c.id}`);
            if (stored) {
              const list = JSON.parse(stored);
              const primary = list.find((item: any) => item.isPrimary) || list[0];
              if (primary?.coordinates && Array.isArray(primary.coordinates)) {
                lng = primary.coordinates[0];
                lat = primary.coordinates[1];
                isExactAddress = true;
              }
              if (!postalCode && primary?.postalCode) postalCode = primary.postalCode;
            }
          } catch {}
        }
      }

      // 3. Fallback: match by city center
      if (lat === null || lng === null) {
        const key = normalizeCityKey(c.city || "");
        if (FRENCH_CITIES_COORDINATES[key]) {
          [lat, lng] = FRENCH_CITIES_COORDINATES[key];
        } else {
          const zip = parseInt(postalCode, 10);
          if (!isNaN(zip)) {
            const dept = Math.floor(zip / 1000);
            if (dept === 75 || (dept >= 91 && dept <= 95) || dept === 77 || dept === 78) {
              lat = 48.8566; lng = 2.3522; // Île-de-France
            } else if (dept === 13 || dept === 83 || dept === 6) {
              lat = 43.5; lng = 6.0; // PACA
            } else if (dept === 69 || dept === 38 || dept === 42 || dept === 73 || dept === 74) {
              lat = 45.75; lng = 4.85; // Rhône-Alpes
            } else if (dept === 31 || dept === 34 || dept === 66 || dept === 81) {
              lat = 43.6; lng = 2.0; // Occitanie
            } else if (dept === 33 || dept === 64 || dept === 40 || dept === 17) {
              lat = 44.8; lng = -0.5; // Nouvelle-Aquitaine
            } else if (dept === 44 || dept === 35 || dept === 56 || dept === 29) {
              lat = 47.5; lng = -2.0; // Bretagne / Pays de la Loire
            } else if (dept === 59 || dept === 62) {
              lat = 50.5; lng = 2.8; // Hauts-de-France
            } else if (dept === 67 || dept === 68 || dept === 54 || dept === 57) {
              lat = 48.6; lng = 7.0; // Grand Est
            } else {
              lat = 46.603354; lng = 1.888334; // Centre de la France
            }
          } else {
            lat = 46.603354; lng = 1.888334;
          }
        }
      }

      // If exact real street address, DO NOT displace! Pin is precisely on the building!
      // Only displace if falling back to generic city center so duplicate city markers don't overlap.
      const finalLat = isExactAddress ? lat! : getDisplacedCoordinates(lat!, lng!, c.id)[0];
      const finalLng = isExactAddress ? lng! : getDisplacedCoordinates(lat!, lng!, c.id)[1];
      const visitStatus = getClientVisitStatus(c);

      return {
        client: c,
        lat: finalLat,
        lng: finalLng,
        postalCode,
        visitStatus,
        isExactAddress,
      };
    });
  }, [clients, realAddressCoords]);

  // Filtered clients for the map
  const filteredList = useMemo(() => {
    let list = geocodedClients;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.client.company.toLowerCase().includes(q) ||
          item.client.city.toLowerCase().includes(q) ||
          item.postalCode.includes(q)
      );
    }

    if (filterStatus !== "ALL") {
      list = list.filter((item) => item.client.status === filterStatus);
    }

    return list;
  }, [geocodedClients, searchQuery, filterStatus]);

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

    return () => {
      delete (window as any).__apflow_toggle_tour_stop;
    };
  }, []);

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

      // 100% Free OpenStreetMap standard tiles (No API key needed)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      updateMarkers(L, map, tourStopIds);
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

  // Update markers when filteredList or tourStopIds changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      updateMarkers(L.default, mapInstanceRef.current, tourStopIds);
    });
  }, [filteredList, tourStopIds]);

  function updateMarkers(L: any, map: any, currentTourIds: string[]) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredList.forEach((item) => {
      const { client, lat, lng, visitStatus } = item;

      // Color STRICTLY based on client status
      const statusColor = STATUS_PIN_COLORS[client.status] || {
        bg: "#d90416",
        ring: "#fee2e2",
        label: client.status,
      };

      const markerBg = statusColor.bg;
      const ringColor = statusColor.ring;
      const statusLabel = CLIENT_STATUS_CONFIG[client.status]?.label || client.status;

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

      // Custom HTML Pin Marker with distinct color and clean white core
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

      // Popup Content with status badge, real address verification and 1-click Tour Toggle
      const exactAddressLabel = client.address
        ? `${client.address}, ${item.postalCode ? `${item.postalCode} ` : ""}${client.city}`
        : `${client.city} ${item.postalCode ? `(${item.postalCode})` : ""}`;

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 180px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">
            ${client.company}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
            📍 ${exactAddressLabel}
          </div>
          ${
            item.isExactAddress
              ? `<div style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ecfdf5; color: #047857; font-size: 9px; font-weight: 700; margin-bottom: 6px; border: 1px solid #a7f3d0;">✓ Adresse réelle GPS vérifiée</div>`
              : `<div style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #f8fafc; color: #64748b; font-size: 9px; font-weight: 600; margin-bottom: 6px;">📍 Agglomération ${client.city}</div>`
          }
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: ${ringColor}; color: ${markerBg}; border: 1px solid ${markerBg}40;">
              ● Statut : ${statusLabel}
            </span>
            ${isTour ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #fee2e2; color: #d90416; border: 1px solid #f87171;">Étape ${tourIndex}</span>` : ""}
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; flex-direction: column; gap: 6px;">
            <button
              type="button"
              onclick="window.__apflow_toggle_tour_stop && window.__apflow_toggle_tour_stop('${client.id}')"
              style="cursor: pointer; border: 1px solid ${isTour ? '#fca5a5' : '#cbd5e1'}; background: ${isTour ? '#fff1f2' : '#f8fafc'}; color: ${isTour ? '#e11d48' : '#0f172a'}; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-align: center;"
            >
              ${isTour ? "✓ Retirer de la tournée" : "+ Ajouter à la tournée"}
            </button>
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[720px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
      {/* MAP VIEW CONTAINER */}
      <div className="relative flex-1 h-full min-h-[400px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Quick Filters On Map */}
        <div className="absolute top-3.5 left-3.5 right-3.5 sm:right-auto z-[1000] flex flex-wrap items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-md">
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher client, ville..."
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
            onClick={() => setSidebarTab("tournee")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              tourStopIds.length > 0
                ? "bg-[#d90416] text-white border-[#d90416] shadow-xs"
                : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#d90416]"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Tournée ({tourStopIds.length})</span>
          </button>

          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-1">
            {filteredList.length} magasin(s)
          </span>
        </div>

        {/* Legend Overlay at bottom left: By Client Status */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-md text-[11px] flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-zinc-300">Statuts :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-slate-600 dark:text-zinc-400">VIP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-slate-600 dark:text-zinc-400">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
            <span className="text-slate-600 dark:text-zinc-400">Prospect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
            <span className="text-slate-600 dark:text-zinc-400">New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
            <span className="text-slate-600 dark:text-zinc-400">À relancer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#71717a]" />
            <span className="text-slate-600 dark:text-zinc-400">Inactif</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR : DUAL TABS (MAGASINS vs TOURNÉE TERRAIN) */}
      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
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
                        ? `Étape #${tourStopIds.indexOf(selectedClient.id) + 1}`
                        : "+ Tournée"}
                    </span>
                  </button>

                  {onAddVisitForClient && (
                    <button
                      type="button"
                      onClick={() => onAddVisitForClient(selectedClient.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416] text-xs font-bold border border-red-200 dark:border-red-900/50 hover:bg-[#d90416] hover:text-white transition cursor-pointer"
                      title="Consigner une visite"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Visite</span>
                    </button>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedClient.company} ${selectedClient.city}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Lancer itinéraire GPS dans Google Maps"
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs text-slate-500 shrink-0">
                Cliquez sur un marqueur sur la carte ou ci-dessous pour le localiser.
              </div>
            )}

            {/* Scrollable list of stores */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucun magasin ne correspond aux critères.
                </div>
              ) : (
                filteredList.map((item) => {
                  const { client, lat, lng, postalCode } = item;
                  const isSelected = selectedClient?.id === client.id;
                  const isTour = tourStopIds.includes(client.id);
                  const tourIndex = tourStopIds.indexOf(client.id) + 1;
                  const statusCfg = CLIENT_STATUS_CONFIG[client.status];

                  return (
                    <div
                      key={client.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-white dark:bg-zinc-900 border-[#d90416] shadow-xs ring-1 ring-[#d90416]"
                          : isTour
                          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                          : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div
                          onClick={() => handleFocusClient(client, lat, lng)}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-bold text-slate-900 dark:text-zinc-100 text-xs truncate block hover:text-[#d90416] transition">
                            {client.company}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                            <span className="truncate">
                              {client.address ? `${client.address}, ` : ""}{client.city} {postalCode ? `(${postalCode})` : ""}
                            </span>
                          </div>
                          {item.isExactAddress && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                              ✓ Adresse réelle GPS vérifiée
                            </span>
                          )}
                        </div>

                        {/* Quick 1-click Tour Toggle button */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTourStop(client.id);
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              isTour
                                ? "bg-[#d90416] text-white shadow-2xs"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-[#d90416] hover:text-white"
                            }`}
                            title={isTour ? "Retirer de la tournée" : "Ajouter à la tournée"}
                          >
                            <Navigation className="w-3 h-3" />
                            <span>{isTour ? `#${tourIndex}` : "+"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            statusCfg?.badgeClass || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusCfg?.label || client.status}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-[10px] font-bold text-slate-400 hover:text-[#d90416] transition"
                          >
                            Voir fiche →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TOURNÉE TERRAIN BUILDER */}
        {sidebarTab === "tournee" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header controls */}
            <div className="p-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#d90416]" />
                  <span>Étapes de la tournée ({tourStops.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Organisez l&apos;ordre de vos visites terrain.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {tourStops.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTour}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] font-semibold transition"
                    title="Vider la tournée"
                  >
                    Vider
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddAllFilteredToTour}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-bold transition"
                  title="Ajouter tous les magasins actuellement affichés"
                >
                  + Tout ajouter ({filteredList.length})
                </button>
              </div>
            </div>

            {/* Stops sequence list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tourStops.length === 0 ? (
                <div className="py-12 text-center space-y-3 px-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center mx-auto">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                    Votre tournée est vide
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ajoutez des magasins en cliquant sur les marqueurs de la carte ou sur le bouton &quot;+&quot; dans l&apos;onglet Magasins.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddAllFilteredToTour}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d90416] text-white text-xs font-bold hover:bg-[#b80312] transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter les {filteredList.length} magasins visibles</span>
                  </button>
                </div>
              ) : (
                tourStops.map((c, index) => {
                  const statusCfg = CLIENT_STATUS_CONFIG[c.status];
                  const isFirst = index === 0;
                  const isLast = index === tourStops.length - 1;

                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs hover:border-slate-300 transition"
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
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                            title="Monter cette étape"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveTourStop(index, 1)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                            title="Descendre cette étape"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveTourStop(c.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
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
    </div>
  );
}
