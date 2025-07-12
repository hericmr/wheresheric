import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import FullScreenImage from '../FullScreenImage';
import './styles.css';

const FullScreenManager = ({ 
  cameras, 
  visible, 
  onClose, 
  onCloseSpecificCamera, 
  onReopenAllCameras 
}) => {
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const currentCamera = cameras[currentCameraIndex];

  const handleNext = useCallback(() => {
    setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
  }, [cameras.length]);

  const handlePrevious = useCallback(() => {
    setCurrentCameraIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
  }, [cameras.length]);

  const handleCloseSpecificCamera = useCallback((cameraId) => {
    const cameraIndex = cameras.findIndex(cam => cam.id === cameraId);
    if (cameraIndex !== -1) {
      onCloseSpecificCamera(cameraId);
      
      // Se fechou a câmera atual, ajustar o índice
      if (cameraIndex === currentCameraIndex) {
        if (cameras.length === 1) {
          // Se era a única câmera, fechar tudo
          onClose();
        } else if (currentCameraIndex === cameras.length - 1) {
          // Se era a última, ir para a anterior
          setCurrentCameraIndex(currentCameraIndex - 1);
        }
        // Se não era a última, o índice já está correto
      } else if (cameraIndex < currentCameraIndex) {
        // Se fechou uma câmera antes da atual, ajustar o índice
        setCurrentCameraIndex(currentCameraIndex - 1);
      }
    }
  }, [cameras, currentCameraIndex, onCloseSpecificCamera, onClose]);

  if (!visible || !currentCamera) {
    return null;
  }

  return (
    <FullScreenImage
      imageUrl={currentCamera.link}
      close={onClose}
      title={currentCamera.name}
      next={cameras.length > 1 ? handleNext : null}
      previous={cameras.length > 1 ? handlePrevious : null}
      onCloseSpecificCamera={handleCloseSpecificCamera}
      onReopenAllCameras={onReopenAllCameras}
      activeCameras={cameras}
      currentCameraId={currentCamera.id}
      camera={currentCamera}
    />
  );
};

FullScreenManager.propTypes = {
  cameras: PropTypes.array.isRequired,
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCloseSpecificCamera: PropTypes.func.isRequired,
  onReopenAllCameras: PropTypes.func.isRequired
};

export default FullScreenManager; 