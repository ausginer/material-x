// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
// import storybook from 'eslint-plugin-storybook';

import tsEslint from 'typescript-eslint';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import testing from 'eslint-config-vaadin/testing';
import prettier from 'eslint-config-vaadin/prettier';

const config = tsEslint.config(
  tsRequireTypeChecking,
  tsImports,
  testing,
  // storybook,
  prettier,
  {
    rules: {
      'import-x/no-unassigned-import': 'off',
      'import-x/no-duplicates': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
    files: ['src/**/*.ts', 'src/**/*.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);

export default config;
