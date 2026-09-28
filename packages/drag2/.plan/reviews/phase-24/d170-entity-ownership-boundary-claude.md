# An entity owns what it mutates, and the alias it is published behind is the class

**Read at `cbaf0227`**, branch `drag2/fin-review`, on 2026-09-04. Nothing is implemented here: D-170's steps 2 to 6 are unstarted, the lint gate is not reopened, and no API is written.

The owner's constraint, taken as given:

> An entity class owns its mutable state. Package-internal collaborators may read an intentional view, but they must not freely assign its fields or mutate its backing arrays/buffers. Mutation must pass through operations owned by the class.

Two questions were routed here together, and they turn out to be **one** question. The boundary needs a read view; a read view is a type; and the type used to express it is exactly what decides whether `unbound-method` still sees a method. Q-17 is not a neighbour of the ownership question — it is the constraint on how the ownership question may be answered.

---

## 1. The hazard, measured before anything is decided on it

`@typescript-eslint/unbound-method` reads the **declared type at the read site**. Probed in this repository, with this repository's rule configuration (`['error', { ignoreStatic: true }]`), against one class and four ways of publishing it:

```ts
class Entity {
  #n = 0;
  step(): void {
    this.#n += 1;
  }
  get n(): number {
    return this.#n;
  }
}

declare const a: Entity;
const ra = a.step; // REPORTS
declare const b: Readonly<Entity>;
const rb = b.step; // silent
declare const c: Pick<Entity, 'step'>;
const rc = c.step; // silent
declare const d: { step(): void; readonly n: number };
const rd = d.step; // REPORTS
declare const e: { step: () => void };
const re = e.step; // silent
```

Two of five report. **The class instance type reports, and a hand-written interface using method syntax reports; every mapped type over the class is silent, and so is a property whose type is a function.** F-294 established this for `Readonly<…>`; `Pick` behaves the same way, so the property is _mapped type_, not that one alias.

This is the whole of the design constraint. A boundary built from `Readonly<RectIndex>`, `Pick<RectIndex, …>` or a `{ refresh: (…) => boolean }` façade would satisfy the ownership requirement in the type checker and **disarm the gate** the migration is running behind — buying encapsulation with the instrument that makes the migration safe.

---

## 2. What is readable outside `RectIndex`, and in what form

Four members are read outside the class today. Every one of them is read, and the reads are cheap; what is wrong is that each read hands back a handle that can also write.

| member | who reads it | published as |
| --- | --- | --- |
| `values` | `linear-shift` (constant probe), `xy` (candidate centres, before-snapshot) | `get values(): ReadonlyFloat64Array` |
| `hole` | `xy` (anchor centres) | `get hole(): ReadonlyFloat64Array` |
| `items` | `linear-shift` (probe element, report walk), `xy` (gap side, report walk) | `get items(): readonly HTMLElement[]` |
| `count` | `linear-shift`, `xy` | `get count(): number` |

**`readonly` on the field is not the boundary, and the owner is right that this is the substance of it.** `readonly hole: Float64Array` and `readonly items: HTMLElement[]` protect the _reference_: `hole[0] = 1`, `items.push(el)` and `items.length = 0` all compile today. What forbids content mutation is the exposed **type**, and for one of the two there is no built-in.

`readonly HTMLElement[]` exists and is sufficient for `items`. For the packed buffer the view is declared once, in `rect-index.ts`, and it is a **hand-written interface**, per §1:

```ts
export interface ReadonlyFloat64Array {
  readonly [index: number]: number;
  readonly length: number;
  readonly byteLength: number;
  subarray(begin?: number, end?: number): ReadonlyFloat64Array;
}
```

Probed: `Float64Array` is assignable to it; `view[0] = 1` is a type error; `view.set(…)` and `view.buffer` are not members. `subarray` is covariant in its return, so the real array still satisfies the view. It costs **nothing at runtime** — it is a type, and the value handed back is the same `Float64Array` the class holds.

**The boundary is compile-time, deliberately.** A runtime boundary — a `Proxy`, or a defensive copy per rebuild — would cost per-access or per-rebuild work to constrain files that the type checker already reads, against CONTRIBUTING §1.1 (no runtime nannying) and §0 (runtime performance wins). The collaborators here are four modules in one package, and `tsc` is a gate on the required path. That is the right instrument for this population.

**Two perf harnesses reach further, and they are not collaborators.** `p02-shrink` reads `values.byteLength` and `values.buffer.byteLength`; `m2-prime` reads `values.byteLength`. The view carries `byteLength`; it does not carry `buffer`. The class never subarrays and never shares the buffer, so `values.byteLength === values.buffer.byteLength` is an invariant of the class and the second reading asserts the first twice — the implementer either drops it or takes it through a commented widening at the measurement site. **Measuring an allocation is not mutating it**, and shipping an accessor no consumer path uses in order to let a test read a number is the worse trade.

---

## 3. The three external mutations, and where each one goes

### 3.1 `linear-shift`'s span advance → an operation, with the axis passing offsets

`shiftSpan` writes `values[offset + start]`, `values[offset + end]` and `values[offset + centre]` for a span of slots. It becomes an operation on the cache.

**This is how the axis keeps its rule without holding writable storage**: the axis passes **stride offsets and scalars**, not access. `advance(lo, hi, delta, start, end, centre)` interprets none of its arguments as an axis — it is told which three fields move and by how much, which is exactly as dimension-neutral as `STRIDE` and `CENTRE_Y` already are. The rule about _when_ to advance, over _what_ span, by _what_ delta, and _whether_ the delta may be predicted at all stays in `linear-shift.ts`, where G3-linear and G5 live. `xy()` never calls it, and `bench/size` still asserts the absence of the linear module from that composition.

**The report should follow the walk rather than share it.** Today `shiftSpan` calls `report(items[i], dx, dy, …)` inside the write loop, one traversal. Passing `report` into the class would either put displacement vocabulary into a dimension-neutral cache or add a second indirect call per element. A second loop over `items` through the read view adds **no call at all** and allocates nothing; the span is the number of slots one hole crossing passes, and a committed move is a gesture-rate event, not a frame-rate one. That is the recommendation; the required property is only that nothing is allocated per move and no call is added per candidate on the resolve path.

### 3.2 `linear-shift`'s stale-hole re-read → an operation that also owns the read

The `hollow` branch measures the placeholder, takes the terminal barrier, and writes three of the hole's six fields. All three parts move into the cache: `remeasureHole(placeholder, live, start, end, centre): boolean`.

Moving the _measurement_ rather than only the write is the stronger form, and the reason is I-36 rather than encapsulation: **every consumer call this cache makes then sits in one file**, under one barrier discipline, which is what `tests/sortable/xy.browser.test.ts:508` already says the arrangement is — the check lives in `rect-index.ts` and only the threading is per-axis. Today one of those consumer calls has escaped into `linear-shift.ts` and repeats the discipline by hand.

### 3.3 `verifyEquivalence`'s healing → it stops writing, and a duplicated scan disappears

The instrument writes `values`, `items`, `count` and `hole` from outside. It must not become a method: a `DEV`-only body on the prototype is retained in the shipped bundle, whereas today every call site is inside `if (DEV)` and the whole export is tree-shaken. `bench/size` asserts what `sortable/rect-index.js` contains, and this would land in it.

**So invert it, and the healing stops being a separate act.** The claim is _the buffer the previous advance wrote equals what a full scan now produces_. Today the instrument hand-rolls the scan, compares, and heals field by field. Instead: snapshot the predicted contents through the read view, force an authoritative rebuild through the operations the class already publishes — `invalidate()` then `refresh(…)` — and compare the snapshot against the result. The cache ends authoritative **by construction**; there is nothing left to heal.

This is better than a licensed write, and not only because it satisfies the constraint:

- **It deletes a second definition of the scan.** `verifyEquivalence` currently re-implements box resolution, the six-field pack and the settle call. That is a copy of `refresh`'s body maintained by hand, in the one place whose job is to distrust a copy. The instrument that checks the prediction was itself checking against a transcription.
- **It costs one scan, not two**, because the forced rebuild replaces the hand-rolled one rather than joining it.
- **It changes no scoping.** The instrument "takes no terminal barrier, and that is what scopes it" — preserved by passing a constant-true `live`, which the existing signature already permits. A fixture that destroys its controller from inside `getBoundingClientRect` is still measuring the instrument.
- **The end state is identical.** `linear-shift` calls `index.refresh(…)` immediately afterwards and finds it warm, exactly as it does now.

The instrument keeps its parameters, keeps its slack of `1/256` and its message, and its docblock's "**it heals before it throws**" paragraph is replaced by why it no longer has to.

### 3.4 The one write that is granted, not removed

`DisplacementSettle` receives `values: Float64Array` and subtracts held offsets **in place**. That stays a real `Float64Array`, and it is not a hole in the boundary: the class hands its buffer to the sink _inside its own operation and for that call's duration_. That is a scoped capability grant the owner initiates, which is a different thing from a collaborator holding a handle it can write through whenever it likes. The distinction is the whole of what "operations owned by the class" means, and it is worth stating in the type's docblock so a later reader does not "fix" it.

---

## 4. Q-17, resolved — both halves

**Half one: every conversion publishes the class instance type, and no mapped wrapper survives the conversion.** `LinearShift` (step 2), `SeamDriver<Part>` (step 3), each behavior spec's residue (step 5) and `KernelHost` (step 6) are `Readonly<{ … }>` aliases today; each is deleted in favour of the class it names, generic parameters and all. This is not a preference: §1 measures that the wrapper is the difference between a reported detached read and a silent one, and D-170's step 0 exists to catch precisely that read.

**Half two: the residue is acceptable, and the reason is structural rather than a tolerance.** Fourteen `Readonly<{ … }>` aliases in `src/` carry method-shorthand members. After step 6 the ones that remain are protocol and SPI records — `LinearRuntime`, `InsertionRuntimeView`, `SortableSlots`, `InsertionGeometry`, `MotionConstraint`, `FeatureContext`, `LifetimeScope`, `VisualLiftSession`, `DOMRealm`, `PointerCoordinates`, `SortableController`, `FreeDragController` — and their members are **closures over a factory scope, with no `this` to lose**. The defect class the gate exists for is a member that stops working when it becomes a prototype method; a record that is never converted has no prototype method. The uncovered set is exactly the set in which the defect cannot occur.

That holds **while** clause 4 below holds, so it is not left as a promise: **each conversion lands with a falsifier**, demonstrating that a detached read of one of that entity's members — typed as the entity's _published_ alias, at a read site's real type — is reported by the gate on the path `handoff.md` mandates. Step 1 already did this for `RectIndex`; the obligation is now stated for steps 2 to 6, and it is what turns "the alias came across" from an assertion into a demonstration.

**What is still uncovered after that, stated rather than left to be discovered**: `SortableController` and `FreeDragController` are `Readonly<…>`, so a _consumer_ detaching `controller.destroy` is invisible to the gate. That is not this library's defect, and the library's own production of the detached member — `cancel: host.cancel` spread from a `KernelHost` — becomes visible at step 6, which is where D-170 says the hazard lives.

---

## 5. The rule, in four clauses, reusable for steps 2 to 6

> **An entity class owns every field it mutates. What crosses its boundary is reads through an accessor whose type forbids content mutation, and writes through an operation the class declares. No collaborator holds a reference it can write through.**

1. **No mutable state is a public field.** `readonly` protects the reference only; the exposed **type** must forbid content mutation — `readonly T[]`, or a declared read view for a typed array — and the class holds the mutable original privately.
2. **A read view is declared, never derived.** It is an interface written by hand, using method syntax for every receiver-sensitive member. It is never `Readonly<E>`, `Pick<E, …>`, `Omit<E, …>`, `Partial<E>` or any other mapped type over the entity, and never a record of function-typed properties. §1 is why. A data-only view — the safest form — has no methods at all.
3. **Every external write is an operation the class names**, parameterized by the caller's _rule_ rather than by the caller's _access_. Where the caller's rule is axis- or dimension-specific it passes offsets and scalars; the entity stays neutral because it interprets none of them. A buffer lent to a collaborator inside such an operation, for that call's duration, is a grant and not a leak.
4. **The published alias is the class instance type**, and each conversion lands with a falsifier showing the gate reports through it.

**This is recorded at package scope and not promoted to CONTRIBUTING §10.** §10 governs four packages, none of the other three has been audited against this rule, and a rule with no instrument and unknown violators is the shape this phase has spent itself arguing against. It becomes a candidate for §10 when six conversions have exercised it — recorded as F-300, tier C, and one line from the owner overrules this if the intent was repository policy from today.

---

## 6. The landed step needs amendment, and it should land before step 2

**Yes, and as step 1a: a bounded amendment to `rect-index.ts`, `linear-shift.ts` and `xy.ts`, not a revert.** The conversion at `cbaf0227` is correct as a conversion — same fields, same members, same barrier semantics, the hand-rolled receiver deleted — and nothing about it is undone. The boundary is a second, independent change to the same file.

**Before step 2, and the reason is measurement rather than tidiness.** `linear-shift` is the largest external mutator of the cache; step 2 converts it. Folding the boundary into step 2 would produce one diff carrying two changes and one set of size figures answering to both, which CONTRIBUTING §15 asks the opposite of. Landing 1a first prices the boundary against a tree in which nothing else moved, and step 2 then converts a factory whose call sites are already correct. Nothing is converted twice — `xy()` is not a conversion candidate at all and its call sites change once.

**What 1a changes, exactly**: four fields become private with read accessors; `advance` and `remeasureHole` are added and `linear-shift`'s two write sites call them; `verifyEquivalence` is inverted; the `ReadonlyFloat64Array` view is declared; the `DisplacementSettle` docblock states the grant; and the **`Fields, not accessors` docblock is replaced** rather than deleted.

---

## 7. Evidence required — and one measurement that is not re-usable

**The 90 B does not carry over, and this is the one place the owner's instruction has a concrete consequence.** `plan.md:776` measured `values()` / `count()` as **methods on a record literal**, called as `index.values()`, in a design that no longer exists; the proposal here is **getters on a prototype**, read as `index.values`. The reader set has changed too. Whatever the boundary costs is measured again on the class, and the number replaces the docblock's claim in place.

**The hot path is not a forecast here — it is countable, and it was counted.** `xy.resolve` destructures `{ values, count, hole }` once _before_ the candidate loop and reads `{ items }` once more only on a frame that proposes a gap change. `y.ts` reads no field of the cache at all; `linear-shift`'s every remaining read — `count`, the probe's `values`/`items`, the report walk's `items` — is on the **committed-move** path. So after 1a:

- **the minimal composition performs zero accessor calls per resolution**, because its only reader reads on the move path;
- **`xy()` performs three per resolution, and a fourth on a gap-change frame**;
- **neither adds a call inside a candidate loop.**

The evidence rule, then:

- **A call added inside a candidate loop is refused outright**, not measured. That loop is the artifact this whole design exists to keep free, and no encapsulation benefit licenses one.
- **Per-resolution and per-move calls are permitted, and their evidence is an exact count plus `just size` by composition** (§15). Every composition's delta is recorded whether or not it is inside budget.
- **A duration is offered only where the instrument can resolve it above its own noise floor.** `p01-write-cost` states the discipline: a per-call timer on something below the clock's granularity returns a measurement of the clock. Three property reads per resolution are not resolvable, so a timing claim here would be exactly that, and must not be made. Count them and price the bytes — M-6's rule, not M-1's.
- If a size delta breaches a budget, the budget is re-based deliberately with its reason recorded (D-96, D-130), because D-170 already settled that bundle size does not decide whether an owned entity gets the correct representation.

---

## 8. Conflicts identified, and how each resolves

- **`rect-index.ts`'s `Fields, not accessors` docblock** asserts the opposite of the owner constraint. It is not a `D-*` and never was; it is source rationale resting on `plan.md:776`. It is superseded, its measurement stays in `plan.md` as history, and the docblock is rewritten to state the boundary and its re-measured cost. Recorded as **F-298**.
- **CONTRIBUTING §0 and §14** — runtime performance wins, and it is not traded for bytes. Not in conflict: §7 forbids the per-candidate call outright and requires the per-resolution count to be stated, so the rule is applied rather than waived.
- **CONTRIBUTING §10** — _classes need semantics, not prestige_. Not in conflict; D-170 already settled the representation question, and §5 explains why the ownership clause is not written into §10 today.
- **D-168, D-104, I-36** — untouched. The shrink hysteresis, the four barriers and the settle contract keep their bodies and their semantics; §3.2 moves one consumer call _into_ the file where I-36's discipline already lives.
- **Q-17** — resolved by clause 4 and §4, and marked resolved in `05` rather than deleted.

---

## 9. Method

`cbaf0227` read in full for `rect-index.ts`, `linear-shift.ts` and `xy.ts`; `y.ts` checked for direct field reads and has none. The `unbound-method` matrix in §1 is a probe run in this workspace against the repository's own `typescript-eslint`, with the rule configured as the root sets it; the `ReadonlyFloat64Array` assignability and its three refusals were checked with `tsc` under the repository's `strict` and `noUncheckedIndexedAccess`. The fourteen method-carrying `Readonly<{ … }>` aliases are a scripted census of `src/`. The reader tables in §2 and §7 are from reading every call site, not from a grep count. Both probe directories were removed after the readings were taken; the probes are reproduced above in full.

**LSP plugin — available; not used**: the questions are a lint rule's sensitivity to type _form_, a type-assignability property, and a census of call sites already enumerated by hand — no definition, reference or call-hierarchy query bears on any of them.