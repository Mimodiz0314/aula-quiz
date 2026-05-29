import { useCallback, useMemo, useState } from 'react';
import { registrarRespuesta } from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';
import { deterministicShuffle } from '../../utils/shuffle.js';

const Triangle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L22 20H2L12 2Z" /></svg>;
const Diamond = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>;
const Circle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><circle cx="12" cy="12" r="10" /></svg>;
const Square = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
const SHAPES = [Triangle, Diamond, Circle, Square];
const OPTION_COLORS = ['option-red', 'option-blue', 'option-yellow', 'option-green'];
const CATEGORY_COLORS = ['bg-kahootBlue text-white', 'bg-kahootGreen text-white'];
const CATEGORY_BORDERS = ['border-kahootBlue', 'border-kahootGreen'];

// ---------------------------------------------------------------------------
// Componente raíz
// ---------------------------------------------------------------------------
export default function Question({ pin, studentId, sesion, yo, bloqueado }) {
  const idx = sesion.pregunta_idx;
  const actividad = sesion.preguntas[idx];
  const total = sesion.preguntas.length;
  const esSinLimite = sesion.pregunta_duracion === 0;

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    !bloqueado
  );

  const yaRespondio = yo.respuestas_registradas?.[idx] !== undefined;
  const miRespuesta = yo.respuestas_registradas?.[idx];

  const responder = useCallback(
    async (valor) => {
      await registrarRespuesta(pin, studentId, idx, valor);
    },
    [pin, studentId, idx]
  );

  if (!actividad) return null;

  const seed = `${pin}-${idx}`;
  const props = { actividad, bloqueado, yaRespondio, miRespuesta, responder, seed };

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-8 bg-gameBg">
      {/* Header compartido */}
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => window.location.href = '/'}
          className="bg-white/80 backdrop-blur text-ink px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-white transition-colors"
        >
          ⌂ Inicio
        </button>
        <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-black/5 px-4 py-2 rounded-full">
          {idx + 1} de {total}
        </div>
        <div className={`font-black tabular-nums text-3xl md:text-4xl bg-white w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full shadow-md ${
          !bloqueado && !esSinLimite && restante <= 5 ? 'text-kahootRed animate-pulse' : 'text-ink'
        }`}>
          {bloqueado ? '0' : (esSinLimite ? '∞' : restante)}
        </div>
      </header>

      {/* Dispatcher por tipo */}
      {actividad.tipo === 'seleccion_clasica' && <SeleccionUI {...props} />}
      {actividad.tipo === 'verdad_mito' && (
        <BinarioUI {...props}
          enunciado={actividad.enunciado}
          opciones={[
            { val: 'verdad',    label: '✅ Verdad',    color: 'bg-kahootGreen' },
            { val: 'mito',      label: '❌ Mito',      color: 'bg-kahootRed'   },
          ]}
        />
      )}
      {actividad.tipo === 'real_inventado' && (
        <BinarioUI {...props}
          enunciado={actividad.enunciado}
          opciones={[
            { val: 'real',      label: '✅ Real',      color: 'bg-kahootBlue'  },
            { val: 'inventado', label: '🎭 Inventado', color: 'bg-kahootRed'   },
          ]}
        />
      )}
      {actividad.tipo === 'caza_intruso'       && <CazaIntrusoUI    {...props} />}
      {actividad.tipo === 'detective_texto'     && <DetectiveTextoUI {...props} />}
      {actividad.tipo === 'rompecabezas_ideas'  && (
        <OrdenUI {...props} items={actividad.fragmentos} instruccion={actividad.instruccion} />
      )}
      {actividad.tipo === 'paso_a_paso' && (
        <OrdenUI {...props} items={actividad.pasos} instruccion={actividad.instruccion} />
      )}
      {actividad.tipo === 'parejas_logicas'    && <ParejasUI          {...props} />}
      {actividad.tipo === 'clasificador'       && <ClasificadorUI     {...props} />}
      {actividad.tipo === 'palabras_perdidas'  && <PalabrasPierdidasUI {...props} />}
      {/* Fallback para actividades sin tipo (compatibilidad hacia atrás) */}
      {!actividad.tipo && <SeleccionUI {...props} actividad={{ ...actividad, tipo: 'seleccion_clasica' }} />}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function EnunciadoCard({ children }) {
  return (
    <section className="mb-4 flex-1 flex items-center justify-center">
      <div className="bg-white w-full py-6 md:py-10 px-6 md:px-10 rounded-2xl shadow-sm text-center">
        {children}
      </div>
    </section>
  );
}

function BotonConfirmar({ onClick, disabled, label = 'Confirmar respuesta' }) {
  return (
    <footer className="mt-4 text-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className="btn-primary bg-kahootGreen px-10 disabled:opacity-40"
      >
        {label}
      </button>
    </footer>
  );
}

function YaRespondio() {
  return (
    <footer className="text-center font-bold text-ink/60 pb-4 mt-4 animate-fade-in">
      ¡Respuesta enviada!
    </footer>
  );
}

// ---------------------------------------------------------------------------
// 1. seleccion_clasica
// ---------------------------------------------------------------------------
function SeleccionUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder }) {
  const [pendiente, setPendiente] = useState(null);

  async function onElegir(i) {
    if (bloqueado || yaRespondio || pendiente !== null) return;
    setPendiente(i);
    await responder(i);
  }

  const opcionActiva = miRespuesta !== undefined ? miRespuesta : pendiente;
  const confirmada = miRespuesta !== undefined;

  return (
    <>
      <EnunciadoCard>
        <h2 className="font-black text-2xl md:text-4xl leading-tight">{actividad.pregunta}</h2>
      </EnunciadoCard>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-4">
        {actividad.opciones.map((op, i) => {
          const Shape = SHAPES[i % 4];
          const colorClass = OPTION_COLORS[i % 4];
          const esActiva = opcionActiva === i;
          const otraSeleccionada = opcionActiva !== null && opcionActiva !== undefined && !esActiva;
          return (
            <button
              key={i}
              onClick={() => onElegir(i)}
              disabled={bloqueado || otraSeleccionada}
              className={`btn-3d ${colorClass} flex flex-col items-center justify-center min-h-[140px] p-4 ${
                otraSeleccionada ? 'opacity-30 grayscale-[50%]' : ''
              }`}
            >
              <div className="flex items-center w-full gap-4">
                <div className="shrink-0 drop-shadow-md"><Shape /></div>
                <span className="flex-1 text-left text-xl md:text-2xl font-bold leading-tight break-words">{op}</span>
                {esActiva && (
                  <div className="shrink-0 bg-white/20 rounded-full p-2">
                    {confirmada ? '✓' : '…'}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </section>
      {opcionActiva !== null && opcionActiva !== undefined && (
        <footer className="text-center font-bold text-ink/60 pb-4 animate-fade-in">
          {confirmada ? '¡Respuesta enviada!' : 'Registrando…'}
        </footer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 2 & 9. verdad_mito / real_inventado — dos opciones grandes
// ---------------------------------------------------------------------------
function BinarioUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder, enunciado, opciones }) {
  const [pendiente, setPendiente] = useState(null);

  async function onElegir(val) {
    if (bloqueado || yaRespondio || pendiente !== null) return;
    setPendiente(val);
    await responder(val);
  }

  const elegida = miRespuesta ?? pendiente;
  const confirmada = miRespuesta !== undefined;

  return (
    <>
      <EnunciadoCard>
        <h2 className="font-black text-2xl md:text-3xl leading-snug">{enunciado}</h2>
      </EnunciadoCard>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        {opciones.map(({ val, label, color }) => {
          const esElegida = elegida === val;
          const otraElegida = elegida !== null && elegida !== undefined && !esElegida;
          return (
            <button
              key={val}
              onClick={() => onElegir(val)}
              disabled={bloqueado || otraElegida}
              className={`${color} text-white rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.2)] min-h-[120px] font-black text-2xl md:text-3xl transition-all active:translate-y-1 ${
                otraElegida ? 'opacity-30 grayscale-[50%]' : ''
              } ${esElegida ? 'ring-4 ring-white/60' : ''}`}
            >
              <div className="flex items-center justify-center gap-3 p-6">
                {label}
                {esElegida && <span className="text-2xl">{confirmada ? '✓' : '…'}</span>}
              </div>
            </button>
          );
        })}
      </section>
      {elegida && (
        <footer className="text-center font-bold text-ink/60 pb-4 animate-fade-in">
          {confirmada ? '¡Respuesta enviada!' : 'Registrando…'}
        </footer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. caza_intruso
// ---------------------------------------------------------------------------
function CazaIntrusoUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder }) {
  const [pendiente, setPendiente] = useState(null);

  async function onElegir(i) {
    if (bloqueado || yaRespondio || pendiente !== null) return;
    setPendiente(i);
    await responder(i);
  }

  const elegido = miRespuesta !== undefined ? Number(miRespuesta) : pendiente;
  const confirmada = miRespuesta !== undefined;

  return (
    <>
      <EnunciadoCard>
        <p className="font-bold text-sm tracking-widest uppercase text-ink/50 mb-2">🔍 Caza el Intruso</p>
        <h2 className="font-black text-xl md:text-2xl">{actividad.instruccion}</h2>
      </EnunciadoCard>
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
        {actividad.elementos.map((el, i) => {
          const esElegido = elegido === i;
          const otroElegido = elegido !== null && elegido !== undefined && !esElegido;
          return (
            <button
              key={i}
              onClick={() => onElegir(i)}
              disabled={bloqueado || otroElegido}
              className={`bg-white border-2 rounded-2xl p-4 font-bold text-lg shadow-sm transition-all text-center ${
                esElegido
                  ? 'border-kahootRed bg-kahootRed/5 ring-2 ring-kahootRed/40'
                  : otroElegido
                    ? 'opacity-30 border-mist'
                    : 'border-mist hover:border-kahootBlue hover:shadow-md'
              }`}
            >
              {el}
              {esElegido && <div className="mt-1 text-sm text-kahootRed">{confirmada ? '✓' : '…'}</div>}
            </button>
          );
        })}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 10. detective_texto — pasaje + 4 botones
// ---------------------------------------------------------------------------
function DetectiveTextoUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder }) {
  const [pendiente, setPendiente] = useState(null);

  async function onElegir(i) {
    if (bloqueado || yaRespondio || pendiente !== null) return;
    setPendiente(i);
    await responder(i);
  }

  const opcionActiva = miRespuesta !== undefined ? miRespuesta : pendiente;
  const confirmada = miRespuesta !== undefined;

  return (
    <>
      <section className="mb-4">
        <div className="bg-white w-full p-5 md:p-8 rounded-2xl shadow-sm border-l-4 border-kahootBlue mb-4">
          <p className="font-bold text-xs tracking-widest uppercase text-kahootBlue mb-3">🕵️ Pasaje</p>
          <p className="text-base md:text-lg font-bold text-ink leading-relaxed">{actividad.pasaje}</p>
        </div>
        <div className="bg-white w-full py-5 px-6 rounded-2xl shadow-sm text-center">
          <h2 className="font-black text-xl md:text-3xl leading-tight">{actividad.pregunta}</h2>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {actividad.opciones.map((op, i) => {
          const Shape = SHAPES[i % 4];
          const colorClass = OPTION_COLORS[i % 4];
          const esActiva = opcionActiva === i;
          const otraSeleccionada = opcionActiva !== null && opcionActiva !== undefined && !esActiva;
          return (
            <button
              key={i}
              onClick={() => onElegir(i)}
              disabled={bloqueado || otraSeleccionada}
              className={`btn-3d ${colorClass} flex items-center min-h-[80px] p-4 ${
                otraSeleccionada ? 'opacity-30 grayscale-[50%]' : ''
              }`}
            >
              <div className="flex items-center w-full gap-3">
                <div className="shrink-0 drop-shadow-md"><Shape /></div>
                <span className="flex-1 text-left text-lg font-bold leading-tight">{op}</span>
                {esActiva && <span className="shrink-0">{confirmada ? '✓' : '…'}</span>}
              </div>
            </button>
          );
        })}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3 & 8. rompecabezas_ideas / paso_a_paso — tap para ordenar
// ---------------------------------------------------------------------------
function OrdenUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder, items: itemsProp, instruccion, seed }) {
  const items = itemsProp ?? []; // guard: evita crash si la actividad no tiene el campo
  const shuffled = useMemo(() => deterministicShuffle(items, seed), [items, seed]);
  const [sequencia, setSequencia] = useState([]); // origIdx[]
  const [cargando, setCargando] = useState(false);

  const confirmada = yaRespondio;
  const respuestaGuardada = miRespuesta ? (() => { try { return JSON.parse(miRespuesta); } catch { return null; } })() : null;

  function toggleItem(origIdx) {
    if (bloqueado || confirmada || cargando) return;
    setSequencia(prev =>
      prev.includes(origIdx)
        ? prev.filter(v => v !== origIdx)
        : [...prev, origIdx]
    );
  }

  async function confirmar() {
    if (sequencia.length !== items.length || cargando) return;
    setCargando(true);
    await responder(JSON.stringify(sequencia));
    setCargando(false);
  }

  if (confirmada && respuestaGuardada) {
    return (
      <>
        <EnunciadoCard>
          <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">🧩 Tu orden</p>
          <h2 className="font-black text-xl md:text-2xl mb-4">{instruccion}</h2>
          <div className="space-y-2 text-left">
            {respuestaGuardada.map((origIdx, pos) => (
              <div key={pos} className="flex items-center gap-3 bg-kahootGreen/10 rounded-xl p-3">
                <span className="w-8 h-8 rounded-full bg-kahootGreen text-white font-black text-sm flex items-center justify-center shrink-0">
                  {pos + 1}
                </span>
                <span className="font-bold">{items[origIdx]}</span>
              </div>
            ))}
          </div>
        </EnunciadoCard>
        <YaRespondio />
      </>
    );
  }

  return (
    <>
      <EnunciadoCard>
        <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">
          🧩 Ordena los elementos
        </p>
        <h2 className="font-black text-xl md:text-2xl">{instruccion}</h2>
      </EnunciadoCard>

      <section className="space-y-2 mb-4">
        {shuffled.map(({ item, origIdx }) => {
          const pos = sequencia.indexOf(origIdx);
          const colocado = pos !== -1;
          return (
            <button
              key={origIdx}
              onClick={() => toggleItem(origIdx)}
              disabled={bloqueado}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-lg transition-all text-left ${
                colocado
                  ? 'border-kahootBlue bg-kahootBlue/5 shadow-sm'
                  : 'border-mist bg-white hover:border-kahootBlue/50'
              }`}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                colocado ? 'bg-kahootBlue text-white' : 'bg-ink/10 text-ink/40'
              }`}>
                {colocado ? pos + 1 : '?'}
              </span>
              {item}
            </button>
          );
        })}
      </section>

      <div className="flex items-center justify-between pb-4">
        <button
          onClick={() => setSequencia([])}
          disabled={bloqueado || sequencia.length === 0}
          className="font-bold text-sm text-ink/50 hover:text-deny transition-colors disabled:opacity-30"
        >
          Limpiar
        </button>
        <span className="text-sm font-bold text-ink/50">
          {sequencia.length} de {items.length} colocados
        </span>
        <button
          onClick={confirmar}
          disabled={bloqueado || sequencia.length !== items.length || cargando}
          className="btn-primary bg-kahootGreen py-2 px-6 disabled:opacity-40"
        >
          {cargando ? '…' : 'Confirmar'}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. parejas_logicas — emparejar izquierda con derecha
// ---------------------------------------------------------------------------
function ParejasUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder, seed }) {
  const pares = actividad.pares;
  // derechaShuffled[i] = {item: derecha_text, origIdx} — mismo orden para todos
  const derechaShuffled = useMemo(
    () => deterministicShuffle(pares.map(p => p.derecha), seed),
    [pares, seed]
  );

  // matchings[leftIdx] = origIdx del par derecha asignado (o null)
  const [matchings, setMatchings] = useState(() => Array(pares.length).fill(null));
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [cargando, setCargando] = useState(false);

  const confirmada = yaRespondio;
  const respuestaGuardada = miRespuesta ? (() => { try { return JSON.parse(miRespuesta); } catch { return null; } })() : null;

  const usedRightOrigIdxs = new Set(matchings.filter(v => v !== null));
  const listo = matchings.every(v => v !== null);

  function clickLeft(li) {
    if (bloqueado || confirmada) return;
    setSelectedLeft(prev => prev === li ? null : li);
  }

  function clickRight(origIdx) {
    if (bloqueado || confirmada || selectedLeft === null) return;
    setMatchings(prev => {
      const copia = [...prev];
      // si ya está asignado a otro left, liberar ese
      const prevLeft = copia.findIndex(v => v === origIdx);
      if (prevLeft !== -1 && prevLeft !== selectedLeft) copia[prevLeft] = null;
      copia[selectedLeft] = origIdx;
      return copia;
    });
    setSelectedLeft(null);
  }

  function clearPair(li) {
    if (bloqueado || confirmada) return;
    setMatchings(prev => { const c = [...prev]; c[li] = null; return c; });
    setSelectedLeft(null);
  }

  async function confirmar() {
    if (!listo || cargando) return;
    setCargando(true);
    await responder(JSON.stringify(matchings));
    setCargando(false);
  }

  if (confirmada && respuestaGuardada) {
    return (
      <>
        <EnunciadoCard>
          <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">🔗 Tus parejas</p>
          <div className="space-y-2 text-left">
            {pares.map((par, li) => (
              <div key={li} className="flex items-center gap-3 bg-gameBg rounded-xl p-3">
                <span className="flex-1 font-bold text-sm">{par.izquierda}</span>
                <span className="text-ink/30">↔</span>
                <span className="flex-1 font-bold text-sm text-right">{pares[respuestaGuardada[li]]?.derecha ?? '—'}</span>
              </div>
            ))}
          </div>
        </EnunciadoCard>
        <YaRespondio />
      </>
    );
  }

  return (
    <>
      <EnunciadoCard>
        <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">
          🔗 Empareja los elementos
        </p>
        <h2 className="font-black text-xl md:text-2xl">{actividad.instruccion}</h2>
      </EnunciadoCard>

      <section className="grid grid-cols-2 gap-3 mb-4">
        {/* Columna izquierda */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-ink/40 tracking-wider text-center mb-1">Concepto</p>
          {pares.map((par, li) => {
            const matched = matchings[li];
            const isSelected = selectedLeft === li;
            return (
              <button
                key={li}
                onClick={() => matched !== null ? clearPair(li) : clickLeft(li)}
                className={`w-full p-3 rounded-xl border-2 font-bold text-sm text-left transition-all ${
                  isSelected
                    ? 'border-kahootBlue bg-kahootBlue/10 ring-2 ring-kahootBlue/30'
                    : matched !== null
                      ? 'border-kahootGreen bg-kahootGreen/5'
                      : 'border-mist bg-white hover:border-kahootBlue/50'
                }`}
              >
                <div>{par.izquierda}</div>
                {matched !== null && (
                  <div className="text-xs text-kahootGreen mt-1">
                    ↔ {pares[matched]?.derecha}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {/* Columna derecha (shuffled) */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-ink/40 tracking-wider text-center mb-1">Definición</p>
          {derechaShuffled.map(({ item, origIdx }) => {
            const isUsed = usedRightOrigIdxs.has(origIdx);
            return (
              <button
                key={origIdx}
                onClick={() => clickRight(origIdx)}
                disabled={isUsed || selectedLeft === null}
                className={`w-full p-3 rounded-xl border-2 font-bold text-sm text-left transition-all ${
                  isUsed
                    ? 'border-mist bg-mist/30 opacity-40 cursor-not-allowed'
                    : selectedLeft !== null
                      ? 'border-kahootGreen bg-kahootGreen/5 hover:bg-kahootGreen/10'
                      : 'border-mist bg-white'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between pb-4">
        <p className="text-sm font-bold text-ink/50">
          {selectedLeft !== null
            ? `Selecciona la definición para "${pares[selectedLeft]?.izquierda}"`
            : 'Toca un concepto para emparejar'}
        </p>
        <button
          onClick={confirmar}
          disabled={bloqueado || !listo || cargando}
          className="btn-primary bg-kahootGreen py-2 px-6 disabled:opacity-40"
        >
          {cargando ? '…' : 'Confirmar'}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. clasificador — asignar ítems a 2 categorías
// ---------------------------------------------------------------------------
function ClasificadorUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder }) {
  const cat0 = actividad.categorias[0];
  const cat1 = actividad.categorias[1];
  const allItems = [...cat0.items, ...cat1.items];

  // asignados[i] = 0 | 1 | null
  const [asignados, setAsignados] = useState(() => Array(allItems.length).fill(null));
  const [cargando, setCargando] = useState(false);

  const confirmada = yaRespondio;
  const listo = asignados.every(v => v !== null);

  function toggleItem(i, catIdx) {
    if (bloqueado || confirmada) return;
    setAsignados(prev => {
      const c = [...prev];
      c[i] = prev[i] === catIdx ? null : catIdx;
      return c;
    });
  }

  async function confirmar() {
    if (!listo || cargando) return;
    setCargando(true);
    await responder(JSON.stringify(asignados));
    setCargando(false);
  }

  const respuestaGuardada = miRespuesta ? (() => { try { return JSON.parse(miRespuesta); } catch { return null; } })() : null;

  if (confirmada && respuestaGuardada) {
    return (
      <>
        <EnunciadoCard>
          <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">📂 Tu clasificación</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[cat0, cat1].map((cat, ci) => (
              <div key={ci} className={`p-3 rounded-xl border-2 ${CATEGORY_BORDERS[ci]}`}>
                <p className="font-black text-sm mb-2">{cat.nombre}</p>
                {allItems.map((item, i) => respuestaGuardada[i] === ci && (
                  <div key={i} className="text-sm font-bold text-ink/80 bg-ink/5 rounded-lg px-2 py-1 mb-1">{item}</div>
                ))}
              </div>
            ))}
          </div>
        </EnunciadoCard>
        <YaRespondio />
      </>
    );
  }

  return (
    <>
      <EnunciadoCard>
        <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-2">📂 El Clasificador</p>
        <h2 className="font-black text-xl md:text-2xl">{actividad.instruccion}</h2>
      </EnunciadoCard>

      <section className="space-y-2 mb-4">
        {allItems.map((item, i) => (
          <div key={i} className="bg-white rounded-xl border-2 border-mist p-3 flex items-center justify-between gap-2">
            <span className="font-bold text-sm flex-1">{item}</span>
            <div className="flex gap-2 shrink-0">
              {[cat0, cat1].map((cat, ci) => (
                <button
                  key={ci}
                  onClick={() => toggleItem(i, ci)}
                  disabled={bloqueado}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    asignados[i] === ci
                      ? CATEGORY_COLORS[ci]
                      : 'bg-ink/5 text-ink/50 hover:bg-ink/10'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center justify-between pb-4">
        <span className="text-sm font-bold text-ink/50">
          {asignados.filter(v => v !== null).length} de {allItems.length} clasificados
        </span>
        <button
          onClick={confirmar}
          disabled={bloqueado || !listo || cargando}
          className="btn-primary bg-kahootGreen py-2 px-6 disabled:opacity-40"
        >
          {cargando ? '…' : 'Confirmar'}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. palabras_perdidas — completar con banco de palabras
// ---------------------------------------------------------------------------
function PalabrasPierdidasUI({ actividad, bloqueado, yaRespondio, miRespuesta, responder }) {
  const partes = actividad.oracion.split('[___]');
  const nBlancos = partes.length - 1;

  const [elegidas, setElegidas] = useState(() => Array(nBlancos).fill(null));
  const [blanco, setBlanco] = useState(0); // índice del blank activo
  const [cargando, setCargando] = useState(false);

  const confirmada = yaRespondio;
  const listo = elegidas.every(v => v !== null);
  const palabrasUsadas = new Set(elegidas.filter(Boolean));

  function clickPalabra(palabra) {
    if (bloqueado || confirmada || palabrasUsadas.has(palabra)) return;
    // Usamos un único updater funcional para leer el array YA actualizado
    // y calcular el siguiente blanco sin stale closure.
    setElegidas(prev => {
      const c = [...prev];
      c[blanco] = palabra;
      // Calcular siguiente blanco dentro del updater (array actualizado)
      const siguiente = c.findIndex((v, i) => i > blanco && v === null);
      // Efecto secundario seguro: actualizar blanco DESPUÉS de que elegidas se actualice
      setTimeout(() => setBlanco(siguiente === -1 ? blanco : siguiente), 0);
      return c;
    });
  }

  function clearBlanco(i) {
    if (bloqueado || confirmada) return;
    setElegidas(prev => { const c = [...prev]; c[i] = null; return c; });
    setBlanco(i);
  }

  async function confirmar() {
    if (!listo || cargando) return;
    setCargando(true);
    await responder(JSON.stringify(elegidas));
    setCargando(false);
  }

  const respuestaGuardada = miRespuesta ? (() => { try { return JSON.parse(miRespuesta); } catch { return null; } })() : null;

  if (confirmada && respuestaGuardada) {
    return (
      <>
        <EnunciadoCard>
          <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-3">✍️ Tu respuesta</p>
          <p className="text-lg font-bold leading-relaxed">
            {partes.map((parte, i) => (
              <span key={i}>
                {parte}
                {i < nBlancos && (
                  <span className="mx-1 px-2 py-0.5 bg-kahootGreen/20 text-kahootGreen font-black rounded-lg border-b-2 border-kahootGreen">
                    {respuestaGuardada[i]}
                  </span>
                )}
              </span>
            ))}
          </p>
        </EnunciadoCard>
        <YaRespondio />
      </>
    );
  }

  return (
    <>
      <section className="mb-4">
        {/* Oración con blancos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <p className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-3">✍️ Completa la oración</p>
          <p className="text-lg md:text-xl font-bold leading-relaxed text-center">
            {partes.map((parte, i) => (
              <span key={i}>
                {parte}
                {i < nBlancos && (
                  <button
                    onClick={() => clearBlanco(i)}
                    className={`mx-1 min-w-[80px] px-3 py-1 rounded-xl font-black border-b-4 transition-all ${
                      blanco === i
                        ? 'border-kahootBlue bg-kahootBlue/10 text-kahootBlue'
                        : elegidas[i]
                          ? 'border-kahootGreen bg-kahootGreen/10 text-kahootGreen'
                          : 'border-ink/30 bg-ink/5 text-ink/30'
                    }`}
                  >
                    {elegidas[i] ?? '___'}
                  </button>
                )}
              </span>
            ))}
          </p>
          <p className="text-xs font-bold text-ink/40 mt-3 text-center">
            {blanco < nBlancos ? `Completa el espacio ${blanco + 1}` : 'Todos los espacios llenos'}
          </p>
        </div>
      </section>

      {/* Banco de palabras */}
      <section className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-2">Banco de palabras</p>
        <div className="flex flex-wrap gap-2">
          {actividad.banco.map((palabra, i) => {
            const usada = palabrasUsadas.has(palabra);
            return (
              <button
                key={i}
                onClick={() => clickPalabra(palabra)}
                disabled={bloqueado || usada}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  usada
                    ? 'bg-ink/5 text-ink/20 cursor-not-allowed'
                    : 'bg-white border-2 border-kahootBlue text-kahootBlue hover:bg-kahootBlue hover:text-white shadow-sm'
                }`}
              >
                {palabra}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between pb-4">
        <button
          onClick={() => { setElegidas(Array(nBlancos).fill(null)); setBlanco(0); }}
          disabled={bloqueado || elegidas.every(v => v === null)}
          className="font-bold text-sm text-ink/50 hover:text-deny disabled:opacity-30"
        >
          Limpiar
        </button>
        <button
          onClick={confirmar}
          disabled={bloqueado || !listo || cargando}
          className="btn-primary bg-kahootGreen py-2 px-6 disabled:opacity-40"
        >
          {cargando ? '…' : 'Confirmar'}
        </button>
      </div>
    </>
  );
}
