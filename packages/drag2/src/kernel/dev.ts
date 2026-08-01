/**
 * The development-build flag guarding assertions the type system cannot prove
 * (contract 04 §Dev-only invariants).
 *
 * The repository has no dev/prod dual build, no bundler `define`, and no
 * existing `__DEV__` convention, so this is a module-scope constant resolved
 * once from `process.env.NODE_ENV`. In-repo tests get `true`; a consumer gets
 * whatever its environment reports.
 *
 * **This does not yet strip the guarded blocks from a production build**, which
 * the contract's wording ("compile out of production") asks for. Doing that
 * needs a build-time `define` replacing a bare `__DEV__` identifier, which is a
 * new build mechanism for this repository. It is deferred to the phase 11
 * bundle measurement (M-3), where the cost of carrying the assertions becomes
 * visible and the change can be made against evidence rather than assumption.
 */
function resolveDev(): boolean {
  if (typeof process === 'undefined') {
    return true;
  }

  return process.env['NODE_ENV'] !== 'production';
}

export const DEV: boolean = resolveDev();
