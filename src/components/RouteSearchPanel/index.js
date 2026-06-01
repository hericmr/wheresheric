import React, { useState } from 'react';
import { geocodeAddress } from '../../utils/geocoder';
import { findBestRoutes } from '../../utils/routeFinder';
import './styles.css';

const RouteSearchPanel = ({ linhas = [], onSelectRoute }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    const o = origin.trim();
    const d = destination.trim();
    if (!o || !d) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const [originCoords, destCoords] = await Promise.all([
        geocodeAddress(o),
        geocodeAddress(d),
      ]);

      if (!originCoords) { setError('Origem não encontrada. Tente um endereço mais completo.'); return; }
      if (!destCoords) { setError('Destino não encontrado. Tente um endereço mais completo.'); return; }

      const found = findBestRoutes(
        originCoords.lat, originCoords.lng,
        destCoords.lat, destCoords.lng,
        linhas
      );

      if (!found.length) {
        setError('Nenhuma linha faz esse trajeto sem baldeação. Verifique se os endereços estão em Santos.');
      } else {
        setResults(found);
      }
    } catch {
      setError('Serviço de busca indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setOrigin('');
    setDestination('');
    setResults(null);
    setError(null);
  };

  return (
    <div className="rsp-root">
      <div className="rsp-inputs">
        <div className="rsp-origin-dot" />
        <input
          className="rsp-input"
          placeholder="De: ex. Rua XV de Novembro"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <div className="rsp-dest-dot" />
        <input
          className="rsp-input"
          placeholder="Para: ex. Av. Ana Costa"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
      </div>

      <div className="rsp-actions">
        <button className="rsp-btn-search" onClick={handleSearch} disabled={loading || !origin.trim() || !destination.trim()}>
          {loading ? 'Buscando...' : 'Buscar rota'}
        </button>
        {(results || error || origin || destination) && (
          <button className="rsp-btn-clear" onClick={handleClear}>Limpar</button>
        )}
      </div>

      {error && <div className="rsp-error">{error}</div>}

      {results && (
        <div className="rsp-results">
          {results.map((r, i) => (
            <div key={r.linhaFull.linha_id} className="rsp-card">
              <div className="rsp-card-top">
                <span className="rsp-rank">{i + 1}</span>
                <span className="rsp-line-name">{r.linhaFull.nome}</span>
                <span className="rsp-stops-badge">{r.stopsCount} paradas</span>
              </div>

              <div className="rsp-stop-row">
                <span className="rsp-dot rsp-dot-boarding" />
                <div className="rsp-stop-info">
                  <span className="rsp-stop-name">{r.boardingStop.nome || `Parada ${r.boardingStop.ordem}`}</span>
                  <span className="rsp-walk">{r.walkingOrigin}m a pé</span>
                </div>
              </div>

              <div className="rsp-connector" />

              <div className="rsp-stop-row">
                <span className="rsp-dot rsp-dot-alighting" />
                <div className="rsp-stop-info">
                  <span className="rsp-stop-name">{r.alightingStop.nome || `Parada ${r.alightingStop.ordem}`}</span>
                  <span className="rsp-walk">{r.walkingDestination}m a pé</span>
                </div>
              </div>

              <button
                className="rsp-btn-map"
                onClick={() => onSelectRoute(r.linhaFull, r.boardingStop, r.alightingStop)}
              >
                Ver no mapa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteSearchPanel;
