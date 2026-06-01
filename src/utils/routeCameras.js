export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Retorna câmeras dentro de thresholdMeters de qualquer ponto do percurso
export function getCamerasAlongRoute(cameras, linha, thresholdMeters = 80) {
  if (!linha || !cameras.length) return [];

  const routePoints = [
    ...(linha.percurso_ida || []),
    ...(linha.percurso_volta || []),
  ];

  return cameras.filter(camera => {
    if (!camera.lat || !camera.lng) return false;
    return routePoints.some(
      point => haversineMeters(camera.lat, camera.lng, point.lat, point.lng) <= thresholdMeters
    );
  });
}

// Ordena câmeras pela proximidade ao ônibus mais próximo
export function sortCamerasByBusProximity(cameras, buses) {
  if (!buses.length) return cameras;
  return [...cameras].sort((a, b) => {
    const distA = Math.min(...buses.map(bus => haversineMeters(a.lat, a.lng, bus.lat, bus.lng)));
    const distB = Math.min(...buses.map(bus => haversineMeters(b.lat, b.lng, bus.lat, bus.lng)));
    return distA - distB;
  });
}

export function distanceFromBus(camera, buses) {
  if (!buses.length) return null;
  return Math.min(...buses.map(bus => haversineMeters(camera.lat, camera.lng, bus.lat, bus.lng)));
}

// Projects [px, py] onto segment [ax,ay]-[bx,by], returns closest point
function projectToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return [ax, ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
  return [ax + t * abx, ay + t * aby];
}

// Returns snapped [lng, lat] on the polyline, or original if farther than maxMeters
export function snapToPolyline(lat, lng, routePoints, maxMeters = 150) {
  if (!routePoints || routePoints.length < 2) return [lng, lat];

  let bestDist = Infinity;
  let bestPoint = [lng, lat];

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = routePoints[i];
    const b = routePoints[i + 1];
    const [cx, cy] = projectToSegment(lng, lat, a.lng, a.lat, b.lng, b.lat);
    const dist = haversineMeters(lat, lng, cy, cx);
    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = [cx, cy];
    }
  }

  return bestDist <= maxMeters ? bestPoint : [lng, lat];
}
