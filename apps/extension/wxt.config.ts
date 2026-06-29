import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Asterism',
    description: 'Organize your GitHub stars into a meaningful constellation.',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
