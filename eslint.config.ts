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
    'button/**/*',
    'button-group/**/*',
    'core/**/*',
    'fab/**/*',
    'icon/**/*',
    'text-field/**/*',
    'custom-elements.json',
    'react.d.ts',
    'packages/*/dist/**/*',
    'packages/*/custom-elements.json',
    'packages/material-x/button/**/*',
    'packages/material-x/button-group/**/*',
    'packages/material-x/fab/**/*',
    'packages/material-x/icon/**/*',
    'packages/material-x/text-field/**/*',
    'packages/material-x/core/**/*',
    'packages/material-x/react.d.ts',
    'packages/material-x/react.d.ts.map',
    'packages/material-x/**/*.js',
    'packages/material-x/**/*.js.map',
    'packages/material-x/**/*.d.ts',
    'packages/material-x/**/*.d.ts.map',
    'packages/core/*.js',
    'packages/core/*.js.map',
    'packages/core/*.d.ts',
    'packages/core/*.d.ts.map',
    'packages/traits-abstract/*.js',
    'packages/traits-abstract/*.js.map',
    'packages/traits-abstract/*.d.ts',
    'packages/traits-abstract/*.d.ts.map',
  ]),
  ...tsRequireTypeChecking,
  ...tsImports,
  ...testing,
  ...prettier,
  {
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
