import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://quietatlas.io',
  output: 'hybrid',
  adapter: cloudflare(),
  build: {
    assets: 'assets'
  }
});
