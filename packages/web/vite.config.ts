import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';

export default defineConfig({
  base: '/led-board/',
  plugins: [
    solid(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,bin}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [],
      },
      manifest: {
        id: '/led-board/',
        name: 'LED 電光掲示板',
        short_name: 'LED Board',
        description: 'ブラウザ LED ドットマトリクス電光掲示板シミュレータ',
        lang: 'ja',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        theme_color: '#0A0A0B',
        background_color: '#0A0A0B',
        start_url: '/led-board/',
        scope: '/led-board/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['entertainment', 'utilities'],
      },
    }),
  ],
});
