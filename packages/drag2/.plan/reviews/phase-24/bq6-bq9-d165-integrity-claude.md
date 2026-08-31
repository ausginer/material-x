# BQ-6, BQ-9, D-165 — package-coherence integrity pass

**Read at:** `90d141e2` (single commit against `55eaaf1b`, branch `drag2/fin-review`).

**Scope.** Independent package-coherence review of the `AdmissionSubject` third
member (`item`), `ActivationScope`'s `visualSpace`/`itemSpace` pair, D-85
(no box-quad import in a behavior module), object identity when
`visual === item`, box-quad's own public-surface contract artifact, the
calling-convention precedent for drag2's new box-quad usage, and cross-package
consumers of `@ydinjs/box-quad`. Feature correctness against D-165's own
required properties (F-227/F-225 regression coverage, byte figures) was read
only to the extent needed to judge coherence, not re-verified — that is
another pass's subject.

**Outcome: no drift found.** Every question the brief raised resolves clean,
with evidence at two sites each. Recorded below as `integrity-1` through
`integrity-6`, all closed as non-findings, plus one already-tracked open item
carried forward unchanged.

---

## integrity-1 — `AdmissionSubject.item` is a genuine third role, not a strained addition

**Question.** Does every pair-form call site have a distinguishable notion of
`item` that differs in principle from `box`/`visual`, or does the type strain
under a third required field?

**Evidence.**

- `packages/drag2/src/sortable/spec.ts:449`: `return box === visual && visual
=== item ? item : { visual, box, item };` — the triple is constructed
  precisely when at least one of `box`/`visual` diverges from the collection
  element, so `item` is never a fourth spelling of a value already carried by
  `box` or `visual`; it is the reference the other two are resolved _from_
  (`seedDraft`'s `item: HTMLElement` parameter, line 393).
- `packages/drag2/src/free-drag/spec.ts:315`: `admit` always `return visual;`
  — the bare form only. Free drag has one element and never constructs the
  pair, so it supplies no counter-evidence either way; `subjectOf` at line
  215 (`{ item: root, visual }`) is a _different_ type, `FreeDragSubject`,
  used only for `slots.home()`, not `AdmissionSubject`.
- `packages/drag2/.plan/plan.md:2245` (the D-165 implementation record)
  states the same distinction independently: "`box` is not the item: with
  `visual` set and `box` defaulted to it, `box` is the inner card, which is
  precisely the configuration F-227 is about."

The three roles the doc block names — item as "the element the operation is
about," visual as "what leaves flow," box as "what the layout loses" — map
onto three independently-resolvable slots in `sortable/config.ts`
(`item`/`visual`/`box` resolvers), and the one call site that builds the
triple exercises exactly that independence. Not a strain.

## integrity-2 — `ActivationScope.visualSpace`/`itemSpace` are coherent with the rest of the scope, and object identity holds

**Question.** Is the two-field split bolted on, and is "one buffer when the
two coincide" actually upheld rather than merely claimed?

**Evidence.**

- `packages/drag2/src/kernel/spec.ts:198-212`: both fields are declared
  side by side, each with its own doc paragraph explaining why it exists and
  how it relates to the session's own (unrelated) projection — the same
  documentation discipline as every other `ActivationScope` member
  (`boxPre`, `originRect`). Two named fields is the shape the type already
  uses throughout, not a departure into an indexed/keyed structure.
- `packages/drag2/src/kernel/presentation.ts:504-529` (`acquireLift`):
  ```
  const above = space();
  const itemAbove = item === visual ? above : space();
  ...
  const itemSpace = itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove);
  ```
  When `item === visual`, `itemAbove` _is_ `above` (reference equality, not a
  second allocation compared for value equality), and `itemSpace` is then
  assigned the same `InheritedSpace` reference as `visualSpace`. This is
  object identity, exactly as D-165's "As landed" paragraph and property 5
  claim, verified directly rather than trusted.

## integrity-3 — D-85 holds: box-quad usage is confined to `presentation.ts`

**Evidence.** `grep -rn "@ydinjs/box-quad" packages/drag2/src` returns exactly
one file: `packages/drag2/src/kernel/presentation.ts:17`. No behavior module
(`sortable/*`, `free-drag/*`) imports it. `item` reaches `acquireLift` as a
plain `HTMLElement` parameter (`presentation.ts:496-498`), never as something
a behavior module derives geometry from itself.

## integrity-4 — the `AdmissionSubject`/`ActivationScope` surface break is disclosed, and follows the package's own precedent

**Question.** Is the required-third-field change to an already-published
middle-tier type a silent break, or is it recorded the way D-162's
`DisplacementReport` fifth-parameter break was?

**Evidence.**

- Both types are exported from `packages/drag2/src/kernel.ts:71-72`
  (`ActivationScope`, `AdmissionSubject`), which is the `kernel.js` public
  entrypoint (`package.json` `exports["./kernel.js"]`) — the surface a
  third-party `BehaviorSpec` author consumes. This export list is unchanged
  by the diff (`git diff 55eaaf1b 90d141e2 -- packages/drag2/src/kernel.ts`
  touches only a doc comment); the types were already published, and this
  commit adds a required field to one of them.
- `packages/drag2/package.json:4`: `"private": true` — the same class of
  package D-162's fifth-parameter break was judged against, and the plan's
  own precedent for that break (`plan.md:2293`, "one consequence the decision
  did not name... `sortable/feature.ts` re-exports the kernel's declaration")
  is repeated verbatim in form here: `plan.md:2245`, "One consequence the
  decision did not name. The item had to reach the kernel... So
  `AdmissionSubject`'s pair becomes a triple." The ledger's D-165 "As landed"
  paragraph (`contract/00-index.md:519`) states the same fact again: "The
  item reaches the kernel as a third member of `AdmissionSubject`."
- `packages/drag2/tests/kernel/vocabulary.node.test.ts:53-54,76` already
  listed `ActivationScope`, `AdmissionSubject` and `InheritedSpace` as
  published vocabulary before this change — so no new vocabulary-boundary
  gap was opened by widening a type already tracked there.

Disclosed twice (ledger + plan record), against a private pre-release
package, in the same documentary shape as the accepted D-162 precedent. Not a
silent widening.

## integrity-5 — box-quad's `01-public-api.md` is unchanged in its pre-existing staleness, not newly stale

**Question.** Does the contract artifact get updated to describe `Space`/
`ancestry`/the narrowed `Box`, or does BQ-9 leave a rerun of F-1?

**Evidence.** `git diff 55eaaf1b 90d141e2 -- packages/box-quad/.plan/contract/01-public-api.md`
removes only the `BoxQuadCache` type, the `cache` parameter and the two
cache-related non-goals lines — required by BQ-6. The document still
describes `readBoxQuad(element, out, relativeTo?)` and `Quad`, neither of
which exists in `packages/box-quad/src/index.ts` (which exports `coordinates`,
`projection`, `space`, `ancestry`, `Box`, `Space`); it says nothing about
`Space`, `ancestry` or the narrowed 8-slot `Box`.

This is not new drift from this commit: it is the exact gap box-quad's own
ledger already carries as open and explicitly unclosed —
`packages/box-quad/.plan/plan.md:41` (F-1): "`Box` — the package's central
output type... is described by no artifact at all," and `plan.md:60` (BQ-9's
own record, same commit): "F-1 shrinks and does not close... the absence of
any artifact describing `Box` — or now `Space` — are untouched and remain
the package owner's to reconcile." The commit under review neither closes nor
worsens this; it is disclosed in the same ledger this review is checking
against, so I am not reporting it as a new finding — restating it here only
because the brief asked the question directly.

## integrity-6 — calling convention and cross-package consumers

**Precedent/consistency.** `presentation.ts:12-17` imports `ancestry`,
`space`, `type Space`, alongside the pre-existing `coordinates`, `projection`,
`box`, `type Box` from the same `@ydinjs/box-quad` specifier — one import
statement, caller-owned buffers passed into plain functions throughout
(`space()`, `box()` allocate; `ancestry(el, out)`, `coordinates(el, out,
above)` fill). Same idiom as the pre-existing `projection(source, out,
relativeTo)` call, not a new calling convention.

**Cross-package coherence.** `grep -rl "@ydinjs/box-quad" packages/*/src
packages/*/tests` returns only `packages/drag2/src/kernel/presentation.ts`,
`packages/drag2/tests/consumer.node.test.ts`,
`packages/drag2/tests/packaging.node.test.ts` and
`packages/drag2/tests/perf/m5.browser.test.ts` — all inside `drag2`. No other
package in the repository consumes box-quad, so BQ-6/BQ-9 have no silent
effect elsewhere to check.

---

## Summary

No property that this pass checked no longer holds. `AdmissionSubject.item`
is a sound encoding of a real third role exercised by the one call site that
constructs the triple; `ActivationScope.visualSpace`/`itemSpace` are shaped
like the rest of the type and share one buffer by reference identity, not
merely by value, when `visual === item`; D-85 is unbroken (box-quad import
confined to `presentation.ts`); the published-surface break to
`AdmissionSubject`/`ActivationScope` is disclosed in both the ledger and the
plan record, in the same package-private-precedent shape as D-162's accepted
break; box-quad's public-api contract carries forward its pre-existing,
already-tracked F-1 staleness unchanged rather than gaining new drift; the
box-quad calling convention is consistent with existing usage; and no
consumer outside `drag2` touches box-quad.
