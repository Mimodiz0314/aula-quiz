import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isFirebaseError = this.state.error?.message?.includes('Firebase') || this.state.error?.message?.includes('database URL');
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bone text-ink text-center">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl text-deny mb-4">Algo salió mal</h1>
            {isFirebaseError ? (
              <div className="bg-mist p-6 rounded-2xl text-left">
                <h2 className="font-bold mb-2">Error de Configuración de Firebase</h2>
                <p className="mb-4 text-sm">Parece que las variables de entorno <code>.env</code> no se han cargado correctamente o faltan datos clave (como el Project ID).</p>
                <ol className="list-decimal pl-5 text-sm space-y-2">
                  <li>Asegúrate de que configuraste el archivo <code>.env</code> en la carpeta <code>quiz-app</code>.</li>
                  <li>Revisa que los nombres de las variables empiecen por <code>VITE_FIREBASE_...</code>.</li>
                  <li><strong>Reinicia el servidor local:</strong> Cierra la ventana negra (consola) y vuelve a abrir <code>Iniciar_Aula.bat</code>.</li>
                </ol>
              </div>
            ) : (
              <pre className="bg-mist p-4 rounded-xl text-xs overflow-auto text-left">
                {this.state.error?.toString()}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="mt-8 btn-primary"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
