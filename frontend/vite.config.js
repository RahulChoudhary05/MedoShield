import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      // Same-origin proxy in dev: the httpOnly refresh cookie just works (no CORS / SameSite pain).
      proxy: { '/api': { target, changeOrigin: true }, '/health': { target, changeOrigin: true } },
    },
    preview: { port: 4173 },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            charts: ['recharts'],
            motion: ['framer-motion', 'lenis'],
            vision: ['@mediapipe/tasks-vision'],
          },
        },
      },
    },
  }
})
