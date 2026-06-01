import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCategorias, fetchHilosPorCategoria, crearHilo } from '../../services/forumService.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function Forums() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [catSeleccionada, setCatSeleccionada] = useState(null);
  const [hilos, setHilos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoHilos, setCargandoHilos] = useState(false);
  const [modalNuevoHilo, setModalNuevoHilo] = useState(false);

  useEffect(() => {
    fetchCategorias().then(data => {
      setCategorias(data);
      setCargando(false);
    }).catch(e => {
      console.error(e);
      setCargando(false);
    });
  }, []);

  const seleccionarCategoria = async (cat) => {
    setCatSeleccionada(cat);
    setCargandoHilos(true);
    try {
      const data = await fetchHilosPorCategoria(cat.id);
      setHilos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoHilos(false);
    }
  };

  const recargarHilos = async () => {
    if (!catSeleccionada) return;
    const data = await fetchHilosPorCategoria(catSeleccionada.id);
    setHilos(data);
  };

  return (
    <main className="min-h-screen bg-gameBg p-6 md:p-12">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => catSeleccionada ? setCatSeleccionada(null) : navigate('/docente')} className="btn-ghost">
            ← {catSeleccionada ? 'Volver a Categorías' : 'Mi Panel'}
          </button>
          <h1 className="font-black text-2xl text-ink">Comunidad / Foros</h1>
        </div>
      </header>

      <section className="max-w-5xl mx-auto">
        {cargando ? (
          <div className="text-center font-bold text-ink/50 mt-12 animate-pulse">Cargando foros...</div>
        ) : !catSeleccionada ? (
          <div className="flex flex-col gap-8">
            {/* Mensaje de Bienvenida */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-brandSecondary">
              <h2 className="font-black text-2xl mb-4">Bienvenidos a la Comunidad Docente de EduMaster Aula</h2>
              <div className="text-ink/80 leading-relaxed space-y-4">
                <p><strong>Estimados colegas:</strong></p>
                <p>Este espacio ha sido creado para facilitar el diálogo, el intercambio de ideas y la colaboración entre todos los que utilizamos esta plataforma. Nuestro objetivo es construir una red de apoyo mutuo.</p>
                <p>Les invitamos a iniciar conversaciones, compartir materiales que les hayan funcionado, debatir sobre metodologías o simplemente conversar sobre nuestra labor diaria.</p>
                <p>La única regla de este espacio es mantener un ambiente de <strong>respeto profesional</strong>. Siéntanse libres de participar, proponer temas y enriquecer esta comunidad.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorias.length === 0 ? (
                <div className="col-span-full text-center py-12 text-ink/50 font-bold">
                  Aún no se han creado categorías en el foro.
                </div>
              ) : (
                categorias.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => seleccionarCategoria(cat)}
                    className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-brandPrimary flex flex-col items-center text-center group"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{cat.icono || '💬'}</div>
                    <h3 className="font-black text-xl mb-2 text-ink">{cat.nombre}</h3>
                    <p className="text-sm font-bold text-ink/60">{cat.descripcion}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="font-black text-3xl flex items-center gap-3">
                  <span>{catSeleccionada.icono}</span> {catSeleccionada.nombre}
                </h2>
                <p className="font-bold text-ink/60 mt-1">{catSeleccionada.descripcion}</p>
              </div>
              <button onClick={() => setModalNuevoHilo(true)} className="btn-primary bg-brandPrimary">
                + Nuevo Tema
              </button>
            </div>

            {cargandoHilos ? (
              <div className="text-center py-12 font-bold text-ink/40 animate-pulse">Cargando temas...</div>
            ) : hilos.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                <span className="text-4xl block mb-4">🌱</span>
                <p className="font-black text-xl text-ink/40 mb-2">Sin temas en esta categoría</p>
                <p className="font-bold text-sm text-ink/50">¡Sé el primero en iniciar una conversación!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {hilos.map(hilo => (
                  <div 
                    key={hilo.id} 
                    onClick={() => navigate(`/docente/foro/${hilo.id}`, { state: { hilo, categoria: catSeleccionada } })}
                    className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-brandPrimary/30 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-black text-xl text-ink mb-1">{hilo.titulo}</h3>
                      <div className="text-sm font-bold text-ink/60 flex items-center gap-2">
                        <span className="bg-gameBg px-2 py-0.5 rounded text-ink/70">👤 {hilo.autorNombre}</span>
                        <span>·</span>
                        <span>{new Date(hilo.creado_en).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-brandSecondary/10 text-brandSecondary px-3 py-1 rounded-full font-black text-sm">
                        {hilo.num_respuestas || 0} respuestas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {modalNuevoHilo && (
        <ModalNuevoHilo 
          categoriaId={catSeleccionada?.id} 
          onClose={() => setModalNuevoHilo(false)}
          onCreado={recargarHilos}
          user={user}
        />
      )}
    </main>
  );
}

function ModalNuevoHilo({ categoriaId, onClose, onCreado, user }) {
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;
    setCargando(true);
    try {
      await crearHilo(categoriaId, titulo.trim(), contenido.trim(), user.uid, user.nombre || user.email);
      await onCreado();
      onClose();
    } catch (e) {
      alert('Error al crear tema: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-2xl mb-6">Iniciar Nuevo Tema</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase text-ink/50 mb-1 block">Título del tema</label>
            <input 
              className="field font-bold text-lg" 
              value={titulo} 
              onChange={e => setTitulo(e.target.value)} 
              placeholder="Ej. ¿Cómo aplican el quiz en matemáticas?"
              required 
              disabled={cargando}
            />
          </div>
          <div>
            <label className="font-bold text-xs uppercase text-ink/50 mb-1 block">Contenido / Pregunta principal</label>
            <textarea 
              className="field min-h-[150px] resize-none" 
              value={contenido} 
              onChange={e => setContenido(e.target.value)} 
              placeholder="Escribe tu mensaje aquí..."
              required 
              disabled={cargando}
            ></textarea>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost border-2 border-mist">Cancelar</button>
            <button type="submit" disabled={cargando} className="flex-[2] btn-primary bg-brandPrimary">
              {cargando ? 'Publicando...' : 'Publicar Tema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
