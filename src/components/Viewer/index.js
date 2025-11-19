import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
import { supabase } from '../../supabaseClient';
import { transformCamerasFromJson } from '../../utils/cameraTransform';
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
import CameraLayer from '../CameraLayer';
import CameraGrid from '../CameraGrid';
import './styles.css';


const Viewer = () => {
  console.log('Viewer component rendering');
  const [location, setLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // Start minimized (closed)
  const [cameras, setCameras] = useState([]); // Câmeras do Supabase
  const [activeCameras, setActiveCameras] = useState([]); // Câmeras ativas no grid
  const [cameraGridVisible, setCameraGridVisible] = useState(false); // Visibilidade do grid
  const [cameraGridPosition, setCameraGridPosition] = useState('expanded'); // Posição do grid
  const [closedCameras, setClosedCameras] = useState(new Set()); // Câmeras fechadas pelo usuário
  const [autoOpenDisabled, setAutoOpenDisabled] = useState(false); // Se o usuário fechou manualmente, não abrir automaticamente

  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const markerFeature = useRef(null);
  const coverageSource = useRef(new VectorSource()); // Source para áreas de cobertura
  const locationIntervalRef = useRef(null); // Ref for periodic location updates
  const autoZoomEnabled = useRef(true); // Auto-zoom enabled by default

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
      setCameraGridPosition('fullscreen'); // Go directly to fullscreen, skip intermediate stage
      console.log('Activated cameras from map click:', availableCameras.map(c => c.name));
    } else {
      console.log('All clicked cameras are closed by user');
    }
  }, [closedCameras]);

  // Função para calcular distância entre dois pontos em metros (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }, []);

  // Função para detectar câmeras relevantes - verifica proximidade de 10 metros
  const detectRelevantCameras = useCallback((location, cameras) => {
    return cameras.filter(camera => {
      // Pular câmeras fechadas pelo usuário
      if (closedCameras.has(camera.id)) {
        return false;
      }
      
      // Verificar proximidade de 10 metros
      if (camera.lat && camera.lng && location.lat && location.lng) {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          camera.lat,
          camera.lng
        );
        
        if (distance <= 10) { // Within 10 meters
          return true;
        }
      }
      
      // Verificar se está dentro da área de cobertura (fallback)
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
      
      return false;
    });
  }, [closedCameras, calculateDistance]);

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
    setAutoOpenDisabled(true); // Marca que o usuário fechou manualmente
    console.log('All cameras closed - auto-open disabled');
  }, []);

  // Função para reabrir todas as câmeras fechadas
  const handleReopenAllCameras = useCallback(() => {
    setClosedCameras(new Set());
    setAutoOpenDisabled(false); // Reabilita abertura automática quando usuário reabre
    console.log('All cameras reopened - auto-open enabled');
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
        zoom: 15, // Reduced zoom to show wider area
      }),
    });
    // Força o updateSize após um pequeno delay para garantir renderização
    setTimeout(() => {
      mapObject.current && mapObject.current.updateSize();
    }, 200);
  }, [coverageStyle]); // Add coverageStyle to dependencies

  // Função para buscar localização do target (baseada no vehicle-tracking)
  const fetchTargetLocation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('location_updates')
        .select('lat, lng, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching target location:', error);
        setConnectionStatus('Erro ao buscar localização');
        return null;
      }
      
      if (data) {
        setLocation(data);
        setLastUpdate(new Date(data.created_at).toLocaleString());
        setConnectionStatus('Conectado');
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching target location:', error);
      return null;
    }
  }, []);

  // Debounced version of fetchTargetLocation (1 second delay)
  const debouncedFetchLocation = useMemo(
    () => debounce(fetchTargetLocation, 1000),
    [fetchTargetLocation]
  );

  // Atualiza a posição do marcador e a view quando a localização muda (melhorado com auto-zoom suave)
  useEffect(() => {
    if (!location || !mapObject.current) return;
    
    const coords = fromLonLat([location.lng, location.lat]);
    
    // Atualiza o marcador
    markerSource.current.clear();
    markerFeature.current = new Feature({ geometry: new Point(coords) });
    markerFeature.current.setStyle(hericIconStyle);
    markerSource.current.addFeature(markerFeature.current);
    
    // Auto-zoom suave com animação (baseado no vehicle-tracking)
    if (autoZoomEnabled.current && mapObject.current) {
      const view = mapObject.current.getView();
      const currentCenter = view.getCenter();
      
      // Só anima se a posição mudou significativamente ou é a primeira carga
      if (!currentCenter || 
          Math.abs(currentCenter[0] - coords[0]) > 0.0001 || 
          Math.abs(currentCenter[1] - coords[1]) > 0.0001) {
        // Usa animação suave (flyTo equivalente no OpenLayers)
        view.animate({
          center: coords,
          zoom: 16, // Zoom level similar ao vehicle-tracking
          duration: 1000 // 1 segundo de animação
        });
      }
    }
    
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

  // Busca localização inicial, assina updates em tempo real E atualização periódica (baseado no vehicle-tracking)
  useEffect(() => {
    // Busca inicial
    fetchTargetLocation();
    
    // Realtime subscription (prioritário)
    const subscription = supabase
      .channel('location_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_updates' }, (payload) => {
        setLocation(payload.new);
        setLastUpdate(new Date(payload.new.created_at).toLocaleString());
        setConnectionStatus('Atualizado em tempo real');
      })
      .subscribe();
    
    // Atualização periódica como fallback (10 segundos como no vehicle-tracking)
    // Isso garante que mesmo se o realtime falhar, ainda temos atualizações
    locationIntervalRef.current = setInterval(() => {
      debouncedFetchLocation();
    }, 10000); // 10 segundos
    
    return () => {
      supabase.removeChannel(subscription);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      debouncedFetchLocation.cancel(); // Cancela qualquer debounce pendente
    };
  }, [fetchTargetLocation, debouncedFetchLocation]);

  // Fetch cameras from cameras_detailed.json AND Supabase (combine both)
  useEffect(() => {
    const fetchCameras = async () => {
      const allCameras = [];
      
      // First, try to load from JSON file
      try {
        // Get PUBLIC_URL - in CRA, this is available at runtime
        // In development: empty string
        // In production: the homepage value (e.g., "/wheresheric")
        const publicUrl = process.env.PUBLIC_URL || '';
        
        // Build the correct path
        // Remove trailing slash if present, then add the filename
        const basePath = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        
        // Try multiple path strategies
        const possiblePaths = [];
        
        // Strategy 1: Use PUBLIC_URL if available
        if (basePath) {
          possiblePaths.push(`${basePath}/cameras_detailed.json`);
        }
        
        // Strategy 2: Use absolute path from window.location (works in dev and prod)
        const windowBase = window.location.pathname.split('/').slice(0, -1).join('/') || '';
        if (windowBase && !possiblePaths.includes(`${windowBase}/cameras_detailed.json`)) {
          possiblePaths.push(`${windowBase}/cameras_detailed.json`);
        }
        
        // Strategy 3: Root path (works in development)
        possiblePaths.push('/cameras_detailed.json');
        
        // Strategy 4: Relative to current pathname
        const relativePath = window.location.pathname.endsWith('/') 
          ? 'cameras_detailed.json' 
          : './cameras_detailed.json';
        possiblePaths.push(relativePath);
        
        console.log(`[Camera Loader] PUBLIC_URL: "${publicUrl}"`);
        console.log(`[Camera Loader] Window location: ${window.location.href}`);
        console.log(`[Camera Loader] Window origin: ${window.location.origin}`);
        console.log(`[Camera Loader] Window pathname: ${window.location.pathname}`);
        console.log(`[Camera Loader] Will try paths:`, possiblePaths);
        
        let camerasJson = null;
        
        // Try each path until one works
        for (const jsonPath of possiblePaths) {
          try {
            console.log(`[Camera Loader] Attempting to load from: ${jsonPath}`);
            const response = await fetch(jsonPath, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              cache: 'no-cache'
            });
            
            // Check content type first (before reading body)
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            
            if (!response.ok) {
              console.warn(`[Camera Loader] HTTP ${response.status} from ${jsonPath}`);
              continue; // Try next path
            }
            
            // Check if response is actually JSON
            if (!isJson) {
              console.warn(`[Camera Loader] Not JSON (${contentType}) from ${jsonPath}`);
              continue; // Try next path
            }
            
            camerasJson = await response.json();
            console.log(`[Camera Loader] Successfully loaded from: ${jsonPath}`);
            break; // Success!
          } catch (err) {
            console.warn(`[Camera Loader] Error loading from ${jsonPath}:`, err.message);
            continue; // Try next path
          }
        }
        
        if (!camerasJson) {
          throw new Error(`Failed to load cameras_detailed.json from any path. Tried: ${possiblePaths.join(', ')}`);
        }
        
        console.log('[Camera Loader] Raw JSON keys count:', Object.keys(camerasJson).length);
        
        if (camerasJson && Object.keys(camerasJson).length > 0) {
          // Transform JSON data to expected format
          const transformedCameras = transformCamerasFromJson(camerasJson);
          
          console.log('[Camera Loader] Cameras loaded from JSON:', transformedCameras.length);
          if (transformedCameras.length > 0) {
            console.log('[Camera Loader] Sample camera:', transformedCameras[0]);
            console.log('[Camera Loader] First 3 cameras:', transformedCameras.slice(0, 3).map(c => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng })));
            allCameras.push(...transformedCameras);
          } else {
            console.warn('[Camera Loader] No valid cameras found after transformation');
            console.warn('[Camera Loader] Raw JSON sample:', Object.values(camerasJson).slice(0, 2));
          }
        } else {
          console.warn('[Camera Loader] No JSON data loaded or empty JSON');
        }
      } catch (error) {
        console.error('[Camera Loader] Error fetching cameras from JSON:', error);
        console.error('[Camera Loader] Error details:', error.message);
        if (error.stack) {
          console.error('[Camera Loader] Stack:', error.stack);
        }
      }
      
      // Also load from Supabase (combine with JSON cameras)
      try {
        console.log('[Camera Loader] Loading cameras from Supabase...');
        const { data, error: supabaseError } = await supabase
          .from('cameras')
          .select('*');

        if (supabaseError) {
          console.error('[Camera Loader] Error fetching cameras from Supabase:', supabaseError);
        } else if (data && data.length > 0) {
          console.log('[Camera Loader] Cameras loaded from Supabase:', data.length);
          // Add Supabase cameras to the list (avoid duplicates by ID)
          const existingIds = new Set(allCameras.map(c => c.id));
          const newSupabaseCameras = data.filter(c => !existingIds.has(c.id));
          if (newSupabaseCameras.length > 0) {
            console.log('[Camera Loader] Adding', newSupabaseCameras.length, 'new cameras from Supabase');
            allCameras.push(...newSupabaseCameras);
          } else {
            console.log('[Camera Loader] All Supabase cameras already exist in JSON data');
          }
        } else {
          console.log('[Camera Loader] No cameras found in Supabase');
        }
      } catch (supabaseError) {
        console.error('[Camera Loader] Error loading from Supabase:', supabaseError);
      }
      
      // Set all cameras (JSON + Supabase)
      console.log('[Camera Loader] Total cameras loaded:', allCameras.length);
      setCameras(allCameras);
    };

    fetchCameras();
  }, []);

  // Proximity logic - Abre automaticamente se target está a menos de 10m de uma câmera
  useEffect(() => {
    if (location && !autoOpenDisabled) { // Só abre automaticamente se não foi fechado manualmente
      const relevantCameras = detectRelevantCameras(location, cameras);
      
      if (relevantCameras.length > 0) {
        setActiveCameras(relevantCameras);
        setCameraGridVisible(true);
        setCameraGridPosition('fullscreen'); // Abre diretamente em fullscreen
        
        if (relevantCameras.length > 1) {
          console.log('Auto-opening multiple cameras within 10m:', relevantCameras.map(c => c.name));
        } else {
          console.log('Auto-opening camera within 10m:', relevantCameras[0].name);
        }
      } else {
        // Não fecha automaticamente - deixa o usuário controlar
        // setActiveCameras([]);
        // setCameraGridVisible(false);
      }
    }
  }, [location, cameras, detectRelevantCameras, autoOpenDisabled]);

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
            {mapObject.current && <CameraLayer map={mapObject.current} cameras={cameras} onCameraClick={handleCameraClick} targetLocation={location} />}
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
          <p>Este é um projeto de geolocalização em tempo real para rastrear a localização do Heric.</p>
          <p>Desenvolvido com React, OpenLayers e Supabase.</p>
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

