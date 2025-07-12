import React, { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaMoon, FaExpand, FaCompress, FaSync, FaDownload, FaChevronLeft, FaChevronRight, FaList, FaUndo, FaYoutube } from 'react-icons/fa';
import YouTubeVideo from '../YouTubeVideo';
import "./styles.css";

function FullScreenImage({ imageUrl, close, title, next, previous, onCloseSpecificCamera, onReopenAllCameras, activeCameras, currentCameraId, camera }) {
    // Estados
    const [state, setState] = useState({
        currentImageUrl: imageUrl,
        isNightVision: false,
        isLoading: false,
        error: null,
        isFullscreen: false,
        showCameraMenu: false,
        showYouTube: false
    });
    
    // Refs
    const imageRef = useRef(null);
    const updateTimeoutRef = useRef(null);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    
    const { currentImageUrl, isNightVision, isLoading, error, isFullscreen, showYouTube } = state;
    
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
    
    // Funções auxiliares
    const updateUrlWithTimestamp = useCallback(() => {
        return `${imageUrl}&t=${new Date().getTime()}`;
    }, [imageUrl]);
    
    const setStateValue = useCallback((key, value) => {
        setState(prevState => ({ ...prevState, [key]: value }));
    }, []);

    // Função para alternar entre imagem e vídeo do YouTube
    const toggleYouTube = useCallback(() => {
        setStateValue('showYouTube', !showYouTube);
    }, [showYouTube, setStateValue]);

    // Função para fechar câmera atual
    const handleCloseCurrentCamera = useCallback(() => {
        if (currentCameraId && onCloseSpecificCamera) {
            onCloseSpecificCamera(currentCameraId);
        }
    }, [currentCameraId, onCloseSpecificCamera]);

    // Função para reabrir todas as câmeras
    const handleReopenAll = useCallback(() => {
        if (onReopenAllCameras) {
            onReopenAllCameras();
        }
    }, [onReopenAllCameras]);

    // Função para alternar menu de câmeras
    const toggleCameraMenu = useCallback(() => {
        setStateValue('showCameraMenu', !state.showCameraMenu);
    }, [state.showCameraMenu, setStateValue]);

    const handleYouTubeDownload = useCallback(() => {
        // Abrir o vídeo no YouTube em nova aba
        const videoId = getYouTubeVideoId(camera?.youtube_link || imageUrl);
        if (videoId) {
            window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
        }
    }, [camera?.youtube_link, imageUrl, getYouTubeVideoId]);

    const handleYouTubeRefresh = useCallback(() => {
        // Recarregar o iframe do YouTube
        setStateValue('isLoading', true);
        setTimeout(() => {
            setStateValue('isLoading', false);
        }, 1000);
    }, [setStateValue]);
    
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
        
        if (difference > minSwipeDistance && next) {
            next();
        } else if (difference < -minSwipeDistance && previous) {
            previous();
        }
        
        touchStartX.current = null;
        touchEndX.current = null;
    }, [previous, next]);
    
    // Efeitos
    useEffect(() => {
        const handleFullscreenChange = () => {
            setStateValue('isFullscreen', !!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [setStateValue]);
    
    // Efeito para atualizar a imagem periodicamente (apenas para imagens, não vídeos)
    useEffect(() => {
        // Se é um vídeo do YouTube, não atualizar automaticamente
        if (isYouTubeLink(imageUrl) || camera?.youtube_link) {
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
    }, [imageUrl, setStateValue, updateUrlWithTimestamp, camera?.youtube_link, isYouTubeLink]);

    // Verificar se deve mostrar vídeo do YouTube
    const shouldShowYouTube = (camera?.youtube_link || isYouTubeLink(imageUrl)) && showYouTube;
    
    // Componentes UI
    const renderNavigationButtons = () => (
        <>
            {previous && (
                <button
                    onClick={previous}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-6 rounded-full bg-black/90 hover:bg-gray-900 transition-colors duration-200 flex flex-col items-center gap-1 md:gap-2 group z-[10000]"
                    title="Câmera anterior"
                >
                    <FaChevronLeft className="text-white text-xl md:text-3xl group-hover:text-gray-300" />
                    <span className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 hidden md:block">Anterior</span>
                </button>
            )}

            {next && (
                <button
                    onClick={next}
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
                {/* Botão para alternar entre imagem e vídeo do YouTube */}
                {(camera?.youtube_link || isYouTubeLink(imageUrl)) && (
                    <ActionButton
                        onClick={toggleYouTube}
                        title={showYouTube ? "Voltar para imagem" : "Alternar para vídeo do YouTube"}
                        icon={<FaYoutube className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                        label={showYouTube ? "Imagem" : "Vídeo"}
                        active={showYouTube}
                    />
                )}

                <ActionButton
                    onClick={showYouTube ? handleYouTubeDownload : handleDownload}
                    title={showYouTube ? "Abrir no YouTube" : "Baixar imagem"}
                    icon={<FaDownload className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label={showYouTube ? "YouTube" : "Baixar"}
                />

                <ActionButton
                    onClick={showYouTube ? handleYouTubeRefresh : handleRefresh}
                    title={showYouTube ? "Recarregar vídeo" : "Atualizar imagem"}
                    icon={<FaSync className={`text-white text-lg md:text-xl group-hover:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />}
                    label={showYouTube ? "Recarregar" : "Atualizar"}
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

                {/* Botão para fechar câmera atual - apenas se há múltiplas câmeras */}
                {activeCameras && activeCameras.length > 1 && (
                    <ActionButton
                        onClick={handleCloseCurrentCamera}
                        title="Fechar câmera atual"
                        icon={<FaTimes className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                        label="Fechar"
                    />
                )}

                {/* Botão para menu de câmeras - apenas se há múltiplas câmeras */}
                {activeCameras && activeCameras.length > 1 && (
                    <ActionButton
                        onClick={toggleCameraMenu}
                        title="Menu de câmeras"
                        icon={<FaList className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                        label="Câmeras"
                        active={state.showCameraMenu}
                    />
                )}

                {/* Botão para reabrir todas as câmeras */}
                <ActionButton
                    onClick={handleReopenAll}
                    title="Reabrir todas as câmeras fechadas"
                    icon={<FaUndo className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label="Reabrir"
                />

                <ActionButton
                    onClick={close}
                    title="Fechar todas as câmeras"
                    icon={<FaTimes className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label="Sair"
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
                ${active ? 'bg-red-600' : ''}`}
            title={title}
            disabled={disabled}
        >
            {icon}
            <span className="text-xs text-gray-500 group-hover:text-gray-400">{label}</span>
        </button>
    );

    // Se deve mostrar vídeo do YouTube
    if (shouldShowYouTube) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-95 flex justify-center items-center z-[9999]">
                <div 
                    className="relative w-full h-full flex items-center justify-center"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {renderNavigationButtons()}

                    <YouTubeVideo
                        youtubeLink={camera?.youtube_link || imageUrl}
                        title={title || 'Vídeo ao Vivo'}
                        onClose={close}
                        onExpand={toggleFullscreen}
                        expanded={isFullscreen}
                        onSettings={() => console.log('Settings')}
                        onDownload={handleYouTubeDownload}
                        onRefresh={handleYouTubeRefresh}
                        onNightVision={toggleNightVision}
                        isNightVision={isNightVision}
                        isLoading={isLoading}
                        error={error}
                    />
                </div>

                {renderBottomMenu()}
            </div>
        );
    }
    
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

            {/* Menu de câmeras */}
            {state.showCameraMenu && activeCameras && activeCameras.length > 1 && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg shadow-xl p-3 z-[10001] max-w-sm w-full mx-4">
                    <div className="text-white text-sm font-medium mb-2 text-center">Câmeras Ativas</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activeCameras.map((camera, index) => (
                            <div 
                                key={camera.id} 
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors duration-200 ${
                                    camera.link === imageUrl 
                                        ? 'bg-blue-600/50 border border-blue-400' 
                                        : 'bg-gray-700/50 hover:bg-gray-600/50'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-white text-sm font-medium truncate">
                                        {camera.name}
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                        {index + 1} de {activeCameras.length}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    {camera.link === imageUrl && (
                                        <span className="text-blue-400 text-xs">Atual</span>
                                    )}
                                    <button
                                        onClick={() => onCloseSpecificCamera(camera.id)}
                                        className="p-1 rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
                                        title="Fechar esta câmera"
                                    >
                                        <FaTimes className="text-white text-xs" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-600">
                        <button
                            onClick={handleReopenAll}
                            className="w-full p-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            <FaUndo className="text-xs" />
                            Reabrir Todas as Câmeras
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

FullScreenImage.propTypes = {
    imageUrl: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    title: PropTypes.string,
    next: PropTypes.func,
    previous: PropTypes.func,
    onCloseSpecificCamera: PropTypes.func,
    onReopenAllCameras: PropTypes.func,
    activeCameras: PropTypes.array,
    currentCameraId: PropTypes.number,
    camera: PropTypes.object
};

export default FullScreenImage;