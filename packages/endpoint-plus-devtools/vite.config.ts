import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // Suppress INVALID_ANNOTATION warnings from @vueuse/core —
      // these are a known Rolldown/vueuse 14 incompatibility in Vite 8.
      // The annotations are simply ignored (no runtime impact), so this is safe.
      onLog(level, log, handler) {
        if (log.code === 'INVALID_ANNOTATION') return;
        handler(level, log);
      },
    },
  },
});
