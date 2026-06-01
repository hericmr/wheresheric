import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Overlay from 'ol/Overlay';

// ── styles ────────────────────────────────────────────────────────────────────

function makeSvgIcon(svg) {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Normal tiny dot
function stopStyle() {
  return new Style({
    image: new Icon({
      src: makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6">
        <circle cx="3" cy="3" r="3" fill="#1a73e8"/>
      </svg>`),
      anchor: [0.5, 0.5],
    }),
  });
}

// Alarm-mode selectable stop: larger amber circle
function alarmStopStyle() {
  return new Style({
    image: new Icon({
      src: makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <circle cx="11" cy="11" r="10" fill="#f59e0b" stroke="white" stroke-width="2.5"/>
        <circle cx="11" cy="11" r="4" fill="white" opacity="0.6"/>
      </svg>`),
      anchor: [0.5, 0.5],
    }),
  });
}

// Destination pin (teardrop shape with bell dot)
function destinationStyle() {
  return new Style({
    image: new Icon({
      src: makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
        <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".35"/></filter>
        <path filter="url(#s)" d="M16 0C7.163 0 0 7.163 0 16c0 11 16 28 16 28S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#1a73e8"/>
        <circle cx="16" cy="16" r="9" fill="white"/>
        <path d="M12 19h8v1.5H12zm4-9a5 5 0 0 0-5 5v3h10v-3a5 5 0 0 0-5-5z" fill="#1a73e8"/>
        <circle cx="16" cy="21.5" r="1.2" fill="#1a73e8"/>
      </svg>`),
      anchor: [0.5, 1], // pin points to the coordinate
      scale: 1,
    }),
  });
}

// ── distance helper (local — avoids circular import) ──────────────────────────

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stopsAway(targetStop, bus, allStops) {
  if (!allStops.length) return null;
  let closestStop = null, minDist = Infinity;
  allStops.forEach(s => {
    const d = haversineMeters(bus.lat, bus.lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; closestStop = s; }
  });
  if (!closestStop) return null;
  const diff = targetStop.ordem - closestStop.ordem;
  return diff >= 0 ? diff : null;
}

// ── component ──────────────────────────────────────────────────────────────────

const StopsLayer = ({
  map,
  stops = [],
  buses = [],
  visible = true,
  alarmMode = false,      // true → selection mode (amber dots, click = onStopSelect)
  destinationStop = null, // armed destination → pin + pulse
  onStopSelect = null,    // (stop) => void, called in alarmMode
}) => {
  const sourceRef     = useRef(new VectorSource());
  const layerRef      = useRef(null);
  const overlayRef    = useRef(null);
  const popupElRef    = useRef(null);
  const busesRef      = useRef(buses);
  const stopsRef      = useRef(stops);
  const alarmModeRef  = useRef(alarmMode);
  const onSelectRef   = useRef(onStopSelect);

  useEffect(() => { busesRef.current = buses; },       [buses]);
  useEffect(() => { stopsRef.current = stops; },       [stops]);
  useEffect(() => { alarmModeRef.current = alarmMode; }, [alarmMode]);
  useEffect(() => { onSelectRef.current = onStopSelect; }, [onStopSelect]);

  // ── layer + popup setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    layerRef.current = new VectorLayer({ source: sourceRef.current, zIndex: 49 });
    map.addLayer(layerRef.current);

    const el = document.createElement('div');
    el.style.cssText = `
      background: white;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.82rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.28);
      max-width: 220px;
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
      offset: [0, -18],
    });
    map.addOverlay(overlayRef.current);

    const handleClick = (e) => {
      const features = map.getFeaturesAtPixel(e.pixel, {
        layerFilter: l => l === layerRef.current,
        hitTolerance: 10,
      });

      if (features.length > 0) {
        const stop = features[0].get('stopData');

        // ── alarm mode: delegate selection to parent ──────────────────────────
        if (alarmModeRef.current && onSelectRef.current) {
          onSelectRef.current(stop);
          el.style.display = 'none';
          overlayRef.current.setPosition(undefined);
          return;
        }

        // ── normal mode: bus ETA popup ────────────────────────────────────────
        const currentBuses = busesRef.current;
        const allStops     = stopsRef.current;
        let estimativa     = '<span style="color:#888">Sem ônibus em operação</span>';

        if (currentBuses.length > 0) {
          const resultados = currentBuses
            .map(bus => ({ bus, n: stopsAway(stop, bus, allStops) }))
            .filter(r => r.n !== null);

          if (resultados.length === 0) {
            estimativa = '<span style="color:#888">Ônibus já passou por aqui</span>';
          } else {
            const melhor = resultados.reduce((a, b) => a.n < b.n ? a : b);
            estimativa = melhor.n === 0
              ? '<span style="color:#34a853;font-weight:bold">Chegando agora!</span>'
              : `<span style="color:#1a73e8;font-weight:bold">${melhor.n} parada${melhor.n > 1 ? 's' : ''} de distância</span>`;
          }
        }

        el.innerHTML = `
          <div style="font-weight:bold;margin-bottom:4px">${stop.nome || `Parada ${stop.ordem}`}</div>
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

  // ── re-render features when line / mode changes ───────────────────────────
  useEffect(() => {
    sourceRef.current.clear();
    if (!visible || !stops.length) return;

    stops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;

      const isDestination = destinationStop
        && stop.lat === destinationStop.lat
        && stop.lng === destinationStop.lng;

      const feature = new Feature({ geometry: new Point(fromLonLat([stop.lng, stop.lat])) });
      feature.setStyle(
        isDestination ? destinationStyle()
          : alarmMode ? alarmStopStyle()
          : stopStyle()
      );
      feature.set('stopData', stop);
      sourceRef.current.addFeature(feature);
    });
  }, [stops, visible, alarmMode, destinationStop]);


  useEffect(() => {
    if (layerRef.current) layerRef.current.setVisible(visible);
    if (!visible && popupElRef.current) popupElRef.current.style.display = 'none';
  }, [visible]);

  return null;
};

export default StopsLayer;
