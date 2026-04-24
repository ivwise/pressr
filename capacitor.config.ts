import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pressr.app',
  appName: 'Pressr',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
