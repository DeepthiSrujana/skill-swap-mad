import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillswap.app',
  appName: 'SkillSwap',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '550830734952-ka3lfmnf8aaemhq05ik3gsekcm17heee.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
