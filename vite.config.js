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
        name: 'Aula',
        short_name: 'Aula',
        description: 'Plataforma de evaluación interactiva',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['education', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide', label: 'Aula Desktop' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'Aula Mobile' }
        ]
      }
    })
  ],
  server: { port: 5175, strictPort: false, host: true },
});
