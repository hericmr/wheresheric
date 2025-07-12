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

  // Função para calcular distância entre dois pontos
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Função para agrupar câmeras próximas
  const groupNearbyCameras = (cameras, threshold = 50) => {
    const groups = [];
    const used = new Set();

    cameras.forEach((camera, index) => {
      if (used.has(index)) return;

      const group = [camera];
      used.add(index);

      cameras.forEach((otherCamera, otherIndex) => {
        if (used.has(otherIndex)) return;

        const distance = calculateDistance(
          camera.lat, camera.lng,
          otherCamera.lat, otherCamera.lng
        );

        if (distance <= threshold) {
          group.push(otherCamera);
          used.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  };

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

    // Criar camada de cobertura
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
          console.log('CameraLayer: Added coverage area for camera:', camera.name);
        } catch (error) {
          console.error('CameraLayer: Error processing coverage area for camera:', camera.name, error);
        }
      }
    });
  }, [cameras]);

  useEffect(() => {
    if (!map) return;

    vectorLayerRef.current = new VectorLayer({
      source: cameraSourceRef.current,
      zIndex: 2, // Ensure camera icons are on top
      style: function (feature) {
        const cameraCount = feature.get('cameraCount');
        const cameras = feature.get('cameras');
        
        if (cameraCount > 1) {
          // Estilo para grupo de câmeras
          const circleStyle = new Style({
            image: new CircleStyle({
              radius: 20,
              fill: new Fill({
                color: '#ff4444'
              }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 2
              })
            })
          });

          const textStyle = new Style({
            text: {
              text: cameraCount.toString(),
              fill: new Fill({
                color: '#ffffff'
              }),
              stroke: new Stroke({
                color: '#000000',
                width: 1
              }),
              font: 'bold 14px Arial'
            }
          });

          return [circleStyle, textStyle];
        } else {
          // Estilo para câmera individual
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
          const encodedSvg = encodeURIComponent(svgString);
          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

          const iconStyle = new Style({
            image: new Icon({
              src: dataUrl,
              scale: 1,
              anchor: [0.5, 0.9], // Adjust anchor to center the icon
            }),
          });

          const circleStyle = new Style({
            image: new CircleStyle({
              radius: 15,
              fill: new Fill({
                color: 'white'
              }),
              stroke: new Stroke({
                color: 'black',
                width: 1
              })
            })
          });

          return [circleStyle, iconStyle];
        }
      },
    });

    map.addLayer(vectorLayerRef.current);

    const handleClick = (event) => {
      console.log('CameraLayer: Map clicked at pixel:', event.pixel);
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current) {
          console.log('CameraLayer: Feature at pixel:', feat);
          return feat;
        }
        return undefined;
      });
      
      if (feature && onCameraClick) {
        const cameras = feature.get('cameras');
        if (cameras && cameras.length > 0) {
          console.log('CameraLayer: Found cameras:', cameras.map(c => c.name));
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

  useEffect(() => {
    if (!cameraSourceRef.current) return;

    console.log('CameraLayer: Updating camera markers.');
    console.log('CameraLayer: Cameras received:', cameras);

    cameraSourceRef.current.clear();
    
    // Agrupar câmeras próximas
    const cameraGroups = groupNearbyCameras(cameras);
    
    cameraGroups.forEach(group => {
      if (group.length === 1) {
        // Câmera individual
        const camera = group[0];
        const feature = new Feature({
          geometry: new Point(fromLonLat([camera.lng, camera.lat])),
          name: camera.name,
          icon: camera.icon,
          info: camera.info,
          cameras: [camera],
          cameraCount: 1
        });
        cameraSourceRef.current.addFeature(feature);
        console.log('CameraLayer: Added individual marker for camera:', camera.name);
      } else {
        // Grupo de câmeras
        const centerLat = group.reduce((sum, cam) => sum + cam.lat, 0) / group.length;
        const centerLng = group.reduce((sum, cam) => sum + cam.lng, 0) / group.length;
        
        const feature = new Feature({
          geometry: new Point(fromLonLat([centerLng, centerLat])),
          cameras: group,
          cameraCount: group.length
        });
        cameraSourceRef.current.addFeature(feature);
        console.log('CameraLayer: Added group marker for', group.length, 'cameras:', group.map(c => c.name));
      }
    });
  }, [cameras]);

  return null;
};

export default CameraLayer;
