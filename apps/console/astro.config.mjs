import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static', site: 'https://admin.quietatlas.io',
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } }
});
