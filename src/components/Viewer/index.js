import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import GeoJSON from 'ol/format/GeoJSON';
import { Navbar, Container, Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CameraLayer from '../CameraLayer';
import CameraGrid from '../CameraGrid';
import './styles.css';


const Viewer = () => {
  const navigate = useNavigate();
  console.log('Viewer component rendering');
  const [location, setLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [cameras, setCameras] = useState([]); // Câmeras do Supabase
  const [activeCameras, setActiveCameras] = useState([]); // Câmeras ativas no grid
  const [cameraGridVisible, setCameraGridVisible] = useState(false); // Visibilidade do grid
  const [cameraGridPosition, setCameraGridPosition] = useState('expanded'); // Posição do grid
  const [closedCameras, setClosedCameras] = useState(new Set()); // Câmeras fechadas pelo usuário

  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const markerFeature = useRef(null);
  const coverageSource = useRef(new VectorSource()); // Source para áreas de cobertura

  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleShowAboutModal = () => setShowAboutModal(true);

  // Função para ativar câmeras via clique no mapa
  const handleCameraClick = useCallback((clickedCameras) => {
    console.log('Camera clicked on map:', clickedCameras);
    
    // Filtrar câmeras que não estão fechadas pelo usuário
    const availableCameras = clickedCameras.filter(camera => !closedCameras.has(camera.id));
    
    if (availableCameras.length > 0) {
      setActiveCameras(availableCameras);
      setCameraGridVisible(true);
      setCameraGridPosition('expanded');
      console.log('Activated cameras from map click:', availableCameras.map(c => c.name));
    } else {
      console.log('All clicked cameras are closed by user');
    }
  }, [closedCameras]);

  // Função para detectar câmeras relevantes sem imposição
  const detectRelevantCameras = useCallback((location, cameras) => {
    return cameras.filter(camera => {
      // Pular câmeras fechadas pelo usuário
      if (closedCameras.has(camera.id)) {
        return false;
      }
      // Verificar se está dentro da área de cobertura
      if (camera.coverage_area) {
        try {
          const geoJsonFormat = new GeoJSON();
          const feature = geoJsonFormat.readFeature(camera.coverage_area, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          const point = new Point(fromLonLat([location.lng, location.lat]));
          if (feature.getGeometry().intersectsCoordinate(point.getCoordinates())) {
            return true;
          }
        } catch (error) {
          console.error('Error checking coverage area for camera:', camera.name, error);
        }
      }
      // Fallback para proximidade por distância foi removido
      return false;
    });
  }, [closedCameras]);

  // Função para fechar câmera específica
  const handleCloseCamera = useCallback((cameraId) => {
    setClosedCameras(prev => new Set([...prev, cameraId]));
    setActiveCameras(prev => prev.filter(cam => cam.id !== cameraId));
    
    // Se não há mais câmeras ativas, esconder o grid
    if (activeCameras.length <= 1) {
      setCameraGridVisible(false);
    }
    
    console.log('Camera closed by user:', cameraId);
  }, [activeCameras.length]);

  // Função para fechar todas as câmeras
  const handleCloseAllCameras = useCallback(() => {
    setActiveCameras([]);
    setCameraGridVisible(false);
    setClosedCameras(new Set());
    console.log('All cameras closed');
  }, []);

  // Função para reabrir todas as câmeras fechadas
  const handleReopenAllCameras = useCallback(() => {
    setClosedCameras(new Set());
    console.log('All cameras reopened');
  }, []);

  // Função para mudar posição do grid
  const handleGridPositionChange = useCallback((newPosition) => {
    setCameraGridPosition(newPosition);
  }, []);

  // Define o estilo do ícone do Heric
  const hericIconStyle = useMemo(() => new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: 'https://hericmr.github.io/me/imagens/heric.png',
      scale: 0.1,
    }),
  }), []);

  // Style for coverage areas - Melhorado conforme Fase 1.3
  const coverageStyle = useMemo(() => new Style({
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 0.8)',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.2)',
    }),
  }), []);

  // Inicializa o mapa apenas uma vez, quando o DOM está pronto
  useLayoutEffect(() => {
    if (mapObject.current || !mapRef.current) return;
    
    // Criar camada de cobertura separada conforme Fase 1.1
    const coverageLayer = new VectorLayer({
      source: coverageSource.current,
      style: coverageStyle,
      zIndex: 1, // Garantir que fique acima do mapa base
    });
    
    mapObject.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: markerSource.current }),
        coverageLayer, // Usar camada separada para cobertura
      ],
      view: new View({
        center: fromLonLat([-43.2096, -22.9035]), // Centro padrão (Rio de Janeiro)
        zoom: 18,
      }),
    });
    // Força o updateSize após um pequeno delay para garantir renderização
    setTimeout(() => {
      mapObject.current && mapObject.current.updateSize();
    }, 200);
  }, [coverageStyle]); // Add coverageStyle to dependencies

  // Atualiza a posição do marcador e a view quando a localização muda
  useEffect(() => {
    if (!location || !mapObject.current) return;
    
    const coords = fromLonLat([location.lng, location.lat]);
    
    // Atualiza a view
    mapObject.current.getView().setCenter(coords);
    
    // Atualiza o marcador
    markerSource.current.clear();
    markerFeature.current = new Feature({ geometry: new Point(coords) });
    markerFeature.current.setStyle(hericIconStyle);
    markerSource.current.addFeature(markerFeature.current);
    
    // Garante que o mapa se ajuste ao novo tamanho
    setTimeout(() => {
      mapObject.current && mapObject.current.updateSize();
    }, 100);
  }, [location, hericIconStyle]);

  // Atualiza o tamanho do mapa ao redimensionar a janela
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        mapObject.current && mapObject.current.updateSize();
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Busca localização inicial e assina updates
  useEffect(() => {
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('location_updates')
        .select('lat, lng, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) {
        setConnectionStatus('Erro ao buscar localização inicial');
      } else if (data) {
        setLocation(data);
        setLastUpdate(new Date(data.created_at).toLocaleString());
        setConnectionStatus('Conectado');
      }
    };
    fetchInitialLocation();
    const subscription = supabase
      .channel('location_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_updates' }, (payload) => {
        setLocation(payload.new);
        setLastUpdate(new Date(payload.new.created_at).toLocaleString());
        setConnectionStatus('Atualizado em tempo real');
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Fetch cameras from Supabase and display coverage areas
  useEffect(() => {
    const fetchCameras = async () => {
      const { data, error } = await supabase
        .from('cameras') // Assuming your table name is 'cameras'
        .select('*');

      if (error) {
        console.error('Error fetching cameras:', error);
      } else {
        console.log('Cameras loaded from Supabase:', data);
        // Log YouTube cameras specifically
        const youtubeCameras = data?.filter(camera => camera.youtube_link);
        if (youtubeCameras?.length > 0) {
          console.log('YouTube cameras found:', youtubeCameras);
        }
        setCameras(data);
      }
    };

    fetchCameras();
  }, []);

  // Proximity logic - Simplificada para usar grid
  useEffect(() => {
    if (location) {
      const relevantCameras = detectRelevantCameras(location, cameras);
      
      if (relevantCameras.length > 0) {
        setActiveCameras(relevantCameras);
        setCameraGridVisible(true);
        
        if (relevantCameras.length > 1) {
          console.log('Showing multiple cameras in coverage area:', relevantCameras.map(c => c.name));
        } else {
          console.log('Showing single camera in coverage area:', relevantCameras[0].name);
        }
      } else {
        setActiveCameras([]);
        setCameraGridVisible(false);
      }
    }
  }, [location, cameras, detectRelevantCameras]);

  return (
    <div className="viewer-page">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container fluid>
          <Navbar.Brand href="#">Onde está o Heric?</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="ms-auto">
              <Badge bg={connectionStatus.includes('Erro') ? 'danger' : 'success'} className="me-2">
                {connectionStatus}
              </Badge>
              {lastUpdate && <span className="text-light me-2">Última Atualização: {lastUpdate}</span>}
              <Button variant="outline-light" onClick={handleShowAboutModal} className="me-2">Sobre</Button>
              <Button variant="outline-light" onClick={() => navigate('/edit-cameras')}>Editar Câmeras</Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="main-content">
        <Row className="h-100 flex-md-row flex-column-reverse">
          <Col xs={12} md={9} className={`map-col order-2 order-md-1${panelOpen ? '' : ' map-col-full'}`}>
            <Button
              variant="primary"
              className="toggle-panel-btn d-md-none"
              onClick={() => setPanelOpen(!panelOpen)}
              aria-label={panelOpen ? 'Fechar painel' : 'Abrir painel'}
              style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}
            >
              {panelOpen ? '⮜' : '⮞'}
            </Button>
            <div ref={mapRef} id="map" className="map-container"></div>
            {mapObject.current && <CameraLayer map={mapObject.current} cameras={cameras} onCameraClick={handleCameraClick} />}
          </Col>
          {panelOpen && (
            <Col xs={12} md={3} className="info-col order-1 order-md-2 d-none d-md-block">
              <Button
                variant="outline-secondary"
                className="toggle-panel-btn d-none d-md-block mb-2"
                onClick={() => setPanelOpen(false)}
                aria-label="Fechar painel"
                style={{ alignSelf: 'flex-end' }}
              >
                ×
              </Button>
              <Card className="mt-3">
                <Card.Header>Última Localização</Card.Header>
                <Card.Body>
                  {location ? (
                    <>
                      <p>Latitude: {location.lat}</p>
                      <p>Longitude: {location.lng}</p>
                    </>
                  ) : (
                    <p>Aguardando dados de localização...</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Container>
      <Modal show={showAboutModal} onHide={handleCloseAboutModal}>
        <Modal.Header closeButton>
          <Modal.Title>Sobre o Projeto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Projeto de Rastreamento em Tempo Real</h5>
          <p>Sistema desenvolvido com React, OpenLayers e Supabase para monitorar em tempo real a localização do Heric. Exibe dados geográficos em um mapa interativo, com integração a câmeras de vigilância urbana para apoio visual.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAboutModal}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {cameraGridVisible && (
        <CameraGrid
          cameras={activeCameras}
          visible={cameraGridVisible}
          onCloseCamera={handleCloseCamera}
          onCloseAll={handleCloseAllCameras}
          onReopenAll={handleReopenAllCameras}
          position={cameraGridPosition}
          onPositionChange={handleGridPositionChange}
        />
      )}
    </div>
  );
};

export default Viewer;

