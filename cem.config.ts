/* eslint-disable import-x/no-relative-packages */
import files from './packages/material-x/files.json' with { type: 'json' };

export type CEMConfig = Readonly<{
  globs: readonly string[];
  outdir: string;
}>;

export function createMaterialXCEMConfig(
  packageRoot: string = 'packages/material-x',
): CEMConfig {
  return {
    globs: files.runtime.map((entry) =>
      packageRoot === '.'
        ? `src/${entry}.ts`
        : `${packageRoot}/src/${entry}.ts`,
    ),
    outdir: packageRoot,
  } as const;
}

const config: CEMConfig = createMaterialXCEMConfig();

export default config;
