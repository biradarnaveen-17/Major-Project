import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_ethers: ['ethers'],
          vendor_chartjs: ['chart.js', 'react-chartjs-2'],
          vendor_react: ['react', 'react-dom']
        }
      }
    }
  }
});
