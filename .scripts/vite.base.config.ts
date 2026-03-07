import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, type ConfigEnv, type UserConfigFnObject } from 'vite';
import {
  constructCustomElementsHMR,
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from './vite-plugins.js';

const root = new URL('../', import.meta.url);

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

export { cliOptions };

const config: UserConfigFnObject = defineConfig(({ command }: ConfigEnv) => ({
  root: fileURLToPath(root),
  build: {
    target: 'esnext',
  },
  rolldownOptions: {
    external: ['oxfmt'],
  },
  cacheDir: fileURLToPath(new URL('.vite/', root)),
  plugins: [
    constructCustomElementsHMR(),
    constructCSSStyles({ isProd: command === 'build', isDocs: true }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: command === 'build', isDocs: true }),
    react(),
  ],
}));

export default config;
