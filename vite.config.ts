import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import {
  constructCustomElementsHMR,
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.js';

const parsedArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    inspect: {
      type: 'boolean',
      default: false,
    },
  },
  allowPositionals: true,
  strict: false,
});

const inspectEnabled =
  process.env['MX_VITE_INSPECT'] === 'true' ||
  parsedArgs.values.inspect === true;

const config: UserConfigFnObject = defineConfig(({ command }) => ({
  root: 'packages/material-x',
  build: {
    target: 'esnext',
  },
  rolldownOptions: {
    external: ['oxfmt'],
  },
  cacheDir: '.vite',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:52187',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    constructCustomElementsHMR(),
    constructCSSStyles({ isProd: command === 'build', isDocs: true }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: command === 'build', isDocs: true }),
    react(),
    inspectEnabled
      ? inspect({
          include: [/\.css\.ts/],
          build: true,
        })
      : null,
  ],
}));

export default config;
