import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'android' ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: {
        // A manifest is fixed at build time, so the install name is the English one; the app itself follows the chosen language.
        name: 'Rafiq',
        short_name: 'Rafiq',
        description: 'Rafiq walks with me on the journey of caring for myself. My data stays on my device.',
        lang: 'en',
        dir: 'ltr',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#2F6F66',
        background_color: '#F3F6F4',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // The whole app shell, fonts and icons are cached, so it opens and works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    })]),
  ],
}));
