package com.edumaster.aula;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

/**
 * Plugin Capacitor "LanServer": expone al JS el servidor local del host.
 * Métodos: start({port}) → {ip, port}, stop(), send({connId,data}), broadcast({data}),
 *          getInfo() → {ip, running}.
 * Eventos hacia el JS: clientConnected, message, clientDisconnected.
 *
 * El JS (NativeHostTransport) traduce estos eventos a la interfaz HostTransport
 * que consume lanHost.js. La lógica de sesión sigue íntegra en el WebView.
 */
@CapacitorPlugin(name = "LanServer")
public class LanServerPlugin extends Plugin {

    private LanHttpServer server;
    private int currentPort = 0;

    @PluginMethod
    public void start(PluginCall call) {
        int port = call.getInt("port", 8080);
        try {
            if (server != null) {
                try { server.stop(); } catch (Exception ignored) {}
                server = null;
            }
            server = new LanHttpServer(getContext(), port, this);
            server.start(0 /* SOCKET_READ_TIMEOUT: 0 = sin timeout */, false);
            currentPort = port;

            JSObject ret = new JSObject();
            ret.put("ip", getLocalIp());
            ret.put("port", port);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("No se pudo iniciar el servidor local: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (server != null) {
            try { server.stop(); } catch (Exception ignored) {}
            server = null;
        }
        currentPort = 0;
        call.resolve();
    }

    @PluginMethod
    public void send(PluginCall call) {
        String connId = call.getString("connId");
        String data = call.getString("data");
        if (server != null && connId != null && data != null) server.sendTo(connId, data);
        call.resolve();
    }

    @PluginMethod
    public void broadcast(PluginCall call) {
        String data = call.getString("data");
        if (server != null && data != null) server.broadcast(data);
        call.resolve();
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ip", getLocalIp());
        ret.put("port", currentPort);
        ret.put("running", server != null);
        call.resolve(ret);
    }

    // ---- Eventos desde los hilos del servidor hacia el JS ----
    void emitClientConnected(String connId) {
        JSObject d = new JSObject();
        d.put("connId", connId);
        notifyListeners("clientConnected", d);
    }

    void emitMessage(String connId, String data) {
        JSObject d = new JSObject();
        d.put("connId", connId);
        d.put("data", data);
        notifyListeners("message", d);
    }

    void emitClientDisconnected(String connId) {
        JSObject d = new JSObject();
        d.put("connId", connId);
        notifyListeners("clientDisconnected", d);
    }

    @Override
    protected void handleOnDestroy() {
        if (server != null) {
            try { server.stop(); } catch (Exception ignored) {}
            server = null;
        }
    }

    /** Primera IPv4 privada no-loopback (la de la red local / hotspot). */
    private String getLocalIp() {
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                if (!intf.isUp() || intf.isLoopback()) continue;
                for (Enumeration<InetAddress> enumIp = intf.getInetAddresses(); enumIp.hasMoreElements();) {
                    InetAddress inet = enumIp.nextElement();
                    if (!inet.isLoopbackAddress() && inet instanceof Inet4Address) {
                        String ip = inet.getHostAddress();
                        if (ip != null && (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172."))) {
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
