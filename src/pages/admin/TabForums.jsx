import { useState, useEffect } from 'react';
import { fetchCategorias, crearCategoria, eliminarCategoria, fetchReportes, eliminarReporte, eliminarHilo, eliminarRespuesta } from '../../services/forumService.js';

export default function TabForums() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(null);
  const [modalNuevaCat, setModalNuevaCat] = useState(false);
  const [reportes, setReportes] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(true);

  const cargarData = async () => {
    setCargando(true);
    setCargandoReportes(true);
    try {
      const [cats, reps] = await Promise.all([fetchCategorias(), fetchReportes()]);
      setCategorias(cats);
      setReportes(reps);
    } catch (e) {
      alert('Error cargando datos del foro: ' + e.message);
    } finally {
      setCargando(false);
      setCargandoReportes(false);
    }
  };

  useEffect(() => {
    cargarData();
  }, []);

  const inicializarSalasBasicas = async () => {
    if (!window.confirm('¿Crear las 3 salas básicas (Recursos, Experiencias, Café)?')) return;
    setCargando(true);
    try {
      await crearCategoria('Intercambio de Recursos', 'Comparte enlaces, documentos y metodologías', '📚');
      await crearCategoria('Experiencias y Prácticas', 'Situaciones del día a día y debate educativo', '🗣️');
      await crearCategoria('Café Docente', 'Tertulia, interacción social y noticias', '☕');
      await cargarData();
    } catch(e) {
      alert('Error creando salas: ' + e.message);
    }
  };

  const descartarReporte = async (reporteId) => {
    if (!window.confirm('¿Descartar este reporte?')) return;
    try {
      await eliminarReporte(reporteId);
      setReportes(prev => prev.filter(r => r.id !== reporteId));
    } catch(e) {
      alert('Error: ' + e.message);
    }
  };

  const eliminarContenidoReportado = async (reporte) => {
    if (!window.confirm(`¿Eliminar permanentemente este/a ${reporte.tipo} por violar las normas?`)) return;
    try {
      if (reporte.tipo === 'hilo') {
        await eliminarHilo(reporte.idHilo);
      } else {
        await eliminarRespuesta(reporte.idHilo, reporte.idRespuesta);
      }
      await eliminarReporte(reporte.id);
      setReportes(prev => prev.filter(r => r.id !== reporte.id));
      alert('Contenido eliminado exitosamente.');
    } catch(e) {
      alert('Error eliminando contenido: ' + e.message);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar categoría? Los hilos podrían quedar huérfanos.')) return;
    setAccion(id);
    try {
      await eliminarCategoria(id);
      await cargarData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setAccion(null);
    }
  };

  if (cargando) return <div className="py-16 text-center font-bold text-ink/40 animate-pulse">Cargando foros...</div>;

  return (
    <div>
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-mist/50">
        <div className="flex items-center justify-between px-8 py-6 border-b border-mist">
          <h2 className="font-black text-2xl">Categorías del Foro</h2>
          <div className="flex gap-3">
            <button onClick={cargarData} className="font-bold text-sm text-ink/50 hover:text-ink border-2 border-mist px-4 py-2.5 rounded-xl hover:bg-gameBg transition-colors">
              ↺ Recargar
            </button>
            <button onClick={() => setModalNuevaCat(true)} className="btn-primary bg-brandPrimary text-sm px-6 py-3">
              + Nueva Categoría
            </button>
          </div>
        </div>

        {categorias.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-black text-xl text-ink/30 mb-2">Sin categorías</p>
            <p className="font-bold text-sm text-ink/40 mb-4">Crea la primera categoría para abrir el foro.</p>
            <button onClick={inicializarSalasBasicas} className="btn-primary bg-brandSecondary">
              🚀 Inicializar Salas Básicas Automáticamente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold tracking-widest uppercase text-ink/40 border-b border-mist">
                  <th className="px-8 py-4 w-16">Ícono</th>
                  <th className="px-4 py-4">Nombre / Descripción</th>
                  <th className="px-4 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/50">
                {categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gameBg/50 transition-colors">
                    <td className="px-8 py-4 text-3xl">{cat.icono || '💬'}</td>
                    <td className="px-4 py-4">
                      <div className="font-black text-lg text-ink">{cat.nombre}</div>
                      <div className="text-sm font-bold text-ink/60">{cat.descripcion}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleEliminar(cat.id)}
                        disabled={accion === cat.id}
                        className="font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg border border-deny text-deny hover:bg-deny/10 transition-colors disabled:opacity-40"
                      >
                        {accion === cat.id ? '...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-mist/50 mt-8">
        <div className="flex items-center justify-between px-8 py-6 border-b border-mist bg-deny/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚩</span>
            <h2 className="font-black text-2xl text-deny">Buzón de Reportes</h2>
          </div>
          <span className="font-bold text-sm text-ink/40">
            {reportes.length} reporte{reportes.length !== 1 ? 's' : ''} pendiente{reportes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cargandoReportes ? (
          <div className="py-16 text-center font-bold text-ink/40 animate-pulse">Cargando reportes...</div>
        ) : reportes.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-4xl block mb-4">✨</span>
            <p className="font-black text-xl text-ink/40 mb-2">Comunidad limpia</p>
            <p className="font-bold text-sm text-ink/50">No hay reportes de moderación pendientes.</p>
          </div>
        ) : (
          <div className="divide-y divide-mist/50">
            {reportes.map(rep => (
              <div key={rep.id} className="p-6 md:px-8 hover:bg-gameBg/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-3">
                  <div>
                    <span className="bg-deny text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full mb-2 inline-block">
                      {rep.motivo}
                    </span>
                    <div className="font-bold text-sm text-ink">Reportado por: {rep.reportadoPorNombre}</div>
                    <div className="text-xs font-bold text-ink/40">{new Date(rep.fecha).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => eliminarContenidoReportado(rep)}
                      className="btn-ghost text-deny border-2 border-deny/20 hover:bg-deny/10 text-xs px-3 py-1"
                    >
                      🗑️ Eliminar Contenido
                    </button>
                    <button 
                      onClick={() => descartarReporte(rep.id)}
                      className="btn-ghost border-2 border-mist text-xs px-3 py-1"
                    >
                      ✕ Descartar Reporte
                    </button>
                  </div>
                </div>
                <div className="bg-gameBg p-4 rounded-xl border border-mist/50">
                  <div className="font-bold text-xs uppercase text-ink/40 mb-1">Contenido reportado ({rep.tipo})</div>
                  <div className="text-ink/80 text-sm italic">"{rep.extracto}"</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalNuevaCat && (
        <ModalCrearCategoria
          onClose={() => setModalNuevaCat(false)}
          onCreado={cargarData}

        />
      )}
    </div>
  );
}

function ModalCrearCategoria({ onClose, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [icono, setIcono] = useState('💬');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !descripcion.trim()) return;
    setCargando(true);
    try {
      await crearCategoria(nombre.trim(), descripcion.trim(), icono);
      await onCreado();
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-2xl mb-6">Nueva Categoría</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1 block">Ícono (Emoji)</label>
            <input className="field" value={icono} onChange={e => setIcono(e.target.value)} required disabled={cargando} />
          </div>
          <div>
            <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1 block">Nombre</label>
            <input className="field" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Estrategias Pedagógicas" required disabled={cargando} />
          </div>
          <div>
            <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1 block">Descripción</label>
            <input className="field" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Breve descripción..." required disabled={cargando} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors">Cancelar</button>
            <button type="submit" disabled={cargando} className="flex-1 btn-primary bg-brandPrimary py-3">{cargando ? 'Guardando...' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
