# Probe 2 review 4 — pre-implementation consistency, correctness and cost review

## Verdict

The central direction remains plausible and worth implementing:

- the kernel owns transition selection, frame publication, attempts, cancellation
  and teardown;
- behavior and feature state stay private rather than accumulating in one public
  runtime container;
- features are assembled once into fixed slots and pipelines instead of being
  interpreted as runtime plugins;
- release is split into two commits around motion closure;
- landing trajectory quality is separated from the authoritative final pin;
- unused feature-frame machinery is not prebuilt.

Those choices are generally aligned with correctness, hot-path performance,
bundle isolation and maintainability.

The consolidated contract is not implementation-ready yet, however. Several
normative paths cannot be implemented from the declared capabilities, several
Tier-A/Tier-B claims are not actually enforced, and a few traces produce the
opposite result from the stated lifecycle. The most important problems are
concrete correctness failures rather than matters of taste:

1. the behavior calls a private geometry-cache invalidator no declared feature
   seam exposes;
2. the stable allocation-free feature view cannot be constructed while frame
   references remain kernel-private;
3. the coalesced frame task is read before any normative step creates it;
4. collection publication mutates private runtime during a discarded prepare;
5. removing `landing()` incorrectly removes an independent readiness hold;
6. a behavior frame part can overwrite kernel frame fields in production;
7. release and settlement can be stranded by legal `null` or missing gate calls;
8. the FIFO counterfactual for reentrant cancellation is reversed.

The recommendation is a focused contract correction before implementation, not
another architecture reset. The private-kernel/fixed-slot model can survive the
changes below.

Severity in this review is about the proposed contract:

- **Blocker** — the normative design cannot be implemented coherently, or permits
  a concrete lifecycle failure.
- **High** — a promised guarantee is false or an important failure path is
  undefined.
- **Medium** — implementation could proceed, but a cost, extension boundary or
  public contract would be decided accidentally.
- **Low** — local type/editorial inconsistency that should be removed to keep the
  documents executable as a specification.

Documents 00–06 are treated as normative. `challenge-response.md` is treated as
frozen provenance, as requested by
`contract-probe-2/00-index.md:17-21`.

## Blockers

### 1. `vertical()` is private, but the behavior directly reaches its cache

`SortableContribution` exposes `resolveInsertion` and `retire`, but no geometry
invalidation operation:

- `contract-probe-2/03-feature-composition.md:67-83`
- `contract-probe-2/06-vertical-sortable-trace.md:21-29`

The ownership table is even stronger: the rect index is private to `vertical()`,
escapes only through its closures, and is not reachable by the behavior:

- `contract-probe-2/03-feature-composition.md:204-224`

The lifecycle nevertheless calls `rects.markDirty()` directly from behavior
code during activation, placeholder movement and release:

- `contract-probe-2/02-kernel-behavior-contract.md:201-220`
- `contract-probe-2/03-feature-composition.md:275-277`
- `contract-probe-2/06-vertical-sortable-trace.md:104-117`
- `contract-probe-2/06-vertical-sortable-trace.md:199-206`
- `contract-probe-2/06-vertical-sortable-trace.md:235-245`

As written, this cannot compile without breaking the claimed privacy boundary.
If the calls are omitted, scroll, resize, collection replacement, placeholder
movement and release can search stale geometry.

The contribution should expose the capability the behavior actually needs. A
small single-writer geometry slot is enough:

```ts
type InsertionGeometry = Readonly<{
  resolve(/* existing arguments */): Insertion | null;
  invalidate(): void;
  retire(): void;
}>;
```

Alternatively, add a direct `invalidateInsertion` slot alongside
`resolveInsertion`. In either form, `vertical()` retains the cache and the
behavior receives operations rather than state.

### 2. The stable feature view conflicts with private frame ownership

`InsertionView` requires a `current` frame:

- `contract-probe-2/03-feature-composition.md:179-188`

The document says one stable object per controller structurally satisfies every
feature view, with no materialization:

- `contract-probe-2/03-feature-composition.md:199-202`
- `contract-probe-2/06-vertical-sortable-trace.md:209-213`

But the declared `SortableRuntime` has no `current` or `draft` field, has
`realm` nested under `host`, and has a nullable `placeholder`:

- `contract-probe-2/01-construction-ownership.md:152-162`

The kernel exclusively owns the swappable frame references:

- `contract-probe-2/01-construction-ownership.md:179-183`

Finally, `action.prepare` receives only `draft`, while the trace calls insertion
resolution with `current.pointerY`:

- `contract-probe-2/02-kernel-behavior-contract.md:548-552`
- `contract-probe-2/06-vertical-sortable-trace.md:187-198`

There is therefore no stable object with an up-to-date `current` property unless
the behavior stores a kernel frame reference, mutates an adapter on every call,
uses a getter through a new kernel capability, or allocates a view per call.
Each option contradicts a stated property.

Pass already-existing values separately instead:

```ts
resolveInsertion(
  frame: Readonly<InsertionFrameView>,
  runtime: Readonly<InsertionRuntimeView>,
): Insertion | null;
```

The `draft` or committed frame already satisfies the frame view structurally,
and a stable behavior-owned runtime object can satisfy the non-frame view. This
keeps the call allocation-free without leaking the kernel's swappable references.
It also removes the duplicated `pointerY` in the current `InsertionView` and
`InsertionRule` signature.

### 3. The coalesced frame task is never created

The runtime and construction trace initialize `frame` to `null`:

- `contract-probe-2/01-construction-ownership.md:153-162`
- `contract-probe-2/06-vertical-sortable-trace.md:30-31`

Activation only registers optional cancellation:

- `contract-probe-2/02-kernel-behavior-contract.md:209-212`
- `contract-probe-2/06-vertical-sortable-trace.md:110-111`

The first active pointer move then calls `rt.frame.schedule(...)`
unconditionally:

- `contract-probe-2/02-kernel-behavior-contract.md:173`
- `contract-probe-2/06-vertical-sortable-trace.md:146-152`

No normative document calls `createFrameTask` or assigns `rt.frame`. The first
move is consequently a null dereference.

Choose and document one lifetime:

- create once per controller and reuse it across operations, cancelling it on
  retirement; or
- create during admission/activation, register cleanup before publishing it, and
  clear it on retirement.

Creating it lazily on the first move would contradict the first-move allocation
claim. The shipped package's explicit operation setup at
`packages/drag/src/sortable/runtime/actions.ts:456-460` is the current behavioral
reference.

### 4. Collection publication breaks the transition model

`ActionTransition.prepare` returns `true | null`:

- `contract-probe-2/02-kernel-behavior-contract.md:548-552`

The collection table instead returns `false` in every discard path, so the
representative code does not typecheck:

- `contract-probe-2/03-feature-composition.md:434-440`

Changing `false` to `null` is necessary but insufficient. Collection prepare
publishes `rt.snapshot` and dirties feature geometry before it returns the
discard signal:

- `contract-probe-2/02-kernel-behavior-contract.md:176`
- `contract-probe-2/03-feature-composition.md:416-440`
- `contract-probe-2/06-vertical-sortable-trace.md:443-445`

That contradicts the decision that `Prepared` is the channel for staged state so
a discarded transition need not touch private runtime:

- `contract-probe-2/00-index.md:117`
- `contract-probe-2/02-kernel-behavior-contract.md:31-55`
- `contract-probe-2/05-lifecycle-invariants.md:21`

This is not merely an external-effect distinction. A reentrant cancel or destroy
can invalidate preparation after the private runtime has already been changed,
and a later queued action can observe the replacement even though the action was
described as discarded.

Prefer a staged result:

```ts
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  insertion: Insertion | null;
  cancelReason: unknown | null;
}>;
```

`prepare` calculates against the replacement. After revalidation, `effect`
publishes the behavior snapshot, invalidates geometry, and queues cancellation
when required. If collection publication is intentionally non-transactional,
define a separate action envelope and narrow D-3/I-3 to frame publication; do
not call the action a discarded transaction while publishing its private state.

### 5. Absence of landing incorrectly bypasses independent readiness

The architecture correctly declares landing and authored-presentation readiness
as independent gates:

- `contract-probe-2/02-kernel-behavior-contract.md:341-369`
- `contract-probe-2/05-lifecycle-invariants.md:26-28`

`settlement.effect` holds readiness whenever the resolution carries a promise,
independently of whether `startLanding` exists:

- `contract-probe-2/02-kernel-behavior-contract.md:179-180`

The contract then says that with no `landing()` feature the behavior holds
nothing and finalizes in the same drain:

- `contract-probe-2/02-kernel-behavior-contract.md:405-407`
- `contract-probe-2/06-vertical-sortable-trace.md:312-315`

The trace makes the contradiction executable: it has already taken the readiness
hold at lines 293–295 before it conditionally takes the landing hold at lines
296–307.

No `landing()` means **no landing hold and no landing runner work**. It cannot
mean no readiness hold. Same-drain finalization is valid only when neither gate
is held. Amend I-9 and the preserved probe-1 requirement accordingly.

### 6. Default-open readiness and `authored = false` disagree

Settlement attempts initialize `authored` to `false`, and only an explicitly
held readiness promise can set it to `true`:

- `contract-probe-2/02-kernel-behavior-contract.md:349-369`
- `contract-probe-2/02-kernel-behavior-contract.md:459-464`

The document then interprets absence of `presentationReady` as “the authored DOM
never changed” and forbids re-anchoring:

- `contract-probe-2/02-kernel-behavior-contract.md:489-494`
- `contract-probe-2/06-vertical-sortable-trace.md:440`

That is not the usual meaning of an optional readiness promise. Absence means the
consumer asserts that its authored presentation is ready synchronously. A
consumer may imperatively apply the reorder before returning `accept()`, and the
semantic-gap disturbance from F-15 can already exist at settlement entry. The
shipped package likewise treats no readiness promise as ready:

- `packages/drag/src/sortable/runtime/actions.ts:1133-1148`

The contract needs separate concepts:

1. whether authored presentation is ready;
2. whether this outcome/recovery should re-anchor to the semantic item.

For an accepted destination outcome, an absent readiness promise should mean
authored-ready now. For a pending promise it becomes ready on successful
settlement; rejection/timeout remains not ready. No-op and recovery-home paths
may deliberately keep their existing physical anchor based on outcome, not by
overloading `authored = false`.

If `holdForLanding` starts the runner immediately, the order of readiness and
landing method calls also changes semantics. A cleaner kernel implementation can
record requested holds during `settlement.effect`, seal the scope, then start the
watch/runner after it knows the complete gate plan.

### 7. Behavior frame parts can overwrite kernel fields

The claimed Tier-A protection is:

```ts
type Draft<Part extends object> = Part & Readonly<KernelFrame>;
```

- `contract-probe-2/02-kernel-behavior-contract.md:16-20`
- `contract-probe-2/04-frame-slicing.md:170-187`

`Part extends object` does not forbid a mutable `phase`, `operation` or
`pointerY` property. In TypeScript, a mutable property in one side of an
intersection remains assignable despite the other side being readonly.

At runtime, composition assigns the behavior part after the kernel literal, so a
collision overwrites the kernel's value:

- `contract-probe-2/04-frame-slicing.md:57-69`

The only collision check is dev-only:

- `contract-probe-2/04-frame-slicing.md:245-261`

Consequently the claims that the behavior “cannot name” or misinitialize kernel
fields, and I-5's Tier-A classification, are false in production.

Enforce disjointness twice:

- at the authoring boundary, reject
  `Extract<keyof Part, keyof KernelFrame>` or represent kernel keys as optional
  `never` on valid parts; and
- during one-time construction in production, reject any own string or symbol key
  that collides before calling `Object.assign`.

`Draft` may still use an `Omit<Part, keyof KernelFrame> &
Readonly<KernelFrame>` projection for defense in depth. The “no `Omit` anywhere”
claim is not worth preserving over correctness.

### 8. The generic transition driver has unsafe discard and failure semantics

The driver is said to run once for every transactional seam:

- `contract-probe-2/02-kernel-behavior-contract.md:59-80`

It has several incompatible callers:

- An `effect` throw is promised to become a classified failure, but the driver
  does not catch it. Under the queue contract it instead escapes to panic and
  destroys the controller.
- `rollback` can throw, but its failure policy is unspecified.
- Activation acquisition has seam-specific cleanup after a prepare discard, but
  that cleanup is absent from the generic driver.
- The activation trace performs a second `preparationValid()` after `effect` and
  relies on it to suppress `START_COMMITTED`; the generic driver has no
  post-effect check (`06-vertical-sortable-trace.md:118`,
  `06-vertical-sortable-trace.md:434-436`).
- `release.prepare` may legally return `null` after motion has closed. The test
  matrix merely observes that the frame remains `RELEASING`
  (`05-lifecycle-invariants.md:321-327`), but no resolution, failure or retirement
  is then guaranteed. The operation is truthful but stranded.
- `settlement.prepare` documents `null` only “after queueing a failure”
  (`02-kernel-behavior-contract.md:328-333`), but the kernel cannot enforce that
  the behavior queued one. The resolution payload has already been consumed.

Use seam-specific return contracts:

- action preparation may discard normally;
- activation discard must retire or enter a defined failure/cancel path;
- release preparation should be non-nullable, or `null` must automatically queue
  a classified failure;
- settlement rejection should return a typed failure value rather than depend on
  a preceding side call.

Show the actual drivers, including effect classification and post-callback
checkpoints, instead of presenting one driver that the trace does not use.

### 9. Resolution and settlement capabilities are not linear

`ResolutionGate` allows `open()` and `skip()`:

- `contract-probe-2/02-kernel-behavior-contract.md:302-317`

The contract does not define zero calls, duplicate calls, or `open()` followed by
`skip()`. Zero calls strands `RELEASING`; multiple calls can create competing
attempts. Settlement sealing does not apply to this earlier gate.

Similarly, `SettlementScope` has two named hold methods but does not state that
each may be called at most once. Repeated readiness calls can overwrite the
watch, increment the hold count twice and release it once.

Both capabilities need explicit `unused → used → sealed` state. Seal the
resolution gate immediately when `release.effect` returns, require exactly one
choice, and convert a missing choice into a classified internal/behavior failure.
Reject or report duplicate choices without creating more work.

A smaller alternative is for preparation to return a discriminated
`ResolutionCommand` (`open` or `skip`), making the choice structural instead of
linear-by-discipline.

### 10. Synchronous landing completion is ordered inconsistently

`LandingStart` permits a custom runner to call `done` or `fail` synchronously:

- `contract-probe-2/02-kernel-behavior-contract.md:417-443`
- `contract-probe-2/03-feature-composition.md:359-374`

This includes the advertised `duration: 0` path. The prose suggests incrementing
the hold before constructing the runner:

- `contract-probe-2/02-kernel-behavior-contract.md:381-383`

The normative trace starts the runner and only afterwards sets
`landingHeld = true` and increments `holds`:

- `contract-probe-2/06-vertical-sortable-trace.md:296-308`

Depending on the producer-side guard, synchronous completion is either ignored
before the hold exists or queued against partially initialized state. Installing
the hold afterwards can strand settlement.

Reserve the hold and install a once-latched completion record before calling
`start`. Publish the returned handle before a queued completion can apply. If
`start` throws, roll the hold back deterministically. Specify and test:

- synchronous `done`;
- synchronous `fail`;
- duplicate completion;
- `done` followed by a throw;
- reentrant `destroy`;
- a returned handle whose `destroy` throws.

## High-priority correctness and guarantee issues

### 11. The reentrant-cancel counterfactual reverses FIFO

The trace says a cancel called inside `onReorder` loses because
`RESOLUTION_SETTLED` is already ahead of it:

- `contract-probe-2/06-vertical-sortable-trace.md:434-438`

But `gate.open` must invoke consumer code before it can obtain and settle the
returned resolution:

- `contract-probe-2/06-vertical-sortable-trace.md:249-260`

Nested dispatch appends in call order:

- `contract-probe-2/02-kernel-behavior-contract.md:624-645`

Therefore `cancel()` enqueues first; only after `onReorder` returns can a
synchronous result enqueue `RESOLUTION_SETTLED`. Cancel wins and the later
completion is stale. The shipped order confirms this:

- callback invocation:
  `packages/drag/src/sortable/runtime/actions.ts:925-950`;
- settlement dispatch:
  `packages/drag/src/sortable/runtime/actions.ts:952-964`;
- cancellation dispatch:
  `packages/drag/src/sortable/runtime/actions.ts:1450-1477`.

Correct the trace and add this exact reentrancy test. It is the concrete example
of `CANCEL > FAILURE_CHECKPOINT` and FIFO, not an exception to them.

### 12. Cleanup is not robust across custom callbacks

The join directly calls `LandingHandle.destroy()` before pinning and presentation
release:

- `contract-probe-2/02-kernel-behavior-contract.md:471-487`
- `contract-probe-2/06-vertical-sortable-trace.md:362-377`

The failure table covers `anchorTarget` and `retarget`, but not:

- `LandingHandle.destroy()`;
- the kernel's final `lift.write(...)`;
- `spec.finalized(...)`.

A custom runner throwing from `destroy()` can skip the pin and strand temporary
presentation. A final write failure can do the same. Presentation disposal must
be in a `finally`; runner destruction should be best-effort reported; final pin
failure may be classified, but must not prevent release. A terminal callback
failure must still lead to retirement.

Feature retirement has the same issue. `retireHooks` is a plain array, while the
kernel catches only the outer `spec.retire()`:

- `contract-probe-2/03-feature-composition.md:100-103`
- `contract-probe-2/03-feature-composition.md:132-135`
- `contract-probe-2/01-construction-ownership.md:218-240`
- `contract-probe-2/06-vertical-sortable-trace.md:413-419`

If one hook throws, later hooks do not restore their DOM. Catch/report each hook
and continue. Define order; reverse construction order is the natural ownership
order when hooks release resources acquired in declaration order.

### 13. Construction has no exception-safe unwind

A feature may create “whatever private runtime it likes” during assembly:

- `contract-probe-2/03-feature-composition.md:16-19`

Later factories, collision checks or validation can throw:

- `contract-probe-2/03-feature-composition.md:88-108`
- `contract-probe-2/03-feature-composition.md:141-147`

`draggable()` also does not define cleanup if `behavior(host)` or
`kernel.arm(spec)` throws:

- `contract-probe-2/01-construction-ownership.md:60-68`

Any already-created feature that installed a listener or needs its `retire` hook
can leak before a controller is returned.

Choose one rule:

1. feature factories and behavior construction are externally inert; all
   acquisitions occur only inside kernel-owned operation lifetimes; or
2. assembly retains completed contributions temporarily and unwinds their retire
   hooks if a later factory/validation/arm step fails.

Even with rule 1, `arm()` must specify cleanup if either frame factory, shape
validation or listener attachment throws.

### 14. Long-lived `fail(stage, error)` can fail the wrong operation

`KernelHost.fail` intentionally targets whichever operation the kernel currently
holds:

- `contract-probe-2/01-construction-ownership.md:104-115`
- `contract-probe-2/02-kernel-behavior-contract.md:666-669`

Features receive an equivalent callback at construction:

- `contract-probe-2/03-feature-composition.md:8-13`

A late async callback from operation A can therefore report against operation B.
This contradicts the otherwise strong double-validation rule for stale
continuations.

Synchronous seam throws should be caught and classified by the kernel driver.
Async-capable work should receive an operation/attempt-scoped failure callback
that captures identity and becomes inert after retirement. The long-lived feature
context should expose only platform best-effort reporting, not “fail whichever
operation is current.”

The raw `number` stage also lets a feature forge an invalid or kernel-private
stage. Use a behavior-scoped typed vocabulary if feature-initiated classified
failure remains necessary.

### 15. Full `Lifetime` values defeat Tier-B sequencing

`ActivationScope` exposes `motion` and `presentation` as full `Lifetime` objects,
including `dispose()`:

- `contract-probe-2/02-kernel-behavior-contract.md:246-271`

The document acknowledges that the behavior can close motion itself, yet I-11
claims the kernel leaves the behavior no opportunity to sequence release
incorrectly:

- `contract-probe-2/05-lifecycle-invariants.md:29`

The stated reason for rejecting a restricted façade—one new object per lifetime—
is incorrect. TypeScript structural projection is allocation-free:

```ts
type LifetimeScope = Readonly<
  Pick<Lifetime, 'signal' | 'use' | 'useWhile'>
>;
```

The kernel can pass the same physical `Lifetime` under this narrower type. This
is exactly the kind of type-level capability restriction the contract says is
sufficient; it is not a security boundary and requires no wrapper.

Also define behavior after closure. A retained scope calling `use()` after its
lifetime has disposed must not silently register a disposer that can never run.
Either make this invalid and report it, or immediately invoke the late disposer.

### 16. The disconnected-item fallback can detach the placeholder

The normative re-anchor is:

```ts
if (placeholder.nextElementSibling !== item) {
  item.before(placeholder);
}
```

- `contract-probe-2/03-feature-composition.md:333-346`
- `contract-probe-2/05-lifecycle-invariants.md:171-190`

Q-12 and the trace say a disconnected/re-keyed item falls back to measuring the
placeholder where it stands:

- `contract-probe-2/05-lifecycle-invariants.md:249-256`
- `contract-probe-2/06-vertical-sortable-trace.md:446`

Calling `before()` on a disconnected item can instead move the placeholder into
that disconnected tree, destroying the fallback target. Guard connectivity and
parentage before moving:

```ts
if (
  item.isConnected &&
  item.parentElement === placeholder.parentElement &&
  placeholder.nextElementSibling !== item
) {
  item.before(placeholder);
}
```

If the guard fails, measure the still-connected placeholder. Q-12 should be
either an open choice or a normative fallback, not both.

### 17. Frame publication safety is narrower than the Tier-A claims

`Readonly<Frame<Part>>` and absence of `current` prevent top-level property
assignment. They do not make referenced values deeply immutable.

After `Object.assign(draft, current)`, both frames refer to the same nested
objects. A custom part can contain `{ value: { mutable: true } }`; prepare can
mutate `draft.value.mutable` and thereby mutate committed state. An effect can do
the same through a shallow `Readonly`.

The shallow-copy section already recognizes the required discipline:

- `contract-probe-2/04-frame-slicing.md:205-218`

Therefore:

- I-2 is Tier A only for top-level frame slots;
- immutability/replace-on-write of their referents is Tier C;
- “effect cannot mutate any frame state” should become “effect cannot assign
  top-level frame slots.”

This distinction matters for custom behavior authoring, where the kernel cannot
inspect a part's nested values.

### 18. Several other enforcement tiers are overstated

The invariant table should be narrowed in these places:

- **I-12:** every prepare receives the entire mutable behavior part, so the type
  system does not make `release.prepare` the only seam able to write `proposal`.
  The kernel sequences release, but exclusive field authorship is behavior
  discipline.
- **I-13:** the kernel orders motion closure, but arbitrary behavior prepare/effect
  code can perform irreversible work. “Every irreversible physical action” is
  broader than the capability model.
- **I-19/I-20:** no retained DOM is not Tier B while `resetFramePart` is
  unprovable and feature retire hooks can throw before later hooks run.
- **I-24:** the final pin depends on behavior-supplied `anchorTarget`, the
  semantic-item constraint and runner cleanup. The contract also explicitly skips
  the pin when join measurement throws
  (`02-kernel-behavior-contract.md:514-520`) while still releasing presentation.
  State the invariant conditionally on successful authoritative measurement and
  pin, or define a fallback that makes it unconditional.
- **F-6:** a test that catches a forgotten gate does not structurally resolve the
  problem. Sealing detects a late hold, not a missing one
  (`02-kernel-behavior-contract.md:402-404`).

The kernel-enforced subset remains valuable; narrowing these claims makes it
credible.

## Performance and bundle-size findings

### 19. The hot-path accounting is internally inconsistent

The trace says the move path allocates nothing, then acknowledges the transform
string:

- `contract-probe-2/06-vertical-sortable-trace.md:154-157`

It counts two indirect calls, but the shown path calls at least:

1. `spec.moved(...)`;
2. `lift.composeXY(...)` or `lift.write(...)`;
3. `rt.frame.schedule(...)`.

- `contract-probe-2/06-vertical-sortable-trace.md:146-151`
- `contract-probe-2/06-vertical-sortable-trace.md:164-167`

The shipped in-place lift path can additionally allocate a `{ x, y }` projection
object:

- `packages/drag/src/kernel/presentation.ts:190-224`

Restate I-26 as something measurable, for example:

> After operation setup and queue warm-up, one pointer sample creates no wrapper,
> tuple, collection or protocol object. It creates the CSS transform string
> required by CSSOM; all supported lift modes retain a scalar projection path.

Define whether calls to stable closure methods such as `schedule` are counted as
indirect calls, then count all of them consistently. The current “two calls,
zero allocations” headline and falsifier should not survive.

### 20. “Queue enqueue allocates nothing” needs an implementation condition

Two parallel `push` calls avoid allocating an entry object, but array capacity
growth is amortized, not literally allocation-free:

- `contract-probe-2/02-kernel-behavior-contract.md:624-645`

More importantly, the current package's `dispatch` creates fresh handler and
panic arrow functions for every outer dispatch:

- `packages/drag/src/sortable/runtime/actions.ts:151-174`
- the draggable runtime uses the same pattern.

Because probe 2 says the queue is ported unchanged, specify that the new private
kernel creates its drain handler and panic callback once per controller, or
inlines the drain loop. Phrase the queue claim as “no per-entry object
allocation; pushes are amortized” unless measurement establishes a stronger
engine-specific statement.

### 21. Copying all 15 fields per move needs measurement

Every active pointer sample performs `Object.assign` over the complete kernel and
behavior frame:

- `contract-probe-2/04-frame-slicing.md:189-203`
- `contract-probe-2/06-vertical-sortable-trace.md:140-151`

The trace dismisses removing the copy as “performance theatre” without a
benchmark:

- `contract-probe-2/06-vertical-sortable-trace.md:177-180`

The transaction copy is justified for fallible prepare paths. A pointer sample,
however, only publishes kernel-owned scalar coordinates before calling a
post-commit renderer. Benchmark:

- generic 15-field `Object.assign`;
- a specialized kernel pointer publication path;
- the shipped runtime.

Keep the generic copy if it is irrelevant in an end-to-end browser trace. Do not
make that conclusion normative before the required implementation probe exists.
Also test multiple behavior frame shapes: JIT feedback may be shared across
controller closures even when each individual controller sees one shape.

### 22. Vertical insertion and layout animation duplicate geometry work

`vertical()` rebuilds/scans its private rect index when dirty:

- `contract-probe-2/03-feature-composition.md:275-277`

`layoutAnimation()` independently measures before and after the same placeholder
move:

- `contract-probe-2/03-feature-composition.md:381-405`
- `contract-probe-2/06-vertical-sortable-trace.md:191-206`

The displacement element set remains open:

- `contract-probe-2/05-lifecycle-invariants.md:279-282`

For a large list, layout reads and forced layout are likely to dominate frame
copy or callback overhead. Settle Q-7 before implementation sign-off and measure
the minimal affected-item set. If both features need the same pre-move rects,
consider a behavior-owned read phase or a small geometry read capability; do not
duplicate full-list measurement merely to preserve conceptual privacy.

### 23. The closure-per-controller decision is based on wording, not evidence

The proposal accepts roughly 16 closures and one spec object per controller even
though it records the opaque-state/static-spec alternative as better for memory
and call-site caches:

- `contract-probe-2/01-construction-ownership.md:246-262`
- `contract-probe-2/05-lifecycle-invariants.md:85-96`

The only rejection is that the kernel would “hold” an opaque behavior reference.
Holding an untyped value does not make the kernel know, expose or structurally
widen that value.

This is a reasonable first implementation choice, but performance is the
repository's first code-style priority. Measure heap and move-call behavior at
realistic controller counts before making H-2's “does not store” wording
load-bearing. If there is no material cost, keep the simpler closure model and
record the evidence.

### 24. The tree-shaking criterion names an impossible minimal build

`vertical()` is required:

- `contract-probe-2/03-feature-composition.md:141-147`
- `contract-probe-2/03-feature-composition.md:244-254`

The tree-shaking section then requires “axis geometry” to be absent from the
minimal build:

- `contract-probe-2/03-feature-composition.md:442-459`

A minimal **vertical** sortable necessarily includes vertical axis geometry. The
active brief requires it to exclude horizontal/grid geometry, free drag and
optional animation:

- `brief.md:615-637`

Define the minimal fixture exactly as:

```ts
sortable(items, vertical(), callbacks({ onReorder }))
```

Require unselected axis implementations, landing and layout animation to be
absent.

The “separate subpath per optional feature” decision also needs an import/export
table. The current package exposes only draggable and sortable entries:

- `packages/drag/files.json:1-5`
- `packages/drag/package.json:15-24`

That is not an objection to a new `drag2` topology; it means the proposal must
show the intended feature subpaths, type-only core imports and corresponding
`files.json` entries. Otherwise ergonomics may accidentally reintroduce an eager
barrel.

### 25. Bundle verification needs real fixtures and a baseline

The document correctly asks for four consumer fixtures:

- `contract-probe-2/03-feature-composition.md:442-455`

The current size configuration only measures built draggable, sortable and their
combination:

- `packages/drag/.size-limit.json:1-13`

The probe needs four actual consumer entrypoints, minified/Brotli measurements
and module-graph inspection. Add budgets only after the first measurement.

Also measure the fixed cost that feature isolation cannot shake:

- all optional keys in `SortableContribution`;
- every assembler property read and claim branch;
- nullable slot fields;
- the three always-present pipeline arrays.

That core plumbing may be entirely acceptable. Compare it with a non-composed
vertical baseline so the bundle-size claim is evidence rather than import-graph
intuition.

## Maintainability and extensibility findings

### 26. This is fixed-slot composition, not an open plugin architecture

Every new semantic seam requires coordinated edits to:

- `SortableContribution`;
- `SortableSlots`;
- `assemble`;
- validation;
- behavior invocation;
- public exports and tests.

- `contract-probe-2/03-feature-composition.md:60-138`

Features cannot currently contribute controller methods or transactional frame
state:

- `contract-probe-2/03-feature-composition.md:226-242`
- `contract-probe-2/03-feature-composition.md:461-470`

That is a good closed-world tradeoff for speed, bundle size and comprehensibility.
It is “construction-time composition of known sortable seams,” not arbitrary
third-party plugins. Use that precise description unless a supported external
authoring/versioning contract is added.

The public/internal boundary is also missing. The brief asks for it, but the
normative set does not say whether these are exported and stable:

- `Behavior`;
- `BehaviorSpec`;
- `KernelHost`;
- phase/failure/lift constants;
- `SortableFeature`;
- contribution and slot types.

If consumers should eventually author custom behaviors, they need named types and
typed constants even though no public `Kernel` object exists. If only built-ins
may author specs in v1, state that and keep the types internal.

### 27. Behavior action tags cannot request kernel lifecycle transitions

Behavior actions enter only `ActionTransition`:

- `contract-probe-2/01-construction-ownership.md:104-120`
- `contract-probe-2/02-kernel-behavior-contract.md:543-561`

They cannot request kernel-owned admission, activation or release. The brief says
keyboard sorting need not ship but the architecture should not make it
impossible:

- `brief.md:727-741`

The shipped package already has keyboard admission as a complete one-slot
operation, so this is a known rather than hypothetical pressure point. Under the
current contract it requires a kernel-contract revision, not merely another
behavior tag.

Do not add a generic event/plugin protocol now. Do explicitly record one of:

- keyboard is expected to revise the kernel contract; or
- a small typed behavior-to-kernel lifecycle intent will be reserved after an
  executable keyboard probe.

The current statement that a third/fourth tag proves the boundary is misplaced
is too absolute.

Numeric behavior tags also need validation. If the kernel computes
`BEHAVIOR_BASE + tag`, a negative or non-integer tag can collide with a kernel
action unless the runtime rejects it.

### 28. Frame parts need a plain-record and reset-shape contract

`Part extends object` admits arrays, class instances, proxies, accessors,
non-enumerable keys and symbol keys. The frame implementation assumes a fixed
plain enumerable data record:

- `contract-probe-2/04-frame-slicing.md:57-104`
- `contract-probe-2/04-frame-slicing.md:189-203`

The dev assertions use `Object.keys`, so they ignore symbol and non-enumerable
fields:

- `contract-probe-2/04-frame-slicing.md:245-269`

`Object.assign` copies enumerable symbols, but reset/reference checks do not see
them. A symbol-keyed DOM reference can therefore survive every scrub. Accessors
or prototype setters can also invalidate the assumed construction and copy
behavior.

Define behavior parts as plain, own, enumerable, writable string-keyed data
records. At one-time construction, validate:

- no kernel-key collision;
- no symbol/non-enumerable/accessor fields;
- identical keys and order from both factories.

After every dev scrub, re-check the exact key set so `resetFramePart` cannot add,
delete or redefine fields without detection. Keep reference-clearing validation
as a separate heuristic.

### 29. “A third settlement gate is a non-issue” overstates extensibility

The attempt and scope hard-code two named gates:

- `contract-probe-2/02-kernel-behavior-contract.md:349-369`

The document says a third gate is merely a third guard:

- `contract-probe-2/02-kernel-behavior-contract.md:393-399`

Adding one changes the attempt record, scope API, teardown, diagnostics, driver
and tests. That can still be a small deliberate change, but it is not free or
generic under the declared types. State that readiness and landing are product
vocabulary for v1; generalize only when a third real gate appears.

### 30. Callback and metadata normalization is under-specified

The contribution has both `callbacks?: SortableCallbacks` and a separate
`threshold?: number`, while `SortableCallbacks` itself contains `threshold`:

- `contract-probe-2/03-feature-composition.md:67-83`
- `contract-probe-2/03-feature-composition.md:279-289`

Slots flatten the callback object into five fields, but the assembly sketch only
shows generic single-writer claims and never defines flattening, defaults or
duplicate precedence:

- `contract-probe-2/03-feature-composition.md:88-138`

The trace shows `{ callbacks, threshold: 8 }` even though its call site supplies
no threshold:

- `contract-probe-2/06-vertical-sortable-trace.md:13-28`

Put threshold in one consumer-facing place, then specify that `callbacks()`
normalizes its default scalar contribution. Show the callback flattening and
validation code. Optional callback slots typed as `null` must be null-checked or
normalized to stable no-op functions before direct calls such as
`slots.onStart(item)`.

### 31. Representative TypeScript should be typechecked

Several load-bearing sketches contain compile-level errors or incomplete values:

- `Transition` constrains `Prepared extends {}`, but
  `run<P, E>(t: Transition<Part, P, E>)` leaves `P` unconstrained
  (`02-kernel-behavior-contract.md:22-29`,
  `02-kernel-behavior-contract.md:62`);
- `const ReorderResolution: Readonly<...>;` has no initializer and is not ambient
  (`03-feature-composition.md:299-309`);
- `SettlementAttempt` requires `landingHeld`, but one construction literal omits
  it (`02-kernel-behavior-contract.md:349-361`,
  `02-kernel-behavior-contract.md:377-378`);
- collection actions return `false` where only `true | null` is allowed
  (`03-feature-composition.md:434-440`).

Create a small docs typecheck fixture containing the representative contracts.
These signatures are central enough that prose review alone is an unnecessarily
weak validation method.

## Smaller consistency corrections

These do not move the architecture but should be corrected in the same pass.

1. H-6 says no aggregate intersection type exists anywhere, while the central
   private generic is literally `KernelFrame & Part`
   (`00-index.md:32`, `04-frame-slicing.md:5-8`,
   `02-kernel-behavior-contract.md:16-20`). The intended claim is that no
   participant declares a concrete whole-frame type.
2. `FINALIZING` is defined as “presentation released,” but the join commits that
   phase before target measurement, runner destruction, pin and release
   (`02-kernel-behavior-contract.md:567-576`,
   `02-kernel-behavior-contract.md:471-478`). Define it as finalization in
   progress, or commit it after release.
3. `ACTIVATING` is defined as presentation acquired and committed, while the
   placeholder becomes visible only in `activation.effect` after the phase commit
   (`06-vertical-sortable-trace.md:90-117`). Define it as activation committed,
   presentation/start effect in progress.
4. The documents alternate between five resource lifetimes and three operation
   `Lifetime` objects (`00-index.md:128`,
   `01-construction-ownership.md:186`,
   `06-vertical-sortable-trace.md:62-64`,
   `06-vertical-sortable-trace.md:419-420`). Preserve the useful taxonomy from
   the shipped design: five conceptual scopes, three named operation
   `Lifetime` objects, and only two narrowed registration scopes passed during
   activation.
5. `root` is called necessarily connected and ancestral, but `admit` may return
   any `HTMLElement` and consumer resolvers can mutate DOM
   (`02-kernel-behavior-contract.md:124-132`,
   `02-kernel-behavior-contract.md:279-289`). Validate containment/connectivity
   before capture or weaken the claim and define capture-failure recovery.
6. `05-lifecycle-invariants.md:5` says every invariant is inherited, although
   I-29 and I-30 are explicitly new.
7. `.agents/docs/drag/README.md:15` still says two reviews and F-1…F-16, while the
   normative index incorporates three reviews and findings through F-18.

## Recommended correction order

1. Repair the executable vertical path: geometry capability, feature views,
   frame-task creation, collection action staging, readiness semantics and FIFO
   trace.
2. Make the kernel protocols total: seam-specific discard behavior, one-shot
   resolution/hold capabilities, synchronous landing completion and cleanup
   `finally` paths.
3. Make frame ownership real in types and production construction checks:
   disjoint keys, plain-record shape and narrowed lifetime capabilities.
4. Reclassify invariants to distinguish top-level frame publication from
   referent/DOM discipline.
5. Define the closed-world authoring/export boundary and the expected future
   keyboard pressure point.
6. Implement the probe, then replace the hot-path and tree-shaking assertions
   with measured consumer fixtures and an end-to-end browser benchmark.

After those corrections, the architecture should be a strong implementation
candidate. The main idea does not need to change; the specification needs to
stop claiming more structure than its actual capabilities provide.
