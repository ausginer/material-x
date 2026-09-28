# test-execution-1 — closure

**Consolidated 2026-09-14 at `f3455c027`**, over the whole review and remediation chain rather than one range. No new review pass was launched: the evidence was already in the tree, and what was owed was validation, registration and a verdict.

**The chain.** Review Swarm at `e618e5677` (four parallel passes over `67af05288..7aeaff260`) → `repo:RD-1` and `repo:RD-2` at `0136aa67b` and `375a9c00e` → supersession remediation at `783c97665` → focused review at `c63269e5a` → `TE-D18`–`TE-D20` at `ab174b894` → implementation at `e41e72b25` → focused review at `30f6ff2e8` → `TE-D21` and `TE-F43` at `fc7c9263a` → formatter residues at `510243725`.

**Result. Twenty of twenty-two findings are closed. Two are open and routed, one is open by decision, and one pre-existing failure stays external.** Registration is taken: `RF-1`…`RF-22` and `RQ-1` are written into [`.plan/00-index.md`](../../00-index.md) in the same commit as this document, which is what makes them canonical rather than proposed.

## What was validated rather than inherited

The instruction was to check the closure evidence, not to relay the implementers' claims. Every row below was reproduced here at `f3455c027` unless it says otherwise.

| Claim under test | How it was checked here | Verdict |
| --- | --- | --- |
| `TE-D17`/`TE-D18`–`D20` close the in-flight rejection and the failed-but-draining tear | Read the shipped `css/generation.ts` end to end: `discardGeneration` iterates `[...generations]`, detaches and **parks**; `releaseGeneration` ranges over the same set and reads `current` nowhere; `fail` is reached only from the worker `error`/`exit` handlers, the entry's own throw and release; `ATTEMPTS` no longer exists | **Holds** |
| `TE-F43` is a progress-domain boundary, not an open defect | Read `TE-F43` and `TE-D19`/`TE-D20` at head: the regime is dispositioned by the owner, the overstated clauses are corrected, no machinery is added, and demonstration 33 fails an implementation that adds some | **Holds** |
| `TE-D21` replaces the invalid ceiling model | Read `TE-D21`: `memory.current` stops being a gate, the absolute gate moves to `oom_kill` plus peak anonymous memory against the unchanged 13 107 MiB, and a comparative gate with a stated baseline precondition carries the regression question | **Holds — and its correction is incomplete; see RF-21** |
| The D-198 / F-423 / F-424 residues are corrected | Read the entry back through `entry.ts` and the flattened statement through `decision-status.ts`: the statement clause and the **Touches** line now carry no scope and no exception, and match `handoff.md` | **Holds** |
| The coverage figure is corrected | Counted tracked supported files outside `packages/` at `e41e72b25` — 122, less `package-lock.json` which the tool refuses as a lock file, is **121**, the record's corrected figure; `oxfmt --check . '!packages/**'` at head reports 122 files, all correctly formatted, the difference being the review artefact committed since | **Holds** |
| The Prettier path is completely gone | `git ls-files | grep -i prettier`is empty;`prettier`is a declared dependency of no workspace;`prettier/prettier`appears in no resolved config; the only survivor is`eslint-config-prettier`, which `eslint.config.ts:39`consumes and which`D-198`and`F-424` both keep deliberately as the disable-half | **Holds** |
| The `oxfmt` partition is total and disjoint | Nine package `fmt` recipes against nine directories under `packages/`, root leg `oxfmt . '!packages/**'` for everything else; `just fmt-check` green | **Holds** |
| `pkill` keeps a cause | The comment now states it, and `30f6ff2e8` reproduced the orphaning it describes | **Holds** |
| The CDP comment and demonstration 20's evidence | Comment now names the launch arguments above it; both clauses driven over CDP at `e41e72b25` and independently re-driven at `30f6ff2e8` | **Holds in the tree — the record still says otherwise; see RF-22** |
| `node/tproc` and the contention timeout are causally separate | `git log 9884b1fb1..HEAD -- packages/tproc` is **empty**; `packages/tproc`'s last commit is an ancestor of the branch point; the assertion reproduces in isolation at that branch point | **Holds** |
| The pull-request gate | `.github/workflows/` still holds `docs.yml` alone | **Open, as `repo:RD-2` says** |

**Two claims did not survive as stated**, and both are corrections the chain itself began and did not finish. They are `RF-21` and `RF-22`, registered and routed below.

## Local → canonical

Twenty-two rows. Pass-local names are preserved so each artefact stays citable; `TE-` names appear where the architecture record carries one. Nothing was merged: the four candidate pairs were checked and each describes a distinct defect.

| Canonical | Local | `TE-` | Tier | Status |
| --- | --- | --- | --- | --- |
| `repo:RF-1` | `reviewer-1` | `TE-F36` | A | Closed at `e41e72b25` |
| `repo:RF-2` | `rem-1` | `TE-F41` | A | Closed at `e41e72b25` |
| `repo:RF-3` | `rem-2` | `TE-F42` | A | Closed at `e41e72b25` |
| `repo:RF-4` | `lb-1` | `TE-F43` | A | **Closed by owner disposition** — a progress-domain boundary, not a defect |
| `repo:RF-5` | `reviewer-2` | `TE-F37` | B | Closed — explanations and the Δ expectation withdrawn |
| `repo:RF-6` | `lb-2` | `TE-F44` | B | Closed at `fc7c9263a` by `TE-D21` |
| `repo:RF-7` | `reviewer-3` + `der-2` | — | B | Closed at `783c97665` |
| `repo:RF-8` | `der-5` | `TE-F40` | B | **Open** under `repo:RD-2` |
| `repo:RF-9` | `lb-3` | — | B | Closed at `510243725` |
| `repo:RF-10` | `reviewer-4` + `der-3` | `TE-F38` | C | Closed at `783c97665` |
| `repo:RF-11` | `der-4` | — | C | Closed at `783c97665` |
| `repo:RF-12` | `der-1` | `TE-F39` | C | Closed — `TE-D14` re-derives the ground |
| `repo:RF-13` | `integrity-1` | — | C | Closed |
| `repo:RF-14` | `cleanup-1` | — | C | Closed at `e41e72b25` |
| `repo:RF-15` | `cleanup-2` | — | C | Closed at `e41e72b25` |
| `repo:RF-16` | consolidator-derived (round 1) | — | C | Closed at `783c97665` |
| `repo:RF-17` | `rem-3` | — | C | Closed at `e41e72b25` |
| `repo:RF-18` | `rem-4` | — | C | Closed at `e41e72b25` |
| `repo:RF-19` | `rem-5` | — | C | Closed at `e41e72b25` |
| `repo:RF-20` | `lb-4` | — | C | Closed at `510243725` |
| `repo:RF-21` | consolidator-derived (closure) | — | B | **Open, routed** |
| `repo:RF-22` | consolidator-derived (closure) | — | B | **Open, routed** |

**Four merge candidates were considered and all four were kept apart**, because the test is one underlying defect and not one subject:

- `RF-1` and `RF-2` share a module and a repair. One is a discard rejecting instead of superseding; the other is a demoted generation being invisible to discard at all. Different defects; `TE-D18` closes both.
- `RF-5` and `RF-6` share the resource contract. One is about the explanations the record offered for a delta; the other is about a threshold no commit can meet. Different defects; different corrections.
- `RF-7` and `RF-18` share demonstration 20. One is a tree defect that made the task execute nothing; the other is a record gap on the demonstration's second clause. Different defects.
- `RF-9` and `RF-21` share a shape — a correction not carried to every site that states the corrected fact — in two different documents, about two different facts. A shape is not a defect.

**No allocation was taken beyond this boundary**, and `RQ-1` says why: `TE-D12`…`TE-D21` are decisions, and only the architect mints one; `TE-F1`…`TE-F35` are the design and challenge passes' own findings, which no review pass owns.

## The two open routed findings

Both are stated in the register. Neither is a defect in the tree, both are mechanically verified, and neither is mine to settle — each resolves by changing what the contract requires.

**`repo:RF-21` — three sites still require or report the axis `TE-D21` retired.** `TE-D14`'s settling demonstration for the browser page bound says four wins if it clears the ceiling on **both** axes; two closure statements say the requirement is met on both axes. `TE-F44` establishes that the `memory.current` axis cannot be cleared at any commit on a loaded container, and `TE-D21` accordingly stops gating on it. So the demonstration that would move `BROWSER_WORKERS` is, as written, unpassable — which is the same failure mode `RF-9` records in the ledger, one document over.

**`repo:RF-22` — demonstration 20 is recorded both un-discharged and discharged.** The item body and a corrections bullet say un-discharged, and describe the `browser.ui` / `deviceScaleFactor` conflict in the present tense; a later section records both clauses discharged by this range. `ui: isDebug` was removed at `783c97665` and both clauses were driven over CDP twice, by two passes. Which statement stands is the record owner's call.

**Neither blocks merge.** Both are record coherence, in the architecture document rather than in the tree, and both are visible rather than silent.

## Owner-executed VS Code evidence

The verification boundary the round preserved — no pass simulated an editor gesture — is now discharged by the owner, in the half that could only be discharged that way. Recorded as reported, with the correlations named only where the evidence carries them.

- **Root discovery worked**, and single-test, file, project and Run All gestures all launched. That is demonstration 13 and the four ordinary arms of demonstration 15.
- **Ordinary arrow-triggered runs repeated.** This is the assertion `TE-D15` makes about the one-shot guard from the editor's side: a second gesture spawns a second process rather than tripping the guard on the first.
- **Run All exposed two failures, and both correlate.** The deep-equality failure correlates **by evidence**: `node/tproc`'s pre-existing assertion is a deep-equality failure (`expected { 'state-layer.opacity': 0.08 } to deeply equal …`), it is the single surviving failure in every one of the eight sampled root runs across two review passes, and it reproduces in isolation at the branch point. The timeout that passed separately correlates **by shape only**: `node/drag2`'s `size.node.test.ts` is the established contention artefact of the shared non-browser group — times out under whole-run load, passes alone, producible on demand at an oversubscribed bound. The owner's report does not name the file, so that one is a shape match and is recorded as such rather than as an identification.
- **Ports behaved as the design requires.** 9876 onward were used transiently while sibling browser servers selected addresses, and after completion only the four declared in `forwardPorts` remained — verified here as `[9876, 6006, 5176, 24678]`. No test port survived the run, which is the editor-side observation of demonstration 14: every provider released, and the process gone.
- **Update Snapshot was not exercised, and is not inferred from the others.** Demonstration 15 enumerates five gestures and four were performed, so it is **partially discharged**.

**Why the missing gesture does not block the verdict, stated as an argument rather than as a dismissal.** `TE-F30` settles by call-site enumeration that `vitest.updateSnapshot` is a command rather than a profile, that it takes the **same** `:run` profile and the same `executeRun` path as the four gestures that were performed, and that the worker's `updateSnapshots` calls `runTests` exactly once. The four executed gestures are therefore a confirmation of the shared path, and what remains unconfirmed is one command arm over a path already observed. The risk is narrow and it is not zero, which is why it is recorded as an open demonstration rather than closed by inference.

## The verdict

**This test-execution unit and this branch are ready to merge.**

- **Closed: twenty of twenty-two findings**, including all four tier A items and every defect in the tree. The lifecycle holds under both real consumers, the resource contract is expressed on an axis the run controls, and the repository has exactly one formatter.
- **Open under `repo:RD-2`: the pull-request verification gate** (`repo:RF-8`). It is accepted policy whose implementation is owed, in dependency order behind a pinned verification environment. It is explicitly **not part of this remediation** and it does not gate this merge — it is the reason this merge is not gated by anything automated.
- **Open and routed to the architect: `repo:RF-21` and `repo:RF-22`**, both record coherence inside the architecture document, neither affecting the tree.
- **Open by decision, owing nothing: `repo:RF-4`.** The sub-window regime is the boundary of the supported progress domain, and adding machinery for it now fails a demonstration.
- **External and pre-existing: `node/tproc`'s deep-equality assertion**, untouched by this work across the entire branch (`git log 9884b1fb1..HEAD -- packages/tproc` is empty), and `node/drag2`'s contention timeout, which is the shared non-browser group's margin rather than this design's. Neither is owed by this unit. The standing observation `TE-D14` leaves behind — the shared group is not reliably green at either commit — travels with the group, not with this merge.
- **Partially discharged: demonstration 15**, four gestures of five. Update Snapshot remains **explicitly unverified**, on a path `TE-F30` enumerates and the other four gestures exercise.

## What this consolidation did not do

No production code was modified. No architectural decision was made and no `RD-` was minted. Where two records disagree the disagreement is registered and routed rather than resolved by preference, and where a demonstration was not performed it is recorded as not performed rather than inferred from an adjacent one.

**LSP plugin — available; not used:** the work was record validation, register allocation, git history attribution and arithmetic against contract figures. The one code-symbol question — what reaches `discardGeneration` and `fail` — was settled by reading the whole module, which is 400 lines and was the artefact under review; the previous pass also recorded the plugin answering from a stale copy of this same file.