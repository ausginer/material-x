import { defineConfig, globalIgnores, type Config } from 'eslint/config';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import prettier from 'eslint-config-vaadin/prettier';
import testing from 'eslint-config-vaadin/testing';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';
import importX from 'eslint-plugin-import-x';
import oxlint from 'eslint-plugin-oxlint';
import packageJson from './package.json' with { type: 'json' };

const config: readonly Config[] = defineConfig(
  globalIgnores([
    '.vite/**/*',
    '.vite-inspect/**/*',
    '.docs/**/*',
    '.storybook-static/**/*',
    ...packageJson.files.map((f) => (f.endsWith('.ts') ? f : `${f}/**/*`)),
  ]),
  ...tsRequireTypeChecking,
  ...tsImports,
  ...testing,
  ...prettier,
  {
    plugins: {
      // @ts-expect-error: https://github.com/un-ts/eslint-plugin-import-x/issues/439
      'import-x': importX,
    },
    rules: {
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'import-x/no-unresolved': [
        'error',
        {
          ignore: ['\\.css$', '\\.html$'],
        },
      ],
      'import-x/no-unassigned-import': 'off',
      'import-x/no-duplicates': 'off',
      'import-x/prefer-default-export': 'off',
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
  {
    // disable rules duplicated in Oxlint but not handled by
    // `buildFromOxlintConfigFile`.
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      'import-x/no-mutable-exports': 'off',
    },
  },
);

export default config;
