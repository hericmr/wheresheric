import { useEffect, useRef } from 'react';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';

const TrackLayer = ({ map, trackCoordinates = [], color = 'rgba(0, 102, 255, 0.7)', width = 4, lineDash = null }) => {
    const sourceRef = useRef(new VectorSource());
    const layerRef = useRef(null);

    // Initialize layer
    useEffect(() => {
        if (!map) return;

        layerRef.current = new VectorLayer({
            source: sourceRef.current,
            style: new Style({
                stroke: new Stroke({
                    color: color,
                    width: width,
                    lineDash: lineDash,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            zIndex: 1 // Above base map, below cameras (zIndex 2)
        });

        map.addLayer(layerRef.current);

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [map, color, width, lineDash]);

    // Update geometry when coordinates change
    useEffect(() => {
        if (!sourceRef.current) return;

        sourceRef.current.clear();

        if (trackCoordinates && trackCoordinates.length > 1) {
            // Convert coordinates to map projection
            const projectedCoords = trackCoordinates.map(coord => fromLonLat(coord));

            const feature = new Feature({
                geometry: new LineString(projectedCoords)
            });

            sourceRef.current.addFeature(feature);
        }
    }, [trackCoordinates]);

    return null;
};

export default TrackLayer;
