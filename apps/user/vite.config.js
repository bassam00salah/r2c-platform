import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@shared':     resolve(__dirname, '../../packages/shared/src'),
      '@r2c/shared': resolve(__dirname, '../../packages/shared/src'),
    }
  },
  build: {
    outDir: 'www'
  }
})
