import { useState, useRef, useCallback, useEffect } from 'react';
import { playAlarm, unlockAudio, playArmConfirm } from '../utils/alarmAudio';

// O disparo é feito por proximidade do ÔNIBUS à parada destino.
// O Viewer chama trigger() quando qualquer ônibus ativo entra no raio.
// Nenhuma permissão de GPS do usuário é necessária para o alarme funcionar.

export function useAlarm() {
  const [status, setStatus]               = useState('idle'); // idle | armed | triggered | snoozed
  const [destinationStop, setDestinationStop] = useState(null);
  const [radiusMeters, setRadiusMeters]   = useState(500);

  const statusRef      = useRef('idle');
  const destRef        = useRef(null);
  const snoozeTimerRef = useRef(null);

  useEffect(() => { statusRef.current = status; },        [status]);
  useEffect(() => { destRef.current = destinationStop; }, [destinationStop]);

  // Chamado no clique do botão "Ativar alarme" — contexto de gesto do usuário.
  const arm = useCallback((stop, radius) => {
    // Desbloquear AudioContext ANTES de qualquer await (contexto de gesto do usuário).
    unlockAudio();
    playArmConfirm();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    statusRef.current = 'armed';
    destRef.current   = stop;
    setStatus('armed');
    setDestinationStop(stop);
    setRadiusMeters(radius);
  }, []);

  // Chamado pelo Viewer quando um ônibus entra no raio da parada destino.
  const trigger = useCallback(() => {
    if (statusRef.current !== 'armed') return;
    statusRef.current = 'triggered';
    setStatus('triggered');
    playAlarm();
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Desembarque em breve!', {
        body: `O ônibus está chegando em ${destRef.current?.nome || 'seu destino'}.`,
        icon: `${process.env.PUBLIC_URL}/favicon.ico`,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
    statusRef.current = 'idle';
    setStatus('idle');
    setDestinationStop(null);
  }, []);

  const snooze = useCallback(() => {
    statusRef.current = 'snoozed';
    setStatus('snoozed');
    snoozeTimerRef.current = setTimeout(() => {
      if (statusRef.current === 'snoozed') {
        statusRef.current = 'armed';
        setStatus('armed');
      }
    }, 2 * 60 * 1000);
  }, []);

  useEffect(() => () => {
    if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
  }, []);

  return { status, destinationStop, radiusMeters, arm, trigger, cancel, snooze };
}
