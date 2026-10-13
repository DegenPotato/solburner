import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Solana/wallet-adapter deps assume Node globals (Buffer, process, global).
    // This plugin injects them into EVERY chunk that references them, at the
    // esbuild/Rollup level — unlike a plain `import './polyfills'` at the entry
    // point, this is immune to cross-chunk ESM import-hoisting order, which is
    // what broke the production build (dev mode masked it: unbundled dev serving
    // happens to preserve source-order execution, production chunking does not).
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'solana-web3': ['@solana/web3.js'],
          'solana-spl': ['@solana/spl-token'],
          'wallet-adapter': [
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-react-ui',
          ],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
