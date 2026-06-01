import React, { useState } from 'react';
import { geocodeAddress } from '../../utils/geocoder';
import { findCandidates, rankWithBuses } from '../../utils/routeFinder';
import './styles.css';

function BusChip({ distMeters }) {
  if (distMeters === null) return <span className="rsp-bus rsp-bus-none">sem ônibus</span>;
  if (distMeters < 300) return <span className="rsp-bus rsp-bus-close">ônibus a {distMeters}m</span>;
  if (distMeters < 1000) return <span className="rsp-bus rsp-bus-mid">ônibus a {distMeters}m</span>;
  return <span className="rsp-bus rsp-bus-far">ônibus a {(distMeters / 1000).toFixed(1)}km</span>;
}

function PinIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
      <path d="M6 0C2.686 0 0 2.686 0 6c0 4.5 6 10 6 10S12 10.5 12 6C12 2.686 9.314 0 6 0zm0 8.5A2.5 2.5 0 1 1 6 3.5a2.5 2.5 0 0 1 0 5z"/>
    </svg>
  );
}

// origin / destination: { text: string, coords: {lat,lng} | null }
const RouteSearchPanel = ({
  linhas = [],
  origin,
  destination,
  onOriginChange,
  onDestChange,
  onRequestMapPick,
  fetchBusesForLinha,
  onSelectRoute,
  onResultsChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const hasInput = origin.text || destination.text;

  const handleSearch = async () => {
    const originText = origin.text.trim();
    const destText = destination.text.trim();
    if (!originText || !destText) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Resolve coords — reuse if already set from map pick
      let originCoords = origin.coords;
      let destCoords = destination.coords;

      if (!originCoords) {
        originCoords = await geocodeAddress(originText);
        if (!originCoords) { setError('Origem não encontrada. Tente um endereço mais completo.'); return; }
        onOriginChange({ text: originText, coords: originCoords });
      }
      if (!destCoords) {
        destCoords = await geocodeAddress(destText);
        if (!destCoords) { setError('Destino não encontrado. Tente um endereço mais completo.'); return; }
        onDestChange({ text: destText, coords: destCoords });
      }

      const candidates = findCandidates(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng, linhas);
      if (!candidates.length) {
        setError('Nenhuma linha faz esse trajeto sem baldeação. Verifique se os endereços estão em Santos.');
        return;
      }

      // Fetch live bus positions for all candidates in parallel
      const busResults = await Promise.all(candidates.map(c => fetchBusesForLinha(c.linhaFull.linha_id)));
      const busesPerLinha = Object.fromEntries(candidates.map((c, i) => [c.linhaFull.linha_id, busResults[i]]));

      const ranked = rankWithBuses(candidates, busesPerLinha);
      setResults(ranked);
      onResultsChange?.(ranked);
    } catch {
      setError('Serviço de busca indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onOriginChange({ text: '', coords: null });
    onDestChange({ text: '', coords: null });
    setResults(null);
    setError(null);
    onResultsChange?.([]);
  };

  return (
    <div className="rsp-root">
      <div className="rsp-inputs">
        <div className="rsp-origin-dot" />
        <input
          className="rsp-input"
          placeholder="De: ex. Rua XV de Novembro"
          value={origin.text}
          onChange={e => onOriginChange({ text: e.target.value, coords: null })}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className={`rsp-pick-btn${origin.coords ? ' rsp-pick-active' : ''}`}
          title="Clicar no mapa"
          onClick={() => onRequestMapPick('origin')}
        ><PinIcon /></button>

        <div className="rsp-dest-dot" />
        <input
          className="rsp-input"
          placeholder="Para: ex. Av. Ana Costa"
          value={destination.text}
          onChange={e => onDestChange({ text: e.target.value, coords: null })}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className={`rsp-pick-btn${destination.coords ? ' rsp-pick-active' : ''}`}
          title="Clicar no mapa"
          onClick={() => onRequestMapPick('destination')}
        ><PinIcon /></button>
      </div>

      <div className="rsp-actions">
        <button
          className="rsp-btn-search"
          onClick={handleSearch}
          disabled={loading || !origin.text.trim() || !destination.text.trim()}
        >
          {loading ? 'Buscando...' : 'Buscar rota'}
        </button>
        {(results || error || hasInput) && (
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

              <BusChip distMeters={r.minBusDist} />

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
