import { useEffect, useRef, useMemo } from 'react';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ClusterSource from 'ol/source/Cluster';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Text from 'ol/style/Text';

const CLUSTER_DISTANCE = 50; // pixels (ajustável)

const CameraLayer = ({ map, cameras, onCameraClick }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const clusterSourceRef = useRef();
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

  // Atualiza features das câmeras
  useEffect(() => {
    if (!cameraSourceRef.current) return;
    cameraSourceRef.current.clear();
    cameras.forEach(camera => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([camera.lng, camera.lat])),
        camera: camera
      });
      cameraSourceRef.current.addFeature(feature);
    });
  }, [cameras]);

  // Inicializa cluster source
  useEffect(() => {
    clusterSourceRef.current = new ClusterSource({
      distance: CLUSTER_DISTANCE,
      source: cameraSourceRef.current,
    });
  }, []);

  // Adiciona camada de clusters
  useEffect(() => {
    if (!map || !clusterSourceRef.current) return;

    vectorLayerRef.current = new VectorLayer({
      source: clusterSourceRef.current,
      zIndex: 2,
      style: function (feature) {
        const features = feature.get('features');
        const size = features.length;
        if (size > 1) {
          // Cluster
          return [
            new Style({
              image: new CircleStyle({
                radius: 20,
                fill: new Fill({ color: '#ff4444' }),
                stroke: new Stroke({ color: '#ffffff', width: 2 })
              })
            }),
            new Style({
              text: new Text({
                text: size.toString(),
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#000000', width: 1 }),
                font: 'bold 14px Arial'
              })
            })
          ];
        } else {
          // Câmera individual
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
          const encodedSvg = encodeURIComponent(svgString);
          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
          return [
            new Style({
              image: new CircleStyle({
                radius: 15,
                fill: new Fill({ color: 'white' }),
                stroke: new Stroke({ color: 'black', width: 1 })
              })
            }),
            new Style({
              image: new Icon({
                src: dataUrl,
                scale: 1,
                anchor: [0.5, 0.9],
              }),
            })
          ];
        }
      },
    });

    map.addLayer(vectorLayerRef.current);

    const handleClick = (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current) return feat;
        return undefined;
      });
      if (feature && onCameraClick) {
        const features = feature.get('features');
        if (features && features.length > 0) {
          const cameras = features.map(f => f.get('camera'));
          onCameraClick(cameras);
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
