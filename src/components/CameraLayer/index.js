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

const CameraLayer = ({ map, cameras, onCameraClick, targetLocation }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const vectorLayerRef = useRef(null);
  const targetLocationRef = useRef(targetLocation);

  // Keep targetLocationRef in sync with prop for use in style function
  useEffect(() => {
    targetLocationRef.current = targetLocation;
    // Force layer to re-evaluate styles when location changes
    if (vectorLayerRef.current) {
      vectorLayerRef.current.changed();
    }
  }, [targetLocation]);

  // Camera icon style - memoized for performance
  const cameraIconStyle = useMemo(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>`;
    const encodedSvg = encodeURIComponent(svgString);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    return dataUrl;
  }, []);

  // Exclamation mark icon style for alert
  const exclamationIconStyle = useMemo(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 22h20L12 2z"></path>
      <line x1="12" y1="10" x2="12" y2="14"></line>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>`;
    const encodedSvg = encodeURIComponent(svgString);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    return dataUrl;
  }, []);

  // Dynamic Style Function
  const styleFunction = useCallback((feature) => {
    const camera = feature.get('camera');
    if (!camera) return []; // Should not happen

    const currentTarget = targetLocationRef.current;
    let isCloseToTarget = false;

    if (currentTarget && camera.lat && camera.lng) {
      const distance = haversineMeters(currentTarget.lat, currentTarget.lng, camera.lat, camera.lng);
      isCloseToTarget = distance <= 100; // Within 100 meters
    }

    const hasYoutube = camera.youtube_link;

    // Determine background color
    let backgroundColor = '#4ecdc4'; // Default teal
    if (isCloseToTarget) {
      backgroundColor = '#ff0000'; // Red for alert
    } else if (hasYoutube) {
      backgroundColor = '#ff6b6b'; // Red-pink for YouTube
    }

    const styles = [
      // Círculo de fundo
      new Style({
        image: new CircleStyle({
          radius: 18,
          fill: new Fill({
            color: backgroundColor
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2
          })
        })
      }),
      // Ícone da câmera
      new Style({
        image: new Icon({
          src: cameraIconStyle,
          scale: 0.8,
          anchor: [0.5, 0.5],
        }),
      })
    ];

    // Add exclamation mark alert icon if close to target
    if (isCloseToTarget) {
      styles.push(
        new Style({
          image: new Icon({
            src: exclamationIconStyle,
            scale: 0.7,
            anchor: [0.9, 0.1], // Top right corner
          }),
        })
      );
    }

    return styles;
  }, [cameraIconStyle, exclamationIconStyle]);

  // Atualiza features das câmeras (apenas quando a lista de câmeras muda)
  useEffect(() => {
    if (!cameraSourceRef.current) return;
    cameraSourceRef.current.clear();

    cameras.forEach(camera => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([camera.lng, camera.lat])),
        camera: camera
      });
      // Do NOT set style here. Let the layer use the styleFunction.
      cameraSourceRef.current.addFeature(feature);
    });
  }, [cameras]);

  // Adiciona camada de câmeras
  useEffect(() => {
    if (!map || !cameraSourceRef.current) return;

    vectorLayerRef.current = new VectorLayer({
      source: cameraSourceRef.current,
      style: styleFunction, // Use function for dynamic styling
      zIndex: 2,
    });

    map.addLayer(vectorLayerRef.current);

    const handleClick = (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current) return feat;
        return undefined;
      });
      if (feature && onCameraClick) {
        const camera = feature.get('camera');
        if (camera) {
          onCameraClick([camera]);
        }
      }
    };
    map.on('click', handleClick);

    return () => {
      if (vectorLayerRef.current) {
        map.removeLayer(vectorLayerRef.current);
      }
      map.un('click', handleClick);
    };
  }, [map, onCameraClick, styleFunction]);

  return null;
};

export default CameraLayer;
