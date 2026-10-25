import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto expone el servidor a 0.0.0.0 automáticamente
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {

        target: 'http://backend_api:8000',   // nombre del servicio, NO localhost
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
