# Feature proof over the completed D-170 arc

**Read at `b73b6779`**, branch `drag2/fin-review`, on 2026-09-04. The source tree is unchanged at the time of writing: `git diff --stat b73b6779..HEAD` touches only `.plan/reviews/**`, so every mechanical claim below still describes the tree as reviewed. Nothing is implemented, no contract or decision is amended, and F-300 is not re-raised.

Canonical authority: the D-170 entry in [`00-index.md`](../../contract/00-index.md) with §The ownership boundary, §The step-6 boundary and §The behavior-facing interface, and the records they link.

---

## Scope

**Covered.** The six load-bearing properties named in the task, attacked by mutation rather than by reading: the factory→class conversions (`RectIndex`, `LinearShift`, `SeamDriver`, both behavior spec classes, `Kernel`); the `unbound-method` gate on the repository's real handoff and aggregate lint paths; the `RectIndex`/`RectIndexView` ownership boundary; the liveness reduction in `refresh`, `remeasureHole` and both retired caller readings; the `Kernel`/`BehaviorContext` boundary, `arm` exclusion and both controller wrappers; and the published/type vocabulary and its falsifiers.

**Baselines established on this tree.** `npx just typecheck` clean. `npx eslint … src` clean. `npx vitest run` — 65 files, **1248 passed, 60 skipped**, type errors none. `tests/consumer.node.test.ts` — 11 passed, including the packed-declaration compile.

**Not covered.** The bundle-size attribution and the `budget-rebases.md` re-base reasoning are taken as given (the budget tests pass on this tree, and I did not re-derive the ablation). The twenty-alias `Readonly<{…}>` residue census is not re-counted; the entry states the count is illustrative. Free-drag's per-binding lifetime _filing_ is checked structurally (three lifetimes, named records, subtraction residue) rather than binding by binding. D-171–D-175 documentation-schema conformance is another pass's subject.

**One standing limitation, restated rather than raised.** `npx just lint` and `npx just lint-fix` with **no file arguments** still abort at `oxlint .` — four pre-existing errors in `tests/` and `bench/` — before ESLint runs, and `nx run @ydinjs/drag2:lint` is `nx:run-script` over exactly that argument-less recipe. So the root selector F-292 repaired still cannot exercise the gate for this package. D-170's step-0 note already records this (_"does not yet make the **aggregate** path exercise the rule"_), so it is scope for property 2, not a finding.

---

## Findings

### rr-1 — The liveness reduction leaves a declared consumer slot invoked after logical closure, at two sites · **tier A**

**Finding.** `settle` is a member of `SortableSlots` ([`slots.ts:141`](../../../src/sortable/slots.ts), `:227`) supplied by a `DisplacementContribution` installer, and `DisplacementContribution` is **published surface** — exported from `sortable/feature.js` and `sortable.js`, pinned by `consumer.node.test.ts:487`. I-36 defines a declared consumer slot as _"a member the consumer filled, which the export table and `SortableSlots` enumerate in full"_, and requires that a participant invoking a declared slot more than once inside one seam _"reads the logical latch between invocations and stops on the first closed reading"_. Two of the readings this arc retired were the only readings standing between a `box` invocation and a `settle` invocation.

**Current behavior.**

- [`rect-index.ts:356`](../../../src/sortable/rect-index.ts) — `settle(values, items, n)` runs after the candidate loop. The single reading is at `:315`, immediately before `getBox(item)`. A resolver that closes the controller on the **last** candidate leaves no reading before `settle`.
- [`linear-shift.ts:342`](../../../src/sortable/linear-shift.ts) — `runtime.settle(scratch, [probe], 1)` runs after `runtime.box(probe)` in the same statement sequence, with the reading that used to sit between them retired under F-304.

**Why it is a problem.** `refresh`'s own docblock states the obligation as _"a declared consumer slot must not be invoked after the controller closed"_ and justifies the reduction with _"what follows a candidate's own geometry read is either internal or the next iteration's guarded invocation."_ On the last candidate what follows is `settle`, which is neither. F-304 reached the same conclusion for the second site by inspecting the **shipped** implementation — _"`runtime.settle` — `layout-animation.ts`'s walk … **Library-owned**; no consumer-owned member is touched"_ — which is a fact about the one sink in the tree, not about the declared boundary a third-party feature author fills. The package already treats the sibling member `report` as needing a reading: it takes `runtime.live` and reads the latch at its own head _"by explicit design"_. `settle` takes no `live` and takes no reading anywhere.

**Evidence.** Two probes, driven directly against `src/`, with `node file.ts`:

- `RectIndex.refresh` with three destination candidates, a `box` resolver that closes on the last one, and a non-null `settle` — `refresh returned: true`, `alive at end: false`, **`settle invocations after logical close: 1`**.
- `LinearShift.moved` warmed on a live controller, then driven with a `box` resolver that closes on the probe row — `alive after moved: false`, **`settle invocations after logical close: 1`**.

Both were refused before the reduction. At `982285f0` the readings at `rect-index.ts:233` (after `getBox`) and `:247` (after the candidate's geometry) both returned `#abort()` before reaching `settle(values, items, n)` at `:270`; at `261a3a16` `linear-shift.moved` carried `if (!runtime.live()) { drop(); return; }` between the `box` read and `runtime.settle(...)`.

No test in the tree covers either case: every barrier fixture in `y.browser.test.ts` and `xy.browser.test.ts` passes `settle: null`.

**Required property.** Either a liveness reading is taken immediately before each `settle` invocation, or `settle` is declared out of I-36 clause (a) and the two docblocks that justify the current placement say so. **This turns on a contract reading — whether a feature-supplied `DisplacementContribution.settle` is a declared consumer slot — and is routed to the architect rather than answered here.** If it is not one, rr-1 collapses to the reasoning basis in F-304 and `refresh`'s docblock; if it is, the tree invokes it after close.

---

### rr-2 — The `RectIndexView` read boundary has no falsifier at all · **tier B**

**Finding.** D-170 §The ownership boundary turns clause 4 into a demonstration by requiring that _"each conversion still lands with a falsifier"_. The boundary the accessor reversal replaced them with — `RectIndexView`, _"declared, never derived, four readonly data members"_ — has none.

**Evidence.** Rewriting the interface to

```ts
export interface RectIndexView {
  values: Float64Array;
  hole: Float64Array;
  items: HTMLElement[];
  count: number;
}
```

— which removes every property the amendment measured — leaves `npx just typecheck` clean, `npx eslint … src` clean, and the suite at **65 files / 1248 passed / 60 skipped**, identical to baseline. The mutation was reverted.

The properties themselves do hold on the tree as landed: through a binding declared `RectIndexView`, `view.count = 0`, `view.values[0] = 1`, `view.items.length = 0`, `view.hole[0] = 1` and `view.invalidate()` are each refused, while the owner's `RectIndex` type accepts all four writes plus `owner.values = new Float64Array(0)` — verified with a `@ts-expect-error` probe inside the package's own `tsconfig`, with a deliberate control line to prove the probe was in the program. Nothing keeps them true.

**Why it is a problem.** The entry deletes four accessors on the strength of a measurement made during the pass, and the measurement is the whole argument for the deletion. A mapped type reintroduced over the class, or a `readonly` dropped, regresses the boundary and the gate-coverage rationale together, silently.

**Required property.** The read boundary's refusals are asserted by something that fails when the interface is weakened.

---

### rr-3 — Three of the four narrowing assertions the entry cites do not discriminate the narrowing · **tier B**

**Finding.** §The behavior-facing interface and step 6 both rest the narrowing on the same evidence: _"probe 13a's N-2, N-3, N-5 and 13c's N-4 still fail to compile through the interface — all four `@ts-expect-error` directives are consumed, **which is what proves the projection survived becoming an interface**."_ They prove nothing about it.

**Evidence.** A probe placed inside the package (so the package `tsconfig` compiles it) re-points those assertions at the **wide** `Kernel<Part, Activation>` class:

```ts
// @ts-expect-error — 13a N-2 re-pointed at the WIDE class
export const n2: unknown = kernel.addIngress;
// @ts-expect-error — 13a N-3 re-pointed at the WIDE class
export const n3: boolean = kernel.dispatch(0, keyEvent);
// @ts-expect-error — 13a N-5 re-pointed at the WIDE class
export const n5: unknown = kernel.activate;
// CONTROL: `arm` is on the wide class, so this directive must report unused.
// @ts-expect-error — control
export const control: unknown = kernel.arm;
```

`npx just typecheck` reports exactly one error — `TS2578: Unused '@ts-expect-error' directive` on the **control** line. All three assertions still fail to compile against the class, because `addIngress` and `activate` are not members of `Kernel` either (`#activate` is private) and `dispatch` returns `void` on both. 13c's N-4 (`kernel.move`) is the same shape: `move` is on neither type. Widening `BehaviorContext` to the whole kernel would leave all four green.

**What does discriminate, and it is armed.** `void kernel.arm` in `tests/consumer.node.test.ts:783` is the only assertion that separates the interface from the class, and it is sufficient — `arm` is the only member of `Kernel`'s non-private surface that `BehaviorContext` omits. Adding `arm(next: never): void` to `BehaviorContext` and re-running the consumer test fails it with `behavior.ts(224,3): error TS2578: Unused '@ts-expect-error' directive.` The mutation was reverted.

**Why it is a problem.** The entry attributes the proof to four assertions that are silent about it. A reader auditing the narrowing later will re-derive confidence from the wrong instrument; the single real one is not named as load-bearing anywhere in the entry.

**Required property.** The record cites, as evidence for the narrowing, only assertions that fail when the narrowing is removed.

---

### rr-4 — Nothing pins the memoized `destroy()` promise identity through the shipped sortable controller · **tier B**

**Finding.** §The behavior-facing interface singles this out — _"`destroy`'s wrapper is a plain arrow rather than an `async` one, so the memoized promise is returned by identity"_ — and both controller docblocks repeat it, `sortable/controller.ts` adding _"the *settles once* the kernel documents is a statement about that object."_ The property is unguarded.

**Evidence.** Changing `src/sortable/controller.ts`'s wrapper to `destroy: async (): Promise<void> => kernel.destroy(),` leaves the full suite at **65 files / 1248 passed / 60 skipped** and typecheck clean — no failure of any kind. Changing **both** controllers fails four tests, and all four are in `tests/bench/size.node.test.ts` (`the declared controls > should not move free drag … at all`) — byte budgets, not behaviour, and only on the free-drag rows that happen to be this pass's declared controls.

The identity assertion that does exist, `kernel.browser.test.ts:4100` (`expect(harness.controller.destroy()).toBe(first)`), runs against the harness's own hand-written wrapper at `kernel.browser.test.ts:291` — the same form, but not the shipped `SortableController` or `FreeDragController`.

An `async` wrapper is not a size regression: it returns a fresh promise per call and settles one microtask after the kernel's, so `controller.destroy() === controller.destroy()` becomes false and the "settles once" statement stops being about the returned object.

**Why it is a problem.** The kernel side is correct and idempotent — `#destroyed ??= new Promise(…)`, `destroy()` is the only writer of `#queue.closed = true`, and `#runPhysicalTeardown()` is reached only from `destroy()` or `#leaveTransaction()`, so the resolver is never dropped. All of that is defended by the wrapper form alone, and the wrapper form is defended by a byte budget on one of the two features.

**Required property.** A behavioural assertion pins the returned promise's identity across repeated calls on each shipped controller.

---

### rr-5 — Step 5's rename corrupted fifteen sentences of prose in the two spec files · **tier C**

**Finding.** The mechanical `this.#` prefixing that accompanied the spec-to-class conversion was applied inside comments, turning English nouns into member references.

**Evidence.** Fifteen occurrences of an unquoted `this.#…` inside a comment or doc block, all introduced by `12311981` (`git log -S` on one of them), each a plain word at `261a3a16`:

| Site | Now reads | Read at `261a3a16` |
| --- | --- | --- |
| `free-drag/spec.ts:823` | `A this.#transaction opens` | `A transaction opens` |
| `free-drag/spec.ts:312` | `the ingress this.#root and the dragged item` | `the ingress root and the dragged item` |
| `free-drag/spec.ts:969` | `Each this.#axis is read exactly once` | `Each axis is read exactly once` |
| `free-drag/spec.ts:1036` | `{@link this.#deliver} itself` | `{@link deliver} itself` |
| `sortable/spec.ts:424` | `whichever ancestor the this.#snapshot knows` | `whichever ancestor the snapshot knows` |

The remaining ten are `free-drag/spec.ts:361`, `:374`, `:391`, `:426`, `:506`, `:596`, `:789`, `:818`, `:831`, `:1022`, and each is the same substitution over `operation`, `notify`, `unwind`, `axis`, `motion`.

**Why it is a problem.** `{@link this.#deliver}` is not a resolvable declaration reference. Both classes are module-private, so nothing reaches the published documentation and no test observes any of it — hence tier C — but the two files D-170 converted _because_ their prose asserted the wrong lifetimes now carry prose that was damaged by the conversion.

**Required property.** Comment text says what it said before the rename, and `{@link …}` targets resolve.

---

### rr-6 — The `host` vocabulary retirement is incomplete, against an explicit claim that it is not · **tier C**

**Finding.** §The behavior-facing interface states the rename as done: _"`KernelHost` becomes `interface BehaviorContext` … and the parameter renamed `host` → `kernel` wherever it is threaded."_ `KernelHost` is indeed gone from `src/` and `tests/`. The parameter is not renamed.

**Evidence.** 33 occurrences of `host` survive in `src/`:

- **22 in the two behavior modules, 15 of them code.** `sortable/behavior.ts:77`, `:101` and `free-drag/behavior.ts:54` each bind the `BehaviorFactory` parameter as `host`, threaded through `host.realm`, `host.root`, `host.closed` and both `create*Controller(host)` calls. Their doc blocks carry the vocabulary too — _"what each takes is the host"_, _"assembles against the host's realm and root"_, _"neither exists until the kernel has a host"_.
- **11 prose sites elsewhere**: `kernel/seams.ts` × 7 (`host.fail` in the seam contract), `kernel.ts:168` (`host.fail(stage, error)`), `kernel.ts:227`, `sortable.ts:89` (`host.cancel`, cited by §The step-6 boundary as its own evidence), `drag.ts:42`.

One of these reaches the published declarations: `kernel.d.ts:13` — _"The factory is called with the kernel host"_ — on `draggable()`, which is the entry a behavior author reads. The `host.fail`/`host.cancel` doc blocks sit on `export { … }` statements and do not survive into the `.d.ts` (checked against the current build).

**Why it is a problem.** Tier C rather than B because a behavior author is handed a parameter typed `BehaviorContext` and cannot be misdirected into looking for a type that no longer exists; the naming is stale, not wrong. It is reported because the entry asserts the opposite, and because §The step-6 boundary's surviving reasoning quotes `sortable.ts:89`'s wording as a premise.

**Required property.** The record's account of the rename matches the tree, in one direction or the other.

_(An integrity and a DER pass in this round have each reported a naming drift of this shape; the id mapping is the consolidator's.)_

---

## What could not be falsified

**Property 1 — representation changed, behaviour did not.** Each converted unit was compared against `261a3a16` on a comment-stripped, `this.#`-normalized rendering of its source. `SeamDriver` is statement-for-statement identical and publishes exactly the seven members the retired `Readonly<{…}>` alias did, with `#refuseReentry` and `#runPhase` private. `RectIndex` is identical apart from the two intended changes. `SortableBehavior.retire()` clears the same six fields in the same order and walks `slots.retireHooks` backwards exactly as the factory's `retire()` did. In `Kernel`, the only semantic-looking substitutions are `createOperationLifetimes(notify)` → `(report)` — equivalent, since `Notify` is declared one-argument and `#report` forwards it — and `drain(queue, handle, panic)` → `drain(queue, #drainStep, #drainPanic)`. `AttemptSlots` carries the three slots and every former free binding is now `attempts.*` at the same statements. Both spec classes carry the three lifetimes as an outer field list plus `#operation` and `#transaction` records.

Two real behavioural changes were found. The first is the one D-170 declares: `remeasureHole` takes no `live`, so the linear rule's `hollow` branch no longer aborts on a close raised from the placeholder's own `getBoundingClientRect` — the resulting `Insertion` is a publication and `spec.ts:1076` (`resolved === null || this.#kernel.closed`) refuses it, which I checked rather than assumed. The second is rr-1.

**Property 2 — the gate is armed on the path `handoff.md` mandates, and is not vacuous.** `eslint --print-config` resolves `@typescript-eslint/unbound-method` to `[2, {"ignoreStatic": true}]` from **both** the repository root and `packages/drag2`, so the bare `'error'` after Oxlint's spread does preserve the preset's options. Seven mutations of shipped files, each reverted, each reported by the rule:

| Mutation | Reported at |
| --- | --- |
| `cancel: kernel.cancel` in `sortable/controller.ts` | `66:13` |
| `destroy: kernel.destroy` in `sortable/controller.ts` | `73:14` |
| both, in `free-drag/controller.ts` | `95:13`, `96:14` |
| `kernel.arm` detached at its real read site in `kernel.ts` | `252:17` |
| `admit: behavior.admit` in `createSortableSpec` | `1897:12` |
| `invalidate: shift.invalidate` in `y.ts` | `275:21` |
| `index.advance` detached in `linear-shift.ts` | `413:21` |

The mandated recipe itself was exercised: `npx just lint-fix src/sortable/controller.ts` on a file carrying `destroy: kernel.destroy` runs `oxlint --fix`, then **runs ESLint**, and fails the recipe on this rule — a positive demonstration, not an inference from an exit code. `src/` carries exactly one `unbound-method` disable, `kernel.ts:300`, on the platform `then` capture whose receiver is re-supplied at `then.call(value, …)` (`kernel.ts:1979`) — the only call. Nothing else is suppressed, and the eleven detached publications the entry describes are all arrow fields or call-site closures (`#report`, `#unwind`, the four `#context` members, `#drainStep`/`#drainPanic`, `#pointerHandler`/`#escapeHandler`, `#movedLeaf`, `#pointerDownHandler`/`#commandHandler`).

**Property 3 — ownership holds; no external write path was recreated.** Every collaborator read goes through a binding declared `RectIndexView`: `y.ts:189`, `xy.ts:166`, `LinearShift.#view`, and `verifyEquivalence`'s `const view: RectIndexView = index`. The only `RectIndex`-typed bindings outside the class (`y.ts:184`, `xy.ts:159`, `LinearShift.#index`, `verifyEquivalence`'s parameter) touch nothing but the five declared operations — no field assignment from outside exists in `src/`. The accessor removal is representational: normalized-diff against `a0160ce5` shows getter deletion, `implements RectIndexView`, and `const { values } = this` in place of closure reads, with no change to the warm-return test, the resize branch, the scan, the settle call, the hole write or `retire()`. Gate coverage is unchanged — `RectIndexView` declares no method members, so nothing left the gate's reach, and a detached `index.advance` still reports (above). The equivalence instrument survived its inversion and is live: perturbing `RectIndex.advance`'s centre by 3 px fails **19** tests with `drag: the predicted insertion geometry disagreed with a full scan at slot 0; G3-linear does not hold for this list`.

**Property 4 — the placements that were kept are the ones the rule asks for.** `refresh` takes one reading, immediately before `getBox(item)` and nowhere else; `N` with a resolver, zero without. `LinearShift.moved`'s retired reading is genuinely carried upstream: `spec.ts:1251` reads `this.#kernel.closed` immediately after `movePlaceholder` and immediately before the `movedInsertion` hook, which is the placement the rule states. `xy.resolve`'s retired reading guarded `compareDocumentPosition`, a platform query, and the `Insertion` behind it is refused at `spec.ts:1076`. The five retargeted last-candidate cases are all present and green — two in `y.browser.test.ts` (`should still read the placeholder …`, `should leave the cache clean …`), three in `xy.browser.test.ts` (the two mirrors plus `should compare document position even after the anchor read closed the controller`) — and each asserts completion rather than refusal, matching the corrected disposition. What the reduction does not cover is rr-1.

**Property 5 — `Kernel` is the object, and the façade is gone.** The class's non-private surface is exactly `realm`, `root`, `destroy`, `cancel`, `closed` (getter), `dispatch`, `fail` and `arm` — enumerated from the class body, nothing else. `BehaviorContext` names the first seven. No `host` record, and `KernelHost` appears nowhere in `src/`, `tests/` or `bench/` (one historical mention in `tests/COVERAGE.md` describes a deleted protocol). `arm` carries no runtime guard, exactly as F-308 records; the narrowing is the single statement `behavior(kernel)` at `kernel.ts:250`. `cancel` forwards with the same optional-argument shape, and `destroy` forwards to a promise allocated once — verified by tracing every writer of `#queue.closed` and every caller of `#runPhysicalTeardown`, including `#panic`, which reaches teardown through `void this.destroy()` rather than around it. The `sortable.browser.test.ts` decorator forwards member by member with `closed` as a live getter, so the harness reads the real latch. The one thing not defended by a test is rr-4.

**Property 6 — one falsifier per boundary is armed, two are not.** The narrowing falsifier fails for the intended wrong shape (rr-3). The receiver falsifiers fail for theirs (property 2's table). The equivalence instrument fails for a wrong prediction (property 3). `ConstraintView` is retained and published, pinned by `consumer.node.test.ts:1190` and exercised by four browser suites. `BehaviorContext` is in `vocabulary.node.test.ts`'s published-type list and reached through `drag.js` and `kernel/spec.js` in the consumer fixture. The two gaps are rr-2 and rr-4.