import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import CameraCard from '../CameraCard';
import FullScreenManager from '../FullScreenManager';
import './styles.css';

const CameraGrid = ({ 
  cameras, 
  visible, 
  onCloseCamera, 
  onCloseAll, 
  onReopenAll, 
  position = 'expanded',
  onPositionChange 
}) => {
  const [layout, setLayout] = useState('grid');
  const [animating, setAnimating] = useState(false);

  // Debug logging for cameras
  useEffect(() => {
    console.log('CameraGrid received cameras:', cameras);
    const youtubeCameras = cameras?.filter(camera => camera.youtube_link);
    if (youtubeCameras?.length > 0) {
      console.log('CameraGrid YouTube cameras:', youtubeCameras);
    }
  }, [cameras]);

  // Hook para detectar layout responsivo
  useEffect(() => {
    const handleResize = () => {
      setLayout(window.innerWidth < 768 ? 'vertical' : 'grid');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Função para alternar posição do grid
  const handlePositionChange = useCallback((newPosition) => {
    setAnimating(true);
    onPositionChange(newPosition);
    
    // Aguardar animação terminar
    setTimeout(() => {
      setAnimating(false);
    }, 300);
  }, [onPositionChange]);

  // Função para expandir/colapsar
  const toggleExpanded = useCallback(() => {
    const newPosition = position === 'expanded' ? 'minimized' : 'expanded';
    handlePositionChange(newPosition);
  }, [position, handlePositionChange]);

  // Função para modo tela cheia
  const toggleFullscreen = useCallback(() => {
    const newPosition = position === 'fullscreen' ? 'expanded' : 'fullscreen';
    handlePositionChange(newPosition);
  }, [position, handlePositionChange]);

  if (!visible || cameras.length === 0) {
    return null;
  }

  const gridClass = `camera-grid camera-grid-${layout} camera-grid-${position}`;
  const containerClass = `camera-grid-container ${animating ? 'animating' : ''}`;

  return (
    <>
      <div className={containerClass}>
        {/* Header do Grid */}
        <div className="camera-grid-header">
          <div className="camera-grid-title">
            <h3>Câmeras Ativas ({cameras.length})</h3>
          </div>
          
          <div className="camera-grid-controls">
            <button
              onClick={toggleExpanded}
              className="control-btn"
              title={position === 'expanded' ? 'Minimizar' : 'Expandir'}
            >
              {position === 'expanded' ? '−' : '+'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="control-btn"
              title={position === 'fullscreen' ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {position === 'fullscreen' ? '⤓' : '⤢'}
            </button>
            
            <button
              onClick={onReopenAll}
              className="control-btn reopen-btn"
              title="Reabrir todas as câmeras fechadas"
            >
              ↻
            </button>
            
            <button
              onClick={onCloseAll}
              className="control-btn close-btn"
              title="Fechar todas as câmeras"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid de Câmeras */}
        <div className={gridClass}>
          {cameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onClose={() => onCloseCamera(camera.id)}
              onExpand={() => handlePositionChange('fullscreen')}
              onSettings={() => console.log('Settings for camera:', camera.name)}
              expanded={position === 'fullscreen'}
              quality="high"
            />
          ))}
        </div>

        {/* Indicador de posição */}
        {position === 'minimized' && (
          <div className="camera-grid-minimized-indicator">
            <span>{cameras.length} câmeras ativas</span>
            <button onClick={toggleExpanded} className="expand-btn">
              Expandir
            </button>
          </div>
        )}
      </div>

      {/* FullScreen Manager */}
      {position === 'fullscreen' && (
        <FullScreenManager
          cameras={cameras}
          visible={true}
          onClose={() => handlePositionChange('expanded')}
          onCloseSpecificCamera={onCloseCamera}
          onReopenAllCameras={onReopenAll}
        />
      )}
    </>
  );
};

CameraGrid.propTypes = {
  cameras: PropTypes.array.isRequired,
  visible: PropTypes.bool.isRequired,
  onCloseCamera: PropTypes.func.isRequired,
  onCloseAll: PropTypes.func.isRequired,
  onReopenAll: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['minimized', 'expanded', 'fullscreen']),
  onPositionChange: PropTypes.func.isRequired
};

export default CameraGrid; 