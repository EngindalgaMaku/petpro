// Stop ordering for the route screen. Runs on the device: a day's stops are a few dozen at
// most, so nearest-neighbour plus 2-opt on straight-line distances is instant and good enough;
// the map app works out the roads.

export interface Point {
  latitude: number;
  longitude: number;
}

/** Straight-line distance in km */
export function distanceKm(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Total length of start → stops → end */
export function routeLengthKm(stops: Point[], start?: Point | null, end?: Point | null) {
  const path = [...(start ? [start] : []), ...stops, ...(end ? [end] : [])];
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceKm(path[i - 1], path[i]);
  return total;
}

/**
 * The shortest order found for visiting every stop, starting at `start` and, when given,
 * finishing at `end` (back at the salon). Returns the stops reordered.
 */
export function orderStops<T extends Point>(stops: T[], start?: Point | null, end?: Point | null): T[] {
  if (stops.length < 2) return [...stops];

  // Nearest neighbour from the start (or from the first stop when there is no start)
  const remaining = [...stops];
  const ordered: T[] = [];
  let current: Point = start ?? remaining.shift()!;
  if (!start) ordered.push(current as T);
  while (remaining.length) {
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (distanceKm(current, remaining[i]) < distanceKm(current, remaining[best])) best = i;
    }
    current = remaining.splice(best, 1)[0];
    ordered.push(current as T);
  }

  // 2-opt: reverse any stretch whose reversal shortens the route, until nothing improves
  let improved = true;
  let length = routeLengthKm(ordered, start, end);
  for (let pass = 0; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 0; i < ordered.length - 1; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const candidate = [...ordered.slice(0, i), ...ordered.slice(i, j + 1).reverse(), ...ordered.slice(j + 1)];
        const candidateLength = routeLengthKm(candidate, start, end);
        if (candidateLength < length - 1e-9) {
          ordered.splice(0, ordered.length, ...candidate);
          length = candidateLength;
          improved = true;
        }
      }
    }
  }
  return ordered;
}

const coord = (p: Point) => `${p.latitude},${p.longitude}`;

/**
 * Google Maps directions links for the whole route. A link carries at most 9 waypoints on
 * phones, so long routes are split into legs that each continue from the previous leg's end.
 */
export function googleMapsRouteUrls(stops: Point[], start?: Point | null, end?: Point | null) {
  const MAX_WAYPOINTS = 9;
  const path = [...stops, ...(end ? [end] : [])];
  const legs: Array<{ url: string; from: number; to: number }> = [];
  let origin: Point | null = start ?? null;
  let index = 0;
  while (index < path.length) {
    const leg = path.slice(index, index + MAX_WAYPOINTS + 1);
    const destination = leg[leg.length - 1];
    const waypoints = leg.slice(0, -1);
    const params = new URLSearchParams({ api: "1", destination: coord(destination), travelmode: "driving" });
    // Without an origin Google Maps starts from the phone's current location
    if (origin) params.set("origin", coord(origin));
    if (waypoints.length) params.set("waypoints", waypoints.map(coord).join("|"));
    legs.push({
      url: `https://www.google.com/maps/dir/?${params.toString()}`,
      from: index + 1,
      to: Math.min(index + leg.length, stops.length),
    });
    origin = destination;
    index += leg.length;
  }
  return legs;
}
