import { useState, useEffect } from 'react';
import { ref, set, remove, onValue } from 'firebase/database';
import { db } from '../../firebase/config.js';

export default function TabAI() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fase2Activa, setFase2Activa] = useState(false);
  const [expandido, setExpandido] = useState({});

  useEffect(() => {
    // Escuchar la config
    const configRef = ref(db, 'configuracion_ia/fase2_activa');
    const unsubConfig = onValue(configRef, snap => {
      setFase2Activa(snap.val() === true);
    });

    // Escuchar logs
    const logsRef = ref(db, 'ai_training_logs');
    const unsubLogs = onValue(logsRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        arr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLogs(arr);
      } else {
        setLogs([]);
      }
      setCargando(false);
    });

    return () => {
      unsubConfig();
      unsubLogs();
    };
  }, []);

  async function toggleFase2() {
    try {
      await set(ref(db, 'configuracion_ia/fase2_activa'), !fase2Activa);
    } catch (error) {
      console.error('Error toggling Fase 2:', error);
      alert('Error cambiando fase.');
    }
  }

  async function eliminarLog(id) {
    if (!confirm('¿Eliminar este registro de entrenamiento?')) return;
    try {
      await remove(ref(db, `ai_training_logs/${id}`));
    } catch (e) {
      alert('Error al eliminar');
    }
  }

  function toggleExpandir(id) {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-mist/50 p-6 md:p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-black text-2xl mb-1">Entrenamiento IA (Modo Esponja)</h2>
          <p className="text-sm font-bold text-ink/50">
            Aquí se registran las ediciones manuales de los docentes a las actividades generadas por la IA.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-ink/5 p-4 rounded-2xl border border-ink/10">
          <div className="flex flex-col items-end">
            <span className="font-black text-sm uppercase tracking-wider">Fase 2 de IA</span>
            <span className="text-xs font-bold text-ink/40">Usar contexto aprendido</span>
          </div>
          <button
            onClick={toggleFase2}
            className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${
              fase2Activa ? 'bg-brandSuccess' : 'bg-ink/20'
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-transform shadow-sm ${
              fase2Activa ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gameBg p-4 rounded-xl border border-mist">
          <div className="font-black text-3xl text-brandPrimary">{logs.length}</div>
          <div className="text-xs font-bold tracking-widest uppercase text-ink/40 mt-1">Registros guardados</div>
        </div>
      </div>

      <h3 className="font-black text-lg mb-4">Últimos aprendizajes</h3>
      
      {cargando ? (
        <div className="py-12 text-center text-ink/40 font-bold animate-pulse">Cargando registros...</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center bg-gameBg rounded-2xl border-2 border-dashed border-mist">
          <span className="text-4xl mb-3 block">🧠</span>
          <p className="font-black text-xl text-ink/40">No hay registros todavía</p>
          <p className="font-bold text-sm text-ink/40">Cuando un docente edite una evaluación generada por IA, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const date = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Desconocido';
            const numOriginales = log.original?.length || 0;
            const isExpanded = expandido[log.id];

            return (
              <div key={log.id} className="border-2 border-mist rounded-2xl overflow-hidden transition-all">
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gameBg/50">
                  <div className="flex flex-col">
                    <span className="font-black text-sm">{log.nombre_docente} <span className="font-bold text-ink/40 text-xs ml-2">{date}</span></span>
                    <span className="text-xs font-bold text-ink/50 mt-0.5">
                      Origen: <span className="uppercase text-brandPrimary tracking-wider">{log.origen_generacion}</span>
                      {' • '} {numOriginales} actividades editadas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleExpandir(log.id)} className="btn-ghost text-xs">
                      {isExpanded ? 'Ocultar Diferencias' : 'Ver Diferencias'}
                    </button>
                    <button onClick={() => eliminarLog(log.id)} className="btn-ghost text-deny text-xs hover:bg-deny/10">
                      ✕ Eliminar
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-mist bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-deny mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-deny inline-block"></span>
                        Original (Lo que hizo la IA)
                      </h4>
                      <pre className="text-[10px] font-mono bg-ink/5 p-3 rounded-xl overflow-x-auto text-ink/70 max-h-96">
                        {JSON.stringify(log.original, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-brandSuccess mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brandSuccess inline-block"></span>
                        Editado (Lo que corrigió el docente)
                      </h4>
                      <pre className="text-[10px] font-mono bg-ink/5 p-3 rounded-xl overflow-x-auto text-ink/70 max-h-96">
                        {JSON.stringify(log.edited, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
