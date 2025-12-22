import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use import.meta.env instead of process.env for better browser compatibility, especially Safari
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { esbuildOptions: { target: 'es2020' } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
});
