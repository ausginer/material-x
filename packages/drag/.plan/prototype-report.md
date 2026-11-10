# Prototype report

**Status: closed, 2026-11-06.** The owner tried the prototype and closed the checkpoint. [`00-index.md`](00-index.md) records how each finding was resolved. The sections below are as written at the stop, when this was evidence for a design, not production acceptance, and no decision had been recorded.

**Input:** `drag/rebuild` with `drag/architecture-plan` merged at `79a6404f9`, on `drag/prototype`.

**Result: both built-in behaviors run on the public `draggable` with no private kernel path, and no stop condition in the plan fired.** All 73 scenarios pass in Chromium, Firefox and WebKit. Two of them only record an observation and cannot fail, and both observations are defects listed below. Complete Brotli is 7,468 B.

## Try it

From `packages/drag`:

```sh
npx just prototype        # Pages, at http://localhost:5191/
npx just prototype-check  # Focused checks, all engines. Name engines to narrow
npx just prototype-size
npx just prototype-cost
npx just typecheck
```

To write a behavior, edit `prototype/examples/scratch.ts`. The Custom behaviors page swaps it in on save. Read `prototype/src/draggable.ts` from the top for the API, then the three examples beside the scratch file.

**On a fresh container,** Firefox and WebKit need `npx playwright install firefox webkit`, and WebKit also needs `sudo npx playwright install-deps webkit`. Both launched here after those steps, so nothing was substituted.

## What the owner should look at first

1. **`requestApply`, by writing a behavior.** It works, and it is the rule most likely to be forgotten. See the authoring section.
2. **The elevation defect.** A landing item paints under positioned siblings in all three engines. It is the one finding that bears on presentation.
3. **`lift: false` still pays for the lift.** The canvas example carries `presentation` and `box-quad` code it never runs.
4. **The DevTools console on the Faults page.** I could not observe how each engine prints `cause`.

## API changes against section 6

The required properties held. These shapes changed:

| Change | Why |
| --- | --- |
| **Added `command(event)`** | `sortable`'s keyboard needs a pointerless operation, and the sketch had no way in. A key on the root returns an admission, and the kernel runs one complete operation |
| **Added `handle` to the admission** | The kernel enforces `data-drag-ignore`, so every behavior gets the policy with no code and no second export. It scans the event path up to `handle ?? item` |
| **Added `box` to the admission, and `rect`, `boxWidth`, `boxHeight`, `visualSpace`, `itemSpace`, `translatedX`, `translatedY` to the view** | The placeholder's footprint and the landing need facts read before the lift, and only the kernel can read them there |
| **`settle` returns `{ x, y, duration?, easing? }`** | The sketch returned a target only. The behavior owns the timing, and the kernel owns the animation |
| **`apply` receives `Drag \| null`** | It also runs when idle |
| **Added `panel.use(dispose)`** | Controller-lifetime cleanup. Row animations outlive the operation, so the cancel at destruction needed an owner. This answers `flow-8` |
| **`drag.use` runs at presentation release: after `settle`, before the landing and `end`** | One stack is enough, because `sortable` must remove its placeholder before the landing starts |
| **`drag.signal` and the verdict's signal are different** | `drag.signal` ends with the operation's presentation, for the behavior's listeners. The verdict's signal aborts only on cancel or destroy, under guarantee 5 |
| **Three decision slots became one, `session.decision`** | Under guarantees 4, 5 and 7 the first of cancel, fault and verdict always wins, so the precedence among them was never observable. Precedence is now destroy, deferred work, the decision, the next step |
| **`onEnd` carries `request`, not `proposal`** | The snapshot inside the proposal had no reader. `request` keeps `item`, `from`, `to`, `previous`, `next` |
| **`landing` and `displacement` take plain installers** | `landing()` returns `(window) => timing`, and `layoutAnimation()` returns `() => sink` |
| **`moveTo` reads its point inside the pass** | A throwing getter is an ordinary fault, so the wrapper the earlier prototype used went away |

**Private paths `sortable` and `freeDrag` needed: none into the kernel.** They share pure helpers in `shared/` (`listenForInvalidation`, `createFrameTask`, `landing`). These read nothing private, but they aren't published, so a third-party behavior writes its own. That is a question for the published surface, not a bypass.

**The five required properties:**

| # | Property | Evidence |
| --- | --- | --- |
| 1 | Built-ins use only the public API | `sortable.ts` and `free-drag.ts` import `draggable` and types from `draggable.ts`, and nothing else from the kernel |
| 2 | A behavior can't reach a slot, `next` or the state | **Stronger than required:** `Drag` is a separate object with no reference to the session, so this holds at runtime as well as in types |
| 3 | A request from any hook, reaction or `error` listener doesn't change that step | Check groups 3 and 4 |
| 4 | A hook's throw is a fault with no `try`, and `end` runs only if `start` was reached | Check groups 3 and 4 |
| 5 | The kernel allocates nothing per sample | **Nearly, and not proven zero.** V8's sampling profiler attributes 327 B per move to `write`, which is the transform string, and 6 B to `#onPointer`. I attribute the 6 B to reading `event.type`, which I did not confirm. `#enter` and `#move` were below the listing. One sample also includes 165 B under `resolve`, a name shared by the axis and Playwright, so I can't attribute it |

**Close to a stop condition, for your judgement.** The session gained two booleans beside its three states: `concluded`, because the terminal is now its own step, and `released`, so that a late `use` runs at once. Neither is read as a phase and there is no queue or transaction, so I did not treat this as "a phase beyond the three states". A reviewer could read it differently.

## Authoring

**The examples are assumed shapes and not Readymag requirements.** They exercise the API, and they say nothing about what a real flow needs.

| Behavior | Hooks | Lines, no comments | By hand |
| --- | --- | --- | --- |
| **Resize handle** | `admit`, `move`, `end` | 34 | Nothing beyond its own logic |
| **Drop zone** | `admit`, `move`, `drop`, `settle` | 48 | The hit test, filtering out the lifted card. A stand-in element to find the landing target, because a lifted item has no flow position. There is no placeholder, so the sibling list closes up when a card lifts |
| **Canvas group** | `admit`, `activate`, `move`, `drop`, `settle`, `apply` | 145 | The canvas scale. Its own frame task and `run`. A `committed` flag set in `settle` and read in a `use` disposer. Writing the final position |

**Where the rules were awkward:**

- **`requestApply` needs a holding place outside the drag.** `nudge` and `moveTo` have no `Drag` at hand, so the wish goes in a controller-scoped variable, and `apply` reads and clears it. The rule was easy to follow once and easy to imagine forgetting. Nothing tells an author who writes directly, because the failure only appears when foreign code calls in mid-step.
- **`run` is silently refused inside a pass.** Calling it from a hook does nothing, with no signal. The canvas's `drop` calls `render(drag)` directly for this reason.
- **Rollback is split across two hooks.** `end` doesn't run on destruction, so rollback must live in `use`. `use` runs before `end` and can't see the outcome, so `settle` has to record it in a flag first. This bears directly on open question 5: **yes, I wrote `use` cleanup that `end` would have covered, plus a flag to connect them.**
- **Both built-ins needed the same `released` flag.** `apply` must not touch a drag past its drop, and the view can't say so. Two of two behaviors writing it suggests a read-only `drag.released`, though that edges toward exposing state.
- **A behavior's own frame task refers to the controller it is an argument to.** `panel` is used inside closures declared before it, which the lint rule reports. It is correct at runtime.
- **`rect` and its siblings are typed non-null but unset with `lift: false`.** The type doesn't track `lift`. It would take a generic or a union, and I left it plain for readability.

## Size

Observed: esbuild minified with `__DEV__` false, then Brotli 11. An unresolved import fails the build. [Full output](probes/prototype/size.txt).

| Composition | Minified | Brotli |
| --- | --- | --- |
| `draggable` alone | 10,119 | 3,810 |
| Resize handle | 10,541 | 3,958 |
| Drop zone | 10,838 | 4,081 |
| Canvas group | 11,687 | 4,429 |
| `freeDrag` | 12,732 | 4,700 |
| `freeDrag` + `bounds` + `landing` | 13,544 | 4,998 |
| `sortable` + `y` | 19,380 | 7,041 |
| `sortable` + `xy` | 17,858 | 6,539 |
| Complete: `sortable` + `y` + `landing` + `layoutAnimation` | 20,530 | **7,468** |

Against the plan's rows, which were estimates and not limits:

| Measure | Production | Single-pass prototype | Plan's estimate | **Observed** |
| --- | --- | --- | --- | --- |
| Complete, Brotli | 11,533 | 8,740 | About 8 KB | **7,468** |
| Free drag, Brotli | 8,627 | 6,025 | About 5.5 KB | **4,700** |
| Lifecycle lines, no comments | 2,553 | 1,200 | Under 1,200 | **1,108**: kernel 618, sortable 305, free drag 185 |
| Public runtime exports | 33 in `kernel.js` alone | Unchanged | About 12 | **12** |

**Complete, minified bytes by module:** `draggable` 5,571, `sortable` 3,414, `presentation` 2,419, `box-quad` 1,970, `rect-index` 1,937, `linear-shift` 1,259, `layout-animation` 874, `placement` 700, `collection` 667, `y` 488, `keyboard` 311, `invalidation` 284, `landing` 267, `fault` 174, `domain` 167.

**Finding: `presentation` and `box-quad` are 4,389 of `draggable`'s 10,119 minified bytes, and a `lift: false` behavior never runs them.** The kernel chooses at runtime from a boolean, so a bundler can't drop the lift. The `draggable` import brings no sortable, axis, cache or landing code, as guarantee 14 asks, and the size script fails if it does. But the lift does leak into no-lift behaviors, against CONTRIBUTING §7. Passing the lift as an imported value would fix it, and that is a surface decision, so I left it for review.

**Limit:** the "free drag" comparison assumes the earlier row had no optional features. The earlier figures are from their own builds and were not re-measured here.

## Cost

Observed: real mouse in headless Chromium, 300 moves with one frame each, median of 3 runs. [Saved output](probes/prototype/cost.json). The section 4 rows are from an earlier session, so this is not a same-session comparison. Two runs of this script here gave 1,883 and 2,127 µs for the first row, so treat a few hundred µs as noise.

| Items | Measure            | Section 4 cached axis | **Prototype** (range)   |
| ----- | ------------------ | --------------------- | ----------------------- |
| 20    | Layouts per run    | 41                    | **41**                  |
| 20    | Script µs per move | 138                   | **156** (138–165)       |
| 20    | Task µs per move   | 1,714 (1,680–1,766)   | **2,127** (1,860–2,162) |
| 2,000 | Layouts per run    | 41                    | **41**                  |
| 2,000 | Script µs per move | 154                   | **184** (155–191)       |
| 2,000 | Task µs per move   | 2,980 (2,859–3,228)   | **2,985** (2,983–3,414) |

**Guarantee 13's layout count holds, at 41 and 41.** Script time per move reads about 20 to 30 µs higher, within a range that overlaps the earlier figure. I did not establish a cause.

**A press and release below the threshold, the §14 question:**

| Items | Layouts | Script µs | Task µs |
| ----- | ------- | --------- | ------- |
| 20    | 0       | 76        | 257     |
| 2,000 | 0       | **519**   | **834** |

**Pulling at admission costs about 440 µs of script per press at 2,000 items in this run, once per press and not per sample, with no layout.** That is the difference between the two rows, so it covers everything that scales with the list. Most of it should be the copy, the consumer's `[...root.children]` and a path search through `includes`, but I did not separate them. An earlier run gave 147 and 658 µs of script, a difference of about 510 µs. **This is a hot-path trade under §14, so it needs your approval.** It closes the stale-order trap the plan describes.

## Focused checks

Real input through Playwright, each scenario on a fresh page. [Every row, per engine](probes/prototype/checks.json). Chromium 156, Firefox 157, WebKit 27.2.

| # | Assumption | Scenarios | Result in all three engines |
| --- | --- | --- | --- |
| 1 | The click guard can be exact | 6 | **Holds.** Trailing click swallowed, including after a cancel with the button held. A press below the threshold keeps its click. The next click is delivered |
| 2 | Top-layer lift and additive landing | 9 | **Holds, except elevation.** Clipping, stacking, scale, zoom, shadow root, iframe and the landing's target all pass |
| 3 | The single-pass rule through the public API | 10 | **Holds** on `sortable` and on a custom behavior |
| 4 | Reporting when caught | 6 | **Holds.** Two faults in a pass, destruction, disposers, eight hostile values, and both listener cases |
| 5 | Precedence in place of FIFO | 4 | **Holds,** with one visible difference below |
| 6 | No trusted event is refused | 1 | **Zero refused** across all checks and page drivers. The instrument's control saw its 1 untrusted press |
| 7 | A late verdict can't reach a later drag | 5 | **Holds** for resolve and reject, after cancel and after destroy, with a second drag in flight |

The other 32 scenarios cover the new behaviors, the remaining guarantees, the examples and a drag on each page. Hot reload of the scratch file was checked once by a throwaway script, editing the file and dragging, and is not in the suite.

**Limits on these results:**

- **In Chromium an accepted reorder produced no trailing click at all,** presumably because the row moved, so that one scenario is vacuous there. The rejected-drop and held-cancel scenarios produce one, and those pass. Firefox and WebKit produce one in all three.
- **The FIFO difference:** a cancel followed by `invalidate()` in one callback now pulls the collection once before the cancel applies, where FIFO would not have. The outcome is the same.
- **Touch and pen:** none. A real `pointercancel` from touch scrolling hasn't run.
- **Scroll during a drag** is on the list page and not in a check.

## Defects and missing capabilities

**Defects found:**

| Defect | Where | Status |
| --- | --- | --- |
| **A landing item paints under positioned siblings.** Mid-landing, the top element at the item's centre was a sibling (`r2`) | All three engines, with `position: relative` rows | **Open, and it confirms section 9, item 5.** The lift has ended, so the item has no elevation. Production's behavior wasn't checked. It doesn't undermine the lift itself, so I didn't return to the architect |
| **A keyboard reorder loses focus** when the consumer moves the item. Focus goes to `body`, so a second arrow press does nothing | All three engines | **Open.** The list and grid pages refocus by hand. `onReorder`'s plain `insertBefore`, which the API encourages, has this trap, and the library could restore focus for a command |
| **Destroying with the button held doesn't swallow the trailing click** | By reading the code: destruction removes the guard's listeners | **Open.** Guarantees 3 and 9 conflict here. I kept guarantee 3 |
| **`moveTo` queued behind a cancel still applies,** and the landing starts from the moved position | `freeDrag`, by reading the code | Accepted for now. Deferred work outranks the decision, and the earlier prototype dropped this write |
| **Lint debt** | See verification | Reported, not resolved |

**Section 5, not delivered or not shown:**

- **React and similar frameworks not disturbed:** not exercised. The production suite wasn't run against this code.
- **`visual` and `box` overrides:** implemented in `sortable`, with no page or check. **`handle`** is on the list page with no check.
- **Touch and pen:** implemented through pointer events and not run.
- **Guarantee 3's retained references, and heap in general:** not measured.
- **`lift: false` coordinates:** a no-lift behavior gets no `InheritedSpace`. The canvas example measures a ratio, which handles uniform scale only. **This is a missing capability if a real flow needs rotation.**
- **A third-party `axis`:** deliberately absent, under open question 2. `AxisInstaller` is simple enough that it could be published later.
- **Library frames per sample:** not re-measured.

**Section 7's conditions:**

| Change | Condition | Status |
| --- | --- | --- |
| 1 | Check 4 pins the destroy-from-listener outcome | Done |
| 2 | Tested with a real platform throw | Done: an item removed between the press and activation |
| 6 | The class is asserted with cancel, destroy and fault before `start` | Done |
| 7 | Zero trusted refusals per engine | Done |

**Not in this unit, as the plan says:** the guarantee suite, mutants, budgets, heap campaigns, real-device input, package configuration, public documentation, the contract, auto-scroll and cross-list transfer. Removing drag2, Baseline B and the deleted-file references stay in [`deferred-integration.md`](deferred-integration.md).

## Verification and limits

- **Typecheck:** `npx just typecheck` passes.
- **Format:** `oxfmt` is the last writer on every file.
- **Lint: fails, and I did not resolve it by hand,** as the handoff directs. Oxlint reports 619 errors, 492 of them in `checks/`, where `lab` is untyped on purpose. ESLint adds `import-x/no-unresolved` on the 35 `@ydinjs/drag/...` imports, because its resolver doesn't read the prototype's alias. In `src/`:
  - 8 `no-use-before-define`, for closures that refer to a later binding, all correct at runtime.
  - 2 `no-unnecessary-condition`, both needed: `composedPath()` yields non-elements, and WebKit's `click` has no `pointerId`. The types don't know this.
  - 1 `unbound-method`, on `then.call`.
- **The package isn't in the repository's gates.** It has no `lint` script or `project.json`, so root recipes don't reach it. The recipes above run on their own.
- **Not independent.** I wrote the library, the checks and this report, and no reviewer has read them.
- **Headless timing.** The cost figures are CDP main-thread metrics, with no real compositing cost.
- **WebKit's mouse stream can stop on a page after a few drags, with no library loaded.** A throwaway probe reproduced it on a bare page, so I split that scenario across fresh pages. I did not find the cause. One Firefox scenario also failed when the pointer went past the viewport edge, and passed inside it, so the checks stay inside. I didn't isolate that either.
- **Copied module comments.** `rect-index.ts`, `linear-shift.ts` and `layout-animation.ts` are near-verbatim copies, and a few of their comments still use drag2's vocabulary, such as "frame".

## Open questions for the owner

From the plan's section 10, with what building this added:

1. **What would Readymag actually need?** Still unknown. A named flow would replace the canvas example.
2. **Is a whole-behavior extension point enough?** The examples never wanted an axis or plugin. They aren't sortables, so that says little.
3. **Is the `requestApply` rule tolerable?** Yours to judge by writing one. See the authoring section for what it cost me.
4. **Does `DragFault` read well in the console and your logs?** Unobserved in DevTools. The Faults page is set up for it.
5. **Does a destroy with no `end` suit custom behaviors?** It cost the canvas example a flag.

**Three more that this unit raised:**

6. **Should the lift be an imported value,** so that a `lift: false` behavior stops paying for it?
7. **Do you approve about 450 µs per press at 2,000 items** for pulling at admission?
8. **Should the library restore focus after a keyboard reorder,** and should a landing item keep elevation?

## Stopping boundary

The prototype is finalized and pushed on `drag/prototype`. **Next action: the owner tries it.** The architect then revises the recommendation, and no production work starts before that.