import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { circular } from 'ol/geom/Polygon';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

const ARMED_STYLE = new Style({
  fill: new Fill({ color: 'rgba(26, 115, 232, 0.10)' }),
  stroke: new Stroke({ color: '#1a73e8', width: 2, lineDash: [6, 4] }),
});

const TRIGGERED_STYLE = new Style({
  fill: new Fill({ color: 'rgba(217, 48, 37, 0.14)' }),
  stroke: new Stroke({ color: '#d93025', width: 2.5, lineDash: [6, 4] }),
});

// Draws a dashed circle of radiusMeters around destinationStop on the OL map.
export default function AlarmLayer({ map, destinationStop, radiusMeters, status }) {
  const sourceRef = useRef(new VectorSource());

  useEffect(() => {
    if (!map) return;
    const layer = new VectorLayer({ source: sourceRef.current, zIndex: 45 });
    map.addLayer(layer);
    return () => map.removeLayer(layer);
  }, [map]);

  useEffect(() => {
    sourceRef.current.clear();
    if (!destinationStop || status === 'idle') return;

    // circular() creates a geodetically accurate polygon from [lng, lat] + radius in metres
    const geom = circular([destinationStop.lng, destinationStop.lat], radiusMeters, 64);
    geom.transform('EPSG:4326', 'EPSG:3857');

    const feature = new Feature({ geometry: geom });
    feature.setStyle(status === 'triggered' ? TRIGGERED_STYLE : ARMED_STYLE);
    sourceRef.current.addFeature(feature);
  }, [destinationStop, radiusMeters, status]);

  return null;
}
