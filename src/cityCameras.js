export const cityCameras = [
  {
    id: '1',
    name: 'Câmera Centro',
    lat: -22.9035,
    lng: -43.2096,
    link: 'https://picsum.photos/800/600?random=1',
    youtube_link: 'https://www.youtube.com/embed/tMYtrEBNVAU',
    info: 'Câmera de monitoramento do centro da cidade com transmissão ao vivo no YouTube',
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
    youtube_link: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    info: 'Câmera de monitoramento lateral com transmissão ao vivo',
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
    info: 'Câmera de monitoramento da entrada (apenas imagem)',
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
  },
  {
    id: '4',
    name: 'Câmera Praça',
    lat: -22.9015,
    lng: -43.2076,
    link: 'https://picsum.photos/800/600?random=4',
    youtube_link: 'https://www.youtube.com/embed/jNQXAC9IVRw',
    info: 'Câmera de monitoramento da praça central com transmissão ao vivo',
    icon: 'camera',
    coverage_area: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-43.2086, -22.9025],
          [-43.2066, -22.9025],
          [-43.2066, -22.9005],
          [-43.2086, -22.9005],
          [-43.2086, -22.9025]
        ]]
      }
    }
  }
]; 