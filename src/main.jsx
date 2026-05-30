import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import './index.css';

import { registerSW } from 'virtual:pwa-register';
registerSW({ onNeedRefresh() {}, onOfflineReady() {} });

// Interruptor oculto del modo offline (consola: aulaOffline.on()/off()/status()).
import { installDevToggle } from './services/devToggle.js';
installDevToggle();

// Demo de sesión LAN en dos pestañas (consola: aulaLan.host()/join()/status()).
import { installLanDemo } from './services/lanDemo.js';
installLanDemo();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
