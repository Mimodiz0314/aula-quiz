import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTopics, createTopic, fetchComments, createComment } from '../../services/forumService.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function Forum() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [temas, setTemas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [vista, setVista] = useState('lista'); // 'lista', 'crear', 'detalle'
  const [temaActual, setTemaActual] = useState(null);
  
  // Para nuevo tema
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoContenido, setNuevoContenido] = useState('');

  // Para comentarios
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');

  useEffect(() => {
    if (vista === 'lista') {
      cargarTemas();
    } else if (vista === 'detalle' && temaActual) {
      cargarComentarios(temaActual.id);
    }
  }, [vista, temaActual]);

  async function cargarTemas() {
    setCargando(true);
    const data = await fetchTopics();
    setTemas(data);
    setCargando(false);
  }

  async function cargarComentarios(topicId) {
    const data = await fetchComments(topicId);
    setComentarios(data);
  }

  async function handleCrearTema() {
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;
    await createTopic({
      title: nuevoTitulo,
      content: nuevoContenido,
      authorUid: user?.uid,
      authorName: user?.displayName || user?.email || 'Docente'
    });
    setNuevoTitulo('');
    setNuevoContenido('');
    setVista('lista');
  }

  async function handleCrearComentario() {
    if (!nuevoComentario.trim() || !temaActual) return;
    await createComment(temaActual.id, {
      content: nuevoComentario,
      authorUid: user?.uid,
      authorName: user?.displayName || user?.email || 'Docente'
    });
    setNuevoComentario('');
    cargarComentarios(temaActual.id);
  }

  return (
    <main className="min-h-screen bg-gameBg p-6 md:p-12">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (vista === 'lista') navigate('/docente');
              else setVista('lista');
            }} 
            className="btn-ghost"
          >
            ← {vista === 'lista' ? 'Mi Panel' : 'Volver al Foro'}
          </button>
          <h1 className="font-black text-2xl text-ink">Foro de Docentes</h1>
        </div>
        {vista === 'lista' && (
          <button 
            onClick={() => setVista('crear')}
            className="bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold py-2 px-6 rounded-xl transition-colors"
          >
            + Nuevo Tema
          </button>
        )}
      </header>

      <section className="max-w-4xl mx-auto">
        {vista === 'lista' && (
          <div className="space-y-4">
            {cargando ? (
              <p className="text-center font-bold text-ink/50 mt-12">Cargando temas...</p>
            ) : temas.length === 0 ? (
              <p className="text-center font-bold text-ink/50 mt-12">No hay temas todavía. ¡Sé el primero en publicar!</p>
            ) : (
              temas.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => { setTemaActual(t); setVista('detalle'); }}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-shadow border-l-4 border-brandSecondary"
                >
                  <h3 className="font-black text-xl mb-1">{t.title}</h3>
                  <p className="text-sm text-ink/60 font-bold mb-3">Por: {t.authorName}</p>
                  <p className="text-ink/80 line-clamp-2">{t.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {vista === 'crear' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <h2 className="font-black text-2xl mb-6">Crear Nuevo Tema</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Título de la discusión" 
                value={nuevoTitulo}
                onChange={e => setNuevoTitulo(e.target.value)}
                className="w-full bg-gameBg p-4 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-brandPrimary"
              />
              <textarea 
                placeholder="Escribe aquí tu mensaje, duda o consejo..."
                value={nuevoContenido}
                onChange={e => setNuevoContenido(e.target.value)}
                className="w-full bg-gameBg p-4 rounded-xl text-base outline-none min-h-[200px] focus:ring-2 focus:ring-brandPrimary"
              />
              <button 
                onClick={handleCrearTema}
                disabled={!nuevoTitulo.trim() || !nuevoContenido.trim()}
                className="bg-brandSuccess hover:bg-brandSuccess/90 text-white font-black py-3 px-8 rounded-xl transition-colors disabled:opacity-50"
              >
                Publicar Tema
              </button>
            </div>
          </div>
        )}

        {vista === 'detalle' && temaActual && (
          <div>
            <div className="bg-white p-8 rounded-3xl shadow-sm mb-6 border-l-4 border-brandSecondary">
              <h2 className="font-black text-3xl mb-2">{temaActual.title}</h2>
              <p className="text-sm font-bold text-ink/50 mb-6">Autor: {temaActual.authorName}</p>
              <p className="text-ink leading-relaxed whitespace-pre-wrap">{temaActual.content}</p>
            </div>

            <h3 className="font-black text-xl mb-4 ml-2">Comentarios ({comentarios.length})</h3>
            <div className="space-y-4 mb-8">
              {comentarios.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm ml-8">
                  <p className="text-sm font-bold text-ink/50 mb-2">{c.authorName}</p>
                  <p className="text-ink leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-end gap-3 ml-8">
              <textarea 
                placeholder="Añade tu respuesta..."
                value={nuevoComentario}
                onChange={e => setNuevoComentario(e.target.value)}
                className="w-full bg-gameBg p-4 rounded-xl text-base outline-none min-h-[100px] focus:ring-2 focus:ring-brandPrimary"
              />
              <button 
                onClick={handleCrearComentario}
                disabled={!nuevoComentario.trim()}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold py-2 px-8 rounded-xl transition-colors disabled:opacity-50"
              >
                Responder
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
