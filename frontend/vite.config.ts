import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/projects': 'http://localhost:8000',
      '/calculations': 'http://localhost:8000',
      '/export': 'http://localhost:8000',
    }
  }
})
