import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        lang: 'es',
        name: 'EduMaster Aula',
        short_name: 'Aula',
        description: 'EduMaster Aula — evaluación interactiva en tiempo real para el aula de clase.',
        theme_color: '#2A394B',
        background_color: '#2A394B',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['education', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide', label: 'EduMaster Aula' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'EduMaster Aula' }
        ]
      }
    })
  ],
  server: { port: 5175, strictPort: false, host: true },
});
