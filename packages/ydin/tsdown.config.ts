/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfig } from 'tsdown';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';
import { constructLibraryTsdownPlugins } from '../../.scripts/tsdown-library.ts';
import files from './files.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  entry: packageFilesToTsdownEntries(files),
  platform: 'neutral',
  exports: packageFilesToCustomExports(files),
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
