import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaExpand, FaVolumeUp, FaSync, FaDownload, FaCog, FaTimes } from 'react-icons/fa';
import './styles.css';

const YouTubeVideo = ({ 
  youtubeLink, 
  title, 
  onClose, 
  onExpand, 
  expanded = false,
  onSettings,
  onDownload,
  onRefresh,
  onNightVision,
  isNightVision = false,
  isLoading = false,
  error = null
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extrair o ID do vídeo do link do YouTube
  const getVideoId = useCallback((url) => {
    if (!url) return null;
    
    // Suporta diferentes formatos de URL do YouTube
    const patterns = [
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }, []);

  const videoId = getVideoId(youtubeLink);

  const handleExpand = useCallback(() => {
    onExpand();
  }, [onExpand]);

  if (!videoId) {
    return (
      <div className="youtube-video-error">
        <div className="error-message">
          <p>Link do YouTube inválido</p>
          <p className="error-details">Formato esperado: https://www.youtube.com/embed/VIDEO_ID</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=0&controls=1&rel=0`;

  return (
    <div className={`youtube-video-container ${expanded ? 'expanded' : ''}`}>
      {/* Header do vídeo */}
      <div className="youtube-video-header">
        <div className="youtube-video-title">
          <h4>{title || 'Vídeo ao Vivo'}</h4>
          <span className="youtube-video-status">
            {isLoading ? 'Carregando...' : error ? 'Erro' : 'Ao Vivo'}
          </span>
        </div>
        
        <div className="youtube-video-controls">
          <button
            onClick={onRefresh}
            className="control-btn"
            title="Recarregar vídeo"
            disabled={isLoading}
          >
            <FaSync className={`icon ${isLoading ? 'spinning' : ''}`} />
          </button>
          
          <button
            onClick={onNightVision}
            className={`control-btn ${isNightVision ? 'active' : ''}`}
            title={isNightVision ? "Desativar visão noturna" : "Ativar visão noturna"}
          >
            <FaVolumeUp className="icon" />
          </button>
          
          <button
            onClick={onDownload}
            className="control-btn"
            title="Abrir no YouTube"
          >
            <FaDownload className="icon" />
          </button>
          
          <button
            onClick={onSettings}
            className="control-btn"
            title="Configurações"
          >
            <FaCog className="icon" />
          </button>
          
          <button
            onClick={handleExpand}
            className="control-btn"
            title={expanded ? "Colapsar" : "Expandir"}
          >
            <FaExpand className="icon" />
          </button>
          
          <button
            onClick={onClose}
            className="control-btn close-btn"
            title="Fechar vídeo"
          >
            <FaTimes className="icon" />
          </button>
        </div>
      </div>

      {/* Container do vídeo */}
      <div className="youtube-video-frame-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Carregando vídeo...</span>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <div className="error-message">
              <p>{error}</p>
              <button onClick={onRefresh} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
        
        <iframe
          src={embedUrl}
          title={title || 'Vídeo ao Vivo'}
          className="youtube-video-frame"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsPlaying(false)}
          onError={() => console.error('Erro ao carregar vídeo do YouTube')}
        />
      </div>

      {/* Footer do vídeo */}
      <div className="youtube-video-footer">
        <div className="youtube-video-info">
          <span className="live-badge">AO VIVO</span>
          <span className="update-time">
            Última atualização: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

YouTubeVideo.propTypes = {
  youtubeLink: PropTypes.string.isRequired,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onNightVision: PropTypes.func.isRequired,
  expanded: PropTypes.bool,
  isNightVision: PropTypes.bool,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

export default YouTubeVideo; 