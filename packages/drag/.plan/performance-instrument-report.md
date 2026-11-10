# Performance instrument report

**Input:** `drag/performance` at `35ee3f39e`, which carries [`performance-instrument-handoff.md`](performance-instrument-handoff.md). Its `src` and `tests` are `a9c323f6a`'s. **Governing records:** `DRD-40`, `DRD-23`'s last bullet, `DRF-1` and `DRF-7` in [`00-index.md`](00-index.md), and [`performance-plan.md`](performance-plan.md) §2 P1.

**Outcome: returned to the architect during item 2's proof.** Items 1 and 2 are committed. The gate injection "one entry on the step list per frame" applies, and its scenario reaches its site. The bytes rule selects the module of that site. But at the current source the injection adds no bytes, so it didn't flag in any of its 3 rounds (§Returned). That is the handoff's first return condition: the injection can't be written with the same cost on the same scenario. It would also fail §5 step 1. **Items 3, 4 and 5 weren't run:** there are no detection floors, no launch-context runs of the per-sample test, no `--prove` at the unit's last commit, no baseline and no size table.

Nothing under `src/` or `tests/` changed: `git diff --stat a9c323f6a..HEAD -- src tests` is empty. No threshold, rule, budget, scenario or existing injection cost moved.

| Commit | Content |
| --- | --- |
| `f50f4a35a` | Item 1: the six injections at the current source, the application pass before a browser starts, and `--prove --dry` |
| `ab14380c1` | Item 2: bytes keyed by module, the kernel selected by location, `--rejudge`'s exclusion, and the seventh gate injection |
| the commit carrying this report | This report |

## Environment

Every browser run recorded `nproc`, `node --version` and `uptime` before and after it, at the head of its raw file. Chrome's version is in each JSON file. Nothing else from this session ran during a browser run.

| Fact | Value |
| --- | --- |
| CPUs | 12 |
| Node | v26.13.0 |
| Chrome | Google Chrome for Testing 157.0.8103.38 (`/usr/local/bin/chrome`) |
| Load average during the runs | 0.95 to 2.95 (one-minute). Other sessions on the machine aren't under this session's control |

## Item 1: `DRF-7`

Raw output: [`2026-11-10-performance-injections-dry.txt`](measurements/2026-11-10-performance-injections-dry.txt).

**What changed in `bench/compare.ts`:**

- Each injection's `file` is its module's path under `src`, and its `find` is a text at the site the handoff names. The `name`, `scenario`, `expect` and injected cost of each are unchanged. The forced-layout injection writes `min-height` on the list, as run 2 of 2026-11-07 did, and not on the lifted item.
- `applyInjection` copies `src` to a temporary directory and bundles the copy. It then applies the patch and bundles again. It throws `injection does not apply in <file>: <find>` unless `find` occurs exactly once. It throws `injection does not apply: <name> leaves the bundle unchanged` when the two bundles are equal.
- `--prove` applies every selected injection before `chromium.launch`. `--prove --dry` stops after that pass. `--only` selects for both. The header comment documents it.

| Run, with `CHROME_EXECUTABLE=/nonexistent/chrome` | Required | Result |
| --- | --- | --- |
| `--prove --dry` | Exit 0, all six listed as applied | Exit 0, six listed |
| D1: the drop injection's `find` set back to its stale text | Non-zero, `injection does not apply`, no other error | Exit 1, `injection does not apply in sortable/operation.ts: const insertion = state.insertion!;…`. Without `--dry` the same error, with no launch error |
| D2: the session injection's `find` cut to the two assignments, which occur twice in `kernel/session.ts` | Non-zero, `injection does not apply` | Exit 1, after the four sortable injections applied |
| D3: the step-list injection's `replace` set equal to its `find` | Non-zero, naming the injection | Exit 1, `injection does not apply: one entry on the step list per frame leaves the bundle unchanged` |

`compare.ts` was restored after each mutation and compared byte for byte. After lint, `run` moved above its first use and nothing else changed. The dry run was repeated after that move, with exit 0.

**Call paths, by reading** (`src/` at `a9c323f6a`):

| Injection | Scenario | Path to the site |
| --- | --- | --- |
| About 1 ms per cycle, at the drop | 50 cycles, 20 items, no landing | `pointerup` on the window, captured by `Session.handleEvent` → `Gesture.enter(#up)` → `Session.#up` → `#drop` → `operation.drop()`, which is `SortableOperation.drop`, before `buildReorderRequest(` |
| 1 KB retained per operation | 200 operations, retained | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move` → `#activate` → `operation.start?.()`, which is `SortableOperation.start` |
| One forced layout per move | 300 moves, 20 items | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move` → `operation.move?.()`, which is `SortableOperation.move`, before `this.#lift.translate(` |
| One O(n) walk per move | 300 moves, 2,000 items | As the forced layout |
| 1 KB allocated per move | Bytes per move, 20 items | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move`, after the button check |
| One entry on the step list per frame | Bytes per move, 20 items | `SortableOperation.move` → `#frame.schedule()` → the animation frame → the frame task in `sortable/behavior.ts` → `drag.requestStep(updateInsertion)` → `Gesture.requestStep`. No pass is running in a frame callback, so the call takes the idle branch |
| Four numbers in `Gesture.enter` (item 2) | Bytes per move, 20 items | Every sample, through `Session.handleEvent`, and every frame, through the idle `requestStep` |

## Item 2: `DRF-1`

Raw output: [`keys`](measurements/2026-11-10-performance-keys.txt) ([JSON](measurements/2026-11-10-performance-keys.json)), [`keys-before`](measurements/2026-11-10-performance-keys-before.txt) ([JSON](measurements/2026-11-10-performance-keys-before.json)), [`n3-prove`](measurements/2026-11-10-performance-n3-prove.txt) ([JSON](measurements/2026-11-10-performance-n3-prove.json), [patch](measurements/2026-11-10-performance-n3-patch.txt)), [`rejudge`](measurements/2026-11-10-performance-rejudge.txt), and the discarded [`keys-discarded`](measurements/2026-11-10-performance-keys-discarded.txt) ([JSON](measurements/2026-11-10-performance-keys-discarded.json)).

**Choice: the bundler's module lines, not a source map.** `bundle` reads rolldown's output. A line `\t// <path from the working directory>` starts each module, and only a path in the chunk's `moduleIds` counts. Each module's key is its path relative to the arm's `src`, such as `kernel/session.ts`. A module outside that `src` is keyed by its path from the package, such as `bench/lab.ts` or `../drag2/src/kernel/queue.ts`. A sampled frame is keyed `<module>:<function>` when it is in the lab bundle's script. A frame with no script still takes its caller's key.

**How the lab bundle's script is found.** A sampled frame of a script that `addScriptTag` inserts has an empty `url`, even with a `//# sourceURL` comment. A probe showed this, and the first key check is discarded for that reason: every key in it carried no module. So `samplingProfile` asks for `[[FunctionLocation]]` of one of `lab`'s functions, through `Runtime.getProperties`, before sampling starts. It keys only frames with that `scriptId`. Nothing is evaluated in the page during sampling.

**Rule.** `isKernelFunction` is removed. `isKernelKey` selects a key that starts with `kernel/` or `draggable.ts:`, and the 16 B per move threshold is unchanged. `judge`'s comment says that only production is judged, and only a kernel module.

| Property | Evidence |
| --- | --- |
| 1. Keys by module and function | Production: `kernel/session.ts:handleEvent`, `kernel/gesture.ts:enter`, `lift.ts:translate`, `sortable/y.ts:resolve` ([`keys.json`](measurements/2026-11-10-performance-keys.json)) |
| 2. The rule selects by location | N1 and N3 below |
| 3. Every arm built from this package's source | Production and control (`keys`), a patched copy in a temporary directory (`n3-prove`), and `--before a9c323f6a` (`keys-before`, the same keys as production). drag2 and the prototype were keyed (`../drag2/src/…`, and the prototype's own `src`), and the run exited 0 |
| 4. `--rejudge` leaves out name-keyed bytes rows | `2026-11-06-compare.json`: both bytes rows print `not judged, the recording cannot carry its rule`. A module-keyed recording is still judged |
| 5. `judge`'s comment | States what the code checks |
| 6. The seventh injection | `an array of four numbers per sample, in Gesture.enter`. Its counter and array are module-level variables, which a new `declaration` field appends to the module. The patched bundle keeps the store |

**Proof, as a pre-check before the commit.** The handoff asks for N1 and N2 from item 5's `--prove`. That run wasn't made (§Returned). These figures come from one `--prove --only 'four numbers|step list|1 KB allocated' --rounds 3`, with N3 added temporarily. The bytes row runs 3 rounds in every `--prove`. The A/A pass in the same run ran at 3 rounds and was quiet on all 12 rows, but it isn't a reading at the prescribed 7 rounds. The run exited 1, because the step list didn't flag.

| Run | Required | Result |
| --- | --- | --- |
| N1: four numbers in `Gesture.enter` | Flags, under `kernel/gesture.ts:enter` | **Flags** in 3 of 3: 99, 108 and 96 B per move, under `kernel/gesture.ts:enter`. Base: 1 to 3 B |
| N2: 1 KB allocated per move | Flags, under its kernel module's key | **Flags** in 3 of 3: 1,050 to 1,051 B per move, under `kernel/session.ts:#move` |
| N2: one entry on the step list per frame | Flags, under its kernel module's key | **Doesn't flag** in any round. Kernel keys stay at 1 to 7 B each, as in base, for example `kernel/gesture.ts:#applyRequests` 2 to 6 and `kernel/callback-list.ts:add` 0 to 1 |
| N3: four numbers in `SortableOperation.move` | Doesn't flag, shown under `sortable/operation.ts:move` | **Doesn't flag.** `sortable/operation.ts:move` reads 53, 49 and 50 B per move. Base: 1 B |

## Returned

**"One entry on the step list per frame" can't produce its cost at the current source** (§Return to the architect, first bullet).

- **The site is reached and selected.** In its readings `kernel/callback-list.ts:add`, `kernel/callback-list.ts:run` and `kernel/gesture.ts:requestStep` appear, all under `kernel/`.
- **The entry allocates nothing measurable.** The steps are a `CallbackList` queue. It stores a callback and its receiver in two slots of one array that it keeps, and it removes an entry before running it. One entry added and run in each frame reuses the array's storage. The list's own comment says that an entry "allocates no object". At `b91db2818` the injection pushed onto `#steps` in `draggable.ts` instead, and it read 73 to 80 B per move under `requestStep` ([remediation report](remediation-report.md) §Instrument proof).
- **What is open for the architect:** whether the step-list injection keeps its cost and is withdrawn or replaced as a gate on the bytes row, or whether "one entry on the step list" should be a different cost that the bytes row can see. Either one changes an injection's cost or its `expect`, which the handoff doesn't allow. I haven't chosen.

**Not a return, and recorded:** the bytes keys now carry the module. So every recording made before `ab14380c1` is left out of `--rejudge` for its bytes rows (property 4). Its timing rows are judged as before.

## Not run

- **Item 3,** the detection floors. The calibration probe for its fixed work was written and not run, so no calibration is recorded.
- **Item 4,** the per-sample test in contexts A to D, with M1 to M3. Nothing in `tests/` was changed, even temporarily.
- **Item 5,** `--prove` at the unit's last commit, the floors, B1 to B3, the profiles and `npx just size`. **There is no baseline of `a9c323f6a`.** `DRO-4`'s timing has no reading from this unit.

## Checks

| Check | Result |
| --- | --- |
| `bench/compare.ts`: `just fmt`, `just lint-fix`, `just fmt`, `just lint` | Pass, in each commit |
| `npx just typecheck` | Pass |
| `git diff --stat a9c323f6a..HEAD -- src tests` | Empty |
| This report: `just fmt`, links checked with a script, `git diff --check` | See the commit. Lint doesn't apply to Markdown |

Scratch: the probes and the run wrapper were in this session's scratchpad. A temporary directory from the first bundle probe was removed. `compare.ts` removes its own.