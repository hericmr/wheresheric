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

export function findBestRoutes(originLat, originLng, destLat, destLng, linhas, maxResults = 3) {
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
      score: walkOrigin + walkDest,
    });
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, maxResults);
}
