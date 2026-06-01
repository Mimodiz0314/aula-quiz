// ---------------------------------------------------------------------------
// VISTA PREVIA DEL ESTUDIANTE
// Muestra el cuestionario EXACTAMENTE como lo ve el alumno, reutilizando el
// mismo dispatcher de Question (ActivityStudentView). Es un sandbox: las
// respuestas son locales, no se guardan en ninguna sesión.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ActivityStudentView, hablar, textoLeible } from '../pages/student/Question.jsx';

export default function StudentPreview({ actividades = [], tema = '', onClose }) {
  const [idx, setIdx] = useState(0);
  const total = actividades.length;
  const actividad = total > 0 ? actividades[idx] : null;

  return createPortal(
    <div className="fixed inset-0 bg-ink/70 backdrop-blur-sm z-50 flex flex-col items-center p-4 overflow-auto">
      {/* Barra superior */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 shrink-0">
        <div className="text-white">
          <p className="font-bold text-xs uppercase tracking-widest text-white/60">Vista previa · como la ve el estudiante</p>
          <p className="font-black text-lg truncate max-w-[260px]">{tema || 'Cuestionario'}</p>
        </div>
        <div className="flex gap-2">
          {actividad && (
            <button
              onClick={() => hablar(textoLeible(actividad))}
              className="bg-white text-ink w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center hover:bg-white/90 transition-all shadow-md"
              title="Leer en voz alta"
            >
              🔊
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-white text-ink px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white/90 transition-all shadow-md"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* "Pantalla" del estudiante */}
      <div className="w-full max-w-md">
        {actividad ? (
          <PreviewItem key={idx} actividad={actividad} idx={idx} total={total} />
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center font-bold text-ink/50">
            Este cuestionario no tiene actividades.
          </div>
        )}
      </div>

      {/* Navegación entre preguntas */}
      {total > 1 && (
        <div className="w-full max-w-md flex items-center justify-between mt-3 shrink-0">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="bg-white/90 text-ink px-4 py-2 rounded-xl font-black text-sm disabled:opacity-40 hover:bg-white transition-all"
          >
            ← Anterior
          </button>
          <span className="font-black text-white text-sm">{idx + 1} de {total}</span>
          <button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            disabled={idx === total - 1}
            className="bg-white/90 text-ink px-4 py-2 rounded-xl font-black text-sm disabled:opacity-40 hover:bg-white transition-all"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

// Una pregunta renderizada como la ve el estudiante. Respuesta local (sandbox).
function PreviewItem({ actividad, idx, total }) {
  const [respuesta, setRespuesta] = useState(null);
  return (
    <div className="bg-gameBg rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 pt-3 text-xs font-bold text-ink/50">
        <span>Pregunta {idx + 1} de {total}</span>
        {respuesta !== null && (
          <button onClick={() => setRespuesta(null)} className="text-brandPrimary hover:underline">
            ↺ Probar de nuevo
          </button>
        )}
      </div>
      <div className="min-h-[460px] flex flex-col p-4">
        <ActivityStudentView
          actividad={actividad}
          bloqueado={false}
          yaRespondio={respuesta !== null}
          miRespuesta={respuesta}
          responder={async (v) => setRespuesta(v)}
          seed={`preview-${idx}`}
        />
      </div>
    </div>
  );
}
