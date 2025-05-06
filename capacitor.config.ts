
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.16d7d40f6a6d47a2a133da0c5dc0d5fc',
  appName: 'mind-wave-viewer-mobile',
  webDir: 'dist',
  server: {
    url: 'https://16d7d40f-6a6d-47a2-a133-da0c5dc0d5fc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000
    }
  }
};

export default config;
