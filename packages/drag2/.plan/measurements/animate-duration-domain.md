# `animate()`'s duration domain — the artifact D-77 rested on and did not have

**Status: measured, 2026-08-16, Chrome 150 (headless, Linux x86_64).** Both load-bearing clauses hold: `animate()` **rejects** `NaN`, negatives, `-Infinity`, strings and plain objects itself, and it **accepts `Infinity` and never completes**. One clause of the original claim does not survive contact with the call path and is struck: `undefined` is accepted by the platform, but `src/sortable/landing.ts` coalesces it to the default before `animate()` can see it, so it was never a reason for anything.

**Why this file exists** (D-79, P18A-08). Five sites carried this measurement as the sole justification for _deleting_ `requireFinite` rather than relocating it — `src/sortable/slots.ts`, `src/sortable/landing.ts`, the README, [03](../contract/03-feature-composition.md) §Public option domains and [07](../contract/07-free-drag-contract.md) B-4 (e) — and nothing in the tree recorded it. No measurement, no probe, no test of any clause. That is the evidence type this package otherwise refuses: `.plan/measurements/` exists for exactly it, D-76's gate demanded re-measurement before it could land, and `tests/decisions.node.test.ts` exists because a green suite is evidence about the _implemented_ contract only.

## Harness

`element.animate(keyframes, { duration })` on a detached-then-attached `div`, one call per value, in a live page. For each value: whether the call threw and with what message; the `getComputedTiming().duration` it produced; and whether `animation.finished` settled within 400 ms.

```js
const anim = el.animate([{ translate: '0px' }, { translate: '10px' }], {
  duration,
});
anim.effect.getComputedTiming().duration;
await Promise.race([
  anim.finished.then(
    () => 'finished',
    (e) => `rejected:${e.name}`,
  ),
  new Promise((r) => setTimeout(() => r('pending-after-400ms'), 400)),
]);
```

Run through the Chrome DevTools protocol against `HeadlessChrome/150.0.0.0`, which is the same engine family the browser suites run under. **Not automated**, and deliberately not: what it pins is a platform behaviour, so a test asserting it would fail on the engine that changed it rather than on the code that depends on it. What _is_ automated is the dependence — see §What the suite pins instead.

## Numbers

| `duration` | `animate()` | `getComputedTiming().duration` | `finished` |
| --- | --- | --- | --- |
| `NaN` | **throws** `TypeError` | — | — |
| `-1` | **throws** `TypeError` | — | — |
| `-Infinity` | **throws** `TypeError` | — | — |
| `'fast'` | **throws** `TypeError` | — | — |
| `{}` | **throws** `TypeError` | — | — |
| `'auto'` | accepts | `0` | finished |
| `undefined` | accepts | `0` | finished |
| `Infinity` | **accepts** | `Infinity` | **pending** |
| `0` | accepts | `0` | finished |
| `200` | accepts | `200` | finished |

Every throw carries one message: `Failed to execute 'animate' on 'Element': duration must be non-negative or auto`. So the platform's own domain is _non-negative number, or the string `'auto'`_ — one rule, five of our six rejected values covered by it.

**`Infinity` is not slow, it is unbounded.** Sampled on the same animation, one second apart:

|  | `currentTime` | `progress` | `playState` | `activeDuration` | `endTime` |
| --- | --- | --- | --- | --- | --- |
| immediately | 0 | 0 | `running` | `Infinity` | `Infinity` |
| after 1000 ms | 999.9 | **0** | `running` | `Infinity` | `Infinity` |

`currentTime` advances and `progress` does not move off zero. `finished` is still pending. There is no timeout, no error and no terminal — which is exactly why this is the one value a library invariant depends on.

## What this justifies, and what it does not

**Two legs hold the verdict up, and neither of them is the falsified one.**

1. **The byte argument** (`CODE_OF_SIZE.md` §1.3). Five of the six values the deleted `requireFinite` refused are refused by the platform anyway, at the same call, with a better message than the library's. Paying runtime bytes to restate that is the byte the Code of Size refuses.
2. **The `Infinity` invariant.** No platform check covers it, because the platform does not consider it an error. An animation that never completes is an operation whose settlement gate never opens and whose terminal never arrives — a library-liveness concern, not a value-domain one — so the one surviving check is `=== Infinity` and not `Number.isFinite`.

**The third leg fails, and it is struck at all five sites** (P18A-09). It read: _a finiteness test would have wrongly refused values the platform accepts_. As a statement about `animate()` that is true of `'auto'` and `undefined`. As a statement about **this code** it is false for `undefined` and JS-only for `'auto'`:

- `src/sortable/landing.ts` reads `options.duration ?? DEFAULT_DURATION`, so `undefined` becomes `200` and can never reach `animate()`. It is struck from the claim everywhere.
- `LandingOptions['duration']` is `number | LandingDuration`, and `LandingDuration` returns `number`, so `'auto'` is reachable **only from JavaScript**. It is kept, marked as such, and is not carried as though it were the argument.

A reason that survives only as a JS-only string must not be stated in five places as a general one. The verdict is unaffected; the reasons narrow to the two above.

## What the suite pins instead

The platform's behaviour is measured here rather than asserted in a test; what the suite asserts is the **dependence** — the properties that break if the platform's answer changes underneath us.

- `tests/sortable/features.browser.test.ts`, _should classify an out-of-domain contextual result at settlement_ — `-1` reaches `FAILURE_LANDING_CREATE` → `presentation`. The stage is the premise of the deletion: the platform's own refusal has to arrive where the library's did.
- `tests/sortable/features.browser.test.ts`, _should refuse an unbounded fixed duration at settlement_ / _…contextual duration…_ / _…exactly one terminal…_ — the retained `=== Infinity` guard, on both input forms, asserted by message and by code, plus the terminal it exists to preserve (P18A-19).
- `tests/sortable/options.node.test.ts` — the deletion assertions: construction refuses none of these values any more.

**Falsifier.** A Chrome release that either starts accepting `NaN`/negatives (making the deletion silently lose a diagnostic) or starts refusing `Infinity` (making the retained guard dead code). Either shows up as a failure in the first two rows above, not in this file.