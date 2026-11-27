# A sortable drop on the item's own gap lands home: feature proof

**Lens:** `reviewer`, feature proof of [#327](https://github.com/ausginer/material-x/pull/327), `drag:DRF-58` in [`00-index.md`](../../00-index.md) and the sentence that it adds to `DRI-13` in [`contract.md`](../../contract.md). The entry governs. Requested by the coordinator on 2026-11-27.

**Commit read:** `ba5cc19b0` on `drag/noop-landing-1`, from `origin/main` `ba7c06803`. The source and test commit is `134809c64`. `ba5cc19b0` changes only records. The registration reading and probe are [`noop-landing.txt`](../../../../../.plan/observations-11/checks/noop-landing.txt) and [`noop-landing.browser.test.ts.txt`](../../../../../.plan/observations-11/probes/noop-landing.browser.test.ts.txt).

**Method:** every run was in slot h, one engine at a time, with nothing else running. Each mutation was applied by an exact single-occurrence replacement, run, and reverted with `git checkout`. The script is [`mutate.sh.txt`](feature-proof-claude-probes/mutate.sh.txt). My probe was an untracked file in `tests/`, removed after the runs. A copy is [`noop-review.browser.test.ts.txt`](feature-proof-claude-probes/noop-review.browser.test.ts.txt). No tracked file was edited except this record and its evidence directory.

## Scope

**Covered:**

- the one-line change to `#recordResult` in `src/sortable/operation.ts`, read with `settle`, `#returnPlaceholder`, `#landingTarget`, `drop`, `Lift.land` and `landing()`'s `startLandingAnimation`;
- the ten new rows in `tests/landing.browser.test.ts`, and the file's other 25 rows;
- `DRF-58`'s required properties 1 to 4, its _Cost_ and _Not read_ lines, and the implementer's dated closing note;
- the `DRI-13` sentence, against the registered text and the published docs (`README.md`, `SortableNoopResult`'s JSDoc);
- `freeDrag`'s `drop` and `settle`, and the session's `skipped` decisions;
- `mx-sortable-list`'s `onEnd`, and its rows against drag rebuilt at `ba5cc19b0`;
- a command noop, a pointer noop with zero offset, and the layout reads and `timing` calls of a noop, by my probe;
- CI's `verify` run on `ba5cc19b0`.

**Not covered:** visual (CI's), Safari, the drag suite's node, declaration, shipped and consumer projects locally (CI's jobs ran them), and lint, format and typecheck (no source of mine changed, and CI's `static` job passed).

## Results

**Chromium, unmutated** ([transcript](feature-proof-claude-probes/chromium.txt)): `landing.browser.test.ts` 35 of 35. Drag's `browser*` project, which holds every file that tests `operation.ts`: 31 files, 602 of 602. Material X's `sortable-list.browser.test.ts` and `sortable-list.spec.browser.test.ts` against drag rebuilt at `ba5cc19b0`: 247 of 247. The rebuilt `sortable/operation.js` returns `RECOVERY_HOME` for `skipped`.

**Firefox and WebKit, unmutated, from CI** ([extract](feature-proof-claude-probes/ci.txt)): `verify` run `45982439961` on `ba5cc19b0`. Its `firefox` job (`140449766780`) and `webkit` job (`140449766964`) passed the whole suite, 137 files each, with `landing.browser.test.ts` at 35 of 35 in the `browser/drag` and `consumer/drag` projects and both `mx-sortable-list` files passing. The run completed with `success` before this record was committed, so the gate passes on `ba5cc19b0`.

**Mutations** ([summary and failing rows](feature-proof-claude-probes/mutations.txt)), run on `landing.browser.test.ts` in Chromium, Firefox and WebKit. Each engine's unmutated run (M0) passed 35 of 35. Each mutation's failing rows are the same in the three engines.

| Id | Mutation | Property | Result in each engine |
| --- | --- | --- | --- |
| M1 | `skipped` returns `RECOVERY_IMMEDIATE` (the unfixed code) | 1 | caught: the nine own-gap rows fail |
| M2 | a fault cancel returns `RECOVERY_HOME` | 3, fault | caught: _"should still skip the landing for a fault"_ |
| M3 | `drop` returns the verdict awaiter when `to === from` | 2 | caught: the nine own-gap rows read `[1, ['start', 'end:accepted']]` |
| M4 | `startLandingAnimation` ignores a zero offset | 4 | caught: _"should start nothing when the visual is already where it lands"_ |
| M5 | `Lift.land`'s flight starts from home, not from the position last translated to | 1, _from the position last translated to_ | caught: 21 rows, the nine own-gap rows among them |
| M6 | `skipped` returns `RECOVERY_DESTINATION` | doubt | survives: equivalent, below |
| M7 | a rejection returns `RECOVERY_IMMEDIATE` | 3, _a rejection lands as today_ | caught: six existing rows |

M1 to M5 remove a required property's mechanism. M4 and M5 are also animation mechanisms. M6 is one I doubted. **From the implementer's Chromium record:** the witness, which is M1 in Chromium, as [`witness-before.txt`](../../noop-landing-1/checks/witness-before.txt) shows. The record lists no other mutation.

**M6 is equivalent.** For a request with `to === from`, the destination is the item's own gap. `#landingTarget(RECOVERY_DESTINATION)` puts the placeholder before the item, and `RECOVERY_HOME` moves it to `#home`, whose neighbours are the item's neighbours in the last pull. `#returnPlaceholder` has the same two targets. The two places differ only when the consumer moves the item in the DOM during the drag without `invalidate()`, which `README.md` requires.

**Probe** ([lines](feature-proof-claude-probes/probe.txt)), in the three engines, at `ba5cc19b0` and with M1 applied. The lines are the same in the three engines, except the read count of one case in WebKit, noted below.

| Case | At `ba7c06803`'s code (M1) | At `ba5cc19b0` |
| --- | --- | --- |
| Pointer noop after a sideways drag, with a landing | snaps from `60,40` to `0,40`; 1 rect read at the release; `timing` not called | `60,40` at the release, `add` and `replace` animations; 2 rect reads; `timing` called once |
| The same without a landing | snaps; 1 read | snaps; 1 read |
| Pointer noop moved back to the press point, with a landing | no animation; 1 read (5 in WebKit) | no animation; 2 reads (6 in WebKit); `timing` called once |
| Command noop after a rebase in `onStart`, with a landing | the visual drawn at `0,0` before the release and at `0,40` after it; 2 reads | `0,0` at the release, `add` and `replace` animations, `0,40` when the flight finishes; 3 reads; `timing` called once |
| The same without a landing | `0,0` to `0,40`, no animation; 2 reads | the same |

So the cost of the fix is one `getBoundingClientRect` and one `timing` call per noop with a landing composed, for a pointer and for a command, in each engine, and nothing without a landing. That is `DRF-58`'s _Cost_ line. In `mx-sortable-list`, `timing` is `useCSSProps`, which an accepted drop, a rejection and a cancel already call once per landing. A pointer noop with zero offset starts nothing, as property 4 requires.

**`freeDrag` is unaffected.** The diff changes only `src/sortable/operation.ts`. `freeDrag`'s `drop` always returns a verdict awaiter, so its session never decides `skipped` after a drop, and its `settle` has no `skipped` branch. The session's other two `skipped` decisions are made at activation, before any operation exists. Its rows pass in the 602 above and in CI.

**`mx-sortable-list`:** its `onEnd` acts on the order only for `accepted`, so a noop with a landing changes only the animation. Its 247 rows pass against the rebuilt package, and CI's Firefox and WebKit jobs pass both of its files.

## Findings

### Local id `feature-proof-1` — a command noop now flies, and the record says its visual is already home

**Tier B.** Routed to the architect: whether `DRI-13`'s sentence is meant to cover a command noop is a contract question.

- **Current behavior:** a command whose gap a rebase turns into the item's own gap ends `noop`, as `DRF-58`'s _Not read_ line expects. In the probe, `onStart` moves `r1` before `r0` and calls `invalidate()`, and `r0`'s `ArrowDown` then ends `start:command`, `end:noop`, order `r1,r0,r2`, with `onReorder` not asked. The lifted visual is still drawn at `0,0`, its place before the rebase, and its home is now `0,40`. At `ba7c06803`'s code, with a landing, the visual snaps to `0,40`. At `ba5cc19b0`, it is at `0,0` at the release and a flight carries it 40 px to `0,40`. The result is the same in Chromium, Firefox and WebKit.
- **What the record says:** `DRF-58`'s _Not read_ line says that one such command _"reaches `settle` skipped only after a rebase moves its gap, and its visual is at home there"_. The coordinator's brief has the same premise: _"a keyboard/command noop, whose visual is already home: no visible change"_. The probe contradicts both. The unit changes what a consumer sees for a command noop after a rebase.
- **Why it is a problem:** the entry's required property 1 and its rows name a **pointer** drop. The `DRI-13` sentence names _"a drop on the item's own gap"_, with no kind. So the contract covers the new command behavior, but the entry states that no command behavior changes, and no row reads a command noop with a landing. The behavior matches the existing row _"should land at the rebased home when a drag is canceled after a rebase"_, which suggests that it is intended, but no record decides it. If it is not intended, the consequence is Tier A.
- **Evidence:** [probe lines](feature-proof-claude-probes/probe.txt), the cases `command-rebased-noop-landing=true` and `=false`, fixed and unfixed, in each engine.
- **Required property:** the record states what a command noop after a rebase does with a landing composed, and the rows read the behavior that the record states.

**No other finding.** The pointer fix meets properties 1 to 4 in the three engines: Chromium locally, and Firefox and WebKit by the mutations here and by CI's unmutated jobs. The `DRI-13` sentence matches the registered text and sits after the first sentence, as the entry asks. No published doc says that a noop snaps.

## Verdict

**Accepted for pointer drops,** with `feature-proof-1` (Tier B) routed to the architect. `verify` passed on `ba5cc19b0`.

**Open issues:** #322's description still holds, and #327 closes it. #276 (`DRF-56`) is a cancel of an item that left the collection, a path that this unit does not change.