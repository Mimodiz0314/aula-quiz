import { useState } from 'react';
import { TIPOS, TIPOS_LISTA } from '../types/activityTypes.js';
import WorksheetPrint from './WorksheetPrint.jsx';

const OPTION_COLORS = ['bg-kahootRed', 'bg-kahootBlue', 'bg-kahootYellow', 'bg-kahootGreen'];

export default function ReviewActivities({ initialActividades, onConfirm, onCancel, tema = '' }) {
  const [actividades, setActividades] = useState(initialActividades);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [imprimir, setImprimir] = useState(false);

  function update(index, nuevoValor) {
    setActividades(prev => {
      const copia = [...prev];
      copia[index] = nuevoValor;
      return copia;
    });
  }

  function eliminar(index) {
    setActividades(prev => prev.filter((_, i) => i !== index));
  }

  function agregar(tipo) {
    setActividades(prev => [...prev, TIPOS[tipo].crear()]);
    setModalAgregar(false);
  }

  return (
    <div className="w-full space-y-6">
      {/* Barra de acciones */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm sticky top-4 z-10">
        <h2 className="text-2xl font-black">
          Revisar Actividades
          <span className="ml-2 text-base font-bold text-ink/40">({actividades.length})</span>
        </h2>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost text-deny">
            Cancelar
          </button>
          <button
            onClick={() => setImprimir(true)}
            disabled={actividades.length === 0}
            className="btn-secondary disabled:opacity-40"
          >
            🖨️ Imprimir / PDF
          </button>
          <button
            onClick={() => onConfirm(actividades)}
            disabled={actividades.length === 0}
            className="btn-primary bg-kahootGreen disabled:opacity-40"
          >
            Iniciar Sala ✨
          </button>
        </div>
      </div>

      {imprimir && (
        <WorksheetPrint
          actividades={actividades}
          tema={tema}
          onClose={() => setImprimir(false)}
        />
      )}

      {/* Lista de actividades */}
      <div className="space-y-6">
        {actividades.map((actividad, idx) => (
          <ActivityCard
            key={idx}
            index={idx}
            actividad={actividad}
            onChange={val => update(idx, val)}
            onDelete={() => eliminar(idx)}
          />
        ))}
      </div>

      {/* Botón agregar */}
      <button
        onClick={() => setModalAgregar(true)}
        className="w-full p-6 border-4 border-dashed border-ink/20 rounded-2xl text-ink/50 font-bold hover:bg-ink/5 hover:text-ink hover:border-ink/40 transition-all"
      >
        + Agregar nueva actividad
      </button>

      {/* Modal selector de tipo */}
      {modalAgregar && (
        <ModalSelectorTipo
          onSelect={agregar}
          onClose={() => setModalAgregar(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta contenedora por actividad
// ---------------------------------------------------------------------------
function ActivityCard({ index, actividad, onChange, onDelete }) {
  const tipoInfo = TIPOS[actividad.tipo] ?? {
    label: actividad.tipo,
    emoji: '❓',
    colorBorder: 'border-mist',
    colorBadge: 'bg-ink/5 text-ink/60',
  };

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-8 ${tipoInfo.colorBorder}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">{tipoInfo.emoji}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${tipoInfo.colorBadge}`}>
            {tipoInfo.label}
          </span>
          <span className="text-xs font-bold text-ink/30">#{index + 1}</span>
        </div>
        <button onClick={onDelete} className="text-deny hover:text-red-600 font-bold text-sm shrink-0">
          ✕ Eliminar
        </button>
      </div>

      <ActivityEditor actividad={actividad} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher — elige el editor correcto según tipo
// ---------------------------------------------------------------------------
function ActivityEditor({ actividad, onChange }) {
  switch (actividad.tipo) {
    case 'seleccion_clasica': return <SeleccionClasicaEditor a={actividad} onChange={onChange} />;
    case 'verdad_mito':       return <VerdadMitoEditor        a={actividad} onChange={onChange} />;
    case 'rompecabezas_ideas':return <RompecabezasEditor      a={actividad} onChange={onChange} />;
    case 'parejas_logicas':   return <ParejasEditor           a={actividad} onChange={onChange} />;
    case 'caza_intruso':      return <CazaIntrusoEditor       a={actividad} onChange={onChange} />;
    case 'clasificador':      return <ClasificadorEditor      a={actividad} onChange={onChange} />;
    case 'palabras_perdidas': return <PalabrasPierdidasEditor a={actividad} onChange={onChange} />;
    case 'paso_a_paso':       return <PasoAPasoEditor         a={actividad} onChange={onChange} />;
    case 'real_inventado':    return <RealInventadoEditor     a={actividad} onChange={onChange} />;
    case 'detective_texto':   return <DetectiveTextoEditor    a={actividad} onChange={onChange} />;
    default: return <p className="text-ink/40 font-bold">Tipo desconocido: {actividad.tipo}</p>;
  }
}

// ---------------------------------------------------------------------------
// Helpers reutilizables
// ---------------------------------------------------------------------------
function Campo({ label, hint, children }) {
  return (
    <div>
      <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs font-bold text-ink/40 mt-1 ml-1">{hint}</p>}
    </div>
  );
}

function Toggle2({ value, opciones, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {opciones.map(({ val, label }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors ${
            value === val
              ? 'bg-ink text-white'
              : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. seleccion_clasica
// ---------------------------------------------------------------------------
function SeleccionClasicaEditor({ a, onChange }) {
  function setPregunta(val) { onChange({ ...a, pregunta: val }); }
  function setOpcion(i, val) {
    const op = [...a.opciones]; op[i] = val;
    onChange({ ...a, opciones: op });
  }
  function setCorrecta(i) { onChange({ ...a, correcta: i }); }

  return (
    <div className="space-y-5">
      <Campo label="Pregunta">
        <textarea
          className="field w-full resize-y text-lg font-bold"
          rows={2}
          value={a.pregunta}
          onChange={e => setPregunta(e.target.value)}
          placeholder="Escribe el enunciado de la pregunta"
        />
      </Campo>
      <div className="grid md:grid-cols-2 gap-4">
        {a.opciones.map((op, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`correcta-${a.pregunta?.slice(0, 10)}-${i}`}
                checked={a.correcta === i}
                onChange={() => setCorrecta(i)}
                className="w-4 h-4 accent-kahootGreen cursor-pointer"
              />
              <label className="text-xs font-bold text-ink/50 uppercase">
                Opción {i + 1} {a.correcta === i && '· Correcta ✓'}
              </label>
            </div>
            <div className="flex items-center">
              <div className={`w-3 min-h-[44px] rounded-l-lg ${OPTION_COLORS[i]} opacity-70`} />
              <input
                className="field flex-1 rounded-l-none border-l-0"
                value={op}
                onChange={e => setOpcion(i, e.target.value)}
                placeholder={`Respuesta ${i + 1}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. verdad_mito
// ---------------------------------------------------------------------------
function VerdadMitoEditor({ a, onChange }) {
  return (
    <div className="space-y-5">
      <Campo label="Enunciado">
        <textarea
          className="field w-full resize-y"
          rows={2}
          value={a.enunciado}
          onChange={e => onChange({ ...a, enunciado: e.target.value })}
          placeholder="Escribe la afirmación que el estudiante debe evaluar"
        />
      </Campo>
      <Campo label="¿Es verdad o mito?">
        <Toggle2
          value={a.correcto}
          opciones={[{ val: 'verdad', label: '✅ Verdad' }, { val: 'mito', label: '❌ Mito' }]}
          onChange={val => onChange({ ...a, correcto: val })}
        />
      </Campo>
      <Campo label="Justificación (opcional)" hint="El estudiante verá esta explicación al revelar la respuesta.">
        <textarea
          className="field w-full resize-y"
          rows={2}
          value={a.explicacion}
          onChange={e => onChange({ ...a, explicacion: e.target.value })}
          placeholder="¿Por qué es verdad o mito?"
        />
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. rompecabezas_ideas
// ---------------------------------------------------------------------------
function RompecabezasEditor({ a, onChange }) {
  function setFragmento(i, val) {
    const f = [...a.fragmentos]; f[i] = val;
    onChange({ ...a, fragmentos: f });
  }
  function agregar() { onChange({ ...a, fragmentos: [...a.fragmentos, ''] }); }
  function quitar(i) { onChange({ ...a, fragmentos: a.fragmentos.filter((_, j) => j !== i) }); }

  return (
    <div className="space-y-5">
      <Campo label="Instrucción">
        <input
          className="field w-full"
          value={a.instruccion}
          onChange={e => onChange({ ...a, instruccion: e.target.value })}
          placeholder="Ej. Ordena los eventos de la Revolución Francesa:"
        />
      </Campo>
      <Campo
        label="Fragmentos (en orden correcto)"
        hint="Escríbelos en el orden correcto. Los estudiantes los verán desordenados."
      >
        <div className="space-y-2">
          {a.fragmentos.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-ink/10 flex items-center justify-center font-black text-sm shrink-0">
                {i + 1}
              </span>
              <input
                className="field flex-1"
                value={f}
                onChange={e => setFragmento(i, e.target.value)}
                placeholder={`Fragmento ${i + 1}`}
              />
              {a.fragmentos.length > 2 && (
                <button onClick={() => quitar(i)} className="text-deny font-bold text-sm shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={agregar}
          className="mt-2 text-sm font-bold text-kahootBlue hover:underline"
        >
          + Añadir fragmento
        </button>
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. parejas_logicas
// ---------------------------------------------------------------------------
function ParejasEditor({ a, onChange }) {
  function setPar(i, lado, val) {
    const pares = a.pares.map((p, j) => j === i ? { ...p, [lado]: val } : p);
    onChange({ ...a, pares });
  }
  function agregar() {
    onChange({ ...a, pares: [...a.pares, { izquierda: '', derecha: '' }] });
  }
  function quitar(i) {
    onChange({ ...a, pares: a.pares.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-5">
      <Campo label="Instrucción">
        <input
          className="field w-full"
          value={a.instruccion}
          onChange={e => onChange({ ...a, instruccion: e.target.value })}
          placeholder="Ej. Empareja cada concepto con su definición:"
        />
      </Campo>
      <Campo label="Parejas" hint="Cada fila forma una pareja correcta.">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 mb-1">
            <span className="text-xs font-bold text-ink/40 uppercase tracking-wider px-1">Columna izquierda</span>
            <span className="text-xs font-bold text-ink/40 uppercase tracking-wider px-1">Columna derecha</span>
          </div>
          {a.pares.map((par, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="field flex-1"
                value={par.izquierda}
                onChange={e => setPar(i, 'izquierda', e.target.value)}
                placeholder={`Concepto ${i + 1}`}
              />
              <span className="font-black text-ink/30 shrink-0">↔</span>
              <input
                className="field flex-1"
                value={par.derecha}
                onChange={e => setPar(i, 'derecha', e.target.value)}
                placeholder={`Definición ${i + 1}`}
              />
              {a.pares.length > 2 && (
                <button onClick={() => quitar(i)} className="text-deny font-bold text-sm shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={agregar} className="mt-2 text-sm font-bold text-kahootBlue hover:underline">
          + Añadir pareja
        </button>
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. caza_intruso
// ---------------------------------------------------------------------------
function CazaIntrusoEditor({ a, onChange }) {
  function setElemento(i, val) {
    const el = [...a.elementos]; el[i] = val;
    onChange({ ...a, elementos: el });
  }
  function agregar() { onChange({ ...a, elementos: [...a.elementos, ''] }); }
  function quitar(i) {
    const el = a.elementos.filter((_, j) => j !== i);
    const intruso = a.intruso_idx >= el.length ? 0 : a.intruso_idx;
    onChange({ ...a, elementos: el, intruso_idx: intruso });
  }

  return (
    <div className="space-y-5">
      <Campo label="Instrucción">
        <input
          className="field w-full"
          value={a.instruccion}
          onChange={e => onChange({ ...a, instruccion: e.target.value })}
          placeholder="Ej. ¿Cuál de estos elementos no pertenece al grupo?"
        />
      </Campo>
      <Campo label="Elementos" hint="Marca con el radio cuál es el intruso.">
        <div className="space-y-2">
          {a.elementos.map((el, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`intruso-${i}-${a.instruccion?.slice(0, 10)}`}
                checked={a.intruso_idx === i}
                onChange={() => onChange({ ...a, intruso_idx: i })}
                className="w-4 h-4 accent-kahootRed cursor-pointer shrink-0"
              />
              <input
                className={`field flex-1 ${a.intruso_idx === i ? 'border-kahootRed/60 bg-red-50' : ''}`}
                value={el}
                onChange={e => setElemento(i, e.target.value)}
                placeholder={`Elemento ${i + 1}`}
              />
              {a.elementos.length > 3 && (
                <button onClick={() => quitar(i)} className="text-deny font-bold text-sm shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={agregar} className="mt-2 text-sm font-bold text-kahootBlue hover:underline">
          + Añadir elemento
        </button>
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. clasificador
// ---------------------------------------------------------------------------
function ClasificadorEditor({ a, onChange }) {
  function setCategoria(ci, campo, val) {
    const cats = a.categorias.map((c, i) => i === ci ? { ...c, [campo]: val } : c);
    onChange({ ...a, categorias: cats });
  }
  function setItem(ci, ii, val) {
    const cats = a.categorias.map((c, i) => {
      if (i !== ci) return c;
      const items = c.items.map((it, j) => j === ii ? val : it);
      return { ...c, items };
    });
    onChange({ ...a, categorias: cats });
  }
  function agregarItem(ci) {
    const cats = a.categorias.map((c, i) =>
      i === ci ? { ...c, items: [...c.items, ''] } : c
    );
    onChange({ ...a, categorias: cats });
  }
  function quitarItem(ci, ii) {
    const cats = a.categorias.map((c, i) =>
      i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c
    );
    onChange({ ...a, categorias: cats });
  }

  return (
    <div className="space-y-5">
      <Campo label="Instrucción">
        <input
          className="field w-full"
          value={a.instruccion}
          onChange={e => onChange({ ...a, instruccion: e.target.value })}
          placeholder="Ej. Clasifica cada elemento en su categoría correcta:"
        />
      </Campo>
      <div className="grid md:grid-cols-2 gap-4">
        {a.categorias.map((cat, ci) => (
          <div key={ci} className="border-2 border-mist rounded-2xl p-4 space-y-3">
            <input
              className="field w-full font-bold"
              value={cat.nombre}
              onChange={e => setCategoria(ci, 'nombre', e.target.value)}
              placeholder={`Nombre categoría ${ci + 1}`}
            />
            <div className="space-y-2">
              {cat.items.map((item, ii) => (
                <div key={ii} className="flex gap-2">
                  <input
                    className="field flex-1 text-sm"
                    value={item}
                    onChange={e => setItem(ci, ii, e.target.value)}
                    placeholder={`Elemento ${ii + 1}`}
                  />
                  {cat.items.length > 1 && (
                    <button onClick={() => quitarItem(ci, ii)} className="text-deny font-bold text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => agregarItem(ci)}
              className="text-xs font-bold text-kahootBlue hover:underline"
            >
              + Añadir elemento
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. palabras_perdidas
// ---------------------------------------------------------------------------
function PalabrasPierdidasEditor({ a, onChange }) {
  function setBancoWord(i, val) {
    const banco = [...a.banco]; banco[i] = val;
    onChange({ ...a, banco });
  }
  function setRespuesta(i, val) {
    const respuestas = [...a.respuestas]; respuestas[i] = val;
    onChange({ ...a, respuestas });
  }
  function agregarBanco() { onChange({ ...a, banco: [...a.banco, ''] }); }
  function quitarBanco(i) { onChange({ ...a, banco: a.banco.filter((_, j) => j !== i) }); }
  function agregarRespuesta() { onChange({ ...a, respuestas: [...a.respuestas, ''] }); }
  function quitarRespuesta(i) {
    onChange({ ...a, respuestas: a.respuestas.filter((_, j) => j !== i) });
  }

  const blancos = (a.oracion.match(/\[___\]/g) || []).length;

  return (
    <div className="space-y-5">
      <Campo
        label="Oración con espacios en blanco"
        hint={`Usa [___] para cada espacio en blanco. Blancos detectados: ${blancos}`}
      >
        <textarea
          className="field w-full resize-y font-mono"
          rows={3}
          value={a.oracion}
          onChange={e => onChange({ ...a, oracion: e.target.value })}
          placeholder="Ej. La [___] ocurre en los [___] de las plantas con luz solar."
        />
      </Campo>
      <div className="grid md:grid-cols-2 gap-4">
        <Campo label="Banco de palabras" hint="Incluye las correctas + algunas distractoras.">
          <div className="space-y-2">
            {a.banco.map((w, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field flex-1 text-sm"
                  value={w}
                  onChange={e => setBancoWord(i, e.target.value)}
                  placeholder={`Palabra ${i + 1}`}
                />
                {a.banco.length > 1 && (
                  <button onClick={() => quitarBanco(i)} className="text-deny font-bold text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={agregarBanco} className="mt-2 text-xs font-bold text-kahootBlue hover:underline">
            + Añadir palabra
          </button>
        </Campo>
        <Campo label="Respuestas correctas (en orden)" hint="Una por cada [___] en la oración.">
          <div className="space-y-2">
            {a.respuestas.map((r, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-7 h-9 rounded-lg bg-ink/10 flex items-center justify-center font-black text-sm shrink-0">
                  {i + 1}
                </span>
                <input
                  className="field flex-1 text-sm"
                  value={r}
                  onChange={e => setRespuesta(i, e.target.value)}
                  placeholder={`Respuesta ${i + 1}`}
                />
                {a.respuestas.length > 1 && (
                  <button onClick={() => quitarRespuesta(i)} className="text-deny font-bold text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={agregarRespuesta} className="mt-2 text-xs font-bold text-kahootBlue hover:underline">
            + Añadir respuesta
          </button>
        </Campo>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. paso_a_paso
// ---------------------------------------------------------------------------
function PasoAPasoEditor({ a, onChange }) {
  function setPaso(i, val) {
    const pasos = [...a.pasos]; pasos[i] = val;
    onChange({ ...a, pasos });
  }
  function agregar() { onChange({ ...a, pasos: [...a.pasos, ''] }); }
  function quitar(i) { onChange({ ...a, pasos: a.pasos.filter((_, j) => j !== i) }); }

  return (
    <div className="space-y-5">
      <Campo label="Instrucción">
        <input
          className="field w-full"
          value={a.instruccion}
          onChange={e => onChange({ ...a, instruccion: e.target.value })}
          placeholder="Ej. Ordena los pasos del proceso de fotosíntesis:"
        />
      </Campo>
      <Campo
        label="Pasos (en orden correcto)"
        hint="Escríbelos en el orden correcto. Los estudiantes los verán desordenados."
      >
        <div className="space-y-2">
          {a.pasos.map((paso, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-ink/10 flex items-center justify-center font-black text-sm shrink-0">
                {i + 1}
              </span>
              <input
                className="field flex-1"
                value={paso}
                onChange={e => setPaso(i, e.target.value)}
                placeholder={`Paso ${i + 1}`}
              />
              {a.pasos.length > 2 && (
                <button onClick={() => quitar(i)} className="text-deny font-bold text-sm shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={agregar} className="mt-2 text-sm font-bold text-kahootBlue hover:underline">
          + Añadir paso
        </button>
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. real_inventado
// ---------------------------------------------------------------------------
function RealInventadoEditor({ a, onChange }) {
  return (
    <div className="space-y-5">
      <Campo label="Enunciado">
        <textarea
          className="field w-full resize-y"
          rows={2}
          value={a.enunciado}
          onChange={e => onChange({ ...a, enunciado: e.target.value })}
          placeholder="Escribe el hecho o la afirmación que el estudiante debe evaluar"
        />
      </Campo>
      <Campo label="¿Es real o inventado?">
        <Toggle2
          value={a.correcto}
          opciones={[{ val: 'real', label: '✅ Real' }, { val: 'inventado', label: '🎭 Inventado' }]}
          onChange={val => onChange({ ...a, correcto: val })}
        />
      </Campo>
      <Campo label="Justificación (opcional)" hint="El estudiante verá esta explicación al revelar la respuesta.">
        <textarea
          className="field w-full resize-y"
          rows={2}
          value={a.explicacion}
          onChange={e => onChange({ ...a, explicacion: e.target.value })}
          placeholder="¿Por qué es real o inventado?"
        />
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. detective_texto
// ---------------------------------------------------------------------------
function DetectiveTextoEditor({ a, onChange }) {
  function setOpcion(i, val) {
    const op = [...a.opciones]; op[i] = val;
    onChange({ ...a, opciones: op });
  }

  return (
    <div className="space-y-5">
      <Campo label="Pasaje de lectura">
        <textarea
          className="field w-full resize-y"
          rows={4}
          value={a.pasaje}
          onChange={e => onChange({ ...a, pasaje: e.target.value })}
          placeholder="Escribe el fragmento de texto que los estudiantes deben leer (2–4 oraciones)"
        />
      </Campo>
      <Campo label="Pregunta de comprensión">
        <textarea
          className="field w-full resize-y"
          rows={2}
          value={a.pregunta}
          onChange={e => onChange({ ...a, pregunta: e.target.value })}
          placeholder="¿Qué pregunta debe responder el estudiante sobre el pasaje?"
        />
      </Campo>
      <div className="grid md:grid-cols-2 gap-4">
        {a.opciones.map((op, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`correcta-detective-${a.pregunta?.slice(0, 10)}-${i}`}
                checked={a.correcta === i}
                onChange={() => onChange({ ...a, correcta: i })}
                className="w-4 h-4 accent-kahootGreen cursor-pointer"
              />
              <label className="text-xs font-bold text-ink/50 uppercase">
                Opción {i + 1} {a.correcta === i && '· Correcta ✓'}
              </label>
            </div>
            <div className="flex items-center">
              <div className={`w-3 min-h-[44px] rounded-l-lg ${OPTION_COLORS[i]} opacity-70`} />
              <input
                className="field flex-1 rounded-l-none border-l-0"
                value={op}
                onChange={e => setOpcion(i, e.target.value)}
                placeholder={`Respuesta ${i + 1}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: selector de tipo para agregar manualmente
// ---------------------------------------------------------------------------
function ModalSelectorTipo({ onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-2xl mb-2">Agregar actividad</h3>
        <p className="font-bold text-ink/50 text-sm mb-6">¿Qué tipo de actividad quieres añadir?</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TIPOS_LISTA.map(({ key, label, emoji, desc }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-mist hover:border-kahootBlue hover:shadow-sm hover:bg-kahootBlue/5 transition-all text-left"
            >
              <span className="text-2xl shrink-0">{emoji}</span>
              <div className="min-w-0">
                <div className="font-black text-sm truncate">{label}</div>
                <div className="font-bold text-xs text-ink/40 truncate">{desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
