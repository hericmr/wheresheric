import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Bell, BellOff, PauseCircle } from 'lucide-react';
import './styles.css';

function formatDistance(meters) {
  if (meters === null || meters === undefined) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function progressPercent(dist, radius) {
  if (dist === null) return 0;
  const far = Math.max(dist, radius) * 3;
  return Math.max(0, Math.min(100, ((far - dist) / far) * 100));
}

// Shown only when alarm is armed / triggered / snoozed.
// Stop selection happens on the map (see StopsLayer + Viewer alarm flow).
export default function AlarmPanel({ show, onHide, alarm, busDistanceToStop }) {
  const { status, destinationStop, radiusMeters, cancel, snooze } = alarm;

  const handleCancel = () => { cancel(); onHide(); };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'triggered'
            ? <><BellOff size={18} color="#d93025" /> Desembarque agora!</>
            : status === 'snoozed'
            ? <><PauseCircle size={18} /> Modo Soneca — pausado</>
            : <><Bell size={18} color="#1a73e8" /> Modo Soneca</>}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '16px' }}>
        {destinationStop && (
          <div className={`alarm-status-card${status === 'triggered' ? ' alarm-triggered' : ''}`}>
            <div className="alarm-stop-name">
              {destinationStop.nome || `Parada ${destinationStop.ordem}`}
            </div>
            <div className="alarm-distance">
              {formatDistance(busDistanceToStop)}
            </div>
            <div className="alarm-radius-label">
              Dispara quando o ônibus entrar no raio de {formatDistance(radiusMeters)}
            </div>
            {status !== 'triggered' && (
              <div className="alarm-progress-bar">
                <div
                  className="alarm-progress-fill"
                  style={{ width: `${progressPercent(busDistanceToStop, radiusMeters)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {status === 'triggered' && (
          <>
            <Button variant="secondary" onClick={snooze}>Modo soneca</Button>
            <Button variant="danger" onClick={handleCancel}>Cancelar alarme</Button>
          </>
        )}
        {(status === 'armed' || status === 'snoozed') && (
          <Button variant="danger" onClick={handleCancel}>Cancelar alarme</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
