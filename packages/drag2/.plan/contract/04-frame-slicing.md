# 4. Transactional frame slicing

> **The frame model is unchanged by Revision 2 and by Revision 2.1 — checked, not assumed.** This header is itself an edit, so the file is not literally untouched; what is unchanged is everything normative in it — the slice, the parts, composition, shape authority, copy, reset and write protection. Both revisions were reconciled against this document and neither reaches it. The one decision that came close is **D-66**, and the reason it does not land here is worth recording, because the obvious implementation of it would have:
>
> D-66 requires a `canceled` domain result on the failure path. Storing the **classifying error** for `finalized` to read later would have meant a new behavior-part field, a `createFramePart` initialiser, a `resetFramePart` obligation and one more row in F-11's unprovable-exhaustiveness surface. Constructing the result **at the failure site** — in `settlement.prepare`, which already receives `SETTLED_FAILED { stage, error }`, writes the draft and returns the existing `PreparedSettlement` sentinel — puts it in the `domain` slot the part has carried since D-24 instead. **No field is added, so nothing in this document changes.**
>
> The other state D-66 needs — a per-operation `MINTED → STARTED → RESOLVING` marker — is **behavior-private runtime, not a frame part field**, and belongs here only as a negative: it is written post-commit from `activation.effect` and from the `invoke` closure, read in `prepare`, and never committed, so it is exactly the non-transactional private state [03](03-feature-composition.md) §Private feature state describes.
>
> The general rule that produced that, and the reason it is here rather than only in 02: **a value that can be consumed where it arrives does not become frame state.** The frame is for what a later phase must read; an error that is turned into a result immediately is not.

## One frame pair, composed from parts

There is one physical `current` and one physical `draft`. **No participant authors a concrete whole-frame shape** — not because features are forbidden from participating, but because of how the frame is composed. (H-6, D-15)

The kernel's own private generic _is_ an intersection, `KernelFrame & Part`; the claim was never that no intersection exists anywhere, and an earlier phrasing that said so contradicted the very next section of this document.

```text
     physical object, 14 fields — one map per behavior type (hypothesis)
   ┌──────────────────────────────────────────────────────────────┐
   │ phase  operation  pointerId                                  │  kernel slice
   │ originX  originY  pointerX  pointerY                         │  (7, kernel-authored,
   │                                                              │   kernel-written)
   ├──────────────────────────────────────────────────────────────┤
   │ item  visual  snapshot  insertion  proposal                  │  behavior part
   │ recovery  domain                                             │  (7, behavior-authored)
   ├──────────────────────────────────────────────────────────────┤
   │ (no feature parts: the kernel has no fold — D-10)            │
   └──────────────────────────────────────────────────────────────┘
        ▲                    ▲                        ▲
   KernelFrame        SortableFramePart        InsertionFrameView
   (kernel module)    (behavior module)        (y.ts, read-only,
    7 fields           7 fields                 two fields)
```

Each party's type names only what it authors or consumes. Assignability does the rest: `KernelFrame & Part` is assignable to `KernelFrame`, and satisfies `InsertionFrameView` structurally.

## The kernel slice

```ts
type KernelFrame = {
  phase: number;
  operation: OperationIdentity | null;
  /** `-1` means the operation is **pointerless** — see below. */
  pointerId: number;
  /** Grab point and latest committed pointer position, viewport space. */
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;
};
```

Seven fields, all kernel-written, none behavior-writable. Probe 1's kernel slice was thirteen. Six left, each for a reason the ownership model made obvious:

| Field | Probe 1 | Now | Why |
| --- | --- | --- | --- |
| `item` | kernel | behavior | The kernel never reads it. It was there because the behavior needed somewhere to put it and the frame was shared. |
| `visual` | kernel | behavior | `admit` returns the element to lift (D-5), so the kernel receives it as a value and holds the lift privately. |
| ~~`outcome`~~, `recovery` | kernel | behavior | Only read to choose a landing target and a terminal callback, both of which are behavior work under D-7 and D-16. The kernel no longer knows what a recovery is. **Corrected 2026-08-22: that reader was `outcome`'s only one and D-62/D-66 deleted it** — `finalized()` collapsed to publishing `current.domain` and nothing else — so the field was written four times and read nowhere, and it is removed. This row's reasoning still holds for `recovery`, which has three readers and stays. |
| `landingDone`, `readyDone` | kernel | _not on the frame at all_ | Gate state is per-settlement, unobservable, and read only by `advanceSettlement`. It lives on the kernel-private settlement attempt (D-7). |

### `pointerId === -1` means pointerless (D-32)

`-1` began as the idle sentinel and is now normative for a live operation too: a committed operation whose `pointerId` is `-1` was admitted by a `command` member and has no pointer. The kernel arms no pointer sample listeners and acquires no capture for it, so `MOVE`, `UP` and `lostpointercapture` are unreachable rather than filtered, and `originX/Y` and `pointerX/Y` stay at their admission values and are read by nothing. (Before D-35, they were read: the landing origin was derived from them, which is why a pointerless operation could not have been added without that change — §[02](02-kernel-behavior-contract.md) §Where the four changes touch each other.)

**The slice stayed at seven fields**, which is the result worth recording. A second _input mode_ — a whole lifecycle the kernel had never driven — cost the frame nothing, because a command's state is behavior state and travels in the behavior's part exactly as a press's `item` and `snapshot` do (13a P-2). M-1's 12→16-field cliff is untouched: it measures the _behavior_ part, and this revision adds no field to either side.

## Composition (D-15)

The behavior authors **only its own part**, and is prevented from declaring a kernel key at two independent layers.

```ts
// kernel, private. Called twice.
const composeFrame = (): Frame<Part> =>
  Object.assign(createKernelFrame(), spec.createFramePart());
```

`Object.assign` is declared `(target: T, source: U) => T & U`, so `KernelFrame & Part` falls out of the expression with **no cast**.

Two sources, in a fixed order. There is no fold over feature parts, because the first iteration has none — see §Shape authority.

### Disjointness is enforced twice

An earlier draft claimed the behavior "cannot name" kernel fields and rated I-5 tier A on the strength of `Draft<Part> = Part & Readonly<KernelFrame>`. **That was false** (review 4, §7). `Part extends object` does not forbid a mutable `phase`, and in an intersection a mutable property on one side stays assignable regardless of the other side being readonly. At runtime the part is assigned _after_ the kernel literal, so a collision silently overwrites the kernel's value, and the only check was `__DEV__`.

**At the authoring boundary**, `createFramePart` returns `FramePartOf<Part>`, which is `Part` when disjoint and an uninhabitable intersection when not:

```ts
type FrameKeyCollision<K> = Readonly<{ __kernelFrameKeyCollision: K }>;

type FramePartOf<Part> = [Extract<keyof Part, keyof KernelFrame>] extends [
  never,
]
  ? Part
  : Part & FrameKeyCollision<Extract<keyof Part, keyof KernelFrame>>;
```

A part declaring `phase` cannot be returned by any literal, and the error names the colliding key.

**It catches explicitly declared literal collisions only** (review 6, §19). `FramePartOf<Record<string, unknown>>` is just `Record<string, unknown>`, because `Extract<string, keyof KernelFrame>` is `never` — a broad index signature declares no colliding key even though a runtime `phase` property is entirely possible. ~~The production check below is the authoritative one; the type layer makes the common mistake unwriteable, not every mistake.~~ **Reversed 2026-08-25 (D-124): the type is the contract**, and the runtime collision check that restated it is deleted. A part declaring a kernel frame key is uninhabitable here, so reaching that state takes a cast or plain JavaScript — which is leaving the contract, not finding a hole in it.

~~**At construction, in production**, `validateFramePart` rejects the part before the first `Object.assign`.~~ **There is no runtime validation of a frame part. `validateFramePart` is deleted** — its last arm on 2026-08-25 (D-122), and with one arm left the function was the arm. The table below is kept, struck, as the record of what each removal buys, because every row describes a real consequence and only the _question_ changed: not _how bad is this_, but _can a conforming author reach it_.

**The authoring contract is published on `FramePartOf`** (D-122, F-100) — a plain, own, enumerable, writable, **string-keyed** data record — and the string-key term is stated there with what it protects rather than as a rule: symbol keys are copied between frames by `Object.assign` and are unseen by `resetFramePart`, `assertFrameScrubbed` and `assertFrameShapesMatch`, all of which walk `Object.keys`, so an author using one is outside the reach of the checks that would catch a retained node.

| ~~Rejected~~ | Why |
| --- | --- |
| ~~a symbol key~~ | `Object.assign` copies enumerable symbols, but `Object.keys`-based reset and dev checks never see them, so a symbol-keyed DOM reference survives every scrub. **Gate (a) passes** — nothing published said frame part keys were strings, and `{ [MY_SYMBOL]: node }` is ordinary type-legal JavaScript — **and clause (b) fails**, which is what decided it: the field is declared by the author, reset by the author's own `resetFramePart`, and invisible only to instruments that check the author's discharge of the author's own obligation. No library-owned state is corrupted; what degrades is the library's ability to tell an author their reset missed their field |
| ~~a key in `KERNEL_FRAME_KEYS`~~ | ~~it would overwrite kernel state~~ |
| ~~**`__proto__`**~~ | ~~an own enumerable writable `__proto__` _data_ property makes `Object.assign` invoke the **target's** inherited setter and mutate the frame's prototype instead of adding a field~~ |
| ~~a non-enumerable or non-writable key~~ | ~~it would not be copied by `begin()`, or would throw on write~~ |
| ~~an accessor~~ | ~~it breaks the copy and reset assumptions, and can observe the transaction~~ |
| ~~a non-plain prototype~~ | ~~arrays and class instances invalidate the fixed-record model the frame is built on~~ |

**The first two rows were removed on 2026-08-25 (D-124), and neither is the shape the earlier removals were.** The 2022-08-22 three cost the author their own field and cost the library nothing; these two corrupt the library's own frame, and they went anyway — because `CODE_OF_SIZE.md` §1.1 now asks **reachability first**, and neither state is reachable by a conforming author. `FramePartOf` makes a kernel-key collision uninhabitable at compile time, and an own data `__proto__` takes a deliberate `Object.defineProperty`. What each shape now does is asserted in `tests/kernel/frames.node.test.ts` — a colliding key is copied over the kernel's slice, and a `__proto__` data property leaves the frame with a null prototype — so the deletions are pinned outcomes rather than silences.

**The last three rows were removed from the check on 2026-08-22, and the reason is that each named the author's own contract rather than a library invariant.** Executed rather than argued — `Object.assign(createKernelFrame(), part)` is observable: an accessor is read **once, here**, into an ordinary data property, before any transaction exists to observe; a non-enumerable key is skipped, so the field is absent from **both** frames and the shape check passes; a class instance's own data fields are copied and only its methods are missing, which costs the author their own fields and the kernel nothing. **The non-writable row described a failure that cannot occur at all** — `Object.assign` uses `[[Set]]` on a fresh extensible object, so the frame's copy is writable, and nothing "throws on write". The three rows above it are the library's and stay; `tests/kernel/frames.node.test.ts` now pins each removed row's actual outcome, so the deletion is asserted rather than assumed. The definition below is unchanged: a frame part **is** a plain, own, enumerable, writable, string-keyed data record. What changed is that only the part of it the library owns is enforced.

**Proxies are not detected, and the contract does not claim they are.** A proxy over a plain target can report an ordinary prototype and ordinary descriptors and pass every check above. Using a proxy as a frame part is _unsupported discipline_, not a rejected input — the earlier claim that proxies were rejected was wrong (review 5, §11).

Validation runs on **each** factory result, so **twice per controller**: the factory is not proven deterministic (F-2), so validating only the first result would let the second introduce a symbol-keyed field.

**A behavior frame part is defined as a plain, own, enumerable, writable, string-keyed data record.** That is now a stated contract rather than an unspoken assumption of the implementation.

```ts
// sortable/frames.ts — its own fields only
type SortableFramePart = {
  item: HTMLElement | null;
  visual: HTMLElement | null;
  snapshot: CollectionSnapshot | null;
  insertion: Insertion | null;
  proposal: ReorderProposal | null;
  recovery: number;
  domain: ReorderTransactionResult | null;
};

function createSortableFramePart(): SortableFramePart {
  return {
    item: null,
    visual: null,
    snapshot: null,
    insertion: null,
    proposal: null,
    recovery: RECOVERY_IMMEDIATE,
    domain: null,
  };
}
```

**The invariant that matters is intra-controller: the two frames of one controller must have the same deterministic, stable shape.** The kernel gets that by composing from the same two sources, in the same order, twice — so both frames traverse an identical construction sequence.

**Hidden classes and monomorphism are the benchmark hypothesis, not an established invariant** (review 6, §22). What the architecture actually guarantees is deterministic own-property key order and a stable field set. It does not — and cannot — guarantee engine map identity, field-representation transitions, or where a JIT shares feedback across controller closures; M-1 explicitly notes that feedback may be shared. The _correctness_ contract needs only the deterministic key shape. Everything phrased below in terms of maps and monomorphic sites is the thing M-1 is meant to confirm or refute.

Construction-time transitions are paid twice per controller and are not a measured cost. The alternative — a single object literal listing every field — was rejected: it is marginally faster to construct and it requires the behavior to author the kernel's slice, which is the thing this decision exists to prevent.

### Cross-controller shape variance

Because features contribute no frame fields (§Shape authority), **every sortable controller in a document has the same frame shape**, whatever features it installs. Variance can only arise between _different behaviors_ — sortable versus a future free drag — so a page running one behavior has exactly one frame map and the kernel's frame-access sites are monomorphic.

Where variance does appear, it is bounded polymorphism at those sites: a handful of distinct behavior types means a handful of maps, polymorphic rather than megamorphic, each miss a map comparison on a path that already performs a fixed-shape `Object.assign`. Nothing here depends on how many controllers are simultaneously mid-gesture — multiple pointer identities can drive multiple controllers at once, and the analysis is unchanged.

The invariant the contract actually requires is the intra-controller one above. Cross-controller uniformity is a consequence of the current feature model, not something the model promises.

## Shape authority (D-10)

**The behavior owns the frame's domain shape.** In the first iteration it is the _only_ contributor of a part, and the kernel contains no machinery for any other: `composeFrame` has two sources and `scrub` has two calls, both written out literally. There is no `frameParts` array, no fold, and no way for a contribution to supply frame fields.

That is a deliberate narrowing of what an earlier draft sketched. **D-10's original prohibition was wrong** — a feature-owned part needs no aggregate type, and it does not threaten the invariant that matters, which is that _one controller's two frames_ share a deterministic shape. But being _possible_ is not a reason to prebuild it.

If it is ever needed, the shape is known and small: a contribution supplies a `createPart()` / `resetPart(frame)` pair, the kernel folds them after the behavior's part in installation order, and the feature reaches its own fields through a type declared in its own module — with prefixed string keys and an assembly-time collision check, rather than symbols, so `Object.keys()` still sees them and the `__DEV__` assertions below keep working.

**What blocks it is not the type system, it is a missing seam.** A frame field is committed transactional state, so only a `prepare` may write it — and both feature pipelines (`beforeInsertionMove`, `afterInsertionMove`) run in `action.effect`, post-commit. Admitting feature frame state therefore also means designing a prepare-phase pipeline. Neither exists, and building either for no consumer is the speculative generality the brief forbids.

Verified feature by feature — none needs committed transactional state:

| Feature | Committed transactional state? |
| --- | --- |
| `y()`, `xy()` | No. `insertion` is behavior-owned; the rect index is a non-transactional private cache, one instance per axis-feature instance. |
| `layoutAnimation()` | No. Its element map is private, non-transactional, and explicitly not a gate. |
| `landing()` | No. Gate state is on the settlement attempt; the runner handle is kernel-held. |
| `placeholder()` | No. The element lives on the behavior's private runtime; the _insertion_ is the committed state. |
| `handle()`, `visual()` | No. Construction-time resolvers with no state. |
| `callbacks()` | No. |

## Write protection

```ts
type Frame<Part extends object> = KernelFrame & Part;
type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;
```

Every `prepare` receives `Draft<Part>`: its own fields mutable, the kernel slice readable but not assignable. `draft.phase = ACTIVE` does not compile. Every `effect` receives `Readonly<Frame<Part>>`, so no top-level slot is assignable.

This costs nothing at runtime — it is the same object — and it makes probe 1's rule _"only kernel lifecycle handlers write `phase`"_ a tier-A property.

**The `Omit` is back, deliberately.** An earlier draft removed it and counted "no `Omit` in any seam signature" as a win of part separation. It is not a win: a plain intersection lets a colliding mutable `phase` in `Part` stay writable through the draft. `Omit` projects the collision away before the readonly kernel slice is intersected back in, which is defence in depth behind `FramePartOf`. The claim was not worth preserving over correctness, and the type-check cost is one `Omit` over a seven-key union at two seam signatures.

**What write protection does _not_ cover: referents.** `Readonly<Frame<Part>>` is shallow. It prevents `current.insertion = x`; it does not prevent `current.insertion.index = 4`. Since `begin()` shallow-copies, both frames reference the same nested objects, so mutating a referent mutates committed state from either side. Concretely:

- **I-2 and I-18 are tier A for top-level frame slots only.**
- **Immutability or replace-on-write of their referents is tier C**, enforced by the shallow-copy contract below and by nothing else.
- The honest phrasing is _"an `effect` cannot assign a top-level frame slot"_, not _"an effect cannot mutate any frame state"_.

This distinction matters most for a custom behavior, whose part's nested values the kernel cannot inspect.

## Copy

```ts
// kernel, private
const begin = (): void => {
  Object.assign(draft, current);
};
const commit = (): void => {
  const t = current;
  current = draft;
  draft = t;
};
```

`Object.assign` is shape-agnostic: it copies every enumerable own key — kernel, behavior alike — without the kernel knowing the behavior's field names. This is where H-6 pays off operationally rather than typographically: the kernel _cannot_ be written to depend on the full shape, because the primitive it uses does not need it.

No transition allocates a state object.

### The shallow-copy contract

Unchanged, and now an obligation on every part author. Every frame field must be:

1. a scalar; or
2. immutable from the library's point of view; or
3. replace-on-write.

`CollectionSnapshot`, `Insertion`, `ReorderProposal` and `ReorderTransactionResult` all qualify — each is published as a fresh frozen-by-convention object rather than mutated. **Never copy and then mutate a value both frames now reference.** Collections, caches, disposer stacks and attempt records live outside the frames: kernel ones in the kernel's closure, behavior ones on the behavior's private runtime, feature ones inside the feature.

## Reset

Split by author, symmetrically with composition:

```ts
// kernel, private
const scrub = (frame: Frame<Part>): void => {
  resetKernelFields(frame); // 7 fields → defaults
  spec.resetFramePart(frame); // the behavior's 8
};
```

Two calls, mirroring `composeFrame`'s two sources.

Probe 1's single behavior-supplied `resetFrame` had to clear kernel fields too, forcing the behavior to know the kernel's field list. It no longer can.

Reset runs on operation retirement — **including when the controller stays alive and idle afterwards.** After commit, the inactive frame holds the previous committed state; it is a reusable transaction buffer, not a history snapshot. An idle controller must not pin the DOM of the drag it just finished.

Destroy and panic additionally clear both frames, the queue and its arguments, the cancel latch, and every staged attempt settlement.

## Dev-only invariants

Properties the type system cannot prove. **The heading is now a misnomer and is kept anyway**, because three dated records cross-reference this section by name and rewriting them to chase a rename would cost more than the heading is worth; read it as _frame-authoring invariants_.

~~All are `__DEV__`-gated and compile out of production.~~ **Un-gated by D-108, and this section's own discriminator is why.** The kernel-key collision check was never here — it was a production check in `validateFramePart` (§Composition), _because its failure mode is silent state corruption rather than a stale reference_. **Both that check and the validator are now deleted** (D-124, D-122), which does not retract the discriminator: it survives, and these two assertions are what it still reaches. A part factory that is not deterministic and a reset that leaves a live reference are **both** silent state corruption: a retained element leaks a DOM node across every later operation. The rule already classified these as production checks; the gate is what disagreed with it.

**The premise the gate rested on expired at Revision 2.1.** `kernel/dev.ts` justified stripping author-facing assertions on the ground that _behavior authoring is not on the public surface_ and named its own revisit condition. D-61, D-70 and D-68 published behavior authoring, so the shipped build handed a third-party author `assertFrameShapesMatch(a, b) {}` — an empty stub they could not fill (F-78). All four kernel sites are cold (once per `arm()`, twice per drag at retirement, once per transaction open, one failure path), the measured cost is 282–305 B against the pre-slice tree, and the budgets re-based rather than the fix shrinking.

**`__DEV__` still exists and still has exactly one reader** (D-101): `sortable/verified-refresh.ts`'s per-frame equivalence instrument, which is genuinely hot and stays gated. `kernel/dev.ts` is retired, and `tests/kernel/vocabulary.node.test.ts` pins the binding tiers to `['sortable']`, so the kernel re-acquiring a gate fails the suite. **That pin is a declaration rule and not a prohibition** — clarified 2026-08-23 by D-117, which reached it from the other side and found the sentence reads as one. D-101 states the positive list precisely so that no tier acquires a binding _quietly_; a kernel gate would fail the suite **until it was declared**, and the declaration would be the decision. What forbids one today is D-101's other rule — that the boundary is not argued on bytes — and [05 §Diagnostics, by provenance and audience](05-lifecycle-invariants.md) applies it: a P2 diagnostic is gated only in a tier that already binds the flag, which leaves the kernel's two exactly where D-108 left the four.

```ts
// Unconditional, in every build.
{
  // F-2: intra-controller shape identity. Checked once, at arm().
  const a = Object.keys(current);
  const b = Object.keys(draft);
  assert(
    a.length === b.length && a.every((k, i) => k === b[i]),
    'drag: frame/shape-mismatch',
  );

  // Reset shape stability. Checked after every scrub, against the key set
  // captured at arm(): `resetFramePart` may not add or delete fields.
  const keys = Object.keys(frame);
  assert(
    keys.length === armedKeys.length &&
      keys.every((k, i) => k === armedKeys[i]),
    'drag: frame/scrub-shape-changed',
  );

  // A key-set comparison cannot see a *redefinition* — a field turned into an
  // accessor or made non-writable keeps its key and its position. If that
  // diagnostic is promised, the descriptor validation has to run again.
  validateFramePartDescriptors(frame);

  // **Partial, deliberately** (F-96). Every walk here is `Object.keys`, so a
  // symbol-keyed field is examined by none of the three — a second known blind
  // spot beside the stale non-null scalar of F-11/I-28. It is not widened to
  // `Reflect.ownKeys`: string keys are the published contract (D-122), so
  // walking symbols would police input the contract excludes, twice per drag,
  // on every conforming author.

  // F-11: reset completeness. A heuristic, checked after every scrub.
  for (const key of keys) {
    const v = (frame as Record<string, unknown>)[key];
    assert(
      typeof v !== 'object' || v === null,
      `drag: frame/scrub-retained ${key}`,
    );
  }
}
```

The shape check and the completeness heuristic are separate on purpose: the first proves the _map_ survived reset, the second guesses at whether the _contents_ did. The heuristic catches retained elements, snapshots, proposals and domain results — every reference-bearing field any current part has — but it cannot catch a stale non-null scalar that should have been reset. Probe 1 had the identical gap; neither model solves it (F-11).

## What a feature sees of the frame

Nothing, unless the behavior hands it something. A feature declares a read-only view of the fields it consumes, in its own module (D-13):

```ts
// y.ts
type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  pointerY: number;
}>;

// on InsertionGeometry — frame and runtime are separate arguments
resolve(frame: InsertionFrameView, runtime: InsertionRuntimeView): Insertion | null;
```

Two fields — one from the kernel slice, one from the behavior part — and `y.ts` imports neither `KernelFrame` nor `SortableFramePart` to say so.

**The behavior passes whichever frame its seam was handed**, and structural typing does the rest: `Draft<Part>` satisfies `InsertionFrameView` inside a `prepare`, `Readonly<Frame<Part>>` satisfies it inside an `effect`. Nothing reaches for `current`, and nothing needs a stable object carrying a frame reference — which is exactly what §[03](03-feature-composition.md) §Consumer-declared views could not have built. Non-frame state travels as a second argument.

This is the frame-level counterpart of §[03](03-feature-composition.md)'s consumer-declared runtime views, and together they are what "no participant needs the complete structural type" means in practice.