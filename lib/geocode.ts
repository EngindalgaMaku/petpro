// Address → coordinates for the route screen. Server-only (keeps the API key and the request
// pacing in one place). Google's Geocoding API when GOOGLE_MAPS_API_KEY is set, otherwise
// OpenStreetMap Nominatim, whose usage policy asks for an identifying User-Agent, at most one
// request per second and caching; callers store the result on the customer so each address is
// looked up once.

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** "address": the street/building was found; "district": only the district centre */
  precision: "address" | "district";
}

interface AddressParts {
  address?: string | null;
  district?: string | null;
  city?: string | null;
}

// Nominatim asks for an identifying agent; APP_URL is the public address once deployed
const USER_AGENT = `PetPro/0.1 (${process.env.APP_URL || "kurulum öncesi"})`;

let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatimCall = 0;

function paced<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(async () => {
    const wait = lastNominatimCall + 1100 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimCall = Date.now();
    return task();
  });
  nominatimQueue = run.catch(() => undefined);
  return run;
}

async function nominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  return paced(async () => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    return results[0] ? { lat: Number(results[0].lat), lon: Number(results[0].lon) } : null;
  });
}

async function google(query: string, key: string): Promise<{ lat: number; lon: number; exact: boolean } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?region=tr&language=tr&address=${encodeURIComponent(query)}&key=${key}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status: string;
    results: Array<{ geometry: { location: { lat: number; lng: number }; location_type: string } }>;
  };
  const first = data.status === "OK" ? data.results[0] : undefined;
  if (!first) return null;
  return {
    lat: first.geometry.location.lat,
    lon: first.geometry.location.lng,
    exact: first.geometry.location_type !== "APPROXIMATE",
  };
}

/**
 * Turkish addresses carry door, flat and floor details that street-level geocoders do not
 * know ("No: 5 Daire 3 Kat 2"); the street part alone finds far more.
 */
export function streetPart(address: string) {
  return address
    // Letter-aware boundaries: \b treats ğ, ş, ı… as breaks and would cut "Bağdat" at "dat"
    .replace(/(?<![\p{L}\d])(no|numara|daire|d|kat|blok|apt|apartmanı?)(?!\p{L})\s*[:.]?\s*[\p{L}\d/-]*/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Up to and including the street word ("Kalkan Sokak Dora Apt" → "Kalkan Sokak") */
function streetOnly(address: string) {
  const match = address.match(
    /^.*?(?<!\p{L})(sokağı|sokak|sok\.?|sk\.?|caddesi|cadde|cad\.?|cd\.?|bulvarı|bulvar|blv\.?)(?!\p{L})/iu
  );
  return match ? match[0].trim() : "";
}

/** The neighbourhood ("Fatih Mah. 1458. Sok." → "Fatih Mahallesi") */
function neighbourhood(address: string) {
  const match = address.match(/(\p{L}[\p{L}\d ]*?)\s+(mahallesi|mah\.?|mh\.?)(?!\p{L})/iu);
  return match ? `${match[1].trim()} Mahallesi` : "";
}

export async function geocodeAddress(parts: AddressParts): Promise<GeocodeResult | null> {
  const area = [parts.district, parts.city].filter(Boolean).join(", ");
  const address = (parts.address || "").trim();
  if (!address && !area) return null;

  const key = process.env.GOOGLE_MAPS_API_KEY;
  try {
    if (key) {
      const hit = await google([address, area, "Türkiye"].filter(Boolean).join(", "), key);
      if (hit) return { latitude: hit.lat, longitude: hit.lon, precision: hit.exact ? "address" : "district" };
      return null;
    }

    // Most precise first; every miss costs one paced request
    const streets = [...new Set([address, streetPart(address), streetOnly(address)].filter((a) => a.length > 3))];
    const attempts: Array<[string, GeocodeResult["precision"]]> = streets.map((street) => [
      [street, area].filter(Boolean).join(", "),
      "address",
    ]);
    const mahalle = neighbourhood(address);
    if (mahalle) attempts.push([[mahalle, area].filter(Boolean).join(", "), "district"]);
    if (area) attempts.push([area, "district"]);

    for (const [query, precision] of attempts) {
      const hit = await nominatim(query);
      if (hit) return { latitude: hit.lat, longitude: hit.lon, precision };
    }
  } catch (error) {
    console.error("Geocode failed:", error instanceof Error ? error.message : error);
  }
  return null;
}
