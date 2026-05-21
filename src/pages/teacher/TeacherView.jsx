import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Setup from './Setup.jsx';
import Lobby from './Lobby.jsx';
import ControlPanel from './ControlPanel.jsx';
import Dashboard from './Dashboard.jsx';
import { useRealtimeSession } from '../../hooks/useRealtimeSession.js';
import { ESTADOS } from '../../services/sessionService.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function TeacherView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState(sessionId || null);
  const { sesion, loading: sessionLoading } = useRealtimeSession(pin);
  const { user, loading: authLoading, loginWithGoogle } = useAuth();

  // Cuando Setup crea la sesión, actualiza la URL para refrescos.
  function onSessionCreated(nuevoPin) {
    setPin(nuevoPin);
    navigate(`/docente/${nuevoPin}`, { replace: true });
  }

  if (authLoading) return <CenteredMessage>Comprobando sesión...</CenteredMessage>;

  if (!user || user.isAnonymous) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center grain">
        <h1 className="font-display text-4xl mb-6">Acceso Docente</h1>
        <button onClick={loginWithGoogle} className="btn-primary">
          Iniciar sesión con Google
        </button>
      </div>
    );
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
