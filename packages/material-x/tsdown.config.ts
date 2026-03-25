import { defineConfig, type UserConfig } from 'tsdown';
import files from './files.json' with { type: 'json' };
import { constructComponentTsdownPlugins } from '../../tsdown.config.ts';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';

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
