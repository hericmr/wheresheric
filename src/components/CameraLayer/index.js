import { useEffect, useRef, useMemo, useCallback } from 'react';
import { fromLonLat } from 'ol/proj';
import { haversineMeters } from '../../utils/routeCameras';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

const geoJsonFormat = new GeoJSON();

const CameraLayer = ({ map, cameras, onCameraClick, targetLocation }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const coverageSourceRef = useRef(new VectorSource());
  const vectorLayerRef = useRef(null);
  const coverageLayerRef = useRef(null);
  const targetLocationRef = useRef(targetLocation);

  useEffect(() => {
    targetLocationRef.current = targetLocation;
    if (vectorLayerRef.current) {
      vectorLayerRef.current.changed();
    }
  }, [targetLocation]);

  const cameraIconStyle = useMemo(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }, []);

  const exclamationIconStyle = useMemo(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 22h20L12 2z"></path>
      <line x1="12" y1="10" x2="12" y2="14"></line>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }, []);

  const styleFunction = useCallback((feature) => {
    const camera = feature.get('camera');
    if (!camera) return [];

    const currentTarget = targetLocationRef.current;
    let isCloseToTarget = false;

    if (currentTarget && camera.lat && camera.lng) {
      const distance = haversineMeters(currentTarget.lat, currentTarget.lng, camera.lat, camera.lng);
      isCloseToTarget = distance <= 100;
    }

    const hasYoutube = camera.youtube_link;

    let backgroundColor = '#4ecdc4';
    if (isCloseToTarget) {
      backgroundColor = '#ff0000';
    } else if (hasYoutube) {
      backgroundColor = '#ff6b6b';
    }

    const styles = [
      new Style({
        image: new CircleStyle({
          radius: 18,
          fill: new Fill({ color: backgroundColor }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      }),
      new Style({
        image: new Icon({
          src: cameraIconStyle,
          scale: 0.8,
          anchor: [0.5, 0.5],
        }),
      })
    ];

    if (isCloseToTarget) {
      styles.push(new Style({
        image: new Icon({
          src: exclamationIconStyle,
          scale: 0.7,
          anchor: [0.9, 0.1],
        }),
      }));
    }

    return styles;
  }, [cameraIconStyle, exclamationIconStyle]);

  const coverageStyleFunction = useCallback((feature) => {
    const camera = feature.get('camera');
    const currentTarget = targetLocationRef.current;
    let isCloseToTarget = false;

    if (currentTarget && camera?.lat && camera?.lng) {
      const distance = haversineMeters(currentTarget.lat, currentTarget.lng, camera.lat, camera.lng);
      isCloseToTarget = distance <= 100;
    }

    const hasYoutube = camera?.youtube_link;

    let strokeColor = '#4ecdc4';
    let fillColor = 'rgba(78, 205, 196, 0.15)';
    if (isCloseToTarget) {
      strokeColor = '#ff0000';
      fillColor = 'rgba(255, 0, 0, 0.15)';
    } else if (hasYoutube) {
      strokeColor = '#ff6b6b';
      fillColor = 'rgba(255, 107, 107, 0.15)';
    }

    return new Style({
      stroke: new Stroke({ color: strokeColor, width: 1.5 }),
      fill: new Fill({ color: fillColor }),
    });
  }, []);

  const getMarkerPosition = (camera) => {
    if (camera.coverage_area) {
      try {
        const coords = camera.coverage_area.geometry.coordinates[0];
        const n = coords.length - 1;
        const lng = coords.slice(0, n).reduce((s, c) => s + c[0], 0) / n;
        const lat = coords.slice(0, n).reduce((s, c) => s + c[1], 0) / n;
        return [lng, lat];
      } catch (_) {}
    }
    return [camera.lng, camera.lat];
  };

  // Atualiza features das câmeras e polígonos de cobertura
  useEffect(() => {
    if (!cameraSourceRef.current) return;
    cameraSourceRef.current.clear();
    coverageSourceRef.current.clear();

    cameras.forEach(camera => {
      const [lng, lat] = getMarkerPosition(camera);
      const feature = new Feature({
        geometry: new Point(fromLonLat([lng, lat])),
        camera,
      });
      cameraSourceRef.current.addFeature(feature);

      if (camera.coverage_area) {
        try {
          const polygonFeature = geoJsonFormat.readFeature(camera.coverage_area, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          polygonFeature.set('camera', camera);
          coverageSourceRef.current.addFeature(polygonFeature);
        } catch (_) {}
      }
    });
  }, [cameras]);

  // Adiciona camadas ao mapa
  useEffect(() => {
    if (!map) return;

    coverageLayerRef.current = new VectorLayer({
      source: coverageSourceRef.current,
      style: coverageStyleFunction,
      zIndex: 1,
    });

    vectorLayerRef.current = new VectorLayer({
      source: cameraSourceRef.current,
      style: styleFunction,
      zIndex: 2,
    });

    map.addLayer(coverageLayerRef.current);
    map.addLayer(vectorLayerRef.current);

    const handleClick = (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current || layer === coverageLayerRef.current) return feat;
        return undefined;
      });
      if (feature && onCameraClick) {
        const camera = feature.get('camera');
        if (camera) onCameraClick([camera]);
      }
    };
    map.on('click', handleClick);

    return () => {
      if (vectorLayerRef.current) map.removeLayer(vectorLayerRef.current);
      if (coverageLayerRef.current) map.removeLayer(coverageLayerRef.current);
      map.un('click', handleClick);
    };
  }, [map, onCameraClick, styleFunction, coverageStyleFunction]);

  return null;
};

export default CameraLayer;
