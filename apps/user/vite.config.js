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
      '@r2c/shared': resolve(__dirname, '../../packages/shared/src'),
    }
  },
  build: {
    outDir: 'www',
    // [أداء] تقسيم الحزمة لتحسين التحميل الأولي
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase في chunk منفصل — لا يتغير كثيراً
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
            'firebase/storage',
          ],
          // React core
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // [أداء] تحذير عند تجاوز 500KB بدلاً من 1MB
    chunkSizeWarningLimit: 500,
  },
})
