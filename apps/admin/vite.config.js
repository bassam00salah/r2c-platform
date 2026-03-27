import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@r2c/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: { port: 3002 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
