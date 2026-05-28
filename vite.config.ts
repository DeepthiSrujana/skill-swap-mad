import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

function getLocalIp() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
console.log('--- VITE BUILD DYNAMIC HOST IP DETECTED ---', localIp);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __DEV_HOST_IP__: JSON.stringify(localIp)
  },
  server: {
    allowedHosts: true
  }
})
