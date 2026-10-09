import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({
  integrations: [react()],
  output: 'static', site: 'https://admin.quietatlas.io',
  build: { inlineStylesheets: 'never' },
  vite: { plugins: [tailwind()], build: { assetsInlineLimit: 0 } }
});
