# Production implementation handoff

**Status, 2026-11-07: completed at `d7e7b0d3a`.** The remaining work is [`remediation-handoff.md`](remediation-handoff.md), under `drag:DRD-14` to `drag:DRD-23`.

**One unit for one implementer: build `@ydinjs/drag` from the prototype to [`contract.md`](contract.md), prove it, integrate it, and stop for independent review.** The decisions are in [`00-index.md`](00-index.md).

**Base:** a new branch `drag/production` from the commit carrying this file on `drag/prototype`.

**Sources:** the prototype's code at `599684791` may be reused. drag2 is reference evidence and is not imported.

**Do not expand:** no auto-scroll, cross-list transfer, third-party axis seam, new lift modes or publication. The package stays `private` until the owner decides to release it.

## Work, in order

### 1. Clear the way

**The main checkout has a false green.** Its `packages/drag` still holds ignored legacy output (`sortable.js`, `draggable.js`, `kernel/` and `sortable/`), so baseline B still passes there by measuring the old package. A clean checkout measures a 51 B stub. Work in a clean worktree, or tell the owner before removing that output from the main checkout.

1. Implement `drag2:D-210`, following [`deferred-integration.md`](deferred-integration.md) §Baseline B. **This must land before the new package has any export.**
2. Repair the eight citations, under §References to deleted files there. `02-kernel-behavior-contract.md`'s sentence about compiling against the removed probe needs correcting as well as striking.

**Checks:** other size rows byte-identical. drag2's `references`, `size`, `decisions` and full suite pass.

### 2. Add `localDelta` to `box-quad`

Implement `box-quad:BQ-10`, with tests in its browser project and a size reading. No other `box-quad` change.

### 3. Build the package

- **Configuration:** `exports`, `files.json`, `project.json`, `tsconfig`, `tsdown`, `typedoc`, `vite`, `vitest`, lint and `box-quad` as a dependency. Restore `drag` in the root `Justfile`, `vitest.config.ts` and `.scripts/vitest-config.ts`, removed by the rebuild, whose record names each site. Copy the pointer commands from drag2. Test-only imports from drag2 would couple the packages.
- **Source:** `packages/drag/src`, from the prototype, with these changes from it:

| Decision | Change to the prototype |
| --- | --- |
| `DRD-4` | `lift` value in `lift.js`. Lift fields and landing code leave the kernel. Delete `lift: false` |
| `DRD-5` | `Space`, `Box` and `localDelta` replace `InheritedSpace` everywhere, including `free-drag/geometry`, `layout-animation`, `linear-shift` and `xy`. Keep an identity fast path only if measured |
| `DRD-6` | `requestStep` on the controller and the `Drag`. Delete `run`, `requestApply` and `apply`. Delete both `released` flags and the holding variables |
| `DRD-7` | Disposers receive the outcome. Late `use` on a controller runs at once |
| `DRD-8` | Guard as a free function with no reference to the controller. Add the press expiry |
| `DRD-9` | Focus capture at the drop and restore after release. The lift keeps focus |
| `DRD-10` | Separate replacing elevation animation. Reduced motion in the lift |
| `DRD-11` | Second pull at activation. `activate` may return `false` |

Comments and names follow [the technical English guide](../../../.agents/docs/technical-english.md). Production has no `lab` hooks. The development refusal counter stays behind `__DEV__`.

### 4. Tests

Vitest browser tests in `packages/drag/tests`, with real input through the Playwright commands, and declaration and node tests where they apply. **The browser suite runs in Chromium, Firefox and WebKit from one package recipe.** The root gate may stay on Chromium. Name each test's `DRI-*`.

**Starting set:** the prototype's 73 scenarios in `prototype/checks/run.ts`, plus every `keep` and `revise` row of [`test-classification.tsv`](probes/architecture-plan/test-classification.tsv), merged by guarantee. The row count isn't a target, and porting a row that repeats another is not owed. drag2's `tests/sortable/react.browser.test.ts` is the source for the framework scenarios.

**Required beyond that starting set:**

| Area | Scenarios |
| --- | --- |
| **Focus** | Two arrow presses in a row reorder twice. Pointer reorder keeps focus. Async verdict. Focus moved during a verdict stays there. Open shadow root. `autofocus` descendant on lift. Destruction doesn't restore. A pointer restore doesn't scroll, and a keyboard restore of an off-screen row does. Report `:focus-visible` per engine |
| **Elevation** | Mid-flight top element against static, `relative`, `z-index` siblings. Item with its own `z-index` and with `position: absolute`. No inline residue. Reduced motion on a custom behavior with no timing |
| **Click guard** | Destroy with the button held. Next click delivered. Next primary press expires a guard. Touch through CDP |
| **Deferred writes** | `moveTo` behind a cancel changes nothing, and the landing starts from the prior position. Two `invalidate` calls pull once. Step receives `null` before activation, during a verdict and after a decision. Request order. A throw in a step |
| **Cleanup** | Each outcome reaches a disposer, and `null` on destruction. Last in first out. A throwing disposer doesn't stop the rest. A late `use` on both scopes. Exact inline style and popover restoration on an accepted, a rejected and a canceled drop |
| **Destruction** | From every hook, a reaction, a listener, a disposer and a verdict. Promise identity. No retained item, behavior or view: `WeakRef` with forced GC |
| **Coordinates** | A no-lift move and resize follow the pointer under rotate, scale, skew, zoom, their combinations and own rotate. Own `zoom` limit pinned. A lifted item with own `zoom`, which hasn't run |
| **Prototype gaps** | `handle`, `visual` and `box` overrides. Scroll during a drag, nested scrollers included. React and a similar reconciler. `pointercancel` through CDP touch. Two pointers |
| **Authoring** | The three example behaviors as fixtures, rewritten on the final API. The canvas uses `box-quad` under rotation, and the resize handle works in a scaled parent. Declaration tests for the type requirement |

**Harness notes from the prototype:** WebKit's mouse stream can stop after a few drags on one page, even with no library, so use fresh pages. Keep the pointer inside the viewport in Firefox. In Chromium an accepted reorder may produce no trailing click, so a guard test needs a case that produces one, and must assert that it did.

**Mutation witnesses.** Each is a throwaway edit, and the test must fail. Record test name and engine.

| Entry | Mutation |
| --- | --- |
| `DRI-1` | Apply a cancel inline when requested |
| `DRI-2` | Apply the decision before deferred steps |
| `DRI-3` | Run `end` when `activate` threw |
| `DRI-4` | Let a second cancel replace the first |
| `DRI-5` | Abort the verdict's signal on acceptance. Let a late completion reach a later drag |
| `DRI-6` | Remove the `#running` refusal |
| `DRI-7` | Report the raw value. Fill the decision after the report |
| `DRI-8` | Pass the `Drag` to a step behind a decision. Remove identity coalescing |
| `DRI-9` | Start the landing before releasing the lift. Stop at the first disposer's throw |
| `DRI-10` | Run `end` on destruction. Remove the guard with the controller's listeners |
| `DRI-11` | Remove each expiry in turn. Swallow a below-threshold click |
| `DRI-12` | Restore over a newer focus. Use `preventScroll` for a command. Remove the lift's focus repair |
| `DRI-13` | Make elevation additive (fails in WebKit). Remove reduced motion from the lift |
| `DRI-14` | Remove the activation pull |
| `DRI-15` | Skip the placeholder check at activation |
| `DRI-16` | Use a ratio in place of `localDelta` |
| `DRI-17` | Read layout in a sample. Allocate in `#move` |
| `DRI-18` | Import `lift` from `draggable` |

### 5. Before/after performance

A new `packages/drag/bench/compare.ts`, starting from [`cost.mts.txt`](probes/architecture-plan/cost.mts.txt) and the prototype's `measure/cost.ts`. Raw output and a dated reading go in `packages/drag/.plan/measurements/`.

**Arms, measured in one browser process, interleaved, with fresh pages, for at least 7 rounds per arm:**

| Arm | Source |
| --- | --- |
| **Before: drag2** | The tree's drag2 complete sortable and free drag |
| **Before: prototype** | `599684791`, read with `git archive` into scratch |
| **After: production** | The current source |
| **Control: production again** | Same bundle, separate arm. Gives the noise floor |

**Rows, at 20 and 2,000 items unless stated:**

| Scenario | Measures | Rule, stated before running |
| --- | --- | --- |
| 300 moves, one frame each | Layouts per run | **Exact:** production is at or below both before arms |
| Same | Script and task µs per move, median and range | A difference within the control's spread is **no difference**. Above that, production is **slower**: find the cause, or report it for the owner's §0 decision |
| Same | Bytes per move by function, with a sampling profile and no harness `evaluate` during the run | Only the lift's CSS string may appear from the kernel and lift |
| Press and release below the threshold | Script and task µs. Layouts | **Report, for `drag:DRO-1`.** Run with both `[...root.children]` and a cached array, so that the library's share is separated |
| 50 activate-and-drop cycles, with and without a landing | Layouts, script, task | Same rule as moves. No more layouts without a landing than the before arms |
| 50 keyboard reorders | Layouts, script, task | Same rule. Includes focus restoration |
| 200 operations, then destroy | Retained heap after forced GC, against an empty page | No growth attributable to the library beyond the noise floor |
| `draggable` no-lift, move | Script and allocation | No before arm. Report |

**The instrument must prove itself first.** In a scratch copy of production, inject each: one forced layout per move, one O(n) walk per move, 1 KB allocated per move, and an item retained after destruction. The comparison has to flag each. Record the readings. If one isn't flagged, fix the instrument before reading any result.

**Limits to state:** CDP metrics are Chromium only and headless, with no real compositing cost. Firefox and WebKit have no equivalent here. The result may be "no difference" or "slower". **Don't report a pass from the earlier figures.**

### 6. Size

Rolldown as in drag2's `bench/size/measure.ts`, with an unresolved import failing the build. Rows: `draggable` alone, `draggable` + `lift`, each example, `freeDrag`, `freeDrag` + `bounds` + `landing`, `sortable` + `y`, `sortable` + `xy`, complete. Module-absence assertions for `DRI-18`, and for landing and `layoutAnimation`.

Compare with [the prototype's figures](probes/prototype/size.txt), which came from esbuild, so re-measure the prototype with this tool first. Ceilings are set from this first production reading (CONTRIBUTING §18). **Control row:** `draggable` alone, which an edit to `sortable` must not move. Report any growth over the prototype with its cause.

### 7. Documents and integration

- `packages/drag/README.md`: quick start, authoring guide (hooks, the `requestStep` rule, `use`, faults, coordinates with `box-quad` and each basis), and focus and landing limits. A consumer owns `tabindex`, roles and announcements.
- Published JSDoc states preconditions a type can't.
- Storybook stories in `src/`, from the prototype's pages: sortable list and grid, free drag, and one custom behavior. The Requests and Faults pages go, because tests now cover them. Keep a Faults story only if the console reading needs it.
- `.agents/docs/accessibility.md`: add a section on `@ydinjs/drag` with what is now verified, leaving drag2's section. `.agents/docs/architecture.md` and `measure/brief.md`: read their `@ydinjs/drag` lines and correct any that are false.
- `packages/box-quad/typedoc.json`: correct its copy-paste name and entry points.
- `packages/drag2/README.md` §Migrating: state that the old package is gone. Dated drag2 records aren't rewritten.
- **Delete `packages/drag/prototype/` and its recipes.** `probes/prototype/` stays, with the code readable at `599684791`.

### 8. Finalize

Run the [handoff](../../../.agents/docs/handoff.md) checks. Then package and root `lint`, `typecheck`, `build`, `test` and `size`, and the three-engine recipe. Write `packages/drag/.plan/implementation-report.md`: each `DRI-*` with its test and mutation, the performance and size readings, faults found, any return to the architect, and limits. Push and stop.

## Return to the architect

Stop and return if:

- A guarantee needs a second reader of the requests, or FIFO across kinds.
- A behavior needs the session, or a built-in needs a private kernel path.
- `requestStep`'s list needs tagging, reordering or an entry per pointer sample.
- A guarantee in the contract can't hold in an engine, or two guarantees conflict.
- A required `box-quad` conversion can't be expressed by `Space`, `Box` and `localDelta`.
- Production is slower than a before arm with no cause you can remove. That also goes to the owner, as a §0 decision.

## After this unit

Independent review by a fresh consolidator round, then the owner reads [`DRO-1`, `DRO-2` and `DRO-3`](00-index.md#owner-decisions) with the report. Implementation does not wait for them.