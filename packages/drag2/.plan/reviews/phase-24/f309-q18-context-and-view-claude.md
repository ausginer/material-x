# `BehaviorContext`, the cache's read view, and what makes a materialized object a context

**Three settlements against `42f02c52`**, before D-170 step 6 is implemented: the owner's naming correction, a re-opened F-309, and Q-18. **The substantive F-305 correction is unchanged** — the separate runtime `host` object disappears, `Kernel` implements the behavior-facing interface directly, `arm` stays outside it, and deliberate JavaScript escape from a TypeScript interface is outside the threat model.

---

## 1. The interface is `BehaviorContext`

**`BehaviorKernel` → `BehaviorContext`, and no alias survives** (`CONTRIBUTING.md` §8: the package is unreleased, so an obsolete shape is deleted rather than kept). Everything else about the interface stands as `§The behavior-facing interface` states it: seven members, method syntax throughout, `arm` on the class and off the interface, `class Kernel implements BehaviorContext`, parameter renamed `host` → `kernel`.

**The name is better for a reason worth recording rather than accepting on authority.** The package already publishes `FeatureContext` — what a _feature installer_ is handed to act with ([`shared/composition.ts:27`](../../src/shared/composition.ts)). `BehaviorContext` is what a _behavior factory_ is handed to act with, and naming them alike puts the two authoring tiers in one family the author meets in one vocabulary. It also lands on the right side of a distinction this package already keeps: a **Context** is what you are given to act — `dispatch`, `cancel`, `destroy` — where a **View** is what you may read. `BehaviorKernel` named the implementation behind the parameter; `BehaviorContext` names the parameter.

The predecessor record [`f305-owner-correction-behavior-kernel-claude.md`](f305-owner-correction-behavior-kernel-claude.md) is dated provenance and is not rewritten; it carries a banner pointing here for the name.

## 2. F-309 re-opened — the four accessors go

**Reversed.** `31ac5204` kept all four and gave the reason that a class field declares one type while these four need two — mutable for the owner, read-only for the collaborator. **That reason does not survive its own record's taxonomy**, which says an accessor is kept only where it computes or protects a **runtime** invariant. None of the four computes; each returns the class's own field verbatim. Their entire effect is on the type, and a runtime construct doing a compile-time job is the shape this phase has just finished removing at `host`.

**What the earlier record missed is that the two types do not have to be two declarations of one field.** They can be one field and two _declarations of the type at different sites_ — the class declares its own, and a hand-written reader interface re-declares the same members readonly. **Measured, on this tree's own configuration:**

```
export interface RectIndexView {
  readonly values: ReadonlyFloat64Array;
  readonly hole: ReadonlyFloat64Array;
  readonly items: readonly HTMLElement[];
  readonly count: number;
}
export class RectIndex implements RectIndexView {
  values: Float64Array = new Float64Array(0);
  readonly hole: Float64Array = new Float64Array(STRIDE);
  readonly items: HTMLElement[] = [];
  count = 0;
}
```

`tsc` and `eslint` both clean: the class writes elements, reallocates `values`, empties `items` and assigns `count` through its own types with **no cast and no second field**; through a binding declared `RectIndexView`, `cache.count = 0`, `cache.values[0] = 1` and `cache.items.length = 0` are each refused, and all three `@ts-expect-error` directives are consumed. `--isolatedDeclarations` requires the public fields to carry explicit annotations, which is a cost of one annotation each and makes the owner's type visible at the declaration.

**The objection I raised against this and now overrule.** I said the axes _construct_ the cache, so narrowing is opt-in at every binding and therefore forgettable, where a tier boundary hands the recipient the narrow type by parameter. That is true and it is not disqualifying: the owner's policy makes a **declared** TypeScript interface the boundary, and a declared binding is a declared boundary. Requiring the boundary to be un-forgettable is requiring machinery to enforce it, which is the thing being refused. The same objection applies verbatim to `src/kernel.ts`, which constructs the kernel and holds it wide, and the owner accepted it there.

**And the reading structure is better than I described.** [`y.ts`](../../src/sortable/y.ts) touches the wide binding at exactly three places — `new RectIndex()` at :183, handing it to `LinearShift` at :190, and the two data reads at :225 and :259. **Every operation goes through `shift`.** So the wide binding in `y.ts` exists only to hand the cache to its owner, and the reading code has no other reason to name it. `xy.ts` holds no `LinearShift` and so keeps both. `linear-shift.ts` reads one member, `index.count` at :298, through the parameter it is already given.

### Required properties

1. **The four accessors are deleted.** The four data members are ordinary fields carrying the class's own mutable types.
2. **`RectIndex` exports a hand-written reader interface**, declared and not derived (clause 2) — four readonly data members, `ReadonlyFloat64Array` for the two buffers and `readonly HTMLElement[]` for the element array, which is the type work `ReadonlyFloat64Array` already exists to do.
3. **Every read of cache data outside the class goes through a binding declared as that interface.** Where a module also drives the operations it holds both types; the binding the _reading_ code names is the reader.
4. **The receiver gate is untouched, and this is checkable rather than asserted**: the reader interface carries **no method members**, so nothing about `unbound-method`'s coverage changes. The operations stay on the class instance type, and every existing wrap — `y.ts`'s `invalidate`/`retire` into `retireHooks` at :269,:295 — is unchanged.
5. **`verifyEquivalence` reads through the reader interface** as well. It is in-module and could read the fields directly; the point of the instrument is that it distrusts the cache, and reading it under the collaborator's type is what says so.
6. **Falsifier**, in the form the earlier steps established — the shipped file, not a probe. A write through a reader binding fails `typecheck`; restored, it is clean.
7. **Measured, and the result is recorded either way.** The docblock's current figures — +39 to +51 B Brotli on the `y()` compositions, +103 to +116 B on the `xy()` ones — were measured **jointly with `advance` and `remeasureHole`**, so the accessor share is not isolated and no number here can be carried over. Four prototype getters and their call sites leave; four `#private` names that mangle to one character become public names that do not. **The direction is decided by the taxonomy and not by the bytes** (D-170: bundle size does not decide whether an owned entity receives the correct representation), but the number is owed to the record.

## 3. Q-18 — `ConstraintView` is a context, and stays

**Retained, and not because it allocates.** One object per operation is one per gesture, which is the human-scale workload D-167 already declined to optimise for; allocation is neither a reason to keep it nor to remove it, and it is not the ground here.

**It is a projection in part, and that is the honest starting point.** Of its three members, `realm` is the spec's own controller-lifetime field and `originRect` is _already_ on the operation record — [`spec.ts:401`](../../src/free-drag/spec.ts) and `:414` assign the same `scope.originRect` twice. But **`visual` is retained nowhere else**: `#operation` carries `lift`, `originRect`, `space`, `view` and `progress`, and no `visual`. So deleting the object does not delete a copy — it moves one live reference somewhere else, at the same lifetime, for no saving.

**The test that decides it, and it is the same test that retired `host`.** `§The behavior-facing interface` settled that delegation does not by itself justify a second object, because the kernel already existed as a receiver whose lifetime and members the façade exactly mirrored — the class could implement all seven with no change of lifetime. So:

> **A materialized narrowing is a control panel when a receiver already exists at the same lifetime and with the same nullability; it is a context when none does.**

Applied here, the two candidate receivers both fail, and they fail differently:

- **The behavior spec class.** `FreeDragBehavior` could carry `realm`, `originRect` and `visual` and be handed to `apply` narrowed by `ConstraintView`. It is **controller-lifetime**, and these three are the operation's — minted in `activation.effect`, cleared in `retire()`. Putting them behind `this.` is D-168's recorded defect verbatim: _"a class has exactly one namespace for instance state … `this.motion` — per-sample scratch — and `this.lift` — per-operation, nulled at retire — read identically."_ The kernel's façade had no such mismatch, which is exactly why it could be absorbed.
- **The operation record.** The right lifetime, and it fails on nullability. D-168's record is nullable field-by-field _by design_ — _"Every field here lives exactly as long as the operation and is cleared together in `retire()`"_ — while `ConstraintView`'s members are not. The record cannot satisfy the published type without either dropping the nullability that makes the lifetime legible, or a cast at the call. **The shape that exists today is better than either**: one nullable slot that is wholly present or wholly absent, and `this.#applyConstraint?.(motion, this.#operation.view!)` carries **one** assertion where the record would need three, each of which the callee would have to be trusted not to have got wrong.

**Two further facts, stated because they would otherwise look like reasons and are not.** It is a published middle-tier type under D-12, so removing it is a published-type change rather than a type-surface change — that raises the bar for removal but is not itself an argument for the object, since the _type_ could survive a different carrier. And its docblock states a property of the set rather than a list of fields — _"Everything on it is committed or construction-time state, so `apply` performs **no** layout read of its own"_ — which is a contract about a read set and is what makes it vocabulary rather than a parameter bundle. That is corroboration; the lifetime and the nullability are the decision.

**One redundancy examined and cleared**, so a later DER pass does not re-raise it: `originRect` is stored twice, on the operation record and on the view. Both readers are legitimate and neither should read through the other — `spec.ts:537` wants the operation's rect, and a constraint wants the view's. One reference in two slots of the same lifetime is not a duplication defect.

## 4. Record gap closed in this pass

`42f02c52` added three review records that allocate `F-310`, `F-311` and `Q-18`, and **none of the three has a canonical entry or a place in the minted register** — `.scripts/entry.sh drag2:F-310` answers _unknown local id_. That is F-296's defect exactly, one round later, and it is repaired the way F-296 was: by minting the entries, not by removing the addresses. `Q-18` is minted and resolved in the same pass; `F-310` and `F-311` are minted open and stay routed to the implementer, non-blocking.

## 5. Method

`.plan/contract/00-index.md` §D-170 and its three sub-clauses; Q-17 in `05-lifecycle-invariants.md`; [`f305-owner-correction-behavior-kernel-claude.md`](f305-owner-correction-behavior-kernel-claude.md) and [`control-panel-surface-summary.md`](control-panel-surface-summary.md) with the `der` pass behind it. `rect-index.ts` read in full; every read of its four data members enumerated across `y.ts`, `xy.ts`, `linear-shift.ts` and `verifyEquivalence`. `ConstraintView` read at its declaration ([`free-drag/feature.ts:99`](../../src/free-drag/feature.ts)), its construction (`spec.ts:412`), its one read (`spec.ts:293`), its clear (`spec.ts:1052`), the operation record it hangs on (`spec.ts:150-175`) and its one first-party consumer (`bounds.ts:100`). One probe file placed in `src/`, run through `npx tsc -p tsconfig.json --noEmit` and the package `eslint` invocation, and deleted; both were clean and all three `@ts-expect-error` directives were consumed.