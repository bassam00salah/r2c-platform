import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@r2c/shared': resolve(__dirname, '../../packages/shared/src'),
    }
  },
  build: {
    outDir: 'www',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
