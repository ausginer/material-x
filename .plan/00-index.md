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

**Allocated by the `test-execution-1` closure consolidation.** Twenty-two, spanning the full review chain: the four-pass Review Swarm consolidated at `e618e5677`, the focused supersession review at `c63269e5a`, the focused lifecycle/budget/formatter review at `30f6ff2e8`, and two derived at closure. Each row keeps its pass-local name so the artefact it came from stays citable, and its `TE-` name where the architecture record carries one.

**This allocation is bounded, and the boundary is stated rather than left to be inferred.** It covers findings **produced by a review pass**. It does not cover `TE-F1`…`TE-F35`, which are the design and challenge passes' own findings, nor `TE-D12`…`TE-D21`, which are decisions — RD-1 keeps the kind letter precisely because only the architect mints one. Both sets remain `Canonical: unassigned` in that document's local register, and their registration is RQ-1.

High-water marks after this round: **`RF-22`**, **`RQ-1`**, **`RI-` none allocated**. Each series is allocated independently; one prefix's maximum says nothing about another's.

#### RF-1 — A discard landing inside an evaluation rejects that request

Tier A. `reviewer-1`, Review Swarm; carried as `TE-F36`. `watchChange` called `discardGeneration()`, which rejected every pending request with an error naming no file, on the ordinary watch-invalidation path that `TE-D16` preserves. **Closed** by `TE-D17` and `TE-D18` at `e41e72b25`: `discardGeneration` now detaches and parks, and rejection is reserved for a worker error, a non-zero exit, the entry's own throw and the stability budget.

#### RF-2 — A generation demoted by an entry's own throw is unreachable by invalidation and publishes a torn stylesheet

Tier A. `rem-1`, focused supersession review; carried as `TE-F41`. `discardGeneration` began `if (!current) { return; }`, so a generation demoted by a module failure — still draining live requests — was invisible to every later invalidation, and its siblings published output evaluated across a change the module had been told about. **Closed** by `TE-D18` at `e41e72b25`: the module owns a `generations` set, and discard and release both range over it rather than over `current`.

#### RF-3 — The supersession cap is denominated in watcher events, so two concurrently written files exhaust it

Tier A. `rem-2`, focused supersession review; carried as `TE-F42`. `ATTEMPTS = 2` counted `watchChange` calls, so a save-all, a `git checkout`, a formatter pass or any two-artefact build failed a dev-server request. **Closed** by `TE-D19` and `TE-D20` at `e41e72b25`: invalidation is coalesced into one supersession per quiet window, and the bound is a stability budget in time with a supersession floor.

#### RF-4 — Below the coalescing window no generation is created, so the budget cannot fire

Tier A as reported. `lb-1`, focused lifecycle review; carried as `TE-F43`. An invalidation stream whose gap is shorter than the fifty-millisecond window holds it open indefinitely; no successor is created, the parked request is never detached from anything, and its supersession count cannot reach the floor. **Closed by owner disposition, not by repair.** `TE-F43` records the regime as the boundary of the supported progress domain: correctness there is unconditional — nothing torn or stale is published, no handle is retained, and the request resolves when the writer stops — and `TE-D19` and `TE-D20` are corrected where they overstated the guarantee. No machinery is added, and demonstration 33 fails an implementation that adds one.

#### RF-5 — Both explanations the record carried for the memory delta are falsified

Tier B. `reviewer-2`, Review Swarm; carried as `TE-F37`. `TE-F35` offered container load and reclaimable page cache and established neither; the remeasurement it scheduled reproduced the figures on a quiet container and refuted both. **Closed:** the explanations and the Δ 5554 MiB expectation are withdrawn in the record.

#### RF-6 — The `memory.current` acceptance signal is an absolute peak no commit can meet

Tier B. `lb-2`, focused lifecycle review; carried as `TE-F44`. The acceptance table required peak `memory.current` ≤ 13 107 MiB; four alternating whole-repository runs breach it at **every** commit on a container at ordinary resting load, and the delta is itself baseline-dependent, so no delta is the portable quantity the record had been treating it as. **Closed** by `TE-D21` at `fc7c9263a`, which replaces the table with one absolute safety gate on anonymous memory and `oom_kill`, one comparative regression gate against an alternated arm, and figures that are reported and gate nothing.

#### RF-7 — The Zed debug task executed zero tests, and demonstration 20 was discharged on evidence that cannot distinguish success from failure

Tier B. `reviewer-3` + `der-2`, Review Swarm, found independently and blind to each other. `DEBUG=1` set `browser.ui` while `headless` and `contextOptions.deviceScaleFactor` were unconditional; Playwright rejected the combination, the context was never created, and the discharge rested on the process exiting on its own — which the error satisfies vacuously. **Closed** at `783c97665`, which removes `ui: isDebug`; demonstration 20 was then re-evidenced over CDP and independently re-verified at `30f6ff2e8`.

#### RF-8 — The repository documents a pull-request gate that does not exist

Tier B. `der-5`, Review Swarm; carried as `TE-F40`. `test-architecture.md` §CI policy states that every pull request gates on the verification suite; `.github/workflows/` contains `docs.yml` alone, on `push` to `main` and `workflow_dispatch`. **Open**, and dispositioned by RD-2: the policy is accepted and the mechanism is owed. Nothing about the repository's actual enforcement has changed, so this row closes when RD-2's four deliverables land and not before.

#### RF-9 — D-198 states the scoping its own correction retracts, and the register's projection reports both

Tier B. `lb-3`, focused lifecycle review. The correction struck the scoping clause in one paragraph and left it standing in the decision's statement clause and its **Touches** line, so `decision-status.ts` flattened a decision that contradicted itself and contradicted the document it amends; `F-424` and its repair entry carried the same expired premise. **Closed** at `510243725`: every site that states the corrected fact now carries the correction, verified here by reading the entry back through `entry.ts` and the flattened statement through `decision-status.ts`.

#### RF-10 — The torn-down marking cannot fire while the one-shot counter holds

Tier C. `reviewer-4` + `der-3`, Review Swarm; carried as `TE-F38`. `#released` was written only on a path reachable after `#consumed` was set, and the `#consumed` throw preceded the check, so the record credited two independent defences where one could fire. **Closed** at `783c97665`: the unreachable branch is gone, and `TE-D12` and `TE-D15` carry the corrected claim.

#### RF-11 — `clean.extras` does not cover the chunk the new entry point creates

Tier C. `der-4`, Review Swarm. `files.json` gained `css/generation` as a runtime entry while `clean.extras` listed only `format-*`, `transform-*` and `utils-*`, leaving orphaned hashed chunks in the tree. Not consumer-visible: the package is `"private": true`, so `files` is inert. **Closed** at `783c97665`, which adds `generation-*.js` and its map.

#### RF-12 — The browser page bound's stated ground was retired by this same design

Tier C. `der-1`, Review Swarm; carried as `TE-F39`. The comment's retention premise — seven browser projects held at ≈1.26 GiB each — was retired by `TE-D12` and `TE-F33` inside the same range, and revision 4 carried the value forward without re-deriving it. **Closed** as a record finding: `TE-D14` re-derives the surviving half and states the demonstration that would move the value. The value of `BROWSER_WORKERS` is not owed by implementation and is not a defect.

#### RF-13 — The `$close()` citation points one line above the call

Tier C. `integrity-1`, Review Swarm. `orchestrator.$close()` is `cli-api.BK8pd4xc.js:2493`; `:2492` is the enclosing `forEach`. The sibling `provider.close()` citation at `:2488` was exact and the mechanism as described was correct. **Closed:** both sites corrected in the architecture record.

#### RF-14 — `evaluate()` snapshotted a dependency set nothing can observe changing

Tier C. `cleanup-1`, Review Swarm. The result copied `generation.deps` into a fresh `Set` whose sole caller destructured it, iterated synchronously with no intervening `await`, and dropped the reference. **Closed** at `e41e72b25`: the copy is gone, and the result's documented meaning is now the set the accepted answer was evaluated under.

#### RF-15 — The request counter is process-scoped for a per-generation use

Tier C. `cleanup-2`, Review Swarm. `requests` sat at module scope while `pending` and the worker were both per-generation, so an id was only ever resolved within the generation that issued it. **Closed** at `e41e72b25`: `requests` is a field of `Generation`.

#### RF-16 — `zed-test.sh` declared `sh` and was not `sh`-compatible

Tier C. Consolidator-derived, Review Swarm. The shebang was `#!/usr/bin/env sh` while the script defined hyphenated function names POSIX `sh` rejects; `sh -n` failed at the first definition. Bounded rather than higher because `.zed/tasks.json` invokes it as `"command": "bash"`, so the real path was unaffected and the failure was loud. **Closed** at `783c97665`, which declares `bash`.

#### RF-17 — A new comment points the reader below for something that is above it

Tier C. `rem-3`, focused supersession review. **Closed** at `e41e72b25`: the comment now names the CDP port opened by the launch arguments above it, and the launch arguments are above it.

#### RF-18 — Demonstration 20 was recorded discharged with one of its two clauses unevidenced

Tier C. `rem-4`, focused supersession review. The demonstration requires a breakpoint over an attached port **and** that saving while paused starts no second execution; only the first carried evidence. **Closed** at `e41e72b25`: both clauses were driven over CDP, and both were re-driven independently at `30f6ff2e8` — one `RUN` line, zero one-shot errors, one test passed.

#### RF-19 — An obligation released by a repair was neither discharged nor carried as owed

Tier C. `rem-5`, focused supersession review. The debug recipe's surviving CDP-port `pkill` was parked on a blocker that the repair removed, and the repairing pass neither answered it nor restated it. **Closed** at `e41e72b25`, which records the cause; it was then reproduced independently at `30f6ff2e8` — an interrupted debug run orphans six Chrome processes that go on answering on the port.

#### RF-20 — The formatter coverage proof's figure does not reproduce

Tier C. `lb-4`, focused lifecycle review. The proof rested on two counts agreeing at **120**; the count was 121 at the commit the record is published at, and the figure belonged to no commit — it was taken mid-unit, before the two files the unit itself changes. **Closed** at `510243725`. Re-verified here: 122 tracked supported files outside `packages/` at `e41e72b25`, less `package-lock.json` which the tool refuses as a lock file, is 121, and the root leg reports 121.

#### RF-21 — Three sites still require or report the resource axis TE-D21 retired

Tier B. Consolidator-derived at closure. `TE-D21` removes `memory.current` as a gate, and `TE-F44` corrects `TE-F37`'s "it is met" as false on that axis — but three sites in the same document at head still read the ceiling on both axes: `TE-D14`'s settling demonstration for the browser page bound ("Four wins if it clears the ceiling on **both** axes"), and two closure statements that the requirement "is met on both axes". As written the bound-4 arm can never win, because one of the two axes it must clear is one `TE-F44` establishes cannot be cleared at any commit. **Open, routed to the architect.** This is the shape RF-9 records in the register — a correction not carried to every site that states the corrected fact — in the architecture document rather than in the ledger, and resolving it means changing what `TE-D14` requires.

#### RF-22 — Demonstration 20's status is stated two ways in one document

Tier B. Consolidator-derived at closure. The demonstration item reads **"Not discharged."** and describes the `browser.ui` / `deviceScaleFactor` conflict in the present tense, and a corrections bullet repeats that it is un-discharged; a later section records both of its clauses as discharged by this range. The defect the item describes is not in the tree — `ui: isDebug` was removed at `783c97665` — and the discharge was independently re-verified at `30f6ff2e8`. **Open, routed to the architect**, because which statement stands is the record owner's to say. Verified here at `f3455c027` by reading all three sites and the shipped factory.

## Questions

#### RQ-1 — The `TE-` local register's decisions and design-pass findings have no canonical assignment

`architect-test-execution-model-r4.md` §The local register carries forty-odd rows whose `Canonical` column reads `unassigned`. This closure assigns `RF-1`…`RF-22` over the findings a **review pass** produced, and stops there for a reason that is not arbitrary: `TE-D12`…`TE-D21` are decisions, and RD-1 keeps the kind letter separate precisely because **only the architect mints one**; `TE-F1`…`TE-F35` are the design and challenge passes' own findings, which no review pass owns and which a consolidator numbering them would be allocating on someone else's behalf.

**What is owed** is one architect pass that mints `RD-` over the decision rows and `RF-` over the design-pass findings, continuing from the `RF-22` high-water mark this entry sets, and fills the `Canonical` column in that document's table. Until it is taken, a citation of any of those rows is document-local and resolves through the file rather than through `entry.ts`.