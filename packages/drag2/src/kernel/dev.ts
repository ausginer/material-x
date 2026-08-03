/**
 * The development-build flag guarding assertions the type system cannot prove
 * (contract 04 §Dev-only invariants).
 *
 * **A bare identifier, replaced at build time** — the mechanism M-3 was asked to
 * choose, and the only one measured to actually strip. The earlier form resolved
 * `process.env.NODE_ENV` inside a function, and M-3 showed a consumer defining
 * `NODE_ENV=production` recovered **30 bytes of 9.66 kB**: a minifier cannot
 * fold a call, so every guarded block survived and every assertion still *ran*.
 * With `__DEV__` substituted, `DEV` is a literal, the branches are dead code and
 * the same fixture loses **330 bytes (3.4%)**.
 *
 * The published build bakes in `false` (`tsdown.config.ts`); the repository's
 * own vite/vitest config defines `true`, so in-repo tests keep every assertion.
 * The trade is that a **consumer** cannot turn them back on. That costs nothing
 * today: these assertions check *behavior authoring* — frame-part shape, reset
 * exhaustiveness, unconsumed staged values — and behavior authoring is not on
 * the public surface (contract 03 §public boundary). The day it is, this needs
 * revisiting: either a dual build under an `exports` condition, or an inline
 * `process.env.NODE_ENV` comparison at each site rather than a shared constant.
 *
 * There is deliberately no `typeof __DEV__ === 'undefined'` fallback. A guard
 * like that is exactly what defeated folding before, and a missing define
 * should fail loudly at import rather than silently ship the assertions.
 */
export const DEV: boolean = __DEV__;
