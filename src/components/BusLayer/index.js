import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import { snapToPolyline } from '../../utils/routeCameras';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const POLL_INTERVAL = 15000;

const MARKER_SRC = `${process.env.PUBLIC_URL}/marcador_ida.png`;

function createBusStyle() {
  return new Style({
    image: new Icon({
      src: MARKER_SRC,
      anchor: [0.5, 1],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      scale: 2,
    }),
  });
}

function createRouteStyle(color) {
  return new Style({
    stroke: new Stroke({ color, width: 4, lineCap: 'round', lineJoin: 'round' }),
  });
}

function calcHeading(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
  return Math.atan2(dx, dy);
}

// linha: { linha_id, nome, percurso_ida, percurso_volta }
const BusLayer = ({ map, linha, visible = true, onBusesUpdate }) => {
  const busSourceRef = useRef(new VectorSource());
  const routeSourceRef = useRef(new VectorSource());
  const busLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const intervalRef = useRef(null);
  const animFrameRef = useRef(null);
  const featuresRef = useRef({});
  const positionsRef = useRef({});

  // Inicializa camadas
  useEffect(() => {
    if (!map) return;

    routeLayerRef.current = new VectorLayer({ source: routeSourceRef.current, zIndex: 48 });
    busLayerRef.current = new VectorLayer({ source: busSourceRef.current, zIndex: 50 });
    map.addLayer(routeLayerRef.current);
    map.addLayer(busLayerRef.current);

    return () => {
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      if (busLayerRef.current) map.removeLayer(busLayerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [map]);

  // Visibilidade
  useEffect(() => {
    if (busLayerRef.current) busLayerRef.current.setVisible(visible);
    if (routeLayerRef.current) routeLayerRef.current.setVisible(visible);
  }, [visible]);

  // Atualiza rota quando a linha muda
  useEffect(() => {
    routeSourceRef.current.clear();
    if (!linha || !visible) return;

    if (linha.percurso_ida?.length > 1) {
      const coords = linha.percurso_ida.map(p => fromLonLat([p.lng, p.lat]));
      const feature = new Feature({ geometry: new LineString(coords) });
      feature.setStyle(createRouteStyle('rgba(26,115,232,0.8)'));
      routeSourceRef.current.addFeature(feature);
    }

    if (linha.percurso_volta?.length > 1) {
      const coords = linha.percurso_volta.map(p => fromLonLat([p.lng, p.lat]));
      const feature = new Feature({ geometry: new LineString(coords) });
      feature.setStyle(createRouteStyle('rgba(52,168,83,0.8)'));
      routeSourceRef.current.addFeature(feature);
    }
  }, [linha, visible]);

  // Animação suave estilo Uber
  useEffect(() => {
    if (!map || !visible) return;

    let lastTimestamp = null;

    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      Object.entries(positionsRef.current).forEach(([prefixo, pos]) => {
        if (!pos.target || !pos.current) return;
        const alpha = Math.min(dt * 2.5, 1);
        const newX = pos.current[0] + (pos.target[0] - pos.current[0]) * alpha;
        const newY = pos.current[1] + (pos.target[1] - pos.current[1]) * alpha;
        pos.current = [newX, newY];
        const feature = featuresRef.current[prefixo];
        if (feature) feature.setGeometry(new Point([newX, newY]));
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [map, visible]);

  // Polling de posições
  useEffect(() => {
    if (!map || !linha) return;

    // Limpa ônibus anteriores ao trocar de linha
    busSourceRef.current.clear();
    featuresRef.current = {};
    positionsRef.current = {};
    if (onBusesUpdate) onBusesUpdate([]);

    const fetchBuses = async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/bus-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ linha_id: linha.linha_id }),
        });

        if (!resp.ok) { console.warn('[BusLayer] Erro no proxy:', resp.status); return; }

        const buses = await resp.json();
        if (!Array.isArray(buses)) return;

        const activePrefixos = new Set();

        const routePoints = [
          ...(linha.percurso_ida || []),
          ...(linha.percurso_volta || []),
        ];

        buses.forEach(bus => {
          const { prefixo, lat, lng, sentido } = bus;
          if (!prefixo || lat == null || lng == null) return;

          activePrefixos.add(prefixo);
          const [snappedLng, snappedLat] = snapToPolyline(lat, lng, routePoints);
          const targetCoords = fromLonLat([snappedLng, snappedLat]);

          if (!featuresRef.current[prefixo]) {
            const feature = new Feature({ geometry: new Point(targetCoords) });
            feature.setStyle(createBusStyle());
            busSourceRef.current.addFeature(feature);
            featuresRef.current[prefixo] = feature;
            positionsRef.current[prefixo] = { current: [...targetCoords], target: targetCoords, heading: 0, sentido };
          } else {
            const pos = positionsRef.current[prefixo];
            const heading = calcHeading(pos.current, targetCoords) ?? pos.heading;
            pos.target = targetCoords;
            pos.heading = heading;
            pos.sentido = sentido;
          }
        });

        Object.keys(featuresRef.current).forEach(prefixo => {
          if (!activePrefixos.has(prefixo)) {
            busSourceRef.current.removeFeature(featuresRef.current[prefixo]);
            delete featuresRef.current[prefixo];
            delete positionsRef.current[prefixo];
          }
        });

        if (onBusesUpdate) onBusesUpdate(buses);
      } catch (err) {
        console.error('[BusLayer] Erro:', err);
      }
    };

    if (visible) {
      fetchBuses();
      intervalRef.current = setInterval(fetchBuses, POLL_INTERVAL);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [map, visible, linha, onBusesUpdate]);

  return null;
};

export default BusLayer;
