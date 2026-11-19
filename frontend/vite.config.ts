import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/static/frontend/' : '/',
  build: {
    outDir: '../sahar_project/static/frontend',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
      '/static': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
    },
  },
}))
