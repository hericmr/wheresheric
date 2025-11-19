import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaTimes, FaSync } from 'react-icons/fa';
import YouTubeVideo from '../YouTubeVideo';
import { useUpdate } from '../../context/UpdateContext';
import './styles.css';

const CameraCard = ({ 
  camera, 
  onClose, 
  onExpand, 
  onSettings, 
  expanded = false,
  quality = 'high' 
}) => {
  // Verificar se é câmera do YouTube antes de inicializar o estado
  const hasYouTubeLink = camera.youtube_link || camera.link?.toLowerCase().includes('youtube.com') || camera.link?.toLowerCase().includes('youtu.be');
  
  // URLs de fallback
  const LOADING_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%231f2937' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='system-ui' font-size='14'%3ECarregando...%3C/text%3E%3C/svg%3E";
  const ERROR_IMAGE_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%231f2937' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23ef4444' font-family='system-ui' font-size='14'%3EImagem indisponível%3C/text%3E%3C/svg%3E";

  const [state, setState] = useState({
    isLoading: !hasYouTubeLink, // Não carregar se for YouTube
    error: null,
    isNightVision: false,
    currentImageUrl: hasYouTubeLink ? camera.link : LOADING_PLACEHOLDER,
    prevImageUrl: null,
    isTransitioning: false,
    isExpanded: expanded,
    showYouTube: hasYouTubeLink,
    hasLoadedOnce: false,
    retryCount: 0
  });

  const imageRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const cardRef = useRef(null);
  const imageLoadedRef = useRef(false);
  const MAX_RETRIES = 150;
  const { isPaused } = useUpdate(); // Get pause state from context

  const { isLoading, error, isNightVision, currentImageUrl, prevImageUrl, isTransitioning, isExpanded, showYouTube, hasLoadedOnce, retryCount } = state;

  // Função para verificar se é um link do YouTube
  const isYouTubeLink = useCallback((url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
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

  // Função auxiliar para extrair a URL base (sem query parameters)
  const getBaseUrl = useCallback((url) => {
    if (!url) return url;
    return url.split('?')[0];
  }, []);

  // Função para atualizar URL com timestamp
  const updateUrlWithTimestamp = useCallback(() => {
    if (!camera.link) return camera.link;
    const baseUrl = getBaseUrl(camera.link);
    const d = new Date();
    return `${baseUrl}?t=${d.getTime()}`;
  }, [camera.link, getBaseUrl]);

  // Função para atualizar estado
  const setStateValue = useCallback((key, value) => {
    setState(prevState => ({ ...prevState, [key]: value }));
  }, []);

  // Intersection Observer para detectar quando o card está visível
  useEffect(() => {
    // Don't observe if updates are paused (fullscreen is open) or if it's YouTube
    if (isPaused || hasYouTubeLink) {
      return;
    }

    const currentCardRef = cardRef.current;
    if (!currentCardRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isPaused) {
            // Inicia o carregamento da imagem quando visível (apenas uma vez)
            if (!imageLoadedRef.current) {
              imageLoadedRef.current = true;
              // Primeira carga: define a URL da câmera
              setStateValue('currentImageUrl', camera.link);
              setStateValue('prevImageUrl', camera.link);
              setStateValue('hasLoadedOnce', false);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Começa a carregar 50px antes de entrar na viewport
        threshold: 0.01, // Dispara quando pelo menos 1% está visível
      }
    );

    observer.observe(currentCardRef);

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, [camera.link, isPaused, hasYouTubeLink, setStateValue]);

  // Handlers
  const handleImageLoad = useCallback(() => {
    if (!hasLoadedOnce) {
      setStateValue('hasLoadedOnce', true);
    }
    setStateValue('isLoading', false);
    setStateValue('error', null);
  }, [setStateValue, hasLoadedOnce]);

  const handleImageError = useCallback((e) => {
    // Previne loop infinito de erros
    if (e.target) {
      e.target.onerror = null;
      e.target.src = ERROR_IMAGE_URL;
    }
    
    setStateValue('isLoading', false);
    setStateValue('error', 'Erro ao carregar a imagem');
    
    if (retryCount < MAX_RETRIES) {
      // Tenta recarregar a imagem até o limite de tentativas
      setStateValue('retryCount', retryCount + 1);
      const baseUrl = getBaseUrl(camera.link);
      const d = new Date();
      setStateValue('currentImageUrl', `${baseUrl}?retry=${d.getTime()}`);
    } else {
      // Usa a imagem de erro após atingir o limite de tentativas
      setStateValue('currentImageUrl', ERROR_IMAGE_URL);
    }
  }, [setStateValue, retryCount, camera.link, getBaseUrl]);

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

  const toggleExpanded = useCallback(() => {
    setStateValue('isExpanded', !isExpanded);
    onExpand();
  }, [isExpanded, setStateValue, onExpand]);

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
    if (isYouTubeLink(camera.link) || camera.youtube_link || isPaused) {
      return;
    }

    // Não atualiza até a primeira carga completar
    if (!hasLoadedOnce) {
      return;
    }

    const interval = setInterval(() => {
      setStateValue('retryCount', 0);
      setStateValue('prevImageUrl', currentImageUrl);
      setStateValue('isTransitioning', true);
      const baseUrl = getBaseUrl(camera.link);
      const d = new Date();
      const newImageUrl = `${baseUrl}?t=${d.getTime()}`;
      setStateValue('currentImageUrl', newImageUrl);
      
      // Reset transition state after animation completes
      setTimeout(() => {
        setStateValue('isTransitioning', false);
      }, 1000);
    }, 6000); // 6 segundos como no projeto Cameras

    return () => {
      clearInterval(interval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [camera.link, currentImageUrl, isPaused, hasLoadedOnce, isYouTubeLink, camera.youtube_link, setStateValue, getBaseUrl]);

  // Atualizar estado quando expanded prop muda
  useEffect(() => {
    setStateValue('isExpanded', expanded);
  }, [expanded, setStateValue]);

  // Carregamento inicial da imagem
  useEffect(() => {
    if (!isYouTubeLink(camera.link) && !camera.youtube_link) {
      setStateValue('isLoading', true);
      setStateValue('error', null);
    }
  }, [camera.link, camera.youtube_link, isYouTubeLink, setStateValue]);

  // Verificar se deve mostrar vídeo do YouTube
  const shouldShowYouTube = showYouTube && (camera.youtube_link || isYouTubeLink(camera.link));
  
  // Debug logging mais detalhado
  console.log(`Camera ${camera.name} - YouTube Check:`, {
    showYouTube,
    youtube_link: camera.youtube_link,
    camera_link: camera.link,
    isYouTubeLink_result: isYouTubeLink(camera.link),
    shouldShowYouTube,
    hasYouTubeLink: camera.youtube_link || isYouTubeLink(camera.link)
  });

  // Fallback: se tem youtube_link mas não está mostrando, forçar
  const forceShowYouTube = camera.youtube_link && !shouldShowYouTube;
  const finalShouldShowYouTube = shouldShowYouTube || forceShowYouTube;

  if (forceShowYouTube) {
    console.log(`Forcing YouTube display for ${camera.name} due to youtube_link presence`);
  }

  const cardClass = `camera-card ${isExpanded ? 'expanded' : ''} ${isNightVision ? 'night-vision' : ''}`;

  // Se deve mostrar vídeo do YouTube
  if (finalShouldShowYouTube) {
    console.log(`Rendering YouTubeVideo for ${camera.name}:`, {
      youtubeLink: camera.youtube_link || camera.link,
      title: camera.name,
      showYouTube,
      shouldShowYouTube
    });
    
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
    <div ref={cardRef} className={cardClass}>
      {/* Header do card */}
      <div className="camera-card-header">
        <div className="camera-card-title">
          <h4>{camera.name}</h4>
          <span className="camera-card-status">
            {isLoading ? 'Carregando...' : error ? 'Erro' : 'Online'}
          </span>
        </div>
        
        <div className="camera-card-controls">
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
        
        {/* Imagem anterior para crossfade */}
        {prevImageUrl && prevImageUrl !== currentImageUrl && (
          <img
            src={prevImageUrl}
            alt=""
            className={`camera-card-image ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-1000 ${isNightVision ? 'night-vision' : ''}`}
            style={{ zIndex: 1 }}
          />
        )}
        
        {/* Imagem atual */}
        <img
          ref={imageRef}
          src={currentImageUrl}
          alt={`Câmera ${camera.name}`}
          className={`camera-card-image ${
            isTransitioning ? 'opacity-100' : 'opacity-100'
          } transition-opacity duration-1000 ${isNightVision ? 'night-vision' : ''}`}
          style={{ zIndex: 2 }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Footer minimalista - apenas refresh button */}
      <div className="camera-card-footer">
        <button
          onClick={handleRefresh}
          className="control-btn-minimal"
          title="Atualizar imagem"
          disabled={isLoading}
        >
          <FaSync className={`icon ${isLoading ? 'spinning' : ''}`} />
        </button>
      </div>

      {/* Camera Details Section */}
      {camera.details && (
        <div className="camera-card-details">
          <div className="camera-details-header">
            <h5>Detalhes da Câmera</h5>
          </div>
          <div className="camera-details-content">
            {camera.details.camera_number && (
              <div className="detail-item">
                <span className="detail-label">Número:</span>
                <span className="detail-value">{camera.details.camera_number}</span>
              </div>
            )}
            {camera.details.street && (
              <div className="detail-item">
                <span className="detail-label">Rua:</span>
                <span className="detail-value">{camera.details.street}</span>
              </div>
            )}
            {camera.details.intersection && (
              <div className="detail-item">
                <span className="detail-label">Interseção:</span>
                <span className="detail-value">{camera.details.intersection}</span>
              </div>
            )}
            {camera.details.neighborhood && (
              <div className="detail-item">
                <span className="detail-label">Bairro:</span>
                <span className="detail-value">{camera.details.neighborhood}</span>
              </div>
            )}
            {camera.details.camera_type && (
              <div className="detail-item">
                <span className="detail-label">Tipo:</span>
                <span className="detail-value">{camera.details.camera_type}</span>
              </div>
            )}
            {camera.details.status && (
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-${camera.details.status_id === '1' ? 'active' : 'inactive'}`}>
                  {camera.details.status}
                </span>
              </div>
            )}
            {camera.details.organizational_unit && (
              <div className="detail-item">
                <span className="detail-label">Unidade Organizacional:</span>
                <span className="detail-value">{camera.details.organizational_unit}</span>
              </div>
            )}
            {camera.details.installation_date && (
              <div className="detail-item">
                <span className="detail-label">Data de Instalação:</span>
                <span className="detail-value">{camera.details.installation_date}</span>
              </div>
            )}
            {camera.details.original_id && (
              <div className="detail-item">
                <span className="detail-label">ID Original:</span>
                <span className="detail-value">{camera.details.original_id}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Coordenadas:</span>
              <span className="detail-value">
                {typeof camera.lat === 'number' && typeof camera.lng === 'number' 
                  ? `${camera.lat.toFixed(6)}, ${camera.lng.toFixed(6)}`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
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