import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Overlay from 'ol/Overlay';

function stopStyle(color = '#1a73e8') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 6 6">
    <circle cx="3" cy="3" r="3" fill="${color}"/>
  </svg>`;
  return new Style({
    image: new Icon({
      src: 'data:image/svg+xml,' + encodeURIComponent(svg),
      anchor: [0.5, 0.5],
    }),
  });
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Retorna quantas paradas faltam até a parada alvo (null = já passou)
function stopsAway(targetStop, bus, allStops) {
  if (!allStops.length) return null;

  let closestStop = null;
  let minDist = Infinity;
  allStops.forEach(s => {
    const d = haversineMeters(bus.lat, bus.lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; closestStop = s; }
  });
  if (!closestStop) return null;

  const diff = targetStop.ordem - closestStop.ordem;
  return diff >= 0 ? diff : null; // null = ônibus já passou
}

const StopsLayer = ({ map, stops = [], buses = [], visible = true, color = '#1a73e8' }) => {
  const sourceRef = useRef(new VectorSource());
  const layerRef = useRef(null);
  const overlayRef = useRef(null);
  const popupElRef = useRef(null);
  const busesRef = useRef(buses);
  const stopsRef = useRef(stops);

  useEffect(() => { busesRef.current = buses; }, [buses]);
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  useEffect(() => {
    if (!map) return;

    layerRef.current = new VectorLayer({ source: sourceRef.current, zIndex: 49 });
    map.addLayer(layerRef.current);

    // Popup element
    const el = document.createElement('div');
    el.style.cssText = `
      background: white;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.82rem;
      box-shadow: 0 3px 12px rgba(0,0,0,0.25);
      max-width: 210px;
      display: none;
      pointer-events: none;
      line-height: 1.5;
    `;
    document.body.appendChild(el);
    popupElRef.current = el;

    overlayRef.current = new Overlay({
      element: el,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -14],
    });
    map.addOverlay(overlayRef.current);

    const handleClick = (e) => {
      const features = map.getFeaturesAtPixel(e.pixel, {
        layerFilter: l => l === layerRef.current,
        hitTolerance: 6,
      });

      if (features.length > 0) {
        const stop = features[0].get('stopData');
        const currentBuses = busesRef.current;
        const allStops = stopsRef.current;

        let estimativa = '<span style="color:#888">Sem ônibus em operação</span>';

        if (currentBuses.length > 0) {
          // Calcula paradas restantes para cada ônibus ativo
          const resultados = currentBuses
            .map(bus => ({ bus, n: stopsAway(stop, bus, allStops) }))
            .filter(r => r.n !== null);

          if (resultados.length === 0) {
            estimativa = '<span style="color:#888">Ônibus já passou por aqui</span>';
          } else {
            const melhor = resultados.reduce((a, b) => a.n < b.n ? a : b);
            if (melhor.n === 0) {
              estimativa = '<span style="color:#34a853;font-weight:bold">Chegando agora!</span>';
            } else {
              estimativa = `<span style="color:#1a73e8;font-weight:bold">${melhor.n} parada${melhor.n > 1 ? 's' : ''} de distância</span>`;
            }
          }
        }

        el.innerHTML = `
          <div style="font-weight:bold;margin-bottom:4px">${stop.nome}</div>
          <div>${estimativa}</div>
          ${stop.ordem ? `<div style="color:#888;font-size:0.75rem">Parada ${stop.ordem}</div>` : ''}
        `;
        el.style.display = 'block';
        overlayRef.current.setPosition(e.coordinate);
      } else {
        el.style.display = 'none';
        overlayRef.current.setPosition(undefined);
      }
    };

    map.on('click', handleClick);

    return () => {
      map.removeLayer(layerRef.current);
      map.removeOverlay(overlayRef.current);
      map.un('click', handleClick);
      el.remove();
    };
  }, [map]);

  // Atualiza paradas quando a linha muda
  useEffect(() => {
    sourceRef.current.clear();
    if (!visible || !stops.length) return;

    stops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;
      const feature = new Feature({ geometry: new Point(fromLonLat([stop.lng, stop.lat])) });
      feature.setStyle(stopStyle(color));
      feature.set('stopData', stop);
      sourceRef.current.addFeature(feature);
    });
  }, [stops, visible, color]);

  useEffect(() => {
    if (layerRef.current) layerRef.current.setVisible(visible);
    if (!visible && popupElRef.current) popupElRef.current.style.display = 'none';
  }, [visible]);

  return null;
};

export default StopsLayer;
