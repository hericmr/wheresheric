import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Viewer from './components/Viewer';
import './App.css';

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/viewer" replace />} />
        <Route path="/viewer" element={<Viewer />} />
      </Routes>
    </div>
  );
}

export default App;
