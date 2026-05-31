import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://ypxauswxgbdegvkxgzmi.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweGF1c3d4Z2JkZWd2a3hnem1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDUzNTIsImV4cCI6MjA2ODI4MTM1Mn0._jYk-5djNOllJIGSwRD1lzXWSq5mcZrVijQMC3bTYYc';
const POLL_INTERVAL = 15000;

function createBusStyle(prefixo, sentido) {
  // Dourado para ida, azul para volta
  const fill = sentido === 1 ? '#FFD700' : '#00BFFF';
  const label = prefixo.length > 4 ? prefixo.slice(-4) : prefixo;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
    <circle cx="24" cy="24" r="21" fill="${fill}" stroke="#222" stroke-width="2.5"/>
    <text x="24" y="29" text-anchor="middle" font-size="13" font-weight="bold"
          font-family="Arial,sans-serif" fill="#222">${label}</text>
  </svg>`;
  return new Style({
    image: new Icon({
      src: 'data:image/svg+xml,' + encodeURIComponent(svg),
      anchor: [0.5, 0.5],
    }),
  });
}

const BusLayer = ({ map, linhaId = 402, visible = true, onBusesUpdate }) => {
  const sourceRef = useRef(new VectorSource());
  const layerRef = useRef(null);
  const intervalRef = useRef(null);
  const featuresRef = useRef({});

  useEffect(() => {
    if (!map) return;

    layerRef.current = new VectorLayer({
      source: sourceRef.current,
      zIndex: 50,
    });
    map.addLayer(layerRef.current);

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [map]);

  useEffect(() => {
    if (layerRef.current) layerRef.current.setVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (!map) return;

    const fetchBuses = async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/bus-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ linha_id: linhaId }),
        });

        if (!resp.ok) {
          console.warn('[BusLayer] Erro no proxy:', resp.status);
          return;
        }

        const buses = await resp.json();
        if (!Array.isArray(buses)) return;

        const activePrefixos = new Set();

        buses.forEach(bus => {
          const { prefixo, lat, lng, sentido } = bus;
          if (!prefixo || lat == null || lng == null) return;

          activePrefixos.add(prefixo);
          const coords = fromLonLat([lng, lat]);

          if (featuresRef.current[prefixo]) {
            featuresRef.current[prefixo].setGeometry(new Point(coords));
            featuresRef.current[prefixo].setStyle(createBusStyle(prefixo, sentido));
            featuresRef.current[prefixo].set('busData', bus);
          } else {
            const feature = new Feature({ geometry: new Point(coords) });
            feature.setStyle(createBusStyle(prefixo, sentido));
            feature.set('busData', bus);
            sourceRef.current.addFeature(feature);
            featuresRef.current[prefixo] = feature;
          }
        });

        // Remove ônibus que não estão mais ativos
        Object.keys(featuresRef.current).forEach(prefixo => {
          if (!activePrefixos.has(prefixo)) {
            sourceRef.current.removeFeature(featuresRef.current[prefixo]);
            delete featuresRef.current[prefixo];
          }
        });

        if (onBusesUpdate) onBusesUpdate(buses);
        console.log(`[BusLayer] ${buses.length} ônibus ativos na linha ${linhaId}`);
      } catch (err) {
        console.error('[BusLayer] Erro:', err);
      }
    };

    if (visible) {
      fetchBuses();
      intervalRef.current = setInterval(fetchBuses, POLL_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [map, visible, linhaId, onBusesUpdate]);

  return null;
};

export default BusLayer;
