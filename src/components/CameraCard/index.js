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
  // Verificar se é câmera do YouTube antes de inicializar o estado
  const hasYouTubeLink = camera.youtube_link || camera.link?.toLowerCase().includes('youtube.com') || camera.link?.toLowerCase().includes('youtu.be');
  
  console.log(`Initializing CameraCard for ${camera.name}:`, {
    hasYouTubeLink,
    youtube_link: camera.youtube_link,
    link: camera.link,
    isYouTubeLink: camera.link?.toLowerCase().includes('youtube.com') || camera.link?.toLowerCase().includes('youtu.be')
  });

  const [state, setState] = useState({
    isLoading: !hasYouTubeLink, // Não carregar se for YouTube
    error: null,
    isNightVision: false,
    currentImageUrl: camera.link,
    isExpanded: expanded,
    showYouTube: hasYouTubeLink
  });

  const imageRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  const { isLoading, error, isNightVision, currentImageUrl, isExpanded, showYouTube } = state;

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

  // Função para atualizar URL com timestamp
  const updateUrlWithTimestamp = useCallback(() => {
    if (!camera.link) return camera.link;
    
    try {
      const url = new URL(camera.link);
      // Usar um parâmetro diferente para evitar conflitos
      url.searchParams.set('_t', new Date().getTime().toString());
      return url.toString();
    } catch (error) {
      // Fallback para URLs que não são válidas
      const separator = camera.link.includes('?') ? '&' : '?';
      return `${camera.link}${separator}_t=${new Date().getTime()}`;
    }
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
    
    console.warn(`Erro ao carregar imagem da câmera ${camera.name}:`, camera.link);
    
    // Tentar recarregar após um erro com delay maior
    setTimeout(() => {
      if (!error) { // Só tentar se não houver erro persistente
        setStateValue('currentImageUrl', updateUrlWithTimestamp());
      }
    }, 3000);
  }, [setStateValue, updateUrlWithTimestamp, camera.name, camera.link, error]);

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

    let retryCount = 0;
    const maxRetries = 3;

    const updateImage = () => {
      if (retryCount >= maxRetries) {
        console.warn(`Máximo de tentativas atingido para câmera: ${camera.name}`);
        return;
      }

      try {
        const newUrl = updateUrlWithTimestamp();
        setStateValue('currentImageUrl', newUrl);
        retryCount = 0; // Reset retry count on successful update
      } catch (error) {
        console.error(`Erro ao atualizar imagem da câmera ${camera.name}:`, error);
        retryCount++;
      }
    };

    const interval = setInterval(updateImage, 5000); // Aumentado para 5 segundos

    return () => {
      clearInterval(interval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [setStateValue, updateUrlWithTimestamp, camera.link, camera.youtube_link, isYouTubeLink, camera.name]);

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