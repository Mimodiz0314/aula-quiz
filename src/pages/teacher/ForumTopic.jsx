import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchRespuestas, agregarRespuesta, reportarContenido } from '../../services/forumService.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function ForumTopic() {
  const { hiloId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const hilo = location.state?.hilo;
  const categoria = location.state?.categoria;

  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaRespuesta, setNuevaRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reporteModal, setReporteModal] = useState(null); // { tipo, idHilo, idRespuesta, extracto }

  useEffect(() => {
    if (!hilo) {
      navigate('/docente/foro');
      return;
    }
    fetchRespuestas(hiloId).then(data => {
      setRespuestas(data);
      setCargando(false);
    }).catch(e => {
      console.error(e);
      setCargando(false);
    });
  }, [hilo, hiloId, navigate]);

  const handleResponder = async (e) => {
    e.preventDefault();
    if (!nuevaRespuesta.trim()) return;
    setEnviando(true);
    try {
      await agregarRespuesta(hiloId, nuevaRespuesta.trim(), user.uid, user.nombre || user.email);
      setNuevaRespuesta('');
      const data = await fetchRespuestas(hiloId);
      setRespuestas(data);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!hilo) return null;

  return (
    <main className="min-h-screen bg-gameBg p-6 md:p-12">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/docente/foro')} className="btn-ghost">
            ← Volver al Foro
          </button>
          <div className="font-bold text-ink/40 text-sm hidden md:block">
            {categoria?.nombre || 'Categoría'} / Hilo
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto">
        {/* Post original */}
        <div className="bg-white p-8 rounded-3xl shadow-sm mb-6 border-l-8 border-brandPrimary relative group">
          <button 
            onClick={() => setReporteModal({ tipo: 'hilo', idHilo, idRespuesta: null, extracto: hilo.contenido })}
            className="absolute top-4 right-4 text-ink/30 hover:text-deny transition-colors opacity-0 group-hover:opacity-100" 
            title="Reportar mensaje"
          >
            🚩
          </button>
          <h1 className="font-black text-3xl text-ink mb-4 pr-12">{hilo.titulo}</h1>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gameBg rounded-full h-10 w-10 flex items-center justify-center text-xl">👤</div>
            <div>
              <div className="font-bold text-ink">{hilo.autorNombre}</div>
              <div className="text-xs font-bold text-ink/40">{new Date(hilo.creado_en).toLocaleString()}</div>
            </div>
          </div>
          <div className="text-ink/80 leading-relaxed whitespace-pre-wrap text-lg">
            {hilo.contenido}
          </div>
        </div>

        {/* Lista de Respuestas */}
        <div className="space-y-4 mb-8">
          <h3 className="font-black text-xl text-ink/60 mb-4 px-4">
            {respuestas.length} Respuesta{respuestas.length !== 1 ? 's' : ''}
          </h3>
          
          {cargando ? (
            <div className="text-center font-bold text-ink/40 py-8 animate-pulse">Cargando respuestas...</div>
          ) : (
            respuestas.map(resp => (
              <div key={resp.id} className="bg-white p-6 rounded-2xl shadow-sm ml-0 md:ml-12 relative border border-transparent hover:border-mist transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-brandSecondary">{resp.autorNombre}</span>
                    {resp.autorUid === hilo.autorUid && (
                      <span className="bg-brandPrimary/10 text-brandPrimary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-black">
                        Autor
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-ink/40">{new Date(resp.creado_en).toLocaleString()}</span>
                    <button 
                      onClick={() => setReporteModal({ tipo: 'respuesta', idHilo, idRespuesta: resp.id, extracto: resp.contenido })}
                      className="text-ink/30 hover:text-deny transition-colors text-sm" 
                      title="Reportar mensaje"
                    >
                      🚩
                    </button>
                  </div>
                </div>
                <div className="text-ink/70 whitespace-pre-wrap text-sm leading-relaxed">
                  {resp.contenido}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulario de Respuesta */}
        <div className="bg-white p-6 rounded-3xl shadow-sm md:ml-12 border border-mist">
          <h4 className="font-black text-lg mb-4">Escribir una respuesta</h4>
          <form onSubmit={handleResponder} className="flex flex-col gap-3">
            <textarea
              className="field min-h-[100px] resize-none text-sm"
              placeholder="Aporta a la conversación..."
              value={nuevaRespuesta}
              onChange={e => setNuevaRespuesta(e.target.value)}
              disabled={enviando}
            ></textarea>
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={enviando || !nuevaRespuesta.trim()} 
                className="btn-primary bg-brandSecondary px-8 py-3 disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Responder'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {reporteModal && (
        <ModalReporte 
          info={reporteModal} 
          onClose={() => setReporteModal(null)} 
          user={user} 
        />
      )}
    </main>
  );
}

function ModalReporte({ info, onClose, user }) {
  const [motivo, setMotivo] = useState('Spam o Publicidad');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await reportarContenido(
        info.tipo, 
        info.idHilo, 
        info.idRespuesta, 
        motivo, 
        user.uid, 
        user.nombre || user.email, 
        info.extracto.substring(0, 150) + (info.extracto.length > 150 ? '...' : '')
      );
      alert('Reporte enviado a moderación. Gracias por mantener la comunidad limpia.');
      onClose();
    } catch (e) {
      alert('Error enviando reporte: ' + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🚩</span>
          <h3 className="font-black text-2xl text-ink">Reportar Contenido</h3>
        </div>
        
        <p className="text-sm font-bold text-ink/60 mb-4 leading-relaxed">
          ¿Por qué deseas reportar este mensaje? Nuestro equipo de moderación lo revisará.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 p-3 border-2 border-mist rounded-xl cursor-pointer hover:bg-gameBg/50 transition-colors">
              <input type="radio" name="motivo" value="Spam o Publicidad" checked={motivo === 'Spam o Publicidad'} onChange={(e) => setMotivo(e.target.value)} />
              <span className="font-bold text-ink/80 text-sm">Spam o Publicidad</span>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-mist rounded-xl cursor-pointer hover:bg-gameBg/50 transition-colors">
              <input type="radio" name="motivo" value="Falta de respeto o acoso" checked={motivo === 'Falta de respeto o acoso'} onChange={(e) => setMotivo(e.target.value)} />
              <span className="font-bold text-ink/80 text-sm">Falta de respeto o acoso</span>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-mist rounded-xl cursor-pointer hover:bg-gameBg/50 transition-colors">
              <input type="radio" name="motivo" value="Contenido irrelevante al propósito" checked={motivo === 'Contenido irrelevante al propósito'} onChange={(e) => setMotivo(e.target.value)} />
              <span className="font-bold text-ink/80 text-sm">Contenido irrelevante al propósito</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost border-2 border-mist">Cancelar</button>
            <button type="submit" disabled={enviando} className="flex-[2] btn-primary bg-deny hover:bg-deny/90">
              {enviando ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
