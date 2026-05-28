import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Setup from './Setup.jsx';
import Lobby from './Lobby.jsx';
import ControlPanel from './ControlPanel.jsx';
import Dashboard from './Dashboard.jsx';
import { useRealtimeSession } from '../../hooks/useRealtimeSession.js';
import { ESTADOS } from '../../services/sessionService.js';

export default function TeacherView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState(sessionId || null);
  const { sesion, loading: sessionLoading } = useRealtimeSession(pin);

  function onSessionCreated(nuevoPin) {
    setPin(nuevoPin);
    navigate(`/docente/sesion/${nuevoPin}`, { replace: true });
  }

  if (!pin) return <Setup onCreated={onSessionCreated} />;
  if (sessionLoading) return <CenteredMessage>Cargando sesión…</CenteredMessage>;
  if (!sesion) return <CenteredMessage>La sesión ya no existe.</CenteredMessage>;

  switch (sesion.estado_actual) {
    case ESTADOS.LOBBY:
      return <Lobby pin={pin} sesion={sesion} />;
    case ESTADOS.PREGUNTA_ACTIVA:
    case ESTADOS.TIEMPO_AGOTADO:
    case ESTADOS.RESPUESTA_REVELADA:
      return <ControlPanel pin={pin} sesion={sesion} />;
    case ESTADOS.RESULTADOS_FINALES:
      return <Dashboard pin={pin} sesion={sesion} />;
    default:
      return <CenteredMessage>Estado desconocido.</CenteredMessage>;
  }
}

function CenteredMessage({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-display text-2xl text-ink/60">{children}</div>
    </div>
  );
}
