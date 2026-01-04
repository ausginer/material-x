import { fileURLToPath, pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type ConfigEnv, type UserConfigFnObject } from 'vite';
import {
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.js';

const root = pathToFileURL(`${import.meta.dirname}/`);

const config: UserConfigFnObject = defineConfig(({ command }: ConfigEnv) => ({
  root: fileURLToPath(root),
  build: {
    target: 'esnext',
  },
  rollupOptions: {
    external: ['oxfmt'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:52187',
        changeOrigin: true,
      },
    },
  },
  cacheDir: fileURLToPath(new URL('.vite/', root)),
  plugins: [
    constructCSSStyles({ isProd: command === 'build' }),
    constructHTMLTemplate({ isProd: command === 'build' }),
    constructCSSTokens({ isProd: command === 'build' }),
    react(),
  ],
}));

export default config;
