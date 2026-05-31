function haversineMeters(lat1, lng1, lat2, lng2) {
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
