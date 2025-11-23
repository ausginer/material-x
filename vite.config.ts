import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig, type ConfigEnv, type UserConfigFnObject } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { constructCSS } from './.scripts/vite-plugins.js';

const root = pathToFileURL(`${import.meta.dirname}/`);

const config: UserConfigFnObject = defineConfig(({ command }: ConfigEnv) => ({
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
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        decorators: false,
        'top-level-await': true,
      },
    },
  },
  cacheDir: fileURLToPath(new URL('.vite/', root)),
  plugins: [
    constructCSS({ isProd: command === 'build' }),
    react({ devTarget: 'esnext' }),
  ],
}));

export default config;
