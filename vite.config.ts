import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import sqlocal from 'sqlocal/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    watch: {
      ignored: [resolve(__dirname, 'docs/**')],
    },
  },
  plugins: [sqlocal(), react(), tailwindcss()],
}));
