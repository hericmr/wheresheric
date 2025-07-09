import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './styles.css';

const Transmitter = () => {
  const [permissionStatus, setPermissionStatus] = useState('Aguardando permissão...');
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [sendStatus, setSendStatus] = useState('Aguardando envio...');

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      setPermissionStatus('Não suportada');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setPermissionStatus('Permitido');
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError(null);
      },
      (error) => {
        setPermissionStatus('Negado');
        setError(`Erro ao obter localização: ${error.message}`);
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const sendLocation = async () => {
      if (location) {
        setSendStatus('Enviando...');
        const { error } = await supabase
          .from('location_updates')
          .insert([{ lat: location.lat, lng: location.lng }]);

        if (error) {
          setSendStatus('Erro no envio');
          setError(`Erro ao enviar para o Supabase: ${error.message}`);
        } else {
          setSendStatus('Enviado com sucesso');
        }
      }
    };

    sendLocation();
  }, [location]);

  return (
    <div className="transmitter-container">
      <h1>Página Transmissora</h1>
      <p>Status da Permissão: <span>{permissionStatus}</span></p>
      <p>Status do Envio: <span>{sendStatus}</span></p>
      {location && (
        <p>
          Coordenadas: Latitude: {location.lat}, Longitude: {location.lng}
        </p>
      )}
      {error && <p>Mensagem de Erro: <span>{error}</span></p>}
    </div>
  );
};

export default Transmitter;
