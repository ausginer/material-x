import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import react from '@vitejs/plugin-react';
import { mergeConfig, type ConfigEnv, type UserConfig } from 'vite';
import inspect from 'vite-plugin-inspect';
import { constructCustomElementsHMR } from './vite-plugins.ts';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from '@ydinjs/vite-custom-element-assets';
import { viteTraitsPlugin } from '@ydinjs/vite-traits-plugin';

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

export function createViteConfig(root: URL): UserConfig {
  return {
    root: fileURLToPath(root),
    build: {
      target: 'esnext',
      rolldownOptions: {
        experimental: {
          nativeMagicString: true,
        },
      },
    },
    cacheDir: '.vite',
  };
}

export function createMaterialXViteConfig(
  env: ConfigEnv,
  root: URL,
): UserConfig {
  return mergeConfig(createViteConfig(root), {
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
      viteTraitsPlugin(),
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
  });
}

export function createCoreViteConfig(root: URL): UserConfig {
  return mergeConfig(createViteConfig(root), {
    plugins: [viteTraitsPlugin()],
  });
}
