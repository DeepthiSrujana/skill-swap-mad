import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillswap.app',
  appName: 'SkillSwap',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '8779954823976-8f3bdfa06e115ec.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
