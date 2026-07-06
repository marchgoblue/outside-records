import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Deployed at https://marchgoblue.github.io/outside-records/
export default defineConfig({
  base: '/outside-records/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        launch: resolve(__dirname, 'launch.html'),
      },
    },
    chunkSizeWarningLimit: 1600,
  },
});
