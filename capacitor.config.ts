import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.omarasaeed.rafiq',
  appName: 'رفيق',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation: [],
    appStartPath: '/',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rafiq',
      iconColor: '#2F6F66',
    },
    SplashScreen: {
      // Released from src/platform/launch.ts once the web splash has painted.
      launchAutoHide: false,
    },
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
