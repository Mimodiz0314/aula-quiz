import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerHistorialDocente, ESTADOS } from '../../services/sessionService.js';

export default function TeacherHistory({ onClose }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const h = await obtenerHistorialDocente();
        setHistorial(h);
      } catch (e) {
        console.error("Error obteniendo historial", e);
      } finally {
        setCargando(false);
      }
    }
    fetchHistory();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    const d = new Date(timestamp);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mt-8 border-t border-ink/10 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl">Historial de Sesiones</h2>
        {onClose && (
          <button onClick={onClose} className="text-sm font-mono uppercase tracking-widest text-ink/60 hover:text-ink">
            Ocultar ↑
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-ink/60">Cargando historial...</p>
      ) : historial.length === 0 ? (
        <p className="text-ink/60">No tienes sesiones anteriores.</p>
      ) : (
        <div className="space-y-4">
          {historial.map((sesion) => (
            <div key={sesion.pin} className="p-6 bg-bone border border-ink/10 rounded-2xl flex justify-between items-center hover:border-ink/30 transition-all">
              <div>
                <div className="font-display text-2xl">PIN: {sesion.pin}</div>
                <div className="text-sm text-ink/60 mt-1">
                  {formatDate(sesion.creada_en)} · {sesion.preguntas?.length || 0} preguntas
                </div>
                <div className="mt-2 inline-block px-2 py-1 bg-ink/5 rounded text-xs font-mono uppercase tracking-wider">
                  {sesion.estado_actual === ESTADOS.RESULTADOS_FINALES ? 'Finalizada' : 'Activa/Pausada'}
                </div>
              </div>
              <button
                onClick={() => navigate(`/docente/${sesion.pin}`)}
                className="btn-ghost"
              >
                Ver →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
