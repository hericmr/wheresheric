import { useEffect, useRef, useMemo } from 'react';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

const CameraLayer = ({ map, cameras, onCameraClick }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const coverageSourceRef = useRef(new VectorSource());
  const vectorLayerRef = useRef(null);
  const coverageLayerRef = useRef(null);

  // Style for coverage areas
  const coverageStyle = useMemo(() => new Style({
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 0.8)',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.2)',
    }),
  }), []);

  // Renderizar polígonos de cobertura conforme Fase 3.1
  useEffect(() => {
    if (!map) return;

    coverageLayerRef.current = new VectorLayer({
      source: coverageSourceRef.current,
      style: coverageStyle,
      zIndex: 1,
    });

    map.addLayer(coverageLayerRef.current);

    return () => {
      if (coverageLayerRef.current) {
        map.removeLayer(coverageLayerRef.current);
      }
    };
  }, [map, coverageStyle]);

  // Carregar polígonos das câmeras conforme Fase 3.1
  useEffect(() => {
    if (!coverageSourceRef.current) return;

    coverageSourceRef.current.clear();
    const geoJsonFormat = new GeoJSON();
    
    cameras.forEach(camera => {
      if (camera.coverage_area) {
        try {
          const feature = geoJsonFormat.readFeature(camera.coverage_area, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          coverageSourceRef.current.addFeature(feature);
        } catch (error) {
          // Silenciar erro de área de cobertura inválida
        }
      }
    });
  }, [cameras]);

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

  // Atualiza features das câmeras (sem clustering)
  useEffect(() => {
    if (!cameraSourceRef.current) return;
    cameraSourceRef.current.clear();
    cameras.forEach(camera => {
      const hasYoutube = camera && camera.youtube_link;
      const feature = new Feature({
        geometry: new Point(fromLonLat([camera.lng, camera.lat])),
        camera: camera
      });
      
      // Style for individual camera (no clustering)
      feature.setStyle([
        // Círculo de fundo
        new Style({
          image: new CircleStyle({
            radius: 18,
            fill: new Fill({ 
              color: hasYoutube ? '#ff6b6b' : '#4ecdc4' // Cor diferente para YouTube
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
        }),
        // Indicador de status (ponto pequeno)
        new Style({
          image: new CircleStyle({
            radius: 3,
            fill: new Fill({ 
              color: '#00ff00' // Verde para indicar ativo
            }),
            stroke: new Stroke({ 
              color: '#ffffff', 
              width: 1 
            })
          }),
          geometry: function(feature) {
            const geometry = feature.getGeometry();
            const coordinates = geometry.getCoordinates();
            return new Point([coordinates[0] + 10, coordinates[1] + 10]);
          }
        })
      ]);
      
      cameraSourceRef.current.addFeature(feature);
    });
  }, [cameras, cameraIconStyle]);

  // Adiciona camada de câmeras (sem clustering)
  useEffect(() => {
    if (!map || !cameraSourceRef.current) return;

    vectorLayerRef.current = new VectorLayer({
      source: cameraSourceRef.current,
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
          onCameraClick([camera]); // Pass as array for consistency
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
  }, [map, onCameraClick]);

  return null;
};

export default CameraLayer;
