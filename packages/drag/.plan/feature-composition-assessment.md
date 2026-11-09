# Extension by capability: the lift, `freeDrag` and their slots

**Status, 2026-11-09: the extension model is accepted. The revised prototype awaits the owner's evaluation.**

- **Accepted by the owner on 2026-11-09:** closed, named capability slots are v1's extension model. A whole new behavior remains the fallback when the existing slots are insufficient.
- **Not accepted:** the other API choices (§9) and every cost (§8).
- **No `D-*` entry is minted or amended yet.** §5's amendment of `DRD-2` adopts the properties C1 to C10, and this revision changes C2, C3 and C4 (§3.1). The architect records the amendment once the owner has evaluated them.

**Revision, 2026-11-09.** The owner found two defects in the first prototype, recorded at `82b045f8a`:

- `dropTargets` kept one operation's state in the controller's runtime, behind nullable fields and non-null assertions;
- it called `options.targets()` before it registered its cleanup.

§3.3 describes the revised capability, §7 and §8 its evidence and costs. The prototype in [`probes/feature-composition/`](probes/feature-composition/README.md) is the revision, and the first version's diff stays at `82b045f8a`. The revision also found a defect in `bounds` at the base (§10).

**Read at:** `688613863` on `drag/production`, in a worktree on the new branch `drag/feature-composition`. The revision was built on `82b045f8a`, the first version's record, against the same base. The main checkout was not touched.

**The owner's requirement:** extend existing behaviors with capabilities imported on their own, instead of replacing the whole behavior. Two scenarios demonstrate it:

- a lift without its landing animation;
- drag and drop added to `freeDrag`, with nothing charged to a composition that omits it.

The owner also asked for:

- a revision of `DRD-2`'s restriction;
- one configuration reused across controllers;
- the single-pass execution, the separation of requests from their effects, and resource ownership, all kept;
- CONTRIBUTING's new class-encapsulation rule, with `RectIndex` assessed as an existing counterexample;
- the owner's closure-based `layoutAnimation` kept as it is;
- no runtime readonly enforcement.

**Method:**

- **Reading** of drag at the base, and of drag2's composition model as reference: `src/shared/composition.ts`, `src/free-drag/{feature,assemble,config}.ts` and `src/sortable/{feature,assemble,config}.ts`.
- **A prototype** in the worktree's source, run and then reverted. Its diff, a separate `RectIndex` diff, the composition probe and raw results are in [`probes/feature-composition/`](probes/feature-composition/README.md). Production source on the branch is unchanged.
- **Runs:** a composition probe that reports bytes and which capability code each bundle carries, the size instrument, typecheck, lint, format, the suite in Chromium and Firefox, and mutations: four in the first version and seven in the revision. **WebKit did not launch in this environment**, so no WebKit result is claimed. **No timing.**

**[E]** marks a claim established by a run recorded in the probe. **[R]** marks a claim established by reading.

**Governing records:**

- **Decisions:**
  - `DRD-1`: single-pass control;
  - `DRD-2`: one public authoring API;
  - `DRD-4`: the lift is an imported value;
  - `DRD-20`: the built-ins' classes and their binding rules;
  - `DRD-25`: each controller-lifetime resource is installed once, in the factory that registers its disposal;
  - `DRD-27`: the kernel knows no lift;
  - `DRD-29`: the lift's surface and `land`;
  - `DRD-30`: the operation `activate` returns;
  - `DRD-32`: input enters the gate with its handler, and requests through one named entry.
- **Contract entries:** `DRI-1`, `DRI-2`, `DRI-7`, `DRI-8`, `DRI-9`, `DRI-13`, `DRI-17` and `DRI-18`.
- **CONTRIBUTING:**
  - §2.2: no framework to remove duplication;
  - §7: optional features pay for themselves;
  - §10: a class needs semantics;
  - Part I, class encapsulation.

**How "request/effect separation" is read here.** A request only fills a slot, and the reader applies its effect in a step of a pass (`DRD-1`, `DRD-6`, `DRD-32`, DRI-1, DRI-8). Code that the library didn't call writes operation state only through `requestStep`.

## The answer

- **Neither scenario works through drag's extension points today, and neither works through drag2's [R] [E].** §1 shows why.
- **Recommended: extension by capability slots** (§3).
  - A host declares a closed set of named, typed slots. A host is a built-in behavior, or the lift.
  - A capability is a value imported on its own that fills one slot. A third party may write one.
  - The host calls the slot directly from its own hooks and steps, so a capability runs only inside a pass.
  - A slot value holds no controller or operation state, so one configuration serves every controller.
  - The kernel doesn't change.

  This keeps drag2's closed-slot rule. It drops drag2's assembly machinery, its fragment merge and its `plugins` list. It adds what drag's operation model makes possible: a capability takes part in one operation, and the operation's release disposes what it acquired.

- **The two scenarios, in the prototype [E]:**
  - **The lift without animation.** The landing animation moves out of `lift.ts` into the `landing()` capability, which `land` now takes as an argument.
    - `draggable + lift` loses 240 B Brotli, `freeDrag` 172 B and `sortable + y` 238 B.
    - None of them carries animation code any more.
  - **`freeDrag` with drag and drop.** `dropTargets()` fills a new `targets` slot.
    - `freeDrag` without it carries none of its code, and pays 45 B Brotli for the slot's call sites.
    - The capability itself is 261 B Brotli.
    - Its state for one operation is an object that operation holds, and its release is registered before it calls the consumer's `targets()`.
- **One configuration reused across controllers works** for a stateless capability (`landing()`), a per-controller installer (`bounds()`) and a per-operation factory (`dropTargets()`). A browser test witnesses it [E].
- **`RectIndex` breaks the encapsulation rule.** A compliant variant passes the sortable tests and costs 13 to 16 B Brotli (§6) [E].
- **Suites, revision [E]:**
  - Chromium: 353 of 356 pass with the prototype, and 343 of 347 at the base. Every failure is a size row: at the base, the control row and three over their ceilings; with the prototype, three, where the `freeDrag` row turns green.
  - Chromium and Firefox: 651 pass in two of three full runs, and 633 at the base. The other run failed one sortable landing test in Chromium, in code the revision doesn't touch, and eight isolated runs of it passed (§7).

## 1. What the existing extension points can do

### drag at `688613863` [R]

| Slot | Host | What it can do | Lift without animation | Drag and drop |
| --- | --- | --- | --- | --- |
| `landing: LandingTiming` | `freeDrag`, `sortable` and `lift.land` | Names a duration and easing at `land` | **No.** `startLandingAnimation` is in `lift.ts` and reached from `acquire`'s release disposer, so the animation is bundled with every `Lifter` | — |
| `bounds: BoundsInstaller` | `freeDrag` | Clamps the motion on each sample, and re-reads on invalidation | — | **No.** `apply(motion, originRect)` sees the motion and not the pointer. It runs per sample, and nothing reaches the drop or the request |
| `home`, `visual`, `handle` | `freeDrag` | Consumer callbacks with documented values | — | No |
| `axis`, `displacement`, `placeholder` | `sortable` | Insertion geometry and row animation | — | Not `freeDrag`'s |

**So drag and drop is a whole behavior today.** The `drop-zone` fixture is one: it re-implements admission, the lift, the motion, the verdict and the landing on `draggable`. It doesn't get `freeDrag`'s `home`, `axis`, `bounds`, `moveTo` or its results.

**[E]** At the base, every composition that imports `Lifter` carries the landing animation (`prefers-reduced-motion`): `draggable + lift`, `freeDrag`, `sortable + y` and `example: drop zone`. None of these composes a landing, except the drop-zone fixture through `land`'s default timing.

### drag2 [R]

| Mechanism | What it can do | Drag and drop |
| --- | --- | --- |
| `bounds: ConstraintInstaller`, `{ constrain: { apply, invalidate, retire } }` | Clamps the motion. `ConstraintView` has `realm`, `originRect` and `visual`, and no pointer | No |
| `landing: FreeDragLandingInstaller`, `{ landingTiming }` | Timing only. The kernel's `presentation` module ran the animation | — |
| `plugins: FreeDragPlugin[]`, `FreeDragPluginContribution = { retire? }` | **Only retirement.** A plugin is called once at construction and once at teardown. It is never called during an operation | **No** |

drag2's closed-slot rule says it directly: "a new semantic call into behavior code needs a coordinated edit to one contribution group, the slot record, the assembler and the behavior's call sites." Drag and drop is such a call. So in drag2 it needed a library edit as well.

## 2. What transfers from drag2

| drag2 mechanism | Here | Why |
| --- | --- | --- |
| A config key holds an installer, which runs once per controller and closes over its private runtime | **Transfers directly.** drag already does it for `bounds`, `axis` and `displacement` | This is what makes a config reusable: the value is a recipe, and the runtime is created per controller |
| Closed named slots, one writer per slot, set by the key that declares it. No discriminator, no registry, direct calls | **Transfers directly** | CONTRIBUTING §2.2. Static topology is known at construction |
| An installer is externally inert: it allocates and acquires nothing that needs release | **Transfers, as a stated rule.** drag follows it without stating it | It is why a factory that throws midway leaks nothing |
| One declaration of the landing type, shared by both behaviors | **Transfers.** `shared/landing.ts` now also holds the animation, and the lift shares it too | Identity, not structural coincidence |
| `retire` per contribution, `retireHooks`, and rollback in `assemble` | **Changes:** a controller-lifetime runtime is disposed through the controller's `use` (`DRD-25`), and an operation's resources through `drag.use`. No rollback | The kernel already orders disposal. Inert installers leave nothing to roll back |
| `assemble` flattens contributions into one slot record | **Changes:** the behavior's constructor keeps each runtime in a read-only field, as now | The class is the record |
| A branded `FeatureContext` per behavior, and `report` | **Doesn't transfer** | Each slot's installer has its own parameter, so nothing is ambiguous. A throw from a capability inside a hook is that hook's fault (DRI-7), and at construction the factory throws |
| Config fragments and `mergeFragments` | **Not recommended** | A merge walk costs every composition. Reuse needs no merge, because slot values hold no state. A consumer spreads objects (§4) |
| `plugins` | **Rejected** | It can't express either scenario. With hooks added it becomes the generic pipeline that CONTRIBUTING §2.2 warns against, charged to every composition at every hook |
| `Composed`, `Misplaced`, `UniqueSlot` | **Not needed** | They guard a list in which an installer could be misplaced, and there is no list |

**New here:** the operation part. drag2's slots were controller-scoped closures that received a frame view on each call. Here a capability also takes part in one operation:

- the host's `activate` calls the slot's factory with the operation's `Drag`, and the operation holds what it returns;
- the capability registers its release with `drag.use` before it calls consumer code.

That is `DRD-30`'s ownership, applied to a capability: the operation's state is the operation's object.

## 3. The recommendation: capability slots

### 3.1 Required properties

|  | Property |
| --- | --- |
| C1 | **Closed slots.** A host declares each slot by name and type. One value fills a slot. There is no list of extensions, no registry, no runtime discriminator and no merge. A new slot is a library decision |
| C2 | **A slot value holds no controller or operation state.** It is one of three things: a stateless value, such as `landing()`; an installer that the host calls once per controller, such as `bounds()`; or a factory that the host calls once per operation, such as `dropTargets()`. So one configuration serves any number of controllers |
| C3 | **Inert installation.** An installer allocates. It attaches no listener, writes no DOM and acquires nothing that needs release. A per-operation factory acquires only what that operation releases (C4) |
| C4 | **Ownership by lifetime.** A controller runtime holds no reference to an operation or its `Drag`, and reaches no operation state through a non-null assertion. A controller runtime that holds something is disposed through the controller's `use`, registered in the factory that installed it (`DRD-25`). A capability gets an operation's state in one of two ways: the host passes it as arguments, as `sortable`'s axis receives its query and context; or the operation holds an object that the capability created for it, as with `dropTargets`. A controller-lifetime cache of what one operation measured is allowed only when the host invalidates it at activation and retires it through the operation's `use`, as `sortable` does for its axis. That is how buffers are reused across operations. An operation's resources are released through that operation's `use`, and the release is registered before the capability calls consumer code. So a throw from that code faults the operation under DRI-7, and the operation's release frees what it holds |
| C5 | **Single pass.** A capability's code runs only when its host calls it from a hook or a step, or in a step it requested through the operation's `requestStep`. It never opens a pass, listens for input or calls the gate |
| C6 | **Requests and effects.** A capability's foreign callback, such as a frame, only requests a step, and its effect runs in that step (DRI-8). The one exception follows `bounds`: a scroll or resize listener sets a staleness flag directly (§9, choice 6) |
| C7 | **Tree-shaking.** The host names only the slot's type. A capability's code reaches a bundle only through the consumer's import. A composition that omits it pays only the host's call sites. Each new slot's call-site cost is measured and is the owner's to accept |
| C8 | **The hot path.** A capability reads no layout on a sample, and coalesces any spatial search to a frame (DRI-17). It allocates nothing per sample |
| C9 | **Types grant, and nothing enforces.** A capability receives the operation's `Drag` narrowed by type, such as `Pick<Drag, 'x' \| 'y' \| 'use' \| 'requestStep'>`. Nothing wraps or freezes it at runtime |
| C10 | **The kernel doesn't change.** `draggable alone` is byte-identical at 2138 B Brotli [E] |

### 3.2 The landing capability extends the lift

**At the base [R]:** `Lift.land(x, y, timing?)` records the landing, and the lift's release disposer calls the module-private `startLandingAnimation`. With no `timing` argument, the default duration and easing apply. So every `Lifter` brings the animation.

**In the prototype:**

- `landing(options)` returns a `Landing`, `{ timing, start }`.
  - `timing` is what `LandingTiming` was.
  - `start` is the former `startLandingAnimation`. It receives the visual, its `Space`, the offset from the landing position, the copied duration and easing, and the window, and returns the cancel.
- `land(x, y, landing)` takes the capability. It calls `landing.timing` once and copies the values, as `DRF-3` requires.
- The release disposer calls the recorded `landing.start`. The `Lifter` still holds the running landing's cancel.
- `lift.ts` loses the animation, the elevation constant and the default timing. A lifted behavior that never calls `land` carries no animation.
- `freeDrag` and `sortable` pass `config.landing` as before. A consumer writes `landing: landing()` as before.
- The landing entry for a custom behavior is `lift/landing.js` in the prototype, re-exporting the shared module, as `free-drag/landing.js` and `sortable/landing.js` do (§9, choice 2).

**Properties kept:**

- The landing still starts right after the release, from where the visual is then.
- The `Lifter` owns the running landing, and `cancelLanding` and the next `acquire` cancel it.
- Reduced motion still gives zero duration.
- The grab during a landing keeps the visual under the pointer, as `tests/activation.browser.test.ts` checks [E].

**Tests adapted [E].** Three `land` calls in `tests/landing.browser.test.ts` now pass a `Landing`: one named no timing, one passed a timing function, and one is DRI-13's "a custom behavior with no timing" case, which the change removes. The declaration test and the drop-zone fixture changed in the same way. No assertion changed.

**What a consumer sees:**

- `land`'s third argument is required, and it is a `Landing` and not a function.
- `land(x, y)` with no capability no longer animates.
- A custom timing function becomes `{ ...landing(), timing }`.
- `LandingTiming` is replaced by `Landing` in `lift.js`'s types.

### 3.3 The drop-target capability extends `freeDrag`

**`dropTargets({ targets })`** returns a factory. `freeDrag`'s `activate` calls it once per operation, with that operation's `Drag` and the window, after the lift. The `FreeDragOperation` holds the tracker it returns in a read-only private field, and nothing else holds it.

**The tracker's state is the operation's.** The factory's closure holds:

- the operation's `Drag` and the frame task, set once and never `null`;
- the pulled targets, their cached rects and the staleness flag. Each operation starts stale;
- the marked target.

When the operation ends, the tracker becomes unreachable with it. The controller holds no state of the capability, so no field is cleared at release, and nothing needs a non-null assertion [R].

**In order, the factory:**

1. allocates its state and creates the frame task. Neither acquires anything, because the task only requests a frame when it is scheduled;
2. registers its release with `drag.use`. The release cancels the frame and removes the mark;
3. pulls `options.targets()`. This is consumer code, and its release is already registered.

**The tracker:**

| Member | Called by | What it does |
| --- | --- | --- |
| `move()` | the operation's `move`, per sample | Schedules the frame. It reads no layout and allocates nothing [R] |
| (the frame's step) | the kernel, in a pass | The frame callback only requests a step. The step measures the targets only when stale, hit-tests `drag.x` and `drag.y` against the cached rects, and moves the `data-drop-over` mark |
| `drop()` | the operation's `drop` | Cancels the frame and resolves at the release position, because `pointerup` updates the pointer and a drop may follow no frame |
| `invalidate()` | the operation's `handleEvent` | Sets the staleness flag |
| `current` | the operation's `drop`, to build the request | The target, or `null` |

**The host's changes:**

- the `targets` key in `FreeDragConfig`;
- in `activate`, one call of `config.targets`, whose result is passed to the `FreeDragOperation` constructor;
- one read-only private field and one constructor parameter on `FreeDragOperation`, and one call in each of its `move` and `drop`;
- **invalidation through the operation:**
  - The scroll and resize listener is now the operation, through a `handleEvent` method that invalidates the bounds and the targets. The kernel's `Session` and `Gesture` are listeners the same way, and it allocates no closure.
  - The listener is registered when `bounds` or `targets` is configured.
  - The behavior's invalidation step receives the current operation, under DRI-8, and calls its `handleEvent` as well as the bounds' `invalidate`. Between operations it reaches only the bounds, and the next tracker starts stale;
- `target: HTMLElement | null` on `FreeDragRequest`. It is `null` without the capability, and `onEnd`'s result carries it through the request.

`FreeDragBehavior` gains no field. At the first version it held the tracker's controller runtime.

**Properties [E], from `tests/feature-composition.browser.test.ts` (9 tests):**

- The mark follows the pointer: it is set over a target and removed off it.
- The request and `onEnd` name the target.
- The release removes the mark, at a terminal and when the controller is destroyed mid-drag.
- `invalidate()` re-reads the targets' geometry, and so does a scroll during the drag.
- The drop resolves the target with no frame before it. The test stubs `requestAnimationFrame`.
- **A throw from `targets()`:**
  - is reported once as the operation's fault, with the thrown value as its `cause`;
  - the lift's release restores the visual's inline style and leaves the top layer, and nothing is marked;
  - no `onEnd` runs, because `start` was never reached;
  - the controller's next drag pulls the targets again, marks and names the target, and reports no further fault.
- Without the capability, the request's `target` is `null` and nothing is marked.

**Mutations [E]:**

| Mutation | Tests failed |
| --- | --- |
| The release no longer removes the mark | 5 |
| The invalidation step no longer reaches the operation | 1 |
| The operation's `handleEvent` no longer reaches the targets | 2 |
| No invalidation listener without `bounds` | 1 |
| `drop()` cancels the frame but doesn't resolve | 1 |
| The release no longer cancels the frame | 0. A late frame's `requestStep` through a released `Drag` does nothing (DRI-8), so the cancel is cleanup |
| `targets()` pulled before the release is registered | 0 |

**The last mutation can't be observed:** nothing that needs release exists before the pull. The throw test shows that a throw from `targets()` leaves nothing held, and it does whichever runs first. Registering first keeps the throw covered if a later change acquires something earlier. It is the same statements in another order.

**Why not `sortable`'s shape [R].** In that shape the host passes the operation's state to a per-controller runtime as arguments. Here the frame callback has to reach the operation's `Drag` to request a step, so a per-controller runtime would hold the `Drag` between calls. That was the first version's defect.

**What the first version got wrong [R] [E].** Its runtime was per controller, and it held the operation's `Drag`, frame and pulled targets in fields that were `null` between operations. `move` and `drop` used them through non-null assertions. `activate` set the `Drag` and the frame before it pulled `targets()`, and registered the release after the pull. So a throw left the released `Drag` and its frame referenced by the controller until the next activation overwrote them. No behavior observes that retention: the throw test passes against the first version too, so it doesn't distinguish the two versions. The revision removes the retention by construction, because the controller holds nothing to retain it in.

**A first draft was rejected [E].** It had a per-operation tracker, hit-tested on every sample and routed invalidation through a step. It charged `freeDrag` without the capability 71 B Brotli, and it read layout on a sample, which DRI-17 forbids. Its defects were the per-sample hit test and the step-routed invalidation, not the per-operation tracker. The revision keeps the tracker and the frame-coalesced resolve from `sortable`'s axis, with the invalidation flag set directly, as `bounds` does.

### 3.4 One configuration across controllers

`tests/feature-composition.browser.test.ts` passes one `FreeDragConfig` object, as it is, to two controllers. The config holds `bounds(arena)`, `landing(...)` and `dropTargets(...)`. Then [E]:

- the first controller's drag marks the target, and its release clears the mark;
- destroying the first controller leaves the second's bounds clamp, its landing and its targets working;
- each controller's result is its own.

This follows from C2. Each controller's `bounds` runtime is its own, and each operation's tracker is that operation's. drag2's fragments aren't needed for it. A consumer who wants one base config with per-controller overrides spreads objects: `freeDrag(root, { ...shared, onDrop })`.

### 3.5 Rejected

- **An open extension list on a behavior,** such as `extensions: [dropTargets(), autoScroll()]`, called at every hook. It charges every composition a loop at every hook, makes the order between extensions part of the contract, and is the plugin pipeline that CONTRIBUTING §2.2 names.
- **drag2's `plugins`.** It is retire-only (§1).
- **A capability that wraps the operation.** Steps would receive the wrapper, which has no `moveTo`, and `DRD-27` rejected `lifted(behavior)` because it hides the order of the behavior's own disposers.
- **A kernel hook for capabilities.** `DRD-2` and `DRD-27` rejected it, and every composition would pay for it. The kernel needs nothing.
- **Hit-testing with `elementsFromPoint` on each sample,** as the drop-zone fixture does. It allocates an array and reads layout on every sample.
- **Keeping a default animation in the lift.** A lift without animation would then be impossible.
- **Runtime enforcement of what a capability may use.** It is excluded by the owner's terms and by CONTRIBUTING §1.1.

## 4. Configuration reuse without a merge

drag2 merged fragments so that a consumer could compose a config from parts. Here a part is already reusable, because it holds no state. A merge would add a walk over the schema to every composition, and the spread does the same work in the consumer's code. **Not measured:** the merge's cost is estimated from drag2's `mergeFreeFragments`, which walks thirteen keys and appends `plugins`.

## 5. Proposed text for `DRD-2`

**Current:** "`draggable` is public, and `sortable` and `freeDrag` use only its public values and types. A behavior never receives the session. Extension is by whole behavior. No third-party `axis` or plugin seam is published."

**Proposed:** "`draggable` is public, and `sortable` and `freeDrag` use only its public values and types. A behavior never receives the session. **A behavior and the lift are extended by capabilities:** each declares a closed set of named slots, and a capability imported on its own fills one. A third party may fill a published slot. A capability has the properties C1 to C10 of [`feature-composition-assessment.md`](feature-composition-assessment.md) §3.1. A new slot is a library decision, and its call-site cost on compositions that omit it is the owner's. There is no plugin list, no generic hook seam and no kernel hook. A whole behavior on `draggable` remains the way to get what no slot offers."

**What the amendment would carry with it, on adoption:**

- **`DRD-2`'s rationale:**
  - "No third-party `axis` seam" is withdrawn if the owner publishes the existing slot interfaces (§9, choice 8).
  - "the landing policy stays private" is replaced by the `Landing` capability.
- **`DRD-27`'s table, row "The landing after release":** `land` records the capability, and the release calls its `start`.
- **`DRD-29`:**
  - `land(x, y, landing)` replaces `land(x, y, timing?)`;
  - `Landing` replaces `LandingTiming`;
  - the default timing leaves the lift.
- **`DRD-25`:** unchanged. `targets` is not a controller-lifetime installer, because its factory runs once per operation and its state is the operation's (C4).
- **The contract:**
  - the public surface, with `lift/landing.js` and `free-drag/drop-targets.js`;
  - `Lift.land`'s line;
  - DRI-13's reduced-motion bullet, whose "a custom behavior named with no timing" case goes;
  - DRI-17, which gains C8 for capabilities;
  - DRI-18, which gains the capability composition rule;
  - a new free-drag entry for the drop target's guarantees.
- **`DRD-28`'s export table**, and `files.json`, `package.json` and `tests/exports.node.test.ts`. The prototype doesn't change packaging.

## 6. Class encapsulation

### `RectIndex` [R] [E]

**It breaks the rule in all three of its bullets:**

- `values` and `count` are public and writable;
- `items` is a read-only reference to a writable array, and `placeholderRect` is one to a writable buffer;
- `RectIndexView` gives some callers a read-only interface, while the class's own surface stays writable.

**No caller outside the class writes them [R].** `y()` and `xy()` read them, and `LinearShift` calls the class's methods. So the fix changes no behavior.

**The measured variant** ([`rect-index.diff.txt`](probes/feature-composition/rect-index.diff.txt)):

- `#values`, `#count`, `#items` and `#placeholderRect`, each read through a getter typed as the read-only view;
- `ReadonlyFloat64Array` gains `slice`, which the development check `verifyEquivalence` calls and which writes nothing;
- no freezing and no copies.

It costs 52 B minified and 13 to 16 B Brotli on the sortable rows [E]. Typecheck, lint and format pass, and the sortable, hot-path and landing tests pass in Chromium (73) [E]. Each axis reads the getters once per resolution, outside the candidate loop, as the class's comment requires [R].

**Recommended:** the getter variant. A closure is also allowed by the owner's precedent, but `RectIndex` is shared by two axes and has a development check that reads its whole state. A class with private fields keeps that check's access in one declaration.

### The rest [R]

- `Gesture`, `Session`, `Lifter`, `LinearShift`, `FreeDragOperation` and `SortableOperation` keep their mutable state in `#private` fields.
- `FreeDragBehavior` and `SortableBehavior` expose only `readonly` fields. Their runtimes are changed through methods.
- The prototype adds no class. `dropTargets()` and `landing()` are closures, as `bounds()` and the owner's `layoutAnimation` are. A tracker's mutable state is in its closure, and its object exposes only methods and a getter.
- `FreeDragOperation` holds the tracker in a `readonly #targets` field. `FreeDragBehavior` gains no field.
- `layoutAnimation` is not changed.

## 7. Evidence

| Check | Base `688613863` | First version | Revision |
| --- | --- | --- | --- |
| Typecheck, lint, format | Pass | Pass [E] | Pass [E] |
| Chromium, `npx just test` | 343 passed, 4 failed. All 4 are size rows: the `draggable alone` control, `example: drop zone`, `freeDrag`, and `freeDrag + bounds + landing` | 351 passed, 3 failed | 353 passed, 3 failed. All 3 are size rows: the control, the drop zone and `freeDrag + bounds + landing`. The `freeDrag` row passes |
| Chromium and Firefox, `npx just test-engines` | 633 passed, 9 skipped | 647 passed, 9 skipped, in two consecutive runs | 651 passed, 9 skipped, in runs 1 and 3 of three |
| New tests | — | 7, in both engines | 9, in both engines |

**The revision's second full run** failed one test in Chromium: the grab during a 20 s rejected landing, in `tests/activation.browser.test.ts`. That test runs `sortable` and the lift, which the revision doesn't change from the first version. Eight isolated runs of its block passed in both engines. It isn't reproduced, and it isn't attributed. At the first version, one run failed the reuse test, and the test was changed (results).

**Size, Brotli bytes from the composition probe [E],** with the revision. "Carries" names the capability code found in the bundle. The rows that the revision changes were, at the first version: `freeDrag` 4957, `freeDrag + landing` 5223, `freeDrag + bounds + landing` 5400, `freeDrag + dropTargets` 5242 and `freeDrag + dropTargets + landing` 5489.

| Composition | Base | Prototype | Δ | Carries, prototype |
| --- | --- | --- | --- | --- |
| `draggable alone` | 2138 | 2138 | 0 | — |
| `draggable + lift` | 4152 | 3912 | −240 | — (base: the landing animation) |
| `draggable + lift + landing` | — | 4246 | — | landing animation, landing timing |
| `freeDrag` | 5075 | 4948 | −127 | — (base: the landing animation) |
| `freeDrag + landing` | 5172 | 5218 | +46 | landing animation, landing timing |
| `freeDrag + bounds + landing` | 5330 | 5392 | +62 | landing, bounds |
| `freeDrag + dropTargets` | — | 5209 | — | drop targets |
| `freeDrag + dropTargets + landing` | — | 5465 | — | landing, drop targets |
| `example: drop zone` | 4439 | 4529 | +90 | landing |
| `sortable + y` | 6652 | 6414 | −238 | — (base: the landing animation) |
| `sortable + xy` | 6594 | 6349 | −245 | — |
| `complete` | 7037 | 7047 | +10 | landing, layout animation |

**Separated by an intermediate measurement [E]**, with the lift split applied and `freeDrag`'s host at the base:

| Composition | Lift split alone | The `targets` slot added, revision | First version |
| --- | --- | --- | --- |
| `freeDrag` | −172 (4903) | +45 | +54 |
| `freeDrag + landing` | +2 (5174) | +44 | +49 |
| `freeDrag + bounds + landing` | +27 (5357) | +35 | +43 |

Brotli differences of about ten bytes are within the noise between neighboring edits.

## 8. Costs, reported and not accepted

- **The slot's call sites:** +45 B Brotli and +209 B minified on `freeDrag` without drag and drop, against +54 B and +211 B at the first version. This is the one charge to a composition that omits the capability. It includes the invalidation listener's move to the operation, which `bounds` uses too.
- **The landing as a capability:**
  - neutral to +27 B on compositions that compose a landing;
  - −172 to −240 B on lifted compositions that don't;
  - +90 B on the drop-zone fixture, which now imports `landing()` with its options. It used to get the default timing inside the lift.
- **The drop-target capability:** 261 B Brotli and 670 B minified when composed, against 285 B and 740 B at the first version. That includes the frame task, which `freeDrag` didn't bundle before.
- **Per operation, when composed [R]:**
  - the tracker, its closures, the rects array and the frame task with its two closures;
  - one `DOMRect` per target at each measurement.

  The first version made the mark and resolve closures once per controller. The revision makes them once per operation, which is the price of keeping the operation's state in the operation. Not measured.

- **Per operation, without the capability [R]:** nothing added. The listener is the operation itself, with no closure.
- **Per sample [R]:** nothing allocated. Scheduling a frame reads no layout.
- **`RectIndex`'s encapsulation:** +13 to +16 B Brotli.
- **Size rows:**
  - the drop-zone row must declare the landing it now composes;
  - new rows would cover `draggable + lift + landing` and `freeDrag + dropTargets`;
  - ceilings are re-based under `DRO-4`.

## 9. Remaining choices for the owner

1. **The slot's cost.** Accept about 45 B on `freeDrag` without drag and drop, or reduce it. Ways to reduce it:
   - keep the target out of the request, at the price of a typed answer to `onDrop`;
   - one generic per-operation slot on `freeDrag`, paid once for every later capability. It is not measured, and it reopens the ordering question of §3.5 as soon as two capabilities exist.
2. **Where custom behaviors import `landing`:** `lift/landing.js`, as prototyped, or a second named export of `lift.js`. A named export that a consumer doesn't import is shaken out in the same way.
3. **`land` without a landing.** In the prototype the argument is required. An optional argument, meaning "nothing lands", saves a branch in no one's code.
4. **How a target is shown:** the `data-drop-over` attribute, as prototyped, a consumer callback such as `over(target, previous)`, or both. The attribute's release is owned by the capability. A callback's would be the consumer's.
5. **An accepted drop's landing into the target.** The prototype keeps `freeDrag`'s accepted semantics: the visual stays where it was dropped, and the consumer commits in `onEnd`. A landing into the target needs that target measured before release. The drop-zone fixture does it with a stand-in.
6. **How the targets' staleness is set.** The prototype follows `bounds`: the scroll listener, which is now the operation, and the invalidation step set the flag directly. The alternative is `sortable`'s precedent, where the listener requests a step. The first draft did that, and it cost bytes on every composition.
7. **A scroll with the pointer still.** The hovered target is re-resolved at the next sample, as `sortable`'s insertion is.
8. **Publishing slot interfaces.** The proposed `DRD-2` lets a third party fill a published slot. Which interfaces to publish is the owner's: `Landing`, `DropTargets` with `DropTargetTracker`, and `BoundsInstaller`, and also `AxisInstaller` and `DisplacementInstaller`, which `DRD-2` kept private.
9. **`RectIndex`:** the getter variant (§6) or a closure.
10. **Names:** the `targets` key, the `free-drag/drop-targets.js` entry, the `target` request field, the `data-drop-over` attribute, and the types `DropTargets` and `DropTargetTracker`.

## 10. Found outside the scope: `bounds` after a scroll between operations

**`bounds` keeps a stale clamp across operations [R] [E, Chromium].**

- **Cause [R]:**
  - its runtime is per controller, and so are the cached box and the staleness flag;
  - only the invalidation listener and the controller's `invalidate()` set the flag, and the listener exists only during an operation.

  So a scroll between two operations leaves the next operation clamping against the box from before the scroll. In C4's terms it is a controller-lifetime cache of what one operation measured that the host doesn't invalidate at activation. `sortable`'s `activate` does invalidate its axis.

- **Witness [E]:** a scratch test, not kept, recorded in `results.txt`.
  - Setup: a box in a 300 × 300 arena at `top: 200px`, with `bounds(arena)`. One drag and release, a document scroll by 150 px, then a drag 400 px up.
  - Chromium: the box stopped at 200, while the arena's top was at 50.
  - Firefox: the test frame didn't scroll, so that run is inconclusive.
- **Scope:** the code is the base's `bounds.ts`, which neither version of the prototype changes. Nothing is fixed here.
- **Recommended:**
  - Treat it as a finding against the base, for the owner to route.
  - The fix is C4 applied to `bounds`: the host invalidates the bounds at activation, as `sortable` invalidates its axis. That is one call, and it costs a few bytes on the compositions that compose `bounds`. It isn't measured.
  - The revised drop-target tracker has no such state, because each operation starts stale.

## Next

The owner evaluates the revision, the revised C2, C3 and C4, and §9. On approval, the architect amends `DRD-2` as §5 lists, recording the accepted model and the §9 choices the owner decides. An implementer unit would then port `composition.diff.txt` and, if chosen, `rect-index.diff.txt`, update packaging and the size rows, and report the costs for acceptance. §10 goes to the owner separately.