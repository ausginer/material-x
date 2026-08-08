# Checkpoint D fourth review — not ready to close

I independently reviewed the two third-review resolution records, the current source and regression tests, the parity ledger, the normative contract, and the live Checkpoint D verification evidence.

The third-review work closes the exact resolver-to-placeholder continuation reported as C3-01, completes the C3-02 terminology sweep, and makes C3-03's tier split internally consistent. The principal C3-04 corrections also landed. Checkpoint D still cannot close: the newly explicit I-36 guarantee is violated by other indirect calls on consumer-owned elements, including one path I reproduced through the public composition. The live contract also contradicts itself about whether Q-7 and Q-12 are open, and parts of the C3-01 and size evidence describe an artifact that no longer exists.

## Verdict

| Third-review item | Fourth-review result |
| --- | --- |
| C3-01 — stop after an aborted candidate rebuild | **The reported path is closed, but I-36 remains open.** `refresh()` now returns `false` and both axes stop before placeholder geometry; candidate geometry and `layoutAnimation()` still cross the same terminal barrier (C4-01). |
| C3-02 — normative axis terminology | **Closed.** Current declarations in contracts 00–04 and the identified contract 05 sites are axis-neutral; remaining `vertical()` references there are explicitly historical. |
| C3-03 — I-6/I-36 tier contradiction | **The tier wording is closed.** I-6 is now B over the tier-C I-36 participant obligation. The implementation does not yet satisfy the expanded indirect-call clause (C4-01). |
| C3-04 — public/evidence overclaims | **Substantially closed.** Landing validation, M-3 provenance, prototype cost labels, and type-negative assertions were corrected. Live derived size figures have drifted again (C4-04). |
| L-11 | Owner-deferred to Phase 23, with work assigned there; not reopened by this pass. |
| Checkpoint D | **Keep open.** |

## C4-01 — major: I-36 still permits callbacks and state publication after `destroy()`

The C3-01 implementation correctly communicates an abort caused by `getVisual()`: `RectIndex.refresh()` returns `false`, and `y()` / `xy()` return before measuring the placeholder (`src/sortable/rect-index.ts:124-154`; `src/sortable/y.ts:101-112`; `src/sortable/xy.ts:92-103`). The barrier is one indirect call too early, however. Immediately after the liveness check, the index invokes the consumer-owned visual's overridable `getBoundingClientRect()` (`src/sortable/rect-index.ts:155`).

If that method calls `controller.destroy()`:

1. teardown retires the index;
2. control returns to `refresh()`, which writes the returned rect and candidate into that retired index (`:156-165`);
3. if another candidate exists, its `getVisual()` runs before the next liveness check; if this was the last candidate, trailing bookkeeping marks the cache clean and measured again (`:168-175`);
4. the axis then proceeds to the placeholder geometry read.

This violates every relevant consequence in I-36: no further direct or indirect consumer call, no publication, and a rebuilt cache remaining retired (`contract/05-lifecycle-invariants.md:54`). It also affects a composition without `visual()`, because the consumer-owned item itself is used as the visual (`rect-index.ts:122-125`). The current y/xy regressions destroy from `getVisual()` and instrument only the later placeholder read (`tests/sortable/y.browser.test.ts:333-382`; `tests/sortable/xy.browser.test.ts:540-588`), so they do not exercise a destroy from candidate geometry.

The same class of violation exists in `layoutAnimation()`. Its before and after hooks invoke consumer-owned rows' `getBoundingClientRect()` in loops (`src/sortable/layout-animation.ts:154-184`) without a terminal check. A destroy from the before-pass geometry returns to the behavior, which still calls `movePlaceholder()` before its existing closed check (`src/sortable/spec.ts:758-779`). A destroy from the after-pass geometry can be followed by `element.animate()`, access to `animation.finished`, and `running.set()` after the feature's `retire()` already cleared its state (`src/sortable/layout-animation.ts:181-234`). Contract 05's F-47 enumeration incorrectly says these hooks need no barrier because no first-party hook reaches consumer code (`contract/05-lifecycle-invariants.md:365-374`); under C3-03's own indirect-invocation definition, DOM methods on consumer-owned rows are consumer calls.

I reproduced the second path with a temporary browser regression against the real `layoutAnimation()` composition, then removed it. The fourth after-move geometry read destroyed the controller and returned a shifted rect. Expected calls to the row's overridden `animate()` after close: `0`; received: `1`. The focused file otherwise passed 44 tests. This is observable behavior, not a theoretical cache concern.

Close I-36 at the participant level rather than adding another resolver-only patch: after every indirect consumer call, revalidate before the next foreign call, DOM mutation, or state publication. Add mirrored y/xy cases in which candidate `getBoundingClientRect()` destroys, plus layout-animation cases for both measurement passes. The fix should also update F-47's barrier enumeration.

## C4-02 — moderate: the normative C3-01 account denies the return channel that was implemented

Contract 03 still says an aborted candidate rebuild reaches `null` through the ordinary I-15 path, “so no new return channel exists and `resolve`'s control flow is unchanged” (`contract/03-feature-composition.md:410`). C3-01 deliberately did the opposite:

- `RectIndex.refresh()` changed from `void` to `boolean` (`src/sortable/rect-index.ts:64-69`);
- each axis gained a `false` branch that returns `null` before reading the placeholder (`src/sortable/y.ts:101-109`; `src/sortable/xy.ts:92-99`);
- the plan explicitly records that this overrides the earlier no-return-channel conclusion (`plan.md:805`).

The resolution record and implementation are coherent; the normative source of truth is not. Update contract 03 to describe the boolean abort channel and, when C4-01 is fixed, the complete set of calls capable of causing that abort.

## C4-03 — moderate: the live contract gives Q-7 and Q-12 mutually exclusive statuses

Contract 05 still places Q-7 under **Open before implementation** and calls it **Blocking before implementation sign-off** (`contract/05-lifecycle-invariants.md:397-415`). In the same document, M-4 answers Q-7 with the crossed-span decision and rejects a shared read phase (`:417-426`). The checked-in measurement says the gate was cleared and accepted at Phase 11 (`measurements/q7.md:1-5`), contract 03 says “Q-7 is answered” (`contract/03-feature-composition.md:617`), and the plan records it as landed (`plan.md:293-300`, `:387-397`). The C3 implementation record nevertheless carries Q-7 forward as still blocking (`reviews/checkpoint-d-3-resolution-implementation.md:179-186`).

Q-12 has the inverse residue: contract 05 classifies it as answered with the degraded re-anchor accepted (`contract/05-lifecycle-invariants.md:394`), while contract 03 says it remains open pending a fixture (`contract/03-feature-composition.md:561`).

These are current normative declarations, not historical decision prose. Move Q-7 to the resolved section or explicitly mark its historical question as answered, remove the blocking carry-forward, and make Q-12's status agree with its Phase 10 resolution. While doing so, update the Q-7 write-up's stale explanation that `vertical()` rebuilds lazily on the next frame (`measurements/q7.md:8`, `:62-63`): current sortable code uses `y()`/`xy()` and performs the axis measurement eagerly inside the committed-move bracket (`src/sortable/spec.ts:747-785`).

## C4-04 — minor: current size-derived prose no longer matches the measurement harness

`npx just size` passes and the rounded composition table is correct. The exact current measurements are:

| artifact | Brotli bytes |
| --- | ---: |
| minimal | 10,079 |
| complete | 10,864 |
| baseline A | 10,581 |
| baseline B | 6,889 |

Those values make composition cost `283 B`, or approximately **0.28 kB / 2.7%**, and migration cost `3,190 B`, or **3.19 kB**. Contract 03 and README still report `0.25 kB / 2.4% / 3.18 kB` (`contract/03-feature-composition.md:687`; `README.md:123`). Their remeasurement labels also stop at 2026-08-07 even though this audited landing is dated 2026-08-08 (`contract/03-feature-composition.md:671`; `README.md:107`). The current Phase 21 instruction says headroom is `0.16–0.21 kB`, while the harness and the surrounding current records show `0.17–0.23 kB` (`plan.md:878`).

One smaller wording correction belongs with the same evidence cleanup: the ledger says all four omitted type names were “dropped from” `sortable.js` (`ledger.md:272`), although its own `CancellationReason` row records that this was never a named export and was only structurally exposed. “Omitted from the decided `sortable.js` surface” matches what the negative fixture actually proves.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  33 test files passed
  736 tests passed
  18 skipped
  no type errors

npx just size
  PASS
  minimal:                    10.08 kB Brotli, 31 modules
  minimal (xy):              10.13 kB Brotli, 31 modules
  minimal + layoutAnimation: 10.49 kB Brotli, 32 modules
  minimal + landing:         10.39 kB Brotli, 32 modules
  complete:                  10.86 kB Brotli, 35 modules

npx just test tests/sortable/features.browser.test.ts
  Temporary indirect-destroy regression: FAIL as expected
  Expected post-close animate calls: 0; received: 1
  Remaining tests in the file: 44 passed
  Temporary test removed after reproduction
```

No production or test source remains changed by this review.
