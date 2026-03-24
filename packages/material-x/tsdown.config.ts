import { defineConfig, type UserConfig } from 'tsdown';
import {
  constructComponentTsdownPlugins,
  createPackageCustomExports,
  type PackageExportsMap,
} from '../../tsdown.config.ts';

const COMPONENT_ENTRYPOINTS = [
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
  'text-field/multiline-text-field',
  'text-field/text-field',
] as const;

const TYPE_ENTRYPOINTS = ['react'] as const;

const EXPORTS: PackageExportsMap = {
  './button/button': 'button/button',
  './button/icon-button': 'button/icon-button',
  './button/link-button': 'button/link-button',
  './button/switch-button': 'button/switch-button',
  './button/switch-icon-button': 'button/switch-icon-button',
  './button/split-button': 'button/split-button',
  './button-group/button-group': 'button-group/button-group',
  './button-group/connected-button-group':
    'button-group/connected-button-group',
  './fab/fab': 'fab/fab',
  './icon/icon': 'icon/icon',
  './react': {
    path: 'react',
    typeOnly: true,
  },
  './text-field/multiline-text-field': 'text-field/multiline-text-field',
  './text-field/text-field': 'text-field/text-field',
  './package.json': './package.json',
};

const config: UserConfig = defineConfig({
  entry: [...COMPONENT_ENTRYPOINTS, ...TYPE_ENTRYPOINTS].map(
    (entrypoint) => `src/${entrypoint}.ts`,
  ),
  platform: 'neutral',
  exports: createPackageCustomExports(EXPORTS),
  dts: true,
  sourcemap: true,
  format: 'esm',
  target: 'esnext',
  outDir: '.',
  external: [/node_modules/],
  clean: false,
  publint: true,
  inputOptions: {
    experimental: {
      nativeMagicString: true,
    },
  },
  plugins: constructComponentTsdownPlugins(),
  watch: false,
  unbundle: true,
});

export default config;
