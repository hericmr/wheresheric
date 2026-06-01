import React, { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaSync, FaChevronLeft, FaChevronRight, FaInfoCircle, FaShare } from 'react-icons/fa';
import { useUpdate } from '../../context/UpdateContext';
import "./styles.css";

// URLs de fallback
const LOADING_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23000000' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23ffffff' font-family='system-ui' font-size='18'%3ECarregando...%3C/text%3E%3C/svg%3E";
const ERROR_IMAGE_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23000000' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23ef4444' font-family='system-ui' font-size='18'%3EErro ao carregar imagem%3C/text%3E%3C/svg%3E";

function FullScreenImage({ imageUrl, close, title, next, previous, onCloseSpecificCamera, onReopenAllCameras, activeCameras, currentCameraId, camera }) {
    // Estados
    const [state, setState] = useState({
        currentImageUrl: LOADING_PLACEHOLDER, // Começa com placeholder de loading
        isLoading: true,
        error: null,
        showDetails: false,
        hasLoadedOnce: false, // Flag para primeira carga
        linkCopied: false // Flag para mostrar feedback de link copiado
    });
    
    // Refs
    const imageRef = useRef(null);
    const updateTimeoutRef = useRef(null);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    const { setIsPaused } = useUpdate(); // Get pause control from context
    
    const { currentImageUrl, isLoading, error, showDetails, hasLoadedOnce, linkCopied } = state;
    
    // Pause other camera updates when fullscreen opens, resume when it closes
    useEffect(() => {
        setIsPaused(true); // Pause all other cameras when fullscreen opens
        
        return () => {
            setIsPaused(false); // Resume updates when fullscreen closes
        };
    }, [setIsPaused]);
    
    // Função auxiliar para extrair a URL base (sem query parameters)
    const getBaseUrl = useCallback((url) => {
        if (!url) return url;
        return url.split('?')[0];
    }, []);

    // Funções auxiliares
    const updateUrlWithTimestamp = useCallback(() => {
        const baseUrl = getBaseUrl(imageUrl);
        return `${baseUrl}?t=${new Date().getTime()}`;
    }, [imageUrl, getBaseUrl]);
    
    const setStateValue = useCallback((key, value) => {
        setState(prevState => ({ ...prevState, [key]: value }));
    }, []);

    const toggleDetails = useCallback(() => {
        setStateValue('showDetails', !showDetails);
    }, [showDetails, setStateValue]);

    const handleShare = useCallback(async () => {
        if (!currentCameraId) return;
        
        // Usa a URL atual da página como base
        const currentUrl = window.location.origin + window.location.pathname.split('/camera/')[0] + `/camera/${currentCameraId}`;
        
        // Tenta usar a Web Share API se disponível
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Câmera',
                    text: `Veja esta câmera ao vivo: ${title || 'Câmera'}`,
                    url: currentUrl
                });
            } catch (err) {
                // Se o usuário cancelar ou houver erro, copia para clipboard
                if (err.name !== 'AbortError') {
                    await navigator.clipboard.writeText(currentUrl);
                    setStateValue('linkCopied', true);
                    setTimeout(() => setStateValue('linkCopied', false), 2000);
                }
            }
        } else {
            // Fallback: copia para clipboard
            try {
                await navigator.clipboard.writeText(currentUrl);
                setStateValue('linkCopied', true);
                setTimeout(() => setStateValue('linkCopied', false), 2000);
            } catch (err) {
                console.error('Erro ao copiar link:', err);
            }
        }
    }, [currentCameraId, title, setStateValue]);
    
    // Handlers
    const handleImageLoad = useCallback(() => {
        setStateValue('isLoading', false);
        setStateValue('error', null);
        if (!hasLoadedOnce) {
            setStateValue('hasLoadedOnce', true); // Marca que já carregou
        }
    }, [setStateValue, hasLoadedOnce]);
    
    const handleImageError = useCallback((e) => {
        setStateValue('isLoading', false);
        setStateValue('error', 'Erro ao carregar a imagem');
        // Previne loop infinito de erros
        if (e.target) {
            e.target.onerror = null;
            e.target.src = ERROR_IMAGE_URL;
        }
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
    
    // Efeito para atualizar a imagem periodicamente
    useEffect(() => {
        // Primeira carga: carrega a URL inicial
        setStateValue('hasLoadedOnce', false);
        setStateValue('isLoading', true);
        setStateValue('currentImageUrl', updateUrlWithTimestamp());

        // Configura intervalo de atualização (6 segundos como no projeto Cameras)
        const intervalId = setInterval(() => {
            // Verifica se já carregou antes de atualizar
            setState(prevState => {
                if (prevState.hasLoadedOnce) {
                    const d = new Date();
                    const baseUrl = getBaseUrl(imageUrl);
                    // Apenas atualiza o timestamp
                    return {
                        ...prevState,
                        currentImageUrl: `${baseUrl}?t=${d.getTime()}`
                    };
                }
                return prevState;
            });
        }, 6000);

        return () => {
            clearInterval(intervalId);
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [imageUrl, setStateValue, updateUrlWithTimestamp, getBaseUrl]);
    
    // Componentes UI
    const renderNavigationButtons = () => (
        <>
            {previous && (
                <button
                    onClick={previous}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-6 rounded-full bg-black/90 hover:bg-gray-900 transition-colors duration-200 flex flex-col items-center gap-1 md:gap-2 group z-[10000] side-nav-btn"
                    title="Câmera anterior"
                >
                    <FaChevronLeft className="text-white text-xl md:text-3xl group-hover:text-gray-300" />
                    <span className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 hidden md:block">Anterior</span>
                </button>
            )}

            {next && (
                <button
                    onClick={next}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-6 rounded-full bg-black/90 hover:bg-gray-900 transition-colors duration-200 flex flex-col items-center gap-1 md:gap-2 group z-[10000] side-nav-btn"
                    title="Próxima câmera"
                >
                    <FaChevronRight className="text-white text-xl md:text-3xl group-hover:text-gray-300" />
                    <span className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 hidden md:block">Próxima</span>
                </button>
            )}

            {/* Barra de navegação mobile — só aparece quando há múltiplas câmeras */}
            {(previous || next) && activeCameras && activeCameras.length > 1 && (
                <div className="mobile-camera-nav">
                    <button onClick={previous || (() => {})} title="Anterior" disabled={!previous}>
                        <FaChevronLeft size={20} />
                        <span>Anterior</span>
                    </button>
                    <span className="nav-counter">
                        {(activeCameras.findIndex(c => c.id === currentCameraId) + 1)} / {activeCameras.length}
                    </span>
                    <button onClick={next || (() => {})} title="Próxima" disabled={!next}>
                        <FaChevronRight size={20} />
                        <span>Próxima</span>
                    </button>
                </div>
            )}
        </>
    );
    
    const renderBottomMenu = () => (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center p-1 md:p-2 z-[10000] bottom-bar-safe">
            <div className="bg-black/90 rounded-lg shadow-xl p-1 md:p-2 flex flex-row gap-1 overflow-x-auto max-w-full">
                <ActionButton
                    onClick={handleRefresh}
                    title="Atualizar imagem"
                    icon={<FaSync className={`text-white text-lg md:text-xl group-hover:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />}
                    label="Atualizar"
                    disabled={isLoading}
                />

                {currentCameraId && (
                    <ActionButton
                        onClick={handleShare}
                        title={linkCopied ? "Link copiado!" : "Compartilhar câmera"}
                        icon={<FaShare className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                        label={linkCopied ? "Copiado!" : "Compartilhar"}
                        active={linkCopied}
                    />
                )}

                <ActionButton
                    onClick={toggleDetails}
                    title="Ver informações da câmera"
                    icon={<FaInfoCircle className="text-white text-lg md:text-xl group-hover:text-gray-300" />}
                    label="Info"
                    active={showDetails}
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
                    className="w-full h-full object-contain transition-all duration-300"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading="eager"
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
            
            {/* Camera Details Modal */}
            {showDetails && camera && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[10001] p-4">
                    <div className="bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-white text-xl font-semibold">Informações da Câmera</h2>
                            <button
                                onClick={toggleDetails}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="space-y-3 text-white">
                            {camera.name && (
                                <div>
                                    <span className="text-gray-400">Nome:</span> {camera.name}
                                </div>
                            )}
                            {camera.details?.street && (
                                <div>
                                    <span className="text-gray-400">Rua:</span> {camera.details.street}
                                </div>
                            )}
                            {camera.details?.neighborhood && (
                                <div>
                                    <span className="text-gray-400">Bairro:</span> {camera.details.neighborhood}
                                </div>
                            )}
                            {camera.details?.camera_number && (
                                <div>
                                    <span className="text-gray-400">Número:</span> {camera.details.camera_number}
                                </div>
                            )}
                            {camera.details?.status && (
                                <div>
                                    <span className="text-gray-400">Status:</span> {camera.details.status}
                                </div>
                            )}
                            {typeof camera.lat === 'number' && typeof camera.lng === 'number' && (
                                <div>
                                    <span className="text-gray-400">Coordenadas:</span> {camera.lat.toFixed(6)}, {camera.lng.toFixed(6)}
                                </div>
                            )}
                        </div>
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
    currentCameraId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    camera: PropTypes.object
};

export default FullScreenImage;