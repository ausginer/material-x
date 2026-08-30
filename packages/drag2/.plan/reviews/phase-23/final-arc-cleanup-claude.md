# Code-discipline review — final `drag2` arc (D-156, D-158, D-159)

Files read at `43b9f520` (branch `drag2/fin-review`, arc `0beb9900..43b9f520`).

## Scope

**Covered**: every `src/` file the arc touched — `sortable.ts`, `sortable/assemble.ts`,
`sortable/config.ts`, `sortable/feature.ts`, `sortable/linear-shift.ts` (new),
`sortable/rect-index.ts`, `sortable/runtime.ts`, `sortable/slots.ts`, `sortable/spec.ts`
(diff hunk only — the file is 1751 lines and only ~290 changed), `sortable/xy.ts`,
`sortable/y.ts`, `sortable/placement.ts` (grep-checked for the deleted pipeline's
vocabulary), `globals.d.ts`, `tsdown.config.ts`, `bench/size/measure.ts` and
`bench/size/noncomposed.js`. Applied lens: machinery the code's current
responsibility does not require, and stale documentation left behind by the
deletion — against `CONTRIBUTING.md` Part I/II and `documentation.md` §5.

**Not covered**: `sortable/spec.ts` outside the changed hunks (the surrounding
1,700-odd lines were not re-read for pre-existing issues); the test suite
(`tests/**`) beyond a grep for dead vocabulary — the task scopes this to
production code and tests are reviewed by other lenses; `.plan/` prose itself
(reviewed only to recover the contract each decision states); `kernel/*.ts`
beyond confirming `FAILURE_ACTION_EFFECT` already existed.

## Findings

### cleanup-1 — tier B — `globals.d.ts` documents a deleted module as the DEV binding's home

`packages/drag2/src/globals.d.ts` (lines 10–12) still reads:

> "The kernel binds it nowhere. Its four author-facing checks are production
> checks, so `sortable/verified-refresh.ts` holds this package's one binding,
> in the one tier with per-frame dev work."

`sortable/verified-refresh.ts` was deleted in this arc (`git show
0beb9900:packages/drag2/src/sortable/verified-refresh.ts` — 632 lines, removed
entirely per the diff stat). The binding it describes now lives in
`sortable/rect-index.ts`: `export const DEV: boolean = __DEV__;` at line 152,
which is where `tests/kernel/vocabulary.node.test.ts` would have to look to
assert "this package's one binding." The comment describes code that no longer
exists, which is not a permitted maintainer note under `documentation.md`
§5.2/5.3 ("if this became false tomorrow, is deleting it enough" — here it is
already false) and violates `CONTRIBUTING.md`'s "Comments describe the code
that exists now."

### cleanup-2 — tier B — `tsdown.config.ts` points the same DEV-binding comment at the wrong surviving module

`packages/drag2/tsdown.config.ts` (around line 33) was edited in this arc to
read:

```
// `src/sortable/linear-shift.ts`'s per-frame equivalence instrument. The
```

replacing a prior reference to `verified-refresh.ts`. But the equivalence
instrument (`verifyEquivalence`) and the `DEV`/`__DEV__` read it is gated
behind both live in `sortable/rect-index.ts` (lines 152, 170–260);
`linear-shift.ts` only imports `DEV` and calls `verifyEquivalence` — it does
not read `__DEV__` itself and is not where the instrument is defined. The
editor half-fixed this comment (updating the module name) without checking
which of the two files the sentence is actually about, leaving a second, more
subtle stale reference beside `globals.d.ts`'s stale one (cleanup-1) — the two
disagree with each other and both disagree with the source.

### cleanup-3 — tier B — `spec.ts` still narrates the deleted `beforeMove`/`afterMove` pipeline

`packages/drag2/src/sortable/spec.ts`, in `action.effect`'s `TAG_SPATIAL`
branch (line ~1112):

```
// Decided **before** the hooks run, not by the writer's return value.
// The pipelines bracket the write, so a `beforeMove` hook that
// measures the whole list would otherwise be paid in full for a write
// that never happens — and with `layoutAnimation()` that is two
// list-wide measurements and a cache rebuild per inert frame. An
// already-correct gap is the common case, not the rare one.
```

D-158 collapsed the `beforeMove`/`afterMove` two-slot pipeline into the single
`moved(frame, runtime, report)` hook (confirmed: `slots.beforeMove`,
`slots.afterMove`, `measureInsertion` and `DisplacementView` are grep-absent
from `src/` except this comment and one more in `placement.ts`, cleanup-4).
The claim the comment makes ("two list-wide measurements... per inert frame")
described the old two-pipeline cost model and is no longer what the code five
lines below does (one call to `slots.movedInsertion`, guarded by the same
early-return this comment is attached to). The *reason for the early return*
is still real, but the sentence describing what it saves work from is about
code that was deleted three commits into this arc — a live case of
`documentation.md`'s test: reading this sentence today, without being told the
history, mis-describes the mechanism directly below it.

### cleanup-4 — tier B — `placement.ts` documents `placeholderAt` against the deleted pipeline shape

`packages/drag2/src/sortable/placement.ts` (lines ~251–256), on the exported
`placeholderAt`:

```
* Exported because inertness has to be decidable *before* the move: the move
* pipeline brackets the write with `beforeMove`/`afterMove` hooks, and a hook
* that measures the whole list must not be paid for a write that will not
* happen: the coalesced spatial frame's sole writer reports whether a move
* occurred.
```

Same defect as cleanup-3: `beforeMove`/`afterMove` no longer exist as named
hooks anywhere in `src/` (D-158 replaced them with one post-write `moved`
hook, called through `slots.movedInsertion`). The function's export and its
early-decidability requirement are still true and still load-bearing — this is
not a claim that `placeholderAt` itself is dead — but the sentence justifying
*why* names a mechanism this same arc removed, one file over from where it
removed it.

## Findings considered and not raised

- **`sortable/linear-shift.ts` and `sortable/rect-index.ts`'s long rationale
  comments** (e.g. "Fields, not accessors... costs 90 B", the multi-paragraph
  G3-linear/G3-cellular derivations): these read as dense, but
  `documentation.md` §5.2 states explicitly that length is not the test for an
  internal comment, and each one argues a present-tense property of the
  current shape against a plausible alternative rather than narrating what was
  decided, by whom, or when. No `D-`/`F-`/phase/date reference appears in any
  of them (checked by grep across every touched `src/` file). This is the
  rule's own worked case for a comment that survives, not a violation.
- **`verifyEquivalence` (the DEV-only full-scan check in `rect-index.ts`)**:
  this could look like a runtime check protecting against consumer misuse
  (a list violating G1–G5), which `CONTRIBUTING.md` §1.1's gate would reject if
  it shipped. It does not ship — `DEV` folds to the literal `false` and the
  whole function is dead code in the published build (verified: `DEV` is read
  only as `__DEV__`, defined `'false'` in `tsdown.config.ts`). Read as a
  correctness harness for the library's *own* predictive-model claim — every
  browser test that drives a real drag through `y()`/`xy()` exercises it — it
  is closer to an in-repo assertion than a shipped diagnostic, and it heals the
  cache rather than merely failing, which is the behaviour a self-check needs
  and a consumer-facing guard would not. No defect found here.
- **`PresentationView.box`/`.settle` duplicating fields already on
  `SortableSlots`**: each is written once, at activation (and `snapshot` on
  republish), from an installer-provided reference that cannot itself change
  post-construction. The stated reason — keeping the axis/candidate-loop
  modules from importing the slot record at all — is a real import-edge
  argument under §7, not unexplained duplicate state under §5. No defect
  found.
- **`assemble.ts`'s try/catch unwind-on-throw structure**: this is existing
  lifecycle/ownership machinery (retiring already-installed features on a
  later installer's throw), not new in this arc, and changing it would be a
  §13 lifecycle matter for the architect rather than a cleanup finding.
