// ---------------------------------------------------------------------------
// NATIVE SERVER — puente JS ↔ plugin nativo "LanServer" (solo en el APK)
// Envuelve el plugin en un HostTransport que consume lanHost.js. Los mensajes
// de los alumnos llegan como evento 'message' {connId, data}; usamos connId
// como identidad del alumno en el host (clientId). En la web (no nativo) esto
// no se usa: el servidor que escucha solo existe en la app instalada.
// ---------------------------------------------------------------------------

import { Capacitor, registerPlugin } from '@capacitor/core';
import * as lan from '../backends/lanBackend.js';

const LanServer = registerPlugin('LanServer');

export function esNativo() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// HostTransport respaldado por el plugin nativo.
function NativeHostTransport() {
  const msgCbs = new Set();
  let listener = null;
  let started = false;

  return {
    async start() {
      if (started) return;
      started = true;
      listener = await LanServer.addListener('message', ({ connId, data }) => {
        let obj;
        try { obj = JSON.parse(data); } catch { return; }
        if (obj && typeof obj === 'object') obj.clientId = connId; // identidad = socket
        msgCbs.forEach((cb) => cb(obj));
      });
    },
    broadcast(obj) { LanServer.broadcast({ data: JSON.stringify(obj) }); },
    sendTo(connId, obj) { LanServer.send({ connId, data: JSON.stringify(obj) }); },
    onMessage(cb) { msgCbs.add(cb); return () => msgCbs.delete(cb); },
    onStatus() { return () => {}; },
    async close() { try { await listener?.remove(); } catch { /* ignore */ } started = false; },
  };
}

let transportActivo = null;

function nuevoToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Inicia el servidor local del docente y conecta el host lógico (lanHost) sobre
 * la sala `pin` (que ya existe en el motor local). Genera un TOKEN de sala que
 * solo conoce quien escanee el QR; sin él, el host rechaza la conexión.
 * Devuelve { ip, port, token }.
 */
export async function iniciarServidorLAN(pin, port = 8080) {
  if (!esNativo()) {
    throw new Error('El servidor local solo funciona en la app instalada (APK).');
  }
  const token = nuevoToken();
  const transport = NativeHostTransport();
  await transport.start();          // listeners listos ANTES de aceptar conexiones
  transportActivo = transport;
  lan.iniciarHostLAN(String(pin), transport, token);
  const info = await LanServer.start({ port });
  return { ...info, token };          // { ip, port, token }
}

export async function detenerServidorLAN(pin) {
  try { lan.detenerHostLAN(String(pin)); } catch { /* ignore */ }
  try { await LanServer.stop(); } catch { /* ignore */ }
  if (transportActivo) { await transportActivo.close(); transportActivo = null; }
}

export async function infoServidorLAN() {
  if (!esNativo()) return { ip: null, port: 0, running: false };
  try { return await LanServer.getInfo(); } catch { return { ip: null, port: 0, running: false }; }
}
