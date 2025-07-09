import React, { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaMoon, FaExpand, FaCompress, FaSync, FaDownload, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import "./styles.css";

function FullScreenImage({ imageUrl, close, title, onPreviousCamera, onNextCamera, hasPrevious, hasNext }) {
    // Estados
    const [state, setState] = useState({
        currentImageUrl: imageUrl,
        isNightVision: false,
        isLoading: false,
        error: null,
        isFullscreen: false
    });
    
    // Refs
    const imageRef = useRef(null);
    const updateTimeoutRef = useRef(null);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    
    const { currentImageUrl, isNightVision, isLoading, error, isFullscreen } = state;
    
    // Funções auxiliares
    const updateUrlWithTimestamp = useCallback(() => {
        return `${imageUrl}&t=${new Date().getTime()}`;
    }, [imageUrl]);
    
    const setStateValue = useCallback((key, value) => {
        setState(prevState => ({ ...prevState, [key]: value }));
    }, []);
    
    // Handlers
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            imageRef.current?.parentElement?.requestFullscreen();
            setStateValue('isFullscreen', true);
        } else {
            document.exitFullscreen();
            setStateValue('isFullscreen', false);
        }
    }, [setStateValue]);
    
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
            a.download = `camera-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setStateValue('error', 'Erro ao baixar a imagem');
        }
    }, [currentImageUrl, setStateValue]);
    
    // Funções de toque para navegação em dispositivos móveis
    const handleTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);
    
    const handleTouchMove = useCallback((e) => {
        touchEndX.current = e.touches[0].clientX;
    }, []);
    
    const handleTouchEnd = useCallback(() => {
        if (!touchStartX.current || !touchEndX.current) return;
        
        const difference = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;
        
        if (difference > minSwipeDistance && hasNext) {
            onNextCamera();
        } else if (difference < -minSwipeDistance && hasPrevious) {
            onPreviousCamera();
        }
        
        touchStartX.current = null;
        touchEndX.current = null;
    }, [hasPrevious, hasNext, onNextCamera, onPreviousCamera]);
    
    // Efeitos
    useEffect(() => {
        const handleFullscreenChange = () => {
            setStateValue('isFullscreen', !!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [setStateValue]);
    
    // Efeito para atualizar a imagem periodicamente
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
    }, [imageUrl, setStateValue, updateUrlWithTimestamp]);
    
    // Componentes UI
    const renderNavigationButtons = () => (
        <>
            {hasPrevious && (
                <button
                    onClick={onPreviousCamera}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-6 rounded-full bg-black/90 hover:bg-gray-900 transition-colors duration-200 flex flex-col items-center gap-1 md:gap-2 group z-[10000]"
                    title="Câmera anterior"
                >
                    <FaChevronLeft className="text-white text-xl md:text-3xl group-hover:text-gray-300" />
                    <span className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 hidden md:block">Anterior</span>
                </button>
            )}

            {hasNext && (
                <button
                    onClick={onNextCamera}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-6 rounded-full bg-black/90 hover:bg-gray-900 transition-colors duration-200 flex flex-col items-center gap-1 md:gap-2 group z-[10000]"
                    title="Próxima câmera"
                >
                    <FaChevronRight className="text-white text-xl md:text-3xl group-hover:text-gray-300" />
                    <span className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 hidden md:block">Próxima</span>
                </button>
            )}
        </>
    );
    
    const renderBottomMenu = () => (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center p-1 md:p-2 z-[10000]">
            <div className="bg-black/90 rounded-lg shadow-xl p-1 md:p-2 flex flex-row gap-1 overflow-x-auto max-w-full">
                <ActionButton
                    onClick={handleDownload}
                    title="Baixar imagem"
                    icon={<FaDownload className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label="Baixar"
                />

                <ActionButton
                    onClick={handleRefresh}
                    title="Atualizar imagem"
                    icon={<FaSync className={`text-white text-lg md:text-xl group-hover:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />}
                    label="Atualizar"
                    disabled={isLoading}
                />

                <ActionButton
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    icon={isFullscreen ? 
                        <FaCompress className="text-white text-lg md:text-xl group-hover:text-gray-300" /> : 
                        <FaExpand className="text-white text-lg md:text-xl group-hover:text-gray-300" />
                    }
                    label={isFullscreen ? "Sair" : "Cheia"}
                />

                <ActionButton
                    onClick={toggleNightVision}
                    title={isNightVision ? "Desativar visão noturna" : "Ativar visão noturna"}
                    icon={<FaMoon className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label={isNightVision ? "Noite" : "Dia"}
                    active={isNightVision}
                />

                <ActionButton
                    onClick={close}
                    title="Fechar"
                    icon={<FaTimes className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label="Fechar"
                />
            </div>
        </div>
    );
    
    // Componente botão de ação reutilizável
    const ActionButton = ({ onClick, title, icon, label, disabled, active }) => (
        <button
            onClick={onClick}
            className={`p-1 md:p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors duration-200 flex flex-row items-center gap-1 md:gap-2 group
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${active ? 'bg-gray-800' : ''}`}
            title={title}
            disabled={disabled}
        >
            {icon}
            <span className="text-xs text-gray-500 group-hover:text-gray-400">{label}</span>
        </button>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex justify-center items-center z-[9999]">
            <div 
                className="relative w-full h-full flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {renderNavigationButtons()}

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[10001]">
                        <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[10001]">
                        <div className="text-red-500 text-center p-4">
                            <p>{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="mt-2 px-3 py-1 md:px-4 md:py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    </div>
                )}
                
                <img
                    ref={imageRef}
                    src={currentImageUrl}
                    alt={title || "Imagem em tela cheia"}
                    className={`w-full h-full object-contain transition-all duration-300 ${isNightVision ? "night-vision" : ""}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                />

                {/* Indicador de navegação por toque - apenas em dispositivos móveis */}
                <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none md:hidden">
                    <div className="bg-black/50 text-white text-xs py-1 px-3 rounded-full">
                        Deslize para navegar entre câmeras
                    </div>
                </div>
            </div>

            {/* Título */}
            {title && (
                <div className="absolute top-0 left-0 right-0 p-2 md:p-4 z-[10000] bg-gradient-to-b from-black/80 to-transparent">
                    <div className="container mx-auto">
                        <h1 className="text-white text-lg md:text-xl font-medium text-center">
                            {title}
                        </h1>
                    </div>
                </div>
            )}

            {renderBottomMenu()}
        </div>
    );
}

FullScreenImage.propTypes = {
    imageUrl: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    title: PropTypes.string,
    onPreviousCamera: PropTypes.func,
    onNextCamera: PropTypes.func,
    hasPrevious: PropTypes.bool,
    hasNext: PropTypes.bool
};

export default FullScreenImage;