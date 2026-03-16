import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import sqlocal from 'sqlocal/vite';
import { defineConfig } from 'vite';
import { VitePWA as pwa } from 'vite-plugin-pwa';

type EnvDefinition = {
  [K in keyof ImportMetaEnvExtra as `import.meta.env.${K}`]: ImportMetaEnvExtra[K];
};

const env = {
  'import.meta.env.BASE_PATH': JSON.stringify('/irodori'),
} satisfies EnvDefinition;

export default defineConfig(({ mode }) => ({
  base: '/irodori',
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    ...env,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('lucide')) {
            return 'vendor-lucide';
          }
        },
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    watch: {
      ignored: [resolve(__dirname, 'docs/**')],
    },
  },
  plugins: [
    sqlocal(),
    react(),
    tailwindcss(),
    pwa({
      strategies: 'injectManifest',
      registerType: 'prompt',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: {
        name: 'irodori',
        short_name: 'irodori',
        theme_color: '#eba000',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
}));
