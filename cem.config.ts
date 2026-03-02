import { COMPONENT_ENTRYPOINTS } from './.scripts/entrypoints.ts';

export type CEMConfig = Readonly<{
  globs: readonly string[];
  outdir: string;
}>;

const config: CEMConfig = {
  globs: COMPONENT_ENTRYPOINTS.map((entry) => `src/${entry}.ts`),
  outdir: '.',
} as const;

export default config;
