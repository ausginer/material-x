# What drag2 holds that drag lacks

**Status: architect's assessment, 2026-11-15.** It is the comparison behind `drag:DRD-64` and `drag:DRO-17`. **Input:** `0870abd75` on `drag2/removal`, which is `main` after #19. drag2 is read there from now on.

**Question.** The owner retires `@ydinjs/drag2` and keeps its stories. Is everything else worth keeping already in `@ydinjs/drag`? Can the package be deleted safely?

**Answer.** Yes, once three things carry over: the stories, the record resolver, and two accessibility conclusions. drag has every capability of drag2's except the ones decisions dropped. drag2's suite asserts 18 guarantees that drag implements and no drag test asserts. They become drag tests (`DRF-45`). Deleting the package doesn't block that work, because its tests stay readable at `0870abd75`.

## 1. Capabilities

drag was designed against drag2. The [architecture plan](architecture-plan.md) §5 chose each capability explicitly, and `DRD-2` decided the extension model.

| drag2 | drag | Basis |
| --- | --- | --- |
| Pointer, touch and pen input, threshold, `handle`, `visual`, capture | Same | DRI-11, DRI-19 |
| `data-drag-ignore` opt-out | Same | `Admission.handle` |
| One-press-per-move keyboard, IME composition declined | Same | `src/sortable/behavior.ts:135`, DRI-14 |
| `y()` and `xy()`, the geometry cache, `layoutAnimation`, `landing()` | Same, rebuilt (`RectIndex`, `DRD-52` to `DRD-62`) | DRI-14, DRI-17 |
| Live placeholder with a custom factory | Same | `PlaceholderFactory` |
| Free drag: verdict, `home`, `axis`, `bounds`, `onMove`, `moveTo` | Same, plus drop targets | DRI-20, DRI-21 |
| Faithful top-layer lift, correct under transforms, zoom, shadow DOM and iframes | Same, through `box-quad` | DRI-16 |
| **`LIFT_FLAT` and `LIFT_IN_PLACE`** | None | Dropped until a use case is named (plan §5). Outside its own tests, one story used them |
| **Fragments, merge tiers, `drag.js`, `feature.js`, plugins** | Closed capability slots | Dropped (plan §5), then `DRD-33` |
| **`onError`, `DraggableError`, `DraggableWarning`, `FAILURE_*`, stage and phase constants** | One `DragFault` through `reportError` | Owner's requirement (plan §2), `DRD-3` |
| **Public `kernel.js` SPI** | Public `draggable()` with behaviors | `DRD-2` |
| `invalidate()` required after each commit | `items()` pulled at each press | DRI-14 |

**No capability is missing without a decision.** The one divergence the sweep found is in behavior and not in capability: `moveTo` reads its point when the move applies. It is accepted as `DRF-44`.

## 2. Stories

drag2 has seven stories, drag has three, and two of drag's are drag2's List and Grid with less markup.

| drag2 | drag now | After `DRD-64` |
| --- | --- | --- |
| Sortable: List, Grid, CustomPlaceholder, ZoomedContext | List, Grid | All four |
| Free drag: Interactive, AsyncDropConfirmation, TransformedStage | Bounded | All three, with Interactive replacing Bounded |
| none | Custom Behavior: ResizeHandle | Kept |

Each story ports to drag's API. The exception is TransformedStage's lift-mode control, which has no drag counterpart (§1). Each story has to change in two ways. A sortable story commits in `onReorder` and calls no `invalidate()`. A free-drag story commits an accepted drop in `onEnd`, because drag's lift owns `translate` until release, so a story that only accepts would send the box home. drag2's comments describe drag2's protocol, so the stories are rewritten and not copied ([handoff](drag2-retirement-handoff.md) item 1). drag2 had a test for its stories (`tests/sortable/stories.browser.test.ts`), and drag's have none. The port adds one.

## 3. Tests

drag2 has about 1,480 test declarations in 78 files, and drag has about 360 in 34. A count says little, because drag2 tests mechanisms that drag doesn't have. The comparison is by guarantee.

- **The two core files**, `kernel.browser` with 242 tests and `sortable.browser` with 128, were classified row by row before drag was built: 195 keep, 97 revise and 78 drop ([`test-classification.tsv`](probes/architecture-plan/test-classification.tsv)). drag's suite was built from the keep and revise rows ([`implementation-handoff.md`](implementation-handoff.md)).
- **The other 76 files** were swept on 2026-11-15 by two discovery passes, one for sortable and one for free drag, the kernel and packaging. Each pass grouped a file's titles into guarantees and searched every drag test for each one. The architect confirmed each reported gap in drag's tests and source, and spot-checked two of the "covered" verdicts. One reported gap was false: a platform `pointercancel` during a touch drag is tested at `tests/click-guard.browser.test.ts:298`. One claim of the architect's own was wrong too: drag does decline an IME composition, at `src/sortable/behavior.ts:135`.

| Outcome | drag2 files |
| --- | --- |
| **Dropped by design:** the mechanism or the surface it tests isn't drag's | `sortable/` activation-barrier, assemble, calling-convention, domain.node, feature.declaration, frames.node, options.node, placement, rect-index.declaration; `free-drag/` feature.declaration, frames.node, validation (apart from F4); every `kernel/` file but presentation and realm; composition.declaration, drag.declaration, diagnostic-intake |
| **Covered by drag tests** | `sortable/` insertion, landing-space, lift-geometry, xy, and stories, which drag's new stories test replaces; `free-drag/` actions, and anchor apart from `DRF-44`; `kernel/` presentation, realm; exports.node, packaging.node |
| **Asserts a guarantee no drag test asserts:** 18 rows in [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) | `free-drag/` free-drag, lifecycle, geometry, activation-snapshot, domain.node; consumer.node; `sortable/` commit-window, react, g3-conformance, input-policy, keyboard, features, displacement, composition, y |
| **drag2's own record, measurement and probe tooling** | decisions, references, entry, docs, coverage, `sortable/zero-read`, whose per-sample reads drag's hot-path census covers (DRI-17), `perf/`, `bench/`, `probes/`, `revision/` |

**The 18 rows,** grouped: free drag's `moveTo` continuation, release coordinates, rejection reason, function `bounds` sources, the drop delta under transforms and zoom, a pending `pointercancel`, and the landing's origin under an axis lock or a clamp. Consumer declarations resolving after the build. The sortable landing when a commit leaves the placeholder at another index, or moves the item to another container. `y()` conformance under margins, gaps and transformed rows. `data-drag-ignore` on a handle and through a shadow boundary. `ArrowLeft` and `ArrowRight`, the keys that aren't prevented, `handle` on the keyboard path, and IME composition. Commands refused during an operation. `layoutAnimation`'s choice of rows and its additive composition. Measurement through `box`. A throwing placeholder factory. Authored CSS transitions.

Each row is drag's own guarantee: a DRI entry, a published type, or a JSDoc promise, and drag's code implements it. So these are gaps in drag's suite, and drag2 isn't needed to close them.

**Not owed:** drag2's option defaults, construction-time option reads, and its tables of nested controls and press modifiers. No DRI entry states them, and drag's input tests already cover the policy behind them (DRI-11, DRI-19).

**Limits.** The sweep reads titles, and bodies only where a title was ambiguous, and it shares its author's blind spots. A "covered" verdict was spot-checked, not verified one by one. A guarantee found missing later costs a port from `0870abd75` and nothing more.

## 4. Documents and tooling

| drag2 | Disposition |
| --- | --- |
| `README.md`: Demos, Migrating, Geometry, Export topology, Size budgets | Nothing carried over. The demos become drag's stories. The legacy package is gone. Geometry and topology describe lift modes and fragments. drag's README and size gate are its own |
| `.agents/docs/accessibility.md` §Drag (drag2 sortable) | Two conclusions move to drag's section: no multi-press mode, on its two grounds, which drag's section now cites as "`drag2:Q-13` below", an address that resolves nowhere; and a `handle` removing keyboard reordering unless the handle is focusable. The rest is in drag's section already |
| `.scripts/entry.{sh,ts}`, which resolves `repo:` and `drag:` too | Moves to the root `.scripts/`, and resolves `drag2:` at `0870abd75` (`repo:RD-5`) |
| `decision-status.ts`, `corpus-equivalence.ts`, and the record tests | Withdrawn with the record they check (`repo:RD-5`) |
| `bench/size` with baseline A and `noncomposed`, `bench/m2pp`, `bench/profile`, `tests/perf` | Nothing carried over. drag has its own size gate (`DRD-55`), its comparison and trace instrument (`DRD-40`, `DRD-46`), and its hot-path census (DRI-17) |
| `bench/lab-drag2.ts` in drag | Withdrawn with the drag2 arm (`DRD-64` property 4). It hasn't bundled since `7d8d7a805`, and neither has the prototype arm (`DRF-43`) |
| `packages/drag2/.plan/`, 417 files, 23 MB | Deleted, and read at `0870abd75`, as the legacy package's record was ([`rebuild-clean-slate.md`](rebuild-clean-slate.md)) |

## 5. How citations survive

- **Dated records** under `packages/*/.plan/` and `.plan/` keep their drag2 paths unchanged, and each one resolves at `0870abd75`. `DRD-23`'s third bullet already says this for the legacy package, and `DRD-64` property 2 extends it to drag2. `main` holds the commit, so it stays reachable without a branch.
- **`drag2:` addresses** resolve through the moved resolver at `0870abd75`. Outside drag2, 13 files cite 16 of them.
- **Current-state documents** keep no link into the deleted tree. They cite an entry by its address and a file by its path at the commit ([handoff](drag2-retirement-handoff.md) item 2).
- **The bare `D-`, `F-`, `Q-` and `I-` series stay closed** to every other scope (`repo:RD-1`, `repo:RD-5`).

## 6. What else depends on drag2

Every site outside drag2 that names it, apart from the records, is listed in [the retirement handoff](drag2-retirement-handoff.md):

- item 2: `CONTRIBUTING.md` and eight files under `.agents/docs/`;
- item 4: drag's `Justfile`, `bench/compare.ts`, `bench/lab-drag2.ts` and `bench/size/measure.ts`;
- item 5: the root `Justfile`, `vitest.config.ts`, `.scripts/vitest-config.ts`, `.scripts/vite-config.ts`, `.scripts/call-graph.ts`, `.gitignore` and `package-lock.json`.

drag's typecheck is red at `0870abd75` with exactly two errors: `TS2724` for `box` and `space`, in `../drag2/src/kernel/presentation.ts`, reached only through `bench/lab-drag2.ts`. Item 4 clears them.