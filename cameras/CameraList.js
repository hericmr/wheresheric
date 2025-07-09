import React from 'react';
import OptimizedCameraImage from './OptimizedCameraImage';

const CameraList = ({ cameras }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {cameras.map((camera) => (
                <div key={camera.id} className="aspect-video">
                    <OptimizedCameraImage
                        url={camera.url}
                        title={camera.title}
                        className="rounded-lg shadow-lg"
                    />
                </div>
            ))}
        </div>
    );
};

export default CameraList; 