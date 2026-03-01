import { COMPONENT_ENTRYPOINTS } from './.scripts/entrypoints.ts';

const config = {
  globs: COMPONENT_ENTRYPOINTS.map((entry) => `src/${entry}.ts`),
  outdir: '.',
};

export default config;
