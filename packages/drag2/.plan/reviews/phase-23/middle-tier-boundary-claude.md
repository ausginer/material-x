# What the middle tier should expose, and what should stay construction detail

Owner decisions, 2026-08-25, on two questions taken together because they have one answer. Files read at `ecf291c1`, with one unrelated uncommitted edit in [`layout-animation.ts`](../../../src/sortable/layout-animation.ts) ignored. **No production code changed.**

1. The smallest durable public shape for `insertionAt`, left open by D-123.
2. Whether the direct and composed behavior factories both represent supported architecture.

---

## 0. Verdict

**One rule answers both:**

> **Publish what the protocol's _producers_ need in order to produce. Do not publish what its _implementers_ happen to use.**

Applied:

| Subject | Verdict |
| --- | --- |
| `insertionAt` | **Publish, as `(destination, index, snapshot)`.** The axis is the protocol's only `Insertion` producer, and the snapshot is the version source it already holds |
| `homeInsertion` | **Do not publish.** Nothing at the middle tier produces a home gap, and the protocol already spells it `null` |
| `createSortableBehavior` | **Keep, reclassified as a test seam** — it is the only way to reach the production `install()` with slots the public config cannot express |
| `createFreeDragBehavior` | **Collapse.** Zero callers, and its own doc has said so since 2026-08-22 |
| Either factory as public surface | **Refused by construction.** Their parameter type is one D-61 deliberately does not publish |

---

## 1. `insertionAt` — the version has a better source, and it is already in hand

### 1.1 Every call site already holds the snapshot

I checked all seven rather than reasoning about the shape.

| Site | Third argument | Snapshot in hand? |
| --- | --- | --- |
| [`collection.ts:98`](../../../src/sortable/collection.ts) | `next.version` | yes — `next` |
| [`collection.ts:110`](../../../src/sortable/collection.ts) | `next.version` | yes |
| [`collection.ts:123`](../../../src/sortable/collection.ts) | `next.version` | yes |
| [`collection.ts:224`](../../../src/sortable/collection.ts) | `snapshot.version` | yes |
| [`y.ts:183`](../../../src/sortable/y.ts) | `snapshot.version` | yes — `runtime.snapshot` |
| [`xy.ts:158`](../../../src/sortable/xy.ts) | `snapshot.version` | yes — `runtime.snapshot` |
| [`keyboard.ts:88`](../../../src/sortable/keyboard.ts) | `version` | yes — destructured at `:69` |

**`version` is never independent of a snapshot at any site, internal or authored.** A third-party axis reaches it the same way: `resolve(frame, runtime)` is handed `runtime.snapshot`, and `InsertionRuntimeView` is already published at `sortable/feature`, so the snapshot is a value the author holds by protocol rather than by luck.

### 1.2 Decision — `insertionAt(destination, index, snapshot)`

Same arity, one token changed at every call site, and it converts a fault that is currently _caught_ into one that is _unrepresentable_. Today an author can pass any number; a stale one survives construction and is rejected later by `buildReorderProposal`'s version test — which D-123 keeps, so nothing is unguarded either way. Taking `CollectionSnapshot` removes the stray-number spelling entirely, which is Code of Size §1.2 applied at the one place a constructor can apply it: **prefer the shape that has no wrong value over the check that catches one.**

It adds no dependency — `insertionAt` lives in `domain.ts` beside `CollectionSnapshot`, and its return type already carries `version`. It costs no runtime: one property read moved from caller to callee.

**Reads as the rule it is:** _the gap at `index` of `destination`, in `snapshot`._

### 1.3 What was considered and rejected

- **`insertionAt(snapshot, dragged, index)`, deriving the destination view inside.** This is the shape that would make the helper self-contained, and it is refused on §0 grounds rather than taste: `y()` and `xy()` call it **per resolution** and pass the rect cache's _maintained_ list precisely so that no array is allocated on a pointer-move path. A constructor that filters internally puts an O(n) allocation on every spatial frame. `destination` stays a parameter, and the three-instant argument that kept the destination-view derivations distinct (D-120 §3.2, D-119) is untouched.
- **An options object.** Heavier at every site for one named field, and the three positional arguments are already ordered subject-position-context.
- **Dropping `version` and having callers add it.** That re-opens F-91: the moment `Insertion` is assembled in two steps, the construction rule has two owners again.

### 1.4 `homeInsertion` — do not publish, and the protocol is why

**A middle-tier author cannot need it**, and this is a structural claim rather than a survey of imagined use.

`SortableContribution` has exactly one slot that _produces_ an `Insertion` — `insertion?: InsertionGeometry`. Every other slot consumes one or ignores it. So the sole third-party producer is the axis, and the axis is asked one question: `resolve(frame, runtime): Insertion | null`.

**The home gap is already spelled in that protocol, and it is spelled `null`.** Returning `null` means _the incumbent slot still wins_ (I-15) — cheaper than constructing the gap, and the documented meaning. An axis that built the item's own home gap and returned it would be saying, less efficiently, what `null` says.

`homeInsertion` is reached from [`spec.ts:504`](../../../src/sortable/spec.ts) and [`spec.ts:676`](../../../src/sortable/spec.ts) — recovery and keyboard seeding — which are **behavior** concerns, not contribution concerns. And what it spells is the rule over the _undeleted_ list, which D-119 exempted from the constructor for one reason: seeding home must not allocate a destination view. That is an implementation trade, not a contract term, and publishing it would freeze it.

**Falsifier, and it is the one to watch.** This rests on `insertion` being the only Insertion-producing slot. If a future contribution slot produces one from a basis that is not a destination view, the question reopens — and the right response then is to publish that slot's own constructor, not to reach for this one.

---

## 2. The two factory layers

### 2.1 Reachability, measured rather than assumed

|  | Emitted JS | Emitted `.d.ts` | Callers |
| --- | --- | --- | --- |
| `createComposedSortableBehavior` | yes | — | `sortable()` |
| `createSortableBehavior` | **no** | **no** | 3 test sites |
| `createComposedFreeDragBehavior` | yes | — | `freeDrag()` |
| `createFreeDragBehavior` | **no** | **no** | **none** |

**Neither direct factory reaches the published artifact.** Both are tree-shaken because only the composed entry is imported by an entrypoint, so they cost a bundling consumer nothing — and `bench/size/noncomposed.js` already records this as a result rather than a hope: _"the built package tree-shakes the non-composed `createSortableBehavior` seam away, because only the composed entry reaches it."_

**There are three construction layers here, not two**, which is worth naming because it changes what "duplication" means. `createSortableRuntime` is the bottom layer, is emitted, and is driven directly by five test sites. `install()` — module-private — composes runtime, spec and controller. The two factories are both one line over `install()`.

### 2.2 Free drag — collapse it

`createFreeDragBehavior` has **no caller anywhere in the repository**, and its own doc comment has said so since 2026-08-22: _"~~The seam the tests drive directly.~~ **No test drives it** … It is the seam a test could drive."_

**And its tests demonstrate that they never will.** Every free-drag browser test constructs through the public `freeDrag()` entry. There is no state its suite needs that the public config cannot express, so there is nothing for a lower seam to reach.

A seam kept for a use that has not appeared in three months, in a package with no released consumer, is §8's case exactly: before release, obsolete surface is pure cost. **Delete it.**

### 2.3 The sortable's — keep it, and reclassify what it is

I expected to recommend collapsing this one too. The evidence says otherwise, and the reason is not the one the question anticipated.

**It is not duplication of the composed path — it is the only way to reach the shared `install()` with slots the public config cannot express.** Both factories delegate to the same private `install()`, so the browser suite exercises the _production_ wiring of runtime, spec and controller. A test that inlined those three calls would be a parallel wiring that can drift from the real one, silently and in the direction that matters least visibly.

**And the slots it is handed are genuinely unreachable through the public API.** `EMPTY_SLOTS` is a flattened record with a stub `resolveInsertion` and `createPlaceholder: null`. `SortableConfig` cannot produce it: `axis` is **required** since D-77, so a composition with no real axis is a compile error through the public surface and `assemble` would install one anyway. The suite also drives `beforeMove` / `afterMove` / `retireHooks` overrides that no `SortableConfig` names.

**Free drag has no such states, which is why the two behaviors diverge here without breaking F-67's one-rule requirement.** The rule is the same in both — _a test seam exists where a test drives it_ — and only the facts differ.

**What must change is the description, not the code.** The doc says _"The seam the tests drive directly"_, which reads as an architecture layer. It should say what it protects: that this is the test seam onto the shared `install()`, kept so the suite composes the behavior the way production does rather than beside it.

### 2.4 Neither can become public surface, and that is by construction

Both take an already-assembled slot record — `SortableSlots`, `FreeDragSlots` — and [`feature.ts`](../../../src/sortable/feature.ts) is explicit that this is where the published closure stops: _"`SortableSlots` is **not** here, and that is where the closure stops: an installer returns a contribution and never sees the flattened record the behavior builds from it."_

**A factory whose parameter type is deliberately unpublished cannot be published without reversing D-61.** So "genuine public/internal seam" is not one of the three answers available for these two; the real choice was only ever between _internal test seam_ and _historical duplication_, and the two behaviors land on different sides of it.

### 2.5 Two of the sortable's three call sites do not exercise it (F-101)

Recorded separately because it makes the seam look more load-bearing than it is.

- [`drag.declaration.test.ts`](../../../tests/drag.declaration.test.ts) uses it **twice**, with `slots = null as unknown as SortableSlots` and `items = null as unknown as HTMLElement[]`. It is an `expectTypeOf` test about `draggable()` inferring its controller; the factory is never called and **any** `BehaviorFactory<SortableController, SortableFramePart>` would serve.
- [`sortable.browser.test.ts:2281`](../../../tests/sortable/sortable.browser.test.ts) is the duplicate-element negative control — **D-121 retires it** along with the refusal it asserts.

So after D-121 the seam has **one** real caller: `createHarness`. That is still a sufficient reason to keep it under §2.3, and it is a thinner reason than the call count suggests, which is what the row records.

---

## 3. Implementation consequences

**For D-125 (`insertionAt`):**

- Seven internal call sites change by one token each; the emitted signature is frozen from publication.
- Publishing it converts `sortable/feature` from a **`typeOnly`** entry in [`files.json`](../../../files.json) into a runtime one — carried over from D-123 unchanged, and still the part of that slice that is a packaging decision rather than an export.
- The TSDoc must carry the `0 .. destination.length` precondition (D-123): the constructor **derives and does not validate**, and a published constructor will otherwise be read as making the range test unnecessary.
- `tests/sortable/insertion.browser.test.ts` already pins the rule and the `homeInsertion` equivalence; it changes shape with the signature but not substance.

**For D-126 (the factories):**

- Deleting `createFreeDragBehavior` removes an export nothing imports; `install` stays, reached by the composed factory alone.
- Keeping `createSortableBehavior` costs nothing to fix — only its doc changes.
- **Nothing new needs exporting either way.** `createSortableRuntime`, `createSortableSpec` and `createSortableController` are all already exported, and the browser suite already imports the first two — so the alternative was available and was rejected on merit rather than on cost.
- **D-121 interacts here.** `createSortableBehavior` calls `copyUniqueItems` expressly to validate at the same boundary as the composed path (D-80 (b)). When D-121 removes the refusal, the two paths still both copy, and the mirrored-validation rationale in [`behavior.ts:67`](../../../src/sortable/behavior.ts) must be re-stated as a mirrored _copy_ rather than deleted with the check — the same hazard F-98 records one line further down.

## 4. What would falsify these

- **§1.2** falls if a caller appears that holds a destination view and a version but no snapshot. None exists internally and the axis protocol supplies one; a future seam that does not would make the snapshot argument the awkward one.
- **§1.4** falls if a contribution slot other than `insertion` ever produces an `Insertion`.
- **§2.3** falls if the sortable suite stops needing compositions the public config cannot express — after D-121 retires one call site, the seam rests on `createHarness` alone, and if that harness were ever rewritten onto the public entry the seam would have no caller and would join §2.2.
- **§2.2** falls if a free-drag test is written that needs hand-built slots. The factory is four lines; deleting it now and restoring it then is cheaper than carrying it against a use that has not arrived.