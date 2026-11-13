# The three-unit layout: a kernel chunk, a sortable chunk and a freeDrag chunk

**Closed on 2026-11-13.** The owner stopped the exploration and deferred property mangling (`DRD-60`), and `DRO-16` is withdrawn. This record and its probes are kept as evidence.

The architect's exploration of the owner's intended layout for the publication, on 2026-11-13. **Nothing is adopted.** `DRD-59` stays the decision in force, and `DRO-16` holds what the owner decides.

**Base:** `packages/drag` at `cc9818a96` on `drag/mangle-remediation`, with `tsdown` 0.23.7, `rolldown` 1.3.2, `rolldown-plugin-dts` 0.30.2 and `typescript` 6.0.2. The browser tests ran in the repository's Chrome. The probes ran in a scratch tree outside the checkout, which was removed afterwards. The candidate code and the probes are in [`probes/unit-layout/`](probes/unit-layout/README.md), and every figure below is in the [readings](measurements/2026-11-13-unit-layout-readings.txt).

**The request:**

- each unit is built as a separate single-chunk build with native mangling, and the kernel is external to the feature builds;
- the existing public imports and custom `Behavior` support are preserved;
- public boundary members keep their names, and a mangled property stays within the chunk that owns it;
- the current accesses that break that boundary are identified;
- tree-shaking is checked through the existing size rows, and the source maps and annotations are checked.

## Outcome

- **The layout builds with native options only for the JavaScript.** Each unit is one Rolldown input and one chunk, with `minify.mangleProps` and no `cache`. Rolldown accepts it. No rename pass, map build, kept-name check or annotation guard is needed (§1, §7).
- **One family of accesses breaks the boundary:** `FrameTask._schedule` and `FrameTask._cancel`, declared in `src/shared/invalidation.ts`, are called from `sortable` (3 accesses) and from `freeDrag` (3 accesses). Each unit renames them differently, and 114 of 326 consumer tests fail. No other marker name crosses a unit, and every unprefixed member that crosses is declared in a published `.d.ts` (§2).
- **Removing the crossing** by placing `shared/invalidation.ts` in each feature unit needs no source change. The kernel chunk then exports only public names, and 324 of 326 consumer tests pass (§2.2).
- **Tree-shaking holds for each row's source modules.** Through the emitted maps, every row keeps the same `src` modules as the current build. The one exception is `box-quad`'s index module in "draggable alone", whose top-level destructuring the kernel chunk's `box-quad` import keeps. Per row, Brotli is −25 to +32 B against `DRD-59`'s build, and no ceiling verdict changes. The gate's own graph checks can't see inside a chunk (§3).
- **The source maps and the annotations are better than `DRD-59`'s:** every renamed property maps to its source name, shorthand keys included, and every annotation that `src` writes survives the build (§4, §5).
- **The costs that no row measures:**
  - a consumer without a bundler loads a whole unit, for example 10,496 B for `fault.js` against 229 B now;
  - a module's legal comments reach every bundle that uses its chunk;
  - an app that uses both features holds two copies of `shared/invalidation.ts`, 178 B Brotli (§8).
- **Found on the way, in both builds:** two consumer tests count heap instances by class name, and minification renames the classes. `DRD-59`'s candidate fails them too. That is `DRF-38` (§9).

## 1. The layout as built

[`units.config.ts.txt`](probes/unit-layout/units.config.ts.txt) is the candidate. It is four `tsdown` configurations in one run.

| Unit | Source modules | Chunk | Imports |
| --- | --- | --- | --- |
| kernel | `draggable`, `fault`, `lift`, `lift/*`, `kernel/*`, `shared/*` | `chunks/kernel.js`, 10,448 B | `@ydinjs/box-quad` |
| sortable | `sortable`, `sortable/*` | `chunks/sortable.js`, 10,259 B | `./kernel.js`, `@ydinjs/box-quad` |
| free-drag | `free-drag`, `free-drag/*` | `chunks/free-drag.js`, 4,325 B | `./kernel.js`, `@ydinjs/box-quad` |

- **Each unit's input** re-exports what its chunk exports: the public names that its modules declare, and the names that another unit imports from it. [`layout.ts.txt`](probes/unit-layout/layout.ts.txt) reads both from `src` with the type checker and writes the three inputs ([kernel](probes/unit-layout/input-kernel.ts.txt), [sortable](probes/unit-layout/input-sortable.ts.txt), [free-drag](probes/unit-layout/input-free-drag.ts.txt)).
- **Mangling** is `minify: { mangleProps: { include: /^_[A-Za-z]/, quoted: true } }` in each unit, with no `cache`. Rolldown's single-chunk limit (`DRD-59`'s L1) doesn't apply, because each build gives one chunk. Each chunk has its own names: 18, 29 and 14, where the single map has 53. No marker name is left in any chunk.
- **The feature units** resolve every import that reaches a kernel module to the external `./kernel.js`. Each emitted feature chunk imports `Lifter`, `draggable`, `createFrameTask` and `listenForInvalidation` from it.
- **Each public entry is a facade** at its current path, such as `export { draggable } from './chunks/kernel.js';`. A facade names the chunk that declares each export, so `sortable/landing.js` re-exports `landing` from the kernel chunk, not from the sortable chunk. `package.json`'s exports map is unchanged, and `files` would add `chunks`.
- **The declarations** come from the current unbundled configuration with `dts: { sourcemap: false }`, whose JavaScript a plugin removes from the bundle. Its 27 `.d.ts` files are byte-identical to `DRD-59`'s, with no reference. That is a second configuration: a unit's build would bundle its declarations as it bundles its JavaScript, so the per-module `.d.ts` files need a build of their own. `DRD-59`'s one configuration writes them beside the JavaScript.

## 2. The boundary audit

[`audit.ts.txt`](probes/unit-layout/audit.ts.txt) visits every marker name in property position in `src` and `tests/fixtures`: accesses, string keys, object keys, class and type members, and destructuring. The type checker binds each one to its declarations. An occurrence whose declarations are in another unit is a crossing. A class member is also checked against the same member in the types that it extends or implements. The audit then lists the marker names that occur in more than one unit, and the object types whose marker properties are declared in more than one unit. [`boundary.ts.txt`](probes/unit-layout/boundary.ts.txt) lists every value import and every member access that crosses a unit, for any name.

`tests/fixtures` holds the three custom behaviors of the size rows, written as a consumer writes them. The audit treats them as a fourth unit.

### 2.1 What it found

**Six crossings, all of one interface:**

| Unit | Access | Declared in |
| --- | --- | --- |
| free-drag | `frame._cancel()`, `src/free-drag/drop-targets.ts:113` | `FrameTask`, `src/shared/invalidation.ts:17` |
| free-drag | `frame._schedule()`, `src/free-drag/drop-targets.ts:123` | `FrameTask`, `src/shared/invalidation.ts:16` |
| free-drag | `frame._cancel()`, `src/free-drag/drop-targets.ts:126` | `FrameTask`, `src/shared/invalidation.ts:17` |
| sortable | `this.#frame._schedule()`, `src/sortable/operation.ts:100` | `FrameTask`, `src/shared/invalidation.ts:16` |
| sortable | `this.#frame._cancel()`, `src/sortable/operation.ts:106` | `FrameTask`, `src/shared/invalidation.ts:17` |
| sortable | `frame._cancel()`, `src/sortable/behavior.ts:205` | `FrameTask`, `src/shared/invalidation.ts:17` |

`createFrameTask` builds the object in the kernel chunk, as `{ _(){…}, g(){…} }`. The sortable chunk calls `.A()` and `.C()`, and the free-drag chunk calls `.p()` and `.d()`. **In the consumer project, 114 of 326 tests fail**, every one with a `DragFault` whose message is one of these four calls, `is not a function`.

**Nothing else crosses:**

- **Marker names in more than one unit** are `_axis`, `_config` and `_landing`, besides the two above. Each binds to its own unit's declarations, on its own unit's objects. `lift.ts`'s `_landing` is a key of the lift's private record, and each feature's `_landing` is its behavior's field.
- **No object type carries marker properties declared in more than one unit,** so two units' output names can't meet on one object.
- **The kernel accesses no member that a feature declares.** It calls the `Behavior` and `BehaviorOperation` members that `kernel/behavior.ts` declares, and none is a marker name.
- **The public boundary keeps its names.** Every other member that a feature accesses on a kernel object is unprefixed: `Lift`'s `acquire`, `land`, `translate` and the rest, `Drag`'s and `DraggableController`'s members, and the outcome fields. Each is declared in a published `.d.ts`: `lift.d.ts`, `kernel/drag.d.ts`, `kernel/gesture.d.ts` or `kernel/outcome.d.ts`.
- **The custom behaviors** in `tests/fixtures` access no marker name. They import `draggable`, `Lifter` and `landing`, and use only members that the published declarations declare.

**Inferred, not tested:** a feature's output names avoid every property name in its own chunk, and the kernel reads only published members from a feature's objects, which the feature's chunk also names. So a feature's mangled name can't shadow a member that the kernel reads. The consumer project's result in §2.2 agrees.

### 2.2 Two ways to remove the crossing

|  | `shared/invalidation.ts` in each feature unit | `FrameTask`'s members unprefixed |
| --- | --- | --- |
| Change | the layout only: the module belongs to no unit, and each feature chunk bundles it | `_schedule` and `_cancel` become `schedule` and `cancel` in four files, and `DRD-56`'s selection loses two declarations |
| Audit | the six accesses bind to each feature's own copy | no crossing |
| Kernel chunk exports | the public names only | the public names, `createFrameTask` and `listenForInvalidation` |
| Consumer project | 324 of 326 pass, and the two are `DRF-38` | 324 of 326 pass, and the two are `DRF-38` |
| Rows, Brotli against `DRD-59` | the same as the crossing build, apart from "sortable + y" +23, "sortable + xy" +2 and "complete" −24 | the same, apart from "sortable + y" +6, "sortable + xy" +11 and "complete" −16 |
| Minified bytes on the rows | equal to the crossing build | +29 B on the three `sortable` rows |
| Not on any row | an app with both features holds two copies: 326 B minified, 178 B Brotli | none |

The per-feature variant and the crossing build have the same minified bytes on every row, and their Brotli figures differ by up to 20 B, on "sortable + y". A Brotli difference of that size between these builds says nothing about either variant.

**Recommendation: `shared/invalidation.ts` in each feature unit.** It changes no source and no selection. It also makes the boundary exactly the public API. The kernel chunk exports only what the public entries export, and each feature imports from it only `draggable` and `Lifter`, as a custom behavior does. A check of the boundary is then one statement: a feature unit imports only names that a public entry exports, and accesses on kernel objects only members that published declarations declare. The second copy costs an app that uses both features 178 B Brotli. `shared/invalidation.ts` has no module state, so a second copy changes no identity.

### 2.3 What keeps the boundary

A crossing breaks the publication at runtime, and nothing in the build sees it. The consumer project saw this one, through 114 failures. A future crossing in a path that no consumer test drives would pass. If the layout is adopted, the boundary rule needs a check of its own. The audit is that check's shape: the type checker over `src`, in the node project or in the build, failing on any crossing.

## 3. Tree-shaking through the size rows

`bench/size/measure.ts` bundled each row from three builds. Every figure is Brotli-11, with the minified bytes in the [readings](measurements/2026-11-13-unit-layout-readings.txt).

| Row | Ceiling | Current | `DRD-59` | Units | Units − `DRD-59` |
| --- | --- | --- | --- | --- | --- |
| draggable alone | 2139 | 2154 | 2158 | 2190 | +32 |
| draggable + lift | 4169 | 3915 | 3921 | 3938 | +17 |
| example: resize handle | 3313 | 3269 | 3272 | 3262 | −10 |
| example: drop zone | 4431 | 4549 | 4550 | 4567 | +17 |
| example: canvas group | 3314 | 3265 | 3283 | 3258 | −25 |
| freeDrag | 4967 | 4932 | 4935 | 4947 | +12 |
| freeDrag + bounds + landing | 5210 | 5362 | 5366 | 5387 | +21 |
| sortable + y | 6733 | 6521 | 6515 | 6518 | +3 |
| sortable + xy | 6617 | 6403 | 6393 | 6399 | +6 |
| complete | 7065 | 7154 | 7164 | 7145 | −19 |

"Units" is the layout as built, with the crossing. The crossing changes no row's bytes, and §2.2 gives the two repaired variants. **The same four rows are over their ceilings in every build,** so no verdict changes. The minified bytes are equal to `DRD-59`'s on four rows and within 6 B on five. On "draggable alone" they are 57 B more.

**Which source modules each row keeps.** [`rows.ts.txt`](probes/unit-layout/rows.ts.txt) bundles each row as `measure.ts` does, and loads each emitted module's own map. The row's map then leads to the `src` modules whose code the bundle keeps. Its Brotli figures equal `measure.ts`'s.

- **Every row keeps the same `src` modules as the current build,** apart from `box-quad`'s index in "draggable alone". "sortable + xy" keeps no `linear-shift` or `y`, "freeDrag" keeps no `bounds` or `drop-targets`, and "draggable alone" keeps no `lift`, `landing` or `invalidation`. Merging a unit's modules into one chunk doesn't keep code that the row doesn't use.
- **`box-quad` in "draggable alone":** the kernel chunk imports `box-quad` for `lift` and `landing`, so a bundle of `draggable` alone loads `box-quad`'s index. Its top-level `const { parseFloat, isFinite } = Number` and `const { abs, min } = Math` are destructuring, which the bundler keeps as possible side effects. That is the 57 B. Now, `draggable.js` doesn't reach `box-quad` at all.
- **With `"sideEffects": false` in `packages/box-quad/package.json`,** tried in the scratch tree only, "draggable alone" drops `box-quad` and reads 6,487 B minified and 2,148 B Brotli: −10 B against `DRD-59`. That is a `box-quad` change, and the owner's.

**The gate's graph checks don't hold under the layout.** `measure.ts` checks `absent` and `present` against the emitted files in a row's graph. A unit's modules are one file, so six `present` checks fail ("must contain lift", "shared/landing", "linear-shift") and every `absent` check that names a module inside a chunk passes without testing anything. `rows.ts` shows that the maps restore the checks' meaning: with the fragments applied to `src` modules, only the `box-quad` line fails. Adopting the layout makes that an instrument change under `DRD-23` and `DRD-55`.

## 4. Source maps

[`mapcheck.ts.txt`](probes/unit-layout/mapcheck.ts.txt) is the publication-build probe, run on one chunk at a time with that unit's names.

- **Each chunk has a `.js.map` and a `sourceMappingURL` that names it.** The facades have neither: a single re-export has no mappings, as `DRD-59` property 4 allows.
- **`sourcesContent` equals `src`** for 30 of 30 sources: 11 in the kernel's map, 12 in sortable's and 7 in free-drag's. The generated unit inputs contribute no source.
- **Every renamed property maps to its source name, and its mapping carries the name:** 189 accesses, and every renamed key, field and method. That includes the keys written as shorthand, which lead to their values under `DRD-59`'s rename pass. Every mangled identifier and private name carries its source name.

## 5. Annotations and legal comments

- **The chunks' own annotations:** 9 in the minified chunks and 5 in the same build without minification. No chunk has fewer after minification. The current build has 8, and `DRD-59`'s has 9.
- **Annotations written in `src` survive.** In the scratch tree, `src/fault.ts`, `src/sortable/y.ts` and `src/free-drag/bounds.ts` each gained two `@__PURE__`/`#__PURE__` calls, a `@__NO_SIDE_EFFECTS__` function and three legal comments. Each chunk kept all six comments, and the `@__NO_SIDE_EFFECTS__` stayed on its function. Under `DRD-59`'s build, the same three modules kept the legal comments and lost every annotation, which is `DRD-59`'s A3 and the reason for its property 3d.
- **Consumers use them.** In the "draggable alone" and "freeDrag" bundles, no annotated call and no probe export is left. The rows grew by the legal comments only.
- **So property 3d isn't needed under the layout:** native minification is the only pass, and it keeps annotations.

## 6. Public imports and custom behaviors

- **Every public import path exists,** through the facades, and each of the 13 entries exports the same runtime names as `DRD-59`'s module, imported in Node. `package.json`'s exports map is unchanged.
- **One kernel instance:** both feature chunks import the one kernel chunk, so `DragFault` and the kernel's module state have one identity, as `DRD-59`'s rationale requires.
- **The consumer project,** 326 public browser tests in Chromium through the exports map, passes 324 with either repair in §2.2. The two failures are `DRF-38`, and `DRD-59`'s build fails the same two.
- **Custom behaviors:** the three fixtures build through the facades, their rows keep the same modules as now, and §2.1 finds no access from them to an internal name.
- **Not run:** Firefox and WebKit, the node project, whose publication test reads `DRD-56`'s per-module files, and the declaration project.

## 7. Against `DRD-59`

|  | `DRD-59` as amended | The layout |
| --- | --- | --- |
| Mangling | Oxc's `mangleProps` in a `renderChunk` plugin, through a map from a separate single-chunk build | native `minify.mangleProps`, one build per unit |
| Kept-name check (3c) | needed: a pinned name isn't protected from a kept name | not needed: no `cache` |
| Annotation guard (3d) | needed: the rename pass deletes annotations | not needed |
| Source map names | 3 shorthand keys lead to their values | every renamed property leads to its name |
| Custom build code | the plugin, the map build, two checks | unit inputs, the facades, the kernel's externalization, and a declaration configuration whose JavaScript is removed |
| Configurations | one | four |
| New invariant | none | the boundary rule, with a check of its own (§2.3) |
| Size gate | unchanged | its graph checks read the maps (§3) |
| Rows, Brotli | as measured | −25 to +32 B, or −25 to +21 B with `box-quad`'s `sideEffects` |
| Loading without a bundler | per module | per unit (§8) |

## 8. Costs that no row measures

- **A consumer without a bundler loads a whole unit.** Through relative imports, excluding `box-quad`:

  | Entry          | `DRD-59`             | Units               |
  | -------------- | -------------------- | ------------------- |
  | `draggable`    | 7,305 B in 7 files   | 10,496 B in 2 files |
  | `fault`        | 229 B in 1 file      | 10,496 B in 2 files |
  | `lift/landing` | 948 B in 3 files     | 10,495 B in 2 files |
  | `sortable`     | 17,674 B in 16 files | 20,775 B in 3 files |
  | `free-drag`    | 14,651 B in 14 files | 14,843 B in 3 files |

  `sortable/y` and `sortable/xy` each load all three sortable axes, and `free-drag/bounds` loads `freeDrag`. A bundler removes what isn't used (§3), so the rows don't show this.

- **Legal comments go with the chunk.** A bundle that uses any module of a chunk keeps every legal comment of that chunk: "freeDrag" kept `bounds`' comments without its code. `src` has none today.
- **Two copies of `shared/invalidation.ts`** in an app that uses both features, with §2.2's recommendation.
- **The published modules no longer mirror `src`.** Stack traces and debugging go through the maps, which §4 found complete.

## 9. `DRF-38`, in both builds

The consumer project runs `tests/classes.browser.test.ts:190` and `tests/destruction.browser.test.ts:381` against the build. Both count heap objects by constructor name, `FreeDragBehavior` and `SortableBehavior`. Minification renames each class, as `var r=class` in `DRD-59`'s `free-drag/behavior.js`, and each test reads +0 where it expects +1. [`publication-build-proposal.md`](publication-build-proposal.md) §3 says that no test depends on class names. `DRD-59`'s handoff returns on any failing consumer test, so its unit would stop there. The finding is in the [record](00-index.md#drf-38--two-consumer-tests-count-heap-instances-by-class-name-which-the-minified-build-renames).

## 10. What the owner decides

`DRO-16` carries the question:

1. **The layout or `DRD-59`.** The layout removes the rename pass, the map build and both of `DRD-59`'s guards, and gives better maps and native annotations. It adds a boundary rule and its check, four configurations, the gate's map-based graph checks, and per-unit loading without a bundler.
2. **With the layout, where `shared/invalidation.ts` goes** (§2.2). Recommended: in each feature unit.
3. **`box-quad`'s `sideEffects`**, which decides the +32 B on "draggable alone" under the layout (§3).

**Recommendation: the layout,** with `shared/invalidation.ts` in each feature unit, if the owner accepts per-unit loading for consumers without a bundler. It meets the owner's "native first" requirement for the mangling itself, where `DRD-59` needs a custom pass and two guards for it. Its costs are the boundary check and the gate change, which are bounded and testable, and the loading in §8, which only the owner can weigh. `DRF-38` is resolved first in either case.

## 11. Limits

- **Observed** in Chromium only. Firefox and WebKit weren't run.
- **Size figures are single readings** of a deterministic build. Two builds with equal minified bytes differ by up to 20 B Brotli (§2.2), which bounds what a small difference here means.
- **Assumed:** that the unit inputs, the facades and the externalization can be generated from `files.json` and `src` in the build, as `layout.ts` does here, without a committed list.
- **Not designed:** the boundary check, the gate's map-based graph checks, the publication test's form for chunks, and the `files` change. Each is named, not specified.