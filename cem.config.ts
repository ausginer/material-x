import { COMPONENT_ENTRYPOINTS } from './.scripts/entrypoints.ts';

export type CEMConfig = Readonly<{
  globs: readonly string[];
  outdir: string;
}>;

export function createMaterialXCEMConfig(
  packageRoot: string = 'packages/material-x',
): CEMConfig {
  return {
    globs: COMPONENT_ENTRYPOINTS.map((entry) =>
      packageRoot === '.'
        ? `src/${entry}.ts`
        : `${packageRoot}/src/${entry}.ts`,
    ),
    outdir: packageRoot,
  } as const;
}

const config: CEMConfig = createMaterialXCEMConfig();

export default config;
