import { useEffect, useState } from 'react';
import { suscribirSesion } from '../services/sessionService.js';

/**
 * useRealtimeSession(pin)
 * Devuelve { sesion, loading } y se actualiza automáticamente en cada cambio
 * del nodo /sesiones/{pin} de la Realtime Database.
 */
export function useRealtimeSession(pin) {
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = suscribirSesion(pin, (val) => {
      setSesion(val);
      setLoading(false);
    });
    return unsub;
  }, [pin]);

  return { sesion, loading };
}
