import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { transformCamerasFromJson } from '../../utils/cameraTransform';
import { getCamerasAlongRoute, sortCamerasByBusProximity, distanceFromBus, haversineMeters } from '../../utils/routeCameras';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Container, Row, Col, Card, Button, Modal, Navbar, Form, InputGroup } from 'react-bootstrap';
import CameraLayer from '../CameraLayer';
import CameraGrid from '../CameraGrid';
import TrackLayer from '../TrackLayer';
import BusLayer from '../BusLayer';
import StopsLayer from '../StopsLayer';
import AlarmLayer from '../AlarmLayer';
import AlarmPanel from '../AlarmPanel';
import RouteSearchPanel from '../RouteSearchPanel';
import { reverseGeocode } from '../../utils/geocoder';
import { useAlarm } from '../../hooks/useAlarm';
import { Bell } from 'lucide-react';
import './styles.css';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const HOME_COORDS = { lat: -23.984520, lng: -46.307976, alt: 5.9 };
const HOME_COORD_TOLERANCE = 0.0005; // ~50 metros
const HOME_ALT_TOLERANCE = 10.0;

const Viewer = () => {
  const [users, setUsers] = useState({});
  const [location, setLocation] = useState(null);
  const [showCameras, setShowCameras] = useState(false);
  const [showBuses, setShowBuses] = useState(true);
  const [activeBuses, setActiveBuses] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [selectedLinha, setSelectedLinha] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [routeCameras, setRouteCameras] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [activeCameras, setActiveCameras] = useState([]);
  const [cameraGridVisible, setCameraGridVisible] = useState(false);
  const [cameraGridPosition, setCameraGridPosition] = useState('expanded');
  const [closedCameras, setClosedCameras] = useState(new Set());
  const [autoOpenDisabled, setAutoOpenDisabled] = useState(false);
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  const [alarmMode, setAlarmMode] = useState(false);         // map selection mode
  const [pendingAlarmStop, setPendingAlarmStop] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(500);
  const [routeBoardingStop, setRouteBoardingStop] = useState(null);
  const [routeAlightingStop, setRouteAlightingStop] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState({ text: '', coords: null });
  const [routeDest, setRouteDest] = useState({ text: '', coords: null });
  const [mapPickMode, setMapPickMode] = useState(null); // 'origin' | 'destination'
  const alarm = useAlarm();

  // Histórico de rastreamento
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyHours, setHistoryHours] = useState('24');
  const [historyCoordinates, setHistoryCoordinates] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const markersRef = useRef({});
  const animatedPosRef = useRef({});
  const animationFrameRefs = useRef({});
  const locationIntervalRef = useRef(null);
  const autoZoomEnabled = useRef(true);

  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleShowAboutModal = () => setShowAboutModal(true);
  const handleCloseHistoryModal = () => setShowHistoryModal(false);

  const fetchHistory = useCallback(async () => {
    if (!historyHours || isNaN(historyHours)) return;

    setLoadingHistory(true);
    setHistoryCoordinates([]);
    try {
      const hours = parseInt(historyHours);
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('location_updates')
        .select('lat, lng, created_at')
        .gte('created_at', startTime)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setHistoryCoordinates(data.map(pt => [pt.lng, pt.lat]));
        handleCloseHistoryModal();
      } else {
        alert('Nenhum dado encontrado para este período.');
      }
    } catch (err) {
      console.error('[History] Erro:', err);
      alert('Erro ao buscar histórico: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyHours]);

  const handleCameraClick = useCallback((clickedCameras) => {
    const availableCameras = clickedCameras.filter(camera => !closedCameras.has(camera.id));
    if (availableCameras.length > 0) {
      setActiveCameras(availableCameras);
      setCameraGridVisible(true);
      setCameraGridPosition('fullscreen');
    }
  }, [closedCameras]);

  const detectRelevantCameras = useCallback((loc, cameraList) => {
    return cameraList.filter(camera => {
      if (closedCameras.has(camera.id)) return false;
      if (!camera.lat || !camera.lng || !loc.lat || !loc.lng) return false;
      return haversineMeters(loc.lat, loc.lng, camera.lat, camera.lng) <= 10;
    });
  }, [closedCameras]);

  // Fix: usa setter funcional para evitar stale closure
  const handleCloseCamera = useCallback((cameraId) => {
    setClosedCameras(prev => new Set([...prev, cameraId]));
    setActiveCameras(prev => {
      const next = prev.filter(cam => cam.id !== cameraId);
      if (next.length === 0) setCameraGridVisible(false);
      return next;
    });
  }, []);

  const handleCloseAllCameras = useCallback(() => {
    setActiveCameras([]);
    setCameraGridVisible(false);
    setClosedCameras(new Set());
    setAutoOpenDisabled(true);
  }, []);

  const handleReopenAllCameras = useCallback(() => {
    setClosedCameras(new Set());
    setAutoOpenDisabled(false);
  }, []);

  const isAtHome = useCallback((loc) => {
    if (!loc) return false;
    const latDiff = Math.abs(loc.lat - HOME_COORDS.lat);
    const lngDiff = Math.abs(loc.lng - HOME_COORDS.lng);
    let altMatch = true;
    if (loc.altitude != null) {
      altMatch = Math.abs(loc.altitude - HOME_COORDS.alt) <= HOME_ALT_TOLERANCE;
    }
    return latDiff <= HOME_COORD_TOLERANCE && lngDiff <= HOME_COORD_TOLERANCE && altMatch;
  }, []);

  const handleGridPositionChange = useCallback((newPosition) => {
    setCameraGridPosition(newPosition);
  }, []);

  const handleSelectRoute = useCallback((linha, boarding, alighting) => {
    setSelectedLinha(linha);
    setActiveBuses([]);
    setFollowMode(false);
    setRouteBoardingStop(boarding);
    setRouteAlightingStop(alighting);
    if (mapObject.current) {
      const center = fromLonLat([
        (boarding.lng + alighting.lng) / 2,
        (boarding.lat + alighting.lat) / 2,
      ]);
      mapObject.current.getView().animate({ center, zoom: 14, duration: 800 });
    }
  }, []);

  const fetchBusesForLinha = useCallback(async (linha_id) => {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/bus-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ linha_id }),
      });
      if (!resp.ok) return [];
      const buses = await resp.json();
      return Array.isArray(buses) ? buses : [];
    } catch { return []; }
  }, []);

  const hericIconStyle = useMemo(() => new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: 'https://hericmr.github.io/me/imagens/heric.png',
      scale: 0.1,
    }),
  }), []);

  const getIconForUser = useCallback(() => hericIconStyle, [hericIconStyle]);

  useLayoutEffect(() => {
    if (mapObject.current || !mapRef.current) return;

    mapObject.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          })
        }),
        new VectorLayer({
          source: markerSource.current,
          zIndex: 100
        }),
      ],
      view: new View({
        center: fromLonLat([-46.3322, -23.9608]),
        zoom: 13,
      }),
    });
    setTimeout(() => mapObject.current?.updateSize(), 200);
  }, []);

  const fetchUserLocation = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('location_updates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn(`[Location] Erro ao buscar ${userId}:`, error.message);
        return null;
      }

      const record = data?.[0];
      if (!record || record.lat == null || record.lng == null) return null;

      setUsers(prev => ({ ...prev, [userId]: record }));
      if (userId === 'heric') {
        setLocation(record);
        setLastUpdate(new Date(record.created_at || new Date()).toLocaleString());
      }
      return record;
    } catch (err) {
      console.error(`[Location] Exceção ao buscar ${userId}:`, err);
      return null;
    }
  }, []);

  const fetchAllLocations = useCallback(async () => {
    await fetchUserLocation('heric');
  }, [fetchUserLocation]);

  useEffect(() => {
    if (!mapObject.current) return;

    Object.entries(users).forEach(([userId, userLoc]) => {
      if (!userLoc) return;

      const targetCoords = fromLonLat([userLoc.lng, userLoc.lat]);

      if (!markersRef.current[userId]) {
        const feature = new Feature({ geometry: new Point(targetCoords) });
        feature.setStyle(getIconForUser(userId));
        markerSource.current.addFeature(feature);
        markersRef.current[userId] = feature;
        animatedPosRef.current[userId] = targetCoords;

        if (userId === 'heric' && autoZoomEnabled.current) {
          mapObject.current.getView().setCenter(targetCoords);
        }
        return;
      }

      const startCoords = animatedPosRef.current[userId] || targetCoords;
      const startTime = Date.now();
      const duration = 2000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);

        const currentCoords = [
          startCoords[0] + (targetCoords[0] - startCoords[0]) * ease,
          startCoords[1] + (targetCoords[1] - startCoords[1]) * ease,
        ];
        animatedPosRef.current[userId] = currentCoords;

        const feature = markersRef.current[userId];
        if (feature) {
          feature.setGeometry(new Point(currentCoords));
          if (userLoc.heading) {
            feature.getStyle().getImage().setRotation((userLoc.heading * Math.PI) / 180);
          }
        }

        if (autoZoomEnabled.current && mapObject.current) {
          const extent = markerSource.current.getExtent();
          if (extent && !extent.includes(Infinity)) {
            mapObject.current.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 17, duration: 1000 });
          } else if (userId === 'heric') {
            mapObject.current.getView().setCenter(currentCoords);
          }
        }

        if (progress < 1) {
          animationFrameRefs.current[userId] = requestAnimationFrame(animate);
        }
      };

      if (animationFrameRefs.current[userId]) {
        cancelAnimationFrame(animationFrameRefs.current[userId]);
      }
      animationFrameRefs.current[userId] = requestAnimationFrame(animate);
    });
  }, [users, getIconForUser]);

  useEffect(() => {
    const handleResize = () => setTimeout(() => mapObject.current?.updateSize(), 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAllLocations();

    const startPolling = () => {
      if (!locationIntervalRef.current) {
        locationIntervalRef.current = setInterval(fetchAllLocations, 5000);
      }
    };

    const stopPolling = () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };

    startPolling();

    const subscription = supabase
      .channel('location_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'location_updates',
      }, (payload) => {
        if (!payload.new) return;
        const locationData = {
          ...payload.new,
          lat: Number(payload.new.lat),
          lng: Number(payload.new.lng),
          accuracy: Number(payload.new.accuracy),
          speed: Number(payload.new.speed),
          heading: Number(payload.new.heading),
          altitude: Number(payload.new.altitude),
          altitude_accuracy: Number(payload.new.altitude_accuracy),
        };

        const userId = locationData.user_id || 'heric';
        setUsers(prev => ({ ...prev, [userId]: locationData }));
        if (userId === 'heric') {
          setLocation(locationData);
          setLastUpdate(new Date(locationData.created_at || new Date()).toLocaleString());
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') stopPolling();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
      });

    return () => {
      supabase.removeChannel(subscription);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [fetchAllLocations]);

  useEffect(() => {
    const fetchCameras = async () => {
      const allCameras = [];

      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/cameras_detailed.json`);
        if (response.ok) {
          const json = await response.json();
          allCameras.push(...transformCamerasFromJson(json));
        }
      } catch (err) {
        console.error('[Cameras] Erro ao carregar cameras_detailed.json:', err);
      }

      try {
        const { data, error } = await supabase.from('cameras').select('*');
        if (!error && data?.length > 0) {
          const existingIds = new Set(allCameras.map(c => c.id));
          allCameras.push(...data.filter(c => !existingIds.has(c.id)));
        }
      } catch (err) {
        console.error('[Cameras] Erro ao carregar do Supabase:', err);
      }

      setCameras(allCameras);
    };

    fetchCameras();
  }, []);

  useEffect(() => {
    if (!followMode || !selectedLinha) { setRouteCameras([]); return; }
    setRouteCameras(getCamerasAlongRoute(cameras, selectedLinha, 50));
  }, [followMode, selectedLinha, cameras]);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/todas_as_linhas.json`)
      .then(r => r.json())
      .then(data => {
        setLinhas(data.linhas || []);
        if (data.linhas?.length > 0) setSelectedLinha(data.linhas[0]);
      })
      .catch(err => console.error('[Linhas] Erro ao carregar:', err));
  }, []);

  // Verifica se algum ônibus ativo entrou no raio da parada destino.
  // Executa a cada atualização de posição dos ônibus (polling 15s).
  useEffect(() => {
    if (alarm.status !== 'armed') return;
    if (!alarm.destinationStop || !activeBuses.length) return;
    const closest = Math.min(
      ...activeBuses.map(b => haversineMeters(b.lat, b.lng, alarm.destinationStop.lat, alarm.destinationStop.lng))
    );
    if (closest <= alarm.radiusMeters) alarm.trigger();
  }, [activeBuses, alarm]);

  useEffect(() => {
    if (!mapPickMode || !mapObject.current) return;
    const handler = async (e) => {
      const [lng, lat] = toLonLat(e.coordinate);
      const geo = await reverseGeocode(lat, lng).catch(() => null);
      const text = geo?.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (mapPickMode === 'origin') {
        setRouteOrigin({ text, coords: { lat, lng } });
      } else {
        setRouteDest({ text, coords: { lat, lng } });
      }
      setMapPickMode(null);
    };
    mapObject.current.on('click', handler);
    return () => mapObject.current?.un('click', handler);
  }, [mapPickMode]);

  useEffect(() => {
    if (!location || autoOpenDisabled) return;
    const relevantCameras = detectRelevantCameras(location, cameras);
    if (relevantCameras.length > 0) {
      setActiveCameras(relevantCameras);
      setCameraGridVisible(true);
      setCameraGridPosition('fullscreen');
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
              {/* Toggle Ônibus */}
              <div className="d-flex align-items-center me-3">
                <label className="camera-switch" title={showBuses ? 'Ocultar Ônibus' : 'Mostrar Ônibus'}>
                  <input type="checkbox" checked={showBuses} onChange={() => setShowBuses(!showBuses)} />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white d-none d-sm-inline" style={{ fontSize: '0.9rem' }}>Ônibus</span>
              </div>

              {/* Toggle Câmeras */}
              <div className="d-flex align-items-center me-3">
                <label className="camera-switch" title={showCameras ? 'Ocultar Câmeras' : 'Mostrar Câmeras'}>
                  <input type="checkbox" checked={showCameras} onChange={() => setShowCameras(!showCameras)} />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white d-none d-sm-inline" style={{ fontSize: '0.9rem' }}>Câmeras</span>
              </div>

              {/* Toggle Modo Soneca */}
              <div className="d-flex align-items-center me-3">
                <label className="camera-switch" title={alarm.status !== 'idle' || alarmMode ? 'Desativar Modo Soneca' : 'Ativar Modo Soneca'}>
                  <input
                    type="checkbox"
                    checked={alarm.status !== 'idle' || alarmMode}
                    onChange={() => {
                      const ativo = alarm.status !== 'idle' || alarmMode;
                      if (ativo) {
                        alarm.cancel();
                        setAlarmMode(false);
                        setPendingAlarmStop(null);
                      } else {
                        setAlarmMode(true);
                        setPendingAlarmStop(null);
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white d-none d-sm-inline" style={{ fontSize: '0.9rem' }}>Soneca</span>
              </div>

              {lastUpdate && (
                <span className="text-light me-2 d-none d-sm-inline">Última atualização: {lastUpdate}</span>
              )}
              <Button variant="outline-light" onClick={handleShowAboutModal} size="sm">Sobre</Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="main-content">
        <Row className="h-100 flex-md-row flex-column-reverse">
          <Col xs={12} md={9} className={`map-col order-2 order-md-1${panelOpen ? '' : ' map-col-full'}`} style={{ position: 'relative' }}>
            {!panelOpen && (
              <Button
                variant="primary"
                className="toggle-panel-btn d-md-none"
                onClick={() => setPanelOpen(true)}
                aria-label="Abrir painel"
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 1100, borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ℹ️
              </Button>
            )}
            {/* Banner: map pick mode for route search */}
            {mapPickMode && (
              <div className="alarm-selection-banner">
                <span>Clique no mapa para definir {mapPickMode === 'origin' ? 'a origem' : 'o destino'}</span>
                <button className="alarm-banner-close" onClick={() => setMapPickMode(null)}>✕</button>
              </div>
            )}

            {/* Banner: map selection mode */}
            {alarmMode && alarm.status === 'idle' && !pendingAlarmStop && (
              <div className="alarm-selection-banner">
                <span>Modo Soneca — toque em uma parada de destino</span>
                <button className="alarm-banner-close" onClick={() => { setAlarmMode(false); setPendingAlarmStop(null); }}>✕</button>
              </div>
            )}

            {/* Confirmation card: shown after tapping a stop */}
            {alarmMode && pendingAlarmStop && (
              <div className="alarm-confirm-card">
                <div className="alarm-confirm-header">
                  <div>
                    <div className="alarm-confirm-name">
                      {pendingAlarmStop.nome || `Parada ${pendingAlarmStop.ordem}`}
                    </div>
                    {pendingAlarmStop.ordem && (
                      <div className="alarm-confirm-ordem">Parada {pendingAlarmStop.ordem}</div>
                    )}
                  </div>
                  <button className="alarm-confirm-close" onClick={() => setPendingAlarmStop(null)}>✕</button>
                </div>

                <div className="alarm-confirm-label">Distância para disparar o alarme:</div>
                <div className="alarm-radius-selector">
                  {[300, 500, 800].map(r => (
                    <button
                      key={r}
                      className={`alarm-radius-btn${pendingRadius === r ? ' active' : ''}`}
                      onClick={() => setPendingRadius(r)}
                    >
                      {r} m
                    </button>
                  ))}
                </div>

                <button
                  className="alarm-arm-btn"
                  onClick={() => {
                    alarm.arm(pendingAlarmStop, pendingRadius);
                    setAlarmMode(false);
                    setPendingAlarmStop(null);
                  }}
                >
                  <Bell size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Ativar alarme
                </button>
              </div>
            )}

            {/* Floating chip: visible when alarm is active */}
            {alarm.status !== 'idle' && (() => {
              const dest = alarm.destinationStop;
              const busDist = dest && activeBuses.length
                ? Math.min(...activeBuses.map(b => haversineMeters(b.lat, b.lng, dest.lat, dest.lng)))
                : null;
              const fmtDist = (m) => m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
              return (
                <button
                  className={`alarm-map-chip${alarm.status === 'triggered' ? ' alarm-chip-triggered' : alarm.status === 'snoozed' ? ' alarm-chip-snoozed' : ''}`}
                  onClick={() => setShowAlarmPanel(true)}
                >
                  <Bell size={15} style={{ flexShrink: 0 }} />
                  {alarm.status === 'snoozed' ? (
                    <span style={{ fontWeight: 700 }}>Modo soneca</span>
                  ) : (
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                      <span style={{ fontWeight: 700 }}>{fmtDist(busDist)}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>ônibus → parada</span>
                    </span>
                  )}
                </button>
              );
            })()}
            <div ref={mapRef} id="map" className="map-container"></div>
            {mapObject.current && (
              <>
                {/* Trilha de histórico — linha laranja */}
                <TrackLayer
                  map={mapObject.current}
                  trackCoordinates={historyCoordinates}
                  color="rgba(255, 140, 0, 0.7)"
                  width={3}
                  lineDash={[10, 10]}
                />
                <BusLayer
                  map={mapObject.current}
                  linha={selectedLinha}
                  visible={showBuses}
                  onBusesUpdate={setActiveBuses}
                />
                <StopsLayer
                  map={mapObject.current}
                  stops={selectedLinha?.paradas || []}
                  buses={activeBuses}
                  visible={showBuses}
                  alarmMode={alarmMode && alarm.status === 'idle'}
                  destinationStop={alarm.destinationStop}
                  onStopSelect={(stop) => setPendingAlarmStop(stop)}
                  boardingStop={routeBoardingStop}
                  alightingStop={routeAlightingStop}
                />
                <AlarmLayer
                  map={mapObject.current}
                  destinationStop={alarm.destinationStop}
                  radiusMeters={alarm.radiusMeters}
                  status={alarm.status}
                />
                {(showCameras || followMode) && (
                  <CameraLayer
                    map={mapObject.current}
                    cameras={followMode ? routeCameras : cameras}
                    onCameraClick={handleCameraClick}
                    targetLocation={location}
                  />
                )}
              </>
            )}
          </Col>

          <Col xs={12} md={3} className={`info-col order-1 order-md-2 ${panelOpen ? 'visible' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Detalhes</h5>
              <Button
                variant="outline-secondary"
                className="toggle-panel-btn"
                onClick={() => setPanelOpen(false)}
                aria-label="Fechar painel"
                style={{ borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                ×
              </Button>
            </div>

            <Card className="mt-3">
              <Card.Header><strong>Buscar Rota</strong></Card.Header>
              <Card.Body style={{ padding: '10px' }}>
                <RouteSearchPanel
                  linhas={linhas}
                  origin={routeOrigin}
                  destination={routeDest}
                  onOriginChange={setRouteOrigin}
                  onDestChange={setRouteDest}
                  onRequestMapPick={setMapPickMode}
                  fetchBusesForLinha={fetchBusesForLinha}
                  onSelectRoute={handleSelectRoute}
                />
              </Card.Body>
            </Card>

            {users.heric && (
              <Card className="mt-3">
                <Card.Header className={isAtHome(users.heric) ? 'bg-success text-white' : ''}>
                  <div className="d-flex align-items-center">
                    <img
                      src="https://hericmr.github.io/me/imagens/heric.png"
                      alt="heric"
                      style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }}
                    />
                    <strong>
                      Heric{isAtHome(users.heric) ? ' está em casa!' : ' está aqui!'}
                    </strong>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="location-info-grid">
                    <div className="location-info-item">
                      <span className="info-label">Latitude:</span>
                      <span className="info-value">{users.heric.lat?.toFixed(6) || 'N/A'}</span>
                    </div>
                    <div className="location-info-item">
                      <span className="info-label">Longitude:</span>
                      <span className="info-value">{users.heric.lng?.toFixed(6) || 'N/A'}</span>
                    </div>
                    <div className="location-info-item">
                      <span className="info-label">Velocidade:</span>
                      <span className="info-value">
                        {typeof users.heric.speed === 'number' ? `${(users.heric.speed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
                      </span>
                    </div>
                    <div className="location-info-item">
                      <span className="info-label">Última atualização:</span>
                      <span className="info-value">{new Date(users.heric.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {showBuses && (
              <Card className="mt-3">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <strong>Linhas de Ônibus</strong>
                  {selectedLinha && activeBuses.length > 0 && (
                    <div className="d-flex align-items-center">
                      <label className="camera-switch" title={followMode ? 'Parar de seguir' : 'Seguir ônibus'}>
                        <input type="checkbox" checked={followMode} onChange={() => setFollowMode(f => !f)} />
                        <span className="slider"></span>
                      </label>
                      <span className="ms-2" style={{ fontSize: '0.85rem' }}>Seguir</span>
                    </div>
                  )}
                </Card.Header>
                <Card.Body style={{ padding: '8px' }}>
                  {!followMode ? (
                    <>
                      <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                        {linhas.map(l => (
                          <div
                            key={l.linha_id}
                            onClick={() => { setSelectedLinha(l); setActiveBuses([]); setFollowMode(false); }}
                            style={{
                              padding: '8px 10px',
                              marginBottom: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: selectedLinha?.linha_id === l.linha_id ? 'bold' : 'normal',
                              background: selectedLinha?.linha_id === l.linha_id ? '#1a73e8' : 'transparent',
                              color: selectedLinha?.linha_id === l.linha_id ? 'white' : 'inherit',
                              transition: 'background 0.15s',
                            }}
                          >
                            {l.nome}
                          </div>
                        ))}
                      </div>
                      {selectedLinha && (
                        <div className="mt-2" style={{ borderTop: '1px solid #eee', paddingTop: '8px', fontSize: '0.82rem' }}>
                          {activeBuses.length === 0 ? (
                            <div className="waiting-message">Aguardando posições...</div>
                          ) : (
                            activeBuses.map(bus => (
                              <div key={bus.prefixo} className="mb-1">
                                <strong>Prefixo {bus.prefixo}</strong> — {bus.sentido === 1 ? 'Ida' : 'Volta'}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-2" style={{ fontSize: '0.82rem', color: '#555' }}>
                        <strong>{selectedLinha?.nome}</strong> — câmeras ao longo da rota ordenadas por proximidade ao ônibus
                      </div>
                      {routeCameras.length === 0 ? (
                        <div className="waiting-message">Nenhuma câmera encontrada ao longo desta rota.</div>
                      ) : (
                        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                          {sortCamerasByBusProximity(routeCameras, activeBuses).map(camera => {
                            const dist = distanceFromBus(camera, activeBuses);
                            return (
                              <div
                                key={camera.id}
                                onClick={() => {
                                  setActiveCameras([camera]);
                                  setCameraGridVisible(true);
                                  setCameraGridPosition('fullscreen');
                                }}
                                style={{
                                  padding: '8px 10px',
                                  marginBottom: '4px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
                                  background: '#f8f9fa',
                                  border: '1px solid #e0e0e0',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
                              >
                                <div style={{ fontWeight: 'bold' }}>{camera.name}</div>
                                {dist != null && (
                                  <div style={{ color: '#1a73e8', fontSize: '0.75rem' }}>
                                    {dist < 1000 ? `${Math.round(dist)}m do ônibus` : `${(dist / 1000).toFixed(1)}km do ônibus`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>

      {/* Modal de Histórico */}
      <Modal show={showHistoryModal} onHide={handleCloseHistoryModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Histórico de Rastreamento</Modal.Title>
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
                Busca os pontos armazenados no banco de dados.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseHistoryModal}>Cancelar</Button>
          <Button variant="primary" onClick={fetchHistory} disabled={loadingHistory}>
            {loadingHistory ? 'Buscando...' : 'Carregar Histórico'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Sobre */}
      <Modal show={showAboutModal} onHide={handleCloseAboutModal}>
        <Modal.Header closeButton>
          <Modal.Title>Sobre o Projeto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Site de exploração e integração de algumas APIs da cidade de Santos. O conteúdo é feito para fins didáticos — esse app não é comercial.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAboutModal}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      <AlarmPanel
        show={showAlarmPanel}
        onHide={() => setShowAlarmPanel(false)}
        alarm={alarm}
        busDistanceToStop={
          alarm.destinationStop && activeBuses.length
            ? Math.min(...activeBuses.map(b => haversineMeters(b.lat, b.lng, alarm.destinationStop.lat, alarm.destinationStop.lng)))
            : null
        }
      />

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
