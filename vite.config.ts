import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, type ConfigEnv, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import {
  constructCustomElementsHMR,
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.js';

const root = pathToFileURL(`${import.meta.dirname}/`);

const { values: cliOptions } = parseArgs({
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
  process.env['MX_VITE_INSPECT'] === 'true' || cliOptions.inspect === true;

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
    inspectEnabled
      ? inspect({
          include: [/\.css\.ts/],
          build: true,
        })
      : null,
    constructCustomElementsHMR(),
    constructCSSStyles({ isProd: command === 'build' }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: command === 'build' }),
    react(),
  ],
}));

export default config;
