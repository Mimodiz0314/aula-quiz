export default function Waiting({ nombre }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#46178f] text-white">
      <style>{`
        body { background-color: #46178f; }
      `}</style>
      
      <div className="animate-bounce-in">
        <h1 className="text-4xl md:text-6xl font-black mb-6">
          ¡Estás dentro!
        </h1>
        <div className="bg-black/20 px-8 py-4 rounded-xl inline-block shadow-inner mb-12">
          <p className="text-2xl md:text-4xl font-bold tracking-tight">
            {nombre}
          </p>
        </div>
        
        <p className="text-lg md:text-2xl font-bold opacity-90">
          ¿Ves tu nombre en la pantalla?
        </p>
        
        <div className="mt-8 flex justify-center gap-3">
          <span className="w-3 h-3 bg-white rounded-full animate-pulse-soft" />
          <span
            className="w-3 h-3 bg-white rounded-full animate-pulse-soft"
            style={{ animationDelay: '200ms' }}
          />
          <span
            className="w-3 h-3 bg-white rounded-full animate-pulse-soft"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </main>
  );
}
