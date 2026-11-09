# Callback-list model

**A model for the owner's inspection, not a decision.** Nothing here is adopted. No `D-*` is minted, and the contract and `00-index.md` are unchanged.

**Base:** `4d7019a5f` on `drag/step-queue-model`, which extends the [step-queue model](step-queue-model.md). The owner's uncommitted edit in the worktree was discarded on the owner's authority. It renamed `runFirst` to `run`, read the private field directly instead of through a local, and requested `this.axis.invalidate` with `this.axis` as its receiver. The model is at `d50e4b67a`.

**Compared with:** `25a67d4a9`, the production base, and `72ae8d715`, the step-queue model.

## 1. What the model does

- **One container,** [`CallbackList`](../src/kernel/callback-list.ts), replaces `StepQueue`. It stores each callback and its receiver in two adjacent slots of one array.
- **Its operations:**
  - `has(callback, receiver)` checks for a duplicate. It is separate from insertion.
  - `add` always appends.
  - `runFirst` and `runLast` remove an entry, then call it.
  - `waiting` and `clear`.

  The list never decides when or whether to run anything, and never handles a throw.

- **Three separate instances:**
  - `Gesture#steps`: controller steps.
  - `Gesture#disposers`: controller cleanup.
  - `Session#disposers`: operation cleanup.
- **Steps coalesce by callback and receiver.** `requestStep` checks `has` before `add`. Every `use` call adds its own entry, so the same pair added twice runs twice.
- **Gesture keeps pass control and precedence.**
  - Its reader runs `#steps.runFirst` in the base's position.
  - `runDisposers` in [`src/kernel/drag.ts`](../src/kernel/drag.ts) walks a disposer list with `runLast`. It reports each throw through `raise` and continues. Teardown and an operation's release both call it.
- **Late `use`** still runs at once through `runDragDisposer`, which now takes a receiver. It is not "add, then walk". That would change cleanup order when a disposer calls `use`, because the nested walk would run the remaining disposers before the rest of the adding disposer.
- **The signatures,** on `Drag` and `DraggableController`, gain the same pair of overloads as `requestStep`:
  - `use(dispose: (this: undefined, …) => void)`
  - `use<Receiver>(dispose: (this: Receiver, …) => void, receiver: Receiver)`

  The public `DragDisposer` type is unchanged.

- **Capabilities are passed with their receivers:**
  - `drag.requestStep(this.axis.invalidate, this.axis)` and `drag.use(this.axis.retire, this.axis)` in [`src/sortable/behavior.ts`](../src/sortable/behavior.ts). The `#invalidateGeometry` method and the `#retireAxis` arrow field are removed.
  - `kernel.use(displacement.retire, displacement)` in [`src/sortable.ts`](../src/sortable.ts). The wrapper closure is removed. The displacement sink is a capability slot too.
  - `placeholder.remove` and `frame.cancel` could be passed the same way. They are not capabilities, so they are left as they are.

## 2. Checks

At `d50e4b67a`, in the worktree:

- **`npx just typecheck` passes.**
- **`npx just lint` passes** on the eight changed `.ts` files.
- **`npx just test` in Chromium:** 372 passed and 6 failed. Every failure is a size test (§3).
- **The focused checks:**
  - [`tests/callback-list.browser.test.ts`](../tests/callback-list.browser.test.ts) has 19 tests. They check:
    - the list alone: duplicate checking apart from insertion, `runFirst` and `runLast` from either end, and a throw that leaves the remaining entries;
    - every step property from the step-queue model;
    - operation cleanup run last in first out, on each receiver, mixed with receiver-free entries, and once per call;
    - the walk continuing past a throw;
    - a late disposer added inside the walk, which runs at once between the halves of the disposer that adds it, and one added after release;
    - controller cleanup, including the same reentrancy and a late `use` after teardown;
    - a step requested from a disposer during teardown, which does not run;
    - the axis and the displacement sink called on themselves, with spies that record each receiver.
  - [`tests/callback-list.declaration.test.ts`](../tests/callback-list.declaration.test.ts) checks that a declared receiver is required and must match, for both `requestStep` and `use`. It also checks that operation cleanup cannot take a step's argument type.
- **The per-sample allocation test passes.**

**Mutations** ([`callback-list-mutations.txt`](probes/step-queue/callback-list-mutations.txt)). Each was applied alone to `d50e4b67a` and then restored. All fourteen typecheck.

| Mutation | Caught by |
| --- | --- |
| C1. `has` ignores the receiver | 3 callback-list tests |
| C2. Steps never coalesce | 3 callback-list tests and both DRI-8 coalescing tests |
| C3. Controller cleanup coalesces | 1 callback-list test |
| C4. Operation cleanup coalesces | 1 callback-list test |
| C5. The walk runs first in first out | 2 callback-list tests, 3 DRI-9 release tests and 1 DRI-7 test |
| C6. `runLast` drops the receiver | 4 callback-list tests |
| C7. The walk stops at the first throw | 1 callback-list test, 2 DRI-7 tests and 1 DRI-9 test |
| C8. An operation's late `use` is listed instead of run | 1 callback-list test and 5 DRI-8, DRI-9 and DRI-10 tests |
| C9. The controller's late `use` is listed instead of run | 1 callback-list test and 1 DRI-9 test |
| C10. A late `use` drops the receiver | 2 callback-list tests |
| C11 to C13. `axis.retire`, `axis.invalidate` or `displacement.retire` passed with no receiver | **Only** the spy test. The built-in axes and sink are closures that never read `this`, so no behavior test can fail |
| C14. Teardown does not clear the steps | **Nothing.** The clear only releases references |

**Not run:** Firefox and WebKit, the `compare` bench, and a browser heap reading.

## 3. Costs

### Size

Each figure is minified / Brotli bytes from `node bench/size/measure.ts` ([`callback-list-size.txt`](probes/step-queue/callback-list-size.txt)). `d50e4b67a` gave the same figures in two runs. The other columns are from [`size.txt`](probes/step-queue/size.txt).

| Composition | Base `25a67d4a9` | Queue `72ae8d715` | List `d50e4b67a` | List − base | List − queue |
| --- | --: | --: | --: | --: | --: |
| draggable alone | 6321 / 2066 | 6538 / 2145 | 6683 / 2174 | +362 / +108 | +145 / +29 |
| draggable + lift | 11132 / 3838 | 11349 / 3931 | 11494 / 3951 | +362 / +113 | +145 / +20 |
| example: resize handle | 8978 / 3181 | 9195 / 3262 | 9340 / 3293 | +362 / +112 | +145 / +31 |
| example: drop zone | 12771 / 4462 | 12988 / 4556 | 13133 / 4581 | +362 / +119 | +145 / +25 |
| example: canvas group | 9114 / 3179 | 9331 / 3260 | 9476 / 3286 | +362 / +107 | +145 / +26 |
| freeDrag | 14770 / 4897 | 14987 / 4987 | 15132 / 5006 | +362 / +109 | +145 / +19 |
| freeDrag + bounds + landing | 15935 / 5331 | 16152 / 5418 | 16297 / 5446 | +362 / +115 | +145 / +28 |
| sortable + y | 19474 / 6345 | 19692 / 6429 | 19812 / 6447 | +338 / +102 | +120 / +18 |
| sortable + xy | 19293 / 6303 | 19511 / 6391 | 19631 / 6415 | +338 / +112 | +120 / +24 |
| complete | 21147 / 6968 | 21367 / 7062 | 21489 / 7085 | +342 / +117 | +122 / +23 |

- **The kernel's share is +145 B minified over the queue model** on every composition: `has`, `runLast`, the `use` receiver paths and `runDisposers`. The `sortable` conversions save 23 to 25 B of it.
- **The size rows:**
  - `complete` (7065 B ceiling) now breaches, by 20 B.
  - The rows the queue model breached breach by more: `draggable alone` by 35 B, `freeDrag` by 39 B.
  - The `draggable alone` module-graph test still fails, because `callback-list.ts` is a seventh module.

### Allocation

Measured in V8 (Node 26.13.0) by [`heap.ts`](probes/step-queue/heap.ts), three identical rounds:

| Storage                                      | Retained bytes |
| -------------------------------------------- | -------------: |
| A bare array                                 |           32 B |
| A `CallbackList` with its array              |           64 B |
| A closure that forwards to a captured object |           56 B |

`StepQueue` had the same one private field, so it costs the same as a `CallbackList`.

| Per | Base `25a67d4a9` | Queue `72ae8d715` | List `d50e4b67a` |
| --- | --- | --- | --- |
| Pointer sample | nothing | nothing | nothing |
| Idle step request | nothing | nothing | nothing |
| Step requested during a pass | one slot | two slots, no pair object | two slots, no pair object |
| `use` registration | one slot | one slot | two slots, no pair object |
| Controller (kernel) | 2 arrays | +32 B | **+64 B** (two lists) |
| `sortable` controller | 3 forwarding closures: `#invalidateGeometry`, `#retireAxis` and, with displacement, the `retire` wrapper | −1 closure | −2 closures, and −3 with displacement |
| Operation | 1 array | unchanged | **+32 B** (one list) |

- **For a `sortable` controller,** the kernel's +64 B is roughly balanced by the two closures it saves: 2 × 56 B by this probe's reading. The instance's arrow-field context stays, because `invalidate` is still an arrow field.
- **Every operation of every composition pays +32 B.**
- **`draggable` and `freeDrag` compositions** pay +64 B per controller and save nothing.

## 4. Receiver typing and lint limitations

The repository's lint policy is unchanged. The model carries line-scoped disables with their reasons.

- **`unbound-method` reports every public or interface method passed with its receiver,** because it does not read the second argument. The three capability sites carry a line-scoped disable each, and the tests carry more. Removing a disable makes lint fail at that site.
- **A disable hides the mistake it excuses.** With `drag.use(this.axis.retire)`, that is the receiver removed and the disable kept, lint passes.
- **Private methods are invisible to the rule** in both directions, as in the step-queue model.
- **The types catch a missing receiver only when the method declares `this`.** `InsertionGeometry` and `DisplacementSink` declare `invalidate(): void` and `retire(): void` with no `this` parameter. So `drag.use(this.axis.retire)` typechecks (C11 to C13). Declaring `this` on those interface methods would make the types require the receiver. It would change the slots' private interfaces, so it is not done here.
- **`this: undefined`, not `this: void`, for the receiver-free overloads,** because oxlint's `no-invalid-void-type` refuses `void` there.
- **The argument types stay separate.** A step cannot be passed to `use`, and a disposer cannot be passed to `requestStep`: one receives an operation and the other an outcome. The declaration test checks this.

## 5. Recommendation

**Do not adopt the shared callback list.**

- **It preserves every property tested:**
  - immediate execution;
  - operation scope;
  - steps coalescing by pair while registrations stay distinct;
  - the precedence the reader controls;
  - cleanup order, continuation after a throw, and late `use`;
  - reentrancy during a walk.
- **Its costs:**
  - It makes every composition 338 to 362 B minified larger than the base, and every operation 32 B larger in memory.
  - Its only gain is two or three closures per `sortable` controller.
  - The three sites that show the gain each need a lint disable, and the disable hides a removed receiver. Neither the types nor any behavior test catches that, because today's capabilities never read `this`.

**If the owner wants receivers for `use`,** state the reason first. One shared class is the most expensive form measured so far. The inline pairs at `454d7412d` cost about 40 % of the queue model for steps. Receiver-aware cleanup has not been measured in that form.

**Next:** the owner inspects the worktree.