# Interface contracts report

**Input:** `drag/production` at `153068f92`. **Governing record:** [`CONTRIBUTING.md`](../CONTRIBUTING.md) Part I §TypeScript as changed by that commit, and the owner's brief for this unit. **The owner chose in this session** to switch off `@typescript-eslint/method-signature-style` (§Lint configuration). No `RD`, `RF` or `RQ` entry is minted.

**Outcome:** the implementation contracts in maintained TypeScript code are declared as interfaces. Detached-safe members are function-type properties, and receiver-dependent members stay methods. Every emitted `.js` file of the five built packages is byte-identical to the base. **`unbound-method` now reports extraction of the displacement sink's members**, which it did not at the base.

## Scope

**Included:** every tracked `.ts` and `.tsx` file outside the excluded paths below. A scan of all 252 object-shaped type aliases and every `implements` clause in that set found the candidates. Each candidate was then read and classified.

**Excluded:**

- `packages/drag2/`. The `drag` record keeps drag2 in the tree as reference evidence and as the "before" arm ([`00-index.md`](../packages/drag/.plan/00-index.md)).
- Everything under `.plan/`, including probes and the pseudo-code in [`contract.md`](../packages/drag/.plan/contract.md).
- Build outputs and other generated files.

**Classification.** An interface is a type whose purpose is an object that provides operations. Something implements it, a class or a factory's object literal, and callers call through it. A type is a data record: options and configuration objects, even with callback members, plus results, requests, CSS property maps, event maps and test-case tables.

## Converted to interfaces

| Package | Declarations |
| --- | --- |
| `core` | `ConverterOf`; `CommitTracker`, `DragSession` and `KeyboardSession` in `traits/reorderable.ts` |
| `drag` source | `Behavior`, `BehaviorOperation`, `Drag`, `DraggableController`, `FreeDragController`, `SortableController`, `Lift`, `MotionConstraint`, `FrameTask`, `DisplacementSink`, `InsertionGeometry` |
| `drag` tests and bench | `GroupMove` and `CanvasGroup` (fixture), `ReactFixture`, `CdpSession` and `Page` (`commands.node.ts`), `Lifted` (two files), `Named`, `Held`, `PageContext` and `Scenario` (`compare.ts`) |
| `tproc` | `TokenManager` |
| `vite-traits-plugin` | `ModuleLoader`; `Flattening` (tests) |
| `size-limit-preset-rolldown` | `Module` |

Interface data properties gained `readonly`. No converted declaration needed mutability: `KernelDrag` remains `Writable<Drag>`.

**Existing interfaces brought into line:** `CustomElementStatics.formAssociated` and `observedAttributes`, and `Trait.brand`, become `readonly`. `JSModule` in `.scripts/css/debug.ts` is a data record, so it becomes a `Readonly<>` type alias.

**Kept as types:** `FreeDragConfig`, `SortableConfig`, `LandingOptions` and `KeyboardListenerSet`, which are options. `AxisContext`, which is per-activation data. `Commit`, and the two `Pending` resolver records in `generation.ts` and `verdict.browser.test.ts`. `MockMutationObserverInstance`, and the intersection data types (`FreeDragRequest`, `CheckableHost`, `FieldElement`, `State` in `resize-handle.ts`). Global augmentations are unchanged.

## Member syntax

**Function-type properties, because the members work detached:**

- `DraggableController`, `FreeDragController` and `SortableController`. [`contract.md`](../packages/drag/.plan/contract.md) §`draggable` states that no controller method depends on `this`. `classes.browser.test.ts` destructures them. `freeDrag` and `sortable` assign `kernel.requestCancel` and `kernel.requestDestroy` into their own controllers.
- `ConverterOf.from` and `to`. `operator.get` and `operator.set`, and `useAttributes`, destructure them. Every built-in converter is an arrow function, or a shorthand method that does not read `this`.
- `PageContext.metrics`. `compare.ts` destructures it at seven sites, and `openPage` builds it as a closure.

**Methods, because they are called on their object or the contract states method calls:** the behavior and operation hooks, which the kernel calls as methods; `DisplacementSink`, whose docblock allows `this`; and every other converted member. `Drag` and `Lift` keep the method syntax [`contract.md`](../packages/drag/.plan/contract.md) gives them. Both are closures today, but no document promises that they work detached.

## Lint configuration

`@typescript-eslint/method-signature-style` came from `eslint-config-vaadin` with the default `property`-forbidding setting, method shorthand only. It reported all 11 controller properties. It would also report `ConverterOf` and `metrics`. Left on, it makes CONTRIBUTING's function-type properties impossible. It also explains why the scan found **no** function-type property signature anywhere in the scanned tree. Turned off in [`eslint.config.ts`](../eslint.config.ts), at the owner's choice among three options: switch the rule off; keep methods with `this: void`; keep methods and add narrow disables.

## Unbound-method witness

A scratch file in `packages/drag/src/sortable/` declared a `sink: DisplacementSink` and a `controller: DraggableController<unknown>`, and extracted `const { settle } = sink`, `sink.report`, `const { retire } = sink` and `const { requestCancel } = controller`. It was linted with the package config and then deleted.

| State | `unbound-method` reports |
| --- | --- |
| `153068f92` | **None** |
| This change | `settle`, `report`, `retire`. **None** for `requestCancel`, a detached-safe property |

So the conversion **restores detection** for the sink, as [`callback-follow-up-report.md`](../packages/drag/.plan/callback-follow-up-report.md) §Finding expected of method syntax without `Readonly<>`. The same now holds for every converted contract's methods.

## Checks

| Check | Result |
| --- | --- |
| `npx just typecheck` (root, 15 tasks), and `tsc -p tsconfig.json` at the root for `.scripts/` | Passes |
| Handoff loop (fmt, lint-fix, fmt, lint) on every changed file, per package and for the two root files | Clean |
| ESLint over all of `core`, `drag`, `material-x`, `tproc`, `vite-traits-plugin` and `size-limit-preset-rolldown`, with `core` rebuilt first | The same 8 findings as at the base, in unchanged files: `no-unnecessary-condition` ×5, `no-unnecessary-type-arguments` ×2 (`free-drag/geometry.ts`), `no-unnecessary-type-parameters` ×1. None is new |
| `just build` of `core`, `drag`, `tproc`, `vite-traits-plugin` and `size-limit-preset-rolldown`, compared with the base | **All 335 emitted `.js` files are byte-identical** |
| `drag` `just test` | 3 failed, 344 passed (347). The 3 are the `size.node` rows that already fail at the base |
| `core` `just test` | 263 passed |
| `vite-traits-plugin` `just test` | 52 passed |
| `tproc` `just test` | 1 failed, 70 passed. `TokenPackageProcessor` › "should apply inheritance and render declarations" fails identically at `153068f92` |

## Limits

- **Emitted declarations change.** The public types of `core`, `drag` and `tproc` are now interfaces. Consumer code relying on a type alias's implicit index signature, such as assigning a `Drag` to `Record<string, unknown>`, no longer compiles. The controllers' members are properties, so a consumer class written against the old method shape no longer matches. Nothing in this repository does either.
- `material-x` tests and `drag`'s `just test-engines` were not run. `material-x` sources didn't change, and the runtime witness is the byte-identical JavaScript.
- `size-limit-preset-rolldown` has no test recipe.
- Classifying a type as a contract or a data record is a judgement under the criterion above. Of the kept types, `FreeDragConfig` and `SortableConfig` are closest to the line.

## Next

The owner inspects the branch. No PR is opened, and the combined review isn't started.