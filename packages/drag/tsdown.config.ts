/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfig } from 'tsdown';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';
import { constructLibraryTsdownPlugins } from '../../.scripts/tsdown-library.ts';
import names from './build/property-names.json' with { type: 'json' };
import { renameProperties } from './build/rename-properties.ts';
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
  // Last: the published modules carry each prefixed property under its output
  // name in the map.
  plugins: [...constructLibraryTsdownPlugins(), renameProperties(names)],
  // Folds the guarded development instruments to dead code.
  define: { __DEV__: 'false' },
  unbundle: true,
});

export default config;
