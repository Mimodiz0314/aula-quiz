export default function Waiting({ nombre }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
        Hola, {nombre}
      </p>
      <h1 className="font-display text-5xl md:text-7xl leading-tight tracking-tight mt-4">
        Espera a que <br />
        <span className="italic font-light text-ink/70">el docente inicie.</span>
      </h1>
      <div className="mt-12 flex gap-2">
        <span className="w-2 h-2 bg-ink rounded-full animate-pulse-soft" />
        <span
          className="w-2 h-2 bg-ink rounded-full animate-pulse-soft"
          style={{ animationDelay: '200ms' }}
        />
        <span
          className="w-2 h-2 bg-ink rounded-full animate-pulse-soft"
          style={{ animationDelay: '400ms' }}
        />
      </div>
    </main>
  );
}
