import { defineConfig, type UserConfig } from 'tsdown';
import {
  constructLibraryTsdownPlugins,
  createPackageCustomExports,
  type PackageExportsMap,
} from '../../tsdown.config.ts';

const ENTRYPOINTS = ['index'] as const;

const EXPORTS: PackageExportsMap = {
  '.': 'index',
  './package.json': './package.json',
};

const config: UserConfig = defineConfig({
  entry: ENTRYPOINTS.map((entrypoint) => `src/${entrypoint}.ts`),
  platform: 'neutral',
  exports: createPackageCustomExports(EXPORTS),
  dts: true,
  format: 'esm',
  sourcemap: true,
  target: 'esnext',
  outDir: '.',
  fixedExtension: false,
  clean: false,
  plugins: constructLibraryTsdownPlugins(),
  unbundle: true,
});

export default config;
