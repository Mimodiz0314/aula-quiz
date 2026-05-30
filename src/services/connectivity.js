// ---------------------------------------------------------------------------
// CONNECTIVITY — detección de conexión a internet
// `navigator.onLine` solo dice si hay red local; no distingue el caso típico
// rural "conectado al WiFi del docente pero sin internet". Por eso ofrecemos
// además una sonda de alcanzabilidad opcional contra Firebase.
//
// isOnline() es síncrono y barato (lo usa el selector en cada llamada).
// probeReachability() es asíncrono y refina ese estado en segundo plano.
// ---------------------------------------------------------------------------

let reachableCache = null;      // null = desconocido, true/false = último sondeo
let lastProbeTs = 0;
const PROBE_TTL = 15000;        // ms de validez del último sondeo

/**
 * Estado de conexión síncrono. Si una sonda reciente dijo "sin internet",
 * lo respetamos aunque navigator.onLine sea true (WiFi sin salida).
 */
export function isOnline() {
  const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!navOnline) return false;
  // Si hay un sondeo reciente y dio negativo, consideramos offline.
  if (reachableCache === false && Date.now() - lastProbeTs < PROBE_TTL) return false;
  return true;
}

/**
 * Sonda real: intenta alcanzar la base de datos de Firebase. Devuelve boolean
 * y cachea el resultado. No lanza (cualquier fallo → false).
 */
export async function probeReachability(timeoutMs = 3500) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    reachableCache = false;
    lastProbeTs = Date.now();
    return false;
  }
  const url = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (!url) {
    // Sin URL configurada no podemos sondear; confiamos en navigator.onLine.
    reachableCache = true;
    lastProbeTs = Date.now();
    return true;
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    // `.json` con shallow es una respuesta minúscula; no-cors evita ruido CORS.
    await fetch(`${url}/.json?shallow=true`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(t);
    reachableCache = true;
  } catch {
    reachableCache = false;
  }
  lastProbeTs = Date.now();
  return reachableCache;
}

/**
 * Suscribe a cambios de conectividad. Llama a cb(online:boolean) en cada
 * transición. Devuelve función para desuscribir.
 */
export function onConnectivityChange(cb) {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = async () => {
    await probeReachability();
    cb(isOnline());
  };
  const handleOffline = () => {
    reachableCache = false;
    lastProbeTs = Date.now();
    cb(false);
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
