import { defineConfig, globalIgnores, type Config } from 'eslint/config';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import prettier from 'eslint-config-vaadin/prettier';
import testing from 'eslint-config-vaadin/testing';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';
import oxlint from 'eslint-plugin-oxlint';

const config: readonly Config[] = defineConfig(
  globalIgnores([
    '.nx/**/*',
    '.vite/**/*',
    '.vite-inspect/**/*',
    '.docs/**/*',
    '.storybook-static/**/*',
    '**/*.js',
    '**/*.js.map',
    '**/*.d.ts',
    '**/*.d.ts.map',
    'packages/**/*.js',
    'packages/**/*.js.map',
    'packages/**/*.d.ts',
    'packages/**/*.d.ts.map',
  ]),
  ...tsRequireTypeChecking,
  ...tsImports,
  ...testing,
  ...prettier,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
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
      'import-x/no-extraneous-dependencies': 'off',
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
      '@typescript-eslint/promise-function-async': 'off',
    },
  },
);

export default config;
