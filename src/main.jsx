import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
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

// En la app instalada (APK), el modo offline/red local va activo por defecto
// (el docente no tiene internet en el aula). Online sigue usando la nube igual.
import { Capacitor } from '@capacitor/core';
import { enableOfflineOverride } from './services/featureFlag.js';
try { if (Capacitor.isNativePlatform && Capacitor.isNativePlatform()) enableOfflineOverride(); } catch { /* web */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
