# The recovered corpus — every clause authored into `00-index.md` that GFM never rendered

**Generated from `00-index.md` at `41c03b4e`**, adjudicated by [`d172-hidden-fragment-recovery-claude.md`](d172-hidden-fragment-recovery-claude.md). **This is the migration input D-171 names.** Nothing here is prose to be edited: each block is the cell text exactly as the parser reads it out of the source row.

**Everything is fenced**, for the reason the recovery exists: the text carries unescaped pipes, and any container that splits on one truncates it again. Fencing also stops the relative links inside a fragment being resolved against this directory, which is not the directory they were written for.

---

## Part 1 — whole entries, hidden behind the third cell

Fourteen entries, in three host rows. Each was authored **already joined**: at the commit that introduced it, `grep -c` for its own row start returns 0, so no formatter produced this and no formatter can be blamed for it.

### Host row line 920 — the physical row of `F-127`, 11 authored cells

Introduced at `65a9f382`, 2026-08-27. Probe: `git show <that commit>:…/00-index.md | grep -c '^| F-128 |'` returns **0**.

#### F-128

Cells 5–7 of line 920. Disposition: **keep**.

```text
ID     F-128
TITLE  A declared slot had no producer anywhere in the tree, so one claim branch, one label and one diagnostic identity were unreachable
STATUS **Closed 2026-08-27 by D-146's deletion.** As found: `SortableContribution.placeholder` is filled by nothing in `src/` and nothing in `tests/`; every `placeholder` in the fixtures is the **config** key. It was surfaced by a census taken for another reason, and no instrument in this package asks whether a declared slot is ever filled — the packaging, reference and decision tests all read text, and the assembler test asserts the slot record's key set rather than its provenance. ~~D-146 relocates it into `AxisContribution` rather than deleting it, because the motivating third-party case — a grid rule wanting `insertion` and a grid-shaped `placeholder` over one rect index — is exactly the grouping the contribution record exists for.~~ **Amended 2026-08-27: deleted.** The grid rule wants the placeholder's _footprint_, which comes from `box` and reaches the factory as `PlaceholderContext.rect`; it never wanted the factory. **The failed reasoning is the part worth keeping**: a home was chosen for the slot by asking which grouping it would make possible, rather than by asking which responsibility owns it — so an unused slot acquired a plausible owner instead of being recognised as residue
```

#### F-129

Cells 9–11 of line 920. Disposition: **keep**.

```text
ID     F-129
TITLE  A property was asserted in a comment on the type that declares it and enforced at a site that does not name it, so nothing could notice them diverging
STATUS **Closed 2026-08-27 by D-146**, and closed by construction rather than by an instrument: cardinality is no longer a property that can diverge from its enforcement, because the declaration _is_ the enforcement — a unique slot is declared on the group of the one key that can produce it, and there is no site left that names a label instead of a slot. **The general form is worth carrying**: when a property is asserted in prose on one declaration and enforced at a site that does not name it, the cheapest fix is usually to make the property unrepresentable rather than to build the instrument that would catch the divergence. As found: `SortableContribution` marks slots single-writer and multi-writer in prose; `claim` enforces it against a **label string**. No declaration connects a slot to its cardinality, and no site that enforces cardinality mentions a slot — so a slot added to the record without a claim, or a claim whose label drifts from its slot, is invisible to the compiler and to every test. The measure of how invisible: `placeholder` has carried a claim, a label and a diagnostic for a producer that has never existed, through two reviews. D-146 removes the class by making the position carry the cardinality
```

### Host row line 942 — the physical row of `F-145`, 27 authored cells

Introduced at `cdc83990`, 2026-08-28. Probe: `git show <that commit>:…/00-index.md | grep -c '^| F-132 |'` returns **0**.

#### F-132

Cells 5–7 of line 942. Disposition: **keep**.

```text
ID     F-132
TITLE  A negative declaration row passed by a mechanism other than the one under test, in the pass that cites the rule against it by name
STATUS **Closed 2026-08-28.** Both behaviors' _should refuse a unique slot from the unbounded position_ rows were refused by **weak-type detection** — TS2559, _no properties in common_ — which F-74/CE1-01 records as not a boundary: adding `retire`, the one member the groups share, makes the identical literal compile. The falsifying control is now the row itself in both suites, stating what the group actually reaches, and the property moved to the position (D-151), where it is asserted six ways per behavior. **The general form is worth carrying**: a negative control is only evidence about the mechanism it names if the falsifier is written beside it — the positive control is a different obligation and does not substitute.
```

#### F-133

Cells 9–11 of line 942. Disposition: **keep**.

```text
ID     F-133
TITLE  An assertion carried the name of a property it could not fail on, and the one crossing the decision newly created was unasserted
STATUS **Closed 2026-08-28.** `keyof SortablePluginContribution` `.not.toEqualTypeOf<'insertion'>()` passes for a group that _does_ declare `insertion`, because `keyof` of a three-member group is not that single literal whatever the members are. Both halves are exact now. The unasserted crossing — the two landing installers, whose return type since D-146 is literally one declaration, so the branded context carries the separation alone — has a row and a control.
```

#### F-134

Cells 13–15 of line 942. Disposition: **keep**.

```text
ID     F-134
TITLE  Two mirrored assemblers, and the one carrying the reasoning did not follow it
STATUS **Closed 2026-08-28.** Free drag dereferenced `constrain.retire` two lines before recording `bounds.retire`, producing exactly the leak the sortable's guard documents itself as preventing. The dereference is guarded now, and the two behaviors' answers for a JS-authored violator are stated rather than coincidental: the sortable throws at the flat record, because that record dereferences a required member; free drag's slots are all nullable, so the composition silently has no constraint — the same silence a `landing` installer returning `{}` already produced. The assembler's _zero construction-time throws of its own_ is exact for the first time.
```

#### F-135

Cells 17–19 of line 942. Disposition: **keep**.

```text
ID     F-135
TITLE  Residue from a deleted model, in the shipped README, two normative contracts, both entries' JSDoc, one assembler header and four test registers
STATUS **Closed 2026-08-28.** Eleven sites corrected. The consequential one is the README's, whose own line 18 declares unstruck statements to describe what `src/` does today, and which claimed a surviving construction diagnostic that D-146 had deleted along with the thesis that no signature could state it.
```

#### F-136

Cells 21–23 of line 942. Disposition: **keep**.

```text
ID     F-136
TITLE  A measured range was attributed to one commit and belongs to a five-commit arc, and its brotli half does not reproduce at either end
STATUS **Closed 2026-08-28.** The minified range and the three byte-identical control rows reproduce exactly; the brotli interval was −0.04 to −0.09 kB rather than the reported −0.05 to −0.07, and the premium's _from_ figure was a prior taking (283 B) rather than the one immediately before the arc (289 B). Corrected in place. **The general form**: a size range is a property of the interval it was taken over, and a range quoted beside a SHA reads as that commit's whether or not the text says so.
```

#### F-283 — recovered from the malformed id `F-146`

Cells 25–27 of line 942. Disposition: **renumber**.

```text
ID     F-146
TITLE  A published entry signature drags its own intermediate aliases onto the published surface
STATUS **Open, tier C — closed by construction here.** D-151's model names `SortableUnique`/`FreeDragUnique` as per-behavior aliases; `tests/docs.node.test.ts` then requires both **exported**, because the entry signature references them and the reference-resolution gate is total. They are inlined into `SortableComposition`/`FreeDragComposition` instead, which the gate is satisfied by and which keeps the ordinary tier's added surface to one erased name per behavior. **The general form is the one to carry**: a type-level mechanism written for its own readability acquires a publication obligation the moment a public signature names any part of it, and the closure gate — not the author — decides which parts.
```

### Host row line 964 — the physical row of `F-156`, 27 authored cells

Introduced at `dc2a1d4c`, 2026-08-28. Probe: `git show <that commit>:…/00-index.md | grep -c '^| F-147 |'` returns **0**.

#### F-146

Cells 5–7 of line 964. Disposition: **merge**.

```text
ID     F-146
TITLE  A published consumer contract promised a re-read the same commit had deleted, while its sibling published site was corrected
STATUS **Closed 2026-08-28.** `free-drag/controller.d.ts`'s `invalidate()` said `axis` and the bounds source are re-read; `axis` is fixed for the controller's lifetime by D-148, and `config.d.ts`'s own `axis` slot had been rewritten in that same commit. The member now names the bounds source alone and states the negative — _`axis` is not re-read, because it is not a source_ — and the module header narrows with it. **The general form**: a decision's published surface is not one file, and the site a diff touches is not the site a consumer reads.
```

#### F-147

Cells 9–11 of line 964. Disposition: **merge**.

```text
ID     F-147
TITLE  An entry gained a published type each, in a decision that records the entries as gaining none
STATUS **Closed 2026-08-28.** True of D-151's four helpers, which resolve one tier down; false of `SortableComposition` and `FreeDragComposition`, which the entry signatures name and F-51 therefore obliges the entries to export. Both are now pinned by the packed-consumer fixture, so a rename or a removal is a compile failure rather than an invisible surface change, and the ledger row says what moved.
```

#### F-148

Cells 13–15 of line 964. Disposition: **merge**.

```text
ID     F-148
TITLE  A residue finding was closed against its own enumeration rather than against the class it named
STATUS **Closed 2026-08-28.** Four unstruck present-tense sites in contract 03 and one in `plan.md` still named the deleted `SortableContribution`, and the closing pass added `SortableRuntime` to a live perf-suite header. All six corrected. **The general form is the one to keep**: a finding's table is evidence, not scope, and closing to the table leaves the defect at every site the table missed — including sites the closing commit creates.
```

#### F-149

Cells 17–19 of line 964. Disposition: **merge**.

```text
ID     F-149
TITLE  A measurement correction landed in the narrative register and not the normative one
STATUS **Closed 2026-08-28.** The D-146 ledger row carried both figures F-136 disproved — the brotli interval and the premium's _from_ — while `plan.md` had been corrected. The row now carries the arc, the corrected interval, and 289 B as the taking immediately before it.
```

#### F-150

Cells 21–23 of line 964. Disposition: **merge**.

```text
ID     F-150
TITLE  A pass's own size figures did not reproduce, in the pass that closed a finding about size figures
STATUS **Closed 2026-08-28 by re-measuring from the implementation state** rather than by re-deriving the arithmetic. The controls and the module topology reproduced exactly both times, which is what made the discrepancy legible: the recorded 142 B premium sat between two real takings and matched neither. Every figure in `bundle-structure.md` for this arc is now taken at a commit that exists.
```

#### F-151

Cells 25–27 of line 964. Disposition: **merge**.

```text
ID     F-151
TITLE  The behavior half of a decision about execution order was pinned by nothing
STATUS **Closed 2026-08-28.** `tests/free-drag/lifecycle.browser.test.ts` — _should run free drag's retire hooks in reverse installation order_ — drives `bounds` plus two plugins through the public entry and asserts all four hooks, so it covers the schema-order/array-order sequence and not one position. Falsified against a forward loop before being kept.
```

---

## Part 2 — single cells, truncated off the end of a row

Ten rows, and **not entries**. A count derived from row length alone conflates these with Part 1; the discriminator is whether the fourth cell opens with an identifier.

### The seven `Supersedes` cells under a three-column header

`00-index.md` line 428 declares `| Decision | What and why | Supersedes |`. These seven rows author four cells, so their **last** cell — the supersession clause — is the one GFM drops. Cells 2 and 3 are both body: cell 2 ends at a citation and cell 3 opens with a bold lead-in, so the split between them is authored, not accidental.

#### D-146 — line 482, `Supersedes`

```text
narrows D-45 and D-12; retracts D-77's surviving `claim` clause; supersedes D-65's contribution half; preserves D-57, D-80, D-92, D-94, D-138
```

#### D-147 — line 484, `Supersedes`

```text
03 §Assembly's `retireHooks.reverse()` line and its _the list is reversed exactly once_ clause
```

#### D-148 — line 486, `Supersedes`

```text
D-71's _every mutable policy slot is a source the library re-reads_ as applied to `axis`; 07's `axis` rows, its §The one new barrier, and COVERAGE's L-3
```

#### D-149 — line 488, `Supersedes`

```text
01 §The privacy boundary's _One `rt`, created inside the factory, shared by both halves_
```

#### D-150 — line 490, `Supersedes`

```text
D-146's `SortablePluginContribution` and `FreeDragPluginContribution` as declared, and `sortable/feature.ts`'s _the one group that may name no unique slot_
```

#### D-151 — line 492, `Supersedes`

```text
D-150 entire; D-146's cardinality claim restated as a positional one
```

#### D-152 — line 494, `Supersedes`

```text
`SeamRejection` and its two union arms; states, without changing, D-117 §The message is an identity under D-132's classification
```

### D-162 — line 514, a later amendment, not a `Supersedes`

D-162 is the one row of the eight whose **third** cell is the supersession clause (`corrects F-213 in the sink rather than the cache; …`). Its fourth cell is a later amendment dated 2026-08-30 that ends by recording the supersession by D-164 — status history, and it must not be filed as `Supersedes`.

```text
**Amended 2026-08-30 — the conversion is routed, not read, and D-85 stands unamended.** Record [`displacement-coordinate-space-claude.md`](../reviews/phase-23/displacement-coordinate-space-claude.md). Implementation exposed two blockers and both hold: the contribution exposes only `report(element, dx, dy, live)` with no committed-move boundary and no placeholder, and D-85 forbids a behavior module reading `@ydinjs/box-quad` directly. **The value already exists and was already documented for this consumer.** `inheritedSpaceOf` returns the **inverse** of the inherited linear part, is **`null` for an untransformed ancestry** — so the common case is one null test rather than arithmetic — and is derived from the measurement `acquireLift` already took before mutating anything. Its own doc block says it is _also the projection a behavior needs to report a local delta_. So the correction needs no `coordinates()` call in a behavior module and **no D-85 supersession**; it needs the value routed. **Delivery is a fifth parameter on `report`, not a new seam.** The space rides with the vector, so a report states its own units: the axis reads one field off the per-operation view, filled at activation from `scope.inheritedSpace` exactly as free drag already does. There is **no cached state, no lifetime and no temporal protocol at all** — the value arrives with every use, so no interval has to remain valid. A composition with no sink performs no conversion, because the argument is pushed inside the `if (report)` the null slot skips. **Interruption and folding are untouched**: the stored contribution stays a viewport vector, the fold adds `previous.dx * remaining` in viewport space, and the settle walk subtracts a viewport quantity from viewport rects. Only the expression that writes a keyframe converts, and a local keyframe decaying to zero is `sx * remaining` in viewport at every instant, which is what settle assumes. **Both forms were built and measured** against `60eb9e50`. Routed: `minimal` **+13**, `minimal (xy)` **+14**, `minimal + layoutAnimation` **+47**, `xy + layoutAnimation` **+48**, `complete` **+39**. An explicit per-move seam with a cached field: **+40, +27, +75, +74, +68** — worse on every row, and it carries state the routed form does not. The superseded `coordinates()`-in-the-sink form measured +124, +107 and +115 on the animating rows, so reusing the kernel's derivation is about a third of it, the inversion and the traversal having already happened. Six control rows moved zero and the sortable suites pass unchanged at 505 tests. **One configuration is not covered, and it is published rather than absorbed** (F-225). The sink writes `translate` on an **item**, so the space that matters is the container's, while `inheritedSpace` is the space above the **visual** — equal under the default, under `box !== item`, under a transformed container and under a `display: contents` wrapper, which takes no transform. It differs when `visual` resolves to a descendant **and** a transform sits between: a container at `scale: 2` with the row at `scale: 1.5` yields an inverse of a third where the rows need a half. **Closing it exactly is what would require superseding D-85, and it fails D-85's own acceptance ground** — a second traversal on the item is a style read, where D-85 accepted its unconditional work precisely because it was _arithmetic over a buffer already materialized rather than a layout read_, and it reopens F-65 on F-65's own side. So the limit joins the three scope limits `config.ts` already states for this pair of slots: where `visual` resolves to a descendant, no transform may sit between the item and its visual. **It narrows G1-presented in one configuration and says so**, it is meetable — put the transform on the visual, which the ancestry excludes by construction, or above the container — and it is findable where the slot that creates the condition is documented. **And the temporal fact is published rather than assumed**: the inherited map is captured at grab and never revisited, by free drag today and by this form, so a clause beside G6 states that the linear map inherited by the collection is stable for the operation. **Superseded by D-164, 2026-08-30** — the routed delivery carries forward; the space routed, and the limit published here, do not.
```

### F-130 — line 922, one status cell severed mid-code-span

Not a fourth column and not an entry: the author wrote `` `PlaceholderFactory | null` `` and the unescaped pipe inside the code span split the cell. Cell 3 ends `…is \`PlaceholderFactory`and cell 4 opens`null\`, the per-controller adapter closure…`. **Recovery is to rejoin cells 3 and 4 with the pipe escaped**, restoring one sentence.

```text
**Closed 2026-08-27 by D-146.** `PlaceholderSlot` is deleted, `SortableSlots.placeholder` is `PlaceholderFactory | null`, the per-controller adapter closure is gone and so is the `live` argument at the one call site — the library's own barrier and D-39's ledger untouched. As found: `PlaceholderSlot` is `PlaceholderFactory` plus a `live` second parameter, widened at I-36/D-65 for a middle-tier author filling `SortableContribution.placeholder`. **No value reads the parameter**: `createPlaceholder` calls `factory(context, live)`, and `factory` is always either `null` — the library's own `<div>` — or the assembler's wrapper around a consumer `PlaceholderFactory`, which drops it. The wrapper exists only to adapt the narrower consumer function to the wider slot type, and it is an allocation per controller. **A parameter with no consumer is a distinct defect from a slot with no producer** (F-128): the first is unreachable code, the second is reachable code doing work for nobody. They have one cause, and the second is what makes the first cost bytes rather than only space in a declaration. Closed by D-146's deletion of the slot
```

### F-198 — line 1036, a later amendment appended as a new cell

Cell 3 ends at its record citation and cell 4 opens `**Amended 2026-08-29 …**`. It belongs to F-198's status as its amendment, appended after the existing text.

```text
**Amended 2026-08-29 — the mechanism becomes the fold, and the property stands** ([`flow-versus-presented-geometry-claude.md`](../reviews/phase-23/flow-versus-presented-geometry-claude.md)). Answering the sink's `contribution` query per element needs a per-element record, so animations are folded — cancel, then start from `residual + newDelta` — rather than stacked. The continuity is the same and now deterministic, concurrent animations cap at one per element, and the property is still what no line of code depends on, so the continuity-under-interruption test remains the only thing that can fail if it is lost.
```