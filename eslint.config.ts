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
      // `unbound-method` is not in this block. It is enforced at the end of
      // this file instead, after Oxlint's derived disables — see there.
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-shadow': 'off',
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
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/max-params': 'off',
    },
  },
  {
    // **Last, and the position is the rule.** `buildFromOxlintConfigFile`
    // resolves its argument against `process.cwd()`, so linting a package from
    // its own directory loads that package's `.oxlintrc.json` and derives a
    // wider disable set than the root's — 356 rules against 267, this one
    // among them. The same config object and the same file therefore produced
    // two severities depending only on the shell's directory, which is how a
    // rule can be switched off in the one place it is meant to guard while
    // reading as enforced from the root. Sitting after the spread is what
    // makes the severity the same from every working directory; stating it
    // above the spread does not.
    //
    // It is the only instrument in the pipeline for a method read without a
    // receiver — Oxlint implements it in neither derived set — and that is the
    // characteristic failure of converting a factory to a class: a member that
    // stops working at a call site the conversion never touches (D-170). Where
    // a platform method is captured to delegate to it, the site carries a
    // narrow disable naming where its receiver comes from.
    //
    // **`ignoreStatic: true` is inherited from the preset rather than chosen
    // here**, so a `static` member a converted class acquires is outside what
    // this reports. Only the severity is set, which is what leaves that option
    // where it is instead of silently re-deciding it.
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/unbound-method': 'error',
    },
  },
);

export default config;
