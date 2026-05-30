package com.edumaster.aula;

import android.content.Context;
import android.content.res.AssetManager;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

/**
 * Servidor local del docente (host). Hace DOS cosas en un solo puerto:
 *   1. Sirve la PWA del alumno desde los assets (carpeta "public", que Capacitor
 *      llena con el build de la app). Así el alumno carga la app por HTTP de la
 *      red local (mismo origen) y evita el bloqueo "mixed content" con ws://.
 *   2. Acepta conexiones WebSocket de los alumnos y las puentea al JS (el host
 *      lógico vive en el WebView: lanHost.js + localBackend).
 *
 * Las intenciones de los alumnos (JOIN/ANSWER) llegan como mensajes WS y se
 * reenvían al plugin (emitMessage); las respuestas/estado bajan vía sendTo/
 * broadcast. La identidad de cada alumno en el host es el connId del socket.
 */
public class LanHttpServer extends NanoWSD {

    private final Context context;
    private final LanServerPlugin plugin;
    private final Map<String, WsClient> clients = new ConcurrentHashMap<>();
    private final AtomicInteger counter = new AtomicInteger(0);

    public LanHttpServer(Context context, int port, LanServerPlugin plugin) {
        super(port);
        this.context = context;
        this.plugin = plugin;
    }

    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        String connId = "ws" + counter.incrementAndGet();
        WsClient c = new WsClient(handshake, connId);
        clients.put(connId, c);
        return c;
    }

    /** Envía un mensaje de texto a un alumno concreto. */
    public void sendTo(String connId, String data) {
        WsClient c = clients.get(connId);
        if (c != null) {
            try { c.send(data); } catch (IOException ignored) {}
        }
    }

    /** Envía un mensaje de texto a todos los alumnos conectados. */
    public void broadcast(String data) {
        for (WsClient c : clients.values()) {
            try { c.send(data); } catch (IOException ignored) {}
        }
    }

    // ---- Servir la PWA del alumno desde assets (peticiones HTTP no-WS) ----
    @Override
    protected Response serveHttp(IHTTPSession session) {
        String uri = session.getUri();
        if (uri == null || uri.equals("/")) uri = "/index.html";
        // Quitar query string.
        int q = uri.indexOf('?');
        if (q >= 0) uri = uri.substring(0, q);

        String assetPath = "public" + uri;
        AssetManager am = context.getAssets();

        InputStream is = openAsset(am, assetPath);
        if (is == null) {
            // Sin archivo: si la ruta no tiene extensión es una ruta SPA → index.html
            is = openAsset(am, "public/index.html");
            assetPath = "public/index.html";
        }
        if (is == null) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "No encontrado");
        }
        Response res = newChunkedResponse(Response.Status.OK, mimeFor(assetPath), is);
        // Permitir que el navegador del alumno cargue todo sin problemas de CORS.
        res.addHeader("Access-Control-Allow-Origin", "*");
        return res;
    }

    private InputStream openAsset(AssetManager am, String path) {
        try { return am.open(path); } catch (IOException e) { return null; }
    }

    private String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    /** WebSocket de un alumno. Su connId lo identifica en el host. */
    private class WsClient extends WebSocket {
        private final String connId;

        WsClient(IHTTPSession handshake, String connId) {
            super(handshake);
            this.connId = connId;
        }

        @Override
        protected void onOpen() {
            plugin.emitClientConnected(connId);
        }

        @Override
        protected void onClose(WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
            clients.remove(connId);
            plugin.emitClientDisconnected(connId);
        }

        @Override
        protected void onMessage(WebSocketFrame message) {
            plugin.emitMessage(connId, message.getTextPayload());
        }

        @Override
        protected void onPong(WebSocketFrame pong) { /* keep-alive */ }

        @Override
        protected void onException(IOException exception) { /* ignore */ }
    }
}
