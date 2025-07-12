import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaTimes, FaExpand, FaCog, FaDownload, FaSync, FaMoon, FaYoutube } from 'react-icons/fa';
import YouTubeVideo from '../YouTubeVideo';
import './styles.css';

const CameraCard = ({ 
  camera, 
  onClose, 
  onExpand, 
  onSettings, 
  expanded = false,
  quality = 'high' 
}) => {
  const [state, setState] = useState({
    isLoading: false,
    error: null,
    isNightVision: false,
    currentImageUrl: camera.link,
    isExpanded: expanded,
    showYouTube: false
  });

  const imageRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  const { isLoading, error, isNightVision, currentImageUrl, isExpanded, showYouTube } = state;

  // Função para verificar se é um link do YouTube
  const isYouTubeLink = useCallback((url) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, []);

  // Função para extrair o ID do vídeo do YouTube
  const getYouTubeVideoId = useCallback((url) => {
    if (!url) return null;
    
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

  // Função para atualizar URL com timestamp
  const updateUrlWithTimestamp = useCallback(() => {
    return `${camera.link}&t=${new Date().getTime()}`;
  }, [camera.link]);

  // Função para atualizar estado
  const setStateValue = useCallback((key, value) => {
    setState(prevState => ({ ...prevState, [key]: value }));
  }, []);

  // Handlers
  const handleImageLoad = useCallback(() => {
    setStateValue('isLoading', false);
    setStateValue('error', null);
  }, [setStateValue]);

  const handleImageError = useCallback(() => {
    setStateValue('isLoading', false);
    setStateValue('error', 'Erro ao carregar a imagem');
  }, [setStateValue]);

  const handleRefresh = useCallback(() => {
    setStateValue('isLoading', true);
    setStateValue('currentImageUrl', updateUrlWithTimestamp());
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setStateValue('isLoading', false);
    }, 1000);
  }, [setStateValue, updateUrlWithTimestamp]);

  const toggleNightVision = useCallback(() => {
    setStateValue('isNightVision', !isNightVision);
  }, [isNightVision, setStateValue]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camera-${camera.name}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setStateValue('error', 'Erro ao baixar a imagem');
    }
  }, [currentImageUrl, camera.name, setStateValue]);

  const toggleExpanded = useCallback(() => {
    setStateValue('isExpanded', !isExpanded);
    onExpand();
  }, [isExpanded, setStateValue, onExpand]);

  const toggleYouTube = useCallback(() => {
    setStateValue('showYouTube', !showYouTube);
  }, [showYouTube, setStateValue]);

  const handleYouTubeDownload = useCallback(() => {
    // Abrir o vídeo no YouTube em nova aba
    const videoId = getYouTubeVideoId(camera.youtube_link);
    if (videoId) {
      window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }
  }, [camera.youtube_link, getYouTubeVideoId]);

  const handleYouTubeRefresh = useCallback(() => {
    // Recarregar o iframe do YouTube
    setStateValue('isLoading', true);
    setTimeout(() => {
      setStateValue('isLoading', false);
    }, 1000);
  }, [setStateValue]);

  // Atualização automática da imagem (apenas para imagens, não vídeos)
  useEffect(() => {
    // Se é um vídeo do YouTube, não atualizar automaticamente
    if (isYouTubeLink(camera.link) || camera.youtube_link) {
      return;
    }

    let animationFrameId;
    let lastUpdate = Date.now();

    const updateImage = () => {
      const now = Date.now();
      if (now - lastUpdate >= 1050) {
        setStateValue('currentImageUrl', updateUrlWithTimestamp());
        lastUpdate = now;
      }
      animationFrameId = requestAnimationFrame(updateImage);
    };

    updateImage();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [setStateValue, updateUrlWithTimestamp, camera.link, camera.youtube_link, isYouTubeLink]);

  // Atualizar estado quando expanded prop muda
  useEffect(() => {
    setStateValue('isExpanded', expanded);
  }, [expanded, setStateValue]);

  // Verificar se deve mostrar vídeo do YouTube
  const shouldShowYouTube = camera.youtube_link && (showYouTube || isYouTubeLink(camera.link));

  const cardClass = `camera-card ${isExpanded ? 'expanded' : ''} ${isNightVision ? 'night-vision' : ''}`;

  // Se deve mostrar vídeo do YouTube
  if (shouldShowYouTube) {
    return (
      <YouTubeVideo
        youtubeLink={camera.youtube_link || camera.link}
        title={camera.name}
        onClose={onClose}
        onExpand={toggleExpanded}
        expanded={isExpanded}
        onSettings={onSettings}
        onDownload={handleYouTubeDownload}
        onRefresh={handleYouTubeRefresh}
        onNightVision={toggleNightVision}
        isNightVision={isNightVision}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div className={cardClass}>
      {/* Header do card */}
      <div className="camera-card-header">
        <div className="camera-card-title">
          <h4>{camera.name}</h4>
          <span className="camera-card-status">
            {isLoading ? 'Carregando...' : error ? 'Erro' : 'Online'}
          </span>
        </div>
        
        <div className="camera-card-controls">
          {/* Botão para alternar entre imagem e vídeo do YouTube */}
          {(camera.youtube_link || isYouTubeLink(camera.link)) && (
            <button
              onClick={toggleYouTube}
              className="control-btn youtube-btn"
              title="Alternar para vídeo do YouTube"
            >
              <FaYoutube className="icon" />
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="control-btn"
            title="Atualizar imagem"
            disabled={isLoading}
          >
            <FaSync className={`icon ${isLoading ? 'spinning' : ''}`} />
          </button>
          
          <button
            onClick={toggleNightVision}
            className={`control-btn ${isNightVision ? 'active' : ''}`}
            title={isNightVision ? "Desativar visão noturna" : "Ativar visão noturna"}
          >
            <FaMoon className="icon" />
          </button>
          
          <button
            onClick={handleDownload}
            className="control-btn"
            title="Baixar imagem"
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
            onClick={toggleExpanded}
            className="control-btn"
            title={isExpanded ? "Colapsar" : "Expandir"}
          >
            <FaExpand className="icon" />
          </button>
          
          <button
            onClick={onClose}
            className="control-btn close-btn"
            title="Fechar câmera"
          >
            <FaTimes className="icon" />
          </button>
        </div>
      </div>

      {/* Container da imagem */}
      <div className="camera-card-image-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Carregando...</span>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <div className="error-message">
              <p>{error}</p>
              <button onClick={handleRefresh} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
        
        <img
          ref={imageRef}
          src={currentImageUrl}
          alt={`Câmera ${camera.name}`}
          className="camera-card-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>

      {/* Footer do card */}
      <div className="camera-card-footer">
        <div className="camera-card-info">
          <span className="quality-badge">{quality}</span>
          <span className="update-time">
            Última atualização: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

CameraCard.propTypes = {
  camera: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired,
  expanded: PropTypes.bool,
  quality: PropTypes.string
};

export default CameraCard; 