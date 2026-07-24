import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../..',
  publicDir: '../../.cache/embedding-assets/v1/public',
  plugins: [react(), tailwindcss()],
  test: {
    setupFiles: './src/test/setup.ts',
  },
});
