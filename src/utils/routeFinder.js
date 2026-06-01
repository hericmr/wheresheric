function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestStop(stops, lat, lng) {
  let best = null, bestDist = Infinity;
  for (const s of stops) {
    const d = haversineMeters(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return { stop: best, dist: bestDist };
}

const MAX_WALK = 800;
const PRE_CANDIDATES = 10; // pre-filter by walk before fetching buses

// Step 1: find up to PRE_CANDIDATES lines by walking score alone
export function findCandidates(originLat, originLng, destLat, destLng, linhas) {
  const candidates = [];
  for (const linha of linhas) {
    const stops = linha.paradas;
    if (!stops?.length) continue;
    const { stop: boarding, dist: walkOrigin } = closestStop(stops, originLat, originLng);
    const { stop: alighting, dist: walkDest } = closestStop(stops, destLat, destLng);
    if (!boarding || !alighting) continue;
    if (walkOrigin > MAX_WALK || walkDest > MAX_WALK) continue;
    if (boarding.ordem === alighting.ordem) continue;
    candidates.push({
      linhaFull: linha,
      boardingStop: boarding,
      alightingStop: alighting,
      stopsCount: Math.abs(alighting.ordem - boarding.ordem),
      walkingOrigin: Math.round(walkOrigin),
      walkingDestination: Math.round(walkDest),
      walkScore: walkOrigin + walkDest,
    });
  }
  return candidates.sort((a, b) => a.walkScore - b.walkScore).slice(0, PRE_CANDIDATES);
}

// Step 2: re-rank with live bus proximity to boarding stop
// busesPerLinha: { [linha_id]: [{lat, lng, ...}] }
export function rankWithBuses(candidates, busesPerLinha) {
  return candidates
    .map(c => {
      const buses = busesPerLinha[c.linhaFull.linha_id] || [];
      const minBusDist = buses.length
        ? Math.min(...buses.map(b => haversineMeters(b.lat, b.lng, c.boardingStop.lat, c.boardingStop.lng)))
        : null;
      // Lines with a nearby bus rank before lines with better walking but no bus.
      // Penalty of 3000m for missing bus data keeps walk-only lines at the bottom.
      const busPenalty = minBusDist != null ? minBusDist * 0.4 : 3000;
      return { ...c, minBusDist: minBusDist != null ? Math.round(minBusDist) : null, score: c.walkScore + busPenalty };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}
