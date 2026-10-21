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
} from "lucide-react";
import { ClientItem, CLIENT_STATUS_CONFIG, formatRelativeDate } from "@/types/kam";
import { getClientVisitStatus } from "@/lib/visits";

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
  chambéry: [45.5646, 5.9178],
  lorient: [47.7483, -3.3667],
  troyes: [48.2973, 4.0744],
  montauban: [44.0176, 1.3547],
  tarbes: [43.2329, 0.0781],
  albi: [43.9298, 2.148],
  agen: [44.2031, 0.6164],
  bastia: [42.7028, 9.45],
  ajaccio: [41.9192, 8.7386],
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

// Pseudo-hash to slightly spread stores located in the same city so markers don't overlap completely
function getDisplacedCoordinates(lat: number, lng: number, id: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distanceKm = ((Math.abs(hash >> 3) % 25) + 5) / 100; // 0.05km to 0.30km
  // 1 deg lat ~ 111km, 1 deg lng ~ 111km * cos(lat)
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
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");

  // Geocode clients from saved addresses or city dictionary
  const geocodedClients = useMemo(() => {
    return clients.map((c) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let postalCode = "";

      if (typeof window !== "undefined") {
        postalCode = localStorage.getItem(`apflow_cp_${c.id}`) || "";
        try {
          const stored = localStorage.getItem(`apflow_addresses_v4_${c.id}`);
          if (stored) {
            const list = JSON.parse(stored);
            const primary = list.find((item: any) => item.isPrimary) || list[0];
            if (primary?.coordinates && Array.isArray(primary.coordinates)) {
              // AddressSuggestion coordinates: [longitude, latitude]
              lng = primary.coordinates[0];
              lat = primary.coordinates[1];
            }
            if (!postalCode && primary?.postalCode) postalCode = primary.postalCode;
          }
        } catch {}
      }

      // Fallback: match by city
      if (lat === null || lng === null) {
        const key = normalizeCityKey(c.city || "");
        if (FRENCH_CITIES_COORDINATES[key]) {
          [lat, lng] = FRENCH_CITIES_COORDINATES[key];
        } else {
          // If city not found, use department / zip code heuristic or France center
          const zip = parseInt(postalCode, 10);
          if (!isNaN(zip)) {
            const dept = Math.floor(zip / 1000);
            // approximate regions
            if (dept === 75 || dept >= 91 && dept <= 95 || dept === 77 || dept === 78) {
              lat = 48.8566; lng = 2.3522; // Île-de-France
            } else if (dept >= 13 && dept <= 13 || dept === 83 || dept === 6) {
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

      // Slightly displace duplicate coordinates so markers are distinguishable
      const [finalLat, finalLng] = getDisplacedCoordinates(lat, lng, c.id);
      const visitStatus = getClientVisitStatus(c);

      return {
        client: c,
        lat: finalLat,
        lng: finalLng,
        postalCode,
        visitStatus,
      };
    });
  }, [clients]);

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

    if (filterUrgency !== "ALL") {
      list = list.filter((item) => item.visitStatus.urgency === filterUrgency);
    }

    return list;
  }, [geocodedClients, searchQuery, filterUrgency]);

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
        zoomControl: true,
      });

      // CartoDB Positron clean elegant tiles
            // 100% Free OpenStreetMap standard tiles (No API key needed)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      updateMarkers(L, map);
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

  // Update markers when filteredList changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      updateMarkers(L.default, mapInstanceRef.current);
    });
  }, [filteredList]);

  function updateMarkers(L: any, map: any) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredList.forEach((item) => {
      const { client, lat, lng, visitStatus } = item;

      // Color based on visit urgency
      let markerBg = "#d90416"; // Auto Partner red by default
      let ringColor = "#fee2e2";

      if (visitStatus.urgency === "OVERDUE") {
        markerBg = "#e11d48"; // Rose/Red overdue
        ringColor = "#ffe4e6";
      } else if (visitStatus.urgency === "SOON") {
        markerBg = "#d97706"; // Amber soon
        ringColor = "#fef3c7";
      } else if (visitStatus.urgency === "OK") {
        markerBg = "#059669"; // Emerald fresh
        ringColor = "#d1fae5";
      } else if (visitStatus.urgency === "NEVER") {
        markerBg = "#64748b"; // Slate never visited
        ringColor = "#f1f5f9";
      }

      // Custom HTML Pin Marker
      const iconHtml = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: ${markerBg};
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.25);
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

      // Popup Content
      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">
            ${client.company}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            📍 ${client.city} ${item.postalCode ? `(${item.postalCode})` : ""}
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: ${ringColor}; color: ${markerBg}; margin-bottom: 8px;">
            ${visitStatus.urgency === "OVERDUE" ? `⚠️ En retard (+${visitStatus.daysOverdue}j)` : visitStatus.urgency === "OK" ? `✓ Visité il y a ${visitStatus.daysSinceLastVisit}j` : visitStatus.urgency === "SOON" ? `🕒 À re-visiter bientôt` : "Jamais visité"}
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; gap: 8px;">
            <a href="/clients/${client.id}" style="color: #d90416; font-weight: 700; text-decoration: none; font-size: 11px;">
              Ouvrir fiche →
            </a>
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
        <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-md">
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher client, ville..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416]"
            />
          </div>

          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-[#d90416] cursor-pointer"
          >
            <option value="ALL">Tous les statuts de visite</option>
            <option value="OVERDUE">⚠️ En retard de re-visite</option>
            <option value="OK">✓ Visités récemment</option>
            <option value="SOON">🕒 Re-visite proche</option>
            <option value="NEVER">⚪ Jamais visités</option>
          </select>

          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-1">
            {filteredList.length} magasin(s)
          </span>
        </div>

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-md text-[11px] flex items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-zinc-300">Légende :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span className="text-slate-600 dark:text-zinc-400">À jour</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
            <span className="text-slate-600 dark:text-zinc-400">Bientôt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
            <span className="text-slate-600 dark:text-zinc-400">En retard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span className="text-slate-600 dark:text-zinc-400">Jamais</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR : STORE LIST & DETAILS */}
      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
        {/* Selected Store Card (if any) */}
        {selectedClient ? (
          <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shadow-xs">
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
                <span>Ouvrir Fiche</span>
              </Link>

              {onAddVisitForClient && (
                <button
                  type="button"
                  onClick={() => onAddVisitForClient(selectedClient.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#d90416] text-xs font-bold border border-red-200 dark:border-red-900/50 hover:bg-[#d90416] hover:text-white transition"
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
          <div className="p-3.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs text-slate-500">
            Cliquez sur un marqueur sur la carte ou un magasin ci-dessous pour le localiser.
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
              const { client, lat, lng, visitStatus, postalCode } = item;
              const isSelected = selectedClient?.id === client.id;

              return (
                <div
                  key={client.id}
                  onClick={() => handleFocusClient(client, lat, lng)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-zinc-900 border-[#d90416] shadow-sm ring-1 ring-[#d90416]"
                      : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-zinc-100 text-xs truncate">
                      {client.company}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                        visitStatus.urgency === "OVERDUE"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : visitStatus.urgency === "SOON"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : visitStatus.urgency === "OK"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {visitStatus.urgency === "OVERDUE"
                        ? `Retard (+${visitStatus.daysOverdue}j)`
                        : visitStatus.urgency === "OK"
                        ? `${visitStatus.daysSinceLastVisit}j`
                        : visitStatus.urgency === "SOON"
                        ? "Bientôt"
                        : "Jamais"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 text-[#d90416] shrink-0" />
                    <span className="truncate">
                      {client.city} {postalCode ? `(${postalCode})` : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
