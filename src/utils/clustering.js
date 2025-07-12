// Função para calcular distância entre dois pontos (Haversine)
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Função para agrupar câmeras próximas
export const groupNearbyCameras = (cameras, threshold = 50) => {
  const groups = [];
  const used = new Set();

  cameras.forEach((camera, index) => {
    if (used.has(index)) return;

    const group = [camera];
    used.add(index);

    cameras.forEach((otherCamera, otherIndex) => {
      if (used.has(otherIndex)) return;

      const distance = calculateDistance(
        camera.lat, camera.lng,
        otherCamera.lat, otherCamera.lng
      );

      if (distance <= threshold) {
        group.push(otherCamera);
        used.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
};

// Função para calcular o centro de um grupo de câmeras
export const calculateGroupCenter = (cameras) => {
  if (!cameras || cameras.length === 0) return null;
  
  const centerLat = cameras.reduce((sum, cam) => sum + cam.lat, 0) / cameras.length;
  const centerLng = cameras.reduce((sum, cam) => sum + cam.lng, 0) / cameras.length;
  
  return { lat: centerLat, lng: centerLng };
}; 