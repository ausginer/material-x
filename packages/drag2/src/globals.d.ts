/**
 * `__DEV__` is substituted at build time — `false` in the published bundle
 * (`tsdown.config.ts`), `true` in every in-repo build and test run
 * (`.scripts/vite-config.ts`). It is a **bare identifier** rather than a
 * `process.env` read because a minifier cannot fold a call: the
 * `process.env.NODE_ENV` form recovers 30 bytes of 9.66 kB, against 330 bytes
 * for the literal. There is deliberately no `typeof __DEV__ === 'undefined'`
 * fallback — that guard is exactly what defeats folding, and a missing define
 * should fail loudly at import rather than silently ship the assertions.
 *
 * **The kernel binds it nowhere.** Its four author-facing checks are production
 * checks, so `sortable/verified-refresh.ts` holds this package's one binding,
 * in the one tier with per-frame dev work.
 */
declare const __DEV__: boolean;
