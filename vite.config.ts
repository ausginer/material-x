import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig, type UserConfig } from 'vite';
import { constructCss } from './.scripts/vite-plugins.js';

const root = pathToFileURL(`${import.meta.dirname}/`);

console.log('VITE CONFIG')

const config: UserConfig = defineConfig({
  root: fileURLToPath(root),
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:52187',
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    supported: {
      decorators: false,
      'top-level-await': true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        decorators: false,
        'top-level-await': true,
      },
    },
  },
  cacheDir: fileURLToPath(new URL('.vite/', root)),
  plugins: [constructCss()],
});

export default config;
