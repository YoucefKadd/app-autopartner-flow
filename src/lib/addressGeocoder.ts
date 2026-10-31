// Base Adresse Nationale (BAN) Geocoding Service for France
// Uses https://api-adresse.data.gouv.fr/ (open, free, no api key required)

export interface GeocodedAddress {
  lat: number;
  lng: number;
  label?: string;
  score?: number;
  city?: string;
  postcode?: string;
  isExactAddress: boolean;
}

const memoryCache = new Map<string, GeocodedAddress>();

function getCacheKey(id: string, address: string, city: string, postalCode?: string): string {
  const norm = `${address || ""}_${postalCode || ""}_${city || ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return `apflow_geo_${id}_${norm}`;
}

/**
 * Geocode a single address using the French BAN API with localStorage caching.
 */
export async function geocodeClientAddress(
  id: string,
  address?: string,
  city?: string,
  postalCode?: string
): Promise<GeocodedAddress | null> {
  const cleanAddress = (address || "").trim();
  const cleanCity = (city || "").trim();
  const cleanZip = (postalCode || "").trim();

  // If no street address and no city, cannot geocode
  if (!cleanAddress && !cleanCity) return null;

  const cacheKey = getCacheKey(id, cleanAddress, cleanCity, cleanZip);

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check localStorage cache
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as GeocodedAddress;
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}
  }

  // 3. Build query for BAN API: prioritize street address + city + postal code
  // Example: "12 rue de la Paix 75002 Paris"
  const queryParts = [cleanAddress, cleanZip, cleanCity].filter(Boolean);
  const query = queryParts.join(" ");

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      query
    )}&limit=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coords = feature.geometry.coordinates; // [lng, lat]
      const score = feature.properties?.score || 0;
      const type = feature.properties?.type; // "housenumber", "street", "locality", "municipality"
      const label = feature.properties?.label;

      const isExact = type === "housenumber" || type === "street" || score >= 0.5;

      const result: GeocodedAddress = {
        lat: coords[1],
        lng: coords[0],
        label,
        score,
        city: feature.properties?.city,
        postcode: feature.properties?.postcode,
        isExactAddress: isExact && Boolean(cleanAddress),
      };

      // Save in memory & localStorage
      memoryCache.set(cacheKey, result);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}
      }

      return result;
    }
  } catch (err) {
    console.warn("Error geocoding address:", query, err);
  }

  return null;
}

/**
 * Batch geocode clients with concurrency limit (e.g. 5 at a time)
 */
export async function batchGeocodeClients(
  clients: Array<{
    id: string;
    address?: string;
    city: string;
    postalCode?: string;
  }>,
  onProgress?: (resolved: Map<string, GeocodedAddress>) => void
): Promise<Map<string, GeocodedAddress>> {
  const results = new Map<string, GeocodedAddress>();

  // Filter clients that have an address
  const toGeocode = clients.filter((c) => (c.address && c.address.trim()) || c.city);

  const concurrency = 4;
  for (let i = 0; i < toGeocode.length; i += concurrency) {
    const chunk = toGeocode.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (c) => {
        const geo = await geocodeClientAddress(c.id, c.address, c.city, c.postalCode);
        if (geo) {
          results.set(c.id, geo);
        }
      })
    );
    if (onProgress && results.size > 0) {
      onProgress(new Map(results));
    }
  }

  return results;
}
