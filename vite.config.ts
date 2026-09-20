import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
});
