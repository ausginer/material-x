import { fileURLToPath, pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type ConfigEnv, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import {
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.js';

const root = pathToFileURL(`${import.meta.dirname}/`);
const isCI = process.env['CI'] === 'true';

const config: UserConfigFnObject = defineConfig(({ command }: ConfigEnv) => ({
  root: fileURLToPath(root),
  build: {
    target: 'esnext',
  },
  rolldownOptions: {
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
    isCI
      ? null
      : inspect({
          include: [/\.css\.ts/],
          build: true,
        }),
    constructCSSStyles({ isProd: command === 'build' }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: command === 'build' }),
    react(),
  ],
}));

export default config;
