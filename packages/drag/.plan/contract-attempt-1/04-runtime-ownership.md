# 4. Runtime ownership

There is **one authoritative runtime object per controller**. The kernel creates it; the behavior extends it in place; features write into it through the slot object it carries. No view, projection or capability wrapper is ever materialized. (C-3)

## Composition

```ts
type SortableRuntime = KernelRuntime & SortableRuntimeState;
```

Physically it is one object. `sortable()` extends what `createKernel()` built:

```ts
Object.assign(kernel.runtime, {
  snapshot,
  slots,
  placeholder: null,
  rects: createRectIndex(),
  frame: null,
  spatialSeq: 0,
  pendingSpatial: 0,
});
```

Separate sources, one ordered assignment — the kernel fields already exist independently and are not pre-merged into a combined literal.

The extension happens once, at construction, before any operation can start, so the object's hidden class is stable for the controller's whole life. Nothing adds a property later.

## Kernel-owned fields

Everything supporting execution guarantees.

| Field | Type | Purpose |
| --- | --- | --- |
| `actions` / `args` | `number[]` / `unknown[]` | The FIFO queue, two parallel arrays |
| `running` | `boolean` | A drain is in progress on the stack |
| `closed` | `boolean` | Terminal latch |
| `current` / `draft` | `StateFrame` | Committed truth and reusable candidate |
| `realm` | `DOMRealm` | The owning document/window |
| `root` | `HTMLElement` | The ingress boundary |
| `ingress` | `AbortController` | Controller-lifetime listeners |
| `spec` | `KernelSpec` | The behavior's direct operations |
| `lifetimes` | `OperationLifetimes \| null` | motion / cancellation / presentation |
| `lift` | `VisualLiftSession \| null` | The promoted visual and its transform composer |
| `originRect` | `DOMRectReadOnly \| null` | The visual's viewport rect at grab; basis for every landing plan |
| `resolution` | `ResolutionAttempt \| null` | Consumer resolution in flight |
| `readiness` | `ReadinessAttempt \| null` | Authored-presentation watch |
| `landing` | `LandingAttempt \| null` | Landing runner in flight |
| `cancelRequest` | `CancelRequest \| null` | First-valid-cancel latch |
| `pendingContinuation` | `FailureContinuation \| null` | What to do after `onError` returns |
| `destroyRequested` | `boolean` | Set before teardown so preparation invalidates |

`lift` and `originRect` are kernel-owned because the kernel acquires the lift, owns the presentation lifetime and computes landing plans. The **placeholder** is not: it is a sortable concept.

## Behavior-owned fields

| Field | Type | Purpose |
| --- | --- | --- |
| `snapshot` | `CollectionSnapshot` | The published collection; replaced wholesale |
| `slots` | `SortableSlots` | Assembled features; read-only after construction |
| `placeholder` | `HTMLElement \| null` | The authoritative footprint |
| `rects` | `RectIndex` | Packed `Float64Array` geometry cache + parallel element array |
| `frame` | `FrameTask<number> \| null` | The one coalesced rAF task |
| `spatialSeq` | `number` | Monotonic spatial attempt counter (C-8) |
| `pendingSpatial` | `number` | The latest scheduled attempt; `0` when none |

Caches, arrays, attempts and disposer stacks live **here**, on the container — never in a frame — because the frame copy is shallow.

## Frames

```ts
type SortableStateFrame = KernelStateFrame & {
  snapshot: CollectionSnapshot | null;
  insertion: Insertion | null;
  proposal: ReorderProposal | null;
  domain: ReorderTransactionResult | null;
};
```

Kernel-owned frame fields (C-4): `phase`, `operation`, `item`, `visual`, `pointerId`, `originX`, `originY`, `pointerX`, `pointerY`, `outcome`, `recovery`, `landingDone`, `readyDone`.

`item` and `visual` are kernel-owned because the kernel lifts the visual and composes its transform. `outcome`, `recovery` and the two gate flags are kernel-owned because the kernel's settlement logic reads them. `domain` is behavior-typed, so it is behavior-owned and the kernel never inspects it — it passes control to `spec.notifyTerminal()` and the behavior reads its own field.

### The shallow-copy contract

`Object.assign(draft, current)` is shallow, so every frame field must be:

1. a scalar; or
2. immutable from the library's point of view; or
3. replace-on-write.

`CollectionSnapshot`, `Insertion`, `ReorderProposal` and `ReorderTransactionResult` all qualify — each is published as a fresh frozen-by- convention object rather than mutated. Never copy and then mutate a value both frames now reference.

### Fixed shape

Both frames come from one factory, so they share one key set and one hidden class. `Object.assign` only overwrites keys present on the source, so a fixed shape is what prevents a stale key surviving into a later candidate. Nothing may add a phase-specific property dynamically.

### Scrubbing

After commit, the inactive frame holds the previous committed state. It is a reusable transaction buffer, not a history snapshot. `resetFrame()` clears every reference-bearing field while preserving the shape, and runs on operation retirement — **including when the controller stays alive and idle afterwards**. An idle controller must not pin the DOM of the drag it just finished.

Destroy and panic additionally clear both frames, the queue and its arguments, the cancel latch, staged attempt settlements, and the element array inside the geometry cache.

## Type projections

A feature operation receives the same physical object under a narrower type. Type-level restriction is sufficient — this is not a security boundary.

```ts
type InsertionRuntime = Pick<
  SortableRuntime,
  'current' | 'realm' | 'snapshot' | 'placeholder' | 'rects' | 'slots'
>;

type DisplacementRuntime = Pick<
  SortableRuntime,
  'current' | 'realm' | 'placeholder' | 'snapshot'
>;

type PlaceholderRuntime = Pick<
  SortableRuntime,
  'current' | 'draft' | 'placeholder'
>;
```

Rules:

- projections are **type aliases only** — no object is built to satisfy one;
- a seam takes the narrowest projection that compiles;
- a projection never appears in the pointer-move path's signatures, because that path calls concrete internal functions, not seams.

## Retirement and teardown

Three levels, each idempotent.

**`retireAttempts`** — makes every in-flight async attempt inert and drops its staged payload: cancel the frame task and clear `pendingSpatial`; abort an uncompleted resolution and clear its settlement; dispose and clear the readiness watch; destroy and clear the landing runner.

**`retireOperation`** — `retireAttempts`, then dispose all three lifetimes, drop `lift`, `originRect`, `placeholder`, `cancelRequest` and `pendingContinuation`, empty the geometry cache's element array and mark it dirty, run `slots.retireHooks`, and scrub both frames.

**`destroyRuntime`** — set `closed` and `destroyRequested`, clear the queue, `retireOperation`, abort controller ingress. Terminal, silent and idempotent; physical release completes before it returns. **Panic** is `destroyRuntime` followed by reporting the initiating error.

## Retention invariants

- No DOM element is reachable from a controller that is idle.
- No queued argument outlives the drain that abandoned it — `clearQueue` drops both arrays' contents.
- No native event is retained past the synchronous drain; anything needed later is committed as scalars first.
- A destroyed controller retains nothing but its own inert fields.