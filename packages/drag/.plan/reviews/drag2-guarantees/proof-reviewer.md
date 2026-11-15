# Proof review: the drag2 guarantee tests and the test-side oracles

**Read at `1c1e93bd9`** on `drag2/removal`. The range is `70f0ea270..1c1e93bd9`. drag2's tests were read at `0870abd75`. The architect's later commit `75611d3ae`, which rules on the two stops, was not read.

**Subjects:** the 18 rows of [`drag2-guarantees-handoff.md`](../../drag2-guarantees-handoff.md) (`drag:DRF-45`, `DRD-64` property 7) as the [guarantees report](../../drag2-guarantees-report.md) states them, and [`y-geometry-terms-handoff.md`](../../y-geometry-terms-handoff.md) (`drag:DRD-65`, `drag:DRD-67`) as the [y-geometry report](../../y-geometry-terms-report.md) states it.

**Lens:** test quality. For each claim, the questions were whether the test asserts the guarantee it names, whether it can fail for that reason, and whether its fixture satisfies it by construction. The review also checks whether the saved mutation witnesses are real and the reported survivors are as stated, and whether the oracles observe what `DRD-67` requires without changing the code under test.

## Scope

**Covered:**

- Every cited test of F1 to F8 and S1 to S10, and every saved `.diff` and `.log` under [`mutations/`](../../probes/drag2-guarantees/mutations/).
- `tests/support/oracles.ts`, `oracles.source.ts`, `oracles.build.ts`, `gap-conformance.ts` and `y-geometry.browser.test.ts`.
- The configuration diff in `.scripts/vitest-config.ts`, and `src` against the removed `__DEV__` code.
- In Chromium, in a copy of `1c1e93bd9`: the liveness, y-geometry and layout-animation files in the source and consumer projects, and nine mutations. The [probes](proof-reviewer-probes/README.md) list every run and its result.

**How the work was split:** three sub-agents searched F1 to F8, S1/S3/S4/S5/S9 and S6/S7/S8/S10 for candidates. Every candidate reported below was confirmed by this reviewer, by a run or by reading the cited lines. Candidates that weren't confirmed are left out.

**Not covered:**

- Firefox and WebKit. WebKit is not owed (`DRO-18`).
- The five `size.node.test.ts` rows (`DRO-4`).
- Typecheck and lint.
- The emitted-`.js` comparison and `npx just size`.
- The `not-installed` and `held-x-removed` oracle witnesses, which were read and not re-run.
- The bench `__DEV__` define (open item 1 of the y-geometry report). The architect has ruled on it.

## Verdict

**`DRF-45` is not yet proved.** The rows have tests, and most rows have a real `src` mutation that fails the test on the guarantee's own assertion. Three things are wrong with the proof:

- The S6 no-op clause, which the architect accepted on the report's account, has no witness. That account is inaccurate (`proof-reviewer-1`).
- S2's displacement clause is witnessed only by the equivalence oracle (`proof-reviewer-2`).
- Several saved logs record failures that the since-removed development check produced (`proof-reviewer-3`).

**`DRD-67`'s oracles implement property 4 as specified, and don't perturb the code under test.** One narrowing goes unreported: the refusal oracle doesn't count an event from another realm (`proof-reviewer-4`).

**Both stops of the y-geometry report are confirmed as reported.** §Stops adds evidence for the architect and decides neither.

## Findings

### S6's no-op clause has no removal witness, and the accepted account of `S6-8` is inaccurate (`proof-reviewer-1`)

Tier **B**, CONFIRMED.

- **Current:** the report's §Unproven says that "`S6-8` removes all three [guards] and fails `:166`". §Disposition of the drag2 guarantees report accepts it: "`S6-8`, which removes all three, is a mutation of the implementing code and fails `:166`".
  - `S6-8.diff` does remove the three guards, by taking `S6-7`'s `operation.ts` hunk and dropping `this.#lastGap === gap` from `LinearShift.moved`.
  - It also adds new code to `moved`: `if (lo === hi) { context.displacement.report(this.#index.item(lo), 0, this.#rowDistance, context.space); }`.
  - The `:166` failure, `expected [ 1 ] to deeply equal []`, is that injected report.
- **Why it is a problem:** with only the three guards removed, `:166` passes ([`S6-three-guards.diff`](proof-reviewer-probes/S6-three-guards.diff): 15 tests fail and `:166` passes). With `lo === hi`, `shift` and the report loop do nothing, so the empty span is a fourth guard, and no removal of implementing code fails `:166`.
  - `DRF-45`'s required property is a test that "fails under a mutation of the code that implements the row". `S6-8` shows only that `:166` detects a row reported by code that was added. The disposition accepted the clause on the inaccurate account.
  - In unmutated code, `:166`'s pointer path (30 to 35) is decided only by `y()`'s `null` return (`y.ts:69-71`). The operation's `placeholderAt` check and the `lastGap === gap` check are never reached there.
- **Evidence:** `S6-8.diff`, its second hunk. The [probe runs](proof-reviewer-probes/README.md) of `S6-8` and `S6-three-guards`.
- **Required property:** the record that accepts S6's no-op clause states what `S6-8` actually changes. Either a witness exists that removes implementing code, or the clause is recorded as unproven by removal.

### S2's displacement clause is witnessed only by the equivalence oracle, not by the gap instrument (`proof-reviewer-2`)

Tier **B**, CONFIRMED.

- **Current:** S2's row includes "sub-pixel geometry with a displacement running" (`y-geometry.browser.test.ts:140`). Its mutation is `S2-3`, which stops subtracting the displacement in `RectIndex#read`. The y-geometry report's table says that `S2-3` "Fails 1: `:139`".
  - In that run, `S2-3-at-tie.log` at `b6fef26c4`, the failure is `expected [ 'at 50: no placeholder' ]`: the development check ended the drag. So did the guarantees unit's `S2-3.log`.
  - At `1c1e93bd9`, `S2-3` fails `:140` in both projects only through the oracle's after-test check: `disagreed … at slot 0, …`. The instrument's `sweepGaps` returns `[]`, so the test's own assertion passes.
- **Why it is a problem:** the test claims that `y()` proposes the gap a full measurement gives with a displacement running. Under a mutation that breaks displacement settling, every sampled proposal is still admissible, so the instrument can't fail for the reason the test names. What fails is the cache-equivalence oracle, which every browser test carries. The report's statement that the saved mutation "still fails its tests" doesn't say that the failure is the development check's, and since `953a0fcc6` it is the oracle's.
- **Evidence:** the [probe runs](proof-reviewer-probes/README.md) of `S2-3`. `S2-3.log` and `S2-3-at-tie.log`.
- **Required property:** each S2 clause has a mutation of the implementing code under which the gap instrument itself reports a disagreement. Otherwise the record states that the clause is witnessed by the equivalence oracle alone.

### The saved mutation logs aren't from the merged-tree re-run, and several record development-check failures (`proof-reviewer-3`)

Tier **B**, CONFIRMED.

- **Current:** the guarantees report says that every saved mutation "was then re-applied on the merged tree and its tests re-run", and that 55 of 56 failed.
  - Each `.log`, however, was committed with its per-row commit. For example, `S1.log` came with `dea475542`, `S2.log` with `849c18207`, `S6-8.log` and `S7-5.log` with `53852d117`, and `F8.log` with `b22d148db`. No re-run output is saved.
  - `F8.log` and `F8-2.log` name `consumer-types.node.test.ts:98` and `:104`. No committed version has a test at those lines: the `it` calls are at `:105` and `:113`.
  - `S6-7.log` names no file. `S1.log` and `S1-2.log` are sorted by line, so a received value can't be tied to its test.
- **Why it is a problem:** these logs are the evidence that `DRF-45`'s proof rests on, and some of them record a mechanism that no longer exists. Under the development check, `S2.log`, `S2-3.log` and `S2-at-tie.log` record `no placeholder`. `S7-5.log` records `:330` as `expected +0 to be close to -80`, a settled-travel failure that a keyframe-projection change can't cause directly.
  - At `1c1e93bd9`, `S2` fails `:79` on four gap disagreements plus the oracle. `S7-5` fails `:330` on `expected 160 to be close to 80`.
  - The witnesses mostly still hold, but the saved record no longer shows why.
- **Evidence:** `git log` on each log path. The [probe runs](proof-reviewer-probes/README.md) of `S2` and `S7-5`.
- **Required property:** a mutation witness that the proof cites is saved from the tree the proof is stated at, and names the test and the assertion that failed.

### The refusal oracle doesn't count an event from another realm (`proof-reviewer-4`)

Tier **B**, CONFIRMED for the narrowing; whether any current test hits it is not established.

- **Current:** `installRefusals` counts a nested `enter` only when `argument instanceof Event` (`oracles.ts:255`), which tests against the top window's `Event`. The removed `countRefused` counted every nested `enter` that had a step. `DRD-67` property 4 says "a call to `enter` with a step and an `Event`".
- **Why it is a problem:** a refused trusted event dispatched in a same-origin iframe isn't counted, so the after-test `DRI-6` check passes for it. `coordinates.browser.test.ts:333` drives a sortable inside an iframe with trusted input, so that test runs with `DRI-6`'s only witness blind.
- **Evidence:** [`realm.browser.test.ts.txt`](proof-reviewer-probes/realm.browser.test.ts.txt) passes: an iframe's `PointerEvent` is not `instanceof Event`. `gesture.ts:172-174`: `#running` is set only inside `enter`, so apart from this check the stack depth matches the old condition.
- **Required property:** the refusal oracle counts what property 4 names, whatever the event's realm, or the record states the exclusion.

### F4's `null` test can't tell "unconstrained" from the viewport clamp (`proof-reviewer-5`)

Tier **B**, CONFIRMED by reading.

- **Current:** `free-drag.browser.test.ts:351` grabs a 50 px box by (300, 200) and expects `[340, 240]`. The box ends at (390, 290), inside the 1280 × 720 viewport that `.scripts/vitest-config.ts` pins. `bounds()` with no source clamps to the viewport (`src/free-drag/bounds.ts`, `#resolve`).
- **Why it is a problem:** an implementation that read `null` as "no source" would pass. `F4-2` only shows that a zeroed box fails. drag2's test moved to `10_000` and expected `9990`.
- **Required property:** the test fails when a `null` result clamps the drag to the viewport.

### S8 doesn't assert that `box` wins over `visual` (`proof-reviewer-6`)

Tier **B**, PLAUSIBLE (inferred from the fixtures, not run).

- **Current:** the row says "through `box`, or `visual` when there's no `box`". `behavior.ts:117` reads `config.box ?? config.visual`. Each candidate sweep (`sortable.browser.test.ts:1181`, `:1188`, `:1206`) sets only one of the two. The test that sets both, `:1236`, asserts the placeholder's left, which comes from the lift.
- **Why it is a problem:** a swap to `config.visual ?? config.box` passes S8's tests.
- **Required property:** a test sets both, with different geometry, and fails when candidates are measured through `visual`.

### F8's resolution check passes for a wrong `types` on an entry that another declaration imports (`proof-reviewer-7`)

Tier **B**, PLAUSIBLE (structure confirmed in the build, mutation not run).

- **Current:** `consumer-types.node.test.ts:113` checks that `<entry>.d.ts` is somewhere in tsc's `--listFiles`. The built `free-drag/behavior.d.ts` imports `./bounds.js` and `./drop-targets.js` by relative path, so those declarations are in the program whatever their entries' `types` say.
- **Why it is a problem:** one entry's `types` pointing at another valid declaration isn't detected. `F8-2` remaps every entry at once, which also removes the importers.
- **Required property:** the check fails when a single entry's specifier resolves to a declaration other than its own.

### S4's "inside a marked region" is tested only with the mark on the input itself (`proof-reviewer-8`)

Tier **B**, CONFIRMED by reading.

- **Current:** `keyboard.browser.test.ts:209` uses `focusedInput('r1', true)`, which sets `data-drag-ignore` on the focused input (`:64-66`). drag2's test (input-policy `:844`) did the same.
- **Why it is a problem:** no test puts the mark on an ancestor between the item and the input. That is the region case the row and `.agents/docs/accessibility.md` §Drag name.
- **Required property:** an arrow from an unmarked input inside a marked ancestor region is left native, and a mutation of the region walk fails that test.

### Minor (Tier **C**, CONFIRMED by reading)

- **`proof-reviewer-9`, F5 `coordinates.browser.test.ts:412`:** the test passes if the drag never activates. It compares the committed rect with the rect at the drop and asserts no movement. `:439` covers activation in the same environments.
- **`proof-reviewer-10`, S1 `landing.browser.test.ts:618`:** the outcomes and faults are read right after `pointerUp`, with no frame. No mutation shows the "outcome stands" clause failing, because `S1-2` changes only the fault. `:569` and `:591` assert `final: 80` after the landing finished, which holds whatever the target was. Their discriminating field is `targets`.
- **`proof-reviewer-11`, F6 `F6-3`:** the log fails both clauses of `activation.browser.test.ts:275` (`faults: ['interrupted']` and `log: ['start', 'end:canceled']`). So it doesn't isolate the no-fault clause that the report attributes to it.
- **`proof-reviewer-12`, report line numbers:** the IME test is reported as `keyboard.browser.test.ts:226`, and its `it` title is on `:227`.

## Survivors and stops, confirmed

- **`S6-7` survives:** at `1c1e93bd9`, only `:266` fails, as it does unmutated. `proof-reviewer-1` covers the clause.
- **S10's transition clause:** under `S10`, `:1274` passes and `:1261` fails on the guarantee (`18.97…` vs 80). `S10-2.diff` is byte-identical to `S2-2.diff`. The report's account holds.
  - In that fixture, nothing a CSS transition could animate changes during the sweep. `basicSortable` installs no `displacement`, the default placeholder has no `.row` class, and the item gets `transition: none`.
  - So `:1274` is a regression test of the gap with transitions present. It doesn't exercise a running transition, which is what the architect's disposition accepts.
- **Stop 1, `S2-tie-0` passes:** confirmed, 13 of 13 in the consumer project. At `TIE_TOLERANCE = 0`, `distance - nearest <= TIE_TOLERANCE` (`gap-conformance.ts:86`) still admits two exactly equal distances, so the constant's width isn't witnessed by this fixture. That follows from the instrument as `DRD-65` property 2 words it. Not decided here.
- **Stop 2, `layout-animation.browser.test.ts:266`:** confirmed in both projects. With the oracle printing its field ([`oracle-field.diff`](proof-reviewer-probes/oracle-field.diff)), the mismatch is slot 0, field `LEFT`: 0.3336 px predicted and 0.6669 px fresh. That is the consumer's `translateX` animation progressing between the two reads.
  - `y()` and `LinearShift` read only `CENTER_Y` (`y.ts:54`, `:61`, `:76`; `linear-shift.ts:96-113`).
  - `DRD-67` property 4 compares all six fields. `contract.md:297` says that a change in the items' relative positions during a drag that no scroll or resize causes "needs `invalidate()`".
  - Not decided here.

## Oracles against `DRD-67`

- **Property 3, confirmed:** the source projects install `oracles.source.ts` (`DRAG_SOURCE_SETUP_FILES`), the consumer project installs `oracles.build.ts` after `require-build.ts`, and `shipped` installs nothing. No test reads which build it runs against. In the consumer project, the liveness tests count checks against the emitted classes, which shows the module instances are the ones the published entries use.
- **Property 4, equivalence, confirmed:**
  - The oracle runs at the first `collect` after a `shift` with an unchanged collection version, cleared by `invalidate` and `retire`. The removed check's extra `!#dirty` condition is covered, because each site in `LinearShift` that sets `#dirty` also calls the index's `invalidate` or `retire` (`linear-shift.ts:146-149`, `:184-187`, `:190-195`).
  - It compares the count, each slot's element, the six window fields and the placeholder within 1/16 px, using the held left and right.
  - The fresh index calls the unwrapped `collect` and `measure`, so it doesn't recurse into the oracle.
  - The placeholder's top and bottom are compared after the live re-read, as the removed check compared them.
- **Not perturbing, confirmed:**
  - The oracle writes nothing to the live index or the DOM.
  - It calls the consumer's `getBox` and the sink's `displaced` once more per window slot. `displaced` writes only the sink's scratch `#carriedX` and `#carriedY` (`layout-animation.ts:120-131`), and every reader overwrites them before reading.
  - The added layout reads are why the `shipped` census runs without the oracles.
- **Property 4, refusals:** matches the removed counter apart from `proof-reviewer-4`.
- **Property 5:** the five liveness tests pass in both projects. `refusals.browser.test.ts:132` asserts 0 trusted refusals and can't fail when the oracle is absent. The report states this.

## Next

To the architect: `proof-reviewer-1` to `proof-reviewer-3`, which bear on whether `DRF-45` can close, then `proof-reviewer-4` to `proof-reviewer-12`. Both stops are confirmed, with the added evidence above.