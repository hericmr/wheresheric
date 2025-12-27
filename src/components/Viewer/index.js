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
import { Navbar, Container, Row, Col, Card, Button, Badge, Modal, ButtonGroup, Form, InputGroup } from 'react-bootstrap';
import CameraLayer from '../CameraLayer';
import CameraGrid from '../CameraGrid';
import TrackLayer from '../TrackLayer';
import './styles.css';


const Viewer = () => {
  console.log('Viewer component rendering');
  const [location, setLocation] = useState(null);
  const [showCameras, setShowCameras] = useState(true); // Toggle visibility of cameras
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true); // Start expanded (open)
  const [cameras, setCameras] = useState([]); // Câmeras do Supabase
  const [activeCameras, setActiveCameras] = useState([]); // Câmeras ativas no grid
  const [cameraGridVisible, setCameraGridVisible] = useState(false); // Visibilidade do grid
  const [cameraGridPosition, setCameraGridPosition] = useState('expanded'); // Posição do grid
  const [closedCameras, setClosedCameras] = useState(new Set()); // Câmeras fechadas pelo usuário
  const [autoOpenDisabled, setAutoOpenDisabled] = useState(false); // Se o usuário fechou manualmente, não abrir automaticamente
  const [isDemoMode, setIsDemoMode] = useState(false); // Fallback para modo demo se a DB falhar

  // Track recording state
  const [isRecording, setIsRecording] = useState(false);
  const [trackCoordinates, setTrackCoordinates] = useState([]);

  // History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyHours, setHistoryHours] = useState('24');
  const [historyCoordinates, setHistoryCoordinates] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const markerFeature = useRef(null);
  const locationIntervalRef = useRef(null); // Ref for periodic location updates
  const autoZoomEnabled = useRef(true); // Auto-zoom enabled by default
  const demoIntervalRef = useRef(null); // Intervalo para modo demo

  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleShowAboutModal = () => setShowAboutModal(true);

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Clear track
  const clearTrack = () => {
    setTrackCoordinates([]);
  };



  // History function
  const handleShowHistoryModal = () => setShowHistoryModal(true);
  const handleCloseHistoryModal = () => setShowHistoryModal(false);

  const fetchHistory = useCallback(async () => {
    if (!historyHours || isNaN(historyHours)) return;

    setLoadingHistory(true);
    setHistoryCoordinates([]);
    try {
      const hours = parseInt(historyHours);
      // Calculate timestamp X hours ago
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      console.log(`[History] Fetching data since ${startTime} (${hours} hours ago)`);

      const { data, error } = await supabase
        .from('location_updates')
        .select('lat, lng, created_at')
        .gte('created_at', startTime)
        .order('created_at', { ascending: true }); // Ascending for correct line drawing

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`[History] Found ${data.length} points`);
        const coords = data.map(pt => [pt.lng, pt.lat]); // [lng, lat] for OpenLayers
        setHistoryCoordinates(coords);
        handleCloseHistoryModal();
      } else {
        alert('Nenhum dado encontrado para este período.');
      }
    } catch (err) {
      console.error('[History] Error:', err);
      alert('Erro ao buscar histórico: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyHours]);
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

  // Home detection logic
  const isAtHome = useCallback((loc) => {
    if (!loc) return false;

    // Target: Lat: -23.984520, Lng: -46.307976, Alt: 5.9m
    const targetLat = -23.984520;
    const targetLng = -46.307976;
    const targetAlt = 5.9;

    // Tolerances
    const coordTolerance = 0.0005; // ~50 meters
    const altTolerance = 10.0; // +/- 10 meters (GPS altitude is noisy)

    const latDiff = Math.abs(loc.lat - targetLat);
    const lngDiff = Math.abs(loc.lng - targetLng);

    // Check Altitude if available (optional but requested)
    let altMatch = true;
    if (loc.altitude !== null && loc.altitude !== undefined) {
      const altDiff = Math.abs(loc.altitude - targetAlt);
      altMatch = altDiff <= altTolerance;
    }

    return latDiff <= coordTolerance && lngDiff <= coordTolerance && altMatch;
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

  // Inicializa o mapa apenas uma vez, quando o DOM está pronto
  useLayoutEffect(() => {
    if (mapObject.current || !mapRef.current) return;

    mapObject.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: markerSource.current,
          zIndex: 100 // Ensure target is always on top
        }),
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
  }, []);

  // Helper to add coordinate to track if recording
  const appendLocationToTrack = useCallback((newLocation) => {
    if (isRecording && newLocation && newLocation.lat && newLocation.lng) {
      setTrackCoordinates(prev => {
        // Prevent adding duplicate last point (simple check)
        if (prev.length > 0) {
          const lastPoint = prev[prev.length - 1];
          if (lastPoint[0] === newLocation.lng && lastPoint[1] === newLocation.lat) {
            return prev;
          }
        }
        return [...prev, [newLocation.lng, newLocation.lat]];
      });
    }
  }, [isRecording]);

  // Função para buscar localização do target (baseada no vehicle-tracking)
  const fetchTargetLocation = useCallback(async () => {
    if (isDemoMode) return null; // Skip fetch in demo mode

    try {
      // Primeiro tenta buscar com todas as colunas (incluindo speed e heading)
      let query = supabase
        .from('location_updates')
        .select('lat, lng, accuracy, speed, heading, altitude, altitude_accuracy, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      let { data, error } = await query;

      // Se der erro por colunas não existirem, tenta sem speed e heading
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        console.warn('[Location Update] Speed/heading columns may not exist, trying without them:', error);
        query = supabase
          .from('location_updates')
          .select('lat, lng, accuracy, created_at')
          .order('created_at', { ascending: false })
          .limit(1);

        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Se a tabela não existir (código 42P01), ativa o modo DEMO
        if (error.code === '42P01') {
          console.warn('[Location Update] Table not found. Switching to Demo Mode.');
          setIsDemoMode(true);
          setConnectionStatus('Modo Demonstração (Sem DB)');
          return null;
        }

        console.error('[Location Update] Error fetching target location:', error);
        // Não mostra erro se não houver dados ainda (tabela vazia)
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          setConnectionStatus('Aguardando dados...');
        } else {
          setConnectionStatus(`Erro: ${error.message || 'Erro ao buscar localização'}`);
        }
        return null;
      }

      if (data && data.length > 0) {
        const locationData = data[0];
        console.log('[Location Update] Fetching location:', locationData);
        setLocation(locationData);
        setLastUpdate(new Date(locationData.created_at || new Date()).toLocaleString());
        setConnectionStatus('Conectado');
        appendLocationToTrack(locationData); // Append to track if recording
        return locationData;
      } else {
        // Não há dados ainda, mas não é um erro
        setConnectionStatus('Aguardando dados...');
        return null;
      }
    } catch (error) {
      console.error('[Location Update] Error fetching target location:', error);
      setConnectionStatus(`Erro: ${error.message || 'Erro ao buscar localização'}`);
      return null;
    }
  }, [isDemoMode, appendLocationToTrack]); // setConnectionStatus, setLocation, setLastUpdate, setIsDemoMode are stable

  // Simula movimento no modo demo
  useEffect(() => {
    if (!isDemoMode) {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }

    console.log('[Demo Mode] Starting simulation');
    const centerLat = -22.9035;
    const centerLng = -43.2096;
    let angle = 0;

    const simulateMove = () => {
      // Move em círculos
      const r = 0.005; // radius approx 500m
      const newLat = centerLat + r * Math.cos(angle);
      const newLng = centerLng + r * Math.sin(angle);

      const mockLocation = {
        lat: newLat,
        lng: newLng,
        accuracy: 10,
        speed: 5.0 + Math.random() * 2,
        heading: (angle * 180 / Math.PI) % 360,
        created_at: new Date().toISOString()
      };

      setLocation(mockLocation);
      setLastUpdate(new Date().toLocaleString());
      appendLocationToTrack(mockLocation); // Append to track if recording
      angle += 0.1;
    };

    simulateMove(); // First move immediately
    demoIntervalRef.current = setInterval(simulateMove, 3000);

    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, [isDemoMode, appendLocationToTrack]); // setLocation, setLastUpdate are stable

  // Debounced version of fetchTargetLocation (300ms delay - reduzido para atualizações mais rápidas)
  const debouncedFetchLocation = useMemo(
    () => debounce(fetchTargetLocation, 300),
    [fetchTargetLocation]
  );

  // Ref para armazenar a posição atual da animação
  const currentAnimatedPos = useRef(null);
  const animationFrameRef = useRef(null);

  // Atualiza a posição do marcador e a view quando a localização muda (com animação suave/interpolação)
  useEffect(() => {
    if (!location || !mapObject.current) return;

    const targetCoords = fromLonLat([location.lng, location.lat]);

    // Se é a primeira vez, apenas posiciona sem animar
    if (!currentAnimatedPos.current) {
      currentAnimatedPos.current = targetCoords;

      markerSource.current.clear();
      markerFeature.current = new Feature({ geometry: new Point(targetCoords) });
      markerFeature.current.setStyle(hericIconStyle);
      markerSource.current.addFeature(markerFeature.current);

      // Ajusta o mapa inicial
      const view = mapObject.current.getView();
      view.setCenter(targetCoords);
      view.setZoom(16);

      return;
    }

    // Se já tem posição anterior, inicia a animação de interpolação
    const startCoords = currentAnimatedPos.current;
    const startTime = Date.now();
    const duration = 2000; // 2 segundos para percorrer até o novo ponto (suavidade)

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Função de Easing (suavização) - Ease Out Quart
      const ease = 1 - Math.pow(1 - progress, 4);

      // Interpolação Linear (Lerp) das coordenadas
      const currentX = startCoords[0] + (targetCoords[0] - startCoords[0]) * ease;
      const currentY = startCoords[1] + (targetCoords[1] - startCoords[1]) * ease;
      const currentCoords = [currentX, currentY];

      // Atualiza a referência de posição atual
      currentAnimatedPos.current = currentCoords;

      // Atualiza a geometria do marcador
      if (markerFeature.current) {
        markerFeature.current.setGeometry(new Point(currentCoords));

        // Opcional: Rotacionar o ícone se houver heading
        if (location.heading) {
          const style = markerFeature.current.getStyle();
          // OpenLayers rotation é em radianos e sentido horário. Heading geralmente é graus.
          // Precisamos converter.
          const rotation = (location.heading * Math.PI) / 180;
          style.getImage().setRotation(rotation);
        }
      }

      // Atualiza o centro do mapa para seguir o marcador (suavemente)
      if (autoZoomEnabled.current && mapObject.current) {
        mapObject.current.getView().setCenter(currentCoords);
      }

      // Continua a animação se não acabou
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Cancela animação anterior se houver
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Inicia nova animação
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
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

  // Busca localização inicial, assina updates em tempo real E atualização periódica como fallback
  useEffect(() => {
    // Busca inicial
    fetchTargetLocation();

    // Função para iniciar polling
    const startPolling = () => {
      if (!locationIntervalRef.current) {
        console.log('[Location Update] Starting fallback polling (5s interval)');
        // Fallback polling set to 5s instead of 1s to reduce load when realtime is active or connecting
        locationIntervalRef.current = setInterval(() => {
          fetchTargetLocation();
        }, 5000);
      }
    };

    // Função para parar polling
    const stopPolling = () => {
      if (locationIntervalRef.current) {
        console.log('[Location Update] Stopping fallback polling - Realtime connected');
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };

    // Start polling initially (until connected)
    startPolling();

    // Realtime subscription (prioritário) - escuta INSERT e UPDATE
    const subscription = supabase
      .channel('location_updates')
      .on('postgres_changes', {
        event: '*', // Escuta INSERT, UPDATE e DELETE
        schema: 'public',
        table: 'location_updates'
      }, (payload) => {
        // Atualiza imediatamente quando há mudança no banco
        if (payload.new) {
          console.log('[Location Update] Realtime update received:', payload.new);
          const locationData = {
            ...payload.new,
            lat: payload.new.lat,
            lng: payload.new.lng,
            accuracy: payload.new.accuracy,
            speed: payload.new.speed,
            heading: payload.new.heading,
            altitude: payload.new.altitude,
            altitude_accuracy: payload.new.altitude_accuracy
          };
          setLocation(locationData);
          setLastUpdate(new Date(payload.new.created_at || new Date()).toLocaleString());
          setConnectionStatus('Atualizado em tempo real');
          appendLocationToTrack(locationData); // Append to track if recording
        }
      })
      .subscribe((status) => {
        console.log('[Location Update] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('Conectado (tempo real)');
          stopPolling(); // Stop polling when we have a live connection
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('Erro na conexão - usando fallback');
          startPolling(); // Restart polling on error
        } else if (status === 'CLOSED') {
          setConnectionStatus('Conexão fechada - usando fallback');
          startPolling();
        }
      });

    return () => {
      supabase.removeChannel(subscription);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      debouncedFetchLocation.cancel(); // Cancela qualquer debounce pendente
    };
  }, [fetchTargetLocation, debouncedFetchLocation, appendLocationToTrack]); // Added appendLocationToTrack dependency

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
            <div className="ms-auto d-flex align-items-center">
              <ButtonGroup className="me-3">
                <Button
                  variant={isRecording ? "danger" : "outline-success"}
                  onClick={toggleRecording}
                  size="sm"
                >
                  {isRecording ? "⏹ Parar Gravação" : "⏺ Gravar Trilha"}
                </Button>
                {trackCoordinates.length > 0 && (
                  <Button
                    variant="outline-warning"
                    onClick={clearTrack}
                    size="sm"
                    title="Limpar Trilha"
                  >
                    🗑
                  </Button>
                )}
                <Button
                  variant="outline-info"
                  onClick={handleShowHistoryModal}
                  size="sm"
                  title="Ver Histórico"
                >
                  Histórico
                </Button>
                <Button
                  variant={showCameras ? "outline-primary" : "outline-secondary"}
                  onClick={() => setShowCameras(!showCameras)}
                  size="sm"
                  title={showCameras ? "Ocultar Câmeras" : "Mostrar Câmeras"}
                >
                  {showCameras ? "Ocultar Câmeras" : "Mostrar Câmeras"}
                </Button>
              </ButtonGroup>

              <Badge bg={connectionStatus.includes('Erro') ? 'danger' : 'success'} className="me-2">
                {connectionStatus}
              </Badge>
              {lastUpdate && <span className="text-light me-2 d-none d-sm-inline">Última Atualização: {lastUpdate}</span>}
              <Button variant="outline-light" onClick={handleShowAboutModal} className="me-2" size="sm">Sobre</Button>
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
            {mapObject.current && (
              <>
                {/* Recording Layer - Dashed Purple Line */}
                <TrackLayer
                  map={mapObject.current}
                  trackCoordinates={trackCoordinates}
                  color="rgba(148, 0, 211, 0.7)"
                  width={4}
                  lineDash={[10, 10]}
                />
                {/* History Layer - Dashed Orange Line */}
                <TrackLayer
                  map={mapObject.current}
                  trackCoordinates={historyCoordinates}
                  color="rgba(255, 140, 0, 0.7)"
                  width={3}
                  lineDash={[10, 10]}
                />
                {showCameras && (
                  <CameraLayer map={mapObject.current} cameras={cameras} onCameraClick={handleCameraClick} targetLocation={location} />
                )}
              </>
            )}
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
                <Card.Header className={location && isAtHome(location) ? "bg-success text-white" : ""}>
                  <strong>
                    {location && isAtHome(location) ? "🏠 Heric está em casa!" : "Heric está aqui!"}
                  </strong>
                </Card.Header>
                <Card.Body>
                  {location ? (
                    <div className="location-info-grid">
                      {/* Latitude - sempre visível */}
                      <div className="location-info-item">
                        <span className="info-label">Latitude:</span>
                        <span className="info-value">{typeof location.lat === 'number' ? location.lat.toFixed(6) : location.lat || 'N/A'}</span>
                      </div>
                      {/* Longitude - sempre visível */}
                      <div className="location-info-item">
                        <span className="info-label">Longitude:</span>
                        <span className="info-value">{typeof location.lng === 'number' ? location.lng.toFixed(6) : location.lng || 'N/A'}</span>
                      </div>
                      {/* Precisão - sempre visível (como no transmissor) */}
                      <div className="location-info-item">
                        <span className="info-label">Precisão:</span>
                        <span className="info-value">
                          {location.accuracy && typeof location.accuracy === 'number'
                            ? `${location.accuracy.toFixed(2)}m`
                            : 'N/A'}
                        </span>
                      </div>
                      {/* Velocidade - sempre visível (como no transmissor) */}
                      <div className="location-info-item">
                        <span className="info-label">Velocidade:</span>
                        <span className="info-value speed-value">
                          {location.speed !== null && location.speed !== undefined && typeof location.speed === 'number'
                            ? `${(location.speed * 3.6).toFixed(1)} km/h`
                            : '0.0 km/h'}
                        </span>
                      </div>
                      {/* Direção - opcional */}
                      {location.heading !== null && location.heading !== undefined && typeof location.heading === 'number' && (
                        <div className="location-info-item">
                          <span className="info-label">Direção:</span>
                          <span className="info-value">{location.heading.toFixed(0)}°</span>
                        </div>
                      )}

                      {/* Altitude - opcional */}
                      {location.altitude !== null && location.altitude !== undefined && typeof location.altitude === 'number' && (
                        <div className="location-info-item">
                          <span className="info-label">Altitude:</span>
                          <span className="info-value">
                            {location.altitude.toFixed(1)}m
                            {location.altitude_accuracy ? ` (±${location.altitude_accuracy.toFixed(1)}m)` : ''}
                          </span>
                        </div>
                      )}

                      {/* Track info */}
                      {isRecording && (
                        <div className="location-info-item">
                          <span className="info-label">Pontos na trilha:</span>
                          <span className="info-value">{trackCoordinates.length}</span>
                        </div>
                      )}

                      {/* Última atualização */}
                      {lastUpdate && (
                        <div className="location-info-item">
                          <span className="info-label">Última Atualização:</span>
                          <span className="info-value">{lastUpdate}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="waiting-message">
                      <p>📍 Aguardando dados de localização...</p>
                      <p className="text-muted small">Certifique-se de que o transmissor está ativo e enviando dados.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Container>
      {/* History Modal */}
      <Modal show={showHistoryModal} onHide={handleCloseHistoryModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ver Histórico de Rastreamento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Mostrar dados das últimas:</Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  value={historyHours}
                  onChange={(e) => setHistoryHours(e.target.value)}
                  min="1"
                  max="168"
                />
                <InputGroup.Text>horas</InputGroup.Text>
              </InputGroup>
              <Form.Text className="text-muted">
                Isso buscará os pontos armazenados no banco de dados.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseHistoryModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={fetchHistory} disabled={loadingHistory}>
            {loadingHistory ? 'Buscando...' : 'Carregar Histórico'}
          </Button>
        </Modal.Footer>
      </Modal>

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

