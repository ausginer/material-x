// material-x's own tsdown config, built into OUT instead of the package, with
// no package.json write. NO_EXTERNAL=1 adds rolldown's
// `treeshake.moduleSideEffects: 'no-external'`. Run from packages/material-x:
// OUT=<dir> [NO_EXTERNAL=1] aube exec tsdown --config <this file>
import base from '../../../packages/material-x/tsdown.config.ts';

export default {
  ...base,
  cwd: new URL('../../../packages/material-x/', import.meta.url).pathname,
  outDir: process.env['OUT'],
  exports: false,
  publint: false,
  sourcemap: false,
  ...(process.env['NO_EXTERNAL']
    ? { treeshake: { moduleSideEffects: 'no-external' } }
    : {}),
};
