import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Container, Row, Col, Form, Button, Card, ListGroup, Navbar } from 'react-bootstrap';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import GeoJSON from 'ol/format/GeoJSON';
import './styles.css';

import { useNavigate } from 'react-router-dom';

const CameraEditor = () => {
  const navigate = useNavigate();
  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const drawSource = useRef(new VectorSource());
  const drawInteraction = useRef(null);
  const modifyInteraction = useRef(null);
  const geoJsonFormat = useRef(new GeoJSON());

  const [cameraDetails, setCameraDetails] = useState({
    id: null,
    name: '',
    lat: '',
    lng: '',
    link: '',
    info: '',
    icon: 'MdCameraAlt',
  });
  const [drawnFeature, setDrawnFeature] = useState(null); // Stores GeoJSON of drawn polygon
  const [cameras, setCameras] = useState([]); // List of all cameras from Supabase
  const [drawingInstructions, setDrawingInstructions] = useState('Clique e arraste para desenhar um retângulo (4 pontos)');
  const [selectingLocation, setSelectingLocation] = useState(false);

  const drawStyle = useMemo(() => new Style({
    stroke: new Stroke({
      color: 'blue',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }), []);

  // Style for camera marker
  const cameraMarkerStyle = useMemo(() => new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: 'https://openlayers.org/en/latest/examples/data/icon.png', // Placeholder icon
      scale: 0.7,
    }),
  }), []);

  

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapObject.current) {
      mapObject.current = new Map({
        target: mapRef.current.id,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          new VectorLayer({
            source: markerSource.current,
            style: cameraMarkerStyle,
          }),
          new VectorLayer({
            source: drawSource.current,
            style: drawStyle,
          }),
        ],
        view: new View({
          center: fromLonLat([-46.308861, -23.985111]), // Centro padrão (Santos)
          zoom: 15,
        }),
      });

      // Initialize Draw interaction - Melhorado conforme Fase 2.1
      drawInteraction.current = new Draw({
        source: drawSource.current,
        type: 'Polygon',
        style: drawStyle,
        maxPoints: 4, // Limitar a 4 pontos para retângulo
        // Removido geometryFunction que não existe nesta versão do OpenLayers
      });

      drawInteraction.current.on('drawend', (event) => {
        const geoJson = geoJsonFormat.current.writeFeatureObject(event.feature, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        setDrawnFeature(geoJson);
        setDrawingInstructions('Polígono desenhado! Arraste os pontos para modificar ou clique em "Limpar" para redesenhar.');
        console.log('Polygon drawn:', geoJson);
        
        // Remove draw interaction after drawing
        mapObject.current.removeInteraction(drawInteraction.current);
        // Add modify interaction
        modifyInteraction.current = new Modify({
          source: drawSource.current,
        });
        mapObject.current.addInteraction(modifyInteraction.current);
        
        // Melhorar sincronização da modificação conforme Fase 2.2
        modifyInteraction.current.on('modifyend', (modifyEvent) => {
          const modifiedFeature = modifyEvent.features.getArray()[0];
          const modifiedGeoJson = geoJsonFormat.current.writeFeatureObject(modifiedFeature, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          setDrawnFeature(modifiedGeoJson);
          console.log('Polygon modified:', modifiedGeoJson);
        });
      });

      // Add draw interaction initially only if not selecting location
      if (!selectingLocation) {
        mapObject.current.addInteraction(drawInteraction.current);
      }
    }

    return () => {
      if (mapObject.current) {
        mapObject.current.removeInteraction(drawInteraction.current);
        if (modifyInteraction.current) {
          mapObject.current.removeInteraction(modifyInteraction.current);
        }
        mapObject.current.setTarget(undefined);
        mapObject.current = null;
      }
    };
  }, [cameraMarkerStyle, drawStyle, selectingLocation]); // Empty dependency array to run once on mount

  // Update marker position when lat/lng changes
  useEffect(() => {
    if (mapObject.current && cameraDetails.lat && cameraDetails.lng) {
      markerSource.current.clear();
      const coords = fromLonLat([parseFloat(cameraDetails.lng), parseFloat(cameraDetails.lat)]);
      const marker = new Feature({
        geometry: new Point(coords),
      });
      markerSource.current.addFeature(marker);
      mapObject.current.getView().setCenter(coords);
    }
  }, [cameraDetails.lat, cameraDetails.lng]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCameraDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectLocationClick = () => {
    setSelectingLocation(true);
    setDrawingInstructions('Clique no mapa para selecionar a localização da câmera.');
    if (mapObject.current) {
      if (drawInteraction.current) {
        mapObject.current.removeInteraction(drawInteraction.current);
      }
      if (modifyInteraction.current) {
        mapObject.current.removeInteraction(modifyInteraction.current);
      }
    }
  };

  useEffect(() => {
    if (!mapObject.current) return;

    const map = mapObject.current;

    if (selectingLocation) {
      const clickHandler = (event) => {
        const coords = event.coordinate;
        const lonLat = toLonLat(coords);
        setCameraDetails(prev => ({
          ...prev,
          lat: lonLat[1].toFixed(6),
          lng: lonLat[0].toFixed(6),
        }));
        setSelectingLocation(false);
        setDrawingInstructions('Clique e arraste para desenhar um retângulo (4 pontos)');
        map.un('singleclick', clickHandler);
      };
      map.on('singleclick', clickHandler);

      return () => {
        map.un('singleclick', clickHandler);
      };
    } else {
      // Re-add draw/modify interactions when selectingLocation is false
      if (drawnFeature) {
        if (modifyInteraction.current) {
          map.addInteraction(modifyInteraction.current);
        }
      } else {
        if (drawInteraction.current) {
          map.addInteraction(drawInteraction.current);
        }
      }
    }
  }, [selectingLocation, mapObject, drawnFeature]);

  // Validar dados antes de salvar conforme Fase 2.3
  const handleSaveCamera = async () => {
    if (!drawnFeature) {
      alert('Por favor, desenhe a área de cobertura da câmera no mapa.');
      return;
    }
    
    // Validar se o GeoJSON é válido
    try {
      const testFeature = geoJsonFormat.current.readFeature(drawnFeature);
      if (!testFeature.getGeometry()) {
        throw new Error('Geometria inválida');
      }
      console.log('GeoJSON validation passed:', drawnFeature);
    } catch (error) {
      console.error('GeoJSON validation failed:', error);
      alert('Área de cobertura inválida. Por favor, desenhe novamente.');
      return;
    }

    let error;
    if (cameraDetails.id) {
      // Update existing camera
      const { error: updateError } = await supabase
        .from('cameras')
        .update({
          name: cameraDetails.name,
          lat: parseFloat(cameraDetails.lat),
          lng: parseFloat(cameraDetails.lng),
          link: cameraDetails.link,
          info: cameraDetails.info,
          icon: cameraDetails.icon,
          coverage_area: drawnFeature,
        })
        .eq('id', cameraDetails.id);
      error = updateError;
    } else {
      // Insert new camera
      const { error: insertError } = await supabase
        .from('cameras')
        .insert([
          {
            name: cameraDetails.name,
            lat: parseFloat(cameraDetails.lat),
            lng: parseFloat(cameraDetails.lng),
            link: cameraDetails.link,
            info: cameraDetails.info,
            icon: cameraDetails.icon,
            coverage_area: drawnFeature,
          },
        ]);
      error = insertError;
    }

    if (error) {
      console.error('Erro ao salvar câmera:', error);
      alert('Erro ao salvar câmera. Verifique o console para mais detalhes.');
    } else {
      console.log('Câmera salva com sucesso!');
      alert('Câmera salva com sucesso!');
      fetchCameras(); // Re-fetch cameras to update the list
      resetFormAndMap();
    }
  };

  const handleClearDrawing = () => {
    drawSource.current.clear();
    setDrawnFeature(null);
    setDrawingInstructions('Clique e arraste para desenhar um retângulo (4 pontos)');
    // Re-add draw interaction after clearing
    if (mapObject.current) {
      if (modifyInteraction.current) {
        mapObject.current.removeInteraction(modifyInteraction.current);
      }
      mapObject.current.addInteraction(drawInteraction.current);
    }
  };

  const resetFormAndMap = () => {
    setCameraDetails({
      id: null,
      name: '',
      lat: '',
      lng: '',
      link: '',
      info: '',
      icon: 'MdCameraAlt',
    });
    handleClearDrawing();
    markerSource.current.clear(); // Clear marker on reset
  };

  const fetchCameras = async () => {
    const { data, error } = await supabase
      .from('cameras')
      .select('*');

    if (error) {
      console.error('Erro ao buscar câmeras:', error);
    } else if (data) {
      setCameras(data);
    }
  };

  const handleEditCamera = (camera) => {
    setCameraDetails({
      id: camera.id,
      name: camera.name,
      lat: camera.lat,
      lng: camera.lng,
      link: camera.link,
      info: camera.info,
      icon: camera.icon,
    });
    setDrawnFeature(camera.coverage_area);

    // Clear existing drawn features
    drawSource.current.clear();

    // Remove existing interactions
    if (mapObject.current) {
      mapObject.current.removeInteraction(drawInteraction.current);
      if (modifyInteraction.current) {
        mapObject.current.removeInteraction(modifyInteraction.current);
      }
    }

    if (camera.coverage_area) {
      try {
        const feature = geoJsonFormat.current.readFeature(camera.coverage_area, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        drawSource.current.addFeature(feature);
        setDrawingInstructions('Polígono carregado! Arraste os pontos para modificar ou clique em "Limpar" para redesenhar.');
        console.log('Loaded existing coverage area:', camera.coverage_area);

        // Add modify interaction
        modifyInteraction.current = new Modify({
          source: drawSource.current,
        });
        mapObject.current.addInteraction(modifyInteraction.current);
        
        // Melhorar sincronização da modificação conforme Fase 2.2
        modifyInteraction.current.on('modifyend', (modifyEvent) => {
          const modifiedFeature = modifyEvent.features.getArray()[0];
          const modifiedGeoJson = geoJsonFormat.current.writeFeatureObject(modifiedFeature, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          setDrawnFeature(modifiedGeoJson);
          console.log('Polygon modified during edit:', modifiedGeoJson);
        });
      } catch (error) {
        console.error('Error loading coverage area:', error);
        alert('Erro ao carregar área de cobertura. Por favor, desenhe novamente.');
        setDrawingInstructions('Erro ao carregar polígono. Clique e arraste para desenhar um novo retângulo.');
        // If no coverage area, re-add draw interaction
        mapObject.current.addInteraction(drawInteraction.current);
      }
    } else {
      // If no coverage area, re-add draw interaction
      setDrawingInstructions('Clique e arraste para desenhar um retângulo (4 pontos)');
      mapObject.current.addInteraction(drawInteraction.current);
    }

    // Center map on camera location and add marker
    if (mapObject.current && camera.lat && camera.lng) {
      const coords = fromLonLat([parseFloat(camera.lng), parseFloat(camera.lat)]);
      mapObject.current.getView().setCenter(coords);
      markerSource.current.clear();
      const marker = new Feature({
        geometry: new Point(coords),
      });
      markerSource.current.addFeature(marker);
    }
  };

  const handleDeleteCamera = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta câmera?')) {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar câmera:', error);
        alert('Erro ao deletar câmera. Verifique o console para mais detalhes.');
      } else {
        alert('Câmera deletada com sucesso!');
        fetchCameras(); // Re-fetch cameras to update the list
        resetFormAndMap();
      }
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  return (
    <Container fluid className="camera-editor-container">
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-3">
        <Container fluid>
          <Navbar.Brand href="#">Editor de Câmeras</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="ms-auto">
              <Button variant="secondary" onClick={() => navigate('/viewer')}>Voltar para o Mapa</Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Row>
        <Col md={6}>
          <Card className="mb-3">
            <Card.Header>Detalhes da Câmera</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={cameraDetails.name}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Latitude</Form.Label>
                      <Form.Control
                        type="number"
                        name="lat"
                        value={cameraDetails.lat}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Longitude</Form.Label>
                      <Form.Control
                        type="number"
                        name="lng"
                        value={cameraDetails.lng}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Button variant="outline-primary" size="sm" onClick={handleSelectLocationClick}>
                    Selecionar no Mapa
                  </Button>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Link da Imagem</Form.Label>
                  <Form.Control
                    type="text"
                    name="link"
                    value={cameraDetails.link}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Informações</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="info"
                    value={cameraDetails.info}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Ícone (MdCameraAlt)</Form.Label>
                  <Form.Control
                    type="text"
                    name="icon"
                    value={cameraDetails.icon}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Button variant="primary" onClick={handleSaveCamera}>
                  {cameraDetails.id ? 'Atualizar Câmera' : 'Salvar Nova Câmera'}
                </Button>
                <Button variant="secondary" onClick={resetFormAndMap} className="ms-2">
                  Nova Câmera
                </Button>
              </Form>
            </Card.Body>
          </Card>
          <Card className="mt-3">
            <Card.Header>Câmeras Existentes</Card.Header>
            <Card.Body>
              <ListGroup>
                {cameras.map(camera => (
                  <ListGroup.Item key={camera.id} className="d-flex justify-content-between align-items-center">
                    {camera.name}
                    <div>
                      <Button variant="info" size="sm" className="me-2" onClick={() => handleEditCamera(camera)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteCamera(camera.id)}>
                        Deletar
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>Área de Cobertura no Mapa</Card.Header>
            <Card.Body>
              <div className="mb-2">
                <small className="text-muted">{drawingInstructions}</small>
              </div>
              <div id="camera-editor-map" ref={mapRef} style={{ width: '100%', height: '400px' }}></div>
              {drawnFeature && (
                <div className="mt-2">
                  <Button variant="outline-secondary" size="sm" onClick={handleClearDrawing}>
                    Limpar Área de Cobertura
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CameraEditor;
