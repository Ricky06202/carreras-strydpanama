// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: 'cloudflare',
    compatibilityFlags: ['nodejs_compat_v2']
  }),
  integrations: [react(), svelte()],

  vite: {
    plugins: [tailwindcss()]
  }
});