import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@r2c/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    port: 3001
  },
  build: {
    // [أداء] تقسيم الحزمة — كان ~1.1MB monolith
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
          ],
          'vendor-react': ['react', 'react-dom'],
          // lucide-react ثقيل — chunk مستقل
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
