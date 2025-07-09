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
import { Navbar, Container, Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap';
import CameraLayer from '../CameraLayer';
import { cityCameras } from '../../cityCameras';
import FullScreenImage from '../FullScreenImage';
import { calculateDistance } from '../../utils/calculateDistance';
import './styles.css';

const PROXIMITY_THRESHOLD = 50; // meters

const Viewer = () => {
  const [location, setLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState('');
  const [fullScreenImageTitle, setFullScreenImageTitle] = useState('');
  const [currentProximityCameraId, setCurrentProximityCameraId] = useState(null);

  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const markerFeature = useRef(null);

  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleShowAboutModal = () => setShowAboutModal(true);

  const handleOpenFullScreenImage = useCallback((imageUrl, title) => {
    setFullScreenImageUrl(imageUrl);
    setFullScreenImageTitle(title);
    setShowFullScreenImage(true);
  }, []);

  const handleCloseFullScreenImage = useCallback(() => {
    setShowFullScreenImage(false);
    setFullScreenImageUrl('');
    setFullScreenImageTitle('');
  }, []);

  // Define o estilo do ícone do Heric
  const hericIconStyle = useMemo(() => new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: 'https://hericmr.github.io/me/imagens/heric.png',
      scale: 0.1,
    }),
  }), []);

  // Inicializa o mapa apenas uma vez, quando o DOM está pronto
  useLayoutEffect(() => {
    if (mapObject.current || !mapRef.current) return;
    mapObject.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: markerSource.current }),
      ],
      view: new View({
        center: fromLonLat([-43.2096, -22.9035]), // Centro padrão (Rio de Janeiro)
        zoom: 15,
      }),
    });
    // Força o updateSize após um pequeno delay para garantir renderização
    setTimeout(() => {
      mapObject.current && mapObject.current.updateSize();
    }, 200);
  }, []);

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

  // Proximity logic
  useEffect(() => {
    if (location) {
      let closestCamera = null;
      let minDistance = Infinity;

      cityCameras.forEach(camera => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          camera.lat,
          camera.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestCamera = camera;
        }
      });

      if (closestCamera && minDistance <= PROXIMITY_THRESHOLD) {
        if (!showFullScreenImage || currentProximityCameraId !== closestCamera.id) {
          handleOpenFullScreenImage(closestCamera.link, closestCamera.name);
          setCurrentProximityCameraId(closestCamera.id);
        }
      } else if (showFullScreenImage && currentProximityCameraId) {
        // Close if moved out of proximity of the current camera
        handleCloseFullScreenImage();
        setCurrentProximityCameraId(null);
      }
    }
  }, [location, showFullScreenImage, currentProximityCameraId, handleOpenFullScreenImage, handleCloseFullScreenImage]);

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
              <Button variant="outline-light" onClick={handleShowAboutModal}>Sobre</Button>
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
            {mapObject.current && <CameraLayer map={mapObject.current} cameras={cityCameras} onCameraClick={handleOpenFullScreenImage} />}
          </Col>
          {panelOpen && (
            <Col xs={12} md={3} className="info-col order-1 order-md-2">
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
          <p>Este é um projeto de geolocalização em tempo real para rastrear a localização do Heric.</p>
          <p>Desenvolvido com React, OpenLayers e Supabase.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAboutModal}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {showFullScreenImage && (
        <FullScreenImage
          imageUrl={fullScreenImageUrl}
          title={fullScreenImageTitle}
          close={handleCloseFullScreenImage}
        />
      )}
    </div>
  );
};

export default Viewer;
