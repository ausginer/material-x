# BQ-6 / BQ-9 / D-165 — decision elimination review

Commit range reviewed: `55eaaf1b..90d141e2` (single commit `90d141e2`), read at that
commit on branch `drag2/fin-review`.

## Scope

Independent DER pass. Read `packages/box-quad/.plan/plan.md` end to end (BQ-1
through BQ-9) and `packages/drag2/.plan/contract/00-index.md`'s D-164/D-165 rows
and `packages/drag2/.plan/reviews/phase-23/f227-inherited-space-boundary-claude.md`
as the primary decision projection. Traversed backward from landed machinery to
its justification and forward from retired normative content (BQ-1 through BQ-8,
D-164, the F-225 boundary sentence) to check for surviving subjects, per the task
brief's five numbered checks. Did not consult any other pass's findings or
descend into `.plan/reviews/` beyond the two records the task named and the ones
those two records cite by id.

Covered: `packages/box-quad/src/index.ts` (full diff against `55eaaf1b`),
`packages/box-quad/tests/{advanced,coordinates,projection,api}.browser.test.ts`,
`api.declaration.test.ts`; `packages/drag2/src/{kernel/{kernel,presentation,spec}.ts,
kernel.ts, sortable/{config,spec,xy,y}.ts, free-drag/spec.ts}`;
`packages/drag2/tests/{consumer.node.test.ts, revision/revision-2.ts,
kernel/presentation.browser.test.ts, sortable/displacement.browser.test.ts,
COVERAGE.md, packaging.node.test.ts}`. Did not re-derive the geometry (that is
established causally in the decision records this pass read); verified the
records' claims against the landed diff rather than re-proving the math.

## Result

**One finding, tier B, no tier A.** The forward pass — checking whether BQ-6's,
BQ-9's and D-164→D-165's retired capabilities left surviving machinery — comes
back clean everywhere it was pointed except one conformance test whose match
target BQ-9 retired. Stated plainly, because a null result is a result:

- `cache()`, `BoxCache`, `InternalCache`, `Space.ownerDocument`, `recache`, the
  epoch/adoption/weak-ownership state model BQ-6 says is deleted — none of it
  appears anywhere in `packages/box-quad/src/index.ts` after `90d141e2`, in
  either name or as an unlabeled equivalent. `grep -n
  "cache\|Cache\|boundary\|boundaries\|BOX_ANCESTOR\|ownerDocument"
  packages/box-quad/src/index.ts` returns only the two legitimate
  `element.ownerDocument.defaultView!` reads (unrelated — reading the DOM
  document off an element, not the deleted `Space.ownerDocument` field) and one
  unrelated comment ("numeric boundary stays explicit", about a finite-number
  check, not the ancestry boundary).
- BQ-9's ancestor-boundary capability — `box(boundaries)`, a per-boundary
  allocator, `BOX_ANCESTOR_*` slots, the `current !== element` exclusion test —
  is gone from `index.ts`. `BOX_LENGTH` is `8`, `Box`'s doc comment states
  `[a, b, c, d, e, f, width, height]` with no trailing ancestor fields, and the
  walk's per-node composition (`composeNode`) is unconditional — there is no
  branch left that special-cases "this is the boundary/measured node" the way
  `composeLinearMatrix`'s `current !== element` test did.
- D-164 (the boundary-parameterized encoding BQ-2/BQ-7/BQ-8 iterated toward)
  was **superseded before implementation** — its own row says so, and no
  production file anywhere carries a `boundaries` parameter, a boundary index
  constant, or a chain-membership `false` distinct from `ancestry`'s existing
  2D-representability `false`. There is nothing to clean up from it because
  nothing of it was ever built.
- `config.ts`'s F-225 boundary sentence ("no transform may sit between the item
  and its visual") is deleted, not reworded — confirmed by
  `git diff 55eaaf1b 90d141e2 -- packages/drag2/src/sortable/config.ts`, which
  shows the sentence removed and the surrounding scope-limit list reduced from
  four clauses to three (DOM order, rule-placed layouts unsupported, `box` must
  equal `visual` in grid), exactly matching D-165's "`config.ts` keeps three
  scope limits for this pair of slots." `grep -rn "no transform may sit\|item
  and its visual" packages/drag2/src` finds no other copy of the old framing in
  source; the two remaining hits are in `tests/COVERAGE.md` and
  `displacement.browser.test.ts`, both describing the *new*, correct behavior
  ("should ignore a transformed wrapper between item and visual") rather than
  restating the deleted limit.
- The `visual-no-box-space` throw in `acquireLift` is not a stranded guard.
  Traced causally: its subject changed rather than disappearing. Before this
  commit it fired for one condition (the visual's box unreadable); after, it
  fires for three ORed conditions — the visual's ancestry unreadable, the
  item's ancestry unreadable (only checked when `item !== visual`), or the
  visual's box unreadable. The first and third are the same subject as before.
  The second is new and is not a resurrection of the deleted
  boundary-membership check: D-165's Property 3 explicitly says nothing is
  refused for chain membership any more ("a visual that resolves outside the
  item's subtree measures correctly rather than failing"), and the landed code
  matches that — there is no membership test anywhere in `ancestry` or
  `acquireLift`, only "can this element's own ancestry be composed in 2D."
  That is a live, independent failure mode (a 3D transform, `perspective`, or
  `preserve-3d` somewhere on the item's own chain) that can fire in exactly the
  configuration D-165 chose to support rather than refuse — an off-label
  `visual` outside the item's subtree, where the item's chain and the visual's
  chain are not nested and can disagree about 2D-representability. Removing
  that disjunct would silently pass through an unreadable `itemSpace` as
  whatever stale buffer `space()` zero-initializes to, which `inheritedSpaceOf`
  would then read as the identity (`a===1,b===0,c===0,d===1`) — a silent wrong
  answer, not a refusal. The guard is doing real work under the current model.
- The `item === visual` buffer-sharing branch in `acquireLift`
  (`itemAbove = item === visual ? above : space()`) is a performance
  short-circuit, not a correctness guard masking dead machinery: nothing
  downstream branches on `visualSpace === itemSpace` by reference (`grep -rn
  "visualSpace ===\|itemSpace ===\|=== visualSpace\|=== itemSpace"
  packages/drag2/src packages/drag2/tests` returns only the doc comment stating
  the property, no consuming code), so removing the branch would cost one
  extra flat-tree walk per default-configuration lift without changing any
  observable output — it is exactly the "avoid a redundant walk" optimization
  the record describes, still justified by the same fact (the two ancestries
  are provably equal when the elements are the same one).
- `AdmissionSubject`'s new required `item` field and the two-argument
  `{ visual, box }` shape are gone everywhere as a pair — `grep -rn "{ visual,
  box }\|{visual, box}" packages/drag2/src` (excluding lines that also mention
  `item`) returns nothing; every construction site (`sortable/spec.ts`,
  `free-drag`'s bare-element path, the kernel's admission branch) was updated
  to the three-field shape or the coinciding bare-element spelling.
- Box-quad's own test suite shows the same discipline: `BOX_LENGTH` is
  reasserted at its **new** value (`8`) in both `coordinates.browser.test.ts`
  and `projection.browser.test.ts`; no test anywhere in `packages/box-quad/tests`
  asserts the old `13`, a `RangeError` on overflow (the variable-capacity
  allocator that would have thrown one was never implemented — BQ-7 lost to
  BQ-8 before landing), or a cache-hit/staleness/adoption scenario. All eleven
  `CACHE-*`-labeled tests (`CACHE-01`, `-04`, `-05`, `-06`, `-10`, `-11`, and the
  declaration-file cache assertions) are deleted outright, not adapted to a
  no-op.

### der-1 (tier B) — `packaging.node.test.ts`'s D-85 conformance guard still matches a constant name BQ-9 retired, and can no longer catch the pattern it exists to catch

**Finding.** `packages/drag2/tests/packaging.node.test.ts`'s "should keep the
geometry package out of every behavior" test (line 323) enforces D-85 — no
behavior module (`free-drag/`, `sortable/`) may reach box-quad — with:

```ts
if (/from '@ydinjs\/box-quad'|BOX_ANCESTOR_/u.test(source)) {
  offenders.push(`${directory}/${names[index]!}`);
}
```

The test's own comment explains the second disjunct's origin: "Free drag used
to take its own `coordinates()` traversal — with four private copies of
box-quad's index constants" — i.e. a behavior module once declared local
`BOX_ANCESTOR_A`/`B`/`C`/`D` constants matching box-quad's numbering, to index
into a measured value without importing the module (so the first disjunct,
the literal import check, would not have caught it). BQ-9 deletes
`BOX_ANCESTOR_A`..`D` from `packages/box-quad/src/index.ts` and renames the
concept to `SPACE_A`..`SPACE_ANCESTOR_ZOOM` on the new `Space` type — confirmed
by the source diff and by zero remaining hits for `BOX_ANCESTOR_` anywhere
under `packages/{box-quad,drag2}/{src,tests}`:
`grep -rln "BOX_ANCESTOR_" packages --include="*.ts" --include="*.md" | grep -v
".plan/"` returns exactly this one file.

**Current behavior / contract.** `packaging.node.test.ts` itself is untouched
by `90d141e2` (absent from `git diff --stat 55eaaf1b 90d141e2`), so the regex
was already in force before this commit and was not revisited when the commit
retired the name it matches.

**Why it is a problem.** The regex's own justification — catch a private
re-declaration of box-quad's ancestry index constants inside a behavior
module — depends on the constant name it hard-codes still being the name such
a re-declaration would use. It no longer is: box-quad's current source calls
the equivalent slots `SPACE_A`..`SPACE_ANCESTOR_ZOOM`, so a hypothetical
reintroduction of the historical anti-pattern under the *current* box-quad
shape would copy `SPACE_*`, not `BOX_ANCESTOR_*`, and would pass this check
silently — while `BOX_ANCESTOR_` itself can now only ever appear in a
`free-drag/`/`sortable/` file as an intentional, unrelated string, since no
legitimate derivation from the current box-quad API would ever produce it.
The check did not become false — nothing in the diff makes it lie about what
it tests — but it is testing for a name whose disappearance already closed off
the copy-paste path that would trigger it, so the second disjunct now
protects nothing the first disjunct (the import check) does not already cover
on its own. That is the tier-B bar exactly: no consumer-observable effect (the
test still passes, D-85 is not actually violated by this commit), but an
instrument the repository relies on for conformance is unsound with respect to
the shape it was written to detect.

**Evidence.**
- `git diff 55eaaf1b 90d141e2 --stat -- packages/drag2/tests/packaging.node.test.ts`
  → no output (file untouched by this commit).
- `git log -p --follow -- packages/drag2/tests/packaging.node.test.ts | grep -n
  "BOX_ANCESTOR_"` → introduced at commit `9e3be0cc` ("state what holds in
  source comments instead of addressing the planning ledger"), predating this
  review's range.
- `git diff 55eaaf1b 90d141e2 -- packages/box-quad/src/index.ts` shows
  `BOX_ANCESTOR_ZOOM`/`_A`/`_B`/`_C`/`_D` deleted and `SPACE_A`..
  `SPACE_ANCESTOR_ZOOM` introduced in their place.
- `grep -rln "BOX_ANCESTOR_" packages --include="*.ts" --include="*.md" | grep
  -v ".plan/"` → `packages/drag2/tests/packaging.node.test.ts` only.
- `packages/drag2/src/kernel/presentation.ts` (the one place in drag2 that
  legitimately reads ancestry slots) already uses `SPACE_A`..
  `SPACE_ANCESTOR_ZOOM` as its own local mirror, per its diff — so the
  renamed form is not hypothetical, it is the pattern the package's own
  privileged module now follows, and is exactly what an unprivileged
  behavior module copying the same idiom would also use.

**Required property.** A conformance guard whose match target names a specific
identifier should track that identifier through a rename the same decision
record that retired it also lands, or should be phrased in terms of the
invariant (no raw box-quad ancestry-slot indexing outside the kernel) rather
than a specific historical constant spelling — so that the check's coverage of
the anti-pattern it was built for does not silently narrow when the upstream
package renames the thing being copied.

## Scope notes

- No finding against the `visual === item` fast path, the `box !== item`-style
  identity checks in `sortable/spec.ts` (`box === visual && visual === item`),
  or any pre-existing equality guard: each was traced to a live, still-cited
  consumer (either a downstream reference-sharing optimization or the
  admission-subject encoding rule), not a vestige of a deleted mechanism.
- No finding against `Property 3`'s remaining documentation-only obligation
  (`visual` "is expected to resolve inside the item's subtree") — D-165 itself
  states this replaces a refused condition with an undetected one, and
  `config.ts`'s `visual` doc block carries exactly that language
  ("Nothing detects a violation: an unrelated element measures correctly and
  lifts, but the placeholder then stands in for a footprint the collection
  never had"), so the record's own account of what's enforced versus merely
  documented matches the code.
- Did not independently re-examine `packages/drag2/tests/perf/m5.browser.test.ts`'s
  prose beyond confirming its call sites use the current `acquireLift`
  signature and `Space`/`SPACE_*` types (they do); a documentation-accuracy
  question about that file's comments is a different lens's concern and is not
  reported here to avoid overlapping with a parallel pass on the same commit.
- Did not re-verify BQ-1 through BQ-8's byte/runtime measurements — those are
  the record's own falsification work, already closed on the page, and outside
  this task ("not to re-litigate those closed questions").
