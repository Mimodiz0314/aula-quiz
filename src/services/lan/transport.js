// ---------------------------------------------------------------------------
// LAN TRANSPORT — capa de transporte intercambiable
// Interfaces:
//   ClientTransport: { start(), send(obj), onMessage(cb), onStatus(cb), close() }
//   HostTransport:   { start(), broadcast(obj), sendTo(clientId,obj),
//                      onMessage(cb), onStatus(cb), close() }
//
// Implementaciones:
//   - WebSocketTransport(url)         → CLIENTE real (alumno → host por ws://)
//   - createInMemoryHub()             → host + N clientes en la MISMA página
//                                       (pruebas unitarias, sin red)
//   - BroadcastChannel{Host,Client}   → dos pestañas del mismo dispositivo
//                                       (demo docente+alumno sin red real)
//
// El transporte real del HOST (servidor que escucha) lo provee la capa nativa
// (Etapa E): debe implementar broadcast/sendTo gestionando sus conexiones, y
// puede reusar lanHost.js tal cual.
// ---------------------------------------------------------------------------

// ---------- CLIENTE: WebSocket real ----------
export function WebSocketTransport(url) {
  let ws = null;
  const msgCbs = new Set();
  const statusCbs = new Set();
  const emitStatus = (s) => statusCbs.forEach((cb) => cb(s));

  return {
    start() {
      ws = new WebSocket(url);
      ws.onopen = () => emitStatus('open');
      ws.onclose = () => emitStatus('closed');
      ws.onerror = () => emitStatus('error');
      ws.onmessage = (ev) => {
        let obj = ev.data;
        if (typeof obj === 'string') {
          try { obj = JSON.parse(obj); } catch { return; }
        }
        msgCbs.forEach((cb) => cb(obj));
      };
    },
    send(obj) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    },
    onMessage(cb) { msgCbs.add(cb); return () => msgCbs.delete(cb); },
    onStatus(cb) { statusCbs.add(cb); return () => statusCbs.delete(cb); },
    close() { try { ws && ws.close(); } catch { /* ignore */ } },
  };
}

// ---------- PRUEBAS: hub en memoria (host + N clientes, misma página) ----------
export function createInMemoryHub() {
  const hostMsgCbs = new Set();        // host recibe (obj) de cualquier cliente
  const clients = new Map();           // clientId -> { msgCbs:Set }

  const host = {
    start() {},
    broadcast(obj) {
      clients.forEach((c) => c.msgCbs.forEach((cb) => cb(obj)));
    },
    sendTo(clientId, obj) {
      const c = clients.get(clientId);
      if (c) c.msgCbs.forEach((cb) => cb(obj));
    },
    onMessage(cb) { hostMsgCbs.add(cb); return () => hostMsgCbs.delete(cb); },
    onStatus() { return () => {}; },
    close() { clients.clear(); },
  };

  function connect(clientId) {
    const entry = { msgCbs: new Set() };
    clients.set(clientId, entry);
    const statusCbs = new Set();
    // Avisar "open" en el próximo tick.
    setTimeout(() => statusCbs.forEach((cb) => cb('open')), 0);
    return {
      start() {},
      send(obj) { hostMsgCbs.forEach((cb) => cb(obj)); },
      onMessage(cb) { entry.msgCbs.add(cb); return () => entry.msgCbs.delete(cb); },
      onStatus(cb) { statusCbs.add(cb); return () => statusCbs.delete(cb); },
      close() { clients.delete(clientId); },
    };
  }

  return { host, connect };
}

// ---------- DEMO: BroadcastChannel (dos pestañas) ----------
// Envoltura de mensajes: { dir:'c2h'|'h2c', to:clientId|null, payload }
function bcName(pin) { return `aula_lan_${pin}`; }

export function BroadcastChannelHostTransport(pin) {
  const ch = new BroadcastChannel(bcName(pin));
  const msgCbs = new Set();
  ch.onmessage = (e) => {
    const env = e?.data;
    if (env?.dir === 'c2h') msgCbs.forEach((cb) => cb(env.payload));
  };
  return {
    start() {},
    broadcast(obj) { ch.postMessage({ dir: 'h2c', to: null, payload: obj }); },
    sendTo(clientId, obj) { ch.postMessage({ dir: 'h2c', to: clientId, payload: obj }); },
    onMessage(cb) { msgCbs.add(cb); return () => msgCbs.delete(cb); },
    onStatus() { return () => {}; },
    close() { try { ch.close(); } catch { /* ignore */ } },
  };
}

export function BroadcastChannelClientTransport(pin, clientId) {
  const ch = new BroadcastChannel(bcName(pin));
  const msgCbs = new Set();
  const statusCbs = new Set();
  ch.onmessage = (e) => {
    const env = e?.data;
    if (env?.dir === 'h2c' && (env.to === null || env.to === clientId)) {
      msgCbs.forEach((cb) => cb(env.payload));
    }
  };
  return {
    start() { setTimeout(() => statusCbs.forEach((cb) => cb('open')), 0); },
    send(obj) { ch.postMessage({ dir: 'c2h', to: null, payload: obj }); },
    onMessage(cb) { msgCbs.add(cb); return () => msgCbs.delete(cb); },
    onStatus(cb) { statusCbs.add(cb); return () => statusCbs.delete(cb); },
    close() { try { ch.close(); } catch { /* ignore */ } },
  };
}
