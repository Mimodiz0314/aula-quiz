import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/config.js';

/**
 * useServerTimer
 * Calcula segundos restantes basándose en `inicioMs` (timestamp del servidor)
 * y `duracionSeg` de la sesión. NO depende del reloj local del cliente para
 * decidir cuándo agotar el tiempo; usa el offset del servidor para calibrar Date.now().
 *
 * Si duracionSeg es 0, se considera "Sin límite" (tiempo ilimitado).
 *
 * La autoridad real de "tiempo agotado" sigue siendo el docente/servidor
 * (vía marcarTiempoAgotado), pero este hook también dispara `onExpire`
 * en el lado del docente para automatizar el cambio de estado.
 */
export function useServerTimer(inicioMs, duracionSeg, activo, onExpire) {
  const [restante, setRestante] = useState(duracionSeg);
  const [serverOffset, setServerOffset] = useState(0);

  // Escuchar el desvío del reloj con Firebase una sola vez al montar
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsubscribe = onValue(offsetRef, (snap) => {
      setServerOffset(snap.val() || 0);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Si la duración es 0, es un juego sin límite de tiempo.
    if (duracionSeg === 0) {
      setRestante(0);
      return;
    }

    if (!activo || !inicioMs || !duracionSeg) {
      setRestante(duracionSeg || 0);
      return;
    }

    let cancelado = false;
    const tick = () => {
      if (cancelado) return;
      const ahora = Date.now() + serverOffset;
      const transcurridos = (ahora - inicioMs) / 1000;
      const r = Math.max(0, Math.ceil(duracionSeg - transcurridos));
      setRestante(r);
      if (r <= 0) {
        if (onExpire) onExpire();
        return; // detener
      }
      window.setTimeout(tick, 250);
    };
    tick();

    return () => {
      cancelado = true;
    };
  }, [inicioMs, duracionSeg, activo, onExpire, serverOffset]);

  return restante;
}
