import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all network interfaces, not just localhost, so the dev
    // server is reachable from another device (e.g. a phone) on the same
    // LAN at http://<this-machine's-LAN-IP>:5173 — needed to test the
    // capture="environment" native-camera hand-off, which only mobile
    // browsers act on.
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})