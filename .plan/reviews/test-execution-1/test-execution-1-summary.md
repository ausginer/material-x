# test-execution-1 — review round summary

**Consolidated 2026-09-11.** Four independent passes — `reviewer`, `integrity`, `cleanup`, `der` — over the repository test-execution redesign, launched in parallel and blind to one another. No pass received another's prompt, findings or artifact path; only `reviewer` received the feature-proof checklist.

**Range reviewed:** `67af05288..7aeaff260` (`c1cab3031` implementation, `7aeaff260` post-implementation reconciliation), branch `drag2/fin-review`.

**Canonical contract:** `.plan/test-execution-1/architect-test-execution-model-r4.md` at head, plus the reconciliation at `7aeaff260`.

**Tree note.** The checkout head is `28e2066c8`, one commit past `7aeaff260` (`agents: disable subagent spawning for subagents`, touching only `.claude/agents/{cleanup,der,integrity}.md`). It does not intersect the range, so reports read at either commit are mergeable. It also means no pass could spawn sub-agents of its own; all four verified directly.

**Result.** Thirteen local findings — twelve from the passes, one consolidator-derived — consolidating to **eleven**, via two merges. **One tier A, three tier B, seven tier C.** The tier A is a contract gap, not a regression, and is routed rather than resolved here.

## Id allocation — none taken, and the series has since been settled

**This round assigns no canonical ids.** Its eleven results are held as pass-local names only.

At consolidation the register and the tree disagreed: `packages/drag2/.plan/contract/00-index.md` assigned `F-` to 431, `Q-` to 28, `I-` to 37 and `D-` to 198, while the tree sighted `F-432`…`F-438`, `I-38` and `D-199`…`D-204`. Those were not drift — they are canonical ids proposed by revision 1 of this series and then **withdrawn**, r4 re-expressing them as document-local `TE-` rows marked `Canonical: unassigned`.

Allocating over that would have re-opened a question the series had deliberately parked, in a register belonging to `@ydinjs/drag2` rather than to the repository — the objection the `test-execution-1` challenge had already made in those words about a proposed `I-38`. Choosing the home is an ownership decision, and consolidation does not make one, so the question was routed instead.

**It has since been answered, by `repo:RD-1` at `0136aa67b`.** Repository-level records now have their own register (`.plan/00-index.md`) and their own series — `RD-`/`RF-`/`RQ-`/`RI-`, numbering from 1 — and the bare `D-`/`F-`/`Q-`/`I-` series are closed to every scope but drag2. Allocation for this round is therefore satisfiable for the first time, as `RF-`, and is **not taken here**: `.plan/00-index.md` §Findings records these eleven as pending registration, and writing eleven rows into a register authored in another session minutes earlier is the second-writer hazard RD-1 exists to foreclose.

**This summary was revised after RD-1 landed, to conform to RD-1**, which the round predates. Two corrections, both to this round's own records rather than to any finding:

- The proposed block and two routed question ids were **withdrawn**. They allocated from series now closed to this scope, and a proposal that claims an id it was not given is precisely how `F-432`…`F-438` became sightings.
- Every finding heading in this summary and in the four pass artefacts opened with an identifier, which RD-1 rules is a claim at any depth. Summary headings now open with the claim itself; pass-artefact headings are prefixed so they no longer open with the identifier, and every local id is preserved verbatim.

No finding, tier, merge or evidence changed.

## Results, and how far consolidation confirmed each

| Local                  | Tier | Verification                 |
| ---------------------- | ---- | ---------------------------- |
| reviewer-1             | A    | **verified here**            |
| reviewer-2             | B    | reviewer-attested            |
| reviewer-3 + der-2     | B    | **verified here**            |
| der-5                  | B    | **verified here**, re-scoped |
| reviewer-4 + der-3     | C    | **verified here**            |
| der-4                  | C    | **verified here**, bounded   |
| der-1                  | C    | der-attested (measurement)   |
| integrity-1            | C    | **verified here**            |
| cleanup-1              | C    | **verified here**            |
| cleanup-2              | C    | **verified here**            |
| (consolidator-derived) | C    | **verified here**            |

Two merges. No finding rejected. One pass null falsified (below).

**Verified here** means the consolidator reproduced the mechanical witness independently. **Attested** means the evidence is the pass's own and was not re-derived.

---

## Tier A

### A watched change during an in-flight `.css.ts` evaluation fails that module's request

**reviewer-1.**

**Current behaviour.** `watchChange` (`src/index.ts:258`) calls `discardGeneration()`, which calls `fail(current, …)` (`src/css/generation.ts:177`), which rejects **every pending request** with `CSS evaluation generation was discarded` before disposing.

**Why it is a problem.** TE-D13 specifies pending-request rejection for _worker failure_. Ordinary watch invalidation is a different path, and one TE-D16 explicitly preserves — "build and development watch are untouched". A save landing while a `.css.ts` graph is being evaluated fails the dev-server request rather than superseding it.

**Evidence.** Reproduced directly against the built entry point:

```
baseline          : ok
concurrent-discard: REJECTED: CSS evaluation generation was discarded
```

`evaluate(file)` alone resolves; the same call with `discardGeneration()` fired while it is in flight rejects. `reviewer` demonstrated the same end to end through a real Vite dev server.

**Required property.** An invalidation arriving during evaluation either supersedes the in-flight request or lets it settle against the generation it started in; a rejection surfaced to the consumer is reserved for the failure path that TE-D13 names.

**Routed.** Whether discard should abort or supersede is a contract choice the canonical document does not make. Not resolved here.

## Tier B

### The remeasurement TE-F35 owed falsifies both explanations TE-F35 offers

**reviewer-2.**

**Current behaviour.** TE-F35 keeps the design's Δ 5554 MiB as "an expectation", and puts two unestablished explanations on the table for the shipped run's larger figure: container load, and reclaimable page cache. It also states there is "far more" headroom on anonymous memory than the ~11 % on `memory.current`.

**Why it is a problem.** The record schedules a quiet-container remeasurement as an implementation-review obligation. `reviewer` ran it. It reproduces the implementation's figures almost exactly (Δ `memory.current` 7356 vs 7412; Δ anonymous 6618 vs 6685) at 66.20 s against 63.56 s — so container load does not explain the gap. Page cache cannot either: the anonymous delta alone (6618 MiB) exceeds the design pass's _total_ `memory.current` delta (5554 MiB). Measured headroom on the 13 107 MiB ceiling is 951 MiB — **7.3 %, less than the ~11 % the record calls the weaker figure**, not more.

**Evidence.** `reviewer`'s independent root run. **Reviewer-attested** — not re-derived at consolidation; a second whole-repository run was not taken.

**Required property.** Every explanation the record carries for the delta is either established or withdrawn, and the headroom comparison states the anonymous figure it says should have been required from the start.

**Not promoted for moving.** The binding acceptance signals are met. This is a finding about what the record asserts, not about the number.

### The Zed debug task runs zero tests, and demonstration 20 is discharged on evidence that cannot tell success from failure

**reviewer-3 + der-2.**

**Current behaviour.** `DEBUG=1` sets `ui: isDebug` (`.scripts/vitest-config.ts:181`) while `headless: true` (`:176`) and `contextOptions: { deviceScaleFactor: 1 }` (`:189`) are unconditional.

**Why it is a problem.** Playwright rejects the combination, so browser context creation fails and the task executes nothing. The implementation record discharges demonstration 20 — "reaches a breakpoint with the CDP port attached" — on the observation that the process exits on its own, which the error satisfies vacuously.

**Evidence.** Reproduced and causally isolated here:

```
Error: browser.newContext: "deviceScaleFactor" option is not supported with null "viewport"
Tests  no tests        Errors  1 error
```

and with a single option changed:

```
--browser.ui=false →  Test Files  1 passed (1)    Tests  5 passed (5)
```

**Pre-existing**, independently established by two passes and consistent with the range touching no browser option. It is in scope because the range edited this recipe and recorded a demonstration against it.

**Required property.** A demonstration is discharged only by evidence that distinguishes the behaviour it names from its failure.

**Found independently by `reviewer` and `der`, blind to each other.**

### `test-architecture.md` §CI policy describes a pull-request gate that does not exist

**der-5.**

**Current behaviour.** "Every pull request gates on: formatting, linting, typechecking; tproc node tests; behavior and accessibility browser tests…". The repository's only workflow is `.github/workflows/docs.yml`, on `push` to `main` plus `workflow_dispatch`.

**Why it is a problem.** A contributor reading the document relies on a safety net that will not run.

**Evidence.** `ls .github/workflows/` returns `docs.yml` alone; its trigger block is `push: branches: ['main']` and `workflow_dispatch`. Verified here.

**Re-scoped from the reporting pass.** `der` frames this as an obligation the implementing pass was given and left. There is no such obligation: the sentence appears in the **superseded** reconciled revision as _"whether to correct the CI-policy sentence in that pass is the owner's call"_, the canonical r4 document does not carry it at all, and the range added a Run lifecycle section without touching the CI prose. It is an owner call recorded once and never exercised — **not attributable to this range**. Tier is by consequence, not provenance, so B stands on the merits.

## Tier C

### The torn-down-project guard is unreachable, and one pass's null says otherwise

**reviewer-4 + der-3.**

**Current behaviour.** `#released` is written only in `#release`, called only from `onTestModuleStart`, reachable only after `#consumed = true` (`vitest-one-shot.ts:100`). The `#consumed` throw (`:49`) precedes the reuse check (`:62`).

**Why it is a problem.** The record credits two independent defences against re-execution. One can fire.

**Evidence.** Static trace verified here; `der` additionally drove the reporter through its own plugin and observed the one-shot message, never the torn-down one.

**Pass disagreement resolved on evidence.** `cleanup` returned an explicit null on this same file — "the reporter's defensive checks, all reachability-justified". That null is falsified for this check and narrows to the others. Two lenses reached opposite conclusions on one file while blind to each other; the evidence separates them, so this is reconciled rather than routed.

### `clean.extras` does not cover the chunk the new entry point creates

**der-4.**

**Current behaviour.** `files.json` gained `css/generation` as a runtime entry; `clean.extras` lists `format-*`, `transform-*`, `utils-*` and not `generation-*`. Three orphaned `generation-*.js` chunks (plus maps) are in the tree now.

**Evidence.** Verified here, including the escalation that does **not** hold: built `index.js` and `css/generation.js` both import `../generation-DrkXC8J5.js`, and `npm pack --dry-run` omits it — which would be a broken tarball, except the package is `"private": true`, so `files` is inert and nothing publishes. The same gap already applies to the pre-existing `format-*`/`transform-*`/`utils-*` chunks. Neither new nor consumer-visible.

**Required property.** Every hoisted chunk a declared entry point produces is removed by `clean:build`.

### `BROWSER_WORKERS = 2` states a ground this range retired

**der-1.**

**Current behaviour.** `.scripts/vitest-config.ts:20-22` carries revision 2's justification verbatim. That ground rests on TE-F4 retention — seven browser projects held at ≈1.26 GiB each — which TE-D12/TE-F33 retire inside this same range by releasing each provider at its group boundary.

**Evidence.** Comment text verified here. `der` measured `browser/drag2` at 15.26 s / 17.01 s (bound 2) against 12.33 s / 11.89 s (bound 4), identical results in all arms. **Der-attested** — the measurement was not re-run at consolidation.

**Routed.** Choosing a value needs the whole-repository run at bound 4 against the ceiling, which is reviewer-2's remeasurement plus one arm. **the worker-bound question.**

### The `$close()` citation points one line above the call

**integrity-1.**

`architect-test-execution-model-r4.md:244` cites `cli-api.BK8pd4xc.js:2492`. Verified against the installed bundle: `:2492` is the `forEach` that encloses the call; `orchestrator.$close()` is `:2493`. The sibling `provider.close()` citation at `:2488` is exact, and the mechanism as described is correct.

### `evaluate()` snapshots a dependency set nothing can observe changing

**cleanup-1.**

`generation.ts:191` returns `deps: new Set(generation.deps)`. Its sole caller (`index.ts:208`) destructures, iterates synchronously with no intervening `await`, and drops the reference. Verified here.

### The request counter is process-scoped for a per-generation use

**cleanup-2.**

`requests` is module-scope (`generation.ts:47`), but `pending` and the worker are both per-`Generation`, so an id is only ever resolved within the generation that issued it. Verified here.

### `zed-test.sh` declares `sh` and is not `sh`-compatible _(consolidator-derived)_

**consolidator-derived.**

**Current behaviour.** The shebang is `#!/usr/bin/env sh`. The script defines `cleanup-debug-processes()`, `run-vitest()` and `run-vitest-debug()` — hyphenated names bash accepts and POSIX `sh` does not.

**Evidence.** `sh -n .scripts/zed-test.sh` → `line 53: Syntax error: Bad function name`; `bash -n` parses. `sh` is `/usr/bin/dash` here. The implementation record documents the invocation as `.scripts/zed-test.sh <file> "" debug`, which via the shebang fails to parse before running anything.

**What the witness does and does not prove.** It proves dash cannot parse the script. It proves nothing about Zed, which invokes it as `"command": "bash"` (`.zed/tasks.json`) and is unaffected. That bound is why this is C and not higher: the real invocation path works, and the failure is immediate and loud rather than silent.

**Why it is here.** Two passes converged on "the Zed debug task is broken" and both reproduced it by running the script; neither observed that the declared interpreter cannot run it at all. That is a blind spot in a shared verification method, which is the narrow ground on which consolidation investigates.

---

## Routed — and since answered

Consolidation routed five items rather than deciding them. All five were answered by the architect at `0136aa67b` and `375a9c00e`, recorded here so the round closes against its own dispositions.

| Routed | Disposition |
| --- | --- |
| Where repository-level findings are registered | **`repo:RD-1`** — repository records get their own register and their own `RD-`/`RF-`/`RQ-`/`RI-` series; the bare series stay drag2's |
| Supersede or abort an in-flight evaluation (reviewer-1) | **TE-D17** — an invalidation arriving during evaluation supersedes the request; **TE-F36** records the current reject |
| TE-F35's standing with both explanations falsified (reviewer-2) | **TE-F37** — both explanations falsified; the memory expectation withdrawn |
| The browser page bound (der-1) | **TE-F39** — the stated ground was retired by this design |
| Whether der-5's owner call remains live | **`repo:RD-2`** — the pull-request gate is accepted policy whose implementation is owed, and stays open; **TE-F40** records the gap |

The tier A was routed as a contract choice and came back as one: TE-D17 decides supersession, which is the property the finding required without naming the remedy. The torn-down guard became **TE-F38**.

None of these were settled inside review, and none are settled here.

## What the round establishes

The load-bearing behaviour holds. `reviewer`'s teardown mutation probe is the sharpest result in the round: swapping `#release` to `browser.close()` produced **byte-identical log lines** while Chromium climbed monotonically 1→2→3→4 and the run hung after the second close, on two different project orderings — so TE-F33 is _stronger_ than the record claims, which records that hang as unreproduced. The shipped primitive oscillates with peak 2 across seven browser projects and returns to baseline.

Also clean, each established rather than assumed: project-list reordering changes nothing (resolved _and_ executed, 699 tests, same three closures in permuted order); 35/35 byte-identical CSS outputs three ways; the 123/88/29 dependency split reproduced including `tproc` built artefacts and JSON; no deps-snapshot delivery race across five trials; a rebuilt workspace artefact observed without a dev-server restart; `--reporter=dot` survival; the empty-run exemption; a second execution refused with zero modules started. TE-F34's constraint still has its cause, measured: at `--maxWorkers=11` the node group produces five failures against one at the shipped bound.

**The `tproc` failure is independently attributed and is not caused by this range** — identical assertion at `67af05288` from a separate worktree, `packages/tproc` unchanged for 416 commits and before the branch point. The "pre-existing" label was not inherited; it was re-derived.

**The forward elimination pass found no surviving machinery, because none was ever built.** No fan-out-era workaround, retry, timeout override or CI step survives. TE-D16's retirement inventory is fully discharged, and `allowExec: true` keeps a live cause (`cdp()` at three call sites in `input-policy.browser.test.ts`).

Two `cleanup` candidates were withdrawn on evidence and are recorded rather than dropped: the `import.meta.resolve` indirection is _required_, because Rolldown hoists shared code to a content-hashed chunk whose build-time location is not fixed; and the `settle()` disposal branch for a non-current generation is reachable, because the module-failure path demotes `current` without routing through `fail()` so in-flight requests can drain.

## Scope and silence, per lens

Each pass's silence is justified from its own lens question, not from what another pass covered.

- **reviewer** — falsification of the nine named properties by execution. Did not audit code discipline or record coherence outside the properties.
- **integrity** — coherence outside the change: entry-point manifest, public surface, retired-machinery references, group/one-shot conformance. Five explicit nulls. Separated a `@preact/signals-core` gap as out of range and unaffected rather than attaching it to this work.
- **cleanup** — machinery unjustified by responsibility, against `CONTRIBUTING.md` and `documentation.md` §5. Nulls on the generation state machine, `vitest-config.ts` group/worker machinery, the worker/deps-tracker rewrite, and comments across the diff.
- **der** — causal elimination. Two items explicitly unsettled with what would settle them: whether the surviving CDP-port `pkill` still has a cause (void until reviewer-3 + der-2 is fixed), and whether bound 4 fits the ceiling.

## The verification boundary

**Preserved by every pass.** No editor gesture was performed or simulated; demonstrations 13–15 are not reported as verified by anyone in this round. `reviewer` asked the adjacent question — whether the record states the boundary honestly — and found it stated in four places in r4 and unsoftened in the implementation record. The one adjacency is reviewer-3 + der-2: demonstration 20 is a _Zed_ task, inside the verifiable region, verified only in the half that cannot distinguish success from failure.

## Round hygiene

**Isolation held, and was checked rather than asserted.** All four passes ran mutation-capable work in their own detached worktrees. `reviewer` confirmed tracked content identical by tree object (`git write-tree` == `HEAD^{tree}`, `e31049753…`); `der` and `cleanup` confirmed `git status --porcelain` carrying only the untracked reviews directory; `integrity` confirmed via `--porcelain=2`.

**No pass committed or pushed.** This round's prompts made that a hard requirement, after the previous round saw three of four passes commit and push to the shared branch while siblings were still reading it. Every artifact reached this summary as an untracked working-tree file.

**One deviation.** `integrity` executed a live `vitest run` in the shared checkout rather than a worktree. It was read-only and left no tracked write, so the requirement held in substance — but "read-only" is a property of that invocation, not of running a suite in general, and the worktree is what makes it not need checking.

**One report-shape defect.** `cleanup`'s LSP line reads `unavailable` while its own parenthetical says the plugin was never probed. Those are different claims and the convention admits exactly one. Not a finding against the tree.

**Consolidation did not repair production code, settle an architectural question, or mint a `D-`.**