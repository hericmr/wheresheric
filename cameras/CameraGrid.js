import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { CameraCard } from "./";
import cameras from "../assets/cameras.json";
import { useUpdate } from "../context/UpdateContext"; // Importa o contexto de pausa

// Memoize the CameraCard component to prevent unnecessary re-renders
const MemoizedCameraCard = React.memo(CameraCard);

function CameraGrid({ onImageClick, updateInterval = 6000 }) {
    const [cameraUrls, setCameraUrls] = useState(Object.values(cameras));
    const intervalRef = useRef(null);
    const { isPaused } = useUpdate(); // Obtém o estado global de pausa
    const timestampRef = useRef(Date.now());

    // Memoize the update function to prevent recreation on every render
    const updateImages = useCallback(() => {
        if (isPaused) return; // Pausa as atualizações se o modal estiver aberto
        
        timestampRef.current = Date.now();
        setCameraUrls((prevCameraUrls) =>
            prevCameraUrls.map((camera) => ({
                ...camera,
                url: `${camera.url.split("&t=")[0]}&t=${timestampRef.current}`,
            }))
        );
    }, [isPaused]);

    // Memoize the camera grid to prevent unnecessary re-renders
    const cameraGrid = useMemo(() => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
            {cameraUrls.map((camera, index) => (
                <MemoizedCameraCard
                    key={camera.url}
                    camera={camera}
                    onImageClick={(data) => onImageClick(data, index)}
                    index={index}
                />
            ))}
        </div>
    ), [cameraUrls, onImageClick]);

    useEffect(() => {
        // Initial update
        updateImages();

        // Setup interval
        intervalRef.current = setInterval(updateImages, updateInterval);

        // Cleanup function
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [updateImages, updateInterval]);

    return cameraGrid;
}

CameraGrid.propTypes = {
    onImageClick: PropTypes.func.isRequired,
    updateInterval: PropTypes.number,
};

export default React.memo(CameraGrid);