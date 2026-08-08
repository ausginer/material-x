# Checkpoint D third review — implementation record

All four findings of [`checkpoint-d-3.md`](checkpoint-d-3.md) are closed. C3-03 was applied from the architect's decision, [`checkpoint-d-3-resolution-c3-03.md`](checkpoint-d-3-resolution-c3-03.md), §3.1–§3.5 verbatim and §4 items 1–11 executed.

**Every `C3-0x` in this record means Checkpoint D review 3.** Checkpoint C's third review used the same IDs for unrelated readiness-acknowledgement items; they are disambiguated at first use in [`../plan.md`](../plan.md).

Order of work was C3-01, then C3-02 and C3-04, then C3-03 — as the architect sequenced it, so C3-03's sweep #6 could be rebased onto what C3-01 had already added rather than duplicating it.

## C3-01 — the aborted rebuild's geometry read · fixed

**Confirmed as reported.** `RectIndex.refresh()` returned `void`, so both axes continued past an aborted rebuild straight into the incumbent measurement — `centreOf(placeholder)` in `y()`, `placeholder.getBoundingClientRect()` in `xy()`. The placeholder is consumer-owned and may override `getBoundingClientRect()`, so this is an observable post-destroy consumer callback, not merely wasted layout work.

### The mechanism, and why

**`refresh()` now returns `boolean`** — `false` on an aborted rebuild and nothing else — and each axis returns `null` on it before measuring anything.

```ts
if (!index.refresh(snapshot, dragged, runtime.getVisual, runtime.live)) {
  return null;
}
```

Chosen over the per-axis `runtime.live()` recheck the review offered as the alternative, on the repo's stated priority order:

1. **Performance.** The recheck costs one indirect call per `resolve`, per frame with a dirty cache, in **every** composition — including the minimal one, which composes no `visual()` and therefore *cannot* abort. The return channel costs nothing on the hot path: a boolean already in a register, one branch that predicts perfectly.
2. **Code size.** Two `return` statements and one branch per axis. Measured below at ±20 B, inside brotli's noise.
3. **Correctness under extension.** One obligation discharged inside the shared cache, rather than a rule each future axis has to remember. `y.ts` and `xy.ts` already document `live` as a per-axis *threading* obligation; adding a second per-axis obligation on top of it is the shape that gets forgotten.

**This overrides C2-01 §4A's "no new return channel is needed", and that sentence was true only of what it was reasoning about.** §4A's argument is that `count === 0` makes the candidate scan find nothing, so `nearest === -1` and `resolve()` returns `null` down the pre-existing I-15 path. That is correct about the *scan*. What it did not account for is that both axes measure the **incumbent placeholder before the scan**, so the `null` arrives one geometry read too late. The signature change is confined to a feature-private type (`RectIndex`, D-19/H-4) — no public entrypoint, no SPI, no kernel type. The comment in `rect-index.ts` that asserted the old conclusion is replaced with the new one rather than left standing.

Directionally this is where the architect said it would be: under the new tiering a post-terminal geometry read falsifies the **tier-C half**, which locates the barrier in the behavior. `kernel.ts` is untouched.

### Tests

Two mirrored cases, one per axis, instrumenting the placeholder's `getBoundingClientRect` on the element:

- `tests/sortable/y.browser.test.ts` — _should read no placeholder geometry once the controller closes_
- `tests/sortable/xy.browser.test.ts` — _should read no placeholder geometry once the controller closes_

**Both were verified to fail against pre-fix source** (source stashed, suite run, source restored): `expected 1 to be +0` in each, matching the reviewer's reproduction exactly.

The two existing cases claimed *"no geometry is read after it"* while asserting only the resolver call list. Neither is weakened: the claim is narrowed to what each actually checks — the `visual()` call list — and the geometry half is asserted in its own case, per the one-concern-per-`it` rule. `tests/COVERAGE.md` gains the row and a paragraph explaining why a call-list assertion cannot see this half.

## C3-02 — the terminology sweep · completed

Thirteen further present-tense declarations advanced. The nine the review named:

| File | Site |
| --- | --- |
| `contract/00-index.md` | D-34's activation-type declaration |
| `contract/02` | `rollback`'s "unused by" comment; the tier-C vacuity paragraph; `BehaviorSpec`'s `Activation` default comment; the seam-by-seam heading; the hit-testing paragraph; the landing-origin paragraph; the action-tag declaration; the failure-stage list |
| `contract/03` | M-3's non-composed baseline sentence |

**Four the review did not name, all in `contract/05`** — its list was not exhaustive, as the task anticipated:

| Anchor | Site |
| --- | --- |
| I-17's mechanism cell | "Vacuous for vertical sortable — see below" |
| the I-17 note | "For vertical sortable it is nonetheless *vacuous*" |
| Q-4 | "Vertical sortable declares `config.actionTags: 3`" — the current declaration 02 also carries |
| Q-7's blocking note | "`vertical()` rebuilds its rect index around the same committed placeholder move" — a live open question naming a module that no longer exists |

C2-04's rule is unchanged; contract 03's completion note now says the sweep was *begun* at C2-04 and *completed* at C3-02, and enumerates the remainder so a fourth pass can check rather than re-derive.

**Deliberately not swept**, and each already carries its own frame in the sentence containing it: `contract/00:75` (explicitly "written as `vertical()` until Phase 17 renamed"), `contract/03:100/241/304/357/740/746` (earlier draft, review 5, probe 1, the rename record), `contract/05:313` (F-26, a resolved finding quoted as it was written), `06-vertical-sortable-trace.md` and `challenge-response.md` (neither is in 00's normative 00–04 ranking; the latter is explicitly superseded), `ledger.md:108/128/138/227` (framed at `:128`), and `plan.md` and the review files, which are provenance.

## C3-03 — applied as decided

§3.1–§3.5 applied verbatim; §4 items 1–11 executed; the "checked, no change needed" table was not re-swept.

| # | Landed |
| --- | --- |
| 1 | I-6's row replaced — tier is now `B for every call the kernel sequences, over a tier-C participant obligation (I-36)` |
| 2 | I-36's invariant text gains the indirect-invocation clause; the "I-6 itself is unchanged" sentence replaced. Tier stays **C** |
| 3 | Provenance preamble |
| 4 | Tier-legend paragraph on the combined-rating idiom |
| 5 | `01:349`'s closing clause |
| 6 | Rebased, not duplicated — see below |
| 7 | F-47 ¶1's I-6 citation |
| 8 | `ledger.md` L-12 |
| 9 | `plan.md` C2-01 row |
| 10 | A Checkpoint D review 3 block under Checkpoint D, one row per finding |
| 11 | The Phase 18 deliverable's read-I-6-and-I-36-as-one-pair sentence — the acceptance test for the decision |

**Sweep #6, the one collision, rebased.** The *Terminal barrier in a resolver sequence* group had **no** geometry-instrumented case before C3-01 — the check was there in substance for the resolver list only — so #6 was appended rather than skipped. Its normative sentence is the architect's, verbatim; the trailing clause naming the two axis cases and why the geometry half needs a case of its own is C3-01's, per §7's split of ownership.

**Nothing in the decision turned out wrong when applied.** Its four §3 replacement texts matched their anchors exactly, its §4 anchors were all present, and its claim that no source or test change follows from it held: the 24 source citations of I-6/I-36 assert no tier and none needed editing. The one thing worth recording is that its §5 forward reference — that C3-01's fix would be located in the behavior rather than the kernel — is what the fix turned out to be.

## C3-04 — the overclaims · corrected

| Claim | Correction |
| --- | --- |
| `README.md` §Option domains, "all four throw" | Now "each throws", with the `landing({ run })` exception stated: a replacement runner leaves `duration`/`easing` with nothing to configure, so they are neither read nor validated |
| `src/sortable/feature.ts`'s `requireFinite` comment | "Validated at construction" → "called at construction wherever the value exists by then", naming both exceptions — the thunk (per landing) and `run` (suppressed) |
| `tests/sortable/options.node.test.ts` header | Same correction, pointing at the two cases the suite itself already pins |
| `contract/03:683`, M-3 at `+0.81 kB` | **Both** figures in that sentence were wrong, not one: it is `+0.76 kB` against a **9.33 kB** minimal (`+0.77`/`9.34` after m3's own re-measure note), never `+0.81` and never `9.90` |
| `checkpoint-d-2-resolution-c2-01.md` §7 | **Annotated as a prototype forecast, not rewritten** — it is a historical resolution record. The banner names the landed result (`+30–90 B`, `layoutAnimation` 10.51 kB) and points at the implementation record. `:14` and `:245` are relabelled "forecast" in place, keeping their numbers. Per C3-03 §7 the "I-6 itself is unchanged" line in §9.1 is left exactly as written |
| `ledger.md:272` vs `tests/consumer.node.test.ts` | **Both halves**, deliberately — see below |

**The ledger-vs-assertions call.** The claim was that the four negative assertions prevent re-adding a name to *any* frozen entry; the fixture asserts absence from `sortable.js` only. Neither pure option is honest on its own:

- Narrowing alone leaves one real gap. `AnimationTiming` dissolved into `LandingOptions` and `LayoutAnimationOptions`, which live on `sortable/landing.js` and `sortable/layout-animation.js` — so its plausible re-entry point is **not** the entry it was dropped from, and a narrowed claim would silently stop covering the one case most likely to happen.
- The full cross-product — four names × nine entries, 32 new lines — makes the claim literally true and asserts nothing anyone would ever do (`DragSubject` on `sortable/y.js`). Noise that dilutes a fixture whose value is that every line means something.

So: the ledger claim is narrowed to `sortable.js`, **and** `AnimationTiming` gains the two assertions where a re-add is plausible. The other three are names `sortable.js` alone ever exported, and for them the narrowed claim is exact. The ledger now states the reasoning rather than the conclusion, so the next reviewer can disagree with the judgement rather than re-derive the gap.

## What the review got wrong

Very little. Two notes:

- C3-04's M-3 item named the `+0.81 kB` delta but not the `9.90 kB` minimal in the same sentence, which is equally wrong. Both are corrected.
- C3-02's list was not exhaustive — four further sites, all in `contract/05`. The review said as much implicitly by scoping itself to "contracts 00–04"; 05 is normatively ranked below those but carries the same current declarations.

C3-01's reproduction, C3-03's diagnosis (as sharpened by the architect) and the rest of C3-04 all held exactly as stated.

## Cost

| Composition | Before | After | Δ |
| --- | --- | --- | --- |
| minimal | 10.07 kB | **10.08 kB** | +10 B |
| minimal (xy) | 10.12 kB | **10.13 kB** | +10 B |
| minimal + layoutAnimation | 10.51 kB | **10.49 kB** | −20 B |
| minimal + landing | 10.36 kB | **10.39 kB** | +30 B |
| complete | 10.85 kB | **10.86 kB** | +10 B |
| baseline A | 10.60 kB | **10.58 kB** | −20 B |

Module counts unchanged. **Every composition is inside its budget; headroom is 0.17–0.23 kB, against 0.16–0.21 kB before this pass.** No budget was raised, and the two negative deltas are brotli noise on a change that adds only two `return` statements and one branch per axis. The Phase 21 re-base note stands unchanged.

The README and contract 03 live size tables are re-measured rather than recopied.

## Verification

From `packages/drag2`:

```text
npx just fmt <8 changed source/test files>
  Finished in 46ms on 8 files using 12 threads.

npx just lint-fix <same 8>
  clean — oxlint --fix and eslint --fix both silent

npx just typecheck
  tsc -p tsconfig.json --noEmit — clean

npx just test
  Test Files  33 passed (33)
       Tests  736 passed | 18 skipped (754)
  Type Errors  no errors

npx just size
  minimal                                       10.08 kB brotli  (31 modules, 0.18 kB under budget)
  minimal (xy)                                  10.13 kB brotli  (31 modules, 0.18 kB under budget)
  minimal + layoutAnimation                     10.49 kB brotli  (32 modules, 0.18 kB under budget)
  minimal + landing                             10.39 kB brotli  (32 modules, 0.17 kB under budget)
  complete                                      10.86 kB brotli  (35 modules, 0.18 kB under budget)
  baseline A - feature-matched, non-composed    10.58 kB brotli  (30 modules, 0.23 kB under budget)
  baseline B - shipped @ydinjs/drag sortable.js  6.89 kB brotli  (26 modules, 0.21 kB under budget)
```

Test count 734 → **736**: the two new geometry regressions. Nothing removed, nothing weakened.

**Pre-fix verification of the new tests**, run with `src/sortable/{rect-index,y,xy}.ts` stashed:

```text
FAIL tests/sortable/y.browser.test.ts  > should read no placeholder geometry once the controller closes
  AssertionError: expected 1 to be +0
FAIL tests/sortable/xy.browser.test.ts > should read no placeholder geometry once the controller closes
  AssertionError: expected 1 to be +0
```

## Untouched, confirmed

- **C2-01's mechanism.** The latch is still behavior-owned on `SortableRuntime.closed`, still read by five readers, still threaded to the feature-private cache as `live()` on the per-operation view. This pass adds a return *from* the cache, not a new source of liveness.
- **The frozen SPI and the frozen public surface.** No kernel type changed; `RectIndex` is feature-private by D-19 and H-4 and reaches no entrypoint. `tests/exports.node.test.ts` and `tests/consumer.node.test.ts` are unchanged as equalities — the latter's only addition is two *negative* assertions.
- **D2 and D5.** The restored geometry path is unchanged in substance; D5's frozen surface is unchanged, and the C3-04 work only makes its guard match its claim.
- **L-11.** Still deferred to Phase 23 by owner decision, still not reopened.
- **`panic()`.** Still the stated blind spot; C3-03 §7's note that it now sits inside the tier-C half rather than as a hole in a tier-B claim is the only change, and it is a change to how it reads.

## What remains open

Nothing from this review. Carried forward unchanged from earlier passes:

- **L-11** — the five `CANCEL_*`/`AT_*` string constants, Phase 23.
- **Phase 21's budget re-base.** Headroom is 0.17–0.23 kB against budgets set with ~0.3 kB. This pass did not consume any of it, but it did not create any either.
- **I-7's precondition dependency on I-30**, recorded by C3-03 §4 as a watch item rather than a change. Not touched.
- **Q-7**, still blocking before implementation sign-off, now naming `y()`/`xy()` instead of `vertical()`.
