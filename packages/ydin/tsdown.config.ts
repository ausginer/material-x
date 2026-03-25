import { defineConfig, type UserConfig } from 'tsdown';
import files from './files.json' with { type: 'json' };
import { constructLibraryTsdownPlugins } from '../../tsdown.config.ts';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';

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
