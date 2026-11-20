import { defineConfig, globalIgnores, type Config } from 'eslint/config';
// `eslint-config-prettier` alone, and the omission is the rule.
// `eslint-config-vaadin/prettier` is that config **plus**
// `'prettier/prettier': 'error'`, which makes the linter a second formatter:
// `oxfmt` writes the tree through `just fmt` and Prettier's opinion would then
// check it, and where two formatters disagree there is no state the handoff
// sequence can reach. The half taken here only *disables* stylistic rules, so
// it removes opinions rather than imposing one.
import prettierDisables from 'eslint-config-prettier';
import tsImports from 'eslint-config-vaadin/imports-typescript';
import testing from 'eslint-config-vaadin/testing';
import tsRequireTypeChecking from 'eslint-config-vaadin/typescript-requiring-type-checking';

const config: readonly Config[] = defineConfig(
  globalIgnores([
    // A harness worktree is a second checkout of this repository living inside
    // it, so every source file under here is a duplicate of one already linted
    // at its own path. Git ignores the directory; ESLint's file walk does not.
    '.claude/worktrees/**/*',
    // A record is evidence: a probe's source is what ran, and a tool's output
    // is what the tool wrote, so a lint repair would change what it records.
    '**/.plan/**/*',
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
  // A single flat-config object rather than an array, so it is not spread.
  prettierDisables,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      // `unbound-method` is not in this block. It is enforced at the end of
      // `eslint.config.ts` instead, after Oxlint's derived disables — see
      // there.
      '@typescript-eslint/no-use-before-define': 'off',
      // CONTRIBUTING declares a receiver-dependent interface member as a
      // method and a detached-safe one as a function-type property. A single
      // enforced style cannot state that distinction, and `unbound-method`
      // reads it.
      '@typescript-eslint/method-signature-style': 'off',
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
  {
    // Names that another program defines, so this code can't choose them. The
    // rule keeps its level and `properties: 'always'` for every other name.
    // ESLint reads each entry as a regular expression, so each is anchored to
    // admit that one name and no name containing it.
    rules: {
      camelcase: [
        'error',
        {
          properties: 'always',
          allow: [
            // `@minify-html/node`'s options, which the native library reads
            // by name.
            '^minify_css$',
            '^minify_js$',
            '^keep_comments$',
            '^allow_removing_spaces_between_attributes$',
            // The Material token data's custom field, whose shape the token
            // tables reproduce.
            '^token_class$',
            // GitHub's REST API answers, which `verify`'s mode decision reads.
            '^workflow_runs$',
            '^head_sha$',
            '^html_url$',
          ],
        },
      ],
    },
  },
);

export default config;
