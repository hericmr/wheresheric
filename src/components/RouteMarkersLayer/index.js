import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

const RESULT_COLORS = [
  'rgba(26,115,232,0.75)',
  'rgba(149,57,185,0.75)',
  'rgba(230,110,0,0.75)',
];

function markerStyle(hexColor) {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: hexColor }),
      stroke: new Stroke({ color: 'white', width: 2.5 }),
    }),
  });
}

function dashedLineStyle(color) {
  return new Style({
    stroke: new Stroke({ color, width: 2, lineDash: [6, 5] }),
  });
}

function line(from, to) {
  return new Feature({ geometry: new LineString([fromLonLat([from.lng, from.lat]), fromLonLat([to.lng, to.lat])]) });
}

function point(coords, style) {
  const f = new Feature({ geometry: new Point(fromLonLat([coords.lng, coords.lat])) });
  f.setStyle(style);
  return f;
}

const RouteMarkersLayer = ({ map, origin, destination, results = [] }) => {
  const sourceRef = useRef(new VectorSource());
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    layerRef.current = new VectorLayer({ source: sourceRef.current, zIndex: 55 });
    map.addLayer(layerRef.current);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [map]);

  useEffect(() => {
    sourceRef.current.clear();

    if (origin) sourceRef.current.addFeature(point(origin, markerStyle('#34a853')));
    if (destination) sourceRef.current.addFeature(point(destination, markerStyle('#ea4335')));

    if (origin && destination && results.length) {
      results.forEach((r, i) => {
        const color = RESULT_COLORS[i] ?? 'rgba(100,100,100,0.6)';
        const walkIn = line(origin, r.boardingStop);
        const walkOut = line(r.alightingStop, destination);
        walkIn.setStyle(dashedLineStyle(color));
        walkOut.setStyle(dashedLineStyle(color));
        sourceRef.current.addFeature(walkIn);
        sourceRef.current.addFeature(walkOut);
      });
    }
  }, [origin, destination, results]);

  return null;
};

export default RouteMarkersLayer;
