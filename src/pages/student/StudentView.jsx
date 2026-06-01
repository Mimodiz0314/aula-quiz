import { useEffect, useState } from 'react';
import Join from './Join.jsx';
import Waiting from './Waiting.jsx';
import Question from './Question.jsx';
import Reveal from './Reveal.jsx';
import FinalScore from './FinalScore.jsx';
import { useRealtimeSession } from '../../hooks/useRealtimeSession.js';
import { ESTADOS } from '../../services/sessionService.js';
import { parseJoinFromSearch, buildWsUrl } from '../../services/lan/joinLink.js';
import { conectarClienteLAN } from '../../services/backends/lanBackend.js';
import { WebSocketTransport } from '../../services/lan/transport.js';
import { enableOfflineOverride } from '../../services/featureFlag.js';

export default function StudentView() {
  const [pin, setPin] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [lanPrefill, setLanPrefill] = useState(null); // PIN prefijado al venir por ?lan=
  const { sesion, loading } = useRealtimeSession(pin);

  // ENTRADA POR RED LOCAL: si la URL trae ?lan=host:puerto&pin=, conectamos al
  // host del docente por WebSocket (sin internet) y prefijamos el PIN.
  useEffect(() => {
    const info = parseJoinFromSearch(window.location.search);
    if (!info || !info.pin) return;
    enableOfflineOverride(); // el modo LAN requiere la capa offline activa
    try {
      const transport = WebSocketTransport(buildWsUrl(info.host, info.port));
      conectarClienteLAN(info.pin, transport, info.token).catch(() => {});
      setLanPrefill(info.pin);
    } catch { /* ignore */ }
  }, []);

  // RECONEXIÓN automática: intentar restaurar la sesión desde localStorage.
  // Iteramos las claves que empiezan por "quiz_student_".
  useEffect(() => {
    if (pin) return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('quiz_student_')) {
        const pinGuardado = key.replace('quiz_student_', '');
        const { studentId: id } = JSON.parse(localStorage.getItem(key));
        // No restauramos automáticamente, solo dejamos prefill en Join.
        // (Para evitar atrapar al usuario en una sesión antigua.)
        // El "reconectar" se ofrece como botón en Join.
        sessionStorage.setItem('last_pin', pinGuardado);
        sessionStorage.setItem('last_student_id', id);
        break;
      }
    }
  }, [pin]);

  function onJoined({ pin: nuevoPin, studentId: id }) {
    setPin(nuevoPin);
    setStudentId(id);
  }

  if (!pin || !studentId) return <Join onJoined={onJoined} pinInicial={lanPrefill} />;
  if (loading) return <CenteredMessage>Conectando…</CenteredMessage>;
  if (!sesion) {
    // Sesión borrada por el docente
    localStorage.removeItem(`quiz_student_${pin}`);
    return <CenteredMessage>El docente cerró la sesión.</CenteredMessage>;
  }

  const yo = sesion.estudiantes?.[studentId];
  if (!yo) return <CenteredMessage>Tu registro ya no existe.</CenteredMessage>;

  switch (sesion.estado_actual) {
    case ESTADOS.LOBBY:
      return <Waiting nombre={yo.nombre} />;
    case ESTADOS.PREGUNTA_ACTIVA:
      return (
        <Question
          pin={pin}
          studentId={studentId}
          sesion={sesion}
          yo={yo}
          bloqueado={false}
        />
      );
    case ESTADOS.TIEMPO_AGOTADO:
      return (
        <Question
          pin={pin}
          studentId={studentId}
          sesion={sesion}
          yo={yo}
          bloqueado={false}
        />
      );
    case ESTADOS.RESPUESTA_REVELADA:
      return <Reveal sesion={sesion} yo={yo} />;
    case ESTADOS.RESULTADOS_FINALES:
      return <FinalScore sesion={sesion} yo={yo} pin={pin} />;
    default:
      return <CenteredMessage>Esperando…</CenteredMessage>;
  }
}

function CenteredMessage({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="font-display text-2xl text-ink/60 text-center">{children}</div>
    </div>
  );
}
