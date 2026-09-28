# D-190 challenged before implementation

**Subject** the Arc D decision at `e60e0c7d9` — D-190 and the three findings it mints, F-403, F-404 and F-405 — read as a candidate rather than as settled architecture. **Tree** `e60e0c7d9`. **Evidence sources** [`entity-model-b73b6779-claude.md`](entity-model-b73b6779-claude.md) §C5, [`entity-model-adjudication-claude.md`](entity-model-adjudication-claude.md) §5, and the source at this tree.

**Method.** Every census below was reconstructed from the source rather than read out of the decision. Every mechanical claim was **executed** in a worktree detached at `e60e0c7d9`, with `node_modules` linked and the main checkout verified clean throughout; all mutations were reverted and the worktree removed. Two discovery agents were dispatched and their results are not relied on: nothing here is cited that was not confirmed by hand.

**Result in one line.** **The premise holds and every disposition is right.** What does not hold is the **rule** offered to justify them, the **prerequisite** made of F-404, and the **ground** F-326's move is proved on.

---

## 1. The premise survives, and the corroboration is stronger than the decision's own

`PresentationView` is the sortable's activation record already. Written whole at [`spec.ts:929-931`](../../src/sortable/spec.ts) — `activePlaceholder`, `lift` and the record in three consecutive statements — and cleared whole at `:1864-1866`, in three consecutive statements of `retire()`. **No code runs between either group**, so the partial states the type permits are not reachable: there is no instant at which `activePlaceholder` is non-null with `presentation` null, or the reverse, that any reader can observe.

The lifecycle was walked for an interval where the members do not share the property:

- **Before activation** — `presentation` is null at `MINTED` and `PENDING`; the record is built in `activation.effect`, which runs only on a committed seam.
- **Between the record and `onStart`** — `:931` to `:983` is reachable with the record complete and `progress` still `MINTED`: `#invalidateInSeam()` may fail at `:949` and `kernel.closed` may latch at `:974`. The record is complete throughout. This interval is why `progress` cannot be a member (§3).
- **`IDLE` with a record** — unreachable: `spec.retire()` is teardown step 4 and `#frames.retire(#scrub)` is step 6, so the record is gone before the frame returns to `IDLE`.
- **After retirement** — nothing re-creates it; the kernel carries one operation.

**And the shape has an owner one tier down that states the invariant D-190 wants.** [`kernel.ts:201-240`](../../src/kernel/kernel.ts)'s `ActivationRecord`: _A second lifetime, not three fields left null until activation … Apart, each record is complete where it is constructed_; **_Complete-or-absent, and that is the whole of the invariant_**; and _never a second lifecycle authority: `phase` on the frame is the sole lifecycle discriminant … Read this record for what activation acquired, never for where the operation is._ It carries `lift`. That paragraph decides `lift`'s admission, `progress`'s refusal and the completeness property in one place, and it is already law in this package. D-190 cites the field pair at `kernel.ts:361` and stops short of the docblock that carries the argument.

**No other existing object owns the responsibility more naturally.** The candidates were checked: `SortableSlots` is per-controller and cannot promise a non-null `placeholder`; `#transaction` is explicitly the third lifetime and each field is cleared by the phase that owns it; the kernel's own `ActivationRecord` is the kernel's activation, not the behavior's, and the behavior cannot name it. **Nothing is extracted here** — confirmed.

---

## 2. The membership rule does not decide its own table

> _a value belongs to the activation record only when the frame does not commit it **and** a reader actually names it._

Stated as _two tests and must pass both_, it is silently a **three**-test rule: the sentence that follows — _a value passing both but not scoped to activation stays on the operation record_ — is what actually evicts `pendingSpatial` and `progress`, and the table has no column for it.

**The third clause is not applied where it bites hardest.** Three of the six surviving members are **controller**-lifetime values copied per operation, exactly as `realm` is:

| Member        | Source at `spec.ts:931-947` | Lifetime of the value    |
| ------------- | --------------------------- | ------------------------ |
| `realm`       | `this.#realm`               | controller — **evicted** |
| `box`         | `this.#slots.box`           | controller — kept        |
| `settle`      | `this.#slots.settle`        | controller — kept        |
| `live`        | `this.#live`                | controller — kept        |
| `space`       | `scope.itemSpace`           | activation               |
| `placeholder` | `placeholder`               | activation               |

The record's own docblocks say so in the words the decision uses to evict: `box` is _copied off the slots once per operation rather than read through `slots` per rebuild_; `settle` is _copied off the slots once per operation_; `live` is _one closure per controller copied by reference per operation_. Under the rule's own third clause all three should stay on the operation record, or on nothing. **They stay for a reason the rule never states**: `InsertionRuntimeView` must be satisfiable by **one object** with no per-call allocation, which is a view-shape constraint and not an ownership one.

So the second test is doing **view-membership** work. For a value inside the published view it is circular — the view names it because the axis reads it — and for a value outside the view it degenerates to exactly what the challenge asked about: **today's first-party reader census promoted to architecture**. `realm`'s eviction is the case that shows it: `realm` is over-determined, and the decision picks the census ground over the structural one.

**Counterexamples, both directions.**

- **Owned, activation-scoped, and the rule's second test does not carry it.** `lift` has one reader and a known frozen-SPI alternative that would delete it outright; D-190 admits it anyway, on ownership. That admission is right and the rule does not produce it — the rule would have to say that one reader is enough, which is the same census it uses to evict `realm` at zero.
- **Passes both tests, belongs elsewhere.** `pendingSpatial`, which D-190 concedes and handles with the appended clause; and `box`/`settle`/`live`, which it does not.

**The rule that decides all thirteen rows without a census:**

> _A value belongs to a behavior's activation record when its lifetime **is** the activation's, or when a published view the record must satisfy **names** it — and never when the frame commits it._

`realm` fails both limbs → out, on structure. `box`, `settle`, `live` pass the second → in, for the reason they are actually there. `space`, `placeholder`, `lift` pass the first → in. `item`, `insertion`, `snapshot` are committed frame state → out, by D-177 unchanged. `pendingSpatial` and `progress` fail both limbs → out. Readers stay what D-177 always used them as: **evidence** of ownership, never its definition.

---

## 3. The two declines are right; both are argued from the weaker of two available grounds

**`progress`.** D-190: _read at `MINTED`, which is the state of an operation that never activated, so it must exist before the record does_. True — an activation that fails before `:931` reaches `prepareSettlement:1652` with `presentation` null and `progress === MINTED`. But the read is **also** reachable with the record present (§1's second interval), so the argument is narrower than it sounds. The rule that settles it outright is the kernel's, quoted above: the activation record is **never a second lifecycle authority**, and `progress` is a lifecycle marker. Refused on a rule, not on a census.

**`pendingSpatial`.** The stated ground — _the coalescing latch of a **controller**-lifetime frame task_ — describes the task, not the field. The task is per-controller ([`spec.ts:386`](../../src/sortable/spec.ts)); the **field** is reset per operation at `:1863`, and its only reader at `:1051` sits behind `!this.#operation.presentation` in the same condition, so it is never read without a record present. The ground that holds is the one D-190 also gives: **mutability against complete-or-absent**. Verified: its only writer is `:394`, behind `if (!this.#operation.presentation) { return; }` at `:390`.

**And that ground is bought by the arc's own last two steps.** The record is all-`readonly` only after `snapshot` and `insertion` leave — steps 3 and 4. The rename to `SortableActivation` lands at step 2, naming the type for a property it does not yet have.

---

## 4. `realm` and `item`, executed

Deleted `realm` and `item` from `PresentationView` and from its construction:

- `tsc -p tsconfig.json --noEmit` — **clean**.
- `--project node` — **355 passed, 3 failed**, identical to the baseline run in the same worktree (three packed-package rows that need a built tarball).
- `--project browser` — **862 passed, 60 skipped, 39 files**.

**F-403 confirmed.** The second half is confirmed by reading: [`runtime.ts:41-44`](../../src/sortable/runtime.ts) argues _Committed frame state, so it cannot change for the life of the view — hence `readonly` and written once at activation_, while [`slots.ts:78-81`](../../src/sortable/slots.ts) argues the opposite about the same value — _duplicating it onto the per-operation view would create a second copy that could drift_ — and D-177 quotes the second as one of the two independent authorings that made the rule an entry. The contradiction is real and the tier is right.

---

## 5. F-325 — the deletion is a repair, and the test census is off by one row

**The published contract is false today, which the decision loses.** [`slots.ts:122-129`](../../src/sortable/slots.ts) tells a third-party axis author that `InsertionRuntimeView.insertion` is _read in two places and means the same thing in both: `resolve` records which gap the buffer it just measured reflects, and `moved` is told which gap the write that just happened moved it to._ In the tree, `view.insertion` is written at [`spec.ts:1213`](../../src/sortable/spec.ts) and cleared at `:1293` inside the **effect** bracket, and `resolve` runs in the **prepare** — so at `resolve` the member is `null` and the sentence is wrong. An axis following it records nothing. F-325 says this; D-190 restates the deletion as a member with no reader, which makes a repair look like a sweep.

Neither shipped axis reads it: `y.ts`'s and `xy.ts`'s local `InsertionRuntimeView`s and `linear-shift.ts`'s `LinearRuntime` each name six members — `snapshot`, `placeholder`, `box`, `live`, `settle`, `space` — and **none** names `insertion`. Confirmed by reading all three declarations.

**The test census.** `describe('the displacement view lifetime')` runs `:3316-3507` and holds **seven** `it` rows, not six:

| Row | Asserts the gap | Asserts the stage |
| --- | --- | --- |
| `:3383` successful bracket | yes | yes |
| `:3387` placeholder write refused | yes | yes |
| `:3396` move hook fails | yes | yes |
| `:3413` lazy invalidation fails | yes | yes |
| `:3444` sink throws | yes | yes |
| `:3465` invalidate on failure | **no** | yes — over an override byte-identical to `:3396`'s |
| `:3480` invalidate then resolve at release | **no** | **no** — a call-order sequence, and it reads no view |

So the migration is five rows losing a half, one row already pure classification, and one row untouched. The decision's _six rows … each assert two things_ is wrong on both numbers — **and the surviving classification coverage is five distinct exits, not six**: `:3465`'s `runBracket` override is character-for-character `:3396`'s and its assertion is a strict subset of `:3396`'s, so it buys no exit. The five kept are the successful bracket, the refused write, the throwing move hook, the throwing lazy invalidation (`:3413`, where a second failure is raised inside the `finally` handling the first) and the throwing sink. The disposition is right; the count is not.

**And the sweep has three sites the decision does not name**, which F-402's standing property already requires: `COVERAGE.md:554` is keyed on _the `finally` still clears `view.insertion`_, `:268` on _leaves `rt.snapshot` unchanged_, and `features.browser.test.ts:1589` repeats the first in a comment. **`:554` is wrong before Arc D reaches it** — the row it names asserts `expect(applied).toEqual([])` at `:1623` and nothing about the view — so it is filed as **F-408**, F-401's shape a third time and in the same register file.

`bench.view()` is read at four sites: `:3380` (`.insertion`) and `:3008`, `:3080`, `:3119` (`.snapshot`, each fabricating a draft). With both migrations landed those four go, and with them `captured` at `:530-539` and the `PresentationView` import. **Confirmed.** The three snapshot rows do need another handle, as the decision says.

---

## 6. F-326 — the conclusion holds; the ground it is proved on is false

> _`prepareAction`'s spatial branch returns `null` unless `draft.phase === ACTIVE` (`:1049`) and **it is the sole producer of both slot calls**._

**It is not.** There are three slot-call sites, and the third is outside the gate:

| Site | Call | Phase |
| --- | --- | --- |
| `spec.ts:1057` | `resolveInsertion(draft, presentation)` | `ACTIVE`, by the guard at `:1049` |
| `spec.ts:1270` | `movedInsertion(current, view, report)` | `ACTIVE` — the effect of the seam that guard prepared |
| **`spec.ts:1407`** | **`resolveInsertion(draft, view)`** | **`RELEASING`** |

`#closeOperation` commits `RELEASING` at [`kernel.ts:1863`](../../src/kernel/kernel.ts) and calls `runReleaseSeam` at `:1870`, and `FrameTransaction.commit` writes the phase onto the draft, so `prepareRelease` runs at `draft.phase === RELEASING`. The divergence interval is opened by the collection prepare's early return at `spec.ts:1127`, whose condition is `phase === IDLE || phase >= RELEASING`. **The axis read and the divergence interval overlap in phase.** The structural claim _no axis ever sees that interval_ is not a property of the phase gate.

**What actually closes it** is one statement wide: between `#frames.commit(RELEASING)` and `runReleaseSeam` there is exactly one call, `lifetimes.motion.dispose()`, whose disposers are a `cancelAnimationFrame`, two `AbortController` aborts and a `releasePointerCapture` — none of which can dispatch a collection action. `controller.invalidate()` only ever `dispatch`es (`controller.ts:59`), so a call from consumer code inside the release seam queues behind it. So the conclusion stands, on a kernel ordering fact rather than a behavior guard.

**And the edge is worth booking, because the move changes which side of a disagreement the axis is on.** Today the release resolve reads `runtime.snapshot` — the live one — and `buildReorderProposal` at `:1431` reads `this.#snapshot`, also the live one: **they agree**. After F-326 the resolve reads `frame.snapshot`, the frozen one, while the proposal is still built from `this.#snapshot`. If that one-statement window ever opens, today's behaviour is the consistent one and the moved read is not. The move is still right — `#homeGap` at `:619` already measures the same release against `frame.snapshot!`, and _the home gap is recomputed from the **committed** snapshot_ is written there — so F-326 aligns the resolve with the behavior's other release-time read. **Behaviour-preserving under unreachability, not under the phase gate**, and the falsifiable edge is a producer of a collection commit at `phase >= RELEASING` ahead of the release resolve.

---

## 7. F-404 is not a prerequisite, and its premise is false

> _**Nothing pins either membership.** … a field added to, removed from or silently widened on either view reddens nothing._

**Falsified by execution.** All four mutations Arc D would make are already red under `just typecheck` (`tsc -p tsconfig.json --noEmit`, whose `include` covers `tests/**`). **And the finding's one cited instrument does not exist either**: `consumer.node.test.ts:530` does not import `InsertionRuntimeView` out of the shipped declarations — it sits under a `@ts-expect-error` at `:529` whose subject is the **subpath** `sortable/slots.js` being undeclared, so the type name is inert and the row survives that type being renamed or deleted.

| Mutation | Result |
| --- | --- |
| `InsertionRuntimeView` narrowed — remove `snapshot` | **8 errors** — `src/sortable/xy.ts:158`, `src/sortable/y.ts:181`, and six test sites |
| `InsertionRuntimeView` widened — add `realm`, `item` | **5 errors** — `tests/sortable/xy.browser.test.ts:151,173`; `tests/sortable/y.browser.test.ts:128,152,178` |
| `InsertionFrameView` widened — add `originX` | **5 errors** — the same five |
| `InsertionFrameView` narrowed — remove `pointerX` | **5 errors** — the same five |

The instrument that already exists is **five object-literal fixtures** in the two axis browser tests — `y.browser.test.ts:127/133`, `:146/152`, `:177`, and `xy.browser.test.ts:150/151`, `:172/173` — which build a frame and a runtime and pass them positionally to `geometry.resolve` / `geometry.moved`, whose parameters are the **published** types. Missing-property checking pins the membership from below and excess-property checking from above, in both directions, for both views. The narrowing case is caught in `src/` as well: the axis installers' own declarations are checked against `AxisInstaller`.

**What is genuinely unpinned is F-404's own Required-property sentence, and it is not a key set.** _D-177's whole mechanism is a field moving between two declarations rather than appearing in both, and nothing checks that it left the one it moved from._ That is **disjointness** —

```
keyof InsertionFrameView  ∩  keyof InsertionRuntimeView  =  ∅
```

— and today it is **`{ insertion }`**: declared at `slots.ts:68` and again at `:130`. **A disjointness assertion is red at this tree and cannot precede F-325**; F-325 is the step that makes it green, and F-326 is the step that tests it (`snapshot` must arrive on one side without staying on the other). A key-set falsifier landed first pins a spelling that is already pinned, and then has to be edited by every one of the three steps that follow it — which is the shape §15 and F-316 both warn about, an instrument rewritten by the change it was meant to judge.

**So F-404 is co-resident with F-325, not its prerequisite** — the same ruling D-189 made for F-400, on the ground D-190 distinguishes itself from without checking it. The distinction offered — _F-404's subject is the very type being changed_ — is true and does not carry the ordering: a falsifier for a property that is false today can only land with the change that makes it true.

What F-404 should ask for, restated: the **disjointness** of the two key sets; **one owner's row** — the behavior's own activation record satisfies `InsertionRuntimeView` — which is what makes a view narrowed to nothing fail; and a **named** home for the five fixtures' incidental pinning, so the next author knows it is load-bearing rather than a convenience.

---

## 8. The withdrawal, Q-21 and the close

**The withdrawal is right and the reasoning is not collapsed.** C5's three parts are kept and narrowed rather than refused: the record exists, so nothing is extracted; membership is what changes. Confirmed against the tree at every cited line.

**Q-21 has nothing to act on.** `#operation` is the behavior's own field, cleared by the behavior's own `retire()` at `spec.ts:1860`; the kernel's teardown calls `spec.retire` and reaches past nothing. F-322 bites where a **collaborator** clears for an owner, and none does here. `retire()` keeps its `retireHooks` walk and clears three fields instead of five. ✓

**The four-arc accounting is consistent in the live record**, three-sided: O-13 (_Arc D, the last of the four_), `arc-c.md:41` (_the series ends at Arc D_), and D-189 as corrected. Arc A is D-180 with `arc-a.md`; Arc B is D-181 with `arc-b.md` and `arc-b-remediation.md`; Arc C is D-189 with `arc-c.md`; Arc D is this. **But F-405 is half-discharged.** D-190 says _both statements are corrected in place_; only D-189's was. `00-index.md:2056`, inside inactive D-188 — the entry F-405 names as the origin of the clause — still reads _The series is three arcs rather than four_, unmarked. Either it is corrected, or the ruling is stated that an inactive entry keeps its wording as provenance, which is the rule D-190 itself states three paragraphs earlier for `KernelHost`. As it stands the register still holds the disagreement the finding exists to end.

**The five predicted-unaffected rows are sound, and the falsifier is entailed rather than independent.** Each of `free drag minimal`, `free drag + bounds`, `free drag + landing`, `free drag complete` and `kernel root - kernel.js` carries `absentPrefixes: ['sortable/']` at [`measure.ts:362, 373, 384, 395, 529`](../../bench/size/measure.ts) — an assertion, already enforced, that no `sortable/` module is in that row's graph. Identical module sets with identical contents compress identically, so **no compression interaction is available**: given the arc's stated scope the five cannot move, and a non-zero delta means either an edit outside `src/sortable/` — which `git diff --stat` reports more directly — or build non-determinism. It is a scope tripwire worth keeping and not a reading of its own; calling it _a falsifier of its own_ over-states it.

**Restoration and re-base stay separate, and D-190 reads §18 correctly.** O-13 as D-189 amended it: the close _restores the five controls and authorises nothing else_, a re-base is decided at a reading, and _a re-base may land before the close, at the reading that earns it_. `arc-c.md:49` says the same from the third side. The predicted reading — the five did not move at all — is the weakest case a re-base could stand on, and declining is the precedent `arc-b.md` and `arc-c.md` both set. ✓

**The deferred-table witness is keyed to step four of five.** `present: src/sortable/slots.ts :: snapshot: CollectionSnapshot;` — unique in that file, confirmed — stops holding the moment F-326 lands. D-190 makes steps 3 and 4 **separate commits**, and the joint measurement and the series close are step 5. So `decisions.node.test.ts` requires the row deleted and the `Unimplemented` marker removed while the act that fires O-13 has not happened. The witness should be one the arc's **last** step falsifies.

---

## 9. Two register defects found in passing

§Decision status opens _The **eight** `inactive` rows are the ones whose live residue is empty_ and enumerates eight. The table three lines below carries **thirteen**: the five omitted are **D-7** (superseded by D-155), **D-162** (superseded by D-164), **D-164** (superseded by D-165), **D-167** and **D-169** (both superseded by D-170), each explained in its own entry and none in the paragraph that exists to explain them. The count is a checkable falsehood against the table it introduces. Filed as F-406 and repaired in place; it is the same class as F-405, one document over. **The second is F-408**, above: `COVERAGE.md:554` names a guard the row it cites is the one thing that does not assert — F-401's shape a third time, in the same file, about the field F-325 deletes.

---

## 10. Verdict

**AMEND.** The boundary, the premise, the thirteen dispositions, the withdrawal, Q-21, the four-arc count and the close semantics all stand — several of them on better grounds than the decision gives. Three things need narrowing before implementation: the **membership rule**, which does not decide its own table and promotes a first-party reader census to architecture; **F-404's prerequisite**, whose premise is false by execution and whose real property cannot be asserted before the step that makes it true; and **F-326's ground**, which names a gate that does not cover the release resolve. Two record acts are owed with them: F-405's second half, and a witness keyed to the arc's last step.

## Process

**Probes.** One worktree detached at `e60e0c7d9`, `node_modules` symlinked, five mutations run and reverted; removed before recording. Main checkout verified clean at start and end.

**LSP plugin - available; not used**: the load-bearing questions were statement ordering, phase reachability and type-checker behaviour under mutation, none of which a symbol index answers. Call chains were read directly and every claim was executed; the symbol censuses were delegated to two agents and nothing from them is cited unverified — the three items they returned that this record did not already hold (`:3465`'s duplication of `:3396`, `consumer.node.test.ts:530`'s inert type name, and `COVERAGE.md:554`/`:268`) were each read back against the tree before being written down.