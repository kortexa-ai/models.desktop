import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.kortexa.models',
  appName: 'Models',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
