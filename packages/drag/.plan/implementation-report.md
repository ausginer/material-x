# Production implementation report

**Status, 2026-11-07:** reviewed at `d7e7b0d3a`. The architect decided the return and the seven choices in `drag:DRD-15` to `drag:DRD-18`. `drag:DRD-22` withdraws this report's "no difference" for the cycle rows, and records the retained row as decided by manual attribution. The report itself is unchanged.

**`@ydinjs/drag` is implemented, integrated and measured from `a1d31e0d2`, and stops here for independent review.** Governing records: [`contract.md`](contract.md), [`00-index.md`](00-index.md), [`implementation-handoff.md`](implementation-handoff.md). Branch: `drag/production`. The package stays `private`.

**One rule is missed and returns to the architect: a landed drop costs one layout more than both before arms.** `drag:DRO-1`, `drag:DRO-2` and `drag:DRO-3` stay open for the owner.

## Return to the architect

**DRI-9's order costs one layout per landed drop.** The handoff's exact rule says layouts must be at or below both before arms. The 50 landed cycles read 400 against 350 and 350. Script and task time show no difference.

- **Cause, from a trace with stacks:** the kernel's `focus()` at DRI-9 step 6 forces a layout, then the landing at step 7 dirties layout again, so rendering runs one more. Starting the landing first gives 7 layouts per cycle instead of 8.
- **Why it is not changed here:** the contract fixes that order, so the swap is the architect's decision.
- **What the swap needs:** a separate `try` around the landing, so that a throw in it can't skip the focus restore.
- **Alternative:** accept one layout per landed drop as the cost of DRI-12 and restate the handoff's rule.

Nothing else reached a stop condition. The step list holds only steps and stays empty on the hot path.

## Verification

| Check | Result |
| --- | --- |
| Package suite, Chromium and shipped build, `just test` | 273 passed |
| Three engines, `just test-engines` | 745 passed, 14 skipped. Every skip is a Chromium-only test, gated by `it.runIf(isChromium)` |
| Package `lint`, `typecheck`, `size` | Pass |
| drag2 `references`, `size`, `decisions` | 119 passed |
| Root `build`, `typecheck`, `size` | Exit 0 |
| Root `lint` | **Exit 1.** `drag` and `box-quad` pass. Fails in `core`, `tproc`, `material-x`, `vite-custom-element-assets` and `drag2` |
| Root `test` | **Exit 1.** 2,622 passed, 68 skipped, 1 failed: `TokenPackageProcessor` in `tproc` |
| Mutations | All 32 failed a test. No survivors |
| Instrument proof | All five injections flagged |

## Performance

The full reading is in [`measurements/2026-11-06-reading.md`](measurements/2026-11-06-reading.md).

- **Moves and free drag:** layouts equal, and script and task show no difference from either before arm, at 20 and 2,000 items.
- **Allocation:** the lift's CSS string, 109 B per move, is the only allocation from the kernel and lift.
- **Keyboard:** 50 layouts against 100 and 50. No difference in time.
- **Cycles with no landing:** 250 layouts against 300 and 250. No difference in time.
- **Cycles with a landing:** 400 layouts against 350. No difference in time. See above.
- **Retained heap:** the instrument flags +9,208 B over the prototype at 200 operations. Snapshots attribute it to compiled code and engine tables with no library objects, and production is below the prototype at 0, 400 and 600 operations.

**Wide noise floors limit "no difference".** The largest is on cycles, where medians sit up to 1,804 µs above a before arm at about 14,000 µs per cycle, inside a 2,386 µs floor. The owner may want a quieter machine before reading those rows as equal.

## Owner evidence

- **`drag:DRO-1`:** with a cached array, a press at 2,000 items costs 53 µs of script against 55 µs at 20. With `[...root.children]` it costs 337 µs. So the growth is the consumer's spread, which production calls per press, and the library's share doesn't grow. Against drag2, which doesn't pull at a press, it is +257 µs, floor 223 µs.
- **`drag:DRO-2`:** the default is built. A landing outside a scrolling list can be clipped and can pass under a later positioned panel.
- **`drag:DRO-3`:** emulated touch ran in Chromium. Physical touch and pen are unverified.

## Size

Rolldown, with the prototype re-measured by the same tool. Ceilings are set from this reading. The control row is `draggable` alone.

| Row | Minified B | Brotli B | Prototype Brotli B | Change |
| --- | --- | --- | --- | --- |
| `draggable` alone | 5872 | 2035 | 3675 | -1640 |
| `draggable` + `lift` | 11125 | 4017 | no such row |  |
| Example: resize handle | 8491 | 3151 | 3817 | -666 |
| Example: drop zone | 11845 | 4284 | 3948 | +336 |
| Example: canvas group | 8645 | 3162 | 4269 | -1107 |
| `freeDrag` | 13561 | 4825 | 4553 | +272 |
| `freeDrag` + `bounds` + `landing` | 14281 | 5090 | 4833 | +257 |
| `sortable` + `y` | 18925 | 6567 | 6373 | +194 |
| `sortable` + `xy` | 18331 | 6461 | 6259 | +202 |
| Complete | 19937 | 6945 | 6780 | +165 |

**Causes of growth over the prototype:** focus capture and restore, the elevation animation, the guard's press expiry, `localDelta`, and the lift's extra properties. `draggable` alone falls because the lift and `box-quad` leave its graph (DRD-4).

## Contract entries and mutations

Engine and test are the first failure recorded by [`measurements/mutations.py.txt`](measurements/mutations.py.txt), with raw output in [`measurements/2026-11-06-mutations.tsv`](measurements/2026-11-06-mutations.tsv). A mutation's failing test may belong to a neighboring entry.

| Entry | Mutation | Engine | Failed | First failing test |
| --- | --- | --- | --- | --- |
| `DRI-1` | Apply a cancel inline when requested | chromium | 4 | drag:DRI-1 a request does not change the running step should let a sortable placeholder reaction cancel during activation |
| `DRI-2` | Apply the decision before deferred steps | chromium | 1 | drag:DRI-2 one reader and fixed precedence should run deferred steps before the decision, with no drag behind it |
| `DRI-3` | Run end when activate threw | chromium | 3 | drag:DRI-3 terminals should deliver no terminal without a start: cancel before start |
| `DRI-4` | Let a second cancel replace the first | chromium | 1 | drag:DRI-4 cancel should keep the first reason and origin |
| `DRI-5` | Abort the verdict signal on acceptance | chromium | 2 | drag:DRI-5 verdict should not abort the signal on acceptance |
| `DRI-5` | Let a late completion reach a later drag | chromium | 2 | drag:DRI-5 verdict should keep a late resolve after a cancel from reaching the next drag |
| `DRI-6` | Remove the #running refusal | chromium | 1 | drag:DRI-6 reentrant input should refuse a nested press, and take the next real one |
| `DRI-7` | Report the raw value | chromium | 7 | drag:DRI-7 faults should cancel once with a fault when move throws, and let the terminal run |
| `DRI-7` | Fill the decision after the report | chromium | 1 | drag:DRI-7 faults should leave origin fault when a global listener requests cancel |
| `DRI-8` | Pass the Drag to a step behind a decision | chromium | 3 | drag:DRI-2 one reader and fixed precedence should run deferred steps before the decision, with no drag behind it |
| `DRI-8` | Remove identity coalescing | chromium | 2 | drag:DRI-8 deferred writes should coalesce one function requested twice before it runs |
| `DRI-9` | Start the landing before releasing the lift | chromium | 1 | drag:DRI-9 release order should release in the fixed order |
| `DRI-9` | Stop at the first disposer throw | chromium | 1 | drag:DRI-9 release order should run disposers last in first out, past a throw |
| `DRI-10` | Run end on destruction | chromium | 13 | drag:DRI-10 destruction should tear down totally when requested from admit |
| `DRI-10` | Remove the guard with the controller listeners | chromium | 1 | drag:DRI-11 the click guard should swallow the trailing click after destruction with the button held |
| `DRI-11` | Remove the click expiry | chromium | 1 | drag:DRI-11 the click guard should swallow one click only |
| `DRI-11` | Remove the pointerup expiry | chromium | 1 | drag:DRI-11 the click guard should expire in the task after that pointer pointerup |
| `DRI-11` | Remove the pointercancel expiry | chromium | 1 | drag:DRI-11 the click guard should expire at that pointer pointercancel |
| `DRI-11` | Remove the next-press expiry | chromium | 1 | drag:DRI-11 the click guard should expire at the next primary pointerdown |
| `DRI-11` | Swallow a below-threshold click | chromium | 2 | drag:DRI-11 the click guard should keep the click of a press below the threshold |
| `DRI-12` | Restore over a newer focus | chromium | 1 | drag:DRI-12 focus should leave focus where the user moved it during a verdict |
| `DRI-12` | Use preventScroll for a command | chromium | 1 | drag:DRI-12 focus should scroll a keyboard restore of an off-screen row into view |
| `DRI-12` | Remove the lift focus repair | chromium | 2 | drag:DRI-12 focus should keep focus when the lift promotes an autofocus descendant |
| `DRI-13` | Make elevation additive | webkit | 2 | drag:DRI-13 landing should stay above z-index siblings for the whole flight |
| `DRI-13` | Remove reduced motion from the lift | chromium | 2 | drag:DRI-13 landing should give every landing zero duration with reduced motion, including a custom behavior with no timing |
| `DRI-14` | Remove the activation pull | chromium | 2 | drag:DRI-14 collection should decline quietly when the item left the collection during the press |
| `DRI-15` | Skip the placeholder check at activation | chromium | 6 | drag:DRI-15 placeholder integrity should end activation clean with a fault when a placeholder removes itself |
| `DRI-16` | Use a ratio in place of localDelta | chromium | 3 | drag:DRI-16 no-lift move and resize should follow the pointer under rotate |
| `DRI-17` | Read layout in a sample | chromium | 1 | drag:DRI-17 hot path should read no layout in a sample, and none in a frame with nothing stale |
| `DRI-17` | Put an idle step on the list | chromium | 1 | drag:DRI-17 hot path should allocate per sample only the CSS string a lifted write needs |
| `DRI-17` | Allocate in #move | chromium | 1 | drag:DRI-17 hot path should allocate per sample only the CSS string a lifted write needs |
| `DRI-18` | Import lift from draggable | node | 4 | drag:DRI-18 module graphs and size should satisfy the declared graph and ceiling of draggable alone |

Test names cite their entry, so `grep -rn "DRI-12" tests` lists all tests for one.

**`:focus-visible` per engine:** after a keyboard restore it is true, and after a fresh pointer drop it is false with the row as the active element, in Chromium, Firefox and WebKit.

## Faults found while building

Each is fixed.

- **Touch self-cancel:** a bubbling `lostpointercapture` from a descendant canceled the drag.
- **Own `rotate`:** a double transform on a lifted item with its own `rotate`.
- **Empty `style=""`:** Chromium left the attribute after restoration.
- **Inner `box`:** a placeholder measured 0 px when `box` was inside the visual.
- **Guard precedence:** a precedence error in the guard's expiry condition.
- **Step-list allocation:** `requestStep` pushed to the list every frame, 74 B per move. An idle step now runs directly. The instrument missed it at first, so it gained a matching injection.
- **Weak tests:** a pointerup guard test whose first click had already expired the guard, and a release-order test that couldn't see the landing's start. Both are rewritten.
- **`Admission` type:** excess properties weren't refused.

## Decisions for review

Each is a choice the contract leaves room for, or narrows.

1. **Quiet decline at activation:** the kernel declines quietly for an item disconnected at activation.
2. **Keyboard skips the second pull:** a keyboard command doesn't repeat `items()`, which is narrower than a literal reading of DRI-14.
3. **`activate` and `start` are one step.**
4. **`drag.requestStep` is the controller's function.** `drag.requestCancel` is scoped to the operation.
5. **`layoutAnimation` ignores reduced motion:** only the lift's landing honors it, as DRI-13 states.
6. **A factory that returns the dragged item:** reports `sortable/insertion-placeholder-lost`, and the placeholder's disposer then removes the item from the document. The contract doesn't cover this usage, no guard was added, and a test pins it.
7. **Legacy output removed beyond the handoff's named items:** `draggable/`, `draggable.d.ts`, `draggable.js.map`, `sortable.d.ts` and `sortable.js.map`, each confirmed ignored before removal.

## Limits

- **CDP metrics:** Chromium only and headless, with no real compositing cost. Firefox and WebKit have no equivalent here.
- **Touch:** physical touch and pen are unverified. Emulated touch produces no trailing click.
- **Test audit is partial:** the classification rows were merged by guarantee and audited, but kernel rows D 127-137, L 104-112, 35-36, 58 and 240 weren't individually checked against a test. Prototype page drivers weren't ported, because the handoff doesn't require them.
- **Retained rows at 100, 400 and 600 operations:** one round each, from temporary copies of the instrument.

- **Root failures weren't run at the base revision.** `core`, `tproc`, `material-x` and `vite-custom-element-assets` have no diff from `a1d31e0d2`. The files this branch changed in `drag2` were linted clean, but the rest of its lint failures were not compared with the base. An earlier root run also failed once on a `material-x` radio visual test (29 px), which passed in the final run, so it is unstable here.

## Next

An independent consolidator round reviews this branch. Then the owner reads `drag:DRO-1`, `drag:DRO-2` and `drag:DRO-3` with this report, and the architect decides the landing order.