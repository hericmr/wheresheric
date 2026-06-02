import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
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
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { Container, Row, Col, Card, Button, Modal, Navbar, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CameraLayer from '../CameraLayer';
import CameraGrid from '../CameraGrid';
import BusLayer from '../BusLayer';
import StopsLayer from '../StopsLayer';
import AlarmLayer from '../AlarmLayer';
import AlarmPanel from '../AlarmPanel';
import RouteSearchPanel from '../RouteSearchPanel';
import RouteMarkersLayer from '../RouteMarkersLayer';
import { reverseGeocode } from '../../utils/geocoder';
import { useAlarm } from '../../hooks/useAlarm';
import { Bell, Locate } from 'lucide-react';
import './styles.css';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const Viewer = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showCameras, setShowCameras] = useState(false);
  const [showBuses, setShowBuses] = useState(true);
  const [activeBuses, setActiveBuses] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [selectedLinha, setSelectedLinha] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [routeCameras, setRouteCameras] = useState([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [activeCameras, setActiveCameras] = useState([]);
  const [cameraGridVisible, setCameraGridVisible] = useState(false);
  const [cameraGridPosition, setCameraGridPosition] = useState('expanded');
  const [closedCameras, setClosedCameras] = useState(new Set());
  const [autoOpenDisabled, setAutoOpenDisabled] = useState(false);
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  const [alarmMode, setAlarmMode] = useState(false);
  const [pendingAlarmStop, setPendingAlarmStop] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(500);
  const [routeBoardingStop, setRouteBoardingStop] = useState(null);
  const [routeAlightingStop, setRouteAlightingStop] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState({ text: '', coords: null });
  const [routeDest, setRouteDest] = useState({ text: '', coords: null });
  const [routeResults, setRouteResults] = useState([]);
  const [mapPickMode, setMapPickMode] = useState(null);
  const alarm = useAlarm();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const mapRef = useRef();
  const mapObject = useRef(null);
  const userMarkerSource = useRef(new VectorSource());
  const hasAutoZoomed = useRef(false);

  // GPS do dispositivo — só ativo quando o usuário habilita
  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) {
      setUserLocation(null);
      userMarkerSource.current.clear();
      hasAutoZoomed.current = false;
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('[GPS]', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationEnabled]);

  // Marcador azul no mapa + auto-zoom na primeira leitura GPS
  useEffect(() => {
    if (!userLocation) return;
    userMarkerSource.current.clear();
    const coords = fromLonLat([userLocation.lng, userLocation.lat]);
    const feature = new Feature({ geometry: new Point(coords) });
    feature.setStyle(new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({ color: '#4285f4' }),
        stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
      }),
    }));
    userMarkerSource.current.addFeature(feature);
    if (!hasAutoZoomed.current && mapObject.current) {
      hasAutoZoomed.current = true;
      mapObject.current.getView().animate({ center: coords, zoom: 15, duration: 800 });
    }
  }, [userLocation]);

  const centerOnUser = useCallback(() => {
    if (!userLocation || !mapObject.current) return;
    mapObject.current.getView().animate({
      center: fromLonLat([userLocation.lng, userLocation.lat]),
      zoom: 16,
      duration: 600,
    });
  }, [userLocation]);

  const handleCameraClick = useCallback((clickedCameras) => {
    const available = clickedCameras.filter(c => !closedCameras.has(c.id));
    if (available.length > 0) {
      setActiveCameras(available);
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

  const handleCloseCamera = useCallback((cameraId) => {
    setClosedCameras(prev => new Set([...prev, cameraId]));
    setActiveCameras(prev => {
      const next = prev.filter(c => c.id !== cameraId);
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
      mapObject.current.getView().animate({
        center: fromLonLat([(boarding.lng + alighting.lng) / 2, (boarding.lat + alighting.lat) / 2]),
        zoom: 14,
        duration: 800,
      });
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

  useLayoutEffect(() => {
    if (mapObject.current || !mapRef.current) return;
    mapObject.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attributions: '&copy; OpenStreetMap contributors &copy; CARTO',
          }),
        }),
        new VectorLayer({ source: userMarkerSource.current, zIndex: 100 }),
      ],
      view: new View({ center: fromLonLat([-46.3322, -23.9608]), zoom: 13 }),
    });
    setTimeout(() => mapObject.current?.updateSize(), 200);
  }, []);

  useEffect(() => {
    const handleResize = () => setTimeout(() => mapObject.current?.updateSize(), 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setAdminPassword('');
        setAdminError('');
        setShowAdminModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdminSubmit = () => {
    if (adminPassword === 'programação legal') {
      setShowAdminModal(false);
      navigate('/camera-editor');
    } else {
      setAdminError('Senha incorreta.');
    }
  };

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
          const supabaseIds = new Set(data.map(c => String(c.id)));
          const filteredJson = allCameras.filter(c => !supabaseIds.has(String(c.id)));
          const activeSupa = data.filter(c => c.active !== false);
          allCameras.splice(0, allCameras.length, ...activeSupa, ...filteredJson);
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

  // Alarme: dispara quando o ônibus selecionado chega perto da parada destino
  useEffect(() => {
    if (alarm.status !== 'armed') return;
    if (!alarm.destinationStop || !activeBuses.length) return;
    const closest = Math.min(
      ...activeBuses.map(b => haversineMeters(b.lat, b.lng, alarm.destinationStop.lat, alarm.destinationStop.lng))
    );
    if (closest <= alarm.radiusMeters) alarm.trigger();
  }, [activeBuses, alarm]);

  // Câmeras por proximidade (GPS)
  useEffect(() => {
    if (!userLocation || autoOpenDisabled) return;
    const relevant = detectRelevantCameras(userLocation, cameras);
    if (relevant.length > 0) {
      setActiveCameras(relevant);
      setCameraGridVisible(true);
      setCameraGridPosition('fullscreen');
    }
  }, [userLocation, cameras, detectRelevantCameras, autoOpenDisabled]);

  useEffect(() => {
    if (!mapPickMode || !mapObject.current) return;
    const handler = async (e) => {
      const [lng, lat] = toLonLat(e.coordinate);
      const geo = await reverseGeocode(lat, lng).catch(() => null);
      const text = geo?.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (mapPickMode === 'origin') setRouteOrigin({ text, coords: { lat, lng } });
      else setRouteDest({ text, coords: { lat, lng } });
      setMapPickMode(null);
    };
    mapObject.current.on('click', handler);
    return () => mapObject.current?.un('click', handler);
  }, [mapPickMode]);

  const fmtDist = (m) => m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const busDistToStop = alarm.destinationStop && activeBuses.length
    ? Math.min(...activeBuses.map(b => haversineMeters(b.lat, b.lng, alarm.destinationStop.lat, alarm.destinationStop.lng)))
    : null;

  return (
    <div className="viewer-page">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container fluid>
          <Navbar.Brand href="#">Onde está o Busão?</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="ms-auto d-flex align-items-center gap-3">
              <div className="d-flex align-items-center">
                <label className="camera-switch" title={showBuses ? 'Ocultar ônibus' : 'Mostrar ônibus'}>
                  <input type="checkbox" checked={showBuses} onChange={() => setShowBuses(v => !v)} />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white" style={{ fontSize: '0.9rem' }}>Ônibus</span>
              </div>
              <div className="d-flex align-items-center">
                <label className="camera-switch" title={showCameras ? 'Ocultar câmeras' : 'Mostrar câmeras'}>
                  <input type="checkbox" checked={showCameras} onChange={() => setShowCameras(v => !v)} />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white" style={{ fontSize: '0.9rem' }}>Câmeras</span>
              </div>
              <div className="d-flex align-items-center">
                <label className="camera-switch" title={locationEnabled ? 'Desativar minha localização' : 'Mostrar minha localização no mapa'}>
                  <input type="checkbox" checked={locationEnabled} onChange={() => setLocationEnabled(v => !v)} />
                  <span className="slider"></span>
                </label>
                <span className="ms-2 text-white" style={{ fontSize: '0.9rem' }}>Minha loc.</span>
              </div>
              <Button variant="outline-light" size="sm" onClick={() => setShowAboutModal(true)}>Sobre</Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="main-content">
        <Row className="h-100 flex-md-row flex-column-reverse">

          {/* Mapa */}
          <Col xs={12} md={9} className={`map-col order-2 order-md-1${panelOpen ? '' : ' map-col-full'}`} style={{ position: 'relative' }}>

            {/* Botão reabrir painel */}
            {!panelOpen && (
              <Button
                variant="primary"
                className="toggle-panel-btn"
                onClick={() => setPanelOpen(true)}
                aria-label="Abrir painel"
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 1100, borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ☰
              </Button>
            )}

            {/* Botão centralizar na localização — só visível quando ativado */}
            {locationEnabled && (
              <Button
                variant="light"
                onClick={centerOnUser}
                title={userLocation ? 'Centralizar na minha localização' : 'Aguardando GPS…'}
                disabled={!userLocation}
                style={{ position: 'absolute', bottom: 24, right: 16, zIndex: 1100, borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', padding: 0 }}
              >
                <Locate size={20} color={userLocation ? '#4285f4' : '#aaa'} />
              </Button>
            )}

            {/* Banner: seleção de ponto no mapa */}
            {mapPickMode && (
              <div className="alarm-selection-banner">
                <span>Clique no mapa para definir {mapPickMode === 'origin' ? 'a origem' : 'o destino'}</span>
                <button className="alarm-banner-close" onClick={() => setMapPickMode(null)}>✕</button>
              </div>
            )}

            {/* Banner: modo alarme — selecionar parada */}
            {alarmMode && alarm.status === 'idle' && !pendingAlarmStop && (
              <div className="alarm-selection-banner">
                <span>Toque em uma parada para ativar o alarme</span>
                <button className="alarm-banner-close" onClick={() => { setAlarmMode(false); setPendingAlarmStop(null); }}>✕</button>
              </div>
            )}

            {/* Card de confirmação do alarme */}
            {alarmMode && pendingAlarmStop && (
              <div className="alarm-confirm-card">
                <div className="alarm-confirm-header">
                  <div>
                    <div className="alarm-confirm-name">{pendingAlarmStop.nome || `Parada ${pendingAlarmStop.ordem}`}</div>
                    {pendingAlarmStop.ordem && <div className="alarm-confirm-ordem">Parada {pendingAlarmStop.ordem}</div>}
                  </div>
                  <button className="alarm-confirm-close" onClick={() => setPendingAlarmStop(null)}>✕</button>
                </div>
                <div className="alarm-confirm-label">Avisar quando o ônibus estiver a:</div>
                <div className="alarm-radius-selector">
                  {[300, 500, 800].map(r => (
                    <button key={r} className={`alarm-radius-btn${pendingRadius === r ? ' active' : ''}`} onClick={() => setPendingRadius(r)}>
                      {r} m
                    </button>
                  ))}
                </div>
                <button
                  className="alarm-arm-btn"
                  onClick={() => { alarm.arm(pendingAlarmStop, pendingRadius); setAlarmMode(false); setPendingAlarmStop(null); }}
                >
                  <Bell size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Ativar alarme
                </button>
              </div>
            )}

            {/* Chip flutuante: alarme ativo */}
            {alarm.status !== 'idle' && (
              <button
                className={`alarm-map-chip${alarm.status === 'triggered' ? ' alarm-chip-triggered' : alarm.status === 'snoozed' ? ' alarm-chip-snoozed' : ''}`}
                onClick={() => setShowAlarmPanel(true)}
              >
                <Bell size={15} style={{ flexShrink: 0 }} />
                {alarm.status === 'snoozed' ? (
                  <span style={{ fontWeight: 700 }}>Modo soneca</span>
                ) : (
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                    <span style={{ fontWeight: 700 }}>{fmtDist(busDistToStop)}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>ônibus → parada</span>
                  </span>
                )}
              </button>
            )}

            <div ref={mapRef} id="map" className="map-container"></div>

            {mapObject.current && (
              <>
                <BusLayer map={mapObject.current} linha={selectedLinha} visible={showBuses} onBusesUpdate={setActiveBuses} />
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
                <AlarmLayer map={mapObject.current} destinationStop={alarm.destinationStop} radiusMeters={alarm.radiusMeters} status={alarm.status} />
                <RouteMarkersLayer map={mapObject.current} origin={routeOrigin.coords} destination={routeDest.coords} results={routeResults} />
                {(showCameras || followMode) && (
                  <CameraLayer
                    map={mapObject.current}
                    cameras={followMode ? routeCameras : cameras}
                    onCameraClick={handleCameraClick}
                    targetLocation={userLocation}
                  />
                )}
              </>
            )}
          </Col>

          {/* Painel lateral */}
          <Col xs={12} md={3} className={`info-col order-1 order-md-2 ${panelOpen ? 'visible' : 'd-md-none'}`}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Linhas e Rotas</h5>
              <Button
                variant="outline-secondary"
                onClick={() => setPanelOpen(false)}
                aria-label="Fechar painel"
                style={{ borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                ×
              </Button>
            </div>

            {/* Alarme */}
            <Card className="mb-3" style={{ borderColor: alarm.status !== 'idle' ? '#0d6efd' : undefined }}>
              <Card.Body className="p-2 d-flex align-items-center justify-content-between">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Alarme de parada</div>
                  <div style={{ fontSize: '0.78rem', color: '#666' }}>
                    {alarm.status === 'idle'
                      ? 'Avisa quando você chegar perto da parada'
                      : alarm.status === 'snoozed'
                      ? 'Soneca ativa'
                      : `→ ${alarm.destinationStop?.nome || 'parada selecionada'}`}
                  </div>
                </div>
                <label className="camera-switch ms-2" title="Ativar alarme de parada">
                  <input
                    type="checkbox"
                    checked={alarm.status !== 'idle' || alarmMode}
                    onChange={() => {
                      if (alarm.status !== 'idle' || alarmMode) {
                        alarm.cancel(); setAlarmMode(false); setPendingAlarmStop(null);
                      } else {
                        setAlarmMode(true); setPendingAlarmStop(null);
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </Card.Body>
            </Card>

            {/* Linhas de ônibus */}
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center p-2">
                <strong style={{ fontSize: '0.9rem' }}>Linha selecionada</strong>
                {selectedLinha && activeBuses.length > 0 && (
                  <div className="d-flex align-items-center">
                    <label className="camera-switch" title={followMode ? 'Parar de seguir' : 'Seguir câmeras da rota'}>
                      <input type="checkbox" checked={followMode} onChange={() => setFollowMode(f => !f)} />
                      <span className="slider"></span>
                    </label>
                    <span className="ms-1" style={{ fontSize: '0.8rem' }}>Câmeras</span>
                  </div>
                )}
              </Card.Header>
              <Card.Body style={{ padding: '8px' }}>
                {!followMode ? (
                  <>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {linhas.map(l => (
                        <div
                          key={l.linha_id}
                          onClick={() => { setSelectedLinha(l); setActiveBuses([]); setFollowMode(false); }}
                          style={{
                            padding: '8px 10px', marginBottom: '4px', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: selectedLinha?.linha_id === l.linha_id ? 'bold' : 'normal',
                            background: selectedLinha?.linha_id === l.linha_id ? '#1a73e8' : 'transparent',
                            color: selectedLinha?.linha_id === l.linha_id ? 'white' : 'inherit',
                          }}
                        >
                          {l.nome}
                        </div>
                      ))}
                    </div>
                    {selectedLinha && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid #eee', fontSize: '0.82rem' }}>
                        {activeBuses.length === 0
                          ? <div className="waiting-message">Aguardando posições dos ônibus…</div>
                          : activeBuses.map(bus => (
                            <div key={bus.prefixo} className="mb-1">
                              <strong>Prefixo {bus.prefixo}</strong> — {bus.sentido === 1 ? 'Ida' : 'Volta'}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-2" style={{ fontSize: '0.82rem', color: '#555' }}>
                      <strong>{selectedLinha?.nome}</strong> — câmeras ao longo da rota
                    </div>
                    {routeCameras.length === 0
                      ? <div className="waiting-message">Nenhuma câmera encontrada nesta rota.</div>
                      : (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {sortCamerasByBusProximity(routeCameras, activeBuses).map(camera => {
                            const dist = distanceFromBus(camera, activeBuses);
                            return (
                              <div
                                key={camera.id}
                                onClick={() => { setActiveCameras([camera]); setCameraGridVisible(true); setCameraGridPosition('fullscreen'); }}
                                style={{ padding: '8px 10px', marginBottom: '4px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', background: '#f8f9fa', border: '1px solid #e0e0e0' }}
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
                      )
                    }
                  </>
                )}
              </Card.Body>
            </Card>

            {/* Buscar Rota (secundário, colapsável) */}
            <Card className="mt-3">
              <Card.Header
                style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.9rem' }}
                onClick={() => {}}
              >
                <strong>Buscar Rota</strong>
                <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>para lugares desconhecidos</span>
              </Card.Header>
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
                  onResultsChange={setRouteResults}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal Admin */}
      <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Acesso Restrito</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={e => { e.preventDefault(); handleAdminSubmit(); }}>
            <Form.Group>
              <Form.Label>Senha</Form.Label>
              <Form.Control
                type="password"
                autoFocus
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setAdminError(''); }}
                isInvalid={!!adminError}
                placeholder="Digite a senha de acesso"
              />
              <Form.Control.Feedback type="invalid">{adminError}</Form.Control.Feedback>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdminModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleAdminSubmit}>Entrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Sobre */}
      <Modal show={showAboutModal} onHide={() => setShowAboutModal(false)}>
        <Modal.Header closeButton><Modal.Title>Sobre o App</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Acompanhe os ônibus de Santos em tempo real, veja câmeras de segurança e ative o alarme para não perder sua parada.</p>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>Dados de ônibus fornecidos pela prefeitura de Santos. App sem fins comerciais.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAboutModal(false)}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      <AlarmPanel
        show={showAlarmPanel}
        onHide={() => setShowAlarmPanel(false)}
        alarm={alarm}
        busDistanceToStop={busDistToStop}
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
