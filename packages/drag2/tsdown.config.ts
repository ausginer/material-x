/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfig } from 'tsdown';
import {
  packageFilesToCustomExports,
  packageFilesToTsdownEntries,
} from '../../.scripts/package-files.ts';
import { constructLibraryTsdownPlugins } from '../../.scripts/tsdown-library.ts';
import files from './files.json' with { type: 'json' };
import {
  pruneDeclarations,
  stripDeclarationMapReferences,
} from './prune-declarations.ts';

const config: UserConfig = defineConfig({
  entry: packageFilesToTsdownEntries(files),
  platform: 'neutral',
  exports: packageFilesToCustomExports(files),
  // **This package publishes no declaration maps** (D-111), stated rather than
  // left to a default — the reference is stripped after the emit below, and a
  // future default that started producing the chunks would make that strip
  // delete a map the tarball then failed to ship.
  dts: { sourcemap: false },
  format: 'esm',
  sourcemap: true,
  target: 'esnext',
  outDir: '.',
  fixedExtension: false,
  clean: false,
  plugins: constructLibraryTsdownPlugins(),
  // `__DEV__` folds to `false`, the guarded blocks become dead code and the
  // minifier removes them. Measured in M-3 — 330 bytes of 9.66 kB on the
  // minimal fixture. **One tier reads it** (D-101, D-108):
  // `src/sortable/verified-refresh.ts`'s per-frame equivalence instrument. The
  // kernel's author-facing checks are unconditional and ship.
  define: { __DEV__: 'false' },
  unbundle: true,
  hooks: {
    // `unbundle` emits one declaration per source module, including modules
    // whose *types* no public declaration names. They are unreachable rather
    // than exposed, but they are still published — 6.5 kB of internal SPI in
    // the tarball. Removed here, after the emit that produced them.
    'build:done': async (): Promise<void> => {
      await pruneDeclarations(files.runtime.map((entry) => `${entry}.d.ts`));
      // **The dangling declaration-map references** (D-111). tsdown runs the JS
      // and the declaration emit as **one** rolldown build over one `sourcemap`
      // option, so the `true` this package wants for `.js.map`
      // `sourcesContent` also makes the dts plugin append a
      // `//# sourceMappingURL=….d.ts.map` comment — while no such chunk is
      // produced. All 31 references dangled in the tarball, which is a package
      // contract defect rather than a cosmetic one. Emitting and shipping the
      // maps instead is the monorepo's choice to make in every package at once;
      // dropping the comment is the half this package owns.
      //
      // Sequenced after the prune on purpose: rewriting a file about to be
      // deleted is wasted work, and the prune's fail-safe should see the emit
      // exactly as the plugin left it.
      await stripDeclarationMapReferences();
    },
  },
});

export default config;
