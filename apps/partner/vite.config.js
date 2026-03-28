import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@r2c/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
  if (id.includes('node_modules/firebase')) {
    return 'vendor-firebase'
  }
  if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
    return 'vendor-react'
  }
  if (id.includes('node_modules/lucide-react')) {
    return 'vendor-icons'
  }

  if (id.includes('/src/screens/DashboardScreen')) {
    return 'screen-dashboard'
  }
  if (id.includes('/src/screens/OrderDetailScreen')) {
    return 'screen-order-detail'
  }
  if (id.includes('/src/screens/ReportsScreen')) {
    return 'screen-reports'
  }
  if (id.includes('/src/screens/SettingScreen')) {
    return 'screen-settings'
  }
  if (id.includes('/src/screens/QRScannerScreen')) {
    return 'screen-qr'
  }
  if (id.includes('/src/screens/Setupscreen')) {
    return 'screen-setup'
  }
  if (id.includes('/src/screens/Loginscreen')) {
    return 'screen-login'
        }
      },
    },
  },
  chunkSizeWarningLimit: 500,
  },
})
