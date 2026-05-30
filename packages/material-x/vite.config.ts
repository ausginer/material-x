/* eslint-disable import-x/no-relative-packages */
import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructCustomElementsHMR,
  constructHTMLTemplate,
} from '../../.scripts/vite-plugins.ts';
import viteConfig from '../../vite.config.ts';

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
      }),
      constructHTMLTemplate(),
      constructCSSTokens({
        isProd: env.command === 'build',
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
