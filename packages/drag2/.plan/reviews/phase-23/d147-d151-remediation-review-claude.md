# The D-147…D-151 remediation, reviewed at `cdc83990`

Review, 2026-08-28. Files read, compiled and measured at `cdc83990`; the current tree is one commit further on at `25084a9c`, which touches neither of this pass's subjects and is noted only where a byte moved. **No production code changed.**

Reviewing the landed implementation of **D-147** (retire-hook ledger), **D-148** (fixed axis), **amended D-149** (both runtime aggregates dissolve) and **D-151** (positional composition check), and the closure of **F-132…F-136**, against the guarantees those decisions claim. The direction is taken as settled.

**Verdict: the guarantees hold.** D-151's check was verified by seventeen compiled cases at the real public entries and refuses every misplacement while touching no legitimate plugin; the runtime dissolution is field-for-field state-preserving and the rewritten tests genuinely drive the production wiring; D-147 changes representation and not execution or receiver; D-148 leaves no live axis policy behind. Six findings, **one tier B** and five **tier C**, all in documentation, pinning or measurement rather than in behaviour.

---

## 0. What was checked, and how

| Area | Result |
| --- | --- |
| D-151 — refusal at the real entries, both behaviors, config and fragments | **Clean** — 8/8 refused — §1.1 |
| D-151 — multi-writer accumulation untouched | **Clean** — 9/9 accepted — §1.2 |
| D-151 — not exact-shape validation | **Clean** — §1.2 |
| D-151 — `const` inference load-bearing | **Confirmed by counterfactual** — §1.3 |
| D-151 — widening residual is the documented boundary | **Clean, and asserted as such** — §1.3 |
| D-151 — disjointness prerequisite genuinely pinned | **Confirmed by counterfactual** — §1.4 |
| D-151 — new public surface | **F-147, tier C** — §1.5 |
| D-149 — no state or lifecycle guarantee lost | **Clean, field-for-field** — §2.1 |
| D-149 — rewritten tests drive production, not another shortcut | **Clean** — §2.2 |
| D-149 — stale-frame and displacement-view discrimination | **Clean** — §2.3 |
| D-147 — retire order and receiver | **Clean**; **F-151, tier C** on pinning — §3 |
| D-148 — no stale axis machinery in code | **Clean**; **F-146, tier B** in the published contract — §4 |
| F-132/F-133/F-134 closures | **Clean** — §5 |
| F-135/F-136 closures | **F-148, F-149, tier C** — §5 |
| Size and attribution | **F-150, tier C** — §6 |
| Suite | 65 files, **1190 passed**, 116 skipped, **no type errors** |

---

## 1. D-151 — the composition check

### 1.1 Misplaced unique installers are refused at the real entries

Compiled through `sortable()` and `freeDrag()` themselves — not through the aliases — with published values and no cast. **All eight refused:**

```ts
sortable(root, base, { plugins: [xy()] }); // fragment
sortable(root, { ...base, plugins: [xy()] }); // first argument
sortable(root, base, { plugins: [(c) => ({ insertion, retire: dispose })] }); // literal
sortable(root, base, { plugins: [landing().landing!] }); // landing as plugin
sortable(root, base, { plugins: [anim, xy(), anim] }); // mixed array
freeDrag(el, drop, { plugins: [bounds().bounds!] });
freeDrag(el, drop, { plugins: [(c) => ({ constrain, retire: dispose })] });
freeDrag(el, drop, { plugins: [(c) => ({ startLanding, retire: dispose })] });
```

**F-131 is closed at its own headline case.** `plugins: [xy()]` beside `axis: y()` — the route that compiled at `4568e563` and silently discarded the geometry while leaving its `retire` unregistered — now fails to compile.

**The diagnostic carries the sentence, and names the right key each time.** For a hoisted alias the first line is short and readable:

> Type `'AxisInstaller'` is not assignable to type `'AxisInstaller & Readonly<{ [MISPLACED]: "installer contributes 'insertion', which only its own config key may install" }>'`

`startLanding` and `constrain` produce the same shape with their own key named. For a **literal** the sentence is behind a full structural dump of the inferred function type and only appears on the second line — inherent to how TypeScript reports an intersection mismatch, not a defect, but worth knowing before it is described as self-explaining.

### 1.2 Legitimate multi-writer contribution is untouched, and the check is not shape validation

**All nine accepted**, including two plugins in one array plus a third in a fragment, a plugin contributing one hook, `() => ({})`, an empty array, no `plugins` key at all, and both first-party fragments.

**Two probes specifically for over-reach:**

- A plugin whose contribution carries an **unknown extra member** — `(c) => ({ retire: dispose, myOwnThing: 1 })` — **compiles**. `UniqueIn` extracts `Extract<keyof C, Unique>`, so a key that is neither a plugin key nor a unique key is invisible to the check. It is not exact-shape validation.
- A plugin whose return type is a **union** with one arm carrying a unique slot is **refused**. That is F-144's distributivity working: the non-distributive spelling would have reported only the members every arm shares and could never fail.

### 1.3 `const` is load-bearing, and the widening residual is the documented boundary

**Confirmed against a counterfactual signature**, identical but for the modifier:

| Call                              | with `const C, const F` | without      |
| --------------------------------- | ----------------------- | ------------ |
| `{ plugins: [anim, xy(), anim] }` | **refused**             | **accepted** |
| `{ plugins: [xy()] }`             | refused                 | refused      |

Exactly F-145 as recorded: subtype reduction collapses the _mixed_ literal to `SortablePlugin` before the check sees it, while a single-element literal is unaffected. **The falsifier is pinned** — `should refuse one offender among legitimate plugins` exists in both declaration suites, so deleting `const` fails the suite rather than passing it.

**The widening residual behaves as documented.** `const p: SortablePlugin = xy()` and `const arr: readonly SortablePlugin[] = [xy()]` both pass, which is D-151's stated out-of-scope case, and both suites carry `should accept a widened installer, which is the documented residual` as a positive control. The boundary is where the record says it is. **It is stated in the record and in the suites, and not on the published surface** — `SortableComposition`'s own JSDoc describes the check without naming what it does not reach — so a consumer reading only the declarations would read the refusal as total. Noted rather than filed: the residual requires an annotation that forgets provenance, which is not something a consumer does by accident.

### 1.4 The disjointness prerequisite is genuinely pinned

The suites assert `Disjoint<AxisContribution, LandingContribution, SortablePluginContribution>` equals `true`. **Verified discriminating by counterfactual**: giving the landing group an `insertion` member makes the alias evaluate to `never`, and `expectTypeOf<never>().toEqualTypeOf<true>()` fails. (The looser `const x: true = …` spelling would _not_ have caught it — `never` is assignable to everything — so the `expectTypeOf` form is doing real work here.)

**One structural limit worth naming, not a finding.** `Disjoint` is binary and the unique-slot set is fed a hand-written union — `AxisContribution | LandingContribution` in `sortable.ts`, its twin in `free-drag.ts`. Both are total over the two non-plugin groups each behavior has today. A third capability group would have to be added to both the union and a new `Disjoint` pair, and nothing forces either. _Derived rather than listed_ is exact about the **keys** and not about the set of groups.

### 1.5 F-147 — the ordinary entries gained a published type each (tier C)

D-151 records that the four helper aliases live in `shared/composition.ts` and are re-exported from both middle tiers, **so the ordinary entries gain no export**. That is true of the four helpers. It is not true of the entries:

- `sortable.d.ts` exports `SortableComposition`
- `free-drag.d.ts` exports `FreeDragComposition`

Both are new, both are consumer-reachable, and **no test names either** — the packed consumer fixture and `exports.node.test.ts` do not mention them, and `exports.node.test.ts` compares runtime values, which are correctly unchanged (`sortable.js` and `free-drag.js` export exactly what they did). The tier-closure rule is satisfied: each alias's closure resolves through `sortable/feature.js` / `free-drag/feature.js`, which is why the four helpers are re-exported there. So this is an accuracy and pinning gap, not a design defect — but the sentence in the ledger reads as though the entry surface did not move, and it moved by one type each.

## 2. D-149 — the runtime aggregates

### 2.1 Nothing was lost

Compared field for field against `cdc83990^:src/sortable/runtime.ts`:

| Was | Is | Same |
| --- | --- | --- |
| `snapshot: { items, version: 0 }` | `let snapshot = { items, version: 0 }` | yes — and `let version = 0` is what `let { version } = rt.snapshot` read |
| `source` | `sourceIdentity`, seeded from the same argument | yes |
| `view` / `placeholder` / `lift` | `presentation` / `activePlaceholder` / `lift` | yes |
| `spatialSeq` / `pendingSpatial` | same names, spec locals | yes |
| `frame`, created **eagerly per controller** in the factory | `spatialFrame`, created eagerly in the spec | yes — the M-2 eager-vs-lazy choice is unchanged, only relocated |
| `host`, `slots` | destructured on the spec's first line, as before | yes |

The self-referential `let runtime!: SortableRuntime` genuinely goes: the task body now reads `presentation` from the same closure.

**`retire()` is identical in both behaviors**, member for member, with only the loop direction changed:

```
sortable: progress, spatialFrame.cancel(), pendingSpatial, activePlaceholder, lift, presentation
free drag: progress, lift, originRect, space, view
```

Both match the pre-dissolution lists exactly. What is _not_ cleared — `snapshot`, `sourceIdentity`, `version`, `spatialSeq` — was not cleared before either; those are controller-lifetime state, and I-20's subject is the per-operation set.

### 2.2 The rewritten tests reach the real boundary

`createSortableRuntime` and `createFreeDragRuntime` have no callers anywhere; **no test writes behavior state**. Both benches construct through `draggable(root, createSortableBehavior(items, slots))` — D-126's sanctioned seam, which widens the _input_ domain and then runs the production path.

The observation bench is careful in a way worth recording: it decorates `dispatch` by **prototype delegation** rather than by spread, with the reason stated at the site — `closed` is a live getter on the host and a copy would freeze it at construction, "which is the very stand-in D-149 refuses". The `PresentationView` is read as a declared slot receives it, not off a field.

The one remaining fabrication is **named**: a draft in an illegal phase, "which no producer can reach", carried as F-142. That is the disposition D-149 asked for — report the resisting state as a testability finding rather than restore the container.

### 2.3 Both invariant cases still discriminate

- **Stale spatial attempt.** The row drives a real drag, reads the attempt number the `dispatch` decorator actually observed, and calls `spec.action.prepare(TAG_SPATIAL, observed + 1, draft)` expecting `null` **and** `resolved === 0`. Removing the staleness comparison makes `resolveInsertion` run and the second assertion fail. It discriminates, and it is now built on a measured attempt rather than an assumed one.
- **Displacement-view lifetime.** Every exit is reached from a declared slot — a throwing `measureInsertion`, a throwing `invalidateInsertion`, a throwing hook, a cross-container anchor — driven as real committed moves, and the assertion reads `bench.view().insertion` from the object the production path handed a slot. The previous form drove the seam directly; this one is strictly stronger.

## 3. D-147 — the ledger

**Execution order is unchanged.** `retireHooks.reverse()` is gone from both assemblers, the array is stored in installation order, and all four readers walk it backwards — the two construction unwinds (already indexed before this pass) and the two retirement loops. Reverse installation order in, reverse installation order out.

**No receiver behaviour changed.** The retirement loops went from `unwind(hook)` to `unwind(slots.retireHooks[i]!)`; `createUnwind` calls `step()` bare, so the hook is handed `undefined` either way. The construction unwind's `retireHooks[i]!()` — an indexed call that hands the hook the internal array — is untouched. `tests/free-drag/anchor.browser.test.ts` covers this properly and is insensitive to the change by construction: its rows assert `receiver !== own()`, the published negative, with a header explaining that the narrower `=== undefined` form was abandoned precisely because it was a mechanism claim.

**The cost D-147 named is paid, for one behavior.** `tests/sortable/assemble.browser.test.ts` now honestly pins _storage_ order and says so, applying the rule it checks in its own loop; the execution guarantee is driven at the boundary by `should run the retire hooks, each wrapped`, which cancels a real controller and asserts `['last-installed', 'first-installed']`.

### F-151 — free drag's retire execution order is pinned by nothing (tier C)

D-147 moved the guarantee from representation to execution and identified the spec-level row as where it now lives. **There is no free-drag equivalent.** `tests/free-drag/anchor.browser.test.ts` asserts the retire hook's _receiver_ at both retirement sites; nothing asserts the _order_ in which free drag's hooks run. Reversing the direction of `free-drag/spec.ts`'s retirement loop leaves the suite green. The published guarantee — _run in **reverse** installation order_, stated on `LandingContribution.retire`, `ConstraintContribution.retire` and `FreeDragPluginContribution.retire` — is asserted for one behavior of the two the decision touched.

## 4. D-148 — fixed axis

**The code is clean.** `AxisSource` exists nowhere in `src/`; `FreeDragSlots.axis` is `DragAxis`; `assemble` stores `config.axis ?? DEFAULT_AXIS` unresolved-no-longer; `action.prepare(TAG_POLICY)` stages nothing and there is no `TAG_POLICY` branch in `effect`. `TAG_POLICY` itself is **not** stale machinery — `controller.invalidate()` still dispatches it and the seam still handles it, now with one meaning and one call:

```ts
if (tag === TAG_POLICY) {
  invalidateConstraint?.();
  return null;
}
```

The I-36 barrier is deleted with the second consumer call it gated, which is the right reason. `invalidate()` means _the constraint's cached geometry is stale_ and nothing else — in the code.

### F-146 — the published `invalidate()` contract still promises the deleted re-read (tier B)

[`free-drag/controller.d.ts`](../../../src/free-drag/controller.ts), shipped:

> **A policy source may have changed.** Carries no payload: the library asks rather than being told, so **`axis` and the bounds source are re-read** rather than handed over.
>
> Applied as a **queued action**, so it lands in FIFO order with everything else the drag is doing, and **your sources are read** inside the library's own transaction rather than on this statement.

`axis` is not re-read and cannot be: it is `DragAxis`, fixed for the controller's lifetime by this very decision. A consumer following the published surface would mutate an axis source and call `invalidate()`, and nothing would happen — which is the failure mode D-148 chose to remove, still documented as a feature.

**The pass knew this and updated one of the two published sites.** [`free-drag/config.d.ts`](../../../src/free-drag/config.ts)'s `axis` slot was rewritten in this same commit and now reads _Fixed for the controller's lifetime … A per-sample lock … is a `bounds` installer_. The controller member two files away was not. The module header above it — _Every mutable policy slot is a source the library re-reads_ — is now a statement about exactly one slot and is overbroad in the same direction.

This is the tier-B finding because it is the **consumer contract**, not internal prose, and because the two halves of the same published surface now disagree with each other.

## 5. The review fallout

**F-132 and F-133 are closed properly, and the method is the part worth keeping.** Both suites' old _should refuse a unique slot from the unbounded position_ rows are struck in place with an explanation, and replaced by `should not refuse a unique slot at the group alone` — which asserts that `() => ({ insertion, retire })` **compiles**. That is exactly the falsifying control the old rows lacked: it states what weak-type detection actually reaches, so the row can no longer be read as a boundary. The property moved to the position, where §1 finds it holding. F-133's vacuous `.not.toEqualTypeOf<'insertion'>()` is gone and the landing-installer crossing now has a row and a control.

**F-134 is closed and the result is coherent.** `if (constrain) { retireHooks.push(constrain.retire); }` is guarded, with a comment naming F-134 and stating the deliberate divergence: the sortable throws at its flat record's dereference, free drag's slot is nullable and the composition simply has no constraint. A JS-authored `bounds` installer returning `{ retire }` now has its own `retire` recorded before anything can throw, so **no acquired lifetime leaks**; the silent outcome matches what a `landing` installer returning no `startLanding` already did. Two silent members and one loud one, with the structural reason for the difference stated at the site.

### F-148 — F-135's closure repaired the enumeration rather than the class (tier C)

Everything my table named is fixed — `README.md`'s `claim` sentence, `src/free-drag.ts`'s `FreeDragInstaller`, both _feature array_ referents, contract 03's §133 and §1200, contract 05's §99 and §666, the assemble suite's header, `exports.node.test.ts` and both COVERAGE rows. **Four unstruck present-tense sites naming the deleted `SortableContribution` remain in the normative contract, and one in the plan:**

| Site | Text |
| --- | --- |
| [`03-feature-composition.md:5`](../../contract/03-feature-composition.md) | _every new semantic seam requires coordinated edits to the public config schema, `SortableContribution`, `SortableSlots`…_ |
| `03:1224` | _`SortableContribution` has exactly one slot that produces an `Insertion`_ |
| `03:1350` | _the minimum middle-tier surface is whatever `SortableContribution` and `FeatureContext` reach_ — the first half of the same line **was** rewritten to _the three installer aliases, the three contribution groups_, and _All five were on the list above_ no longer matches the six-item enumeration beside it |
| `03:1396` | _adding a member to `SortableContribution` … is **now** a breaking change_ — a standing semver obligation on a deleted type |
| [`plan.md:1585`](../../plan.md) | _`SortableContribution` has exactly one slot that produces an `Insertion`_ — the standing justification for not publishing `homeInsertion`, not dated narrative |

**And this pass introduced one of its own:** [`tests/perf/m2.browser.test.ts:11`](../../../tests/perf/m2.browser.test.ts) — _`SortableRuntime` creates its `FrameTask`_ — present tense, in the header of the live perf suite whose measurement the new `createSortableSpec` comment cites by name.

(`tests/probes/13c-free-drag.ts` and `tests/revision/phase-14.ts` declare their own local `FreeDragRuntime`/`SortableRuntime` types; those are frozen fixtures of other surfaces and are not residue.)

### F-149 — F-136's correction landed in one register and not the ledger (tier C)

The closure says _corrected in place_. [`plan.md:1963`](../../plan.md) is corrected — the brotli interval reads −0.04 to −0.09 and the premium _falls to 221 B_ — and a dated correction paragraph was added below it naming the five-commit arc. **The D-146 row in the ledger was not**: [`00-index.md:482`](../../contract/00-index.md) still reads

> **Measured** at −99 to −216 B minified per composition row, **−0.05 to −0.07 kB brotli** … the composition premium … falls **from 283 B to 221 B** (2.4% → 2.0% of `complete`)

with both figures the finding disproved, in the register that is normative. `plan.md:1963` also keeps _2.4% →_, the other half of the pair whose _283 B_ it removed.

## 6. F-150 — this pass's own premium figures do not reproduce (tier C)

Measured twice at `cdc83990` by importing `measureAll` and reading raw bytes; the two runs agree to the byte, and the method reproduced five earlier commits exactly.

| [`bundle-structure.md:179`](../../bundle-structure.md) | Recorded | Measured at `cdc83990` |
| --- | --- | --- |
| composition premium | **142 B**, 1.3% | **147 B**, 1.38% |
| `complete` brotli | 10,677 | **10,686** |
| `baseline A` brotli | 10,535 | **10,539** |
| every sortable row, minified | −400 B | −398, −395, −398, −398, −398 |
| every free-drag row, minified | −384 B | −382, −383, −382, −382 |
| `both behaviors`, minified | −786 B | **−782 B** |
| `baseline A`, minified | −145 B | **−143 B** |
| `kernel.js` 17,017/6,116, `drag.js` 344/159, baseline B 22,573/6,889 | byte-identical | **exact** |
| modules removed: `sortable/runtime.js`, `free-drag/runtime.js`, `free-drag/slots.js` | — | **exact** |

**The qualitative account is right and the arithmetic is not.** Every control row and the whole module topology reproduce exactly, so the instrument and the environment agree; every delta and absolute is small and consistently off, which is the signature of figures taken at a slightly different tree state within the same change. At HEAD (`25084a9c`, which inlines the two install functions) the premium is **131 B**, so the recorded 142 sits between two real takings and matches neither. This is F-136's own general form — _a size range is a property of the interval it was taken over_ — recurring in the pass that closed it.

---

## 7. Findings

- **F-146** (tier B) — the shipped `invalidate()` JSDoc still promises that `axis` is re-read, and its sibling published site was corrected in the same commit. §4.
- **F-147** (tier C) — `SortableComposition` and `FreeDragComposition` are new published types on the ordinary entries, which D-151 records as gaining no export, and no test names either. §1.5.
- **F-148** (tier C) — F-135 was closed against the review's enumeration; four unstruck sites in contract 03 and one in `plan.md` still name `SortableContribution`, and this pass added `SortableRuntime` to a live perf-suite header. §5.
- **F-149** (tier C) — F-136's correction reached `plan.md` and not the D-146 ledger row, which still carries both disproved figures. §5.
- **F-150** (tier C) — the pass's own premium and per-row deltas do not reproduce; controls and module topology do. §6.
- **F-151** (tier C) — free drag's retire execution order is asserted nowhere, in a pass whose decision turns on execution order. §3.

## 8. What would falsify this

- **Every type claim is a compile experiment** run with `--ignoreConfig` and explicit `--strict`, not through the package `tsconfig`. The harness is controlled: it reproduces the suites' own passing and failing rows, the documented cross-behavior refusals, and an ordinary excess-property error. §1.3's counterfactual re-declares the entry signature rather than editing it, so it tests the modifier and not the entry.
- **§2.1 is a reading of two revisions side by side**, not an execution. The suite passing is the behavioural evidence, and it is a strong one here because the rewritten rows drive real drags.
- **F-150 is one toolchain and two runs per commit.** They agree to the byte and reproduce five earlier commits exactly, which is why the discrepancy is reported rather than absorbed — but a different `rolldown` or Brotli would move all of it together.
- **I did not re-derive any of the four decisions.** The brief settles the direction; every section checks whether the implementation holds the property the decision claims.