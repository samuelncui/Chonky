import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'chonky-icon-fontawesome.esm.js' : 'chonky-icon-fontawesome.cjs'),
    },
    minify: true,
    rollupOptions: {
      external: /^[^./]/,
    },
    sourcemap: true,
  },
});
