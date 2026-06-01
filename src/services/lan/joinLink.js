// ---------------------------------------------------------------------------
// JOIN LINK — códec del enlace y del código corto de unión a una sala LAN
// Funciones PURAS (sin dependencias) que usarán:
//   - el HOST (docente) para construir el QR y el código corto que proyecta
//   - el CLIENTE (alumno) para interpretar el ?lan=... de la URL o el código
//
// Enlace (va dentro del QR): el alumno lo abre con la cámara normal del teléfono
//   http://<ip-host>:<puerto>/jugar?lan=<ip>:<puerto>&pin=<pin>
// Código corto (respaldo si no hay cámara): <octeto4>-<puerto>-<pin>
//   p. ej. en 192.168.1.7:8080 sala 12345  →  "7-8080-12345"
// Se asume que docente y alumno comparten la red 192.168.x.x del host; el código
// corto solo transporta el último octeto para teclear menos. El host puede
// mostrar también la IP completa por si la subred no es la típica.
// ---------------------------------------------------------------------------

/** Construye la URL completa que codifica el QR (incluye el token de sala). */
export function buildJoinUrl(host, port, pin, { path = '/jugar', secure = false, token = '' } = {}) {
  const proto = secure ? 'https' : 'http';
  const t = token ? `&t=${encodeURIComponent(token)}` : '';
  return `${proto}://${host}:${port}${path}?lan=${host}:${port}&pin=${encodeURIComponent(pin)}${t}`;
}

/** Construye un código corto tecleable. Usa el último octeto de la IP. */
export function buildShortCode(host, port, pin) {
  const ultimoOcteto = String(host).split('.').pop() || host;
  return `${ultimoOcteto}-${port}-${pin}`;
}

/**
 * Interpreta el parámetro ?lan=host:puerto&pin=... de una URL.
 * Devuelve { host, port, pin } o null si no aplica.
 */
export function parseJoinFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '');
    const lan = params.get('lan');
    const pin = params.get('pin');
    const token = params.get('t');
    if (!lan) return null;
    const [host, portStr] = lan.split(':');
    const port = Number(portStr);
    if (!host || !Number.isInteger(port)) return null;
    return { host, port, pin: pin || null, token: token || null };
  } catch {
    return null;
  }
}

/**
 * Interpreta el código corto "<octeto>-<puerto>-<pin>". Necesita un prefijo de
 * subred (por defecto 192.168.1) para reconstruir la IP completa.
 * Devuelve { host, port, pin } o null.
 */
export function parseShortCode(code, subnetPrefix = '192.168.1') {
  if (typeof code !== 'string') return null;
  const partes = code.trim().split('-');
  if (partes.length !== 3) return null;
  const [octeto, portStr, pin] = partes;
  const port = Number(portStr);
  if (!octeto || !Number.isInteger(port) || !pin) return null;
  return { host: `${subnetPrefix}.${octeto}`, port, pin };
}

/** Construye la URL WebSocket a la que el cliente se conecta. */
export function buildWsUrl(host, port, { secure = false } = {}) {
  const proto = secure ? 'wss' : 'ws';
  return `${proto}://${host}:${port}`;
}
