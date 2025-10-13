import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import type { Config } from '@eslint/config-helpers';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import prettier from 'eslint-config-vaadin/prettier';
import testing from 'eslint-config-vaadin/testing';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';

const root = new URL('./', import.meta.url);

const config: readonly Config[] = defineConfig(
  tsRequireTypeChecking as any,
  tsImports as any,
  testing as any,
  // storybook,
  prettier as any,
  {
    rules: {
      'import-x/no-unassigned-import': 'off',
      'import-x/no-duplicates': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-shadow': 'off',
      'import-x/prefer-default-export': 'off',
    },
    files: [
      './.scripts/**/*.ts',
      'src/**/*.ts',
      'src2/**/*.ts',
      'src2/**/*.js',
      'src/**/*.js',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(root),
      },
    },
  },
);

export default config;
