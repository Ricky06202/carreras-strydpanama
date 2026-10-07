// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [react(), svelte()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Rolldown (Vite 8) partía MUI en chunks circulares -> TDZ al hidratar la isla admin.
          // Todo node_modules a un solo chunk vendor rompe los ciclos.
          manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
});
