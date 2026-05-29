// ---------------------------------------------------------------------------
// HOJA DE TRABAJO IMPRIMIBLE (PDF)
// Renderiza las actividades como una guía tipo examen para imprimir/guardar PDF
// vía window.print(). Dos modos:
//   - 'estudiante': sin respuestas, con espacios para resolver a mano.
//   - 'clave':      con la respuesta correcta marcada (para el docente).
// No usa librerías: el navegador ofrece "Guardar como PDF".
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { deterministicShuffle } from '../utils/shuffle.js';
import { ordenarPorClave, parejasCorrectas, clasificacionCorrecta } from '../utils/clave.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ENCABEZADO_KEY = 'aula_encabezado'; // institución + docente recordados

function leerEncabezado() {
  try { return JSON.parse(localStorage.getItem(ENCABEZADO_KEY)) || {}; }
  catch { return {}; }
}

export default function WorksheetPrint({ actividades = [], tema = '', grado = '', dificultad = '', onClose }) {
  const [modo, setModo] = useState('estudiante'); // 'estudiante' | 'clave'

  // Encabezado editable (se recuerda institución y docente entre sesiones).
  const [encabezado, setEncabezado] = useState(leerEncabezado);
  const [titulo, setTitulo] = useState(tema || '');
  const [notas, setNotas] = useState('');

  function setCampo(campo, val) {
    setEncabezado((prev) => {
      const next = { ...prev, [campo]: val };
      try { localStorage.setItem(ENCABEZADO_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Limpia la clase de impresión si el componente se desmonta a mitad.
  useEffect(() => {
    const limpiar = () => document.body.classList.remove('printing-worksheet');
    window.addEventListener('afterprint', limpiar);
    return () => {
      window.removeEventListener('afterprint', limpiar);
      limpiar();
    };
  }, []);

  function imprimir() {
    document.body.classList.add('printing-worksheet');
    // Pequeño respiro para que el navegador aplique la clase antes del diálogo.
    setTimeout(() => window.print(), 50);
  }

  const esClave = modo === 'clave';

  return createPortal(
    <div className="worksheet-root fixed inset-0 z-50 bg-gray-100 overflow-auto">
      {/* Barra de herramientas (no se imprime) */}
      <div className="no-print sticky top-0 z-10 bg-ink text-white px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <button
          onClick={onClose}
          className="bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
        >
          ← Volver
        </button>

        <div className="flex gap-1.5 p-1 bg-white/10 rounded-xl">
          <button
            onClick={() => setModo('estudiante')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              !esClave ? 'bg-white text-ink shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            📝 Hoja del estudiante
          </button>
          <button
            onClick={() => setModo('clave')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              esClave ? 'bg-white text-ink shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            🔑 Clave del docente
          </button>
        </div>

        <button
          onClick={imprimir}
          className="bg-kahootGreen hover:bg-kahootGreen/90 px-5 py-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-sm"
        >
          🖨️ Imprimir / PDF
        </button>
      </div>

      {/* Hoja (esto sí se imprime) */}
      <div className="flex justify-center py-6 px-3">
        <div className="worksheet-page bg-white w-full max-w-[800px] p-8 md:p-12 shadow-lg">
          <Encabezado
            esClave={esClave}
            total={actividades.length}
            grado={grado}
            dificultad={dificultad}
            institucion={encabezado.institucion || ''}
            docente={encabezado.docente || ''}
            titulo={titulo}
            notas={notas}
            onInstitucion={(v) => setCampo('institucion', v)}
            onDocente={(v) => setCampo('docente', v)}
            onTitulo={setTitulo}
            onNotas={setNotas}
          />

          <ol className="mt-6 space-y-7 list-none">
            {actividades.map((act, i) => (
              <li key={i} className="worksheet-item">
                <ActividadImprimible actividad={act} numero={i + 1} esClave={esClave} />
              </li>
            ))}
          </ol>

          {esClave && (
            <p className="mt-10 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
              Clave del docente · no entregar al estudiante
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Encabezado tipo guía de colegio — campos editables por el docente.
// En pantalla los campos editables se ven con borde; al imprimir, el borde
// desaparece y queda como texto natural del documento.
// ---------------------------------------------------------------------------
function Encabezado({ esClave, total, grado, dificultad, institucion, docente, titulo, notas, onInstitucion, onDocente, onTitulo, onNotas }) {
  const metaTexto = [grado, dificultad].filter(Boolean).join(' · ');
  return (
    <header className="border-b-2 border-gray-800 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 max-w-sm space-y-2">
          <CampoEditable label="Institución educativa" value={institucion} onChange={onInstitucion} placeholder="Nombre de la institución" />
          <CampoEditable label="Docente" value={docente} onChange={onDocente} placeholder="Nombre del docente" />
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">Calificación</p>
          <div className="w-24 h-12 border-2 border-gray-800 rounded-md ml-auto" />
        </div>
      </div>

      <div className="my-4 text-center">
        <input
          value={titulo}
          onChange={(e) => onTitulo(e.target.value)}
          placeholder="Título de la guía"
          className="ws-title text-2xl md:text-3xl font-black text-center leading-tight w-full bg-transparent"
        />
        {metaTexto && <span className="block text-sm font-bold text-gray-500 mt-1">{metaTexto}</span>}
        {esClave && <span className="block text-base font-bold text-gray-500 mt-1">— CLAVE DE RESPUESTAS —</span>}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <CampoLinea label="Nombre del estudiante" ancho="flex-1 min-w-[240px]" />
        <CampoLinea label="Grado" ancho="w-32" />
        <CampoLinea label="Fecha" ancho="w-40" />
      </div>

      {/* Instrucciones / nota libre (opcional) */}
      <div className="mt-3">
        <textarea
          value={notas}
          onChange={(e) => onNotas(e.target.value)}
          placeholder="Instrucciones para el estudiante (opcional)…"
          rows={2}
          className="ws-notes no-print w-full text-sm rounded-md p-2 resize-y"
        />
        {notas.trim() && (
          <p className="hidden print:block text-sm text-gray-700 whitespace-pre-line mt-1">{notas}</p>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-3 font-bold">
        Total de actividades: {total}
      </p>
    </header>
  );
}

// Campo editable con etiqueta (institución, docente). Borde sutil en pantalla,
// línea limpia al imprimir.
function CampoEditable({ label, value, onChange, placeholder }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-gray-500 font-bold mb-0.5">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ws-field w-full text-sm font-bold bg-transparent"
      />
    </div>
  );
}

function CampoLinea({ label, ancho }) {
  return (
    <div className={ancho}>
      <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">{label}</span>
      <div className="border-b border-gray-400 h-6 mt-0.5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher por tipo
// ---------------------------------------------------------------------------
function ActividadImprimible({ actividad, numero, esClave }) {
  const tipo = actividad.tipo || 'seleccion_clasica';
  const props = { actividad, esClave };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <span className="font-black text-lg shrink-0">{numero}.</span>
        <div className="flex-1">
          {tipo === 'seleccion_clasica' && <Seleccion {...props} />}
          {tipo === 'detective_texto' && <Detective {...props} />}
          {tipo === 'verdad_mito' && <Binario {...props} a="Verdad" b="Mito" valorA="verdad" />}
          {tipo === 'real_inventado' && <Binario {...props} a="Real" b="Inventado" valorA="real" />}
          {tipo === 'caza_intruso' && <CazaIntruso {...props} numero={numero} />}
          {(tipo === 'rompecabezas_ideas' || tipo === 'paso_a_paso') && <Orden {...props} numero={numero} tipo={tipo} />}
          {tipo === 'parejas_logicas' && <Parejas {...props} numero={numero} />}
          {tipo === 'clasificador' && <Clasificador {...props} />}
          {tipo === 'palabras_perdidas' && <PalabrasPerdidas {...props} />}
        </div>
      </div>
    </div>
  );
}

// --- Helpers visuales ---
function Enunciado({ children }) {
  return <p className="font-bold text-[15px] leading-snug mb-2">{children}</p>;
}
const circulo = 'inline-block w-4 h-4 border-2 border-gray-700 rounded-full mr-2 align-middle';
const cuadro = 'inline-block w-4 h-4 border-2 border-gray-700 rounded-[3px] mr-2 align-middle';

// 1. seleccion_clasica
function Seleccion({ actividad, esClave }) {
  return (
    <>
      <Enunciado>{actividad.pregunta}</Enunciado>
      <ul className="space-y-1.5 ml-1">
        {actividad.opciones.map((op, i) => {
          const correcta = esClave && i === actividad.correcta;
          return (
            <li key={i} className={`text-[14px] ${correcta ? 'font-black' : ''}`}>
              <span className={correcta ? 'inline-block w-4 h-4 rounded-full bg-gray-800 mr-2 align-middle' : circulo} />
              <span className="font-bold mr-1">{LETRAS[i]})</span>
              {op}
              {correcta && <span className="ml-2">✓</span>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// 10. detective_texto
function Detective({ actividad, esClave }) {
  return (
    <>
      <div className="border border-gray-400 rounded-md p-3 mb-2 bg-gray-50 text-[14px] leading-relaxed italic">
        {actividad.pasaje}
      </div>
      <Seleccion actividad={actividad} esClave={esClave} />
    </>
  );
}

// 2 & 9. verdad_mito / real_inventado
function Binario({ actividad, esClave, a, b, valorA }) {
  const esA = actividad.correcto === valorA;
  return (
    <>
      <Enunciado>{actividad.enunciado}</Enunciado>
      <div className="flex gap-8 ml-1 text-[14px]">
        <span className={esClave && esA ? 'font-black' : ''}>
          <span className={esClave && esA ? 'inline-block w-4 h-4 bg-gray-800 rounded-[3px] mr-2 align-middle' : cuadro} />
          {a}{esClave && esA && ' ✓'}
        </span>
        <span className={esClave && !esA ? 'font-black' : ''}>
          <span className={esClave && !esA ? 'inline-block w-4 h-4 bg-gray-800 rounded-[3px] mr-2 align-middle' : cuadro} />
          {b}{esClave && !esA && ' ✓'}
        </span>
      </div>
      {esClave && actividad.explicacion && (
        <p className="text-[13px] text-gray-600 mt-1.5 ml-1">→ {actividad.explicacion}</p>
      )}
    </>
  );
}

// 5. caza_intruso
function CazaIntruso({ actividad, esClave }) {
  return (
    <>
      <Enunciado>{actividad.instruccion}</Enunciado>
      <p className="text-xs text-gray-500 mb-1.5 ml-1">Encierra en un círculo el que no pertenece al grupo.</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 ml-1 text-[14px]">
        {actividad.elementos.map((el, i) => {
          const intruso = esClave && i === actividad.intruso_idx;
          return (
            <span key={i} className={intruso ? 'font-black px-2 border-2 border-gray-800 rounded-full' : ''}>
              {el}{intruso && ' ✓'}
            </span>
          );
        })}
      </div>
    </>
  );
}

// 3 & 8. rompecabezas_ideas / paso_a_paso
function Orden({ actividad, esClave, numero, tipo }) {
  const items = tipo === 'rompecabezas_ideas' ? actividad.fragmentos : actividad.pasos;
  const seed = `worksheet-${numero}-${tipo}`;
  // Clave: orden correcto (reordenado con la clave si el contenido viene barajado).
  const correctos = ordenarPorClave(items, actividad.orden);
  const mostrados = esClave
    ? correctos.map((item, origIdx) => ({ item, origIdx }))
    : deterministicShuffle(items, seed);

  return (
    <>
      <Enunciado>{actividad.instruccion}</Enunciado>
      <p className="text-xs text-gray-500 mb-1.5 ml-1">
        {esClave ? 'Orden correcto:' : 'Escribe el número del orden correcto en cada línea.'}
      </p>
      <ul className="space-y-1.5 ml-1 text-[14px]">
        {mostrados.map(({ item, origIdx }, i) => (
          <li key={i} className={esClave ? 'font-bold' : ''}>
            <span className="inline-block w-7 border-b border-gray-500 text-center font-black mr-2 align-middle">
              {esClave ? origIdx + 1 : ' '}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}

// 4. parejas_logicas
function Parejas({ actividad, esClave, numero }) {
  const seed = `worksheet-parejas-${numero}`;
  const derechas = deterministicShuffle(actividad.pares.map(p => p.derecha), seed);

  return (
    <>
      <Enunciado>{actividad.instruccion}</Enunciado>
      <p className="text-xs text-gray-500 mb-1.5 ml-1">
        Escribe la letra de la definición correcta junto a cada número.
      </p>
      <div className="grid grid-cols-2 gap-x-8 ml-1 text-[14px]">
        <ul className="space-y-1.5">
          {actividad.pares.map((par, i) => {
            // La derecha correcta para la izquierda i está en el índice mapeo[i]
            // (o i, si no hay clave). Buscamos su letra en la columna barajada.
            const correctaIdx = Array.isArray(actividad.mapeo) ? actividad.mapeo[i] : i;
            const letraCorrecta = LETRAS[derechas.findIndex(d => d.origIdx === correctaIdx)];
            return (
              <li key={i}>
                <span className="inline-block w-7 border-b border-gray-500 text-center font-black mr-2 align-middle">
                  {esClave ? letraCorrecta : ' '}
                </span>
                <span className="font-bold">{i + 1}.</span> {par.izquierda}
              </li>
            );
          })}
        </ul>
        <ul className="space-y-1.5">
          {derechas.map(({ item }, i) => (
            <li key={i}><span className="font-bold mr-1">{LETRAS[i]})</span> {item}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

// 6. clasificador
function Clasificador({ actividad, esClave }) {
  const cats = actividad.categorias || [];
  const todos = cats.flatMap((c, ci) => (c.items || []).map(item => ({ item, ci })));
  const seed = `worksheet-clasif-${actividad.instruccion?.slice(0, 8)}`;
  const mezclados = esClave ? todos : deterministicShuffle(todos.map(t => t.item), seed).map(s => ({ item: s.item }));

  return (
    <>
      <Enunciado>{actividad.instruccion}</Enunciado>
      {!esClave ? (
        <>
          <p className="text-xs text-gray-500 mb-1.5 ml-1">
            Escribe junto a cada elemento la categoría a la que pertenece: <b>{cats.map(c => c.nombre).join('  ·  ')}</b>
          </p>
          <ul className="space-y-1.5 ml-1 text-[14px]">
            {mezclados.map(({ item }, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex-1">{item}</span>
                <span className="w-40 border-b border-gray-400 h-5" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 ml-1 text-[14px]">
          {cats.map((cat, ci) => (
            <div key={ci} className="border border-gray-400 rounded-md p-2">
              <p className="font-black border-b border-gray-300 mb-1 pb-1">{cat.nombre}</p>
              {(clasificacionCorrecta(actividad)[ci] || []).map((it, ii) => <p key={ii}>· {it}</p>)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// 7. palabras_perdidas
function PalabrasPerdidas({ actividad, esClave }) {
  const partes = (actividad.oracion || '').split('[___]');
  return (
    <>
      <p className="font-bold text-[15px] leading-loose mb-2">
        {partes.map((parte, i) => (
          <span key={i}>
            {parte}
            {i < partes.length - 1 && (
              esClave
                ? <u className="font-black px-1">{actividad.respuestas?.[i] || '____'}</u>
                : <span className="inline-block w-28 border-b border-gray-600 mx-1 align-middle" />
            )}
          </span>
        ))}
      </p>
      <div className="ml-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-bold mr-2">Banco de palabras:</span>
        <span className="text-[14px]">
          {(actividad.banco || []).map((w, i) => (
            <span key={i} className="inline-block border border-gray-400 rounded-md px-2 py-0.5 mr-1.5 mb-1.5">{w}</span>
          ))}
        </span>
      </div>
    </>
  );
}
