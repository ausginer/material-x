# Report: drag tests for the guarantees only drag2's suite asserted

**Handoff:** [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) (`drag:DRF-45`, `drag:DRD-64` property 7). **Input:** `70f0ea270` on `drag2/removal`. drag2's tests are read at `0870abd75`. `src` is unchanged.

**Outcome:** all 18 rows have tests, and every row fails under at least one `src` mutation. **One clause is stopped:** S2 under a rotated row fails with development checks off (§Stopped). Two clauses have no single-mutation witness (§Unproven). The mutations and their logs are in [`probes/drag2-guarantees/mutations/`](probes/drag2-guarantees/mutations/).

**How the unit was run.** F8 was written in the main checkout. The other 17 rows were written by five sub-agents, each in its own worktree and each owning its test files. Their commits were brought onto `drag2/removal` by cherry-pick.

**Every saved mutation was then re-applied on the merged tree and its tests re-run,** with one scratch script that applies the `.diff`, runs the test files its `.log` names, and restores the tree. All 56 mutations were re-run: 55 failed their tests, and S6-7, which is expected to survive, did (§Unproven).

## Commits

| Commit | Rows |
| --- | --- |
| `b22d148db` | F8 |
| `302ba3bfc` | F2, F3, F6 |
| `361c50a89` | S3, S4, S5 |
| `dea475542` | F1, F4, F5, F7, S1 |
| `53852d117` | S6, S7, S9 |
| `849c18207` | S2, S8, S10 |
| this report's commit | S2's rotate case moved to a stopped probe, and this report |

## Free drag

| Row | Tests | Mutations and the failures they caused |
| --- | --- | --- |
| F1 | `free-drag.browser.test.ts:323` should keep following the pointer from the point it placed the visual at | `F1`: `moveTo` resets the held offset after placing the visual. `expected [ 110, 100 ] to deeply equal [ 210, 170 ]` |
| F2 | `terminals.browser.test.ts:357` should build the request from the pointerup position; `:381` should render the visual at the pointerup position while the drop is decided | `F2`: `Session#up` stops writing the `pointerup` coordinates, so both fail (pointer (115, 105) instead of (155, 125)). `F2-2`: the drop stops translating the lift, so only `:381` fails |
| F3 | `terminals.browser.test.ts:401` and `verdict.browser.test.ts:252`, both should carry the value given to reject as its reason | `F3` (`freeDrag`) and `F3-2` (`sortable`): the result's `reason` becomes `undefined`. `expected undefined to be { code: … }` |
| F4 | `free-drag.browser.test.ts:339` clamp to the returned rect; `:351` `null` leaves the drag unconstrained; `:363` and `:378` a throw at activation, and during the drag, is one fault carrying the thrown value | `F4`: the function's rect is ignored. `F4-2`: `null` is treated as a zeroed box. `F4-3`: the throw is swallowed, so both throw tests fail with `expected [] to deeply equal [ Error: bounds ]` |
| F5 | `coordinates.browser.test.ts:412` should commit the visual where it was dropped through the local delta under %s; `:439` should report onMove currentRect as originRect moved by the viewport delta under %s. Each runs under `transform: scale(.5)` and under `zoom: 2` | `F5`: the request's local delta is the viewport delta, so both environments fail. `F5-2`: `currentRect` is built from the local delta, so both environments fail |
| F6 | `activation.browser.test.ts:275` should end the press with no start, no end and no fault; `:288` should admit the next press | `F6`: no `pointercancel` listener (`:275`). `F6-2`: the gesture isn't detached for a press that never started (`:288`). `F6-3`: the cancel raises a fault (`:275`'s no-fault clause) |
| F7 | `landing.browser.test.ts:498`, `:509` and `:525`: the landing starts from the axis-locked, the clamped and the `moveTo` position, not the pointer's | `F7`: the drop translates by the raw pointer delta, so all three fail (80 vs 40, 840 vs 250, 100 vs 200) |
| F8 | `consumer-types.node.test.ts:105` should typecheck every entry with no error; `:113` should resolve each entry to its published declaration | `F8`: `dts: false` in `tsdown.config.ts`, so both fail. `F8-2`: `packageFilesToCustomExports` points every entry's `types` at `draggable.d.ts`, so `:113` fails. Changing `package.json` itself is no mutation: the build rewrites `exports` from `files.json` |

F8 links the package into a fixture outside the workspace rather than packing it. The specifiers resolve through the same `exports` map, which the build writes.

## Sortable

| Row | Tests | Mutations and the failures they caused |
| --- | --- | --- |
| S1 | `landing.browser.test.ts:569` append loop; `:591` morphdom-style patch; `:618` a move to another container skips the landing with one fault, and the outcome stands | `S1`: the re-anchor of the placeholder before the landing is removed (`:569`, `:591`). `S1-2`: the parent check in the lost-placeholder condition is removed (`:618`, plus the existing `:333`) |
| S2 | `y-geometry.browser.test.ts:69` unequal heights, `:78` flow gap, `:87` varying gap, `:100` margins in a flex column, `:109` margins in a block column, `:119` authored scale, `:128` sub-pixel with a displacement running. Instrument self-checks: `:178`, `:203` and `:214`. The helper is `tests/support/gap-conformance.ts` | `S2`: the shift constant comes from the placeholder's height (`:78`). `S2-2`: the incumbent is the placeholder's top, not its center (all positive cases). `S2-3`: the displacement isn't subtracted (`:128`). `S2-instrument`: the comparison is disabled in the helper, so all three self-checks fail |
| S3 | `input.browser.test.ts:452` a handle marked `data-drag-ignore` admits; `:463` the same press with no handle declines; `:472` and `:483` the mark through an open shadow root | `S3`, `S3-2`, `S3-3`, `S3-4`, in `src/kernel/gesture.ts`: the scan ignores the handle; the selector never matches; a `ShadowRoot` hop throws; the scan walks `parentNode` instead of `composedPath()` |
| S4 | `keyboard.browser.test.ts:75` and `:86` ArrowLeft and ArrowRight; `:97` control; `:108` and `:120` an edge arrow isn't prevented; `:132` a key that names no command isn't prevented; `:170` the handle gates the keyboard path, and `:182` is its control; `:194` an unmarked input reorders; `:209` a marked input stays native; `:226` no command during an IME composition | `S4` swaps the arrow targets. `S4-2` drops the edge check. `S4-3` gives an unknown key a direction. `S4-4` drops the handle gate for commands. `S4-5` drops the ignore check for commands. `S4-6` refuses commands from inputs. `S4-7` drops the `isComposing` check |
| S5 | `keyboard.browser.test.ts:265` refused while a press is pending; `:279` refused while a drag is active | `S5`: `#command` no longer returns early while a session exists, so both fail |
| S6 | `layout-animation.browser.test.ts:150`, `:158`, `:166`, `:174`, `:183`, `:195` and `:212`: only the crossed rows, nothing for a no-op, the inverse of the displacement, never the item, a non-item sibling or the placeholder | `S6`: every slot is reported. `S6-2`: no inversion. `S6-3`: the placeholder is reported. `S6-4` and `S6-5`: the item is reported. `S6-6`: a DOM sibling walk replaces the items. `S6-7` survives and `S6-8` fails (§Unproven) |
| S7 | `layout-animation.browser.test.ts:227`, `:245`, `:266`, `:283`, `:310`, `:330`, `:350`, `:371` and `:397`: an authored transform and translate, and a consumer's animation, survive; a fold leaves the row where it was drawn; the travel is right under an ancestor `scale()` and when `visual` isn't the item | `S7`: `composite: 'replace'`. `S7-2`: animate `transform`, replacing. `S7-3`: cancel the row's other animations. `S7-4`: no residual in a fold. `S7-5`: no `localDelta` projection. `S7-6`: the visual's space instead of the item's |
| S8 | `sortable.browser.test.ts:1178` `y()` candidates through `box`; `:1185` through `visual` when there's no `box`; `:1192` `xy()` through `box`; `:1223` the placeholder takes the box's width | `S8`: candidates are measured through the item (`:1178`, `:1185`, `:1192`). `S8-2`: no `visual` fallback (`:1185`). `S8-3`: the placeholder is item-wide (`:1223`, `:1192`) |
| S9 | `faults.browser.test.ts:355` one fault, nothing started; `:369` the item and list as they were; `:386` the next drag reorders | `S9`: the release skips disposers with no operation (`:369`). `S9-2`: the factory throw is swallowed (`:355`). `S9-3`: no gesture detach (`:386`) |
| S10 | `sortable.browser.test.ts:1261` the lifted visual stays under the pointer with a transition on the item; `:1274` the gap a full measurement gives, with transitions on rows and item | `S10`: the lift stops writing `transition: none` (`:1261`, 18.97 vs 80). `S10-2`: the incumbent mutation of S2-2 (`:1274`) |

## Stopped

**S2, under an authored `rotate` on a row.** The test passes in the source project and fails in the consumer project, which runs against the published build. It fails the same way in the source project with `__DEV__` defined `false`: `expected [ 'at 95: proposed 1, measured 2' ] to deeply equal []`, the same in three runs. So with development checks off, `y()` proposes a different gap from a full measurement in that fixture, and the development build masks it.

That is a drag defect or a guarantee drag doesn't make, and it goes to the architect. The case is out of the suite, kept as [`S2-rotate-stopped.test.ts.txt`](probes/drag2-guarantees/S2-rotate-stopped.test.ts.txt). S2's other clauses pass in both projects.

## Unproven by a single mutation

- **S6, "nothing for a no-op"** (`layout-animation.browser.test.ts:166`). Three independent guards stop a no-op: `y()` returns `null`, the operation checks `placeholderAt`, and `LinearShift.moved` guards `lastGap === gap`. `S6-7` removes two of them and survives. `S6-8` removes all three and fails `:166`, which shows that the test can fail.
- **S10, `:1274` against a change to transition handling.** drag writes nothing on a row that a transition could animate, and it doesn't measure the dragged item, so no small `src` change about transitions moves the gap. `S10-2` shows only that the test can fail.

## Engines and checks

| Check | Result |
| --- | --- |
| `npx just typecheck` in `packages/drag` | exit 0 |
| `npx just lint` in `packages/drag` | exit 0 |
| `npx just test` in `packages/drag` | 911 passed and 5 failed. The 5 are `size.node.test.ts`'s ceiling rows, which fail at the input (`DRO-4`). Every new test passes in the source, consumer and node projects |
| `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` | exit 0: 62 files, 888 passed and 10 skipped |
| WebKit | not run (`drag:DRO-18`). No cited drag2 test was limited to WebKit |
| Engine limits | `keyboard.browser.test.ts:226` (IME) runs in Chromium only. It drives the composition through CDP, as drag2's test did |
| `git diff --check` over the unit | clean, apart from the blank context lines in the saved `.diff` files, which the unified diff format writes with a single space |

## For the architect

- **The S2 stop above.**
- **A fixture outside the row, which the development check refuses.** It is a block column whose rows all carry `margin-top: 6px` and `margin-bottom: 10px`, so the margins collapse on both sides. drag's development check refuses it: "the predicted insertion geometry disagreed with a fresh measurement at slot 1; the linear shift rule does not hold for this list". `src/sortable/y.ts` says that varying gaps and margins satisfy the rule. drag2's fixture, with `margin-bottom` alone, passes and is the one in the suite.
- **Not ported:** F5's drag2 source also changes the ancestor transform during activation. That tests drag2's single-snapshot rule, which F5 doesn't state.

## Notes on the run

- **Worktree base.** The sub-agents' worktrees were created at `main` (`df098551a`), not at `70f0ea270`. Each sub-agent reset its own clean branch to `70f0ea270` before starting.
- **Session trailer.** `b22d148db` and `302ba3bfc` carry a `Claude-Session:` trailer, which `main`'s `AGENTS.md` has forbidden since `df098551a`. They are not rewritten, and the later commits carry none.

The unit stops at the pushed report. **Next:** the architect decides on S2's rotate case and the collapsing-margin note.