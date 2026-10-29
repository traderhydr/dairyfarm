import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Dairy Farm Manager',
        short_name: 'Dairy Farm',
        description: 'Dairy Farm Cashbook, Cow AI & Pregnancy, Monthly Wanda, Milkers, Wachi, Health & Doodhi Khata',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#064e3b',
        theme_color: '#064e3b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,woff2,webmanifest}'] }
    })
  ],
  test: { include: ['tests/unit/**/*.test.js'] }
});
