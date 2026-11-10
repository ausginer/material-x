# Combined review: code discipline (`cleanup`)

**Commit read:** `b01a0283d` on `drag/feature-composition` (HEAD, clean working tree). Range `d7e7b0d3a..b01a0283d`. The production code is `50ed18a17`'s, and later commits change only `packages/drag/.plan/`.

**Lens:** is the machinery justified by the code's current responsibility and by `CONTRIBUTING.md`? Rules cited: Part I §TypeScript, §Class encapsulation, §Naming, §Comments and JSDoc; Part II §1.1, §2.1, §5, §9 and `documentation.md` §5. Accepted decisions stand (`DRO-6`, `DRO-7`, `DRO-8`, `DRO-9`, `DRO-10` approved part, `DRO-12`, `DRD-34` to `DRD-38`).

## Result

**No runtime defect and no tier A or B finding.** The production runtime under `src/` carries no machinery that its responsibility does not require. Nine tier C findings follow: a vestigial interface, a vestigial nullable, a misnamed entry with a redundant call, a single-importer module, a contract claim that two imports break, stale comments, a dead test command, duplicated test and bench definitions, and library-created shapes still declared as interfaces outside `packages/drag`.

## Scope

**Covered (read in full at the commit):** all of `packages/drag/src/` except the three `*.stories.tsx` files and `stories.module.css`, which I read and found conforming; `README.md`; `package.json`, `files.json`, `tsconfig.json`, `tsconfig.docs.json`, `typedoc.json`, `eslint.config.ts`; `tests/support/*`, `tests/fixtures/*`, `tests/size.node.test.ts`, `tests/exports.node.test.ts`; `bench/size/measure.ts`, `bench/heap-snapshot.ts`, `bench/lab*.ts`. Outside the package: the diffs of `eslint.config.ts`, `.oxlintrc.json`, `.oxfmtrc.json`, `.scripts/vitest-config.ts`, `packages/box-quad/tests/local-delta.browser.test.ts`, `147abd54c`, `b499eaee0` and `d8d57383e` (core, tproc, size-limit-preset-rolldown, vite-traits-plugin, `.scripts/css/debug.ts`).

**Checked mechanically, not read line by line:** the other 27 files under `tests/` (helper duplication, unused support exports, `it` naming, narration and decision-id grep) and `bench/compare.ts` (1301 lines; symbol-usage check for dead declarations, header and structure read, no timing logic read). I did not judge test assertions, and I did not run `compare.ts` or any timing.

**Not covered:** timing and optimization (deferred), `DRF-1`, `DRO-13`, `DRO-3`, the correctness of any behavior (other lenses), `.devcontainer/`, `.gitignore`, `.scripts/cl.sh`.

**Probes:** I built the package with `tsdown -d <scratch>` to read the shipped `.d.ts` (no `type-fest` import, no decision id, no `.plan` link reaches a published declaration; `KernelDrag` and the built-in classes are pruned). The scratch output is removed. No file in the repository was changed.

## State of the handover items

| Item | State at `b01a0283d` |
| --- | --- |
| Known size failures (`DRO-4`) | `npx just test tests/size.node.test.ts`: 6 of 11 fail, all by "over its N B ceiling" (for example `freeDrag + bounds + landing` +265 B, `complete` +41 B). Matches the handover. I did not re-measure `DRO-10`'s +78 B and +59 B |
| Typecheck, `oxlint`, ESLint | `npx just typecheck` and `npx just lint` in `packages/drag` exit 0 |
| Unused ESLint directive (`DRD-37` property 3) | `eslint --report-unused-disable-directives-severity warn .` reports none, and no file names `unbound-method` in a directive. The only match is a `.diff.txt` record |
| `tsconfig.json` includes `.plan/probes/callback-list/allocation.ts` | Accepted in the assessment §4; unchanged |
| `DRO-13` | The default holds. Its scope is `packages/drag`; cleanup-9 is outside it |

## Findings

### cleanup-1 — `RectIndexView` is an interface nothing is typed against, and its comment describes fields the class no longer has

**Tier C.** `RectIndex` implements `RectIndexView`, and no code names `RectIndexView` as a type.

- **Finding:** `src/sortable/rect-index.ts:38` declares `RectIndexView` and `:60` makes `RectIndex implements RectIndexView`. A search over `src/`, `tests/` and `bench/` finds no other reference. `y.ts`, `xy.ts` and `linear-shift.ts` take or hold `RectIndex` itself.
- **Current behavior / contract:** the interface's comment says "What a collaborator may read from the cache. The owner writes through the class's own declarations of the same members." That was true when `values`, `items` and `count` were writable public fields. Commit `11950690f` made them `#private` fields behind read-only getters.
- **Why it is a problem:** the interface now repeats the class's whole public read surface and has one implementer and no consumer (Part II §2.2, §6: an abstraction wider than its use). Its comment states an arrangement that no longer exists (documentation.md §5.2, "check factual claims against the code"). A reader looks for a second, writable view.
- **Evidence:** `grep -rn RectIndexView packages/drag/{src,tests,bench}` matches only `rect-index.ts:38` and `:60`. `git diff d7e7b0d3a..HEAD -- src/sortable/rect-index.ts` shows the field-to-getter change.
- **Required property:** the read-only view of the cache has one declaration, and its comment describes the code as it is. `ReadonlyFloat64Array` is used by the getters and stays on its own merit.

### cleanup-2 — `AxisQuery.insertion` is nullable, but its only producer never supplies `null`

**Tier C.**

- **Finding:** `src/sortable/axis.ts:38` types `AxisQuery.insertion` as `Insertion | null`. `SortableOperation` holds its query as `Writable<SetNonNullable<AxisQuery>>` (`operation.ts:49`) and its constructor takes `insertion: Insertion`, so the field is never `null`. The consumers compensate: `y.ts:42` and `xy.ts:48` test `insertion ? insertion.index : -1`, `y.ts:76` and `xy.ts:85` assert `query.insertion!`, and `linear-shift.ts` guards `gap >= 0`.
- **Current behavior / contract:** the axis slot's types are not published (contract, Capabilities paragraph), so no third-party axis can pass `null`. The architect's `operation-lifetime-assessment.md` item 8 notes that `AxisQuery.insertion` "may become non-null, because `AxisQuery` is internal", and `xy.ts`'s assertion would go. It was not done.
- **Why it is a problem:** §1.1's gate: the `null` state is not reachable through correct use, so the branches and the type-level `SetNonNullable` that narrows it at the producer serve a state that cannot occur. Each reader of the axis rules asks when the committed gap is absent.
- **Evidence:** `grep -n insertion src/sortable/{axis,y,xy,operation}.ts`. No test constructs an `AxisQuery` (`grep AxisQuery tests bench` is empty).
- **Required property:** the type of the committed gap says whether it can be absent, and the producer and the consumers agree. If an absent gap is meant to be possible, a producer must exist for it.

### cleanup-3 — `FreeDragOperation.handleEvent()` is called as an invalidation entry, with no event, and invalidates the bounds a second time

**Tier C.**

- **Finding:** `FreeDragBehavior.invalidate` (`behavior.ts:76-79`) calls `this.bounds?.invalidate()` and then `operation?.handleEvent()`. `handleEvent` (`operation.ts:52-55`) calls `this.#behavior.bounds?.invalidate()` and `this.#targets?.invalidate()`. While an operation is current, the bounds are invalidated twice. The `DOM` protocol name `handleEvent` is invoked as a plain method with no `Event`.
- **Current behavior / contract:** the member exists so the operation can be passed to `listenForInvalidation` as an `EventListenerObject` (`behavior.ts:121`). The same concept is named `invalidate()` on `MotionConstraint`, `DropTargetTracker`, `InsertionGeometry` and `RectIndex`.
- **Why it is a problem:** technical-english.md "one concept, one name": a reader of `invalidate` sees `operation.handleEvent()` and cannot tell it is the stale-marking entry. The double call is idempotent, so no behavior changes, and it shows that one of the two call sites is not needed.
- **Evidence:** the two files above; `tests/` has no test that depends on the second call.
- **Required property:** each cache is marked stale by one call per invalidation, and the operation's invalidation entry is named for what it does wherever it is called outside a DOM listener.

### cleanup-4 — `shared/timing.ts` is a module with one importer after the lift stopped using the defaults

**Tier C.**

- **Finding:** `src/shared/timing.ts` holds `DEFAULT_LANDING_DURATION` and `DEFAULT_LANDING_EASING`. Its only importer is `src/shared/landing.ts:2`. `remediation-report.md` (`cleanup-9`) placed the defaults there so the lift and the landing shared them. `DRD-33` moved the animation out of the lift, and `feature-composition-report.md` states that `lift.ts` no longer imports `shared/timing.ts`.
- **Current behavior / contract:** `layoutAnimation` keeps its own `DEFAULT_DURATION` and `DEFAULT_EASING` in its own module (`layout-animation.ts:31-32`), so the package has two conventions for a feature's defaults.
- **Why it is a problem:** Part II §2.1: a boundary that owns nothing the one module that uses it could not own. The reason the boundary was drawn (two owners of one default) has expired. It costs no bytes (the constants inline), so this is about the module map only.
- **Evidence:** `grep -rn timing.ts packages/drag/src` has one importer.
- **Required property:** a module boundary has more than one reason to exist, or the module is not there.

### cleanup-5 — The built-ins import a non-public kernel type, which `DRI-18` says they do not

**Tier C.**

- **Finding:** `src/sortable/operation.ts:3` and `src/free-drag/operation.ts:2` import `type { VerdictAwaiter } from '../kernel/behavior.ts'`. `draggable.ts` does not export `VerdictAwaiter`, although `BehaviorOperation.drop` names it in a published signature.
- **Current behavior / contract:** `contract.md` `DRI-18`: "`sortable` and `freeDrag` import only public `draggable` and `lift` values and types from the kernel."
- **Why it is a problem:** the contract sentence is false by two imports (type-only, so no bundle or runtime effect). Either the type is part of the surface a consumer writing a `drop()` may name, or the built-ins do not need it.
- **Evidence:** `grep -rn "kernel/" packages/drag/src/{sortable,free-drag}` shows exactly these two. The shipped `kernel/behavior.d.ts` declares `VerdictAwaiter` without a re-export from `draggable.d.ts`.
- **Required property:** the contract's statement of what the built-ins import is true of the code. Which side changes is a surface decision for the architect (§13), not a cleanup.

### cleanup-6 — Comments that name identifiers or history the code no longer has

**Tier C.**

- **Finding:**
  - `src/shared/invalidation.ts:1`: "Calls `onInvalidate` on scroll…". The parameter was renamed from `onInvalidate` to `listener` in the range (`git diff d7e7b0d3a..HEAD -- src/shared/invalidation.ts`).
  - `src/sortable/linear-shift.ts:84`: "Written only inside `DEV` branches". The guard is `__DEV__`.
  - `tests/authoring.declaration.test.ts:215`: `// @ts-expect-error \`false\` no longer declines.` narrates a past contract.
  - (`RectIndexView`'s comment is cleanup-1.)
- **Why it is a problem:** CONTRIBUTING §Comments: check factual claims against the code, and "argue for what is, never about what was". A grep of backticked identifiers in `src/` comments against `src/` code finds only `onInvalidate` and `DEV` unmatched, so these two are the whole of the stale-name class in `src/`.
- **Required property:** each comment names the parameter or flag as it is, and the declaration test states the property it checks (a `false` return is not an operation), without history.

### cleanup-7 — The `tap` browser command is defined, declared and never used

**Tier C.**

- **Finding:** `tests/support/commands.node.ts:80-91` defines `tap` (CDP `Emulation.setTouchEmulationEnabled` and `Input.synthesizeTapGesture`), and `tests/support/browser-commands.ts:13` declares it. No test or bench calls it. `click-guard.browser.test.ts:290` says a synthesized tap produces no click in this environment.
- **Why it is a problem:** a harness command with no caller is test machinery that a reader must understand and keep compiling. It predates the range (`cb0a4a235`) and sits in a file the range changed.
- **Evidence:** `grep -rn "tap" packages/drag/tests packages/drag/bench` returns only the two declarations. Every other command has a caller (`touch`, `emulateReducedMotion`, `forceGarbageCollection`, `countHeapObjects`, `startHeapSampling` and `stopHeapSampling` have one file each).
- **Required property:** the harness declares the commands that a test uses.

### cleanup-8 — The same test and bench helpers are defined in several files beside the shared harness

**Tier C.**

- **Finding:** these definitions repeat:
  - `const row = (id) => document.querySelector(#id)!`: `activation`, `focus`, `landing`, `order` tests (4 copies).
  - `focusableList(count)`: `focus` and `order` tests (2 copies, same body).
  - `makeBox(parent)` and `mount(box, config)`: `free-drag.browser.test.ts:24,34` and `commit.browser.test.ts:31,41`. `makeBox` is byte-identical; `mount` differs by a default argument and an `onEnd` logger.
  - The heap-snapshot reading: `tests/support/commands.node.ts` (`countHeapObjects`, with its `HeapSnapshot` type) and `bench/heap-snapshot.ts` (`takeSnapshot`, with a verbatim `HeapSnapshot` type) both collect `addHeapSnapshotChunk` chunks and decode `node_fields`.
  - `PROTOTYPE_REVISION = '599684791'`: `bench/compare.ts:35` and `bench/size/measure.ts:23`. The two scripts also each archive that revision with `git archive`.
- **Why it is a problem:** one concept with several definitions: a change to the harness's list builder or to the pinned revision has to be found in each copy, and `tests/support/harness.ts` already is the shared place for the first three.
- **Evidence:** `grep -n "^const row\|^function focusableList\|^function makeBox\|^function mount" packages/drag/tests/*.ts`; the two bench lines above.
- **Required property:** each shared helper and the pinned prototype revision have one definition. Where sharing is deliberately avoided (a test file that must stay standalone), the file says why.

### cleanup-9 — `d8d57383e` left library-created shapes outside `packages/drag` declared as interfaces, after CONTRIBUTING was clarified to make them types

**Tier C.** Outside the scope of `DRO-13`, which is for `packages/drag`.

- **Finding:** `d8d57383e` (2026-11-08) converted object shapes to interfaces under the rule "an interface is a type whose purpose is an object that provides operations. Something implements it, a class or a factory's object literal" (`.plan/interface-contracts-report.md` §Scope). `2bec0c431` (2026-11-09) clarified CONTRIBUTING: "Use `type` for the shapes of concrete values the library creates and gives to callers, including objects with function members… The possibility of writing `implements` does not make a value shape an implementation contract." Still interfaces and still library-created values that nothing outside implements:
  - `packages/core/src/traits/reorderable.ts:346,421,806`: `CommitTracker`, `DragSession`, `KeyboardSession`, each created by one factory in the same file and not exported.
  - `packages/tproc/src/index.ts:4`: `TokenManager`, the type of the single value `t`, and exported.
  - `packages/vite-traits-plugin/tests/helpers.ts`: `Flattening`, returned by a test helper.
  - In `packages/drag`'s tests and bench: `GroupMove` and `CanvasGroup` (fixture), `ReactFixture`, `CdpSession` and `Page`, `Lifted`, `Named`, `Held`, `PageContext`, `Scenario`. `DRO-13` lists only the controllers, `FrameTask` and `LinearShift`.
  - Kept as interfaces for a reason I checked: `ModuleLoader` (host-provided), `ConverterOf` (consumers pass their own), `Behavior`, `BehaviorOperation`, `Landing`, `MotionConstraint`, `DisplacementSink`, `InsertionGeometry`, `DropTargetTracker`, `Module` (the size-limit plugin protocol).
- **Why it is a problem:** the repository has two answers to one question, and `DRO-13`'s "a later reading checks each remaining declaration" has no owner for the packages it does not name. `TokenManager` is exported, so its declaration can be merged by a consumer, the same reason `DRD-38` recorded for `Drag`.
- **Evidence:** `git show d8d57383e`; `.plan/interface-contracts-report.md` lines 18-30; CONTRIBUTING change record 2026-11-09.
- **Required property:** each declaration's kind follows the rule as clarified, or a record says which are deliberately kept. This touches the public surface of `tproc`, so it is for the architect (§13), not a cleanup.

## What I examined and found justified

- **`CallbackList` and the gate (`Gesture.enter`, `#applyRequests`, `Session`).** The list's two factories and its stored method name are `DRD-36`/`DRO-12`'s accepted design. Every method has a caller in both owners, and `runDragDisposer` and `runDisposers` each own a failure rule (report and continue). `raiseInPass` has one caller and owns the idle-versus-running transition.
- **Controller wrappers in `sortable()`/`freeDrag()`** (`requestCancel`, `requestDestroy`, `invalidate`). They exist because `DRD-34` withdrew the detached-call guarantee of `DraggableController` while the built-in controllers keep it. Each owns that guarantee.
- **Dev-only instruments** (`countRefused`, `verifyEquivalence`, `advanceUnchecked`). `DRO-9` accepted the former; the others fold under `__DEV__` and are not in the shipped build (`define: { __DEV__: 'false' }`).
- **Duplicated resolution brand and factories in the two `domain.ts` files, the `localDelta` fallback in `geometry.ts` and `layout-animation.ts`, and the three `*/landing.ts` re-export modules.** The first two are deliberate (§7, `remediation-report.md` `cleanup-9`); the entries are contract-mandated.
- **`free-drag/geometry.ts`.** `buildGeometry` and `buildRequest` have one caller each, but the module owns the derivation of the published `DragGeometry` and `FreeDragRequest` fields from numbers already held (a value rule, §2.1's exception).
- **`SortableBehavior.landing` and `FreeDragBehavior.landing`.** They alias `config.landing ?? null` and are read once per drop. I did not file this: it is a one-line normalization with no cost, and the same two classes keep `axis` (a real default) and `bounds` (a real construction) beside it.
- **Runtime machinery serving a TypeScript-only concern:** none. `Writable`, `SetNonNullable`, `declare const RESOLUTION`, `this:` parameters and the overload lists emit no code. `type-fest` is a devDependency and the shipped declarations do not import it.
- **Published JSDoc:** no decision id, `.plan` link, date or history in any shipped `.d.ts`. The only decision pointer in `src/` is the bare `DRI-8` in `free-drag.ts:60`, which §5.2 allows.
- **Configuration:** `eslint.config.ts` (root `method-signature-style` off, package `unbound-method` off with its reason), `files.json`, `package.json` exports, `typedoc.json`/`tsconfig.docs.json` and the `.scripts/vitest-config.ts` `forEngine(name)` change each own what they state. `tests/exports.node.test.ts` ties the entry list to `files.json` and `package.json`.
- **Not done by design:** no size composition measures `freeDrag + dropTargets`; that is a measurement-coverage question for §15, and the report's figures for `DRO-10` come from the feature-composition record.