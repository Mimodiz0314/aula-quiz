import { useEffect, useState } from 'react';

/**
 * useServerTimer
 * Calcula segundos restantes basándose en `inicioMs` (timestamp del servidor)
 * y `duracionSeg` de la sesión. NO depende del reloj local del cliente para
 * decidir cuándo agotar el tiempo; sólo lo hace para mostrar la cuenta.
 *
 * La autoridad real de "tiempo agotado" sigue siendo el docente/servidor
 * (vía marcarTiempoAgotado), pero este hook también dispara `onExpire`
 * en el lado del docente para automatizar el cambio de estado.
 */
export function useServerTimer(inicioMs, duracionSeg, activo, onExpire) {
  const [restante, setRestante] = useState(duracionSeg);

  useEffect(() => {
    if (!activo || !inicioMs || !duracionSeg) {
      setRestante(duracionSeg || 0);
      return;
    }

    let cancelado = false;
    const tick = () => {
      if (cancelado) return;
      const ahora = Date.now();
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
  }, [inicioMs, duracionSeg, activo, onExpire]);

  return restante;
}
