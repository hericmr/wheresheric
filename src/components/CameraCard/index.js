import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaTimes, FaExpand, FaCog, FaDownload, FaSync, FaMoon } from 'react-icons/fa';
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
    isExpanded: expanded
  });

  const imageRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  const { isLoading, error, isNightVision, currentImageUrl, isExpanded } = state;

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

  // Atualização automática da imagem
  useEffect(() => {
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
  }, [setStateValue, updateUrlWithTimestamp]);

  // Atualizar estado quando expanded prop muda
  useEffect(() => {
    setStateValue('isExpanded', expanded);
  }, [expanded, setStateValue]);

  const cardClass = `camera-card ${isExpanded ? 'expanded' : ''} ${isNightVision ? 'night-vision' : ''}`;

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