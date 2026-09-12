# Repository record — index

The register for records whose subject is **the repository** rather than one package. `packages/*/.plan/` holds a package's record; this holds the repository's, and the work directories beside it — `test-execution-1/`, `harness-guard-2/`, `reviews/` — are its material.

**Scope `repo`.** Addresses are qualified as everywhere else (`CONTRIBUTING.md` §Reading one entry of a record): `repo:RD-1`. Entries are `####` headings that open with their identifier, so one extracts standalone:

```sh
awk -v re="^#### RD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  .plan/00-index.md
```

## Decisions

#### RD-1 — Repository-level records have their own scope and their own series

**Repository-level decisions, findings, questions and invariants are recorded here, under the `repo` scope, as `RD-`, `RF-`, `RQ-` and `RI-`.** They are not recorded in `packages/drag2/.plan/contract/00-index.md`, and they never allocate from the bare `D-`, `F-`, `Q-` or `I-` series.

**Why not drag2's register.** `00-index.md` is `@ydinjs/drag2`'s contract register. A repository verification rule is the wrong family and the wrong home, which the `test-execution-1` challenge said in those words about a proposed `I-38`. That objection is why revision 1's proposed `F-432`…`F-438`, `I-38` and `D-199`…`D-204` were **withdrawn** and re-expressed as document-local `TE-` names marked `Canonical: unassigned` — a correct retreat that left the family without a home, so the next round arrived at the same wall.

**The rule that forecloses a second allocation surface: one series, one allocating register.** `review-findings.md` records what the absence of that rule cost once — "two rounds an hour apart once gave one id to six defects" — and a series allocated from two registers has no allocator at all. So:

- The bare `D-`, `F-`, `Q-` and `I-` series belong to `drag2` and are **closed to every other scope**.
- Every other scope prefixes the kind letter with a scope marker: `repo` gives `RD-`/`RF-`/`RQ-`/`RI-`, a future `box-quad` gives `BQD-`/`BQF-`/… The scope marker is what keeps a **bare** identifier globally unique, which `CONTRIBUTING.md` requires of every claimed identifier in the tree.
- The kind letter is kept rather than collapsed into one series, because the record distinguishes a decision from a finding sharply — only the architect mints a `D-` — and that distinction has to be readable in a citation.
- Numbering starts at **1** in each new series. There is no high-water reconciliation against drag2's register, and the withdrawn `F-432`…`F-438` sightings cannot be double-claimed by anyone: repository findings do not use that series, and drag2's register remains free to allocate it.

**Allocation discipline is unchanged and is now satisfiable.** A pass that mints an identifier writes its row into the register owning that family in the same commit that first uses it (`review-findings.md` §Artifacts). Until this register existed there was no such commit to write for a repository finding, which is the mechanical reason the rule kept being broken rather than followed.

**A heading that opens with an identifier claims it, at any depth.** A round's pass artefacts and its summary are records too. Local pass ids of the form `reviewer-1` or `der-5`, and proposed-but-unassigned canonical ids in a summary's headings, both match `[A-Za-z][A-Za-z0-9]*-\d+` and therefore claim what they name; a proposal that claims an id it was not given is exactly how `F-432`…`F-438` became sightings. Either the heading does not open with the identifier, or the local name is put outside the grammar — the `TE-D12` form, whose letter after the hyphen makes it unmatchable — before the round is registered.

**Consequences carried elsewhere.** `documentation.md` §8 gains the `.plan/` row; `review-findings.md` §Artifacts names the repository path and the owning register; `SCOPES` in `packages/drag2/.scripts/entry.ts` gains a `repo` row so `repo:RD-1` resolves. The awk idiom above works without it.

#### RD-2 — Pull-request verification is accepted policy whose implementation is owed

**The policy stands as written and is not weakened to match today's tooling.** `.agents/docs/test-architecture.md` §CI policy requires every pull request to be gated by the repository verification suite, and §What screenshots prove requires visual baselines to be verified in one pinned, reproducible environment shared by CI and local runs. Both are the accepted target. Neither is installed: the repository's only workflow is `docs.yml`, on `push` to `main` and `workflow_dispatch`, and there is no pull-request workflow, no pinned Chromium image and no branch rule referring to either.

**This is a deferral, not an absence.** The distinction matters because the two read identically in a tree and differently in a decision. A repository that has decided to operate without pre-merge verification would say so in its policy; a repository that has accepted the gate and not yet built it keeps the policy authoritative and carries the build as owed work. This is the second, and the policy document is therefore corrected in **tense and status**, never in substance.

**Where each half lives.** The normative half stays in `test-architecture.md`, which is the current-state document for test policy and is where a role looks to learn what must hold. The status half lives here, and is referenced from that document rather than copied into it — `documentation.md` §4, a durable rule cites a record rather than carrying the record's numbers, and §1, a current-state document carries no amendment narrative. What the policy document gains is one line saying the mechanism is owed and naming this entry.

**What is owed, in dependency order.** The first deliverable is not the workflow.

1. **A pinned verification environment** — a container image fixing OS, Chromium, fonts and icons, headless mode, device scale and viewport, colour scheme and GPU configuration. The visual suite is only meaningful inside one, and the same image must be runnable locally or developer output and CI output diverge by construction. Without this step first, the visual half of the gate produces false diffs and is disabled within a week of landing, which is worse than not having it.
2. **The pull-request workflow** running the suite §CI policy enumerates: formatting, linting, typechecking; `tproc` node tests; behaviour and accessibility browser tests; spec-contract browser tests; the curated Chromium visual suite. It uploads screenshot actual/diff artefacts on failure and never commits or approves a baseline.
3. **The branch rule** that makes the workflow a gate rather than a report.
4. **A baseline-maintenance policy** for what happens when the pinned image is upgraded, which is the recurring cost the environment creates.

**Resource facts the design must start from**, measured on the repository's own test-execution work and not to be re-derived: one whole-repository run needs roughly 6.6–7.4 GiB and 66–86 s, plus build time, and peaks near 10.4 GiB anonymous. A runner sized below that does not run this suite at all.

**Acceptance.** A pull request that fails any enumerated check cannot merge; the same pinned image runs locally and in CI and produces matching screenshots; no baseline is written by CI. Until all four deliverables hold, this entry is the statement of record that the gate does not exist.

**Home when the work is taken:** a `.plan/` work directory of its own beside the others, holding the design for the image and the workflow. It is not created here, and nothing about the mechanism is designed here — this entry classifies the work and fixes its contract, and the unit that builds it is separate.

## Findings

**None allocated.** The `test-execution-1` review round consolidated at `e618e5677` proposes eleven, held as pass-local names pending registration under RD-1. One of them — the pull-request gate the policy describes and the repository does not have — is dispositioned by RD-2 and stays **open**: RD-2 records that the gate is owed, and nothing in it claims the gate exists.

## Questions

**None allocated.** The two the same round routes — where repository findings are registered, and the browser page bound — are answered and carried in [`test-execution-1/architect-test-execution-model-r4.md`](test-execution-1/architect-test-execution-model-r4.md); the first is RD-1.