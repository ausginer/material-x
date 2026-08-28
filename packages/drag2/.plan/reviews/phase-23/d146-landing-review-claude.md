# The per-key installer model, reviewed at `4568e563`

Review, 2026-08-28. Files read, compiled and measured at `4568e563`. **No production code changed.**

Reviewing the landed implementation of **D-146** — per-config-key installer and contribution types replacing the flat per-behavior record, `claim()` deleted, the producer-less contributed placeholder deleted — against the decision as written. The architectural direction is taken as settled.

**Verdict: the named-position half of the cardinality model works; the unbounded-position half does not.** A plugin or landing installer is correctly refused in `axis`, the placeholder simplification loses no guarantee, and the suite and typecheck are green. But **every contribution group is assignable to its own behavior's plugin group**, so the `plugins` position still reaches every unique slot — through published values, with no cast — and what used to be a construction-time throw is now a silent discard and a leak. One **tier A** finding, one **tier B**, four **tier C**.

---

## 0. What was checked, and how

Every type claim below was compiled as a probe against `src/` at both `4568e563` and its parent; every byte was measured by importing the instrument's own `measureAll`.

| Area | Result |
| --- | --- |
| Named positions (`axis`, `landing`, `bounds`) refuse the wrong installer | **Clean** — §1.1 |
| The unbounded `plugins` position is multi-writer only | **F-131, tier A** — §1.2 |
| Declaration suites prove what they claim | **F-132 tier B, F-133 tier C** — §2 |
| All-optional plugin groups and weak-type detection | **The whole of the barrier** — §1.3 |
| Required members' JS/runtime failure behaviour | **F-134, tier C** — §3 |
| D-138 branding with `LandingContribution` shared | **Holds** — §4 |
| F-128/F-130 placeholder simplification | **Clean** — §5 |
| Stale docs, diagnostics, exports, dead machinery | **F-135, tier C**; no dead machinery — §6 |
| Size and allocation claims | **F-136, tier C** — §7 |
| Suite | 65 files, **1173 passed**, 116 skipped, **no type errors** |

---

## 1. The cardinality model

### 1.1 The named positions are closed, and that half is real

Compiled at HEAD: a `SortablePlugin` and a `SortableLandingInstaller` are both **refused** where an `AxisInstaller` is expected, and the message is the right one — `Property 'insertion' is missing … but required in type …`. `AxisContribution.insertion` and `ConstraintContribution.constrain` being required is what does it, and it is the mechanism D-146 describes. Nothing can be smuggled _into_ a named capability key.

### 1.2 F-131 — the unbounded position still reaches every unique slot (tier A)

**Every one of these compiles at HEAD, with published values, through the published surface, with no cast and no `any`:**

```ts
// A — a second axis, through the public call, as an ordinary fragment
sortable(root, { items, onReorder, axis: y() }, { plugins: [xy()] });

// B — a hoisted, fully typed ConstraintInstaller assigned to the plugin alias
declare const ci: ConstraintInstaller;
const e1: FreeDragPlugin = ci;

// C — the landing fragment's own installer, reused as a plugin
const f1: SortablePlugin = landing().landing!;

// D — plugin literals carrying a unique slot, through the public call
sortable(
  root,
  { items, onReorder, axis: y() },
  {
    plugins: [(c) => ({ insertion: geometry, retire: dispose })],
  },
);
freeDrag(
  el,
  { onDrop },
  { plugins: [(c) => ({ constrain, retire: dispose })] },
);
```

**B and C are not the F-117 excess-property caveat.** They are plain structural assignability between two _named, typed_ aliases: `ConstraintContribution` is `{ constrain, retire? }`, `FreeDragPluginContribution` is `{ retire? }`, and a type with extra properties is assignable to one with fewer. The contexts carry the same brand, so contravariance never engages. **Every unique-slot contribution group is a subtype of its own behavior's plugin group**, in both behaviors, by construction — the plugin group is the intersection of what the others carry.

**The runtime consequence is worse than a silent discard.** The plugin loops read `retire` (and, for the sortable, the two hooks) and nothing else, so a contributed `insertion` or `constrain` is dropped. For an axis that is also a **leak**: `y()` and `xy()` return `{ insertion: { resolve, invalidate, measure?, retire } }` with **no top-level `retire`**, and only `axis.insertion.retire` is ever registered — from the `axis` key. Placed in `plugins`, nothing at all is recorded in `retireHooks`, so the `VerifiedRefresh`/`RectIndex` the installer allocated lives for the controller's whole life.

**Before D-146 the same code threw.** Verified in `4568e563^:src/sortable/assemble.ts`: the loop ran `claim(insertion, contribution.insertion, 'insertion geometry')` over `[config.axis, config.landing, ...plugins]`, so `plugins: [xy()]` beside `axis: y()` raised `drag: sortable/duplicate-contribution insertion geometry` at construction — **with both features retired**, because the unwind hooks were recorded before the claim. The change therefore trades a loud, correctly-unwound construction-time diagnostic for a silent discard plus an unretired feature.

**On severity.** The brief asks that the reachability rule soften anything reachable only by bypassing the published typed contract. This is not that: `plugins: [xy()]` is ordinary use of two published factories in a published slot, and B and C use nothing but the published aliases. What is falsified is the decision's own central claim — _two writers are unrepresentable rather than detected_ — and the property it deleted `claim()` on the strength of. That is what puts it at tier A rather than the misconfiguration it looks like.

### 1.3 Weak-type detection is the entire barrier, and the package has already dated that lesson

Compiled at HEAD, isolating the mechanism:

| Probe | Result |
| --- | --- |
| `const w: SortablePlugin = (c) => ({ insertion: geometry })` | **refused — TS2559**, _no properties in common_ |
| `const w: FreeDragPlugin = (c) => ({ constrain })` | **refused — TS2559** |
| `const w: SortablePlugin = (c) => ({ insertion: geometry, retire: dispose })` | **compiles** |
| `const w: FreeDragPlugin = (c) => ({ constrain, retire: dispose })` | **compiles** |
| `const w: FreeDragPlugin = (c) => ({ nonsense: 1 })` | refused — TS2559 |

So the literal route is closed by **weak-type detection alone**, and it opens the moment the literal declares `retire` — which is the one thing a plugin exists to declare. `FreeDragPluginContribution`'s _only_ member is `retire`, so free drag's plugin group is defeated by its sole member.

**[`07-free-drag-contract.md:306`](../../contract/07-free-drag-contract.md) already says this, about the previous mechanism:**

> What appeared to close them was TypeScript's **weak-type detection** — an all-optional target refuses an object with no property in common — and that is not a boundary: adding the one member the two records genuinely share, `retire`, satisfies it.

That paragraph is CE1-01/F-74, and its remedy clause is _any fix here must be pinned by an unannotated counter-example per open slot, driven through `freeDrag(item, config, { plugins: [...] })`_. §2 is what happened to that instruction.

## 2. What the declaration suites prove

**The F-117 caveat is documented, and honestly.** [`composition.declaration.test.ts`](../../../tests/composition.declaration.test.ts)'s header states that a literal returned from a contextually-typed arrow is not excess-property-checked, that the resulting hole is unsupported integrator usage, and that pinning it _would state a guarantee the contract does not make_. That is the right disposition for the **cross-behavior** case it is written about. It does not reach the case D-146 newly creates — a plugin contributing a slot its **own** behavior implements from another key — which is not cross-behavior at all.

### F-132 — both cardinality rows pass by a mechanism other than the one under test (tier B)

[`tests/free-drag/feature.declaration.test.ts:127-132`](../../../tests/free-drag/feature.declaration.test.ts):

```ts
it('should refuse a unique slot from the unbounded position', () => {
  // @ts-expect-error — neither unique slot is reachable from `plugins`
  const installer: FreeDragPlugin = () => ({ startLanding: start });
```

and its sortable twin, [`tests/sortable/feature.declaration.test.ts:77-82`](../../../tests/sortable/feature.declaration.test.ts), with `() => ({ insertion })`.

**Compiled: the error is TS2559 — _no properties in common_ — not a statement about the slot.** Adding the group's own member to the identical literal compiles in both behaviors:

```ts
const b: FreeDragPlugin = () => ({ startLanding: start, retire: dispose }); // compiles
const d: SortablePlugin = () => ({ insertion: geometry, retire: dispose }); // compiles
const e: SortablePlugin = () => ({ startLanding: start, retire: dispose }); // compiles
```

Each row has an _F-74 control_ beside it — `should accept the lifetime it does declare` — but that control only proves the positive case. **The control that would falsify the row is the one above**, and it is absent in both files. This is F-74's own defect: _a negative control that passes by a mechanism other than the one under test is indistinguishable from a working boundary_, reproduced in the pass that cites F-74 by name two lines below.

**The correct method is in the same file, two `describe`s up.** `should refuse a constraint from the landing key` asserts on an **annotated `const`**, and its comment says exactly why: _asserted on an annotated `const`, not on an installer's return, and the reason is F-117's_. That row is sound. The method was applied to one row of three.

### F-133 — the shared cardinality row is vacuous, and one crossing is unasserted (tier C)

[`composition.declaration.test.ts:170-180`](../../../tests/composition.declaration.test.ts), `should give the unbounded position no unique slot in either behavior`:

```ts
expectTypeOf<keyof FreeDragPluginContribution>().toEqualTypeOf<'retire'>(); // strong
expectTypeOf<
  keyof SortablePluginContribution
>().not.toEqualTypeOf<'insertion'>(); // vacuous
```

The second line **passes for a group that does declare `insertion`** — verified directly: `keyof` of a four-member group is still not the single literal `'insertion'`, so the assertion cannot fail for the reason it names. The sortable property _is_ pinned, exactly, one `it` above; this row adds nothing while carrying the name of the property.

**Second, and smaller:** D-146 makes `LandingContribution` one declaration, so the two landing installers differ **only** by their branded context. That refusal does hold — compiled in both directions, TS2322 — but no suite asserts it. It is the one crossing where the return type now contributes nothing, and it is the crossing the decision introduced.

## 3. F-134 — three required members, three different JS failure modes, one documented (tier C)

| Member | JS-authored violation | Behaviour |
| --- | --- | --- |
| `AxisContribution.insertion` | installer returns no `insertion` | guarded push skipped, throws at `axis.insertion.resolve` **inside** the bracket, everything installed retired — documented at [`sortable/assemble.ts:75-79`](../../../src/sortable/assemble.ts) |
| `ConstraintContribution.constrain` | installer returns `{ retire }` only | throws at [`free-drag/assemble.ts:58`](../../../src/free-drag/assemble.ts) `retireHooks.push(constrain.retire)` — **two lines before `bounds.retire` is recorded**, so the installer's own cleanup never runs |
| `LandingContribution.startLanding` | installer returns `{}` | **no throw at all**: `({ startLanding } = landing)` yields `undefined`, the slot reads falsy, and the composition silently has no landing |

The sortable's guard exists precisely to avoid the middle row's shape — its comment is _a JS-authored installer that returns none must not fail here, where the unwind has nothing recorded yet_, and the substance is that `axis.retire` still gets recorded on line 84. Free drag's dereference is one line **earlier** than the equivalent recording, so it produces the leak its sibling documents itself as preventing. Only reachable by a JS author violating a required member, so tier C under the reachability rule — recorded because the two files present themselves as mirrors and one carries the reasoning the other does not follow.

Relatedly, [`free-drag/assemble.ts:11-16`](../../../src/free-drag/assemble.ts) claims **Zero construction-time throws of its own … Only an installer's own body can throw here now**. Line 58 is assemble's own dereference, so the second clause is not exact.

## 4. D-138 branding with a shared `LandingContribution` — holds

Compiled both directions for every published pair: `AxisInstaller`/`SortablePlugin`/`SortableLandingInstaller` against `ConstraintInstaller`/`FreeDragPlugin`/`FreeDragLandingInstaller` are refused, including the landing pair whose return types are now literally the same declaration. Contravariance on the branded parameter carries it alone, which is what D-146 claims. The two brands remain module-local `unique symbol`s, erased, never authored, and `assemble` stamps each with a single `as` that emits `install(context)`.

## 5. F-128/F-130 — the placeholder simplification loses nothing

`PlaceholderSlot` and the second `live` argument are gone from the whole tree (zero occurrences in `src/`, `tests/`, `bench/`, `README.md` and every built `.d.ts`), and `PlaceholderFactory` is back to `(context) => HTMLElement`. **The library-owned guarantees are intact and in the right places:**

- **The liveness barrier survives at the seam that matters.** [`placement.ts:237`](../../../src/sortable/placement.ts) takes the reading _between the factory returning and the mechanics writing_ — `if (!live()) return placeholder;` — and `applyMechanics` carries six more readings of its own. Seven in total, unchanged.
- **D-39's undo ledger is unchanged.** `applyMechanics(placeholder, item, footprint, live, null)` for the library's own `<div>` — nothing outside has seen it, so dropping the reference undoes every write — and the real `undo` for a consumer's element.
- Nothing that was reachable through the deleted `live` argument was reachable by a consumer: `PlaceholderFactory` never had it, and the contributed path it existed for had no producer.

## 6. F-135 — residue from the deleted model (tier C)

Verified by reading each site. The most consequential is the first: it is the shipped README, whose own line 18 declares that unstruck statements describe what `src/` does today.

| Register | Text | What is false |
| --- | --- | --- |
| [`README.md:141`](../../../README.md) | _Sortable construction diagnostics: six to one … **What survives is `claim`'s single-writer collision** — two installers contributing the same slot, which no signature can state_ | `claim` is deleted; there are **zero** sortable construction diagnostics, and D-146's whole thesis is that a signature _can_ state it |
| [`src/free-drag.ts:20`](../../../src/free-drag.ts) | _`FreeDragInstaller` ships from here_ | deleted type; the sortable twin at `src/sortable.ts:13` **was** updated to `AxisInstaller`. It is copied verbatim into the built `free-drag.js:26` |
| [`src/sortable/assemble.ts:2,6`](../../../src/sortable/assemble.ts) | _a list of features in_ … _the feature array … are garbage_ | there is no feature array; the free-drag twin was corrected in this same commit |
| [`src/sortable.ts:109`](../../../src/sortable.ts) | _Nothing retains the feature array_ | same referent, on the public entry's own JSDoc |
| [`03-feature-composition.md:133`](../../contract/03-feature-composition.md) | _`AxisInstaller` **and `SortableInstaller`** are re-exported from `sortable.js`_ … _its own closure — `FeatureContext`, `SortableContribution`, `InsertionGeometry`_ | both names deleted; `src/sortable.ts:41-49` states the corrected three |
| [`03-feature-composition.md:1200`](../../contract/03-feature-composition.md) | the **export topology** table: _`AxisInstaller`, `SortableInstaller` (published by D-110)_ | the present surface is `AxisInstaller`, `SortableLandingInstaller`, `SortablePlugin` |
| [`05-lifecycle-invariants.md:99`](../../contract/05-lifecycle-invariants.md) | the diagnostic-prefix rule's worked example: `drag: free-drag/duplicate-contribution` | that identity is deleted |
| [`05-lifecycle-invariants.md:666`](../../contract/05-lifecycle-invariants.md) | test-matrix row: _`AxisInstaller → FreeDragInstaller`, `SortableInstaller → FreeDragInstaller`_ | two deleted names in a live matrix row — the same matrix paragraph family F-117 was filed against two lines below |
| [`tests/sortable/assemble.browser.test.ts:6`](../../../tests/sortable/assemble.browser.test.ts) | header: _what this suite pins: **single-writer enforcement**, the two normalization rules …_ | the same file records the deletion of every single-writer row |
| [`tests/exports.node.test.ts:146`](../../../tests/exports.node.test.ts) | _`FreeDragInstaller`, `FreeDragContribution` … **are all erased**_ | two of the five named types no longer exist |
| [`tests/COVERAGE.md:425,567`](../../../tests/COVERAGE.md) | _`@ts-expect-error`s on `SortableContribution`_ ; _supplies `startLanding` through a `SortableInstaller`_ | the fixtures they cite now read `AxisContribution` and `SortableLandingInstaller` |

**No dead machinery.** Every group and alias the commit introduced has production or test readers; `PlaceholderSlot` and both `duplicate-contribution` identities are gone from every live register; `files.json` and `package.json` `exports` stay consistent (D-146 added and removed no module). The entry export lists are correct in both behaviors — only free drag's prose is stale.

## 7. F-136 — the measured range is right for a wider arc than the row names (tier C)

Measured at five commits by importing `measureAll` and reading raw bytes, then re-read through the instrument's own display.

- **The minified range reproduces exactly — over `2fd0d9f3^ → 4568e563`, a five-commit arc.** `free drag + bounds`, `+ landing` and `complete` each fall **−99 B**, `both behaviors` **−216 B**: the record's stated endpoints, to the byte. **Over `4568e563` alone the range is −50 to −158 B**, and `65a9f382` and `b85dda16` are byte-neutral. The row and [`plan.md:1963`](../../plan.md) both read as the measurement of D-146's implementation.
- **The brotli range does not reproduce.** The record says **−0.05 to −0.07 kB**; the instrument's own display over that same arc gives **−0.04 to −0.09** — the sortable rows fall −0.08/−0.09 and the three free-drag rows −0.04. Both ends are outside the stated interval.
- **The three control rows are byte-identical, exactly as claimed** — `kernel.js` 17017/6116, `drag.js` 344/159, baseline B 22573/6889, unchanged across the whole arc.
- **The composition premium is exact.** `complete` 10,799 B − `baseline A` 10,578 B = **221 B**, 2.05% of `complete`. The _from_ figure is the wrinkle: 283 B is a prior taking, while the premium measured immediately before this arc is **289 B** at `4568e563^` and 301 B at `2fd0d9f3^`. The direction and the headline — the first fall across four takings — are right.

**Allocation:** nothing in this commit changes a per-sample path. The deleted per-controller placeholder adapter closure is one object per controller, and the deleted `claim` calls are three sortable and two free-drag calls at construction only.

---

## 8. Findings

- **F-131** (tier A) — every contribution group is assignable to its own behavior's plugin group, so `plugins` still reaches every unique slot through published values; the misconfiguration that threw at construction now silently discards and, for an axis, leaks. §1.2.
- **F-132** (tier B) — both behaviors' _should refuse a unique slot from the unbounded position_ rows pass by weak-type detection, the mechanism F-74/CE1-01 records as not a boundary; the falsifying control is absent in both files while the correct method sits two `describe`s away. §2.
- **F-133** (tier C) — the shared plugin-cardinality assertion is vacuous for the sortable half, and the one cross-behavior crossing D-146 newly created — the two landing installers — is unasserted. §2.
- **F-134** (tier C) — three required contribution members, three different JS failure modes; free drag's `bounds` dereference runs before its own `retire` is recorded, producing the leak the sortable's guard documents itself as preventing. §3.
- **F-135** (tier C) — residue in the shipped README, two normative contract documents, both entries' JSDoc, one assembler header and four test registers. §6.
- **F-136** (tier C) — the minified range belongs to a five-commit arc and is attributed to D-146's commit; the brotli range does not reproduce at either end. §7.

## 9. What would falsify this

- **Every type claim is a compile experiment** run with `--ignoreConfig` and explicit `--strict`, not through the package `tsconfig`. The harness was controlled: it reproduces the documented cross-behavior refusals (TS2322) and an ordinary excess-property error (TS2353), and it reproduces the suite's own passing rows. A flag difference could move F-131 and F-132, and the cheapest settlement for both is a row in the declaration suites — which is also the remedy.
- **F-131's runtime half rests on reading the two plugin loops and the two axis factories**, not on running a composed controller with an axis in `plugins`. The leak claim is that nothing is pushed to `retireHooks`; a fixture would settle it in one test.
- **The size figures are one toolchain, one run per commit.** They agreed to the byte on the minified metric across five commits, which is why the brotli mismatch is worth stating rather than rounding away.
- **I did not re-derive D-146.** The brief settles the direction; §1 checks whether the implementation holds the property the decision claims, not whether the property is the right one.