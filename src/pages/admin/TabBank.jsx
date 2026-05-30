import { useState, useEffect, useMemo } from 'react';
import { fetchBankActivities, deleteBankActivity } from '../../services/bankService.js';

const GRADOS = {
  primaria: ['Preescolar', '1°', '2°', '3°', '4°', '5°'],
  bachillerato: ['6°', '7°', '8°', '9°', '10°', '11°'],
  universidad: ['Semestres 1–3', 'Semestres 4–6', 'Semestres 7+'],
};
const DIFICULTADES = ['Básico', 'Intermedio', 'Avanzado'];

export default function TabBank() {
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(null);

  // Filtros Avanzados
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('Todos');
  const [filtroGrado, setFiltroGrado] = useState('Todos');
  const [filtroDificultad, setFiltroDificultad] = useState('Todas');

  const cargarBanco = async () => {
    setCargando(true);
    try {
      const data = await fetchBankActivities();
      setActividades(data);
    } catch (e) {
      alert('Error cargando el banco: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBanco();
  }, []);

  // Al cambiar de nivel, el grado seleccionado se reinicia a "Todos"
  useEffect(() => {
    setFiltroGrado('Todos');
  }, [filtroNivel]);

  const filtradas = useMemo(() => {
    return actividades.filter(a => {
      // Búsqueda por texto (Tema o Autor)
      const matchTexto = a.tema?.toLowerCase().includes(busqueda.toLowerCase()) || 
                         a.autorNombre?.toLowerCase().includes(busqueda.toLowerCase());
      
      // Filtro por Nivel
      const matchNivel = filtroNivel === 'Todos' || a.nivel === filtroNivel;
      
      // Filtro por Grado
      const matchGrado = filtroGrado === 'Todos' || a.grado === filtroGrado;
      
      // Filtro por Dificultad
      const matchDificultad = filtroDificultad === 'Todas' || a.dificultad === filtroDificultad;

      return matchTexto && matchNivel && matchGrado && matchDificultad;
    });
  }, [actividades, busqueda, filtroNivel, filtroGrado, filtroDificultad]);

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta actividad del banco? Esta acción no se puede deshacer.')) return;
    setAccion(id);
    try {
      await deleteBankActivity(id);
      await cargarBanco();
    } catch (e) {
      alert('Error eliminando: ' + e.message);
    } finally {
      setAccion(null);
    }
  };

  if (cargando) return <div className="py-16 text-center font-bold text-ink/40 animate-pulse">Cargando banco...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-mist/50">
      <div className="flex items-center justify-between px-8 py-6 border-b border-mist">
        <h2 className="font-black text-2xl">Banco Comunitario</h2>
        <button onClick={cargarBanco} className="font-bold text-sm text-ink/50 hover:text-ink border-2 border-mist px-4 py-2.5 rounded-xl hover:bg-gameBg transition-colors">
          ↺ Recargar
        </button>
      </div>

      {/* Controles de Filtro */}
      <div className="p-6 md:px-8 border-b border-mist/50 bg-gameBg/30 flex flex-col gap-4">
        <div className="flex gap-4 items-center w-full bg-white p-3 rounded-xl border border-mist">
          <span className="text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por tema o autor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 bg-transparent text-sm font-bold outline-none"
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Filtro Nivel */}
          <div className="flex flex-col flex-1 w-full">
            <label className="text-xs font-bold text-ink/50 uppercase mb-1">Nivel Educativo</label>
            <select 
              value={filtroNivel}
              onChange={e => setFiltroNivel(e.target.value)}
              className="field text-sm font-bold w-full cursor-pointer bg-white"
            >
              <option value="Todos">Todos los niveles</option>
              <option value="primaria">Primaria</option>
              <option value="bachillerato">Bachillerato</option>
              <option value="universidad">Universidad</option>
            </select>
          </div>

          {/* Filtro Grado */}
          <div className="flex flex-col flex-1 w-full">
            <label className="text-xs font-bold text-ink/50 uppercase mb-1">Grado / Curso</label>
            <select 
              value={filtroGrado}
              onChange={e => setFiltroGrado(e.target.value)}
              className="field text-sm font-bold w-full cursor-pointer bg-white"
            >
              <option value="Todos">Todos los grados</option>
              {(filtroNivel === 'Todos' ? Object.values(GRADOS).flat() : (GRADOS[filtroNivel] || [])).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Filtro Dificultad */}
          <div className="flex flex-col flex-1 w-full">
            <label className="text-xs font-bold text-ink/50 uppercase mb-1">Dificultad</label>
            <select 
              value={filtroDificultad}
              onChange={e => setFiltroDificultad(e.target.value)}
              className="field text-sm font-bold w-full cursor-pointer bg-white"
            >
              <option value="Todas">Todas las dificultades</option>
              {DIFICULTADES.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {actividades.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-black text-xl text-ink/30 mb-2">Banco vacío</p>
          <p className="font-bold text-sm text-ink/40">No hay actividades publicadas aún.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-black text-xl text-ink/30 mb-2">Sin resultados</p>
          <p className="font-bold text-sm text-ink/40">Ninguna actividad coincide con los filtros de búsqueda.</p>
          <button onClick={() => { setBusqueda(''); setFiltroNivel('Todos'); setFiltroDificultad('Todas'); }} className="text-brandPrimary font-bold text-sm hover:underline mt-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold tracking-widest uppercase text-ink/40 border-b border-mist bg-white">
                <th className="px-8 py-4">Tema</th>
                <th className="px-4 py-4">Autor</th>
                <th className="px-4 py-4">Nivel / Grado</th>
                <th className="px-4 py-4 text-center">Preguntas</th>
                <th className="px-4 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/50">
              {filtradas.map((act) => (
                <tr key={act.id} className="hover:bg-gameBg/50 transition-colors bg-white">
                  <td className="px-8 py-4">
                    <div className="font-black text-sm text-ink">{act.tema}</div>
                    <div className="text-xs font-bold text-ink/50">{new Date(act.fecha_publicacion).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-4 font-bold text-sm text-ink/60">{act.autorNombre}</td>
                  <td className="px-4 py-4 font-bold text-sm text-ink/60">
                    {act.nivel} {act.grado ? `> ${act.grado}` : ''}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-sm text-ink/60">
                    {act.actividades?.length || 0}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleEliminar(act.id)}
                      disabled={accion === act.id}
                      className="font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg border border-deny text-deny hover:bg-deny/10 transition-colors disabled:opacity-40"
                    >
                      {accion === act.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
