/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfig } from 'tsdown';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';
import { constructComponentTsdownPlugins } from '../../.scripts/tsdown-component.ts';
import files from './files.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  entry: packageFilesToTsdownEntries(files),
  platform: 'neutral',
  exports: packageFilesToCustomExports(files),
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
