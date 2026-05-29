import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: ['index.html', 'audio-showcase.html'],
    },
  },
  server: {
    host: true,
  },
});
