# Independent adversarial review of the `@ydinjs/drag2` public API

Date: 2026-08-10

Reviewed revision: `0fe92bbfc1faa8183919d0348f492a21a5c0b886`

## Verdict

Do not publish the current public surface as the successor API yet. The implementation contains valuable work, but the API exposes the architecture of the experiment more than the needs of a sortable consumer. It has frozen several guarantees before there is evidence that consumers value them enough to pay their implementation, lifecycle, test, bundle, and documentation costs.

The most important changes are subtractive:

1. unfreeze the surface while the package is private;
2. replace `draggable(root, sortable(items, ...features))` with a behavior-specific constructor and typed options;
3. weaken the reentrant-`destroy()` promise to ordinary synchronous resource cleanup plus prevention of future work;
4. collapse `accept({ presentation: true })` + `ready(request)` + `updateItems(items)` into one consumer-owned commit boundary, or serialize rendering before landing;
5. make keyboard handling opt-in and stop swallowing pointer defaults before activation;
6. remove the public custom landing runner and strongly consider removing the custom placeholder factory from the first stable API; and
7. replace the detailed failure/cancel taxonomy and split terminal callbacks with one small terminal-result contract.

These are not requests to make the current machine more robust. They are opportunities to remove states, latches, callbacks, branded values, entrypoints, and tests.

## Findings and tradeoffs

### 1. Critical — the freeze is protecting hypotheses, not adopted compatibility

The package is still private (`package.json:2-4`), has only one implemented behavior, and explicitly lacks free drag (`README.md:8-12`, `:29`). At the same time, the README calls the SPI and public surface frozen and requires a failing executable case to change either (`README.md:14-20`). Export tests enforce exact equality, so even adding a harmless export is a contract failure (`tests/exports.node.test.ts:39-88`; `tests/consumer.node.test.ts:520-573`).

This reverses the useful order of evidence. The architecture was the subject of the probe; it should not also be the reason its output is immutable. The original brief even said that the syntax was provisional and that architectural intent, not the sketch, should be preserved (`.plan/brief.md:13-28`).

Tradeoff: unfreezing causes short-term churn in tests, contracts, and review records. That cost is much smaller than preserving an unadopted API and its machinery after release.

Recommendation: treat the current surface as disposable until at least one React integration, one imperative integration, one nested-interactive-content integration, and the future free-drag behavior validate it. Freeze a smaller release-candidate contract, not this probe's decision ledger.

### 2. Critical — `Behavior` and `SortableFeature` expose a closed plugin architecture with no plugin value

The consumer writes:

```ts
draggable(root, sortable(items, y(), callbacks({ onReorder }), ...features));
```

Neither opaque value is consumer-authorable. `Behavior` can only be passed back to `draggable`, and `SortableFeature` can only be produced by first-party factories (`src/drag.ts:49-71`; `src/sortable/feature.ts:179-201`; `tests/sortable/feature.declaration.test.ts:11-48`). The feature set is explicitly closed (`src/sortable/feature.ts:1-10`). A consumer nevertheless pays for:

- a generic constructor even though there is one behavior;
- opaque brands and install/unbrand handshakes;
- nine public runtime entrypoints (`package.json:17-53`);
- untyped variadic feature combinations;
- runtime failures for a missing axis, missing callbacks, and duplicate single-writer features (`src/sortable/assemble.ts:30-48`, `:64-127`); and
- immutable-for-life policy solely because features assemble once (`src/sortable.ts:51-72`).

A typed options object would make `axis` and `onReorder` required and duplicates impossible. Direct constructors do not prevent the kernel from being shared privately later:

```ts
const controller = sortable(root, {
  items,
  axis: 'y',
  onReorder,
});
```

Future free drag can be `freeDrag(root, options)` and reuse the private executor without asking consumers to traffic in behavior objects.

Tradeoff: separate feature modules physically exclude optional implementations without relying on a bundler. Current measurements do not justify making that property the organizing principle of the API: the complete composed build is 11.03 kB Brotli, the feature-matched non-composed baseline is 10.77 kB, and the difference between minimal and complete is only about 0.83 kB. The composition mechanism itself costs about 0.26 kB.

Recommendation: delete the public `Behavior`, `SortableFeature`, `draggable`, feature brands, contribution records, claim/unwind assembly, and most feature subpaths. Keep internal modules and split entrypoints only for optional code whose measured size warrants the import cost.

### 3. Critical — the reentrant `destroy()` guarantee has pathological scope

The valuable guarantee is straightforward: `destroy()` releases owned resources synchronously, is idempotent, prevents future queued/async work, and makes subsequent controller calls inert.

The current guarantee is far wider. If consumer code destroys from a `handle()` or `visual()` resolver, a custom-element reaction, `getBoundingClientRect()`, `animate()`, an animation's `finished` accessor/thenable, an element style accessor, or a resolution object's `type` getter, the library promises to stop at that exact consumer-reachable call and leave no later read, write, callback, or cache residue (`README.md:57`; `.plan/contract/05-lifecycle-invariants.md:24`).

That promise propagates a second behavior-owned terminal latch and `live()` through the whole sortable implementation:

- controller/runtime latching (`src/sortable/controller.ts:51-67`, `:131-134`);
- candidate-loop checks and special abort/re-retire cache states (`src/sortable/rect-index.ts:95-188`);
- per-write placeholder barriers (`src/sortable/placement.ts:48-114`);
- repeated FLIP measurement/acquisition barriers (`src/sortable/layout-animation.ts:153-301`); and
- barriers around custom-element reactions, frame writes, proposal publication, settlement, and re-anchoring in `src/sortable/spec.ts`.

`tests/COVERAGE.md:330-390` is effectively a separate conformance specification for this property, including custom fixtures needed to prove the exact call list. `:420-428` documents guards that cannot even be independently falsified. The repeated fixes and the need to enumerate indirect calls show that this is not a closed or naturally maintainable boundary.

Tradeoff: after weakening the guarantee, a deliberately reentrant accessor may observe a bounded continuation of the already-running synchronous stack. It must not leave a resource that outlives the operation, but it may perform another read or a reversible write before the stack unwinds.

Recommendation: document `destroy()` as non-reentrant with respect to a currently executing library callback, or defer teardown until that callback returns. Retain stale async-attempt checks and disposal of a resource returned after destruction. Delete exact post-accessor call-list guarantees, `rt.closed`/`live()` plumbing inside feature loops, and the dedicated barrier matrix.

### 4. Critical — presentation readiness and collection publication form three protocols that can disagree

An accepted React reorder currently requires all of the following:

1. `onReorder` returns `ReorderResolution.accept({ presentation: true })`;
2. the consumer retains the exact `ReorderRequest` object;
3. a layout effect calls `controller.ready(request)` before `readinessTimeout`; and
4. the controller's separate collection snapshot is eventually updated with `controller.updateItems(items)`.

The public halves are in `src/sortable/domain.ts:69-130` and `src/sortable/controller.ts:13-38`. The reference story needs pending-request, controller, ordered-element, and application-state refs to coordinate them (`src/sortable.stories.tsx:93-178`).

The handshake has substantial state merely to define early, armed, duplicate, fabricated, structurally identical, retired, undeclared, idle, active, and post-destroy acknowledgements. The dedicated acknowledgement suite is 661 lines (`tests/sortable/acknowledgement.browser.test.ts`). Request identity is retained in sortable runtime, while the kernel has separate early latches, readiness holds, settlement holds, deadline replacement, and a multi-gate join.

The ceremony also creates a correctness hole in the reference integration. The story updates the controller's item snapshot from `onFinish` (`src/sortable.stories.tsx:163-167`). A readiness timeout produces `onError` only—no `onFinish` or `onCancel` (`src/sortable/spec.ts:1191-1199`, `:1272-1276`). If React committed the authored order after the timeout, application DOM/state changed but drag2's snapshot did not. The late `ready()` is rejected and the next drag can use stale order.

The claimed diagnostic value is overstated as well. Stale and contradictory acknowledgements are reported only under `DEV` (`src/sortable/controller.ts:102-119` and the corresponding kernel branches); the published build defines `__DEV__` as false (`tsdown.config.ts:23-27`). Production consumers mainly see the 500 ms failure, not the detailed protocol errors the docs use to justify the design.

Tradeoff: the simplest contract—`onReorder` settles only after the authored DOM is ready—serializes that commit ahead of landing and loses some animation/render overlap. That is a visible but probably small latency cost. If overlap is proven important, a first-party React adapter or one atomic `commit(request, items)` can hide the coordination without putting `ready()` and exact object identity on every controller.

Recommendation: remove `presentation`, `ready`, `readinessTimeout`, request-identity retention, early acknowledgement latches, deadline replacement, and the readiness half of settlement gates. Prefer one of:

- `onReorder` returns/settles after commit; or
- one atomic consumer operation publishes both the accepted request and the new item collection.

Do not retain the present two-half protocol merely to preserve overlap that has not been measured as user-significant.

### 5. High — live `updateItems()` semantics duplicate state ownership and make arbitrary mutation a core guarantee

The application already owns ordered state and DOM. Drag2 copies that state, exposes a dense public version, and requires every change to be echoed through `updateItems()`. During an operation, replacement is queued in FIFO order, is never discarded, publishes before a resulting cancellation, and may rebase the current identity-neighbour gap (`src/sortable/controller.ts:13-20`, `:44-92`; `src/sortable/collection.ts`).

Tests preserve replacements from `handle`, `visual`, `onStart`, and `onReorder`; multiple replacements during one admission; pressed-item removal; gap survival; release-time freezing; dense versions; and invalid updates after destroy (`tests/sortable/sortable.browser.test.ts:451-590`, `:1622-2025`). These are expensive guarantees for a questionable product outcome: if the list structurally changes in the middle of a drag, canceling predictably is often safer than preserving a semantic gap through arbitrary edits.

The public `ReorderRequest.version`, full `CollectionSnapshot`, and neighbour identities then freeze this internal reconciliation strategy (`src/sortable/domain.ts:21-63`).

Tradeoff: a virtualized or collaborative list loses seamless mid-drag rebasing. Such integrations may need a richer policy later, but they should demonstrate the need before every consumer inherits it.

Recommendation: snapshot the collection at admission. A structural change during the operation cancels it. Refresh between operations through either a cold `items()` getter or an explicit replacement method that is idle-only. This can delete queued collection actions, dense public versions, identity-neighbour reconciliation, publish-before-cancel ordering, and much reentrancy coverage.

### 6. High — input ownership is unsafe by default

#### Keyboard

Every sortable unconditionally installs keyboard ingress. All four arrow keys mean previous/next, even for a vertical list (`src/sortable/keyboard.ts:11-43`; `src/sortable/spec.ts:393-447`). Any descendant in an item is eligible through the composed path, there is no input/contenteditable/modifier/composition guard, and a feasible command is default-prevented. A left/right arrow in an input, slider, or editor nested in a row can therefore reorder instead of performing its native action.

`handle()` gates keyboard and pointer input identically. A conventional pointer grip that is not itself focusable can accidentally make the row's keyboard path unusable. Meanwhile roles, focusability, focus management, and announcements remain consumer obligations (`README.md:31`; `.agents/docs/accessibility.md`, Drag section). This is not a complete accessibility abstraction, yet its roughly 300 B is deliberately non-tree-shakeable (`README.md:119`).

#### Pointer

For a primary press on any admitted descendant, `runAdmission()` calls `event.preventDefault()` immediately (`src/kernel/kernel.ts:682-720`), before movement crosses the activation threshold. A click that never becomes a drag can therefore lose ordinary focus, selection, or compatibility defaults. There is no default interactive-descendant exclusion and no public policy for this tradeoff.

Tradeoff: delaying pointer prevention may weaken touch/selection behavior and requires the package to state its `touch-action` expectations. Making keyboard opt-in means the minimal setup is not keyboard accessible until the consumer installs and configures it. That is more honest than silently owning keys without supplying the rest of the accessible interaction.

Recommendation: remove keyboard from the core v1 surface or make it an explicit adapter with key/axis mapping, editable-target guards, and a keyboard activation policy separate from the pointer handle. Preserve pointer defaults until activation where feasible; otherwise require an explicit handle or prominently document the early-prevention contract. Removing keyboard entirely also deletes the command-admission SPI and pointerless branches.

### 7. High — public customization hooks turn cosmetic choices into lifecycle participants

The most costly examples are not essential sortable semantics.

`landing({ run })` exposes `LandingStart`, `LandingContext`, `LandingHandle`, `Point`, and `DOMRealm`. A runner must call `done` or `fail`, relinquish its transform in `destroy`, tolerate late/double completion, and optionally retarget (`src/sortable/landing.ts:23-48`; `src/kernel/spec.ts:232-268`). This creates another asynchronous resource owner and requires generation guards, acquisition rollback, stale callbacks, runner-destroy error policy, retarget capability negotiation, and authoritative repinning. It also makes contradictory options legal: `duration` and `easing` are silently ignored when `run` exists (`README.md:99`).

`placeholder({ create })` lets consumer code return an arbitrary custom element that the library adopts, mutates, inserts, moves, and removes (`src/sortable/placeholder.ts:18-32`; `src/sortable/placement.ts:117-174`). That requires detachedness/identity validation plus barriers around custom-element connection reactions, attribute/style accessors, and later moves.

The `duration` thunk is another consumer callback executed at settlement solely to vary a number. It creates settle-time validation, reduced-motion ordering, and reentrant destruction cases.

Tradeoff: removing these hooks loses custom springs, live per-drop timing, and arbitrary placeholder structure. Those are real capabilities, but the core currently pays a very large correctness tax for them before demand is known.

Recommendation: for v1, keep a library-owned landing with fixed `duration`/`easing` or no landing. Let the kernel own the resulting `Animation`. Use a library-owned placeholder styled through the stable data attribute, a class, CSS variables, or at most a cloned inert template. If custom motion later proves important, ship it as an explicitly advanced companion API rather than freezing its resource protocol in the core.

Keep `handle`/`visual` only if needed, but stop promising exact behavior when they reentrantly destroy. Prefer declarative selectors or item descriptors where they cover the use case.

### 8. High — the public failure and terminal-callback taxonomy freezes internal seams

`drag.js` exports fourteen numeric `FAILURE_*` constants (`src/drag.ts:24-47`). Names such as renderer write, insertion, placeholder move, invalidation, scheduled frame, landing create, landing target, and terminal callback expose the current pipeline decomposition. Refactoring two adjacent steps into one is now a breaking diagnostic change even though a consumer usually has the same response: log, clean up, and possibly retry.

Sortable adds numeric `AT_PROPOSAL`/`AT_CONSUMER`, four transaction result arms, separate finish/cancel union aliases, and `DragErrorContext.domain`, which couples the behavior-agnostic error story back to the sortable result graph (`src/sortable.ts:16-42`; `src/sortable/domain.ts:164-213`). Failures may also go to the platform reporter rather than `onError`, depending on whether the implementation calls them consequential or quality-track errors (`src/kernel/reporter.ts`).

The callback split makes consumer cleanup harder. A started operation can terminate through `onFinish`, `onCancel`, or `onError`; failures explicitly invoke `onError` only (`src/sortable/spec.ts:1191-1199`). Consumers must duplicate end-of-operation cleanup across three callbacks and understand which internal failures have a domain result.

Tradeoff: coarse errors provide less telemetry, and a single terminal union is slightly larger at each callback site. Causes and stacks retain detailed diagnostics without making the stage vocabulary public.

Recommendation: expose one exactly-once `onEnd(result)` for every started operation, including a `failed` arm, and reserve `onError` or platform reporting for failures not belonging to an operation. If a phase is needed, use a small string union such as `'start' | 'interaction' | 'reorder' | 'presentation' | 'callback'`. Delete numeric constants, cancellation timing constants, split finish/cancel aliases, and stage-specific recovery promises.

### 9. Medium — reorder results expose internal reconciliation more than consumer intent

`onReorder` receives `{ item, version, from, to, before, after }`. Terminal callbacks receive a `ReorderProposal` that repeats the request and adds the complete collection snapshot, and every result arm carries that proposal (`src/sortable/domain.ts:21-63`, `:164-198`). The reference story primarily needs `item` and an insertion anchor (`src/sortable.stories.tsx:143-161`).

This surface locks in the snapshot/version/neighbour implementation and retains DOM element arrays through settlement. It also makes types such as `CollectionSnapshot`, `ReorderProposal`, and several result aliases public only because other exported shapes structurally depend on them.

Tradeoff: concurrent-state consumers may value a version and a stable anchor. That does not justify exposing both indices, both neighbours, and a full snapshot without demonstrated consumers.

Recommendation: start with `{ item, from, to }` plus at most one stable insertion anchor or consumer ID. Keep snapshot version and neighbour pairs private. Add concurrency metadata only when an integration shows how it resolves a real conflict.

### 10. Medium — the package overcommits to exact live-element presentation

Sortable always chooses the faithful lift mode, but the shared presentation layer already implements multiple modes and future-free-drag concerns. It preserves and restores a large set of inline styles, popover/top-layer state, authored transforms, zoom, and box-space mapping; rejects disconnected, fragmented, or unsupported 3D visuals; and owns exact rollback (`src/kernel/presentation.ts`, 481 lines; `src/sortable/spec.ts:370-381`). `@ydinjs/box-quad` exists as the package's only dependency largely to support this promise.

This is high consumer value for complex transformed layouts, but it should be weighed against a simpler preview/overlay model. A library-owned clone or consumer-provided preview would avoid promoting and leasing an arbitrary live element and could remove much inline-style and popover machinery.

Tradeoff: clones do not automatically preserve canvas/video/control state, inherited styling, custom-element behavior, or exact dimensions. A preview API shifts styling work to consumers. This finding is therefore less decisive than the earlier ones.

Recommendation: validate the live-element requirement with real components before freezing its edge behavior. At minimum, do not preserve three internal lift modes or expose failure stages created by modes the only shipped behavior never selects. Consider a simple overlay/preview mode as the default and an advanced faithful mode only if measurements and integrations justify it.

## A smaller candidate contract

This is a direction, not a replacement specification:

```ts
type SortableOptions = Readonly<{
  items: readonly HTMLElement[] | (() => readonly HTMLElement[]);
  axis: 'y' | 'xy';
  keyboard?:
    | false
    | Readonly<{
        previous: readonly string[];
        next: readonly string[];
      }>;
  threshold?: number;
  placeholderClass?: string;
  landing?: false | Readonly<{ duration?: number; easing?: string }>;
  onReorder(
    request: Readonly<{ item: HTMLElement; from: number; to: number }>,
    context: Readonly<{ signal: AbortSignal }>,
  ): ReorderResolution | PromiseLike<ReorderResolution>;
  onEnd?(result: ReorderResult): void;
}>;

const controller = sortable(root, options);
```

The corresponding behavioral guarantees should be deliberately smaller:

- one collection snapshot per operation; structural mutation cancels;
- pointer release freezes one proposal;
- explicit accept/reject remains;
- an async acceptance settles only when the consumer's authored order is ready;
- landing is owned by the library and begins after that settlement;
- `destroy()` synchronously releases resources and prevents future work, but reentrant destruction inside a currently executing callback does not promise statement-by-statement interruption;
- keyboard is opt-in and ignores editable descendants by default;
- every started operation produces one terminal result; and
- runtime errors have a small stable category, with the original cause preserved.

Even this sketch may still be too large. In particular, `keyboard`, `landing`, and live collection getters should earn their place independently.

## Deletion map

| Public change | Internal machinery made removable or private |
| --- | --- |
| Direct `sortable(root, options)` | public behavior brand, `draggable` entry, install/unbrand ceremony |
| Typed closed options | feature brand, contribution objects, collision claims, assembly unwind, most feature entrypoints |
| Ordinary non-reentrant `destroy()` semantics | `live()` plumbing, exact per-accessor barriers, cache abort/re-retire states, barrier-specific test matrix |
| One render/acceptance boundary | `ready()`, presentation flag, readiness timeout, pending request identity, early/duplicate latches, readiness gate and join cases |
| Snapshot-or-cancel collection policy | queued collection action, dense public version, gap rebasing, publish-before-cancel rules |
| Library-owned landing | `LandingStart`/`Context`/`Handle`, `DOMRealm`/`Point` public dependencies, custom runner completion/failure/retarget lifecycle |
| Library-owned placeholder | factory adoption validation and most custom-element reaction barriers |
| Opt-in/deferred keyboard | unconditional key listener, command admission SPI, pointerless operation branches |
| One terminal result + coarse error phase | fourteen failure constants, two cancel-stage constants, callback routing and many stage-specific public types |

## Guarantees worth retaining

The review does not argue for a careless sortable. These guarantees have clear consumer value relative to their cost:

- explicit accept/reject rather than inference from silence or DOM mutation;
- one immutable proposal after release;
- cancellation/async work bound to an operation identity internally;
- pointer motion independent of framework rendering;
- idempotent teardown and prompt release of listeners, capture, animation, and temporary DOM;
- final destination measurement before temporary presentation is released;
- string-discriminated terminal results; and
- an `AbortSignal` for asynchronous consumer work.

They do not require exposing the generic behavior architecture, exact internal failure stages, or statement-by-statement terminal barriers.

## Verification and scale signals

I reviewed the public entrypoints, emitted-surface tests, README, normative contract, implementation call sites, coverage map, browser suites, React story, and the shipped-package comparison. I also ran `npx just size` at the reviewed revision; all budgets and graph assertions passed.

Current measurements:

| Composition                              |   Brotli | Modules |
| ---------------------------------------- | -------: | ------: |
| minimal `y`                              | 10.20 kB |      31 |
| minimal `xy`                             | 10.24 kB |      31 |
| minimal + layout animation               | 10.65 kB |      32 |
| minimal + landing                        | 10.49 kB |      32 |
| complete                                 | 11.03 kB |      35 |
| feature-matched non-composed baseline    | 10.77 kB |      30 |
| shipped `@ydinjs/drag` sortable baseline |  6.89 kB |      26 |

The test scale is not itself a defect, but it is useful evidence of contract cost: drag2 has roughly 20,000 lines of TypeScript tests, including a 3,127-line kernel suite, a 3,159-line sortable suite, a 1,516-line feature suite, a 1,166-line displacement suite, a 781-line keyboard suite, and a 661-line acknowledgement suite. Much of that coverage is excellent. The adversarial conclusion is that several tests protect guarantees the API should delete rather than celebrate.