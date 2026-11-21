import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet'
            if (id.includes('@tanstack/react-table')) return 'vendor-table'
            if (id.includes('@tanstack/react-query')) return 'vendor-query'
            if (id.includes('i18next')) return 'vendor-i18n'
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
      '/media': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
      '/static': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
    },
  },
})
