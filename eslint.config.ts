import { defineConfig, globalIgnores, type Config } from 'eslint/config';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import prettier from 'eslint-config-vaadin/prettier';
import testing from 'eslint-config-vaadin/testing';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';

const config: readonly Config[] = defineConfig(
  globalIgnores([
    '.vite/**/*',
    '.vite-inspect/**/*',
    '.docs/**/*',
    '.ladle/config.mjs',
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
      'import-x/prefer-default-export': 'off',
    },
  },
);

export default config;
