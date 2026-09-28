# The owner-review cleanup, reviewed at `11cfb785`

Review, 2026-08-26. Files read and measured at `11cfb785`. **No production code changed.**

Reviewing the five landed commits — `22166f1d` (D-138), `51981917`, `95fcc60e` (D-139, D-140, D-141, D-142), `533f5678` (D-143) and `11cfb785` — for semantic and public-contract correctness, against the decisions as written rather than against a redesign.

**Verdict: the slice is correct except for one real capability regression.** The two resolution protocols are symmetric and sound, the flattening preserves every value and space, the frame-part consolidation holds its invariant on both behaviors, and **every size figure in the record reproduces exactly** — including two the record decomposes by hand, whose components sum to the measured total on both metrics. One **tier A** finding: D-138 moved the cross-behavior boundary from the contribution record onto the context, and the contribution axis it vacated is no longer guarded in the authoring shape the API documents. Four **tier C** findings follow it, all residue or pinning.

---

## 0. What was checked, and how

Everything below was executed or measured. Nothing is taken from a decision record.

| Area | Result |
| --- | --- |
| Resolution protocols, the two behaviors side by side | **Clean and symmetric** — §1 |
| `DragGeometry` / `FreeDragRequest` flattening, value and space preserved | **Clean** — §2 |
| Numeric lift constants | **Clean** — §2.2 |
| Frame-part create/reset consolidation, identity and totality | **Clean and symmetric** — §3 |
| Cross-behavior feature typing after D-138 | **F-117, tier A** — §4 |
| Published entry surfaces: superseded aliases, accidental exports | **Clean** — §5 |
| Size and allocation claims | **All reproduce; two decompositions verified by summation** — §6 |
| Suite | 61 files, no type errors, `just typecheck` clean |

---

## 1. The two resolution protocols

**Public opacity holds, and it holds at the artifact rather than only in the source.** `ReorderResolution` and `FreeDragResolution` are each `Readonly<{ [RESOLUTION]: never }>` behind a module-local `declare const RESOLUTION: unique symbol`. The brand is a **required** property of type `never`, so nothing but the factories' own assertion inhabits the type: a consumer cannot forge one, and neither can a mistake. Confirmed on the built output — `sortable.js` exports `{ AT_CONSUMER, AT_PROPOSAL, ReorderResolution, sortable }` and `free-drag.js` exports `{ AT_CONSUMER, AT_PROPOSAL, FreeDragResolution, LIFT_FAITHFUL, LIFT_FLAT, LIFT_IN_PLACE, freeDrag }`. **`ACCEPTED`, `AcceptedResolution` and `RejectedResolution` reach no published `.d.ts` and no published subpath**, and `./sortable/domain.js` is not in the `exports` map, so the TSDoc's _neither is named outside this package_ is true as shipped.

**Accepted singleton semantics are sound.** `ACCEPTED` is one module-level array for the life of the module, and the discriminant is `value === ACCEPTED`. Two properties make that safe rather than merely cheap, and both are worth naming because a future edit could break either silently:

- **The carrier is an array, so it is not thenable.** A consumer returning `accept()` from an `async onDrop` hands the kernel a promise whose resolution is `ACCEPTED` by identity; `thenOf` reads `.then` on the settled value, finds none on an array, and stops. Had the carrier been a plain object with a `then`-shaped field the identity would not have survived the round trip.
- **The empty and one-slot carriers are told apart by identity, never by `length` or shape.** `reject()` with no argument builds `[undefined]`, which is one slot away from `[]` structurally — and `sortable/domain.node.test.ts` and `free-drag/domain.node.test.ts` each pin exactly that row (_should build a rejection with no reason rather than an acceptance_), which is the row the shared representation makes necessary.

**Rejected reason transport is a plain data read.** `(value as RejectedResolution)[0]` on a library-built array, typed `unknown` because the slot is optional. The assertion is a narrowing from `ReorderResolution` to `ReorderResolution & readonly [reason?: unknown]` — no widening through `unknown`, which is `11cfb785`'s whole subject and is achieved.

**The `as never` casts conceal nothing.** There are exactly two per behavior, both in `domain.ts`, both on the construction side, and both annotated at the declaration rather than at the expression — `const ACCEPTED: AcceptedResolution = [] as never` and `reject: (reason?) : Resolution => [reason] as never`. `never` is assignable to everything, so the assertion claims nothing about the array and the neighbouring annotation states the whole result. This is the narrowest available spelling for an intentionally uninhabited brand, and it is confined to the two lines that mint the values.

**Settlement identity checks are symmetric and correctly ordered.** Both behaviors compute `const accepted = value === ACCEPTED` _before_ the `host.closed` barrier and read slot 0 _after_ it. The order is safe in both directions: the identity comparison cannot reach consumer code, and the data read happens only on a path that has re-confirmed the controller. The one deliberate asymmetry is `SETTLED_SKIPPED` — a `noop` result for the sortable, a `FAILURE_RESOLUTION` rejection for free drag, because free drag's `release.prepare` never returns `invoke: null` — and it is documented at both sites.

**The duck-type removal is complete and its barrier survives for the right reason.** `isReorderResolution`, `isFreeDragResolution` and both `*-resolution-invalid` diagnostics are gone from `src/` and `tests/`; `FAILURE_RESOLUTION` keeps its other producers. The `host.closed` check stays, and D-143's account of why is accurate: the removed accessors were the reason the barrier was _reachable_ mid-seam, but the round trip is still a `PromiseLike`, so a consumer can destroy the controller while it is pending. That case is covered — `tests/COVERAGE.md:126`, _should tear down without a terminal callback when onReorder destroys_.

**Nominal separation between the two behaviors is real and asserted.** Two `unique symbol` declarations in two modules are two types, so `ReorderResolution.accept()` in an `onDrop` is a compile error rather than a value the other behavior's identity comparison reads as a rejection with `undefined` as its reason. `tests/composition.declaration.test.ts` asserts both directions.

## 2. The flattened coordinate surface

**Every scalar carries the value its `Point` member carried**, checked field by field against `95fcc60e^`:

| Was | Is | Same value? |
| --- | --- | --- |
| `pointer: {x: pointerX, y: pointerY}` | `pointerX`, `pointerY` | yes, same arguments |
| `originPointer: {x: originX, y: originY}` | `originPointerX`, `originPointerY` | yes |
| `viewportDelta: {x: dx, y: dy}` | `viewportDeltaX`, `viewportDeltaY` | yes |
| `localDelta: localDeltaOf(space, dx, dy)` | `localDeltaX(space, dx, dy)`, `localDeltaY(...)` | yes — the split is exact |
| `viewportPosition: {x: visualRect.left, y: visualRect.top}` | `positionX: visualRect.left`, `positionY: visualRect.top` | yes, and the **name** changed too |

**The projection split is arithmetically identical.** `localDeltaOf` returned `{ x: a*x + c*y, y: b*x + d*y }` or `{ x, y }`; `localDeltaX` returns `a*x + c*y` or `x` and `localDeltaY` returns `b*x + d*y` or `y`. Same coefficients, same untransformed fallback, same axis assignment.

**`viewportPosition` → `positionX`/`positionY` drops a space qualifier every sibling kept.** It is not an oversight: D-139 names the rename explicitly, and both the member's own TSDoc and the type's header still state viewport space. Recorded here only because it is the one place the flattening is not a pure mechanical split, so a reader comparing the two shapes will notice it and should find it decided rather than drifted.

**`Point` survives on `ResolveHome` and `FreeDragController.moveTo`, and that is coherent.** Both are per-operation rather than per-sample, so D-139's allocation argument does not reach them, and its supersession column says so. The consequence is that `free-drag.js` publishes two `Point`-typed members without publishing `Point` — a consumer annotating either imports it from `drag.js`. That is the established shared-vocabulary rule (`src/kernel.ts:12` states it for `kernel.js`) rather than an omission, and the packed consumer fixture already does exactly that.

### 2.2 The numeric lift constants

`LIFT_FAITHFUL = 61`, `LIFT_FLAT = 62`, `LIFT_IN_PLACE = 63`, one declaration in `kernel/presentation.ts`, published from `free-drag.js` **and** `kernel.js` — the `FailureStage` pattern applied to a second union, which is what D-141 claims. **The band is clear**: the package's numeric vocabularies occupy 1–14, 20–21, 40–44, 61–63, 90–92 and 110–113, so the lift constants collide with nothing they could be confused with. `LIFT_MODES`, `FreeDragLift` and the string domain are gone from `src/`. Residue elsewhere is F-118.

## 3. The frame-part consolidation

**Both behaviors are the same shape, and the shape is right.**

```ts
const DEFAULT_PART: SortableFramePart = { … };
export function sortableFramePart(existing?: SortableFramePart): SortableFramePart {
  return Object.assign(existing ?? {}, DEFAULT_PART);
}
```

- **Identity is preserved on reset.** `Object.assign(existing, …)` mutates and returns the target, and the kernel calls `active.resetFramePart(target)` on the composed frame itself. Asserted directly: `expect(sortableFramePart(existing)).toBe(existing)` and its free-drag twin.
- **Every field is restored, and the invariant is held by two mechanisms rather than one.** `DEFAULT_PART` is annotated with the part type, so a field added to the part and not to the literal is a **compile** error; and each suite's _should clear every field it allocates_ dirties every key of a fresh part and asserts deep equality with a fresh one. Neither alone is total; together they are.
- **The reset writes only the behavior's own keys** onto a frame that also carries the kernel's slice, which is what `FramePartOf` and the kernel's own `frame(target)` half depend on.
- **The two suites are row-for-row identical** — three `it` names each, the same three properties. The `strict-void-return` suppression is the same one line at both sites, and the mismatch it suppresses is real and harmless: `resetFramePart` is declared `(frame: Part) => void` and the shared function returns the part the kernel already holds.

**One latent trap worth naming, not a defect today.** `DEFAULT_PART` is a shared mutable object copied by `Object.assign`, and every current default is a primitive (`null`, `0`, `RECOVERY_IMMEDIATE`), so nothing is aliased between frames. A future field defaulting to `[]` or `{}` would silently share one instance across every frame and every reset, and neither the type (the literal is not `Readonly`) nor the suites would see it.

## 4. Cross-behavior feature typing

**The direction D-138 set out to close is closed.** Typed values do not cross: `AxisInstaller` and `SortableInstaller` are refused where a `FreeDragInstaller` is expected and vice versa, from one contravariant parameter, and the branded contexts are asserted non-mutually-assignable at their source. The contribution records are genuinely independent — `keyof FreeDragContribution` is exactly three names and `keyof SortableContribution` exactly six, with no `?: never` twin on either. The two accepted holes are asserted where D-138 says: `() => ({})` compiles into both slots.

**The axis it vacated is not closed, and that is F-117.**

### F-117 — the contribution-shape boundary regressed, in the authoring shape the API documents (tier A)

**Evidence, measured against `22166f1d^` and HEAD with the same probe file.** Five foreign-slot contributions, one per slot the deleted exclusions named:

```ts
const f1: FreeDragInstaller = (c) => ({ insertion: geometry, retire: dispose });
const f2: FreeDragInstaller = (c) => ({ placeholder, retire: dispose });
const f3: FreeDragInstaller = (c) => ({
  beforeInsertionMove: hook,
  retire: dispose,
});
const f4: FreeDragInstaller = (c) => ({
  afterInsertionMove: hook,
  retire: dispose,
});
const s1: SortableInstaller = (c) => ({ constrain, retire: dispose });
```

**At `22166f1d^` all five are compile errors** (`Type 'Readonly<{ resolve(…) … }>' is not assignable to type 'undefined'` — the `?: never` slot doing its work). **At HEAD all five compile.** So does the same value written inline in the public slot:

```ts
freeDrag(item, config, {
  plugins: [(context) => ({ insertion: geometry, retire: dispose })],
});
```

**The mechanism is ordinary TypeScript, not a mistake in the brand.** A fresh object literal returned from a contextually-typed arrow is not excess-property-checked against the contextual return type; the identical literal assigned to a `const c: FreeDragContribution` **is** rejected. The old mechanism did not depend on that check at all — `insertion?: never` made the foreign slot an ordinary type mismatch, which fires in every position.

**What is lost is precisely CE1-01's subject.** `assemble` reads `constrain`, `startLanding` and `retire` and ignores everything else, so each of these five is _a supported middle-tier API accepting a value and doing nothing with it_ — the sentence contract 07 uses to state the defect. D-88 exists because D-87 closed two slots and left three open; this closes the typed-value direction and reopens all five in the literal direction.

**Three registers still assert the withdrawn property, unstruck and present tense**, which is what makes this a finding rather than a trade the record priced:

| Register | Text | Status at HEAD |
| --- | --- | --- |
| [`05-lifecycle-invariants.md:668`](../../contract/05-lifecycle-invariants.md) | _a hoisted installer with **no type annotation** carrying `{ placeholder, retire }`, `{ beforeInsertionMove, retire }` and `{ afterInsertionMove, retire }` each fail to compile through `freeDrag(item, config, { plugins: [...] })`_ | all three compile |
| [`07-free-drag-contract.md:306`](../../contract/07-free-drag-contract.md) | _One optional `never` in each direction breaks it: `SortableContribution` declares `constrain?: never`, this one declares `insertion?: never`_ | neither declaration exists |
| [`composition.declaration.test.ts`](../../../tests/composition.declaration.test.ts) header | _Neither is reachable except by declining the types the API hands you_ | reachable **through** them: the alias annotation and the public `plugins` slot |

**D-138's two accepted holes do not cover it.** Both are about _whose function it is_ — a zero-parameter installer, or a literal decided structurally because nothing annotates it. The uncovered case is about _what it contributes_, and it survives full annotation with the alias the API hands the author.

**Bounded, and the bound is worth stating.** This is compile-time only: nothing misbehaves at runtime that did not already, the package is `private: true` at `0.1.0`, and the direction D-138 chose is the owner's. What is defective is the coverage claim — the boundary is presented as stating _both directions at once_ with _nothing to keep in step_, and the direction it does not state is the one E-06 was raised about. Whether to add a guard, narrow the claim, or record the trade is an owner decision; the finding is that the record currently claims a property the tree does not hold, and `05 §668` still lists it as an acceptance criterion.

## 5. The published entry surfaces

**No superseded aliases and no accidental exports.** Every exported type in the 31 emitted declarations is referenced by at least one other published declaration; the only unreferenced exports are the top-level functions, as expected. The four retired names — `AcceptedReorderResolution`, `RejectedReorderResolution`, `AcceptedFreeDragResolution`, `RejectedFreeDragResolution` — are gone from every entry, and `tests/consumer.node.test.ts` keeps a `@ts-expect-error` row for two of them against the packed tarball. `FreeDragLift` is gone with the same guard at `:966`.

**Two things on this surface are findings**: F-119 (a published declaration that calls itself internal) and F-120 (what the surface tests do and do not pin).

## 6. Size and allocation

**Every figure reproduces.** Measured by importing the instrument's own `measureAll` at five commits and reading raw bytes rather than the rounded display.

- **D-138 — _every one of the fourteen size rows is byte-identical, minified and Brotli_.** Confirmed exactly: `22166f1d^` and `22166f1d` agree on all fourteen rows and all module counts. An erased brand costing nothing is the kind of claim that is usually approximately true; this one is exactly true.
- **D-142's decomposition is verified by summation, which is stronger than the numbers themselves.** The record says D-142 is _the whole of the sortable movement_ at −12 B brotli / −84 B minified, _plus −18 B brotli / −48 B minified of the free-drag_. Measured across `51981917 → 95fcc60e`: every sortable row falls **−84 B minified** exactly and `minimal` falls **−12 B brotli** exactly; every free-drag row falls **−149 B minified** and `free drag minimal` **−69 B brotli**. D-139 separately claims −101 B minified / −51 B brotli for the free-drag rows. **−48 + −101 = −149 and −18 + −51 = −69**, on both metrics, exactly. The two decisions were measured independently and their parts sum to the measured whole.
- **D-143 reproduces to the byte.** −151 B minified on every sortable row; `minimal` −45 B brotli, `complete` −26 B; `both behaviors` −47 B / −151 B and `baseline A` −29 B / −145 B, both exactly as written. Its unusual rider — _the free-drag rows move by −1 to +3 B brotli at zero minified bytes_ — is also exact: −1, +2, 0, +3, with all four minified figures unchanged.
- **`11cfb785` is byte-identical to `533f5678` on all fourteen rows**, which is what a purely type-level rewrite of the two casts should be and is not stated anywhere. Worth having on record.
- **No module count moves anywhere in the range**, and the three control rows never move.

**The allocation claims hold.** `buildGeometry` allocated six objects per committed sample (the geometry, four points, the derived rect) and now allocates two; `accept()` returns a shared value, asserted by `expect(ReorderResolution.accept()).toBe(ACCEPTED)`; the reset allocates nothing, asserted by the identity row.

---

## 7. Findings

### F-117 — see §4 (tier A)

### F-118 — the lift vocabulary and one withdrawn criterion survive in five registers (tier C)

All unstruck and false at HEAD. The pattern is the one this package has now hit three times: a repair that reads the register it was working in.

| Register | Text | What is false |
| --- | --- | --- |
| [`src/free-drag.stories.tsx:33`](../../../src/free-drag.stories.tsx) | parity row giving drag2's `lift` as `'faithful' \| 'flat' \| 'in-place'` — D-73 | the strings and `FreeDragLift` are deleted; the same file documents D-141 at 179–186 |
| [`tests/free-drag/validation.browser.test.ts:415-418`](../../../tests/free-drag/validation.browser.test.ts) | _`LIFT_MODES` is a total `Record` … A JS consumer reaches `undefined` in the map_ | there is no map; `assemble` passes `config.lift ?? LIFT_FAITHFUL` straight through. Contract 07 §209 **struck the identical sentence**; this copy was not |
| [`.plan/ledger.md:332`](../../ledger.md) | _`free-drag.js` publishes a string union of its own … An ordinary consumer never sees a numeric constant_ | `free-drag.d.ts` exports all three constants; nothing maps |
| [`07-free-drag-contract.md:636`](../../contract/07-free-drag-contract.md) | `` `LiftMode` \| **Retained as `FreeDragLift`** — D-75 `` | lines 101, 150 and 155 of the same file carry the D-141 strike; this row did not get one |
| [`tests/COVERAGE.md:678`](../../../tests/COVERAGE.md) | lift row cited to `D-73` | every sibling lift row cites D-141 |

Two more of the same class, listed here because they are one edit each rather than a separate finding: `07-free-drag-contract.md:590`'s **L-1** acceptance criterion still requires _an invalid resolution as an error_, a row D-140 withdrew and `COVERAGE.md:293` struck; and [`src/free-drag/spec.ts:333`](../../../src/free-drag/spec.ts) names `localDelta`, a field D-139 split — unstruck source commentary naming a deleted identifier, which is the class `51981917` was sweeping.

### F-119 — a published declaration calls itself internal (tier C)

[`sortable/placement.d.ts:12-17`](../../../src/sortable/placement.ts), re-exported at `sortable/feature.d.ts` and therefore importable as `@ydinjs/drag2/sortable/feature.js`:

> The **internal** slot shape: the public {@link PlaceholderFactory} a consumer writes, plus the liveness reading the library hands its own placeholder feature.

The **export** is deliberate — `SortableContribution.placeholder` names the type, so the middle tier's structural closure requires it. The **word** is not: this is the only occurrence of _internal_ in the entire published declaration tree, and it now sits on a name a consumer can import and must sometimes write. `tests/packaging.node.test.ts`'s eight forbidden patterns cover decision numbers, `§`, dates and strikethroughs, not this — which is F-112's shape again, one register over: a lexical guard bounds vocabulary and not audience.

### F-120 — the published type surface is pinned asymmetrically, and the new internal names are pinned by nothing (tier C)

`tests/exports.node.test.ts` and the packed fixture both assert **value** equality over `Object.keys(module)`, so an accidental runtime export fails loudly. There is **no equality assertion anywhere over the published type surface**; types are pinned by positive naming in the packed fixtures plus a hand-maintained list of `@ts-expect-error` negatives. Four specific gaps, each verified:

- **`AcceptedResolution` and `RejectedResolution` — the names `11cfb785` introduced — have no guard on any entry.** Their predecessors do (`consumer.node.test.ts:339`, `:964`). They are erased, so adding either to `src/sortable.ts`'s re-export list today would be caught by nothing: `exports.node.test.ts` compares values.
- **`ItemSource`, `ResolveElement` and `ResolveHandle` re-exported from `sortable.js` are named by no test in a type position** — only inside a JSDoc paragraph at `tests/revision/revision-2.ts:263`. Their free-drag counterparts are `satisfies`-pinned in the packed fixture at `:838-839`. Deleting the three sortable re-exports would leave the suite green, which is the D-78 hoistability class those re-exports exist to serve.
- **The flattening is guarded on one field of eight**: `consumer.node.test.ts:968` retires `FreeDragRequest.viewportDelta`. There is no negative row for `.pointer`, `.originPointer`, `.localDelta` or `.position` on either shape.
- **`DragGeometry.originPointerX`/`originPointerY` and both shapes' `pointerX`/`pointerY` are read by no test.** They are the fields a flattening most easily transposes, and the suite would not see it.

### F-121 — `free-drag/frames.ts` miscounts the part it compares itself to (tier C)

[`src/free-drag/frames.ts:10`](../../../src/free-drag/frames.ts) opens _**Five against the sortable's eight, and a different shape**_. The sortable part declares **seven** fields, and [`src/sortable/frames.ts:2`](../../../src/sortable/frames.ts) says so in its own first sentence — its line 5 explains that an eighth, `outcome`, was removed and must not return. The number predates this commit range; it is recorded here because the two headers are the cross-reference a reader uses to check the pair, and one of them contradicts the other.

---

## 8. Considered, and not findings

- **`tests/probes/13c-free-drag.ts:75` — _The shipped `DragGeometry`, unchanged_ with four `Point` members.** _Shipped_ here means `@ydinjs/drag`, the predecessor package, whose geometry genuinely does carry nested points and is untouched by D-139. The sentence is true. Flagging it would be reading drag2's vocabulary into a frozen probe of someone else's surface.
- **`bench/size/measure.ts:702-706` names `resetSortableFramePart`, deleted by D-142.** It is a dated D-127 measurement record, and the same file reopens and qualifies it explicitly at 882–891 (_they did not stay, and the earlier number is still correct_). Deliberate history, not residue — though the qualifier is 180 lines from the claim.
- **The `strict-void-return` suppression on `resetFramePart`.** Real mismatch, no contract consequence: the kernel declares `(frame: Part) => void`, calls it for effect and ignores the return, and the returned value is the same object it passed in.
- **A plain-JavaScript consumer returning `undefined` from `onDrop`** now reaches `(undefined as RejectedResolution)[0]` and throws inside the seam rather than meeting a named diagnostic. The throw is classified at `FAILURE_RESOLUTION` and surfaces through `onError`, and the input is outside the published types, so §1.1's gate closes it. Named because a sweep that deletes validation is exactly where this would hide.
- **`positionX`/`positionY` dropping the `viewport` qualifier.** Decided in D-139 by name; the space is still stated on the member and on the type.
- **`Point` not re-exported from `free-drag.js`.** The shared-vocabulary rule, stated at `src/kernel.ts:12` for the sibling entry.

## 9. What would falsify this

- **F-117's probe is a compile experiment on two trees**, run with `--ignoreConfig` and explicit `--strict`, not through the package's own `tsconfig`. The harness was controlled: it reproduces the documented `SortableInstaller → FreeDragInstaller` refusal and an ordinary excess-property error. A difference between those flags and the package's config could change the result, and the cheapest way to settle it is a row in `composition.declaration.test.ts`.
- **The size figures are one toolchain and one run each.** They agreed to the byte across five commits and two metrics, which is strong, but a rolldown or Brotli change moves all of them together.
- **I did not re-derive D-139's or D-143's design arguments.** The brief settles the direction; §2 and §1 check that the implementation carries the values and the properties those decisions claim.
- **F-120 is a claim about absence.** Each gap was checked by grep over `tests/` and by reading the packed fixture's import lists; a pin hidden behind an indirection I did not follow would weaken it.