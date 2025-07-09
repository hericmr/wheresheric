import React, { memo } from 'react';
import { useImageLoader } from '../hooks/useImageLoader';

const OptimizedCameraImage = memo(({ url, title, className }) => {
    const { imageData, loading, error } = useImageLoader(url);

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-700 w-full h-full flex items-center justify-center">
                <span className="text-gray-400">Carregando...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 w-full h-full flex items-center justify-center">
                <span className="text-red-400">Câmera offline</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <img
                src={imageData}
                alt={title}
                className={`w-full h-full object-cover ${className}`}
                loading="lazy"
                decoding="async"
            />
            {title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                    <p className="text-white text-sm">{title}</p>
                </div>
            )}
        </div>
    );
});

OptimizedCameraImage.displayName = 'OptimizedCameraImage';

export default OptimizedCameraImage; 