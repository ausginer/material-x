/* eslint-disable import-x/no-relative-packages */
import type { Config } from 'eslint/config';
import config from '../../eslint.config.ts';

const withPackageRules: readonly Config[] = [
  ...config,
  {
    // After the shared configuration, whose last block sets this rule to
    // `error`. Passing a method with the receiver it is called on is this
    // package's API, through `requestStep`, `use` and the kernel's pass, and
    // the rule doesn't read the receiver argument, so it reported every such
    // call. A method that declares `this` is still checked by typecheck at
    // those calls (drag:DRD-37).
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];

export default withPackageRules;
