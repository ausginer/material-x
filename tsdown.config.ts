import { posix } from 'node:path/posix';
import { defineConfig, type Rolldown, type UserConfig } from 'tsdown';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.ts';

function classVarCleanupPlugin(): Rolldown.Plugin {
  return {
    name: 'tsdown:class-var-cleanup',
    renderChunk(code: string, _, __, { magicString }) {
      if (!magicString) {
        return null;
      }

      const matches = [...code.matchAll(/\bvar\s+([\w$]*)\s*=\s*class\b/gu)];

      if (matches.length === 0) {
        return null;
      }

      for (const match of matches.toReversed()) {
        const { index } = match;

        magicString.overwrite(
          index,
          index + match[0].length,
          `class ${match[1]}`,
        );
      }

      return {
        code: magicString,
      };
    },
  };
}

function dropEmptyChunksPlugin(): Rolldown.Plugin {
  return {
    name: 'tsdown:drop-empty-chunks',
    generateBundle(_, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk' || output.code.trim() !== '') {
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bundle[fileName];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bundle[`${fileName}.map`];
      }
    },
  };
}

const COMPONENTS = [
  'button/button',
  'button/icon-button',
  'button/link-button',
  'button/switch-button',
  'button/switch-icon-button',
  'button/split-button',
  'button-group/button-group',
  'button-group/connected-button-group',
  'fab/fab',
  'icon/icon',
  'text-field/text-field',
] as const;

const TYPES = ['react'] as const;
const OUT_DIR = 'dist' as const;

const config: UserConfig = defineConfig({
  entry: [...COMPONENTS, ...TYPES].map((entry) => `src/${entry}.ts`),
  platform: 'neutral',
  exports: {
    customExports(exports) {
      return Object.fromEntries(
        Object.entries(exports).flatMap(([key, value]) => {
          if (key.includes('package.json')) {
            return [[key, value]];
          }

          const entry = key.startsWith('./') ? key.slice(2) : key;
          const typeOnly = TYPES.includes(entry);

          if (typeof value !== 'string') {
            if (!typeOnly) {
              throw new Error(`${value} is not of type string`);
            }

            return [
              [
                `${key}.js`,
                { types: `./${posix.normalize(`${OUT_DIR}/${entry}.d.ts`)}` },
              ],
            ];
          }

          return [
            [
              `${key}.js`,
              {
                types: value.replace('.js', '.d.ts'),
                ...(typeOnly ? {} : { default: value }),
              },
            ],
          ];
        }),
      );
    },
  },
  dts: true,
  sourcemap: true,
  format: 'esm',
  target: 'esnext',
  outDir: OUT_DIR,
  external: [/node_modules/],
  inputOptions: {
    experimental: {
      nativeMagicString: true,
    },
  },
  plugins: [
    dropEmptyChunksPlugin(),
    classVarCleanupPlugin(),
    constructCSSStyles({ isProd: true }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: true }),
  ],
  watch: false,
  unbundle: true,
});

export default config;
