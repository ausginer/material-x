# Recheck: the guarantee tests' remediation against `proof-reviewer-1` to `-12`

**Read at `349616213`** on `drag2/removal`. The range is `326d86773..349616213`: `a275d1dd3` (the merge of `origin/main`), `cc3b839f9` (items 1 to 4 and 6 to 12) and `349616213` (item 5's logs and the report). `349616213` changes only files under `.plan/`, so its tests and `src` are the tree that item 5's logs record, `cc3b839f9`.

**Subject:** the [remediation report](../../drag2-guarantees-remediation-report.md) and the tree it describes. They are checked against [`drag2-guarantees-remediation-handoff.md`](../../drag2-guarantees-remediation-handoff.md), §Disposition of the guarantee tests proof in [`00-index.md`](../../decisions/), `drag:DRD-67` property 4 as clarified, `drag:DRO-19`, and the findings of the [proof](proof-reviewer.md) at `1c1e93bd9`.

**Lens:** a targeted recheck, not a fresh independent review. For each finding, the questions were whether the record or the test resolves it as the disposition requires, and whether each witness it owes fails for the reason the witness names.

## Scope

**Covered:**

- The diff of `cc3b839f9` in `tests/`, `src/` and `bench/`, read in full.
- All 68 logs and the 11 diffs under [`witnesses/`](../../probes/drag2-guarantees/witnesses/). Each log was checked for its tree, its command, and a `file:line`, title and message for each failing test. Each cited `file:line` was checked against the test file at `349616213`.
- The corrected note under §Disposition of the drag2 guarantees report, for `proof-reviewer-1`.
- In Chromium, in a copy of `349616213`: two unmutated baselines, 10 of the witnesses, and three runs of a mutation against the test file as it was at the input, `326d86773`. The [probes](remediation-recheck-reviewer-probes/README.md) list every run and its result.

**Not covered:**

- Firefox and WebKit. WebKit is not owed (`DRO-18`).
- The five `size.node.test.ts` rows (`DRO-4`).
- The witnesses of item 5 that existed before the remediation were not re-run. Their logs were read.
- The checks in the report's §Checks table were not re-run: typecheck, lint, the full `npx just test`, `test-engines`, and the comparison of the emitted `.js`. One spot check: no emitted `sortable/*.js` contains the module comment that item 3 rewraps.

## Verdict

**All 12 findings are resolved as the disposition requires. No new finding.** Each witness that the remediation owes fails for the reason it names. The re-runs here reproduce the logs. The remediation's tree passes unmutated in the files rechecked. Item 5's logs are all from one tree, `cc3b839f9`, and each one names every failing test and its assertion.

The two PLAUSIBLE findings are now confirmed. Against the test files at the input, the mutation of `proof-reviewer-6` passes 55 of 55, and the remap of `proof-reviewer-7` passes 2 of 2.

## Per finding

| Finding | Disposition owed | Recheck |
| --- | --- | --- |
| `proof-reviewer-1`, S6's no-op | The record corrected, and no work owed | **Resolved.** The note at `00-index.md:4024` states what `S6-8` adds, and that `:166` passes with only the three guards removed. It accepts the clause as structural, on S10's basis. `S6-7` passes 16 of 16 at this tree, as the report says (probe) |
| `proof-reviewer-2`, S2's displacement clause | Item 4: the instrument itself reports under `S2-3`, in both projects | **Resolved.** With `invalidating`, `sweepList` calls `invalidate()` before each sample (`y-geometry.browser.test.ts:57-80`), so `y()` measures the displaced rows. Under `S2-3`, only `:160` fails, in both projects. The failure is the instrument's assertion, `expected [ …(20) ] to deeply equal []`, and there is no oracle message. The held 13 ms and the app-unit rounding are unchanged. Unmutated, the test passes in both projects (probe) |
| `proof-reviewer-3`, the saved logs | Item 5: a re-run at one tree, with logs that name each test and its assertion | **Resolved.** All 68 logs state `cc3b839f9` and the command. Every `FAIL` line has a `file:line` and a title, and the lines checked match the tree. No log contains `no placeholder` or another message from the removed development check. Where Vitest groups identical errors, consecutive `FAIL` lines share the one message that follows them. The report states this convention, and the message of each test can be found from it. The logs cover every saved mutation. The `*-at-tie` logs have no diff of their own, and `S2-instrument` runs as its accepted rewrite, `S2-instrument-tie`. `S2` fails `:99` on four instrument disagreements and on the oracle. `S7-5` fails `:331` with `expected 160 to be close to 80` |
| `proof-reviewer-4`, realms | Item 6: the oracle counts an event of any realm; liveness in both projects; a witness | **Resolved.** `isEvent` (`oracles.ts:236-242`) checks for an own `isTrusted` property, in place of `instanceof Event`. In the specification, `isTrusted` is an own property of every `Event` instance. The other values that reach `enter` as its argument, such as the `Error` at `gesture.ts:221`, don't have that property. The test at `refusals.browser.test.ts:135` dispatches a synthetic `pointerdown` built from the iframe's `PointerEvent` inside `start`. With `instanceof` restored, it fails in both projects with `untrusted: +0` against `1` (probe) |
| `proof-reviewer-5`, F4's `null` | Item 7: a drag past the viewport's edge; a witness that reads `null` as the viewport | **Resolved.** The box ends 15 px past the viewport's bottom-right corner (`free-drag.browser.test.ts:351-366`). `F4-null-viewport` writes the viewport into the held box, which is the path with no source (`bounds.ts:70-75`). Under it, the test fails with `[ 1230, 670 ]` against `[ 1245, 685 ]` (probe) |
| `proof-reviewer-6`, S8's precedence | Item 8: both `box` and `visual` set, with a witness that settles the finding | **Resolved, and the finding is confirmed.** In `sortable.browser.test.ts:1192`, the `visual` is the top 20 px of each row and the `box` is the bottom 20 px, so their centers differ by 20 px. `config.visual ?? config.box` fails only `:1192`, with 69 disagreements. The input's file passes 55 of 55 under that mutation (probe) |
| `proof-reviewer-7`, F8's resolution | Item 9: the check fails for a single remapped entry; a witness that settles the finding | **Resolved, and the finding is confirmed.** `:113` reads each `@ydinjs/drag/<entry>.js` resolution from `--traceResolution` and expects `<entry>.d.ts` for every entry. Remapping `free-drag/drop-targets` to `free-drag/bounds.d.ts` fails only `:113`. The input's `--listFiles` check passes under the same remap, 2 of 2 (probe) |
| `proof-reviewer-8`, S4's region | Item 10: the mark on an ancestor; the hop-walk mutation fails it; the marked-input test passes | **Resolved, and the implementer's reading is accepted** (below). `keyboard.browser.test.ts:225` puts the mark on a `div` between the row and the input. Under `S4-target-only`, only `:225` fails, and `:209` passes (probe) |
| `proof-reviewer-9`, F5's activation | Item 11: the test asserts activation; the report shows it failing without activation | **Resolved.** `coordinates.browser.test.ts:432-433` assert that the visual moved 60 by 40 px before the drop. With `DEFAULT_THRESHOLD = Infinity`, `:412` fails in both environments with `expected +0 to be close to 60` (probe) |
| `proof-reviewer-10`, S1's outcome | Item 12: the outcome read after the landing's time; the code named; a witness that removes it or changes the outcome | **Resolved, both ways.** The test waits 150 ms and a frame after `pointerUp`, past the 100 ms landing. The report names the `try`/`catch` around `operation.settle` (`session.ts:579-585`). Removing it fails `:619` with `outcomes: []`. `S1-late-revert` moves the item back 50 ms after the fault: it fails `:619` on `parent`, and the input's file passes 25 of 25 under it. So the wait is what makes the test see the change (probe) |
| `proof-reviewer-11`, `F6-3` | No work: item 5's log names both failing assertions | **Resolved.** `F6-3.log` shows `:275` with both `faults: ['interrupted']` and `log: ['start', 'end:canceled']` |
| `proof-reviewer-12`, a line number | Recorded: item 5's logs carry the lines at the tree | **Resolved.** The logs give the lines at `cc3b839f9`. The IME test's title is on `keyboard.browser.test.ts:251` at this tree, and the report and `S4-7.log` say `:251` |

## Item 10's reading

The handoff asks for "a mutation of the hop walk … that checks only the subject itself", and says that the marked-input test "still passes under that mutation". In `ownsInteraction` (`gesture.ts:73`), `subject` is `admission.handle ?? admission.item` (`:335`, `:352`). If the mutation checked only that element for the mark, `:209` would fail, because its mark is on the input. So with `subject` meaning that element, the two sentences can't both hold. With the subject read as the event's target, the first hop of the path, they both hold. `S4-target-only` implements that reading, with a `break` after the first hop.

**The reading is the only one that satisfies the handoff, and it doesn't weaken the witness.** `:225` fails under either mutation, because its mark is on neither the target nor the item. `proof-reviewer-8`'s required property is met under either reading: "a mutation of the region walk fails that test". The reading decides only whether `:209` passes too. The architect may still word the handoff differently.

## Observation, not a finding

**The sub-pixel fixture now runs only on the measured path.** With `invalidating`, the oracle is cleared before each sample (`invalidate` clears it, as `proof-reviewer`'s §Oracles notes). So `:160` no longer checks the cache's prediction while displacements run, and under `S2-3` no oracle message appears in this file. The handoff asks for `y()` to measure displaced rows, and nothing in the disposition owes the predicted path for this fixture. The predicted path with displacements still runs, with the oracle, in the `layout-animation` tests. This is recorded so that the narrowing is visible. It violates no requirement.

## Next

To the architect: `DRF-45` can close on this recheck. Item 10's wording is for the architect to keep or amend.