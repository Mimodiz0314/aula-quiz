import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBankActivities } from '../../services/bankService.js';
import { useAuth } from '../../hooks/useAuth.js';

const GRADOS = {
  primaria: ['Preescolar', '1°', '2°', '3°', '4°', '5°'],
  bachillerato: ['6°', '7°', '8°', '9°', '10°', '11°'],
  universidad: ['Semestres 1–3', 'Semestres 4–6', 'Semestres 7+'],
};
const DIFICULTADES = ['Básico', 'Intermedio', 'Avanzado'];

export default function Bank() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actividades, setActividades] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [previewActividad, setPreviewActividad] = useState(null);

  // Filtros Avanzados
  const [filtroNivel, setFiltroNivel] = useState('Todos');
  const [filtroGrado, setFiltroGrado] = useState('Todos');
  const [filtroDificultad, setFiltroDificultad] = useState('Todas');

  useEffect(() => {
    fetchBankActivities().then(data => {
      setActividades(data);
      setCargando(false);
    }).catch(e => {
      console.error(e);
      setCargando(false);
    });
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

  return (
    <main className="min-h-screen bg-gameBg p-6 md:p-12">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/docente')} className="btn-ghost">
            ← Mi Panel
          </button>
          <h1 className="font-black text-2xl text-ink">Banco de Actividades</h1>
        </div>
      </header>

      <section className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 flex flex-col gap-4">
          <div className="flex gap-4 items-center w-full">
            <span className="text-2xl">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por tema o autor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 bg-transparent text-lg font-bold outline-none"
            />
          </div>
          
          <div className="h-px bg-mist w-full"></div>
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Filtro Nivel */}
            <div className="flex flex-col flex-1 w-full">
              <label className="text-xs font-bold text-ink/50 uppercase mb-1">Nivel Educativo</label>
              <select 
                value={filtroNivel}
                onChange={e => setFiltroNivel(e.target.value)}
                className="field text-sm font-bold w-full cursor-pointer"
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
                className="field text-sm font-bold w-full cursor-pointer"
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
                className="field text-sm font-bold w-full cursor-pointer"
              >
                <option value="Todas">Todas las dificultades</option>
                {DIFICULTADES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="text-center font-bold text-ink/50 mt-12">Cargando actividades de la comunidad...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center font-bold text-ink/50 mt-12 bg-white p-8 rounded-3xl shadow-sm">
            <span className="text-4xl block mb-4">🏜️</span>
            No se encontraron actividades con estos filtros.<br/>
            <button onClick={() => { setBusqueda(''); setFiltroNivel('Todos'); setFiltroDificultad('Todas'); }} className="text-brandPrimary hover:underline mt-2">Limpiar filtros</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtradas.map(act => (
              <div key={act.id} className="bg-white p-6 rounded-3xl shadow-sm flex flex-col justify-between border-t-4 border-brandPrimary">
                <div>
                  <h3 className="font-black text-xl mb-2">{act.tema}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2 py-1 bg-ink/5 text-ink/60 rounded-full flex items-center gap-1">
                      {act.autorNombre === 'Incógnita' ? '🕵️' : '👤'} {act.autorNombre}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink/60 mb-4">Preguntas: {act.actividades?.length || 0}</p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {act.nivel && <span className="text-[10px] font-black uppercase tracking-wider bg-brandAccent/10 text-brandAccent px-2 py-1 rounded-md">{act.nivel}</span>}
                    {act.grado && <span className="text-[10px] font-black uppercase tracking-wider bg-mist px-2 py-1 rounded-md">{act.grado}</span>}
                    {act.dificultad && <span className="text-[10px] font-black uppercase tracking-wider bg-brandSuccess/10 text-brandSuccess px-2 py-1 rounded-md">{act.dificultad}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPreviewActividad(act)}
                    className="flex-[0.4] bg-ink/5 hover:bg-ink/10 text-ink font-bold py-3 rounded-xl transition-colors"
                  >
                    👁️
                  </button>
                  <button 
                    onClick={() => navigate('/docente/nueva', { state: { 
                      tema: act.tema, 
                      actividades: act.actividades,
                      grado: act.grado,
                      dificultad: act.dificultad 
                    }})}
                    className="flex-[0.6] bg-brandSecondary hover:bg-brandSecondary/90 text-white font-black py-3 rounded-xl transition-colors"
                  >
                    Clonar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Vista Previa */}
      {previewActividad && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-ink mb-1">{previewActividad.tema}</h2>
                <p className="text-sm font-bold text-ink/60">
                  {previewActividad.autorNombre} · {previewActividad.actividades?.length || 0} actividades
                </p>
              </div>
              <button 
                onClick={() => setPreviewActividad(null)}
                className="text-ink/40 hover:text-ink text-2xl font-bold p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
              {previewActividad.actividades?.map((pregunta, i) => (
                <div key={i} className="bg-ink/5 p-4 rounded-xl">
                  <h4 className="font-bold text-ink mb-2">
                    <span className="text-brandPrimary mr-2">{i + 1}.</span> 
                    {pregunta.pregunta || pregunta.enunciado || pregunta.instruccion || pregunta.oracion || pregunta.pasaje || 'Actividad múltiple'}
                  </h4>
                  <div className="text-sm text-ink/70">
                    <span className="inline-block px-2 py-1 bg-white border border-mist rounded-md text-xs font-bold shadow-sm">
                      Tipo: {pregunta.tipo?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-mist flex gap-4 shrink-0">
              <button 
                onClick={() => setPreviewActividad(null)}
                className="flex-1 btn-ghost"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  navigate('/docente/nueva', { state: { 
                    tema: previewActividad.tema, 
                    actividades: previewActividad.actividades,
                    grado: previewActividad.grado,
                    dificultad: previewActividad.dificultad 
                  }});
                }}
                className="flex-[2] btn-primary bg-brandSecondary"
              >
                Clonar a mi cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
