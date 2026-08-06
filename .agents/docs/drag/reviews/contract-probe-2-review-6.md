# Probe 2 review 6 — post-review-5 correctness and architecture audit

## Verdict

The proposal has improved substantially again. Most review-5 findings were addressed directly and coherently:

- the seam core now returns a five-way `SeamOutcome`;
- thrown prepare/effect failures stop the continuations covered by the driver;
- settlement input is discriminated;
- invalidating collection updates publish before cancellation;
- admission and landing-start callbacks have post-return revalidation;
- placeholder movement has one `after`-anchored writer;
- collection updates during `ACTIVATING` are handled rather than fictionally deferred;
- feature retire hooks are ordered correctly;
- frame validation covers `__proto__`, both factory results and reset descriptors;
- runner-relinquishment failure honestly weakens I-24;
- public subpaths, type identities, hot-path accounting and measurement prerequisites are much more explicit;
- the compiled artifact now identifies itself as a type fixture rather than an executable state-machine reference.

The fixed-slot/private-runtime architecture remains a strong direction for correctness, runtime cost, bundle isolation and maintainability.

It is still not implementation-ready. The most important remaining problem is an ownership contradiction introduced by the new settlement split:

> cancellation and failure are now declared kernel-owned and forbidden from entering `settlement.prepare`, but the state they must produce — outcome, recovery and the terminal domain result — remains behavior-owned.

The generic kernel cannot name or write those fields, and `BehaviorSpec` contains no cancellation/failure transition that can. The canceled and failed paths therefore cannot be implemented from the declared SPI.

The new “classified failure stops success continuation” rule is also incomplete in two places:

- an explicit behavior call to `host.fail()` does not change `SeamOutcome`;
- landing creation classifies failure, rolls back the hold, and explicitly continues the original settlement.

Both can still run success work before a queued failure checkpoint.

The recommendation remains a focused correction pass, not an architecture reset. Resolve terminal-state ownership and make failure latching uniform at every classification entrypoint before implementation.

Severity in this review means:

- **Blocker** — the generic architecture cannot express a required lifecycle, or a valid execution can violate terminality/failure semantics.
- **High** — a promised correctness or public-contract guarantee is false.
- **Medium** — implementation requires an unstated choice, or a measurement/type claim is not yet reliable.
- **Low** — local editorial drift that can still mislead implementation.

Documents 00–06 are treated as normative. `challenge-response.md` remains frozen provenance.

## Review-5 disposition

| Review-5 finding | Current disposition |
| --- | --- |
| Boolean driver conflated discard/failure | **Mostly resolved.** `SeamOutcome` handles thrown transition failures. Explicit `host.fail` and landing-arm failures bypass it. |
| Invalidating collection update was lost | Resolved: `PreparedCollection.cancelReason`, publication first, cancellation last. |
| Reentrant destroy leaked a returned landing handle | Resolved after `start`; a revalidation point is still missing after arm-time `anchorTarget`. |
| Settlement status had no total mapping | The three behavior inputs are exhaustive. Removing canceled/failed inputs created a new ownership hole. |
| `ACTIVATING` collection deferral contradicted FIFO | Resolved by handling the action in `ACTIVATING`. Cancellation ordering in the invalid case still needs one explicit rule. |
| Start-gap placeholder move failed | Resolved functionally by the shared `after`-anchored helper. Its unchanged-position guard is missing. |
| Admission could resurrect after destroy | Resolved in the normative rule and admission driver shape. |
| Runner `destroy()` weakened final pin | Resolved honestly by qualifying I-24 and making teardown best-effort. |
| Reference rebound snapshots in every phase | Resolved by phase-specific collection preparation. |
| Retire hooks were not reverse installation order | Resolved for successfully claimed contributions. Cleanup of the contribution whose claim throws is still omitted. |
| `__proto__` frame key | Resolved. |
| “Closed” structural authoring | Reworded as possible-but-unsupported. The exported stable structural feature type still conflicts with that policy. |
| Action tags could not be validated at arm | Static `config.actionTags` added. |
| Trace/fixture scope drift | Much improved, with several stale lines and missing driver signatures remaining. |
| Hot-path accounting | Correctly scoped to post-`MOVE`; enqueue allocation language is corrected. |
| Eager frame-task cost | Acknowledged as a measurement; the likely lazy-retained policy is not included. |
| Bundle measurement topology | Directionally resolved; actual fixtures remain intentionally owed by M-3. |

## Blockers

### 1. Kernel-owned cancel/failure cannot create behavior-owned terminal state

D-24 removes cancellation and failure from `SettlementInput`:

- `contract-probe-2/00-index.md:168`
- `contract-probe-2/02-kernel-behavior-contract.md:532-564`
- `packages/drag/docs/contract-probe-2/contract.ts:363-370`

The mapping table says:

- canceled → `OUTCOME_CANCELED`, home recovery, `onCancel`;
- failed → `OUTCOME_FAILED`, immediate recovery, `onError`.

But `outcome`, `recovery` and `domain` are fields of the behavior's private `Part`, not `KernelFrame`:

- `contract-probe-2/04-frame-slicing.md:50-58`
- `contract-probe-2/04-frame-slicing.md:132-155`
- `packages/drag/docs/contract-probe-2/contract.ts:773-805`

The kernel intentionally cannot name or write those fields. `BehaviorSpec` offers transitions for activation, release, settlement and behavior actions, but no canceled/failed classification hook:

- `contract-probe-2/02-kernel-behavior-contract.md:254-288`
- `packages/drag/docs/contract-probe-2/contract.ts:448-485`

Consequently:

1. a kernel `CANCEL` action can commit the kernel phase to `SETTLING`;
2. it cannot set the behavior's canceled outcome or recovery;
3. it cannot construct the canceled domain result;
4. `finalized(current)` has no canceled result to send to `onCancel`.

Failure has the same problem, plus the kernel does not know which behavior-owned recovery corresponds to the failure stage.

The compiled fixture exposes the gap:

- it defines no `OUTCOME_CANCELED` or `OUTCOME_FAILED`;
- `finalized` returns when `domain` is null;
- there is no kernel cancellation/failure-to-behavior driver.

See `packages/drag/docs/contract-probe-2/contract.ts:1214-1223`.

This is not solved by calling cancellation/failure “kernel-owned”. Ownership of the trigger and ownership of the resulting domain state are different.

Choose one complete model:

1. keep `SettlementInput` discriminated but include explicit `canceled` and `failed` cases, with an exhaustive behavior mapping;
2. add a separate non-discardable behavior terminal-classification transition for kernel cancellation/failure;
3. move normalized outcome/recovery/domain into kernel-owned generic state and give the behavior a typed adapter for its terminal result.

The first is the smallest correction. The flaw in the previous five-status API was the open numeric status and missing mapping, not the fact that behavior classified behavior-owned state.

The canceled result must also be specified. The current table shows no domain for cancellation while requiring `onCancel` to receive `SortableCancelResult`. Probe 1's preserved requirement includes cancellation reason, stage (`AT_PROPOSAL` / `AT_CONSUMER`) and an optional proposal. That product contract still needs a constructor in probe 2.

### 2. `host.fail()` bypasses `SeamOutcome`

D-23 promises:

> a classified failure stops incompatible continuation.

See:

- `contract-probe-2/00-index.md:167`
- `contract-probe-2/02-kernel-behavior-contract.md:68-141`

The promise holds when `prepare` or `effect` _throws_, because `runCore` returns `SEAM_PREPARE_FAILED` or `SEAM_EFFECT_FAILED`.

The public-to-behavior capability also allows a seam to classify without throwing:

```ts
host.fail(stage, error);
return normally;
```

The failure section explicitly declares that usage valid while `inSeam`:

- `contract-probe-2/02-kernel-behavior-contract.md:1102-1138`
- `contract-probe-2/01-construction-ownership.md:97-123`

No state connects that call to the current driver result. In the compiled fixture, `host.fail` calls `failStage`, while `runCore` remains unaware and returns `SEAM_COMMITTED`:

- `packages/drag/docs/contract-probe-2/contract.ts:1307-1324`
- `packages/drag/docs/contract-probe-2/contract.ts:1398-1439`

The same failures review 5 identified are therefore still legal:

- `activation.effect` calls `host.fail` and then `START_COMMITTED` is queued;
- `release.effect` calls `host.fail` and the resolution command invokes `onReorder`;
- `settlement.effect` calls `host.fail` and its gate plan arms;
- an action calls `host.fail` and the committed transition continues.

Either remove `host.fail` from synchronous behavior seams and require throws or `SeamRejection`, or add a per-seam failure-request latch:

```text
open seam → clear seamFailureRequested
host.fail → latch + enqueue once
after prepare/effect → if latched, return failed outcome
```

The latch must participate in post-callback revalidation, not merely enqueue a checkpoint. Otherwise classification still does not stop the window before the queue applies it.

### 3. Landing-create failure still finalizes the original settlement

Arm-time `anchorTarget` and `LandingStart` are consequential. Their throws are classified as `FAILURE_LANDING_CREATE`:

- `contract-probe-2/02-kernel-behavior-contract.md:644-650`
- `contract-probe-2/02-kernel-behavior-contract.md:851-857`
- `packages/drag/docs/contract-probe-2/contract.ts:1571-1604`

The stated response is to roll back the landing hold, open the gate and continue the settlement:

- `contract-probe-2/02-kernel-behavior-contract.md:672-673`
- `contract-probe-2/06-vertical-sortable-trace.md:422-428`
- `contract-probe-2/06-vertical-sortable-trace.md:617`

After arming, the normative flow unconditionally calls `advanceSettlement()`. If readiness is also open, the hold count is zero and the accepted/rejected settlement can finalize before the queued failure checkpoint runs.

That is the exact continuation D-23 prohibits. A consequential landing-create failure cannot both:

- become `OUTCOME_FAILED` and report through `onError` only; and
- continue the original accepted/rejected settlement to `finalized`.

`armSettlement` needs its own result, such as `ARMED`, `STALE` or `FAILED`. `FAILED` must suppress `advanceSettlement` and every terminal callback for the original settlement. Presentation still needs the failure recovery path; simply returning from the arm helper is not enough.

The synchronous `fail(error)` callback passed to `LandingStart` needs the same latch. If it fires before `start` returns, the returned runner must be destroyed and never published. The current fixture calls `failStage` and then publishes the handle because no attempt field records the failure:

- `packages/drag/docs/contract-probe-2/contract.ts:1584-1625`

The test matrix requires synchronous fail, duplicate completion and `done()`-after-fail, but no normative completion record or once latch is shown:

- `contract-probe-2/05-lifecycle-invariants.md:584-594`

Define producer-side attempt validation, a once-only completion latch, queued `LANDING_SETTLED`, and its interaction with the post-`start` stale/failure check.

### 4. `destroy()` is not total across `resetFramePart`

I-6 says `destroy()` is synchronous and terminal, with physical release complete before it returns. The seven-step teardown correctly wraps attempt cleanup, runner destruction and `spec.retire()`:

- `contract-probe-2/01-construction-ownership.md:273-315`

Step 6 calls behavior code twice:

```text
scrub(current)
scrub(draft)
  → spec.resetFramePart(...)
```

Neither the teardown description nor the compiled `scrub` wraps those calls:

- `packages/drag/docs/contract-probe-2/contract.ts:1376-1379`

If the first reset throws, it can prevent:

- the second frame from being scrubbed;
- controller ingress from being aborted in step 7;
- teardown from reaching its terminal postcondition.

This is code the kernel does not own and the API permits it to throw. Each scrub must be individually best-effort, and ingress abort must live in an unconditional final path. Preserve and report the first reset error without letting it replace the initiating destroy/panic error.

The same rule applies to `arm()` unwind. A reset failure must not replace the original arm failure or skip ingress cleanup.

Add explicit tests for first-frame and second-frame reset throws during retirement, destroy and failed arm.

## High-severity findings

### 5. The no-op reference still calls `onCancel`

The new settlement mapping correctly says skipped/no-op uses:

- `OUTCOME_NOOP`;
- immediate recovery;
- `onFinish`.

See:

- `contract-probe-2/02-kernel-behavior-contract.md:554-564`
- `contract-probe-2/05-lifecycle-invariants.md:614-619`

The reference settlement writes `OUTCOME_NOOP`, but `finalized` sends only `OUTCOME_ACCEPTED` to `onFinish`; every other non-null domain goes to `onCancel`:

- `packages/drag/docs/contract-probe-2/contract.ts:1026-1039`
- `packages/drag/docs/contract-probe-2/contract.ts:1214-1223`

So the same semantic error D-24 was introduced to remove still exists at the terminal callback boundary.

Use an explicit exhaustive outcome switch. Accepted and no-op finish; rejected and canceled cancel; failed never calls `finalized`. Avoid a binary accepted-versus-everything-else predicate when the domain has at least four non-failure outcomes.

### 6. Arm-time measurement can call `start` after synchronous destroy

D-26 correctly revalidates after `LandingStart` returns, disposing a stale returned handle. It misses the callback immediately before `start`:

```text
target = spec.anchorTarget(...)
handle = start(...)
```

See:

- `contract-probe-2/02-kernel-behavior-contract.md:642-650`
- `packages/drag/docs/contract-probe-2/contract.ts:1571-1588`

`anchorTarget` is behavior code. It can synchronously call `controller.destroy()`. The kernel then calls consumer `start` after destroy has returned, violating I-6's “no callback fires afterwards”. Cleaning the returned handle later does not undo that callback.

Revalidate operation and settlement-attempt identity immediately after `anchorTarget` and before `start`. If stale, roll back the reserved hold and return without calling the runner.

### 7. The final pointerup sample is rendered only in the trace

The `UP` action commits the pointerup coordinates. The vertical trace then renders the lift at that exact final position in `release.effect`:

- `contract-probe-2/06-vertical-sortable-trace.md:303-332`

The normative seam table and release-ordering pseudocode say release effect only moves the placeholder:

- `contract-probe-2/02-kernel-behavior-contract.md:295-313`
- `contract-probe-2/02-kernel-behavior-contract.md:1023-1040`

The compiled reference also only moves the placeholder:

- `packages/drag/docs/contract-probe-2/contract.ts:1017-1022`

Pointerup need not share coordinates with the last processed pointermove. If implementation follows the seam table/fixture, the proposal is computed from the final release point while the lift and landing trajectory start from a stale visual point.

Make the final lift render part of normative `release.effect`, using the committed pointerup coordinates, and classify its compose/style failure as `FAILURE_RENDERER_WRITE` or `FAILURE_RELEASE`. The trace and actual seam must describe one path.

### 8. `moved()` has no failure policy

`moved` owns the hot transform write and frame scheduling:

- `contract-probe-2/02-kernel-behavior-contract.md:270-272`
- `contract-probe-2/02-kernel-behavior-contract.md:295-304`
- `contract-probe-2/06-vertical-sortable-trace.md:175-190`

It is not a transition and no wrapper is specified. `lift.composeXY`, the CSSOM write, or `frame.schedule` can throw. Under the queue rules, an escaping handler throw becomes panic and destroys the controller:

- `contract-probe-2/02-kernel-behavior-contract.md:1054-1075`

That contradicts the existence of `FAILURE_RENDERER_WRITE` and `FAILURE_SCHEDULED_FRAME`, and differs from the shipped implementation's classified handling.

The kernel must wrap `moved` and classify the failure at the appropriate stage. If rendering succeeds but scheduling throws, the committed pointer and visual are still truthful; the failure checkpoint then chooses recovery. State whether one `moved` callback owns both stages or whether rendering/scheduling must be split to classify them accurately.

### 9. The public result and proposal types regress preserved requirements

The index says probe 1 remains authoritative for validated product requirements. Probe 1's proposal includes:

- version;
- from/to indices;
- before/after element identities.

Its transaction result is a discriminated union carrying rejection/cancellation reasons and cancellation stage.

The compiled probe-2 fixture reduces these to:

```ts
type ReorderProposal = { from: number; to: number };
type ReorderTransactionResult = { outcome: number; proposal: ReorderProposal };
type SortableFinishResult = ReorderTransactionResult;
type SortableCancelResult = ReorderTransactionResult;
```

See:

- `packages/drag/docs/contract-probe-2/contract.ts:90-105`
- `packages/drag/docs/contract-probe-2/contract.ts:555-557`
- probe 1 `contract/02-behavior-contract.md:155-180`

The public callback results expose a numeric outcome while the export table says outcome constants are internal. Consumers therefore cannot safely discriminate accepted/no-op or rejected/canceled results, and cancellation detail has disappeared.

Restore the preserved public proposal/result union in the type fixture and probe-2 export contract. `SortableFinishResult` and `SortableCancelResult` should be useful narrowed unions, not aliases of one numeric record.

### 10. `ReorderResolution` is a required runtime export, not only a type

The export table lists `ReorderResolution` under type exports:

- `contract-probe-2/03-feature-composition.md:733-742`

The consumer contract and trace call:

```ts
ReorderResolution.accept(...)
ReorderResolution.reject(...)
```

See:

- `contract-probe-2/03-feature-composition.md:459-472`
- `contract-probe-2/06-vertical-sortable-trace.md:335-338`

The current package likewise exports a runtime factory. The compiled fixture defines only the type union.

Move `ReorderResolution` into the `sortable.js` runtime exports while retaining the same-name type, and add the factory to the type fixture/public API check. Without it, the documented consumer cannot run.

### 11. “Public stable feature type, internal unstable shape” is not coherent

The export boundary says:

- `SortableFeature` is public and stable;
- `FeatureContext` and `SortableContribution` are internal and unstable;
- third-party feature authoring is possible but unsupported, with no compatibility promise.

See:

- `contract-probe-2/03-feature-composition.md:733-753`
- `contract-probe-2/03-feature-composition.md:762-793`

But the entire structural definition of `SortableFeature` is:

```ts
type SortableFeature = (context: FeatureContext) => SortableContribution;
```

Changing either “internal” type changes assignability and emitted declarations of the public stable type. Exporting it and accepting it in public `sortable()` makes that structure a semver surface regardless of the “unsupported” label.

The same leakage appears in:

- public `DragErrorContext` embedding internal `FailureStage`;
- public `LandingContext` embedding `DOMRealm`;
- public `draggable` accepting an unexported structural `Behavior`.

Choose one boundary:

1. truly close built-ins with an opaque/branded public feature value and do not expose the authoring function shape;
2. support and version feature authoring, exporting every structurally exposed type;
3. mark the complete surface experimental/unstable rather than public stable.

“Stable type whose full structure is unstable and unsupported” is not a maintainable third state.

### 12. Admission fixture changes semantic item identity and realm

The normative path resolves the pressed item from `rt.snapshot` using `composedPath()`, then applies the handle resolver to that item:

- `contract-probe-2/02-kernel-behavior-contract.md:295-301`
- `contract-probe-2/06-vertical-sortable-trace.md:61-78`
- `contract-probe-2/03-feature-composition.md:404-410`

The compiled reference:

1. uses `event.target` as the item;
2. if `handle` exists, assigns the returned _handle element_ to `draft.item`;
3. uses global-realm `instanceof HTMLElement`.

See `packages/drag/docs/contract-probe-2/contract.ts:913-926`.

This breaks:

- semantic item identity;
- snapshot membership checks;
- home insertion;
- `onStart(item)`;
- cross-shadow-boundary admission.

The fixture also constructs:

```ts
{
  document: (root.ownerDocument, window);
}
```

at `packages/drag/docs/contract-probe-2/contract.ts:1296`, mixing an iframe document with the global window.

Use `root.ownerDocument.defaultView`, realm-specific element checks, and a snapshot/composed-path item resolver. Apply `handle(item)` only as an admission predicate/target check; never replace the semantic item with the handle.

## Medium-severity findings

### 13. `movePlaceholder` needs an unchanged-position guard

The canonical helper always calls `before` or `append`:

- `packages/drag/docs/contract-probe-2/contract.ts:863-895`

Release always invokes the helper, including no-op/incumbent releases. When the placeholder is already immediately before `insertion.after`, `Node.before` removes and reinserts it. For an end gap, `append` can similarly reappend the last child.

The documents already explain why an already-correct reinsert is harmful:

- it resets CSS transitions;
- it forces layout;
- it can disturb displacement animation.

See `contract-probe-2/03-feature-composition.md:505-518`.

Use the shipped guard:

```ts
const unchanged =
  insertion.after === placeholder ||
  placeholder.nextSibling === insertion.after;
```

For the end gap, also confirm the placeholder is already the final child of the intended container. Invalidate geometry only when an actual move occurs.

### 14. Invalidating collection during `ACTIVATING` has ambiguous cancellation semantics

Handling collection updates in `ACTIVATING` is a good simplification. The invalidating case has this FIFO order:

1. `onStart` queues the collection action;
2. activation returns and queues `START_COMMITTED`;
3. collection effect publishes and queues `CANCEL`;
4. the already-queued `START_COMMITTED` is ahead of `CANCEL`.

See:

- `contract-probe-2/03-feature-composition.md:667-686`
- `packages/drag/docs/contract-probe-2/contract.ts:1100-1146`
- `contract-probe-2/02-kernel-behavior-contract.md:1007-1015`

The phase table gives different cancel behavior for `ACTIVATING` and `ACTIVE`. Without an immediate cancel-request latch checked by `START_COMMITTED`, the operation becomes ACTIVE before cancellation applies.

State one rule:

- `host.cancel` latches synchronously, so `START_COMMITTED` observes it and cannot activate; or
- activation commits ACTIVE and cancellation deliberately follows, with no intervening callback/ingress effect.

“Cancel transition next” is not true in this reentrant ordering.

### 15. `SeamRejection` needs an explicit discriminant

The runtime guard is:

```ts
const isSeamRejection = (v: object): v is SeamRejection => 'stage' in v;
```

See `packages/drag/docs/contract-probe-2/contract.ts:347-356`.

A structurally valid `ResolutionCommand` or `PreparedSettlement` can carry an unrelated `stage` property, especially on the explicitly possible third-party authoring surface. It will be misclassified as rejection. Conversely a proxy can make the test throw.

Use a closed discriminant:

```ts
type SeamRejection = {
  type: 'rejected';
  stage: FailureStage;
  error: unknown;
};
```

Keep successful staged values separately discriminated where structural overlap is possible.

### 16. Assembly does not retire the contribution whose first claim throws

The assembler now records `insertion.retire` in installation order, fixing review 5's reverse-order problem.

However, the first operation after `feature(ctx)` is the insertion claim:

- `contract-probe-2/03-feature-composition.md:165-175`
- `packages/drag/docs/contract-probe-2/contract.ts:650-680`

If a second axis feature contributes duplicate insertion geometry, `claim` throws before that contribution's `insertion.retire` or `retire` hook is recorded. The factory has already allocated its private state, and the unwind cleans only earlier contributions.

Capture a per-contribution cleanup composite immediately after the factory returns, before any claim can throw, or wrap claim processing in a local try/catch that retires the current contribution before rethrowing. Externally inert factories make this a retention/maintainability issue rather than a DOM leak, but the stated unwind should still be total.

### 17. Admission failure policy is both open and adopted

Q-1 says classifying an `admit` throw still needs a decision:

- `contract-probe-2/05-lifecycle-invariants.md:455-461`

The failure taxonomy includes `FAILURE_ADMISSION`, and the type fixture catches and classifies admission:

- `contract-probe-2/02-kernel-behavior-contract.md:1102-1113`
- `packages/drag/docs/contract-probe-2/contract.ts:1452-1473`

Admission runs before operation identity is minted, so the ordinary operation-scoped failure checkpoint cannot be assumed. Define whether the error:

- escapes native dispatch, preserving shipped behavior;
- reports through a controller-level/platform channel;
- or creates a short-lived operation solely for `REPORTING`.

Then make Q-1, the taxonomy and fixture agree. “Queued classified failure while the controller stays idle” is not implementable without naming its owner.

### 18. The type fixture still omits the drivers its claims name

The scope disclaimer is much better. The remaining claim says the fixture contains “the seam drivers” and proves every seam continuation is expressible:

- `contract-probe-2/00-index.md:14-29`
- `packages/drag/docs/contract-probe-2/contract.ts:1-42`

The exposed drivers are admission, activation, release, arm-settlement and finalize:

- `packages/drag/docs/contract-probe-2/contract.ts:1264-1286`
- `packages/drag/docs/contract-probe-2/contract.ts:1692-1700`

There is no action driver and no settlement prepare/effect driver, so these rules are not compiled:

- action discard/rollback continuation;
- `SeamRejection` from settlement preparation;
- settlement effect failure → discard unarmed requests;
- settlement post-effect revalidation.

Either add type-only drivers for those seams or narrow the claim to the drivers actually present. A non-executable type fixture can still typecheck complete driver signatures without implementing queue behavior.

### 19. Frame/type assertions remain slightly overstated

Several type claims need qualification:

- `FramePartOf<Record<string, unknown>>` does not reject a runtime `phase` property because `Extract<string, keyof KernelFrame>` is `never`. Production validation remains authoritative. Describe the type layer as rejecting explicitly declared literal collisions, not every possible part.
- The index/header says every Tier-A claim has an `@ts-expect-error`, but the negative assertions do not cover settlement non-nullability and several capability-absence claims. Say “each included expressible assertion” or add the missing cases.
- `contract-probe-2/02-kernel-behavior-contract.md:16-20` still calls `contract.ts` the “executable copy”, contradicting the type-fixture disclaimer.
- The fixture comment says frame validation runs once per controller even though `composeFrame` validates both results: `packages/drag/docs/contract-probe-2/contract.ts:1329-1336`.
- The construction trace validates only the first part: `contract-probe-2/06-vertical-sortable-trace.md:41-47`.
- `assertSameShape` is described as `__DEV__`-only but runs unconditionally in the fixture. That does not affect shipped cost, but it weakens fixture fidelity.

### 20. Remaining normative prose drift

- `02-kernel-behavior-contract.md:570-573` still describes five statuses and a separate status argument after replacing them with a three-case `SettlementInput`.
- Resolved Q-3 at `05-lifecycle-invariants.md:426-430` repeats the same obsolete decision.
- `SettlementAttempt` at `02-kernel-behavior-contract.md:583-598` omits `relinquished`, which its own pseudocode initializes and I-24 uses.
- `06-vertical-sortable-trace.md:402` says `authoredReady = (readiness === null) → false`; it must be true.
- `06-vertical-sortable-trace.md:430-435` names accepted/no-readiness as a same-drain example without restating that landing must also be absent/open.
- `06-vertical-sortable-trace.md:535-540` says I-24 is conditional only on measurement and pin, omitting successful runner relinquishment.
- `02-kernel-behavior-contract.md:955-957` says the spatial tag calls `host.cancel` and returns `null`; the reference spatial tag does neither.
- The action-tag test says negative/fractional dispatched tags are rejected “at arm”; arm validates the declared count, dispatch validates the actual tag.

These are individually small, but documents 02, 05 and 06 are the normative driver, decision record and executable trace. Consolidate them before code is derived from conflicting sentences.

## Performance and bundle review

### 21. M-2 omits the likely lazy-retained frame-task policy

The documents compare:

- eager once per controller;
- lazy/per-operation recreation as shipped.

See:

- `contract-probe-2/01-construction-ownership.md:175-191`
- `contract-probe-2/05-lifecycle-invariants.md:493-503`

A third policy is likely to dominate both:

> create on first activation, retain on the controller, cancel/reuse on later operations.

It pays nothing for cold controllers and does not reallocate for repeat drags. Its costs are a nullable/initialization branch and slightly different runtime typing.

Include all three in M-2:

1. eager retained;
2. lazy retained;
3. per-operation.

Do not let the current binary benchmark accidentally select a dominated policy.

### 22. Hidden-class and monomorphism language is still a hypothesis

The frame documents and trace describe:

- one hidden class per behavior type;
- monomorphic frame-access sites;
- bounded polymorphism across behaviors.

See:

- `contract-probe-2/04-frame-slicing.md:13-33`
- `contract-probe-2/04-frame-slicing.md:159-183`
- `contract-probe-2/06-vertical-sortable-trace.md:175-184`

The architecture guarantees property-key order and stable own fields. It does not language-guarantee engine map identity, field-representation transitions or where JIT feedback is shared across controller closures. M-1 correctly notes that feedback may be shared.

Label the hidden-class/monomorphism text as the benchmark hypothesis, not an established invariant. The correctness contract needs only deterministic key shape.

### 23. M-1, M-2 and M-4 need the reproducibility standard already given to M-3

M-3 specifies checked-in fixtures, build settings, compression, repetition and module-graph assertions. The other measurements name good questions but omit:

- checked-in workload/harness;
- browser engines and versions;
- warm-up and GC policy;
- controller and list counts;
- sampling/statistical policy;
- correctness-equivalence checks for the specialized pointer path;
- representative collection mutation/layout cases for M-4.

See `contract-probe-2/05-lifecycle-invariants.md:493-521`.

Mirror M-3's reproducibility requirements for M-1, M-2 and M-4 before treating them as sign-off gates.

The bundle topology itself is now directionally sound: direct optional-feature subpaths, a separate generic drag entry, type-only shared edges, feature-matched and shipped baselines. Once the runtime `ReorderResolution` export and public type boundary are corrected, M-3 can answer the intended size questions.

## Recommended correction order

1. Give cancellation/failure a behavior-visible classification path, or move the state they produce to the kernel.
2. Make every failure entrypoint latch into continuation checks: thrown seams, `host.fail`, landing arm, synchronous runner failure and join.
3. Make teardown unconditional across throwing frame resets.
4. Add the missing post-`anchorTarget` revalidation.
5. Make final release rendering and `moved` failure handling normative.
6. Restore the preserved proposal/result public contract and runtime `ReorderResolution`.
7. Choose a coherent supported/opaque/experimental feature-authoring boundary.
8. Correct the reference admission semantics and realm handling.
9. Add the unchanged placeholder guard and define ACTIVATING cancel ordering.
10. Complete or narrow the type-fixture driver claims, then consolidate the stale normative lines.
11. Run M-1…M-4 with all relevant policies and reproducible harnesses.

## Minimum executable tests added by this review

- kernel `CANCEL` constructs the complete behavior terminal state and a typed canceled result;
- failure checkpoint constructs failed recovery without `finalized`;
- behavior calls `host.fail` and returns normally from each seam → no success continuation;
- arm-time `anchorTarget` throws → no original settlement finalization;
- `LandingStart` calls `fail()` synchronously and returns a live handle → handle destroyed, no gate continuation;
- `LandingStart` calls `fail()` then `done()` and vice versa → first completion wins;
- `anchorTarget` destroys before `start` → `start` is never called;
- `resetFramePart(current)` throws → draft scrub and ingress abort still run;
- `resetFramePart(draft)` throws → ingress abort still runs;
- no-op settlement calls `onFinish`, never `onCancel`;
- pointerup at coordinates newer than the last move renders the final sample;
- `moved` compose/write/schedule throws → classified failure, not panic;
- already-correct start/internal/end placeholder gap performs no DOM reinsert;
- invalidating collection update from `onStart` has defined `START_COMMITTED`/`CANCEL` ordering;
- shadow-DOM and iframe admission preserve semantic item identity and realm;
- duplicate axis feature cleans the rejected contribution's private state;
- broad string-index frame part is still rejected in production;
- direct-subpath consumer imports the runtime `ReorderResolution` factory;
- public finish/cancel result narrowing preserves all probe-1 fields.

## Final assessment by goal

| Goal | Assessment |
| --- | --- |
| Correctness | Stronger publication, reentrancy and collection mechanics, but terminal-state ownership, explicit failure latching, landing-arm continuation and teardown totality remain blockers. |
| Performance | Fixed slots and post-dispatch hot work remain plausible. Final render/failure correctness comes first; M-1/M-2 must cover lazy-retained tasks and treat JIT shape claims as hypotheses. |
| Bundle size | Direct subpaths and separate baselines are good. Runtime/type export errors and the public feature-authoring boundary must be fixed before M-3 freezes the topology. |
| Maintainability | `SeamOutcome`, explicit collection staging and one placeholder writer are improvements. Split ownership needs one complete terminal protocol, and public stable types cannot depend on nominally internal unstable shapes. |

The architecture remains worth pursuing. The next correction should be smaller than review 5's: complete the terminal/failure protocol, align the public types, and remove the remaining fixture/trace drift. After that, executable lifecycle tests and M-1…M-4 can meaningfully decide implementation sign-off.