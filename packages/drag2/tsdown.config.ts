/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfig } from 'tsdown';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';
import { constructLibraryTsdownPlugins } from '../../.scripts/tsdown-library.ts';
import files from './files.json' with { type: 'json' };
import { pruneDeclarations } from './prune-declarations.ts';

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
  // The published bundle has no dev assertions: `__DEV__` folds to `false`, the
  // guarded blocks become dead code and the minifier removes them. Measured in
  // M-3 — 330 bytes of 9.66 kB on the minimal fixture, and the assertions stop
  // *running* as well as stop shipping. See `src/kernel/dev.ts`.
  define: { __DEV__: 'false' },
  unbundle: true,
  hooks: {
    // `unbundle` emits one declaration per source module, including modules
    // whose *types* no public declaration names. They are unreachable rather
    // than exposed, but they are still published — 6.5 kB of internal SPI in
    // the tarball. Removed here, after the emit that produced them.
    'build:done': async (): Promise<void> => {
      await pruneDeclarations(files.runtime.map((entry) => `${entry}.d.ts`));
    },
  },
});

export default config;
