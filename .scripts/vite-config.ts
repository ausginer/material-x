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
    // `@ydinjs/drag2` compiles its dev-only assertions against a bare
    // `__DEV__`, so that a published build can substitute `false` and drop the
    // branches entirely (drag2 `src/globals.d.ts`). There is deliberately no
    // `typeof __DEV__ === 'undefined'` fallback there — a missing define is a
    // `ReferenceError` at import rather than a silent ship of the assertions —
    // so it belongs on the *base* config every in-repo build derives from, not
    // on one of the specialized ones. Storybook builds drag2's stories from
    // source through `createMaterialXViteConfig`, and found this the loud way.
    define: { __DEV__: 'true' },
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
