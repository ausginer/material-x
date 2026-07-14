/* eslint-disable import-x/no-relative-packages */
import config from '../../eslint.config.ts';

// Test fixtures are authored trait modules exercised as data (read as text,
// materialized and imported at runtime); they are intentionally excluded from
// the package tsconfig, so keep the typed linter off them too.
const withIgnores: typeof config = [
  ...config,
  { ignores: ['test/fixtures/**'] },
];

export default withIgnores;
