import { defineConfig, type Config } from 'eslint/config';
import oxlint from 'eslint-plugin-oxlint';
import base from './eslint.base.config.ts';

const config: readonly Config[] = defineConfig(
  ...base,
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
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      // The type-aware form of `typescript/no-empty-object-type`, which
      // `.oxlintrc.json` sets to `allow`: it reports a type that resolves to
      // `{}` rather than one written as `{}`. Oxlint doesn't implement it, so
      // the allow can't reach it through `buildFromOxlintConfigFile`.
      '@typescript-eslint/no-generated-empty-object-type': 'off',
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
