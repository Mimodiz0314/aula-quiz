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
    <div className="mt-8 bg-white rounded-3xl p-8 shadow-sm animate-slide-up">
      <div className="flex justify-between items-center mb-8 border-b border-mist pb-4">
        <h2 className="font-black text-3xl">Historial de Sesiones</h2>
        {onClose && (
          <button onClick={onClose} className="btn-ghost text-deny hover:bg-deny/10">
            Cerrar Historial
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-ink/60 font-bold text-center py-8">Cargando historial...</p>
      ) : historial.length === 0 ? (
        <p className="text-ink/60 font-bold text-center py-8">No tienes juegos anteriores.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historial.map((sesion) => (
            <div key={sesion.pin} className="p-6 bg-gameBg border-2 border-mist rounded-2xl flex flex-col justify-between hover:border-kahootBlue transition-all group">
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-black text-3xl text-kahootBlue tracking-wider">{sesion.pin}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white ${sesion.estado_actual === ESTADOS.RESULTADOS_FINALES ? 'bg-kahootGreen' : 'bg-kahootYellow text-ink'}`}>
                    {sesion.estado_actual === ESTADOS.RESULTADOS_FINALES ? 'Terminado' : 'Activo'}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink/60">
                  {formatDate(sesion.creada_en)}
                </div>
                <div className="text-sm font-bold text-ink/60 mt-1">
                  {sesion.preguntas?.length || 0} preguntas
                </div>
              </div>
              <button
                onClick={() => navigate(`/docente/sesion/${sesion.pin}`)}
                className="btn-primary w-full bg-kahootBlue opacity-90 group-hover:opacity-100"
              >
                Abrir Sala
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
