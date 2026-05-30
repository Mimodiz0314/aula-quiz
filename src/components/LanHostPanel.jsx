import { useState } from 'react';
import QRCode from 'qrcode';
import { esNativo, iniciarServidorLAN, detenerServidorLAN } from '../services/lan/nativeServer.js';
import { buildJoinUrl, buildShortCode } from '../services/lan/joinLink.js';

/**
 * Panel del docente para activar la "red local sin internet". SOLO se muestra
 * en la app instalada (APK), donde existe el servidor que escucha. En la web no
 * se renderiza, así que no cambia nada de la versión desplegada.
 *
 * Al activar: arranca el servidor local, muestra el QR (que el alumno escanea
 * con la cámara normal de su teléfono) y un código corto de respaldo.
 */
export default function LanHostPanel({ pin }) {
  const [estado, setEstado] = useState('inactivo'); // inactivo | iniciando | activo | error
  const [info, setInfo] = useState(null);           // { ip, port }
  const [qr, setQr] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!esNativo()) return null; // En la web no aplica (no hay servidor que escuche).

  async function activar() {
    setEstado('iniciando');
    setErrorMsg('');
    try {
      const { ip, port } = await iniciarServidorLAN(pin);
      if (!ip) throw new Error('No se detectó la IP de la red. Activa el punto de acceso (hotspot) o conéctate a la red del aula.');
      const url = buildJoinUrl(ip, port, pin);
      const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 1 });
      setInfo({ ip, port });
      setQr(dataUrl);
      setEstado('activo');
    } catch (e) {
      setErrorMsg(e?.message || 'No se pudo iniciar la red local.');
      setEstado('error');
    }
  }

  async function desactivar() {
    await detenerServidorLAN(pin);
    setEstado('inactivo');
    setInfo(null);
    setQr(null);
  }

  if (estado === 'activo' && info) {
    const url = buildJoinUrl(info.ip, info.port, pin);
    const code = buildShortCode(info.ip, info.port, pin);
    return (
      <div className="w-full max-w-md mt-6 bg-mist/20 p-5 rounded-2xl border border-brandSuccess/40 text-center">
        <p className="font-black text-brandSuccess uppercase tracking-widest text-sm mb-3">
          📡 Red local activa (sin internet)
        </p>
        {qr && <img src={qr} alt="QR para unirse" className="mx-auto rounded-xl bg-white p-2" width={220} height={220} />}
        <p className="font-bold text-ink/60 text-sm mt-3">Los estudiantes escanean el QR con la cámara de su teléfono.</p>
        <p className="font-bold text-ink/80 mt-2 break-all text-sm">{url}</p>
        <div className="mt-3 bg-white rounded-xl py-2 px-3 inline-block">
          <span className="text-ink/50 font-bold text-xs uppercase">Código: </span>
          <span className="font-black text-ink tracking-wider">{code}</span>
        </div>
        <button onClick={desactivar} className="mt-4 text-sm font-bold text-deny underline block w-full">
          Desactivar red local
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mt-6 text-center">
      <button
        onClick={activar}
        disabled={estado === 'iniciando'}
        className="btn-primary w-full bg-brandPrimary"
      >
        {estado === 'iniciando' ? 'Iniciando red local…' : '📡 Activar red local (sin internet)'}
      </button>
      {estado === 'error' && (
        <p className="text-deny font-bold text-sm mt-3 bg-deny/10 py-2 rounded">{errorMsg}</p>
      )}
      <p className="text-ink/40 font-bold text-xs mt-2">
        Para usar sin internet: enciende tu punto de acceso (hotspot) y los estudiantes se conectan a él.
      </p>
    </div>
  );
}
