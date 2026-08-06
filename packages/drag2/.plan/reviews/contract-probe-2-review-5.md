# Probe 2 review 5 — post-correction consistency, correctness and cost review

## Verdict

This revision is materially stronger than the one reviewed in review 4. The central architecture still looks like the right direction:

- the kernel owns machine state, publication, attempts, ingress and teardown;
- behavior and feature state remain private;
- features are assembled once into fixed slots and pipelines;
- frame and runtime views are now passed separately;
- insertion geometry is a complete `resolve` / `invalidate` / `retire` capability;
- settlement gates are independent and use request → seal → arm;
- frame-key collisions have both a type guard and a production guard;
- release and settlement preparation are non-nullable;
- optional features have proposed direct subpaths instead of an eager registry;
- the performance claims are mostly identified as measurements owed rather than asserted as results.

Those changes resolve most of review 4's architectural blockers without requiring an architecture reset.

The contract is still not implementation-ready. The remaining primary issue is systemic: a seam failure is now _classified_, but several drivers continue work that is incompatible with that failure before the queued failure checkpoint can run. Depending on the seam, the continuation retires the failed operation, invokes the consumer resolution, arms settlement work, or emits a successful terminal callback. This makes the new failure model internally inconsistent.

There are also four concrete correctness holes independent of that general driver problem:

1. an invalidating collection replacement cancels the operation but loses the replacement;
2. reentrant destruction during `LandingStart` can leak the returned runner;
3. the five settlement statuses have no total semantic mapping, and the compiled behavior turns a skipped/no-op resolution into rejection;
4. the compiled reference cannot move a placeholder into a start gap.

The compiled fixture is useful and `npx just typecheck` passes, but it currently proves the signatures and selected negative assertions, not the claimed end-to-end lifecycle. Its incomplete seam drivers allow several of the contradictions above to compile.

Severity in this review means:

- **Blocker** — a valid execution can produce a wrong lifecycle result, leak a resource, or lose consumer state.
- **High** — a promised guarantee is false or a reference path is not implementable as specified.
- **Medium** — implementation can proceed only by making an unstated decision, or a performance/bundle claim is not yet coherent enough to test.
- **Low** — editorial or local type drift that makes the documents harder to use as an executable specification.

Documents 00–06 are treated as normative. `contract-probe-2/challenge-response.md` is treated as frozen provenance, in accordance with `contract-probe-2/00-index.md:25-29`.

## What review 4 fixed

The following corrections are substantive and should be preserved:

| Review 4 issue | Current disposition |
| --- | --- |
| Missing geometry invalidation seam | Resolved by `InsertionGeometry.resolve`, `invalidate` and `retire`. |
| Unconstructible stable feature view | Resolved by separate frame and operation-runtime arguments. |
| Missing frame task | Resolved functionally by a controller-lifetime task; its allocation policy still needs measurement. |
| Private collection publication during `prepare` | Mostly resolved: successful updates publish in `effect`; invalidating updates still get lost. |
| No-landing bypassed readiness | Resolved in the gate model and main trace. A feature description still has stale same-drain wording. |
| Absent readiness meant “not authored” | Resolved: absence means synchronously ready. One test-matrix line remains stale. |
| Frame-key collisions | Resolved in principle by `FramePartOf` plus production validation. Validation details still need two corrections. |
| Generic transition driver was not total | Partly resolved: throws are caught, but the result algebra still cannot tell callers to stop. |
| Nullable release/settlement results | Resolved structurally. The semantic meaning of a skipped resolution remains incomplete. |
| Non-linear resolution and settlement gates | Resolution is now a staged value; settlement holds are named and one-shot. |
| Synchronous landing completion | The original hold race is resolved; reentrant destruction during `start` is not. |
| Join and retire-hook robustness | Normal join cleanup is much better; controller teardown and runner relinquishment need further qualification. |
| Reversed FIFO counterfactual | Corrected. |
| Hot-path and bundle overclaims | Mostly withdrawn and converted to M-1…M-4. Some stale counts and non-reproducible fixture language remain. |

## Blockers

### 1. Classified failures still continue incompatible success work

The shared core returns only a `boolean`:

- `contract-probe-2/02-kernel-behavior-contract.md:68-104`
- `packages/drag/docs/contract-probe-2/contract.ts:1138-1183`

That one bit conflates at least five outcomes:

- ordinary `prepare` discard;
- invalidation by reentrant cancel/destroy;
- `prepare` failure;
- successful commit and effect;
- committed transition whose `effect` failed.

The callers require different behavior for each outcome.

#### Activation drops its classified failure

When `activation.prepare` throws, `runCore` calls `failStage` and returns `false`. `runActivation` treats every `false` as an ordinary activation discard and immediately retires the operation:

- `packages/drag/docs/contract-probe-2/contract.ts:1149-1157`
- `packages/drag/docs/contract-probe-2/contract.ts:1192-1200`

If failure handling is queued as the documents specify, retirement makes the queued `FAILED` entry stale. `onError` may never observe the classified activation failure.

#### Release invokes the consumer after its effect failed

`release.effect` can throw while moving or rendering the final placeholder. `runRelease` classifies the throw and then unconditionally calls `openResolution(command)`:

- `contract-probe-2/02-kernel-behavior-contract.md:832-848`
- `packages/drag/docs/contract-probe-2/contract.ts:1203-1229`

The consumer can therefore receive `onReorder` for a release whose committed presentation effect failed. The failure and resolution then race through the same queue.

#### Settlement may arm work after its effect failed

The normative settlement flow always seals and arms after `settlement.effect`:

- `contract-probe-2/02-kernel-behavior-contract.md:485-516`

The contract does not say what happens when the effect requests one hold and then throws before requesting the other. Arming the partial plan starts readiness or landing work for an already-failed settlement. Discarding it requires a result the generic `boolean` cannot express.

#### The join can emit success after a consequential failure

At the join, `anchorTarget` and `lift.write` failures are classified, but `spec.finalized(current)` still runs afterward:

- `contract-probe-2/02-kernel-behavior-contract.md:623-637`
- `contract-probe-2/02-kernel-behavior-contract.md:697-706`
- `packages/drag/docs/contract-probe-2/contract.ts:1283-1317`

The committed frame may still contain `OUTCOME_ACCEPTED`, so `onFinish` can run before the queued failure changes the outcome. This contradicts the failure rule that a failed operation reports through `onError` only.

The driver needs a discriminated internal result, for example:

```ts
type DriverResult =
  | Readonly<{ type: 'discarded' }>
  | Readonly<{ type: 'invalidated' }>
  | Readonly<{ type: 'prepare-failed' }>
  | Readonly<{ type: 'committed' }>
  | Readonly<{ type: 'effect-failed' }>;
```

The exact representation can be smaller in implementation, but each seam wrapper must distinguish the outcomes. The required rules are:

- activation retires only a normal discard/invalidation; a classified failure stays live for its failure checkpoint;
- release never invokes its resolution command after an effect failure;
- settlement invalidates the scope and discards unarmed requests after an effect failure;
- the join always releases presentation, but does not call the success/cancel terminal behavior after a consequential target or renderer failure.

Until this is total for every seam, F-19 is not resolved and the Tier-B claim “a seam throw is classified” is insufficient: classification must also stop incompatible continuation.

### 2. An invalidating collection replacement is discarded

The revised documents correctly move collection publication from `prepare` to `effect`:

- `contract-probe-2/03-feature-composition.md:627-646`
- `contract-probe-2/02-kernel-behavior-contract.md:748-771`

But the invalid paths call `host.cancel(reason)` and return `null`:

- `contract-probe-2/03-feature-composition.md:635-641`
- `contract-probe-2/06-vertical-sortable-trace.md:566-568`
- `packages/drag/docs/contract-probe-2/contract.ts:912-923`

`null` prevents `action.effect` from running. The cancel is eventually applied, but `rt.snapshot` and `rt.view.snapshot` keep the old collection. After retirement the next press can therefore start against stale items unless the consumer happens to repeat the update.

An invalid collection ends the _current drag_; it must not discard the consumer's collection update.

The staged result needs to represent both publication and cancellation:

```ts
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  rebased: Insertion | null;
  cancelReason: unknown | null;
}>;
```

`effect` should publish the snapshot, invalidate geometry, and then dispatch the cancellation last. That preserves the consumer update, retains FIFO, and keeps private publication after commit.

### 3. Reentrant destruction during `LandingStart` leaks the runner

Request → seal → arm fixes synchronous `done()` because the landing hold exists before `start` is called and the completion is queued. It does not make the returned handle safe:

- `contract-probe-2/02-kernel-behavior-contract.md:507-527`
- `packages/drag/docs/contract-probe-2/contract.ts:1235-1280`

A custom `start` may synchronously call a controller method captured by the consumer:

1. the kernel calls `start`;
2. `start` calls `controller.destroy()`;
3. teardown sees no published landing handle and retires the attempt;
4. `start` returns a live handle;
5. the arm code stores it on a stale attempt.

Nothing subsequently owns or destroys that runner. The test matrix names “reentrant `destroy()` during `start`” but specifies no mechanism:

- `contract-probe-2/05-lifecycle-invariants.md:499-503`

The kernel must revalidate controller state and attempt identity after `settlement.effect` and again after `start` returns. If the returned handle is already stale, it must be destroyed immediately, best-effort, and must never be published or advanced.

The same post-callback rule should be stated generally: reserving resources before a reentrant callback protects cleanup only for resources that already exist. A resource returned _from_ the callback needs a stale-return disposal path.

### 4. Settlement status has no total semantic mapping

The contract lists five statuses:

- fulfilled;
- rejected;
- canceled;
- skipped;
- failed.

See `contract-probe-2/02-kernel-behavior-contract.md:429-448`.

It never defines an exhaustive mapping from those statuses to outcome, recovery, domain result, callbacks and failure stage. The compiled behavior maps every non-fulfilled status to ordinary rejection and home recovery:

- `packages/drag/docs/contract-probe-2/contract.ts:853-879`

That makes `SETTLED_SKIPPED` — produced by `{ invoke: null }` for a semantic no-op — a rejected/home settlement. It contradicts:

- `contract-probe-2/02-kernel-behavior-contract.md:243`
- `contract-probe-2/02-kernel-behavior-contract.md:679-683`
- `contract-probe-2/06-vertical-sortable-trace.md:307-309`

At minimum the mapping must say:

- skipped → no-op outcome, immediate recovery, no consumer round-trip;
- fulfilled → validate an explicit `ReorderResolution`;
- rejected invocation/thenable → a named classified failure, not a consumer rejection verdict;
- cancellation → kernel cancellation semantics, not an inferred behavior rejection;
- failed → kernel failure semantics, with no second behavior interpretation.

A discriminated settlement input is safer than an open `number`:

```ts
type SettlementInput =
  | Readonly<{ type: 'fulfilled'; value: unknown }>
  | Readonly<{ type: 'rejected'; error: unknown }>
  | Readonly<{ type: 'skipped' }>;
```

Kernel-owned canceled/failed paths may not need to enter `settlement.prepare` at all. Whatever representation is selected, every case must be exhaustive in the compiled fixture and the trace.

Also, `{ invoke: null }` currently masks missing reference state:

- `packages/drag/docs/contract-probe-2/contract.ts:816-842`

Missing `view`, item, snapshot or insertion is not necessarily a semantic no-op. The skip command should be constructible only for a proven no-op proposal; broken invariants should classify a release failure.

### 5. `ACTIVATING` collection deferral contradicts FIFO

The collection table says an update received during `ACTIVATING` is queued behind the activation checkpoint and later applied as `ACTIVE`:

- `contract-probe-2/03-feature-composition.md:635-641`

But `activation.effect` calls `onStart` before the kernel dispatches `START_COMMITTED`:

- `contract-probe-2/06-vertical-sortable-trace.md:128-142`

If `onStart` calls `updateItems()`, the collection action is appended first. FIFO requires that it run before `START_COMMITTED`, not behind it. The compiled action driver contains no deferred slot or requeue rule.

Choose and specify one mechanism:

- store a single pending collection replacement while `ACTIVATING` and apply the latest one immediately after the `ACTIVE` commit;
- requeue the collection action explicitly when the handler observes `ACTIVATING`, with a bounded rule that cannot spin;
- or change the activation checkpoint/callback ordering, after checking the existing reentrant cancel/destroy guarantees.

Add an executable `onStart → updateItems()` case. The current statement cannot be obtained from FIFO alone.

### 6. The compiled placeholder writer cannot express a start gap

The compiled reference moves the placeholder only through `before`:

- `packages/drag/docs/contract-probe-2/contract.ts:845-849`
- `packages/drag/docs/contract-probe-2/contract.ts:926-940`

```ts
current.insertion?.before?.after(placeholder);
```

For a start gap, `before` is `null`, so this is a no-op. The placeholder cannot move to the start of the list. `homeInsertion` compounds the issue by producing `before: null` and `after: null` regardless of the item's real neighbours:

- `packages/drag/docs/contract-probe-2/contract.ts:732-740`

Use one canonical placeholder-move operation in action and release effects:

- if `insertion.after` exists, insert before it;
- otherwise append to the destination container.

Home insertion must contain the real identity neighbours. Keeping this logic in one helper also protects the incumbent/non-oscillation rule from divergent writers.

## High-severity findings

### 7. Admission needs a post-callback terminal check

`admit` runs consumer-supplied handle/visual resolvers during native dispatch and has access to behavior state created alongside the controller:

- `contract-probe-2/01-construction-ownership.md:97-126`
- `contract-probe-2/02-kernel-behavior-contract.md:185-193`

The trace goes directly from `admit` to minting an operation and lifetimes:

- `contract-probe-2/06-vertical-sortable-trace.md:61-78`

On a later pointerdown, a resolver can close over the already-returned controller and synchronously call `destroy()`. Without a `closed` check after `admit`, the listener continues setup and publishes a new operation on a terminal controller.

Recheck terminal state immediately after `admit` and before minting identity or acquiring resources. A throw from `admit` also remains the explicit open Q-1; the architecture should decide whether it escapes native dispatch or becomes `FAILURE_ADMISSION`.

### 8. A throwing landing `destroy()` weakens the final-position guarantee

The join catches `LandingHandle.destroy()` and continues to pin:

- `contract-probe-2/02-kernel-behavior-contract.md:623-655`
- `contract-probe-2/02-kernel-behavior-contract.md:697-706`

That guarantees presentation teardown continues. It does not guarantee the pin remains authoritative. If `destroy()` threw before canceling WAAPI or a custom rAF runner, that runner may keep writing the transform after `lift.write`.

I-24 is conditional only on authoritative measurement and pin success:

- `contract-probe-2/05-lifecycle-invariants.md:43`

It must also be conditional on successful relinquishment of runner control, or runner ownership must be redesigned so the kernel can independently and infallibly detach the runner before pinning. “Report and continue” is the right cleanup policy, but it cannot support the unconditional final-position claim.

Controller teardown has the related omission. Step 3 destroys attempts, but only `spec.retire()` is explicitly wrapped:

- `contract-probe-2/01-construction-ownership.md:269-297`

A throwing landing handle during `controller.destroy()` must not prevent lifetimes, frames, ingress and queue state from being released. State this as a per-attempt best-effort cleanup inside the seven-step teardown.

### 9. The reference collection implementation violates its own phase table

The table says:

- IDLE publishes the behavior snapshot but changes no operation-frame field;
- PENDING/ACTIVE may rebind the draft snapshot;
- RELEASING and later keep the operation's semantic snapshot frozen.

See `contract-probe-2/03-feature-composition.md:635-646`.

The compiled implementation assigns `draft.snapshot = snapshot` in every phase:

- `packages/drag/docs/contract-probe-2/contract.ts:912-923`

At IDLE this retains item elements in a frame that I-20 says should retain no DOM. At RELEASING/SETTLING it rewrites the transaction snapshot the prose says is frozen.

Branch by phase exactly as the table specifies, and add compile-fixture behavior tests. Compilation alone cannot detect this semantic drift.

### 10. Feature retirement is not actually reverse installation order

The assembler collects ordinary contribution retire hooks during feature iteration, then appends the axis feature's `insertion.retire`, and reverses the whole array:

- `contract-probe-2/03-feature-composition.md:154-205`
- `packages/drag/docs/contract-probe-2/contract.ts:521-581`

For features `[vertical, layoutAnimation]`, this produces:

```text
[vertical.retire, layoutAnimation.retire]
```

The claimed reverse installation order is:

```text
[layoutAnimation.retire, vertical.retire]
```

`insertion.retire` must be recorded at the point its contribution is installed, not appended after validation. The current unwind path also omits it if a later feature factory or final validation throws.

Keep an ordered disposer per contribution, or record the insertion disposer in the same iteration as the contribution that supplied it. Then reverse exactly once.

### 11. Frame validation permits an own `__proto__` data key

Production validation checks the prototype, symbols, descriptors and kernel keys:

- `contract-probe-2/04-frame-slicing.md:90-116`
- `packages/drag/docs/contract-probe-2/contract.ts:1084-1120`

A plain object can still have an own enumerable writable `__proto__` data property created with `Object.defineProperty`. It passes those checks. `Object.assign(createKernelFrame(), part)` then invokes the target's inherited `__proto__` setter and mutates the frame prototype instead of creating a normal field.

Reject `__proto__` explicitly, or compose with own-property descriptors onto a null-prototype/fixed target. Since the fixed-record model depends on an ordinary prototype, explicit rejection is the smaller change.

The documents also claim that proxies are rejected. A proxy over a plain target can report an ordinary prototype and descriptors and pass these checks. Do not claim general proxy detection; define proxy use as unsupported discipline.

### 12. “Closed” authoring is structurally open

D-22 and the public-boundary section say only built-ins author behavior specs and sortable features:

- `contract-probe-2/00-index.md:156`
- `contract-probe-2/03-feature-composition.md:706-722`

But public APIs accept structurally typed values:

- `draggable(root, behavior)` accepts a `Behavior`;
- `sortable(...features)` must accept values structurally compatible with `SortableFeature`.

Not exporting the type name does not prevent contextual authoring. A consumer can pass a matching function literal.

If closed-world authoring is a correctness boundary, brand built-in values with an unexported `unique symbol` or accept an internal token unavailable to consumers. If the intention is only “possible but unsupported”, say that instead. The current wording overstates what TypeScript enforces.

The public export table is also incomplete:

- `contract-probe-2/03-feature-composition.md:683-718`

It omits several public option/result/controller types named immediately below the table, does not say where the shared feature input type is declared, and places generic `draggable` under `sortable.js` without deciding the fate of the existing `draggable.js` entry. Separate declaration files also need a stable, resolvable identity for any type shared between subpaths.

Before bundle measurement, write the exact runtime and type export manifest, including direct import statements for the “minimal fixture”.

### 13. Action-tag validation cannot happen at `arm()` as declared

The contract says behavior action tags are validated at `arm()`:

- `contract-probe-2/02-kernel-behavior-contract.md:773-777`
- `contract-probe-2/05-lifecycle-invariants.md:483-487`

But `BehaviorSpec` declares no list or maximum tag, and `KernelHost.dispatch(tag, argument)` accepts an arbitrary number:

- `contract-probe-2/01-construction-ownership.md:97-108`
- `contract-probe-2/02-kernel-behavior-contract.md:166-219`

There is therefore nothing to validate at arm time. Add static tag metadata to the spec/config, or validate every dispatch. If the latter is chosen, correct the stated timing and cost.

## Cross-document inconsistencies

### 14. The execution trace is not fully consolidated

Several statements in document 06 predate the corrected contracts:

- `06-vertical-sortable-trace.md:329-333` discusses `release.prepare` returning `null`, although the type is non-nullable.
- `06-vertical-sortable-trace.md:341-355` shows both `return true` and `return { ready: ... }` from settlement preparation.
- `06-vertical-sortable-trace.md:398-403` lists an accepted resolution with no readiness as same-drain, even though the shown composition installed `landing()` and therefore still holds the landing gate.
- `06-vertical-sortable-trace.md:566-568` says ACTIVE collection prepare returns `true` and invalidates geometry, and SETTLING publishes then returns `null`; the corrected model returns a staged `PreparedCollection` and publishes in `effect`.

The test matrix also says no readiness means no re-anchor:

- `contract-probe-2/05-lifecycle-invariants.md:521-527`

That directly contradicts `authoredReady = true` for an absent promise and the correct counterfactual at `06-vertical-sortable-trace.md:561`.

The `landing()` feature description has a smaller version of the independent gate contradiction:

- `contract-probe-2/03-feature-composition.md:533-536`

Without landing, pinning is in the same drain only when readiness is also open.

These are not harmless narrative leftovers: document 06 is the artifact readers are told to use to “see it run”.

### 15. The compiled fixture does not implement the advertised seam drivers

The index describes `contract.ts` as containing a reference behavior implementing every seam and “the kernel's seam drivers”:

- `contract-probe-2/00-index.md:14-20`
- `contract-probe-2/00-index.md:101-106`

The exposed reference kernel has drivers for activation, release, `armSettlement` and finalization:

- `packages/drag/docs/contract-probe-2/contract.ts:1032-1049`
- `packages/drag/docs/contract-probe-2/contract.ts:1331-1338`

It has no admission driver, action driver, settlement prepare/effect driver, readiness watch/timeout driver, landing completion driver, queue, cancellation state machine or failure checkpoint. `openResolution` is empty, and the landing `done` callback is a no-op:

- `packages/drag/docs/contract-probe-2/contract.ts:1186`
- `packages/drag/docs/contract-probe-2/contract.ts:1262-1275`

The attempt field also drifts: prose uses `readinessHeld`, while the fixture uses `readinessArmed`.

This middle ground is risky. At 1,400+ lines the file looks executable enough to be trusted, but its omissions mean typecheck cannot catch the most important lifecycle errors.

Choose one role:

1. keep it a deliberately narrow type fixture containing contracts and negative type assertions, and remove the end-to-end reference claims; or
2. make it an executable reference state machine and add behavior tests for every driver.

The second provides more value, but should not become an untested second implementation. In either case, the prose and fixture need one stated source of truth.

### 16. Smaller type and policy inconsistencies

- `contract-probe-2/04-frame-slicing.md:5-8` says no aggregate intersection type exists anywhere, while the same document and H-6 use `KernelFrame & Part`. Use the corrected formulation from `00-index.md:43`: no _participant authors a concrete whole-frame shape_; the kernel's private generic is an intersection.
- Frame-part validation is described as once per controller, but `composeFrame()` validates each result and is called twice: `04-frame-slicing.md:62-68`, `packages/drag/docs/contract-probe-2/contract.ts:1117-1120,1342-1344`. Both results must be validated because the factory may be nondeterministic. Say “twice per controller”; the construction trace currently validates only the first result at `06-vertical-sortable-trace.md:41-47`.
- A reset key-set comparison cannot detect a descriptor redefinition, despite the comment at `04-frame-slicing.md:322-326`. Re-run descriptor validation in dev after reset if that is a promised diagnostic, or narrow the claim.
- Duplicate/late settlement holds are said to report through `onError` at `02-kernel-behavior-contract.md:542-545`, while the non-consequential best-effort channel is explicitly the platform reporter with no `onError` at `02-kernel-behavior-contract.md:708-714`. Use the platform reporter, or add a failure stage and define its outcome.
- `ActivationScope` can be stored by behavior code, so `02-kernel-behavior-contract.md:319-320` should say the capability becomes closed/late-use-safe, not that nothing can be stashed.

### 17. Pointer capture and click claims are stronger than the contract

The capture rationale says `root` is necessarily a connected ancestor and the trace says a below-threshold press never suppresses a click:

- `contract-probe-2/02-kernel-behavior-contract.md:360-378`
- `contract-probe-2/06-vertical-sortable-trace.md:61-85`

The API does not enforce that `admit`'s visual is inside `root`, and consumer resolvers can mutate or detach either element. Also, admission already calls `preventDefault()` at pointerdown, so “never suppresses a click” does not follow from delaying pointer capture.

Validate `root.isConnected` immediately before capture, define capture failure as activation failure, and weaken the ancestry/click statements to what the API actually guarantees.

## Performance and bundle review

### 18. Hot-path accounting is still inconsistent and not end-to-end

The corrected sections say three indirect calls:

- `contract-probe-2/00-index.md:75-77`
- `contract-probe-2/06-vertical-sortable-trace.md:182-220`

D-8 and the findings summary still say two:

- `contract-probe-2/00-index.md:142`
- `contract-probe-2/00-index.md:172`

Even “three” is scoped to the work after MOVE dispatch:

1. `spec.moved`;
2. `lift.composeXY`;
3. `frame.schedule`.

The trace labels the boundary `pointermove × N` but omits listener → dispatch → pre-created drain-handler calls required by the queue. An in-place coordinate mapper may add another indirect call, and `requestAnimationFrame` scheduling is conditional.

Either name the metric precisely — “three behavior/presentation calls after MOVE dispatch for the scalar lift modes” — or leave the end-to-end count to M-1. Comparing equal scoped work is more useful than defending one headline number.

Allocation language also still conflicts:

- `01-construction-ownership.md:104-108` says two pushes, no allocation;
- `02-kernel-behavior-contract.md:867-874` correctly says no per-entry object but amortized array-capacity allocation;
- `06-vertical-sortable-trace.md:197` says nothing else allocates.

Use “no per-entry wrapper; capacity growth is amortized” everywhere. I-26 calls the path “Measured” at `05-lifecycle-invariants.md:45`, while the index says no hot-path number has been measured and M-1 is still owed. “Counted by inspection” is the honest current status.

### 19. The eager frame task moves, rather than removes, an allocation

The revised design creates one frame task per controller:

- `contract-probe-2/01-construction-ownership.md:162-181`
- `contract-probe-2/02-kernel-behavior-contract.md:285-297`
- `contract-probe-2/06-vertical-sortable-trace.md:34-39`

This fixes the null dereference and avoids creating it on activation. It also adds a controller-lifetime object/method/closure graph to controllers that may never activate, whereas the shipped package creates the task during activation.

Neither policy is automatically faster. Add eager reusable versus lazy per-operation/reusable frame task to M-2, measuring:

- heap for many cold controllers;
- heap for active controllers;
- first-drag latency;
- repeated-drag allocation and retention;
- effect on call-site shape.

This is a measurement issue, not a reason to revert the functional fix.

### 20. The bundle measurement plan is directionally right but not reproducible

The proposed topology and M-3 identify the right questions:

- minimal composition;
- plus layout animation;
- plus landing;
- complete composition;
- feature-matched non-composed baseline.

See:

- `contract-probe-2/03-feature-composition.md:648-735`
- `contract-probe-2/05-lifecycle-invariants.md:421-436`

Before using the results as an architecture decision, specify and check in:

- exact fixture import statements;
- exact runtime and type export map;
- bundler, target, minifier and alias configuration;
- minified and compressed reporting method;
- repetition/noise policy;
- module-graph assertions for absent optional features;
- the current shipped `packages/drag/sortable.js` as a separate migration context baseline.

The shipped entry is not feature-equivalent to the proposed minimal composition, so it should not replace the feature-matched non-composed baseline. Report both: one answers composition overhead, the other answers migration context.

M-1 through M-4 remain appropriate pre-implementation gates. In particular, Q-7/M-4 should decide whether vertical geometry and displacement can share a layout-read pass before their APIs harden.

## Recommended correction order

1. Replace the driver's boolean result with a total seam-outcome model and write every per-seam continuation rule.
2. Define the exhaustive settlement-status mapping and make skipped/no-op a first-class semantic result.
3. Preserve invalidating collection updates by staging cancellation in `PreparedCollection`.
4. Add post-callback revalidation for admission, settlement effect and landing start, including stale returned-handle destruction.
5. Correct the placeholder writer and phase-specific collection behavior in the compiled reference.
6. Make normal join and controller teardown agree on runner-failure semantics; qualify I-24.
7. Resolve ACTIVATING collection deferral and action-tag declaration.
8. Decide whether `contract.ts` is a type fixture or executable lifecycle reference, then make its claims match.
9. Consolidate documents 00–06 and remove the stale trace/test statements.
10. Freeze the public/type export manifest and run M-1…M-4 with checked-in fixtures before implementation choices become expensive to move.

## Minimum executable tests before implementation

The existing test matrix is broad, but these cases are the ones the current revision specifically fails to define or models incorrectly:

- activation `prepare` throws → exactly one `onError`, operation retires after failure handling;
- release `effect` throws → `onReorder` is never invoked;
- settlement `effect` requests one hold then throws → no watch or runner starts;
- join target/write failure → presentation releases, no `onFinish`, exactly one `onError`;
- skipped resolution → no-op/immediate, never rejected/home;
- rejected resolution promise → named failure semantics;
- invalid collection replacement → new snapshot publishes, then cancellation;
- `onStart` calls `updateItems()` → explicitly defined ACTIVE/deferred result;
- `LandingStart` calls `destroy()` then returns a live handle → handle destroyed once and never retained;
- `settlement.effect` calls `destroy()` → no gate arms;
- admission resolver calls `destroy()` → no new operation is minted;
- start-gap and end-gap placeholder movement;
- home insertion carries real neighbours;
- collection update at IDLE does not retain DOM in frames;
- collection update at SETTLING does not replace the operation snapshot;
- landing handle destruction throws during normal join and controller destroy;
- second frame factory returns a colliding key;
- an own `__proto__` frame-part key is rejected;
- duplicate/late hold uses the chosen diagnostic channel;
- direct-subpath bundle fixtures prove unselected modules absent.

## Final assessment by goal

| Goal | Assessment |
| --- | --- |
| Correctness | The ownership and publication model is much improved, but failure continuation, settlement statuses, collection invalidation, reentrancy and placeholder movement are implementation blockers. |
| Performance | Hot work remains direct and fixed-slot by design. Exact call/allocation claims need tighter boundaries, and M-1/M-2 must decide frame copy, lift projection, closure and frame-task costs. |
| Bundle size | Direct optional-feature subpaths are the right approach. The export manifest and checked-in M-3 fixtures must exist before isolation is considered demonstrated. |
| Maintainability | Private runtimes, paired geometry capability, frame/runtime views and explicit ownership are good. The current prose/fixture duality and incomplete driver result algebra would make implementation and future review error-prone. |

The recommendation remains a focused correction pass, not an architecture reset. Once the driver outcomes and the concrete blockers above are resolved, the pluggable fixed-slot architecture is a strong candidate for implementation and measurement.