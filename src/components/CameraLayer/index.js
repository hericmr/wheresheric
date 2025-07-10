import { useEffect, useRef } from 'react';
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
  const coverageStyle = new Style({
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 0.8)',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.2)',
    }),
  });

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
  }, [map]);

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
      style: function (feature) {
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
      },
    });

    map.addLayer(vectorLayerRef.current);

    const handleClick = (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      if (feature && feature.get('name') && onCameraClick) {
        const camera = cameras.find(cam => cam.name === feature.get('name'));
        if (camera) {
          // Passar apenas a câmera clicada
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
  }, [map, cameras, onCameraClick]);

  useEffect(() => {
    if (!cameraSourceRef.current) return;

    cameraSourceRef.current.clear();
    cameras.forEach(camera => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([camera.lng, camera.lat])),
        name: camera.name,
        icon: camera.icon,
        info: camera.info,
      });
      cameraSourceRef.current.addFeature(feature);
    });
  }, [cameras]);

  return null;
};

export default CameraLayer;
