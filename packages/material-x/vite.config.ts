import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import viteConfig from '../../vite.config.ts';
import {
  constructCustomElementsHMR,
  constructCSSTokens,
  constructCSSStyles,
  constructHTMLTemplate,
} from '../../.scripts/vite-plugins.js';

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

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    root: '.',
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
    plugins: [
      constructCustomElementsHMR(),
      constructCSSStyles({
        isProd: env.command === 'build',
        isDocs: true,
      }),
      constructHTMLTemplate(),
      constructCSSTokens({
        isProd: env.command === 'build',
        isDocs: true,
      }),
      react(),
      inspectEnabled
        ? inspect({
            include: [/\.css\.ts/],
            build: true,
          })
        : null,
    ],
  }),
);

export default config;
