import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { transformCamerasFromJson } from '../../utils/cameraTransform';
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
import { Container, Row, Col, Form, Button, Card, ListGroup, Navbar, Badge, InputGroup } from 'react-bootstrap';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import GeoJSON from 'ol/format/GeoJSON';
import './styles.css';

import { useNavigate } from 'react-router-dom';
import CircleStyle from 'ol/style/Circle';

const calcCentroid = (geoJson) => {
  const coords = geoJson.geometry.coordinates[0];
  const n = coords.length - 1;
  const lng = coords.slice(0, n).reduce((s, c) => s + c[0], 0) / n;
  const lat = coords.slice(0, n).reduce((s, c) => s + c[1], 0) / n;
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
};

const CameraEditor = () => {
  const navigate = useNavigate();
  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const drawSource = useRef(new VectorSource());
  const selectorSource = useRef(new VectorSource());
  const drawInteraction = useRef(null);
  const modifyInteraction = useRef(null);
  const geoJsonFormat = useRef(new GeoJSON());
  const handleEditCameraRef = useRef(null);

  const placeMarker = (lat, lng) => {
    if (!mapObject.current) return;
    markerSource.current.clear();
    const coords = fromLonLat([parseFloat(lng), parseFloat(lat)]);
    markerSource.current.addFeature(new Feature({ geometry: new Point(coords) }));
    mapObject.current.getView().setCenter(coords);
  };

  const [cameraDetails, setCameraDetails] = useState({
    id: null,
    name: '',
    lat: '',
    lng: '',
    link: '',
    youtube_link: '',
    info: '',
    active: true,
  });
  const [drawnFeature, setDrawnFeature] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [drawingInstructions, setDrawingInstructions] = useState('Clique e arraste para desenhar um retângulo (4 pontos)');
  const [selectingLocation, setSelectingLocation] = useState(false);

  // Function to validate YouTube embed links
  const isValidYouTubeEmbedLink = (url) => {
    const youtubeEmbedRegex = /^https:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+(\?.*)?$/;
    return youtubeEmbedRegex.test(url);
  };

  const drawStyle = useMemo(() => new Style({
    stroke: new Stroke({
      color: 'blue',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }), []);

  // Style for camera marker - Melhorado para consistência
  const cameraMarkerStyle = useMemo(() => {
    const hasYoutube = cameraDetails.youtube_link;
    
    // Ícone SVG original feather-video (câmera de segurança)
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>`;
    
    const encodedSvg = encodeURIComponent(svgString);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    
    return function(feature) {
      return [
        // Círculo de fundo
        new Style({
          image: new CircleStyle({
            radius: 18,
            fill: new Fill({ 
              color: hasYoutube ? '#ff6b6b' : '#4ecdc4'
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
            src: dataUrl,
            scale: 0.8,
            anchor: [0.5, 0.5],
          }),
        })
      ];
    };
  }, [cameraDetails.youtube_link]);

  

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapObject.current) {
      const selectorStyle = new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#4ecdc4' }),
          stroke: new Stroke({ color: '#fff', width: 1.5 }),
        }),
      });

      mapObject.current = new Map({
        target: mapRef.current.id,
        layers: [
          new TileLayer({ source: new OSM() }),
          new VectorLayer({
            source: selectorSource.current,
            style: selectorStyle,
            zIndex: 1,
          }),
          new VectorLayer({
            source: markerSource.current,
            style: cameraMarkerStyle,
            zIndex: 3,
          }),
          new VectorLayer({
            source: drawSource.current,
            style: drawStyle,
            zIndex: 2,
          }),
        ],
        view: new View({
          center: fromLonLat([-46.308861, -23.985111]),
          zoom: 15,
        }),
      });

      mapObject.current.on('singleclick', (event) => {
        if (selectingLocation) return;
        const feature = mapObject.current.forEachFeatureAtPixel(event.pixel, (f, layer) => {
          if (layer?.getSource() === selectorSource.current) return f;
          return undefined;
        });
        if (feature) {
          const cam = feature.get('camera');
          if (cam && handleEditCameraRef.current) handleEditCameraRef.current(cam);
        }
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

        const centroid = calcCentroid(geoJson);
        setCameraDetails(prev => ({ ...prev, lat: centroid.lat, lng: centroid.lng }));
        placeMarker(centroid.lat, centroid.lng);

        mapObject.current.removeInteraction(drawInteraction.current);
        modifyInteraction.current = new Modify({ source: drawSource.current });
        mapObject.current.addInteraction(modifyInteraction.current);

        modifyInteraction.current.on('modifyend', (modifyEvent) => {
          const modifiedFeature = modifyEvent.features.getArray()[0];
          const modifiedGeoJson = geoJsonFormat.current.writeFeatureObject(modifiedFeature, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          setDrawnFeature(modifiedGeoJson);
          const updatedCentroid = calcCentroid(modifiedGeoJson);
          setCameraDetails(prev => ({ ...prev, lat: updatedCentroid.lat, lng: updatedCentroid.lng }));
          placeMarker(updatedCentroid.lat, updatedCentroid.lng);
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

    // Validate YouTube link
    if (cameraDetails.youtube_link && !isValidYouTubeEmbedLink(cameraDetails.youtube_link)) {
      alert('Por favor, insira um link de incorporação válido do YouTube (ex: https://www.youtube.com/embed/VIDEO_ID).');
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

    const payload = {
      name: cameraDetails.name,
      lat: parseFloat(cameraDetails.lat),
      lng: parseFloat(cameraDetails.lng),
      link: cameraDetails.link,
      youtube_link: cameraDetails.youtube_link,
      info: cameraDetails.info,
      coverage_area: drawnFeature,
      active: cameraDetails.active,
    };

    let error;
    if (cameraDetails.id) {
      // Upsert: covers both Supabase cameras (update) and JSON cameras (insert with same id)
      const { error: upsertError } = await supabase
        .from('cameras')
        .upsert({ id: cameraDetails.id, ...payload });
      error = upsertError;
    } else {
      const { error: insertError } = await supabase
        .from('cameras')
        .insert([payload]);
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
      youtube_link: '',
      info: '',
      active: true,
    });
    handleClearDrawing();
    markerSource.current.clear(); // Clear marker on reset
  };

  const fetchCameras = async () => {
    const allCameras = [];

    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/cameras_detailed.json`);
      if (response.ok) {
        const json = await response.json();
        const jsonCameras = transformCamerasFromJson(json).map(c => ({ ...c, _source: 'json' }));
        allCameras.push(...jsonCameras);
      }
    } catch (err) {
      console.error('Erro ao carregar cameras_detailed.json:', err);
    }

    try {
      const { data, error } = await supabase.from('cameras').select('*');
      if (!error && data?.length > 0) {
        const supabaseIds = new Set(data.map(c => String(c.id)));
        // Remove JSON cameras that have a Supabase version (Supabase overrides JSON)
        const filteredJson = allCameras.filter(c => !supabaseIds.has(String(c.id)));
        const supabaseCameras = data.map(c => ({ ...c, _source: 'supabase' }));
        setCameras([...supabaseCameras, ...filteredJson]);
        return;
      }
    } catch (err) {
      console.error('Erro ao buscar câmeras do Supabase:', err);
    }

    setCameras(allCameras);
  };

  const handleEditCamera = (camera) => {
    setCameraDetails({
      id: camera.id,
      name: camera.name,
      lat: camera.lat,
      lng: camera.lng,
      link: camera.link || '',
      youtube_link: camera.youtube_link || '',
      info: camera.info || '',
      active: camera.active !== false,
      _source: camera._source,
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
          const updatedCentroid = calcCentroid(modifiedGeoJson);
          setCameraDetails(prev => ({ ...prev, lat: updatedCentroid.lat, lng: updatedCentroid.lng }));
          placeMarker(updatedCentroid.lat, updatedCentroid.lng);
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

  const handleDeleteCamera = async (camera) => {
    if (camera._source === 'json') {
      alert('Câmeras do JSON público não podem ser deletadas. Edite-as para sobrescrever os dados.');
      return;
    }
    if (window.confirm('Tem certeza que deseja deletar esta câmera?')) {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', camera.id);

      if (error) {
        console.error('Erro ao deletar câmera:', error);
        alert('Erro ao deletar câmera. Verifique o console para mais detalhes.');
      } else {
        alert('Câmera deletada com sucesso!');
        fetchCameras();
        resetFormAndMap();
      }
    }
  };

  // Salva automaticamente quando o toggle active muda (só para câmeras já existentes)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!cameraDetails.id) return;
    const save = async () => {
      const { error } = await supabase
        .from('cameras')
        .upsert({ id: cameraDetails.id, active: cameraDetails.active });
      if (error) console.error('Erro ao salvar status:', error);
      else fetchCameras();
    };
    save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraDetails.active]);

  // Mantém a ref sempre apontando para a versão atual de handleEditCamera
  handleEditCameraRef.current = handleEditCamera;

  // Popula o selectorSource com todas as câmeras para seleção no mapa
  useEffect(() => {
    selectorSource.current.clear();
    cameras.forEach(camera => {
      if (!camera.lat || !camera.lng) return;
      const feature = new Feature({
        geometry: new Point(fromLonLat([parseFloat(camera.lng), parseFloat(camera.lat)])),
      });
      feature.set('camera', camera);
      selectorSource.current.addFeature(feature);
    });
  }, [cameras]);

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
        {/* Coluna esquerda: formulário + lista */}
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Detalhes da Câmera</span>
              {cameraDetails.id && (
                <Badge bg={cameraDetails.active ? 'success' : 'danger'}>
                  {cameraDetails.active ? 'Ativa' : 'Inativa'}
                </Badge>
              )}
            </Card.Header>
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
                  <Form.Label>Link do YouTube</Form.Label>
                  <Form.Control
                    type="text"
                    name="youtube_link"
                    value={cameraDetails.youtube_link}
                    onChange={handleInputChange}
                    placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Informações</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="info"
                    value={cameraDetails.info}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3 p-3 border rounded" style={{ background: cameraDetails.active ? '#f0fff4' : '#fff5f5' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <Form.Label className="mb-0 fw-bold">
                        {cameraDetails.active ? 'Câmera Ativa' : 'Câmera Inativa'}
                      </Form.Label>
                      <div style={{ fontSize: '0.78rem', color: '#666' }}>
                        {cameraDetails.active
                          ? 'Aparece no mapa principal'
                          : 'Oculta do mapa principal (problema técnico)'}
                      </div>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={cameraDetails.active}
                      onChange={e => setCameraDetails(prev => ({ ...prev, active: e.target.checked }))}
                    />
                  </div>
                </Form.Group>

                <Button variant="secondary" onClick={resetFormAndMap} size="sm">
                  Nova Câmera
                </Button>
              </Form>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              Câmeras Existentes <Badge bg="secondary">{cameras.length}</Badge>
            </Card.Header>
            <Card.Body>
              <InputGroup className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Buscar câmera..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
                {searchFilter && (
                  <Button variant="outline-secondary" onClick={() => setSearchFilter('')}>✕</Button>
                )}
              </InputGroup>
              <ListGroup style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {cameras
                  .filter(c => c.name?.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(camera => (
                    <ListGroup.Item
                      key={`${camera._source}-${camera.id}`}
                      className="d-flex justify-content-between align-items-center py-1"
                      style={{ opacity: camera.active === false ? 0.5 : 1 }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Badge bg={camera._source === 'supabase' ? 'primary' : 'secondary'} className="me-1" style={{ fontSize: '0.65rem' }}>
                          {camera._source === 'supabase' ? 'editada' : 'JSON'}
                        </Badge>
                        {camera.active === false && (
                          <Badge bg="danger" className="me-1" style={{ fontSize: '0.65rem' }}>inativa</Badge>
                        )}
                        <span style={{ fontSize: '0.85rem' }}>{camera.name}</span>
                      </div>
                      <div className="ms-2 flex-shrink-0">
                        <Button variant="info" size="sm" className="me-1" onClick={() => handleEditCamera(camera)}>
                          Editar
                        </Button>
                        {camera._source === 'supabase' && (
                          <Button variant="danger" size="sm" onClick={() => handleDeleteCamera(camera)}>
                            Deletar
                          </Button>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Coluna direita: preview + mapa + salvar */}
        <Col md={8}>
          {cameraDetails.link && (
            <Card className="mb-3">
              <Card.Header>Preview da Câmera — {cameraDetails.name || 'sem nome'}</Card.Header>
              <Card.Body className="p-0" style={{ background: '#000' }}>
                <img
                  src={cameraDetails.link}
                  alt="Preview da câmera"
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                  onError={e => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#888' }}>
                  Imagem indisponível
                </div>
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Área de Cobertura</span>
              <small className="text-muted">{drawingInstructions}</small>
            </Card.Header>
            <Card.Body className="p-2">
              <div id="camera-editor-map" ref={mapRef} style={{ width: '100%', height: '460px' }}></div>
            </Card.Body>
            <Card.Footer className="d-flex gap-2">
              <Button variant="primary" onClick={handleSaveCamera}>
                {cameraDetails.id ? 'Atualizar Câmera' : 'Salvar Nova Câmera'}
              </Button>
              {drawnFeature && (
                <Button variant="outline-secondary" onClick={handleClearDrawing}>
                  Limpar Polígono
                </Button>
              )}
              <Button variant="outline-primary" size="sm" onClick={handleSelectLocationClick} className="ms-auto">
                Selecionar Ponto no Mapa
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CameraEditor;
