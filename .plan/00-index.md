# Repository record — index

The register for records whose subject is **the repository** rather than one
package. `packages/*/.plan/` holds a package's record; this holds the
repository's, and the work directories beside it — `test-execution-1/`,
`harness-guard-2/`, `reviews/` — are its material.

**Scope `repo`.** Addresses are qualified as everywhere else
(`CONTRIBUTING.md` §Reading one entry of a record): `repo:RD-1`. Entries are
`####` headings that open with their identifier, so one extracts standalone:

```sh
awk -v re="^#### RD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  .plan/00-index.md
```

## Decisions

#### RD-1 — Repository-level records have their own scope and their own series

**Repository-level decisions, findings, questions and invariants are recorded
here, under the `repo` scope, as `RD-`, `RF-`, `RQ-` and `RI-`.** They are not
recorded in `packages/drag2/.plan/contract/00-index.md`, and they never allocate
from the bare `D-`, `F-`, `Q-` or `I-` series.

**Why not drag2's register.** `00-index.md` is `@ydinjs/drag2`'s contract
register. A repository verification rule is the wrong family and the wrong home,
which the `test-execution-1` challenge said in those words about a proposed
`I-38`. That objection is why revision 1's proposed `F-432`…`F-438`, `I-38` and
`D-199`…`D-204` were **withdrawn** and re-expressed as document-local `TE-`
names marked `Canonical: unassigned` — a correct retreat that left the family
without a home, so the next round arrived at the same wall.

**The rule that forecloses a second allocation surface: one series, one
allocating register.** `review-findings.md` records what the absence of that
rule cost once — "two rounds an hour apart once gave one id to six defects" — and
a series allocated from two registers has no allocator at all. So:

- The bare `D-`, `F-`, `Q-` and `I-` series belong to `drag2` and are **closed
  to every other scope**.
- Every other scope prefixes the kind letter with a scope marker: `repo` gives
  `RD-`/`RF-`/`RQ-`/`RI-`, a future `box-quad` gives `BQD-`/`BQF-`/… The scope
  marker is what keeps a **bare** identifier globally unique, which
  `CONTRIBUTING.md` requires of every claimed identifier in the tree.
- The kind letter is kept rather than collapsed into one series, because the
  record distinguishes a decision from a finding sharply — only the architect
  mints a `D-` — and that distinction has to be readable in a citation.
- Numbering starts at **1** in each new series. There is no high-water
  reconciliation against drag2's register, and the withdrawn `F-432`…`F-438`
  sightings cannot be double-claimed by anyone: repository findings do not use
  that series, and drag2's register remains free to allocate it.

**Allocation discipline is unchanged and is now satisfiable.** A pass that mints
an identifier writes its row into the register owning that family in the same
commit that first uses it (`review-findings.md` §Artifacts). Until this
register existed there was no such commit to write for a repository finding,
which is the mechanical reason the rule kept being broken rather than followed.

**A heading that opens with an identifier claims it, at any depth.** A round's
pass artefacts and its summary are records too. Local pass ids of the form
`reviewer-1` or `der-5`, and proposed-but-unassigned canonical ids in a
summary's headings, both match `[A-Za-z][A-Za-z0-9]*-\d+` and therefore claim
what they name; a proposal that claims an id it was not given is exactly how
`F-432`…`F-438` became sightings. Either the heading does not open with the
identifier, or the local name is put outside the grammar — the `TE-D12` form,
whose letter after the hyphen makes it unmatchable — before the round is
registered.

**Consequences carried elsewhere.** `documentation.md` §8 gains the `.plan/`
row; `review-findings.md` §Artifacts names the repository path and the owning
register; `SCOPES` in `packages/drag2/.scripts/entry.ts` gains a `repo` row so
`repo:RD-1` resolves. The awk idiom above works without it.

## Findings

**None allocated.** The `test-execution-1` review round consolidated at
`e618e5677` proposes eleven, held as pass-local names pending registration under
this decision.

## Questions

**None allocated.** The two the same round routes — where repository findings are
registered, and the browser page bound — are answered and carried in
[`test-execution-1/architect-test-execution-model-r4.md`](test-execution-1/architect-test-execution-model-r4.md);
the first is this decision.
