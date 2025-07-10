export const cityCameras = [
  {
    id: '1',
    name: 'Câmera Centro',
    lat: -22.9035,
    lng: -43.2096,
    link: 'https://picsum.photos/800/600?random=1',
    info: 'Câmera de monitoramento do centro da cidade',
    icon: 'camera',
    coverage_area: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-43.2106, -22.9045],
          [-43.2086, -22.9045],
          [-43.2086, -22.9025],
          [-43.2106, -22.9025],
          [-43.2106, -22.9045]
        ]]
      }
    }
  },
  {
    id: '2',
    name: 'Câmera Lateral',
    lat: -22.8995,
    lng: -43.2056,
    link: 'https://picsum.photos/800/600?random=2',
    info: 'Câmera de monitoramento lateral',
    icon: 'camera',
    coverage_area: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-43.2066, -22.9005],
          [-43.2046, -22.9005],
          [-43.2046, -22.8985],
          [-43.2066, -22.8985],
          [-43.2066, -22.9005]
        ]]
      }
    }
  },
  {
    id: '3',
    name: 'Câmera Entrada',
    lat: -22.9055,
    lng: -43.2116,
    link: 'https://picsum.photos/800/600?random=3',
    info: 'Câmera de monitoramento da entrada',
    icon: 'camera',
    coverage_area: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-43.2126, -22.9065],
          [-43.2106, -22.9065],
          [-43.2106, -22.9045],
          [-43.2126, -22.9045],
          [-43.2126, -22.9065]
        ]]
      }
    }
  }
]; 