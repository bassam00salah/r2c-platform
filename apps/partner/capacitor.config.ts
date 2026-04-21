import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.r2c.partner',
  appName: 'R2CPartner',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
