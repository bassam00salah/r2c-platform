export const PushNotifications = {
  addListener: async () => ({ remove: () => {} }),
  checkPermissions: async () => ({ receive: 'denied' }),
  requestPermissions: async () => ({ receive: 'denied' }),
  register: async () => {},
}
