import { useState } from 'react';

export default function ReviewQuestions({ initialQuestions, onConfirm, onCancel }) {
  const [questions, setQuestions] = useState(initialQuestions);

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].opciones[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectChange = (qIndex, correctIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correcta = correctIndex;
    setQuestions(newQuestions);
  };

  const handleDelete = (index) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const handleAdd = () => {
    setQuestions([
      ...questions,
      {
        pregunta: '',
        opciones: ['', '', '', ''],
        correcta: 0,
      }
    ]);
  };

  const colors = ['bg-brandDanger', 'bg-brandPrimary', 'bg-brandAccent', 'bg-brandSuccess'];

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-2xl font-black">Revisar Preguntas ({questions.length})</h2>
        <div className="flex gap-4">
          <button onClick={onCancel} className="btn-ghost text-deny">Cancelar</button>
          <button 
            onClick={() => onConfirm(questions)} 
            className="btn-primary bg-brandSuccess"
            disabled={questions.length === 0}
          >
            Iniciar Sala ✨
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-ink/10 relative">
            <button 
              onClick={() => handleDelete(qIndex)}
              className="absolute top-4 right-4 text-deny hover:text-brandDanger font-bold"
            >
              ✕ Eliminar
            </button>
            <div className="mb-6">
              <label className="font-bold text-sm text-ink/60 uppercase tracking-wider mb-2 block">
                Pregunta {qIndex + 1}
              </label>
              <textarea 
                className="field w-full resize-y text-lg font-bold"
                rows={2}
                value={q.pregunta}
                onChange={(e) => handleQuestionChange(qIndex, 'pregunta', e.target.value)}
                placeholder="Escribe el enunciado de la pregunta"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {q.opciones.map((opcion, oIndex) => (
                <div key={oIndex} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name={`correcta-${qIndex}`} 
                      checked={q.correcta === oIndex}
                      onChange={() => handleCorrectChange(qIndex, oIndex)}
                      className="w-5 h-5 accent-brandSuccess cursor-pointer"
                    />
                    <label className="text-xs font-bold text-ink/50 uppercase">Opción {oIndex + 1} {q.correcta === oIndex && '(Correcta)'}</label>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-full min-h-[48px] rounded-l-lg ${colors[oIndex]} opacity-80`}></div>
                    <input 
                      className="field flex-1 rounded-l-none border-l-0"
                      value={opcion}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      placeholder={`Respuesta ${oIndex + 1}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleAdd}
        className="w-full p-6 border-4 border-dashed border-ink/20 rounded-2xl text-ink/50 font-bold hover:bg-ink/5 hover:text-ink hover:border-ink/40 transition-all"
      >
        + Añadir Pregunta Manualmente
      </button>

    </div>
  );
}
