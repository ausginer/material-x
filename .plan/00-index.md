# Repository record — index

The register for records whose subject is **the repository** rather than one package. `packages/*/.plan/` holds a package's record; this holds the repository's, and the work directories beside it — `test-execution-1/`, `harness-guard-2/`, `ci-verification-1/`, `findings-1/`, `reviews/` — are its material.

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
2. **The pull-request workflow** running the suite §CI policy enumerates: formatting, linting, typechecking; `tproc` node tests; behaviour and accessibility browser tests; spec-contract browser tests; the curated Chromium visual suite. It uploads screenshot actual/diff artefacts on failure and never commits or approves a baseline. **Dated 2026-11-05:** it is a tracked route, so RD-3's reporter rule binds it: it passes or fails on the exit status, and its reporter list keeps a base-family reporter beside any machine-readable one. Vitest's default list under GitHub Actions already satisfies this.
3. **The branch rule** that makes the workflow a gate rather than a report.
4. **A baseline-maintenance policy** for what happens when the pinned image is upgraded, which is the recurring cost the environment creates.

**Resource facts the design must start from**, measured on the repository's own test-execution work and not to be re-derived: one whole-repository run needs roughly 6.6–7.4 GiB and 66–86 s, plus build time, and peaks near 10.4 GiB anonymous. A runner sized below that does not run this suite at all.

**Acceptance.** A pull request that fails any enumerated check cannot merge; the same pinned image runs locally and in CI and produces matching screenshots; no baseline is written by CI. Until all four deliverables hold, this entry is the statement of record that the gate does not exist.

**Amended 2026-11-16 by `RD-13`, on the owner's decision:** one pinned visual environment on GitHub's runner records and compares the screenshots, and no visual run is local. No baseline reaches a branch except through the owner's merge of a recording workflow's proposal, and the gate writes none. Deliverable 1's _"the same image must be runnable locally"_ no longer applies. The rest of the acceptance stands.

**Home when the work is taken:** a `.plan/` work directory of its own beside the others, holding the design for the image and the workflow. It is not created here, and nothing about the mechanism is designed here — this entry classifies the work and fixes its contract, and the unit that builds it is separate.

**Dated 2026-11-16: the work is taken.** Its home is [`ci-verification-1/`](ci-verification-1/ci-verification-design.md). `RD-6` is deliverable 2, and adds Firefox, Safari and Codecov to its list on the owner's requirements. `RD-7` takes size, allocation and speed checks out of the gate. `RD-8` handles the checks that fail today. `RD-9` is deliverables 1 and 4: the pinned environment is Playwright's locked Chromium and Roboto from a locked package, not a container image, so deliverable 1's _"container image fixing OS, …"_ is read as `RD-9` states. (Amended the same day. At `81d4c91b1`, this note said that `RD-6` met deliverable 1 by pinning the existing development image.) (Amended the same day by `RD-12`: the third engine is Safari on a macOS runner. This note said _"adds Firefox, WebKit and Codecov"_.) Deliverable 3 is the owner's. This entry's order, acceptance and statement of record stand: the gate does not exist until all four deliverables hold.

**Met 2026-11-16, recorded by the architect.** All four deliverables hold. Deliverables 1 and 4 are `RD-9`, and deliverable 2 is `RD-6`, both implemented by #27 (`275ad0f5c`), where `verify` passed on the push to `main` (run 43865448668). Deliverable 3: the owner added `verify` to the ruleset _Main protection_ as a required status check, read back through the API (see `RD-6`'s status). The acceptance as `RD-13` amended it holds: a pull request whose `verify` fails can't merge, the runner records and compares the screenshots, and no baseline reaches a branch except through the owner's merge of a proposal. **The gate exists,** and this entry's statement of record ends.

#### RD-3 — Every project the shared factory declares sets `extends: false`

**Decided 2026-11-05** ([`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §35.4). **Implemented at `45ccefa4b`, in `assignGroupOrder`, the funnel every config passes through, and verified at `c15042847`** (§36.1).

**Since Vitest 5 an inline project extends the config file that declares it by default.** Each project then re-evaluates that file, and so `.scripts/vitest-one-shot.ts`. In a root run, whose top level carries the plugin, each project gains a reporter of a new class, and TE-D15's `instanceof` guard misses. The result is 17 reporters and 17 concurrent closes of one provider per boundary, which raises the reporter error RF-26 records.

**The factory gives each project its whole configuration,** so a project has nothing to inherit. This restores what these projects do at Vitest 4, and it keeps TE-D15's _installation is idempotent_ and TE-D12's single release true without a second mechanism.

**Refused:** guarding by class name or a global brand, and remembering closed providers, because both leave the re-evaluation and the inheritance in place. Catching the rejection in `release` is refused by TE-D12: a provider that really fails to close stays loud.

**A Vitest upgrade re-reads this.** No row watches it. The reading is `MX_TEST_TEARDOWN_LOG=1` on a root run: one line per browser project at its boundary.

**What _stays loud_ means** (§36.4). A provider rejecting its close at a group boundary gives exit 1 under every reporter read. It prints under Vitest's base reporter family, which every tracked route uses. **A run with no base-family reporter is an accepted limit:** it can give the exit status with no printed explanation, and `json` can read `success: true` beside exit 1. This is Vitest's handling of unhandled errors, which the repository does not repair for one of them. So a tracked route keeps a base-family reporter and reads the exit status (`test-architecture.md` §Run lifecycle).

**Not forced:** a close failure in the final group, which Vitest's pool closes rather than `release`. It is read at 5.0.5 and no more.

#### RD-4 — A project's global setup hands a foreseeable failure to that project's files

**Decided 2026-11-05** ([`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §35.6). **Implemented at `c95212956` and verified at `c15042847`** (§36.1). `drag2`'s `build-package.node.ts` is the one setup that does this, and `DRAG2_NODE_BUILD` hands a config it and `require-build.node.ts` as one value.

**A global setup does not throw for a failure it can foresee, such as a build failing. It provides the failure to its project, and a setup file in that project raises it.** That project's files go red with the failure's own message, and every other project's results stand. **A browser project that imports the same broken source fails on its own import.** That is its own result and not this mechanism: in a whole root run with a broken `src/drag.ts`, 7 of `drag2`'s browser files went red beside its 26 node files, and all 85 files of the other six packages matched a clean run.

**Why.** Vitest awaits global setups outside the `try` around the pool, for every project in series, so a throw ends the run for all of them. At 5.0.5 it also reports _No test files found_ and loses its own message to a `TypeError`. `just test` exists to report the repository in one process. TE-D15's refusals end a run because the process's contract is broken, and one package's syntax error does not break it.

**The whole project goes red rather than the files known to read the output,** so that no later reader can forget to check.

**The limit is accepted.** A throw the setup cannot foresee, such as its own import failing, still ends the run with exit 1. A setup cannot catch that, and failing closed is enough.

#### RD-5 — The record resolver is repository tooling, and a retired scope resolves at its final commit

**Decided 2026-11-15** by the architect, on the owner's decision to delete `@ydinjs/drag2` (`drag:DRO-17`, `drag:DRD-64`). **Unimplemented:** [`drag2-retirement-handoff.md`](../packages/drag/.plan/drag2-retirement-handoff.md) item 3 implements it.

**The resolver moves to `.scripts/entry.sh` and `.scripts/entry.ts`, with the same address syntax and the same three refusals.** It resolves `repo` and `drag` from the working tree. **`drag2` becomes a retired scope, read at `0870abd75` and never from the working tree.** Its current-state documents are what they were: `.plan/contract/*.md` and `.plan/obligations.md`. A `drag2:` address resolves to the bytes it resolved to at that commit. A clone that doesn't hold the commit gets an error that names it. That error differs from the three refusals, because its repair is fetching history and not correcting the address.

**The bare `D-`, `F-`, `Q-` and `I-` series stay closed to every other scope** (`RD-1`). They are retired with drag2's register, and no scope allocates them again. A retired series that some scope reused would make a `drag2:` citation ambiguous.

**Why the resolver moves, and why it isn't deleted with drag2.** It already resolves `repo` and `drag`. Outside drag2, 13 files cite 16 `drag2:` addresses, and 159 record files name drag2 about 1,900 times, mostly by path. So the resolver is repository tooling that lives in drag2 for historical reasons. Deleting it would leave `CONTRIBUTING.md` §Reading one entry of a record with no tool to name.

**Why a retired scope reads a commit and doesn't refuse.** Its record no longer changes, so one commit holds all of it, and `0870abd75` is on `main`, which keeps it reachable. A refusal would turn every `drag2:` citation into one that only someone who knows the commit can follow. Reading at the commit costs one row and two `git` calls. A copy of the register in the tree was rejected: it keeps 1.6 MB of a deleted package as a second current-state copy, which `documentation.md` §1 rules out.

**The resolver keeps its own entry reading.** It was shared with `tests/ledger.ts` so that drag2's record tests and the resolver read an entry the same way. Those tests leave with drag2, so the resolver is the one reader, and the reading is the `####` heading and the `#{1,4}` terminator that `CONTRIBUTING.md` states.

**Withdrawn with drag2, in the instruments' terms:**

- `references.node.test.ts`: citations in drag2's normative tree resolve.
- `decisions.node.test.ts`: drag2's register is complete, unique, and consistent with its status table.
- `coverage.node.test.ts` and `docs.node.test.ts`: drag2's coverage ledger and its documentation rows.
- `.scripts/decision-status.ts` and `.scripts/corpus-equivalence.ts`: drag2's status projection and its corpus check.

Each one checked only drag2's record, which is frozen at `0870abd75`. The checks they ran there stand as their last result, and nothing in the tree has the property any longer. **No other record had these checks.** `repo` and `drag` keep only the resolver's duplicate refusal. Links in Markdown outside drag2 had no instrument before, and have none now (`documentation.md` §7).

**Consequences carried elsewhere,** all in the handoff's item 2: `CONTRIBUTING.md` §Reading one entry of a record, `documentation.md` §7 and §9, `handoff.md` §Markdown, `agent-workflow.md`, `review-findings.md` and `coordinator.md`. `RD-4` holds through drag's `DRAG_NODE_BUILD`, the same mechanism with drag's build. Its text, which names drag2's setup as the only one, isn't rewritten.

#### RD-6 — One workflow verifies every push to `main` and every ready pull request, in Chromium, Firefox and Safari on named runners, and one aggregate check gates merge

**Decided 2026-11-16 by the architect** on `ci/verification` at `a8726c57d`, on the owner's requirements relayed by the coordinator the same day ([design](ci-verification-1/ci-verification-design.md) §1, O1 to O8). **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it. It is `RD-2`'s deliverable 2, and it prepares deliverable 3, which the owner performs. Deliverable 1 is `RD-9`.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668. **The branch rule is on:** on 2026-11-16 the owner added `verify` from GitHub Actions as a required status check to the ruleset _Main protection_ (20963220), active on the default branch with no bypass actor, read back by the architect through the API. The ruleset also requires the branch to be up to date with `main`, which the [design](ci-verification-1/ci-verification-design.md) §5 step 5 called unnecessary; that is the owner's choice.

**Amended 2026-11-16, before implementation,** on the owner's direction relayed by the coordinator at `81d4c91b1` (O9 and O10 in the design): CI runs on a plain runner and doesn't pull the development image, and Chromium is Playwright's build. The title, property 2, property 4's third sentence, and the reasons about the image changed. What it said before is at the end.

**Amended 2026-11-16 by `RD-12`,** on the owner's correction (O13): the third engine is Safari on a macOS runner, not Playwright's WebKit. The title, properties 2, 3, 4, 6, 7 and 8, and two reasons changed. `RD-12` holds the readings, the provider and the reasons. What they said before is at the end.

**Amended 2026-11-17 by `RD-14`,** on the owner's answer to the findings unit's question 2, relayed by the coordinator: the docs build is a gate job. Properties 3, 8 and 9 changed. `RD-14` holds the reasons, and the [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) implements it. What they said before is at the end. **Unimplemented** until that handoff's pull request merges.

**Properties.**

1. **Triggers (O1).** A push to `main`; a `pull_request` event of type `opened`, `reopened`, `synchronize` or `ready_for_review`; and `workflow_dispatch`. Every job skips a draft pull request. No other trigger, and no `pull_request_target`. A newer run for the same pull request cancels the older one. A run for a push to `main` is never cancelled.
2. **The environment (O9, O13).** Every job except `safari` runs on a GitHub-hosted runner named `ubuntu-24.04`, and `safari` runs on `macos-26` (`RD-12` property 6). Each label is named, not `*-latest`, so an operating system changes only by an edit. Each job uses the Node major version that the workflow names. **CI doesn't pull the development image, and no job runs in a container.** Chromium and Firefox are the builds that the exact `playwright` dependency pins (`RD-9`), and a job installs its engine with `npx playwright install --with-deps <engine>`. Safari is the runner image's own and isn't pinned (`RD-12` property 7). Screenshots are reproducible because of `RD-9`'s pinned visual environment, not because of the runner's operating system.
3. **The gate jobs.** `static` runs the root `just fmt-check`, `just lint` and `just typecheck`. `chromium` runs the root suite, with every project, including node, declaration and visual. `firefox` and `safari` run every browser project except visual in their engine. `docs` runs the root `just docs-build`, loads the built site with `just docs-smoke`, and uploads the Pages artifact (`RD-14`). **The three test jobs exclude `measurement` rows (`RD-7`).** Every job runs the repository's own recipes on a fresh checkout after `npm ci`. If a recipe needs a step that a developer's tree happens to satisfy, the recipe is repaired. The workflow adds no private step.
4. **One engine selection (O2).** `MX_TEST_ENGINES`, a comma-separated list of `chromium`, `firefox` and `safari`, read by the shared factory in `.scripts/vitest-config.ts`. It defaults to `chromium`. Each browser project except visual is declared once per listed engine. A Chromium project keeps its name, and another engine's project is named `<name>/<engine>`. A non-Chromium project takes no Chromium launch arguments, and runs with `fileParallelism: false` and one worker, because a background page gets no input in those engines. A Safari project uses the WebdriverIO provider (`RD-12` properties 2 and 3). **It replaces `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`.** drag's `test-engines` recipe keeps its name and runs drag's browser and shipped projects in the engines that the variable lists. A local run is Chromium only (`RD-13` property 7).
5. **Visual runs in Chromium only.** Its baselines are per engine and platform, and only Chromium baselines exist. **The gate never writes, updates or approves a baseline.** The recording workflow proposes baselines in a pull request that the owner merges (`RD-13`). When `chromium` fails, the actual and diff images are uploaded as a workflow artifact.
6. **A row that needs an instrument that an engine's driver doesn't provide** runs only in the engines that provide it, by an engine condition, as drag's `isChromium` rows do. Chromium-only instruments are the DevTools Protocol, heap snapshots and `--expose-gc`. Safari's driver also lacks media emulation (`RD-12` properties 4 and 5). That limits the row's scope and doesn't disable it, so `RD-8` doesn't apply to it.
7. **Coverage (O4).** `chromium` runs with V8 coverage and uploads it to Codecov on every run. A failed upload fails the job. Codecov's project and patch statuses are `informational`, so a percentage never blocks a merge. Firefox and Safari contribute no coverage, because the V8 provider cannot instrument them.
8. **The aggregate check.** `verify` needs `static`, `chromium`, `firefox`, `safari` and `docs`, and succeeds only if each succeeded. **It is the one check the branch rule requires,** so adding or splitting a job changes `verify`'s list and not the rule. A job not in `verify`'s list cannot block a merge.
9. **Permissions.** The workflow's token is `contents: read`. Only the measurement job adds `pull-requests: write` (`RD-7`), and only `deploy`, which runs for `main` alone, adds `pages: write` and `id-token: write` (`RD-14`). A third-party action is pinned to a full commit hash.

**Why.**

- **One aggregate check** keeps the branch rule stable while jobs change, and it makes a skipped or missing job a failure of `verify` instead of a check nobody required.
- **Plain runners, not a container,** on the owner's direction. The Linux jobs share one operating system, one Node version and one lockfile per run, so the only difference between `chromium` and `firefox` is the engine. `safari` also differs in operating system, because Safari exists only on macOS (`RD-12`). Playwright's installer adds each Linux engine's system libraries on the runner.
- **Playwright's build for Chromium and Firefox:** one exact dependency pins both, in the devcontainer and in CI (`RD-9`). Safari can't be pinned (`RD-12` property 7).
- **One engine selection, not a second mechanism.** drag's engines configuration is the same property for one package. Generalized, it serves every package, and drag's names survive (CONTRIBUTING §6).
- **Coverage from Chromium only** is a limit of V8 coverage, not a choice.

**Not adopted.**

- **Running the jobs in the development image,** which this decision first adopted. The owner's direction rules it out. `RD-9`'s reading also shows that the image cannot pin Chrome.
- **Playwright's own container image.** Its version would have to follow the lockfile in a second place.
- **Istanbul coverage in every engine.** It runs instrumented code instead of the code under test in every engine, and O4 needs only one coverage source, which Chromium already provides.
- **Firefox and Safari visual baselines.** That is a new curated set with its own maintenance cost, which the owner hasn't asked for.

**What this amends.**

- **`.agents/docs/test-architecture.md` §CI policy,** in place in the same commit. Before: _"Scheduled or manual jobs may add the full visual state matrix, dark/contrast theme expansion, Firefox/WebKit behavior checks, RTL/zoom/forced-colors/reduced-motion resilience, and targeted accessibility-tree or manual AT validation."_ Firefox and WebKit behavior and spec-contract checks move into the pull-request gate. The other scheduled or manual items stay where they were. §What screenshots prove keeps its rule: broader visual runs stay scheduled or manual.
- **`RD-2` deliverable 2's list** gains Firefox and WebKit behavior and spec-contract tests and the Codecov upload. Its order, its acceptance and its other deliverables stand.
- **`drag:DRO-18`'s open question** ("whether that job is owed under `repo:RD-2`") is answered: it is.

**What it said before the amendment.**

- The title said _"in the pinned image and three engines"_.
- Property 2 said: _"**The pinned environment (`RD-2` deliverable 1, O7).** Every job runs in `ghcr.io/ausginer/devimages/node@sha256:<digest>`, the image the devcontainer runs at this decision, which recorded the committed baselines. `.devcontainer/devcontainer.json` names the same digest, so local and CI runs use one image. A `repo` node test asserts that the two files name the same digest. The image changes only under `RD-9`."_
- Property 4 said: _"A non-Chromium project uses Playwright's own build of its engine, without the Chromium executable or Chromium launch arguments"_.
- The reasons said that every job in the pinned image shares one operating system, and that the existing image is pinned because it recorded the 23 baselines. Not adopted said that running Firefox and WebKit on a plain runner with `playwright install --with-deps` would give each job its own operating system and Node version.
- **Why it changed:** the owner's direction, and `RD-9`'s reading that the image's Chrome feature ignores its version option.

**What it said before `RD-12`.**

- The title said _"in three engines on a pinned runner"_.
- Property 2 said that every job runs on `ubuntu-24.04`, and that _"Every engine is the build that the exact `playwright` dependency pins, Chromium included (`RD-9`)."_
- Property 3 named the jobs `firefox` and `webkit`. Property 7 said _"Firefox and WebKit contribute no coverage"_. Property 8 named `webkit` in `verify`'s list.
- Property 4 listed `chromium`, `firefox` and `webkit`, and said: _"drag's `test-engines` recipe keeps its name and its project names (`browser`, `browser/firefox`, `shipped/webkit`…), so `drag:DRO-18`'s commands still select the same projects."_
- Property 6 said: _"**A row that needs a Chromium-only instrument** (the DevTools Protocol, heap snapshots, `--expose-gc`) runs only in Chromium, by an engine condition, as drag's `isChromium` rows do."_
- The reasons said: _"The jobs still share one operating system, one Node version and one lockfile per run, so the only difference between engine jobs is the engine. Playwright's installer adds each engine's system libraries on the runner, so `DRO-18`'s local decision is unchanged."_ and _"**Playwright's build for every engine:** one exact dependency pins all three browsers, in the devcontainer and in CI (`RD-9`)."_
- **Why it changed:** the owner's correction (O13), which `RD-12` decides.

**What it said before `RD-14`'s amendment of 2026-11-17.**

- Property 3 named no `docs` job.
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox` and `safari`"_.
- Property 9 said: _"Only the measurement job adds `pull-requests: write` (`RD-7`)."_
- **Why it changed:** the owner's answer to the findings unit's question 2, which `RD-14` decides.

**What it said before `RD-13`.** Property 4 said: _"drag's `test-engines` recipe keeps its name and runs `chromium,firefox`, so its project names are `browser`, `browser/firefox`, `shipped` and `shipped/firefox`, which are `drag:DRO-18`'s selection. A local `just test` without the variable runs Chromium only, as it does today."_ Property 5 said: _"CI never writes, updates or approves a baseline."_ **Why it changed:** the owner's decisions (O14, O15), which `RD-13` decides.

#### RD-7 — Size, allocation and speed checks notify and never fail the build

**Decided 2026-11-16 by the architect,** on O5 and O6 ([design](ci-verification-1/ci-verification-design.md) §1). **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**Properties.**

1. **What a measurement row is.** A row whose verdict compares a quantity with a budget, a ceiling or a control figure: bytes of a bundle, bytes allocated, or time elapsed. **A row that asserts behavior is not a measurement,** even if it counts. Examples are a retention check (_should not retain …_) and a deterministic work count that a contract invariant states, such as `drag:DRI-17`'s layout reads and spatial searches. Those rows stay in the gate.
2. **Marking.** Each measurement row carries the Vitest tag `measurement`, which the shared factory declares. The gate's test jobs run with that tag filtered out. The measurement job runs only that tag. **A local `just test` runs every row, as it does today,** so `drag:DRD-68` property 5 stays true where it is stated: an over-ceiling row fails `npx just test` until the unit re-bases.
3. **The rows at this decision.** In `packages/drag/tests/size.node.test.ts`, each composition's ceiling and control verdict. Its graph verdict (`present`, `absent`) is `drag:DRI-18`'s and stays in the gate, so each composition's row splits into a graph row and a ceiling row. The assertions themselves don't change. In `packages/drag/tests/hot-path.browser.test.ts`, the two rows that bound bytes allocated per sample. **No speed row exists.** The implementer confirms there are no others.
4. **The measurement job is outside the gate.** `verify` doesn't need it. It concludes successfully whenever it ran to its report. An exceeded ceiling or a failing measurement row becomes a warning annotation and a line in the report, never a failed step. `continue-on-error` covers a crash, so even a broken measurement can't fail the workflow.
5. **The size comment (O5).** It reports every row that the root `just size` measures (`box-quad` and `core` through size-limit, `drag` through `bench/size/measure.ts`): the reading at the head, the reading at the merge base of the head and the pull request's base branch, the difference, and the row's limit at the head. Brotli for every row, and gzip where the instrument reports it. Rows that exist at one side only are marked added or removed. **Both sides are measured in the same job, on the same runner, each tree with its own instruments.** (Before the amendment of 2026-11-16, which changed only these words: _"in the same image"_.) A base tree whose instruments cannot produce the machine-readable reading gives "no base reading", and the head is still reported. The comment is one per pull request, identified by a hidden marker and updated on each run. It is posted only when the pull request comes from this repository. Otherwise, and on a push or a manual run, the report goes to the job summary only.
6. **The allocation result** is reported in the same comment and summary as each row's pass or fail, with its message.

**Why.**

- **A tag separates the rows without moving files,** and drag's size file holds graph rows that must keep gating. A separate project or file suffix would split `size.node.test.ts` across two files for the same compositions.
- **Locally nothing changes.** `DRD-68` makes an over-ceiling row stop a drag unit before release. That is a rule about drag's units, which run locally. CI notifies, as O6 asks.
- **The merge base, not the base branch's tip,** because the comment reports what this pull request changes, not what landed on `main` meanwhile.
- **Measuring both sides in one job** depends on no artifact from an earlier run, which can be missing or expired.

**Not adopted.**

- **Speed checks on shared runners.** None exists, and a timing reading on a shared runner tells little. A later speed check enters CI as a measurement row or a step of the measurement job, under this decision.
- **`pull_request_target` for fork comments.** It runs with write access next to the fork's code.

**What this doesn't decide.** What governs drag's ceilings after release (`drag:DRD-68` property 6). If that rule makes a ceiling gate in CI, it amends this decision.

#### RD-8 — A check that fails today is repaired or disabled before the branch rule is on, and each disabled row is a registered finding

**Decided 2026-11-16 by the architect,** on O3 and O8 ([design](ci-verification-1/ci-verification-design.md) §1). **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668. **The branch rule is on:** on 2026-11-16 the owner added `verify` from GitHub Actions as a required status check to the ruleset _Main protection_ (20963220), active on the default branch with no bypass actor, read back by the architect through the API. The ruleset also requires the branch to be up to date with `main`, which the [design](ci-verification-1/ci-verification-design.md) §5 step 5 called unnecessary; that is the owner's choice.

**The reading at `a8726c57d`,** taken by the architect on 2026-11-16 in the devcontainer. The output is not committed: each item below has to be read again at the unit's base anyway.

- **Root `vitest run`, Chromium:** 136 files and 1,833 tests. One row fails: `tproc`, `TokenPackageProcessor` _should apply inheritance and render declarations_, expected `container.color` and received only `state-layer.opacity`. That is `RF-29`'s first row, unchanged. `RF-29`'s `radio.visual` row passed in this run, and its `drag2` row left with drag2. Exit 1. Duration: 291 s on a loaded machine.
- **Root `just typecheck`:** exit 0.
- **Root `just fmt-check`:** exit 1. `box-quad`, 2 files; `drag`, 57 files; `material-x`, 5 files. The `box-quad` and `drag` files are tracked record files under `.plan/` (measurement JSON and probe sources). The `material-x` files are generated `main.styles.css` files, which a fresh checkout doesn't contain. **Corrected 2026-11-16 by the unit's report:** they are tracked, authored CSS under `src/`. The unit formatted them, and the build output didn't change.
- **Root `just lint`:** exit 1 in all eight packages. Where oxlint fails, the recipe stops before ESLint, so the count is a lower bound. Examples: `core`, 3 ESLint errors; `tproc`, 3; `box-quad`, 9; `size-limit-preset-rolldown`, 2; `vite-custom-element-assets`, `RF-32`'s oxlint errors; `drag`, mostly `.plan/probes/size-acceptance-cleanup/placement.ts`.
- **Firefox and WebKit outside drag:** never run. WebKit can't run locally (`DRO-18`).

**Properties.**

1. **The inventory comes first.** The unit reads every failing row and check in each gate job, at its own base: Chromium and Firefox locally; Safari, and the visual result on CI's operating system, in CI. A row counts as intermittent if it both fails and passes in five runs of its file.
2. **Repair** when the cause is in the test, the test infrastructure or repository tooling, and the repair changes no product behavior, no public surface and no decided contract. Lint repairs follow `RF-32`'s required property: no rule turned off, no disable comment, and runtime names kept where another library reads them.
3. **The record is not source.** A file under a `.plan/` directory is evidence: a probe's source is what ran, and a tool's output is what the tool wrote. **Lint doesn't read `.plan/`,** because a lint repair would change what ran. **Formatting does read it,** because formatting changes no data. Each unit already owes `fmt` for each file it adds, so the record's unformatted files are repaired by formatting them.
4. **Disable** in every other case, and only in the engine where the row fails. A row that always fails is marked as an expected failure (Vitest `fails`), so a later repair shows up as a failure. An intermittent row is skipped. **Each disabled row is a finding** in the register of the scope that owns it (`drag` for drag, `repo` for everything else), with the row, the engine, the failure, the cause if it was established, and the required property. The marking cites that finding's address. A product cause is routed as its own unit, which the owner orders. The CI unit doesn't change product source.
5. **Stops.** The unit returns to the architect with its inventory if: a file or a whole project cannot load in an engine; more than 15 rows would be disabled in one engine; a row fails only with coverage enabled; CI does not reproduce the baselines that `RD-9` property 5 re-records, or the visual suite turns intermittent in CI, which the owner decides (`RD-9` property 4); or a repair would need a rule turned off, a disable comment or a changed runtime name. **A baseline is never rewritten to make CI pass.**

**Amended 2026-11-16, before implementation,** with `RD-6`. Two phrases changed. Property 1 said _"WebKit and the pinned image's visual result in CI"_, and property 5 said _"the visual suite does not reproduce the committed baselines in the pinned image in CI"_. 6. **The branch rule is turned on after this decision's repairs and disabled rows are on `main`,** and `verify` has passed there (O8).

**Why.**

- **Repair inside the unit only when the cause is the tests or the tooling.** That is the repair the owner prefers, and it fits a verification unit. A product defect in one engine is the product's change, with its own review.
- **An expected failure, not a skip, for a row that always fails:** a skip stays silent when the defect is repaired, and an expected failure doesn't.
- **A finding for each disabled row,** because a disabled row with no registered owner is a gap that nobody tracks.
- **The stops** are where the inventory stops being a list of small repairs and becomes a question about the design.

**What this answers.** `RF-29`: the unit reads its rows again and handles each one under this decision. `RF-32`: the unit repairs it, as part of property 2's lint repairs, instead of the separate cleanup unit it was routed to.

**Dated 2026-11-16:** the unit stopped under property 5 on 108 `camelcase` errors on names that another program reads ([report](ci-verification-1/ci-verification-report.md) §The stop). `RD-10` decides how those names pass lint. Property 2's _"runtime names kept where another library reads them"_ is met through `RD-10`, and property 5's stop still applies to every other name. **Dated 2026-11-16:** the unit stopped again on three ESLint errors on public types, and `RD-11` decides them. **Amended 2026-11-16 by `RD-12`:** property 1 said _"WebKit, and the visual result on CI's operating system, in CI"_. The third engine is Safari, read in CI.

#### RD-9 — The pinned visual environment is Playwright's locked Chromium and Roboto from a locked package, and it changes only in a pull request that re-records the baselines

**Decided 2026-11-16 by the architect.** This is `RD-2` deliverables 1 and 4. **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it. **Amended 2026-11-16, before implementation,** on the owner's direction relayed by the coordinator at `81d4c91b1` (O9 to O12 in the design). The owner settled each point: CI runs on a plain runner, Chromium is Playwright's, text renders in Roboto from a locked package, and nothing more is guarded in advance. The decision was rewritten. What it said before is at the end.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**The readings,** taken by the architect on 2026-11-16 at `81d4c91b1`.

- **The development image can't pin Chrome as it is built.** It is built in the public repository `ausginer/devimages` (`images/node/.devcontainer/devcontainer.json`) from `node:slim`, with the feature `ghcr.io/kreemer/features/chrometesting:1` at `version: "Stable"`. That feature's `install.sh` reads `VERSION` and never uses it: it always downloads the Stable channel's last known good build. The image's Chrome is whatever was Stable on the day of the build: 157.0.8103.38 in the current container, which recorded the baselines. (**Corrected 2026-11-16 by the unit's report:** there are 19 baselines, not 23. The architect's count included directories.)
- **Playwright 1.65.0** is an exact dependency in the root `package.json` and the lockfile. It pins Chromium 158.0.8127.18 (Chrome for Testing, revision 1254), Firefox 159.0 (1572) and WebKit 27.2 (2388).
- **The visual fixtures' text** is set by `packages/material-x/tests/support/browser-setup.ts` to `Arial, "Liberation Sans", sans-serif`. Arial isn't installed, and the owner installed no fonts. Fontconfig resolves the stack to Debian's `fonts-liberation` 2.1.5, which is installed as one of Chrome's dependencies. So today's baselines depend on a system font. **The icon font is already vendored** (`tests/support/fonts/material-symbols-subset.ttf`).
- **The devcontainer runs Debian 13. CI's runner runs Ubuntu 24.04.**

**Properties.**

1. **Chromium is Playwright's build** at the version that the exact `playwright` dependency pins, in the devcontainer and in CI, as Firefox already is (O10). It runs as the full Chromium build in Chrome's new headless mode, not as `chromium-headless-shell`. `CHROME_EXECUTABLE` and the `/usr/local/bin/chrome` default are removed, so the image's Chrome takes no part in a test run. The devcontainer installs the locked Chromium build when the container is created and each time it starts, and no other browser (`RD-13` property 7). CI installs Chromium and Firefox. No Playwright WebKit build is installed anywhere, and Safari runs only in CI (`RD-12`).
2. **Visual tests render text in Roboto only (O11).** Roboto's faces come from an npm package that ships the font files, added as an exact dependency so the lockfile pins it. The faces the fixtures use are loaded as web fonts and awaited before the first fixture renders, so a face that fails to load fails the run. The font stacks in `browser-setup.ts` name Roboto and no other text family, and no system font is named as a fallback. The icon font stays as it is.
3. **Fixed in the test configuration, as now:** headless mode, device scale, viewport, and colour scheme.
4. **The runner records and compares (O14).** Baselines are recorded and compared on GitHub's `ubuntu-24.04` runner only (`RD-13`). The runner image's version, its system libraries and fontconfig settings, the processor, and the Node patch version are not pinned, and nothing checks in advance that they stay out of a screenshot (O12). **If the visual suite fails or turns intermittent in CI, the unit stops and the owner decides** (`RD-8` property 5).
5. **The baselines are re-recorded in the first unit,** after properties 1 and 2 land. Chromium moves from 157.0.8103.38 to 158.0.8127.18 and the text font becomes Roboto, so every baseline with text changes. The devcontainer's recording at that point didn't reproduce on the runner (`RD-13`'s reading). **The recording workflow records them again on the runner,** and proposes them into `ci/verification`. **The owner reviews every changed baseline and merges the proposal before the unit's pull request merges.** The gate then has to reproduce them.
6. **Changing the environment.** A change to the `playwright` version or to the Roboto package's version is made in its own pull request. Its baselines are recorded by the recording workflow on that pull request, and the owner merges the proposal into it. That pull request changes nothing else apart from `package.json` and the lockfile. Its CI run verifies the re-recorded baselines. A runner image update that changes a rendering is recorded the same way, through a proposal into `main`. A dependency update leaves `playwright` and the Roboto package where they are.

**Why.**

- **Playwright's Chromium** (the owner's hypothesis, then direction): one exact dependency pins all three engines, one command installs them in both places, and they move only with a visible edit to `package.json`. The image cannot pin Chrome as it is built. A Chrome for Testing version downloaded by a repository script would be a second pin mechanism beside the lockfile.
- **The cost is accepted.** Updating Playwright updates Chromium, so a Playwright update means re-recording the baselines. Property 6 makes the update deliberate.
- **Roboto from a locked package** takes the text font out of the operating system, which was the open point about fonts. The lockfile pins it as it pins Chromium.
- **No advance guard on rendering settings or the operating system,** on the owner's direction. CI reproducing baselines recorded in the Debian devcontainer is the evidence, and a failure there is the owner's to decide.
- **The full build in new headless mode,** because that is how the current baselines were recorded and it is the browser that users run. The headless shell is a separate implementation.

**Not adopted.**

- **The development image pinned by digest,** which this decision first relied on. The owner's direction rules it out, and the image's Chrome is whatever was Stable on the day it was built.
- **A Chrome for Testing version pinned in a repository file.** It works, but it is a second pin mechanism.
- **Vendoring Liberation Sans, a repository fontconfig configuration, a check that every glyph comes from a web font, and a check of the Chromium version that recorded the baselines.** The architect proposed these during the amendment. The owner chose Roboto and no advance guards.

**What this amends.** `test-architecture.md` §What screenshots prove, in the same commit. It said: _"Screenshots are valid only for a pinned environment (OS/container image, Chromium version, headless mode, device scale/viewport, fonts/icons, color scheme/theme, GPU config where it matters). The ordinary PR gate must use one pinned Chromium environment, and local runs must use the same pinned image so developer output matches CI — the image is owed rather than installed (`repo:RD-2`), so until it lands a baseline is only as reproducible as the container that wrote it."_ The operating system and the container image leave the pinned environment. `RD-2` deliverable 1's _"container image fixing OS, Chromium, fonts and icons"_ is read as this decision states it, and its acceptance's _"the same pinned image"_ becomes the same pinned Chromium and fonts.

**Amended 2026-11-16 by `RD-12`:** property 1 said _"as Firefox and WebKit already are (O10)"_ and _"WebKit stays out of local development (`drag:DRO-18`)"_.

**Amended 2026-11-16 by `RD-13`,** on the owner's decisions (O14, O15). Property 1 said: _"The devcontainer installs the locked Chromium and Firefox builds when the container is created and each time it starts."_ Property 4 said: _"**Not pinned and not guarded (O12):** the operating system, its system libraries and fontconfig settings, the Node version, and the development image."_ Property 5 said: _"The re-recording happens in the devcontainer with the explicit update command, in a commit that changes only the baselines. **The owner reviews every changed baseline before the pull request merges.** CI then has to reproduce them."_ Property 6 said: _"That pull request re-records every baseline the change affects … Its CI run verifies the re-recorded baselines, and the owner reviews every changed baseline before merging."_ The reason _"CI reproducing baselines recorded in the Debian devcontainer is the evidence"_ no longer holds: CI didn't reproduce them.

**What it said before the amendment.** Title: _"The pinned image changes only in a pull request that re-records its baselines and changes nothing else"_. It was `RD-2` deliverable 4 only. Its properties were: a pull request that changes the image digest changes it in `.devcontainer/devcontainer.json` and the workflow together, re-records inside the new image every baseline the image changes, and changes no other file; its CI run verifies them, and the owner reviews every changed baseline; a developer whose container predates the digest rebuilds it. **Why it changed:** the owner's direction and the image reading above.

#### RD-10 — A name that another program defines passes `camelcase` through an exact allow list, and the rule stays on for every other name

**Decided 2026-11-16 by the architect** on `ci/verification` at `c2dbf6292`, on the CI verification unit's stop under `RD-8` property 5 ([report](ci-verification-1/ci-verification-report.md) §The stop). It amends `RD-8` property 2 and `RF-32`'s required property for these names only. **Unimplemented:** the [handoff](ci-verification-1/ci-verification-handoff.md)'s item 5 implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**The reading** (the report's `checks/lint-inventory.txt`, at `33fc22dce`). Of 142 lint errors, 108 are `camelcase` on snake_case object keys:

- **Claude Code's hook payload**, 91 in `.claude/plugins/harness-effort-guard/tests/guard.test.ts` and some of the 12 in `scripts/guard.ts`: `hook_event_name`, `session_id`, `tool_name`, `tool_input`, `agent_type`, `agent_id`, `transcript_path` and `subagent_type`. Claude Code sends these names and reads them back.
- **The guard's observation log**, the rest of the 12: `governed_role`, `identity_source`, `project_root`, `declared_model`, `runtime_model`, `model_check`, `dispatch_target`, `dispatch_name` and `dispatch_model`. The record copies the payload's fields under the payload's names and adds its own in the same style. Its fields are documented in the plugin's `README.md` and in `.agents/docs/harness-effort-guard.md`, and the observation logs that the record cites use them.
- **`@minify-html/node`'s options**, 4 in `packages/vite-custom-element-assets/src/html.ts`: `minify_css`, `minify_js`, `keep_comments` and `allow_removing_spaces_between_attributes`. The native library reads exactly these names.
- **The token database's field** `token_class`, 1 in `packages/tproc/tests/helpers.ts`. It builds a fixture in the shape that the upstream token data has.

`eslint-config-vaadin` sets `camelcase: ['error', { properties: 'always' }]`. A quoted key escapes the rule, but oxfmt removes the quotes. A computed key survives oxfmt, but `no-useless-computed-key` reports it. So no form of the source passes both tools, as the report shows.

**Properties.**

1. **The root `eslint.config.ts` lists each such name in `camelcase`'s `allow` option, as an anchored exact pattern** (`'^session_id$'`). ESLint reads each `allow` entry as a regular expression, so an unanchored entry would also admit every name that contains it. The entries are grouped by the interface that fixes them, with one comment per group that names the interface. Every package's configuration imports this one, so the list exists once.
2. **What qualifies:** a name fixed by an interface outside the TypeScript program. That is a protocol that another program sends or reads, an option set that a library reads by name, external data whose shape the code reproduces, or a persisted record format that this repository documents and that its readers already use. Today that means the four groups above.
3. **What doesn't qualify:** a name this code chooses and only this code reads. It is renamed to camelCase. A new name joins the list only under property 2, in the change that introduces it.
4. **Unchanged:** `camelcase` stays at `error` with `properties: 'always'`. No file-scoped override, no disable comment, no rename of a listed name, and no change to oxfmt's quoting.
5. **`.claude/` stays linted** by the root recipe, as it is now. The plugin is TypeScript that the repository maintains and tests. This decision changes only the shared configuration and no file under `.claude/`.

**Why.**

- **The rule exists for names that this code chooses.** A name another program fixes can't follow it, and renaming it breaks the interface. An exact list keeps the rule's full force for every other name: a new snake_case key still fails unless someone adds it with the interface named.
- **One list, not a scope.** A file-scoped `properties: 'never'` for the plugin would stop checking every other key in those files. Turning the rule off was the alternative `RD-8` property 5 sends back.
- **The guard's log counts as an interface.** Renaming its fields would change a documented format that the record's observation logs and two documents use. That is a decision about the guard, not a lint repair.

**Not adopted.**

- **`properties: 'never'` everywhere,** which turns the rule off for every key in the repository.
- **Building the objects so the linter can't see their keys,** for example with `Object.fromEntries` over pairs. That is machinery whose only purpose is to hide a name from a rule (CONTRIBUTING §2).
- **Disable comments,** which `RF-32` and `RD-8` rule out. There would be 108 of them.
- **Renaming the guard log's own fields to camelCase,** for the reason above.

#### RD-11 — ESLint doesn't re-decide what the oxlint configuration decides: an empty object type is allowed, and a rule oxlint enforces is checked once

**Decided 2026-11-16 by the architect** on `ci/verification` at `a2a4c5488`, on the CI verification unit's second stop under `RD-8` property 5 ([report](ci-verification-1/ci-verification-report.md) §The second stop). It amends `RD-8` property 2 and `RF-32`'s required property for these two rules only. **No public type changes, so the owner has nothing to approve.** **Unimplemented:** the [handoff](ci-verification-1/ci-verification-handoff.md)'s item 5 implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**The reading.** After `e9da25c08`, ESLint reports three errors and oxlint none:

- **`@typescript-eslint/no-generated-empty-object-type`** at `packages/material-x/src/button-group/ButtonGroupCore.ts:37` (`ButtonGroupLikeProps`, the props of a trait that has none) and `packages/material-x/src/list/ListItemCore.ts:19` (`ListItemCoreProperties = Record<never, never>`, intersected in `ListInteractiveItemCore.ts:25` and re-exported as `ListItemProperties`). Both are exported, and both mean "no properties". **The repository allows empty object types on purpose:** `.oxlintrc.json`'s "Custom rules" block sets `typescript/no-empty-object-type` to `allow`, since `457991661`, and the trait system spells "no props" as `{}` (`Trait<{}, …>` on the line above the first site). ESLint's own `no-empty-object-type` is among the rules that `buildFromOxlintConfigFile` disables. `no-generated-empty-object-type` is the type-aware form of the same rule: it reports a type that resolves to `{}` instead of one that is written as `{}`. oxlint doesn't implement it, so nothing disables it.
- **`@typescript-eslint/no-unnecessary-type-parameters`** at `packages/core/src/utils/DOM.ts:37`, `$`'s public `querySelector`-style overload `$<E extends Element = Element>`. oxlint enforces the same rule as `error` (`.oxlintrc.json:131`, which every package's configuration extends). The overload carries `// oxlint-disable-next-line typescript/no-unnecessary-type-parameters`, so the repository has already exempted it. `buildFromOxlintConfigFile` doesn't disable ESLint's copy, so ESLint reports what oxlint was told to accept.

**Properties.**

1. **`@typescript-eslint/no-generated-empty-object-type` is `off`** in the root `eslint.config.ts`, with a comment that ties it to the `allow` of `typescript/no-empty-object-type` in `.oxlintrc.json`. The two exported types don't change.
2. **`@typescript-eslint/no-unnecessary-type-parameters` is `off` in ESLint** and stays `error` in oxlint. It joins the block after `buildFromOxlintConfigFile` that already turns off five rules that oxlint duplicates and that the function doesn't handle. The overload and its oxlint disable comment don't change.
3. **The general rule:** the oxlint configuration states the repository's lint policy for every rule that oxlint implements. ESLint checks only what oxlint can't. A rule that both tools implement is checked once, by oxlint. An ESLint rule that re-states a rule which `.oxlintrc.json` allows follows that allow. Adding either kind of rule to the ESLint configuration is a configuration repair, with a comment that names the oxlint rule.

**Why.**

- **The repository decided this already.** `no-empty-object-type` is allowed, and the overload is exempted. ESLint reporting either one is a second checker re-deciding a settled rule, not a defect in the source.
- **Changing the public types is the wrong repair.** `{}` means "no properties", and the intersection at `ListInteractiveItemCore.ts:25` depends on that. `Readonly<Record<string, never>>` would turn every intersected property into `never`. Any other non-empty type changes what the export means.
- **For the overload, the rule isn't turned off.** oxlint still enforces it everywhere, and the exemption stays where the repository put it.

**Not adopted.**

- **Changing `ButtonGroupLikeProps` and `ListItemCoreProperties`,** which would be a public type change for the owner to approve, and for no gain.
- **An ESLint disable comment beside the oxlint one,** which `RD-8` and `RF-32` rule out, and which would state one exemption twice.
- **Removing the overload,** which `useSlot.ts:44` uses.

#### RD-12 — The third engine is Safari on a macOS runner, driven through Vitest's WebdriverIO provider, and Playwright's WebKit runs nowhere

**Decided 2026-11-16 by the architect** on `ci/verification` at `9c96be2d8`, on the owner's correction relayed by the coordinator the same day (O13 in the [design](ci-verification-1/ci-verification-design.md)): _"Chromium, Firefox and WebKit"_ in O2 means real Safari, run on a macOS runner. At `9c96be2d8` the `webkit` job runs Playwright's WebKit build on `ubuntu-24.04`, and pull request #27's first run is in progress with it. **It amends `RD-6`** (title, properties 2, 3, 4, 6, 7 and 8), **`RD-8` property 1** and **`RD-9` property 1**, in place, each with what it said before. **Unimplemented:** the [handoff](ci-verification-1/ci-verification-handoff.md)'s section _Resuming with Safari as the third engine_ implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**Amended 2026-11-16 by the architect** on `ci/verification` at `347d4e499`, on the Safari driver stop ([evidence](ci-verification-1/checks/safari-driver-stop.txt), run 43821740209), relayed by the coordinator. **Property 3's second item was false:** it said that `RD-3`'s release closes one Safari session before the next project opens one. Vitest opens a project's browser before that project's first test file starts, and the release happens when that file starts. Property 3's second item, property 6 and property 8 are amended in place, each with what it said before. The readings at `347d4e499`, one reason and four rejected remedies are added. **Unimplemented:** the handoff's section _Resuming after the Safari driver stop_ implements it.

**Amended 2026-11-16 by the architect** on `ci/verification` at `83ff45024`, on the Safari inventory of run 43827320614 and the probe of run 43829273272, relayed by the coordinator. Safari on the `macos-26` runner reports `prefers-reduced-motion: reduce`, and the window clips the test frame. Property 3's last item is amended in place, with what it said before. Property 10 and the readings at `83ff45024` are added. **Unimplemented:** the handoff's section _Resuming after the Safari inventory_ implements it.

**Dated 2026-11-16 by the architect** on `ci/verification` at `bee058e8a`, on the three-run Safari inventory of run 43830910625 ([evidence](ci-verification-1/checks/safari-inventory-three-runs.txt)), relayed by the coordinator. **A Safari row that sometimes doesn't finish is an intermittent row under `RD-8` properties 1 and 4, not a command stop.** The handoff's stop _"a command whose Playwright behavior WebDriver actions can't reproduce"_ covers a command whose result in Safari differs from Playwright's, such as wrong coordinates or a missing state. Such a difference would make every row that calls the command unreliable. Here the same pointer command serves the rest of drag's rows in every attempt. Two `sortable.browser.test.ts` rows either pass in about 8.8 s or time out at 15 s:

- _"should propose the gap a full measurement gives with transitions on the rows and the item"_, in 4 of 6 drag project runs;
- _"should measure every y() candidate through box when visual is also given"_, in 2 of 6.

The two outcomes, with nothing between them, read as a stall, not as slowness, so **no timeout is raised:** a longer budget would only make the stall longer. Their cause isn't established. Each row is skipped in Safari only, with its own `drag` finding. **A lost browser connection that recurs after those skips** is `RD-8` property 5's stop, because the project's files can't all run. The handoff's section _Resuming after the three Safari runs_ implements this. No property changes.

**Amended 2026-11-16 by the architect** on `repo/findings-1` at `c34cb01d7`, on verify run 43886020747, relayed by the coordinator. Safari's Tab doesn't move focus to buttons, checkboxes or radios, so the 9 keyboard-focus rows of `focus-layer.spec.browser.test.ts` find no focus in `spec/material-x/safari`. `RF-33`'s earlier CI reading shows the same thing: after Tab, `document.activeElement` is `<body>` in Safari, and the `mx-button`'s native button in Chromium and Firefox ([reading](findings-1/checks/rf33-repair-readings-run-1.txt), `RF33T`). Property 10 gains the bullet _Tab_, which names Safari's _"Press Tab to highlight each item"_ as the property's last bullet requires. The other bullets are unchanged. **Unimplemented:** the [findings-1 handoff](findings-1/findings-1-handoff.md)'s section _Item 7, amended a third time 2026-11-16: Tab in Safari_ implements it.

- **Rejected: reaching focus another way in Safari,** for example with `focus()` or a driver command that focuses an element. That isn't keyboard input. Those rows exist to show that keyboard focus draws the layer and the indicator, and `:focus-visible` depends on how focus arrived. Option-Tab is real keyboard input, but it is a different key in one engine, and nothing has shown that WebDriver's modifier reaches WebKit's Tab handling. It is named below only as something for the owner to weigh if the unit stops.
- **Rejected: limiting the rows under property 5.** Property 5 covers instruments that a driver lacks. Tab focus is a browser preference that the job can set, as it sets Reduce Motion. A row limited for that reason would be an `RD-8` disabled row with its own finding, and Safari would lose the `RF-35` and `RF-39` rows that item 7 requires in every engine.
- **The reading, by the architect on 2026-11-16, not yet read in CI:** WebKit's Tab skips buttons, checkboxes and radios unless a user setting is on (WebKit bug 199671). On macOS, either Safari's tab-to-links setting or the system's full keyboard access includes them. Only tab-to-links also includes links, which Chromium's and Firefox's default Tab reaches. The Safari defaults keys are `WebKitTabToLinksPreferenceKey` and `com.apple.Safari.ContentPageGroupIdentifier.WebKit2TabsToLinks`. Nothing read here shows whether a `safaridriver` session honours them. The web-platform-tests CI setup writes other `com.apple.Safari` keys with `defaults write`.

**Amended again 2026-11-16 by the architect** on `repo/findings-1` at `fc3b89680`, on the findings unit's [report](findings-1/findings-1-report.md) §7, relayed by the coordinator. **The _Tab_ bullet's premise was false.** The `safari` job wrote both keys, to the global domain and to Safari's container domain. Each read back as set, and Tab still left focus on `<body>` in all six configurations ([reading 1](findings-1/checks/rd12-tab-reading-1.txt), run 43889993969; [reading 2](findings-1/checks/rd12-tab-reading-2.txt), run 43892383154). The preference doesn't reach Safari's Tab under `safaridriver`. Why it doesn't hasn't been read. The bullet is amended in place: the job sets no Tab preference, and `RF-42` holds the rows. How they reach their controls is the owner's decision (the [findings handoff](findings-1/findings-1-handoff.md)'s _Disposition of the report at `fc3b89680`_). No other property changes.

**Amended a third time 2026-11-17 by the architect** on `repo/findings-1` at `d756e4f4f`, on the findings unit's [report](findings-1/findings-1-report.md) §8, relayed by the coordinator. The owner chose `RF-42`'s option (a): in Safari, the keyboard rows press Option-Tab, which with Safari's default settings moves focus to every control. In run 44003141576 at `964af56ab`, the 9 rows pass, and no other Safari row changes ([reading](findings-1/checks/rf42-option-tab-safari.txt)). The _Tab_ bullet records the key. No other property changes.

**The readings,** taken by the architect on 2026-11-16.

- **Only WebDriver drives Safari.** Playwright's `webkit` is Playwright's own WebKit build, on macOS too, and not Safari. Vitest's `preview` provider opens a browser with no automation. Safari ships its own WebDriver server, `safaridriver`, with macOS.
- **Vitest's WebdriverIO provider is community-maintained since Vitest 5.** `@vitest/browser-webdriverio` lives in `vitest-community/vitest-webdriverio` and is released apart from Vitest. Its latest version is 5.0.0, of 2026-09-08. Its peer range is `vitest: ^5.0.0`, and it depends on `@vitest/browser: ^5.0.0`, so it resolves to the repository's 5.1.0 without a second copy. Its own CI runs on `macos-latest` and `windows-latest` and doesn't name Safari, so nothing upstream shows that Safari works with it.
- **The provider under Safari,** read in its `src/webdriverio.ts`: it refuses `headless: true` for Safari, because Safari has no headless mode; it declares `supportsParallelism: false`; it sets the viewport with `setWindowSize` when the session isn't WebDriver BiDi, and that is the window's outer size; its command context is `{ browser }`, a WebdriverIO browser, not a Playwright page.
- **Safari allows one WebDriver session per machine:** _"Only one Safari browser instance can be active at any given time, and only one WebDriver session at a time can be attached to the browser instance"_ (Apple, _About WebDriver for Safari_). `safaridriver` answers nothing until remote automation is enabled, with `safaridriver --enable` as an administrator.
- **Vitest 5.1.0 records the trace view by default (`failure-only`),** and recording an `expect.element` step serializes its locator. The WebdriverIO provider's locator throws when no element matches, so every `expect.element(…).not.toBeInTheDocument()` fails under it. An independent project read this at 5.1.0 and turned the trace view off for its WebdriverIO projects (`migrationsverket/midas#1476`, merged 2026-11-09).
- **GitHub's `macos-26` label** is a standard arm64 runner (M1, 3 vCPU, 7 GB), generally available since 2026-02-26, and free for a public repository. `macos-latest` moves from macOS 15 to macOS 26 in a migration that GitHub announced. Safari's version is whatever the runner image ships, and an image update changes it.
- **The repository's commands assume Playwright.** drag's `tests/support/commands.node.ts` calls `context.page.mouse`, `context.page.keyboard` and `context.page.emulateMedia`, and the Chrome DevTools Protocol for `touch`, garbage collection and heap readings. material-x's `resolveTokenContract` doesn't read its context. drag's tests call `emulateReducedMotion` in `landing.browser.test.ts`, at two rows and in a `beforeEach`. Every CDP command is already called from Chromium-only rows.

**Read at `347d4e499`,** after run 43821740209 (`macos-26`, macOS 26.7.2, Safari 27.2), in the installed packages: Vitest 5.1.0, `@vitest/browser-webdriverio` 5.0.0, `webdriverio`, `webdriver` and `@wdio/utils` 10.2.0, and `safaridriver` 3.0.0.

- **Observed in CI:** `browser/material-x/safari` ran 8 files and 141 tests, and all passed. Each of the 6 later Safari projects failed to open its browser with _"There is already a Safaridriver instance running on port 49190!"_. The error comes from `safaridriver`'s `start`, called through `webdriverio`'s `remote` from the provider's `openBrowser`.
- **Vitest's order:** the browser pool opens a session's page, and only then runs test files on it (`openPage(…).then(() => this.runNextTest(…))` in `vitest/dist/chunks/index.Di8au7q4.js`). The one-shot reporter releases an earlier group's provider in `onTestModuleStart` for the first module of the next group (`.scripts/vitest-one-shot.ts`). So in one Vitest process, the next browser project opens its browser while the previous project's provider still holds its session. For Chromium and Firefox, this costs only memory. Safari allows one session.
- **The driver:** `safaridriver` 3.0.0 keeps one driver process per Node process. It forgets that driver only when the driver process emits `exit`, and a second `start` before that throws the error above. `webdriver`'s `deleteSession` kills the driver by its PID, with `SIGKILL`, unless it is given `shutdownDriver: false`. So a release would stop the driver, but in this run no release came before the next project opened.
- **A listing opens no browser:** in the devcontainer, where Safari can't run, `MX_TEST_ENGINES=safari npx vitest list --filesOnly --json --project '*/safari'` exits 0. It lists 7 Safari projects with 101 files: `browser/material-x` 8, `spec/material-x` 6, `browser/core` 22, `browser/box-quad` 7, `browser/drag` 30, `consumer/drag` 27 and `shipped/drag` 1, each name ending in `/safari (safari)`.

**Read at `83ff45024`,** in the `safari` job (macOS 26.7.2, Safari 27.2).

- **Run 43827320614 at `2b540c639`:** every Safari project opened Safari and ran. Five projects passed. `browser/drag` failed 29 rows and `consumer/drag` failed 27 ([inventory](ci-verification-1/checks/safari-inventory-run-43827320614.txt)). Among them are rows that expect a landing animation and find none, for example _"expected 0 to be greater than 0"_ in free-drag's landing rows.
- **Run 43829273272, from a probe inside a `browser/drag` Safari test:** `matchMedia('(prefers-reduced-motion: reduce)').matches` is `true`. The frame's inner size is 1280 × 720. drag's landing honors the preference by giving the landing zero duration, which is the product's specified behavior, not a defect. Chromium and Firefox report no preference by default, and drag's landing rows also reset the preference with media emulation, which Safari's driver lacks.
- **The implementer's reading:** the top-level viewport is 1280 × 668, smaller than the frame, so a pointer move below y 668 never arrives.
- **Not established:** how the runner image sets Reduce Motion, and whether the runner's user can change it. A `defaults write` to `com.apple.universalaccess` is reported to fail on some macOS versions with _"Could not write domain com.apple.universalaccess"_.

**Properties.**

1. **The engines are `chromium`, `firefox` and `safari`.** `MX_TEST_ENGINES` lists those names. `webkit` is no longer an engine, and naming it is the unknown-engine error. A Safari project is named `<name>/safari`. Chromium and Firefox projects don't change.
2. **Safari projects use the WebdriverIO provider; Chromium and Firefox stay on Playwright's.** `@vitest/browser-webdriverio` and `webdriverio` are exact `devDependencies` at the root. The driver is the `safaridriver` that ships with macOS, and nothing installs a browser or a driver for Safari. A Safari project's instance is `{ browser: 'safari' }`.
3. **A Safari project runs:**
   - **not headless,** because Safari has no headless mode;
   - **with one worker and without file parallelism,** as every non-Chromium project already does (`RD-6` property 4), and **as the only Safari project in its Vitest process** (property 6). Safari allows one session. In one process, the next project opens its browser before `RD-3`'s release closes the previous one. (**Amended 2026-11-16 at `347d4e499`.** This item said: _"Safari also allows only one session, and `assignGroupOrder` gives each browser project its own group, so `RD-3`'s release closes one Safari session before the next project opens one"_. That was false; see the readings at `347d4e499`.);
   - **with Vitest's trace view off.** CI keeps no trace, so this loses nothing. Chromium and Firefox keep Vitest's default;
   - **in a test frame that the orchestrator doesn't scale,** at the configured 1280 × 720, **inside a top-level viewport that contains the whole frame,** so that pointer input reaches every point of the frame. If the provider's window size leaves the frame or the top-level viewport smaller, the Safari configuration makes the window large enough. From inside a Safari test, the implementer shows the frame's inner size, the top-level viewport's size and that no scale transform applies. (**Amended 2026-11-16 at `83ff45024`.** This item didn't name the top-level viewport. It said: _"If the provider's window size leaves the frame smaller, the Safari configuration makes the window large enough. The implementer shows the frame's inner size and that no scale transform applies, from inside a Safari test."_)
4. **Every repository browser command that a Safari row calls has a WebdriverIO implementation** with the same name, arguments, result and coordinate frame as its Playwright implementation. The command selects its implementation from the provider that runs it. Pointer movement, presses and key presses use WebDriver actions. **The pointer's state lasts from `pointerDown` to `pointerUp`:** a command doesn't release the input state between them, because Playwright's mouse doesn't. A command that has no WebDriver counterpart, which is each CDP command and `emulateReducedMotion`, **throws an error that names the command and the provider.** It never does nothing. (**Dated 2026-11-16,** on the feature-proof review's `reviewer-5`, [review](reviews/ci-verification-1/feature-proof-claude.md): the frame is the same, and the precision differs. `pointerMove` sends each interpolated point to WebDriver rounded to a whole CSS pixel, because WebDriver drivers disagree about fractional pointer coordinates and some refuse them, while Playwright sends them unrounded. Each point is within 0.5 px of Playwright's, and the kept position is the unrounded target, so the interpolation is Playwright's. A sub-pixel difference in a Safari row isn't a product difference until it is shown to exceed that bound.)
5. **A row that needs an instrument that an engine's driver doesn't provide runs only in the engines that provide it,** by an engine condition, as drag's `isChromium` rows do. This generalizes `RD-6` property 6 from Chromium-only instruments to every driver's instruments. It limits the row's scope and doesn't disable it, so `RD-8` doesn't apply to it. **A row limited for any other reason is a disabled row under `RD-8`,** with its finding. The report lists every row that is newly limited for Safari, with the command it needs.
6. **The Safari job runs on GitHub's `macos-26` runner,** named by that label and not by `macos-latest`, so the operating system changes only by an edit. It uses the Node major version that the workflow names, like every other job. Before the tests, it enables remote automation with `sudo safaridriver --enable`. **Its log names the macOS version and Safari's version** before the tests run. Every other job stays on `ubuntu-24.04`. **The job runs each Safari project in its own Vitest process, one after another,** through the root recipe `test-safari`, which the job calls with `--tags-filter '!measurement'`. The recipe:
   - sets `MX_TEST_ENGINES=safari` itself;
   - builds what the root `test` recipe builds, once for all projects, and shares those build steps with `test` instead of copying them;
   - takes the list of Safari projects from the configuration when it runs, with a listing that opens no browser. Nothing writes the list out, so a new Safari project runs with no edit to the recipe or the workflow;
   - passes its arguments to every project's run, and runs every listed project even after one fails;
   - logs each project's name and exit status;
   - exits non-zero if the listing fails or lists no project, or if any project's run fails.

   (**Amended 2026-11-16 at `347d4e499`.** The job ran every Safari project in one Vitest process, with `npx just test --project '*/safari'`.)

7. **Safari isn't pinned.** Its version is the runner image's. A Safari failure is handled under `RD-8`, like any engine's, whether it comes from a repository change or from an image update, and the job log's Safari version tells which. `RD-9` pins only the visual environment, and visual runs in Chromium only.
8. **Locally, nothing runs Safari or WebKit.** The devcontainer runs Linux, so Safari can't run there, and no Playwright WebKit build is installed or started anywhere. Local runs are Chromium only (`RD-13` property 7). A developer on macOS with remote automation enabled can run `just test-safari`, and the repository promises nothing more there. (**Amended 2026-11-16 at `347d4e499`:** this sentence named _"`MX_TEST_ENGINES=safari`"_, and a single Vitest process run with it opens only its first Safari project.) (**Amended 2026-11-16 by `RD-13`.** This property said: _"drag's `test-engines` runs `chromium,firefox`. Its project names are `browser`, `browser/firefox`, `shipped` and `shipped/firefox`, which are exactly `drag:DRO-18`'s selection."_)
9. **A Vitest or provider upgrade re-reads the Safari job,** because the provider is released apart from Vitest. The reading is the Safari job's result on the upgrade's pull request. No row watches it.
10. **A Safari page reports the same user preferences as a Chromium or Firefox page reports by default:** `prefers-reduced-motion: no-preference` (added at `83ff45024`).
    - **How each engine gets it:** Chromium and Firefox have it from Playwright's default, and drag's landing rows also reset it by emulation. Safari's driver can't emulate the preference, so **the `safari` job sets the runner's macOS preference before the tests.** It turns Reduce Motion off as the runner's user, reads the value back, and logs it. The step fails if the value read back isn't off.
    - **This is the job's environment, like remote automation in property 6, not a limit on rows.** A row that needs the default preference isn't an instrument row under property 5. It gets no engine condition and isn't disabled. A row that needs a non-default preference, such as drag's two reduced-motion rows and their reset, needs emulation, so it stays limited under property 5.
    - **If the job can't set the preference, or Safari still reports `reduce` after the job has set it, the unit stops** under `RD-8` property 5. The rows that need motion are then neither limited nor disabled, and the owner decides.
    - **Any other macOS preference** that the runner image sets differently from Chromium's and Firefox's default, and that a row depends on, is named here by an amendment before the job sets it.
    - **Tab** (added at `c34cb01d7`, amended at `fc3b89680`). Safari's default Tab doesn't move focus to buttons, checkboxes or radios. **The job sets no preference for it,** because setting Safari's _"Press Tab to highlight each item"_ changed nothing under `safaridriver`. **A Safari row reaches such a control with Option-Tab** (`{Alt>}{Tab}{/Alt}`), the key that moves focus to every control under Safari's default settings. Chromium and Firefox keep Tab. The owner chose this under `RF-42`, and it is real keyboard input, not a limit on rows. (**Amended at `d756e4f4f`.** The previous sentence said: _"How a Safari row reaches such a control by keyboard is `RF-42`'s, and is recorded here once the owner decides."_) (**Amended at `fc3b89680`.** This bullet said: _"In a Safari page, Tab moves focus to every element that Chromium's and Firefox's default Tab reaches: links, buttons and every form control. The setting is Safari's 'Press Tab to highlight each item', not the system's keyboard navigation, which changes more than Safari. As with Reduce Motion, the `safari` job turns it on as the runner's user before the tests, reads it back and logs it, and the step fails if the value read back isn't on. The implementer picks the keys with a reading. It is the job's environment, not a limit on rows. The unit stops under `RD-8` property 5 if the job can't set it, or if Tab still doesn't reach a button in a Safari row after it is set. The keyboard-focus rows are then neither limited nor disabled, and the owner decides."_)

**Why.**

- **Real Safari runs only on macOS, and only WebDriver drives it.** WebdriverIO is the one Vitest provider that speaks WebDriver. So the third job needs a macOS runner, a second provider, and its own command implementations. Each of these follows from the owner's correction, and nothing smaller meets it.
- **Two providers, not one.** `RD-9` pins Chromium through the `playwright` dependency, and Chromium's rows need the DevTools Protocol, so Chromium stays on Playwright. Moving Firefox to WebdriverIO would make its build unpinned and gain nothing. So the second provider serves Safari only. The shared factory stays the one engine selection, and the provider is its point of variation (CONTRIBUTING §6).
- **Commands keep their names and select by provider,** so a test file is the same in every engine, and an engine condition in a test states a missing instrument and nothing else.
- **A missing command throws.** A reduced-motion emulation that silently did nothing would let a row pass in Safari without testing what it states.
- **The community provider's risk is accepted** because nothing else drives Safari from Vitest. Its one known incompatibility with 5.1.0, the trace view, is property 3. Any other incompatibility is a stop under `RD-8` property 5, which the unit reports.
- **`macos-26`, not `macos-15`:** the newest Safari that a standard runner ships is the one users get, and the label is named so that the move to the next one is an edit.
- **The job sets the preference, rather than the rows giving way** (added at `83ff45024`). The landing rows test drag's motion, which is behavior that users of Safari get. An engine condition or an `RD-8` disable would leave those rows untested in Safari, for a reason that lies in the runner and not in Safari or drag. Setting the preference keeps the comparison between engines meaningful. Like remote automation, it is a single job step that the log shows.
- **One Vitest process per Safari project** (added at `347d4e499`). In one process, Vitest's order conflicts with Safari's single session: the release that `RD-3` and TE-D12 put at the next group's first module comes after that group's browser opens. A process's run ends with its pool closing its only provider, so the next process starts with no session and no driver. The shared factory, the provider and the one-shot release don't change, and Chromium and Firefox keep one process. The cost is one Vitest start per Safari project, 7 today, in a job that runs only browser projects.

**Not adopted.**

- **Playwright's WebKit, on Ubuntu or on macOS.** That is the build that `9c96be2d8` runs, and the owner's correction rules it out: it isn't Safari.
- **Keeping Playwright's WebKit as a fourth engine.** No requirement names it, it can't run locally (`drag:DRO-18`), and an engine that no job runs is machinery with no use.
- **A cloud browser service,** such as BrowserStack or Sauce Labs. It needs an account and a secret, and a fork's pull request can't use the secret.
- **Safari Technology Preview.** It isn't the Safari that users run.
- **A no-op `emulateReducedMotion` in Safari,** for the reason above.
- **One `safaridriver` that the job starts, with the provider pointed at its port** (the implementer's first option, at `347d4e499`). It removes the driver error but not the order. The second project would request a session while the first one is still attached, which Safari refuses. This is inferred from Apple's rule above and wasn't run.
- **Closing the previous Safari provider before the next one opens,** in a wrapper around the provider or in an earlier hook. Vitest has no reporter hook between a group's end and the opening of the next group's page. TE-D12 refuses closing in `onTestModuleEnd`. A wrapper would depend on the community provider's internals. It would also race `safaridriver`'s `exit` event, which is when the package forgets its driver.
- **One CI job per Safari project, as a matrix.** Each job would repeat checkout, `npm ci` and the build on a macOS runner. The project list would also have to be written in the workflow or computed by another job.
- **Patching `safaridriver` or the provider** to remove the one-driver limit. That fixes the error and leaves the order.
- **An engine condition on the rows that need motion** (at `83ff45024`). Property 5 covers a missing instrument, and these rows need none: they need the default preference.
- **Treating those rows as `RD-8` rows.** They don't fail because of drag or Safari, and disabling them would hide the runner's preference behind findings.
- **Conditioning those rows on the page's preference, read at run time.** If the image ever turned Reduce Motion on again, the landing rows would skip, and the job would stay green.

**What this amends.**

- **`RD-6`:** the title; property 2's runner; property 3's job names; property 4's engine list and drag's `test-engines`; property 6, which property 5 here generalizes; property 7's coverage sentence; property 8's list; and two reasons. Amended in place, with what each said before.
- **`RD-8` property 1:** _"WebKit, and the visual result on CI's operating system, in CI"_ becomes Safari. Property 5's stops apply to Safari as to any engine.
- **`RD-9` property 1:** _"as Firefox and WebKit already are"_ and _"WebKit stays out of local development (`drag:DRO-18`)"_.
- **`drag:DRO-18`** gets a dated note: the job that covers the WebKit family is Safari on macOS, and its local selection is unchanged.
- **`.agents/docs/test-architecture.md` §CI policy,** in the same commit. It said: _"each in Chromium, Firefox and WebKit … CI runs on plain GitHub-hosted runners, and its browsers are the builds the locked `playwright` package pins."_

#### RD-13 — Baselines are recorded on GitHub's runner by a separate workflow that proposes them in a pull request, and local runs are Chromium only, without visual

**Decided 2026-11-16 by the architect** on `ci/verification` at `26453da9c`, on the owner's decisions relayed by the coordinator the same day (O14 and O15 in the [design](ci-verification-1/ci-verification-design.md)). The unit stopped under `RD-8` property 5 and `RD-9` property 4. The owner considered hosted screenshot services and declined them, and decided: baselines are recorded on GitHub's runner, not in the devcontainer; a workflow apart from the gate records them and proposes changed images in a pull request, which the owner reviews and merges; the gate never writes a baseline. Local visual runs are off, and local runs are Chromium only, with Firefox and Safari covered by CI. **It amends `RD-2`'s acceptance and deliverable 1, `RD-6` properties 4 and 5, `RD-9` properties 1, 4, 5 and 6, `RD-12` property 8 and `drag:DRO-18`.** **Unimplemented:** the [handoff](ci-verification-1/ci-verification-handoff.md)'s section _Recording baselines on GitHub's runner_ implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668. A proposal with a changed baseline and property 5's dispatch for `main` haven't run on GitHub yet ([report](ci-verification-1/ci-verification-report.md) §Remediating the feature-proof review, _Not verified_).

**Amended 2026-11-16 by the architect** on `ci/verification` at `b750bd8ef`, on the feature-proof review's `reviewer-1` (`RF-38`). Property 3 gains _What `propose` writes_. The reason for two jobs said that a branch can't use the token for anything except the proposal, which was false for the branch's author, and now states whom the split protects against. What it said before is beside the reason. The handoff's section _Remediating the feature-proof review_ implements it.

**The reading,** from the unit's stop at pull request #27's run 43813617164, relayed by the coordinator. The images are under [`ci-verification-1/visual/ci-run-43813617164/`](ci-verification-1/visual/ci-run-43813617164/). The `chromium` job on `ubuntu-24.04` doesn't reproduce 16 of the 19 baselines that the devcontainer (Debian 13) recorded with the same Chromium 158.0.8127.18 and Roboto. Each differs by 2 to 1,014 pixels, on anti-aliased edges, and rows with no text differ too. So the difference isn't only fonts. **Its cause isn't established.** Rasterization that differs by operating system libraries or by processor would both produce it. If GitHub's runners differ among themselves in the same way, the gate can turn intermittent on visual rows. Property 9's log lines exist to show that.

**Properties.**

1. **Where a baseline comes from.** Every committed baseline is recorded by the recording workflow, `.github/workflows/baselines.yml`, on GitHub's `ubuntu-24.04` runner, the label that the gate's `chromium` job uses, in `RD-9`'s pinned visual environment. A baseline recorded anywhere else is never committed. **The gate never writes, updates or approves a baseline.** The recording workflow writes baselines only to its proposal branch, and only the owner's merge brings them into another branch.
2. **Triggers.** Only these two:
   - `workflow_dispatch`, on the branch that the run is started for;
   - `pull_request` of type `labeled`, when the label is `record-baselines` and the pull request's head branch is in this repository. This trigger works before the workflow is on `main`, which `workflow_dispatch` doesn't.

   **The target branch** is the dispatched branch, or the pull request's head branch. **The recorded commit** is that branch's head when the run starts: for a pull request, its head commit, never the merge commit. A target under `baselines/` is refused. After a labeled run, the workflow removes the label, so adding it again records again.

3. **Two jobs, so that the write permission never runs repository code.**
   - `record` has `contents: read`. It checks out the recorded commit, runs `npm ci`, installs Playwright's Chromium, and runs the visual project with Vitest's update flag. It uploads, as an artifact, each baseline file that the run added or changed.
   - `propose` needs `record`, and has `contents: write` and `pull-requests: write`, plus `actions: write` only for property 5. **It runs no code from the repository:** no `npm ci`, no recipe and no script from the tree. It uses only `git`, `gh` and pinned actions. It accepts from the artifact only paths that match `packages/*/tests/**/__screenshots__/**/*.png`, and fails on any other path.
   - **What `propose` writes** (added 2026-11-16, `RF-38`). It writes only the proposal's baseline files, each as a regular file. Nothing in the recorded commit or the artifact can redirect a write: the job fails if a component of an accepted path is a symbolic link in the recorded commit, or if an artifact file isn't a regular file that starts with PNG's signature. No `git` command that it runs reads configuration or hooks that the recorded commit or the artifact can write.
4. **The proposal branch and its pull request.**
   - **Branch:** `baselines/<target>`, made from the recorded commit plus one commit that changes only baseline files. The workflow is the only writer of `baselines/*`, so it pushes the branch with force on each run.
   - **Pull request:** it opens a pull request from that branch into the target, or updates the open one. Its body names the recorded commit, the run, the runner image's version, the Chromium version, the processor model, and each added and changed file.
   - **When nothing changed,** it pushes nothing and opens nothing, and the job summary says so.
   - **A baseline file changes only where its comparison failed or it didn't exist.** A file that still matches stays byte for byte as it is.
   - **Obsolete baselines are not removed.** That stays a manual change.
5. **How the gate runs on the proposal.** A pull request that the default `GITHUB_TOKEN` creates or updates triggers no workflow.
   - **Into a branch other than `main`:** nothing is dispatched. The owner's merge of the proposal into the target is the owner's own push. It runs the target's pull request's `verify`, which reads the new baselines on the runner, and that run is the reproduction check.
   - **Into `main`:** the workflow starts `verify` on `baselines/main` with `workflow_dispatch`, the one kind of event that `GITHUB_TOKEN` can trigger. The run's checks land on the proposal's head commit, so the branch rule's `verify` is satisfied by them. If that dispatch fails, the owner closes and reopens the pull request, which runs `verify` as the owner's event.
6. **Concurrency and forks.** One recording per target runs at a time, and a newer one cancels the older one. A pull request from a fork never gets a write token, so the labeled trigger skips it. Its baselines are recorded on a branch in this repository.
7. **Local runs are Chromium only, without visual (O15).**
   - **Visual:** the shared factory declares the visual project only when `MX_TEST_VISUAL=1`. The gate's `chromium` job and the `record` job set the variable. No recipe sets it, and material-x's `test-visual` and `test-visual-update` recipes are removed.
   - **Engines:** `MX_TEST_ENGINES` still defaults to `chromium`. The devcontainer installs only Playwright's Chromium. drag's `test-engines` sets no engine list: it runs drag's browser and shipped projects in the engines that `MX_TEST_ENGINES` lists, which is Chromium by default.
   - **Other engines** run in CI. A developer who sets either variable locally gets an unchecked run, and its result is not evidence.
8. **What a unit owes locally.** A local check covers Chromium, without visual. Firefox, Safari and visual results are read in CI on the unit's pull request. A unit that changes something they can see pushes and reads them there before it reports. A visual change is recorded through property 2, and the owner reviews the proposal.
9. **Diagnostics, not guards.** The gate's `chromium` job and the `record` job log the runner image's version (`ImageOS`, `ImageVersion`) and the processor model before the tests. Nothing compares them. If the visual rows turn intermittent in CI, the unit stops, and the owner decides (`RD-9` property 4).

**Why.**

- **The baselines must come from where they are compared.** The gate compares on GitHub's runner, and the devcontainer's images don't reproduce there. Recording in a second place would need an environment that matches the runner pixel for pixel. Nothing pins the runner that closely, and the owner declined a hosted service.
- **A pull request, not a commit pushed to the target,** because every changed baseline gets a person's review (`test-architecture.md` §What screenshots prove). The owner's merge is the approval.
- **Two jobs,** because the labeled trigger runs code that the person who adds the label hasn't read in full: the branch's dependencies, its tests and the tools they start. The job that holds the write token runs none of it, and takes from it only image files at baseline paths. **This doesn't protect against the branch's author.** A pull request's run uses the workflow file of the branch's own merge commit, so an author with write access can change the workflow itself. Before adding the label, the person who adds it reads the branch's changes under `.github/`. Property 3's _What `propose` writes_ keeps that reading sufficient: without it, a symbolic link at a baseline path also reached the token (`RF-38`). (**Amended 2026-11-16, `RF-38`.** This reason said: _"because the labeled trigger runs a branch's code. The job that holds a write token runs none of it, so a branch can't use the token for anything except the proposal."_)
- **One force-pushed branch per target,** so there is one open proposal per target, and the latest recording replaces the earlier one.
- **`workflow_dispatch` for `main` only.** Only `main` has a rule that needs a check on the proposal. Into any other branch, the owner's merge already runs the target's own gate on the merged result, which is the run that matters.
- **Local runs without visual or other engines,** on the owner's direction. CI is the authority for them, and a local result that can't match CI would only be noise.

**Not adopted.**

- **A hosted screenshot service:** declined by the owner.
- **A token from a GitHub App or a personal access token,** so that the proposal triggers workflows. It needs a secret and its rotation. Only `main` needs a check on the proposal, and `workflow_dispatch` provides it.
- **Recording in the gate's `chromium` job,** which `RD-2` and the owner rule out.
- **A comparison tolerance wide enough to accept the devcontainer's images.** It would hide real changes of the same size, up to 1,014 pixels.
- **A local visual preview,** off on the owner's direction.

**What this amends.**

- **`RD-2`:** the acceptance's _"the same pinned image runs locally and in CI and produces matching screenshots; no baseline is written by CI"_ becomes this: one pinned visual environment on GitHub's runner records and compares; no baseline reaches a branch except through the owner's merge of a proposal; and the gate writes none. Deliverable 1's _"the same image must be runnable locally"_ no longer applies, because no visual run is local. **This is the owner's decision, and it changes the acceptance's substance.**
- **`RD-6`:** property 4's drag `test-engines` sentence and property 5's _"CI never writes, updates or approves a baseline"_. Amended in place.
- **`RD-9`:** property 1's devcontainer install; property 4, which now names the runner; properties 5 and 6, which now record through the workflow. Amended in place.
- **`RD-12` property 8** and **`drag:DRO-18`:** the local engine is Chromium.
- **`.agents/docs/test-architecture.md`** §What screenshots prove and §CI policy, in the same commit. §What screenshots prove said: _"Baselines are committed artifacts, updated only via an explicit command, never in CI, and every changed baseline gets human review."_ and _"Local runs and CI use the same pinned Chromium and fonts so developer output matches CI, and changing either re-records the baselines in a pull request of its own. The environment is owed rather than installed (`repo:RD-2`, `repo:RD-9`), so until it lands a baseline is only as reproducible as the container that wrote it."_ §CI policy said: _"Local runs cover Chromium and Firefox, and Safari runs in CI. CI uploads screenshot actual/diff artifacts on failure and never commits or approves baselines."_

#### RD-14 — The docs build is a gate job of `verify`, and only `main` deploys it

**Decided 2026-11-16 by the architect** on `repo/findings-1` at `275ad0f5c`, on the coordinator's reading of `.github/workflows/docs.yml` (_Publish Docs_), relayed with the owner's authorization of the [findings unit](findings-1/findings-1-handoff.md). **Implemented** by #29, merged as `4e85ac046` (dated note below).

**Amended 2026-11-17 by the architect** on `repo/docs-gate-1` from `main` at `4e85ac046`, on the owner's answer to the findings unit's question 2, relayed by the coordinator: `verify` requires the docs build. A pull request that breaks the Storybook or API build must not merge. There is no preview deployment, which the owner declined. The build and `deploy` move into `verify.yml`, and `docs.yml` is removed. The title and properties 1, 2, 3 and 5 changed, property 6 is new (`RF-46`), and so are two reasons. The first _Not adopted_ item changed. What they said before is at the end. **Unimplemented:** the [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) implements it, and it holds the alternatives weighed.

**The reading at `275ad0f5c`.** _Publish Docs_ has failed on every push to `main` since 2026-08-14. Its last success was on 2026-08-01.

- **Since #27** (run 43865448617): GitHub refuses the run before any step, because the repository requires every action to be pinned to a full commit hash, and the workflow names `actions/checkout@v4`, `configure-pages@v5`, `setup-node@v4`, `upload-pages-artifact@v3` and `deploy-pages@v4`.
- **Before that** (for example run 43744304728 at `a8726c57d`): Storybook's build fails with _Rolldown failed to resolve import "@ydinjs/box-quad"_ from `packages/drag/src/draggable.stories.tsx`. material-x's Storybook also collects drag's and box-quad's stories, and `@ydinjs/box-quad` resolves to its build. `docs:build`'s `^build` builds only material-x's dependencies, which don't include box-quad, so a fresh checkout has no box-quad build when Storybook runs. A developer's tree that has built box-quad passes.
- The workflow runs on `ubuntu-latest` with `lts/*` Node, and builds and deploys in one job with `pages: write` and `id-token: write`.

**Properties.**

1. **Triggers.** `verify.yml`'s (`RD-6` property 1): a draft pull request skips the build, and a newer run for a pull request cancels the older one.
2. **Two jobs in `verify.yml`.** `docs` has the workflow's `contents: read`. After `npm ci` it runs the root `just docs-build`, then `just docs-smoke` (property 6), then uploads the Pages artifact. `deploy` needs `docs`, holds `pages: write` and `id-token: write`, uses the `github-pages` environment, and runs only for a push to `main` or a manual run on `main`. **Nothing deploys from another branch.** Deployments run one at a time and are never cancelled.
3. **`RD-6`'s environment.** `docs` and `deploy` run on `ubuntu-24.04` with the workflow's Node major, and every action is pinned to a full commit hash, as in every other job of `verify.yml`.
4. **The recipe builds what the docs import.** `just docs-build` succeeds on a fresh checkout after `npm ci`. It builds every workspace package that the Storybook or the API documentation resolves to a build. The workflow adds no private build step (`RD-6` property 3's rule, applied here).
5. **In the gate.** `verify` needs `docs` (`RD-6` property 8), so a pull request whose docs build fails can't merge. `deploy` isn't in `verify`'s list, and it doesn't wait for the other gate jobs. On `main`, what deploys is the artifact that the gate's `docs` job built.
6. **The gate loads the built site.** A build that exits 0 isn't enough (`RF-46`). `just docs-smoke` serves `.docs` at the base path the build was made for, and opens it in Playwright's pinned Chromium. It fails on any uncaught exception, any console error, any failed request for one of the site's own resources, or a render error or timeout that Storybook reports. It loads:
   - the manager's `index.html`;
   - `iframe.html` for every story and docs entry in `.docs/index.json`;
   - `api/index.html`.

**Why.**

- **A build on pull requests,** because the build was broken for three months and only a push to `main` could show it.
- **Deploy apart from build,** so the job that holds the Pages token runs only for `main`, and a pull request's build can never publish.
- **The same environment as the gate,** so a docs failure that the gate doesn't show comes from the docs build, not from a different runner or Node.
- **The recipe, not the workflow,** builds the prerequisites, so a developer's `just docs-build` on a fresh checkout behaves as CI's does.
- **A loaded site, not only an exit status:** `RF-46`'s build exited 0, deployed, and couldn't run. Every entry, not one story: the defect class is a broken lazily loaded chunk, and each story is its own chunk.
- **In the gate,** because the build was broken for three months unseen, and the owner wants a pull request that breaks it to be refused. **In `verify.yml`, not beside it:** the required check stays `verify`, each event builds once, and no second file has to keep the same Node and pins.

**Not adopted.**

- **`docs.yml` kept for `deploy`** beside a `docs` job in `verify.yml`, **a second required check** for `docs.yml`'s build, **a reusable-workflow call**, and **`deploy` needing `verify`**: the [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) §The decision gives the reasons.
- **Pinning by tag,** which the repository's settings refuse.

**Dated 2026-11-16 by the architect: implemented on pull request #29** at `fc3b89680`, not yet merged ([report](findings-1/findings-1-report.md) §1). A fresh clone's `docs-build` failed before and passes after. On #29, `build` passed and `deploy` was skipped (runs 43875177531, and 43895450612 at the head). The `github-pages` environment allows only `main`.

- **The handoff's actionlint check is waived for this unit.** The unit had no container runtime and no actionlint binary, and the session's policy refused a download. The check would add little:
  - GitHub refuses a workflow file with an unknown key or a malformed expression before any job starts, and #29's runs got past that check;
  - the two `run:` steps hold no shell logic;
  - the architect read the file's four expressions.
- **Not yet read:** `deploy`'s first run, after the merge. The coordinator reads it.

**Dated 2026-11-17: merged** as `4e85ac046` (#29). On that push, _Publish Docs_ 44013920978 built and deployed: the first deployment since the repair.

**What it said before the amendment of 2026-11-17.**

- The title said _"The docs workflow builds on every ready pull request and deploys only from `main`, in `RD-6`'s environment"_.
- Property 1 listed the triggers itself, which were the same as `verify.yml`'s. Property 2 named the jobs `build` and `deploy`.
- Property 3 said: _"The runner is named `ubuntu-24.04`. The Node major is named in the workflow and is the one `verify.yml` names, so changing one means changing both. Every action is pinned to a full commit hash, the same hash `verify.yml` uses for the same action where both use it."_
- Property 5 said: _"**Outside the gate.** `verify` doesn't need the docs build. A failing docs build shows on the pull request and doesn't block its merge, until the owner decides otherwise (the findings unit's owner question 2)."_
- _Not adopted_ said: _"**A docs job in `verify`,** without the owner's decision. The gate's scope is the owner's (O1 to O8 in the [CI design](ci-verification-1/ci-verification-design.md))."_
- **Why it changed:** the owner's answer, after the docs build passed and deployed on `main`.

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

Tier B. `der-5`, Review Swarm; carried as `TE-F40`. `test-architecture.md` §CI policy states that every pull request gates on the verification suite; `.github/workflows/` contains `docs.yml` alone, on `push` to `main` and `workflow_dispatch`. **Open**, and dispositioned by RD-2: the policy is accepted and the mechanism is owed. Nothing about the repository's actual enforcement has changed, so this row closes when RD-2's four deliverables land and not before. **Dated 2026-11-16:** the mechanism is designed (`RD-6` to `RD-9`) and unimplemented. The row stays open until the owner's branch rule is on. **Closed 2026-11-16 by the architect:** `RD-2` is met. The workflow runs on every push to `main` and every ready pull request, and the branch rule requires its `verify` check (`RD-6`'s status). `test-architecture.md` §CI policy states the gate as it runs.

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

Tier B. Consolidator-derived at closure. `TE-D21` removes `memory.current` as a gate, and `TE-F44` corrects `TE-F37`'s "it is met" as false on that axis — but three sites in the same document at head still read the ceiling on both axes: `TE-D14`'s settling demonstration for the browser page bound ("Four wins if it clears the ceiling on **both** axes"), and two closure statements that the requirement "is met on both axes". As written the bound-4 arm can never win, because one of the two axes it must clear is one `TE-F44` establishes cannot be cleared at any commit. ~~**Open, routed to the architect.**~~ **Closed** 2026-09-28 by owner direction, records only: TE-D21 is applied at every site in the architecture record that still read `memory.current` as a requirement. `TE-D14`'s demonstration now reads the bound-4 arm against `oom_kill`, peak anonymous memory at or below 13 107 MiB, and peak anonymous memory within 5 % of an alternated bound-2 arm at baselines within 500 MiB, with `memory.current` reported and deciding nothing; the ground beside it, both closure statements, demonstration 1's result and a corrections bullet carry the same correction, each dated beside the wording it corrects. This is the shape RF-9 records in the register — a correction not carried to every site that states the corrected fact — in the architecture document rather than in the ledger, and resolving it means changing what `TE-D14` requires.

#### RF-22 — Demonstration 20's status is stated two ways in one document

Tier B. Consolidator-derived at closure. The demonstration item reads **"Not discharged."** and describes the `browser.ui` / `deviceScaleFactor` conflict in the present tense, and a corrections bullet repeats that it is un-discharged; a later section records both of its clauses as discharged by this range. The defect the item describes is not in the tree — `ui: isDebug` was removed at `783c97665` — and the discharge was independently re-verified at `30f6ff2e8`. ~~**Open, routed to the architect**, because which statement stands is the record owner's to say.~~ **Closed** 2026-09-28 by owner direction, records only: the discharge stands. The item's status and its corrections bullet are struck and kept, and the item now records the discharge on the CDP evidence already in the record — both clauses driven by the implementation's rem-4 and re-driven by the lifecycle-and-budget review's. Verified here at `f3455c027` by reading all three sites and the shipped factory.

#### RF-23 — The root `Justfile` still counts 15 test projects

Tier C. `integrity-3`, drag2's `d208-final` round, refused by that package's register as the wrong family. `Justfile:48` says the root configuration contributes _the same 15 projects_ the per-package configurations do, and `createWorkspaceTestConfig` now lists 16, since drag2 gained `shipped`. The claim it supports, that coverage is unchanged, still holds. **Open.** Required property: a counted statement about the test projects matches `createWorkspaceTestConfig`. It is a repository-level edit and no package's decision waits for it. **Routed 2026-11-16** to the [findings unit](findings-1/findings-1-handoff.md). At `275ad0f5c` the comment says _"15 projects"_, and the count also depends on `MX_TEST_ENGINES` and `MX_TEST_VISUAL` now.

- **Closed 2026-11-16 by the architect** on `repo/findings-1` at `fc3b89680` (#29, not yet merged). `Justfile:46`–`:53` describes what the root configuration contributes, with no count ([findings report](findings-1/findings-1-report.md) §2).

#### RF-24 — Two `.scripts/` compiler errors abort TypeDoc, so drag2's four `docs.node` rows see nothing

Tier B: an instrument the repository relies on is blind. Reported as information by both passes of drag2's `d208-final` round, and registered by [`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §30.7. TypeDoc exits with code 3 on `.scripts/vitest-config.ts:181` and `.scripts/vitest-one-shot.ts:34` before it reaches the surface, so these rows are red and cannot detect an unresolved reference: _should resolve every reference a public type makes_ and the closure rows for the kernel, ordinary and free-drag tiers. Blame puts both lines before `6905af249`. With `--skipErrorChecking --treatWarningsAsErrors` all four configurations exit clean at drag2's `bd3613d5f`, which is one tree's reading, not a repair. ~~**Open.**~~ **Closed 2026-11-05 at `1da64ed9c`** (see the end of this entry). Required property: these rows report on the published surface. No package's decision waits for it, and a merge carries the red rows. **Dated 2026-11-04:** drag2's owner made this a gate before that branch's merge, after D-209's acceptance ([`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §32.1), so that merge no longer carries them. **Dated 2026-11-04:** handed off at §34.9 of the same record. Scratch readings there show the `browser.api` block is the trap: moving it to `test.api` as Vitest's deprecation notice says fails 21 CDP rows, and deleting it with an optional call on `browser.provider` makes the four rows pass.

**Closed 2026-11-05** (§35.2 of the same record). The block was dead, as read at both trees, and `browser.provider` is closed only if present. A fresh recheck showed each tier's row reddening alone on a leak in that tier, and TypeDoc's negative control exits 4. `.scripts/` compiles.

#### RF-25 — `drag2`'s two React browser test files do not load, because `react` and `react-dom` resolve to different versions

Tier B: a test instrument the package relies on does not run. Minted 2026-11-04 from drag2's owner's ordering ([`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §32.1). `tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` fail to import. As `packages/drag2` resolves them, `react` is 19.3.1, through the root's `overrides`, and `react-dom` is 19.2.7, through the package's own pin. That reading is the only cause established, and no fix was tried. **Open.** Required property: both files load and run under one coherent React version. It is a gate before drag2's merge, after D-209's acceptance. **Dated 2026-11-04:** handed off at [`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §34.9. The cause is now read directly: the import throws _Incompatible React versions_. With one `react-dom` in a scratch tree, and the optimizer cache cleared, both files load and all 14 rows pass.

**Closed 2026-11-05 at `b046aff8a`** (§35.2 of the same record). `drag2` pins both to 19.3.1, and both files load and run under one version. The nested `scheduler` left with the nested `react-dom`, which is the only other lockfile change.

#### RF-26 — A root run installs 17 one-shot reporters and closes each provider 17 times per boundary

Tier B: a run whose rows all pass exits 1. `reviewer-1`, [`verification-restored-recheck-claude.md`](../packages/drag2/.plan/reviews/fin-review2/verification-restored-recheck-claude.md), registered at [`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §35.4. **A regression against `main`,** where one close per boundary runs under Vitest 4.1.10. It enters with `01d88645f`, on `drag2/fin-review2`. The cause is read at RD-3. **Open, a gate before that branch's merge,** handed off at §35.9. Required property: a root run releases each provider once per boundary, and a real close failure stays loud.

**Closed 2026-11-05 at `45ccefa4b`** (§36.1 of the same record). One instance and one close per boundary, counted directly through the root and every package config, and removing the line brings back 17 evaluations and 16 notices. A close failure at a boundary is loud as RD-3 defines it. A close failure in the final group was not forced.

#### RF-27 — `tproc`'s `DB/index.node` test does not load under Vitest 5

Tier B: a test that passes at `main` no longer runs. Found by the same recheck, registered at §35.5 of the same record. `vi.unmock` sits inside the `it`, which 4.1.10 warns about and 5.0.5 refuses. **A regression against `main`,** from `01d88645f`. **Open, a gate before that branch's merge,** handed off at §35.9. Required property: the file loads and its row passes.

**Closed 2026-11-05 at `18f3e959f`** (§36.1 of the same record). The row passes through `tproc`'s config and the root's. The line's position and its presence both have a control that bites.

#### RF-28 — A failed `drag2` build misreports itself and stops every package in a root run

Tier B: a build error names the wrong cause and hides unrelated results. `reviewer-2`, the same recheck, registered at §35.6 of the same record. **A regression against `main`, from F-447's repair at `39e32b58d`.** The run prints `No test files found` and a `TypeError`, and neither the build's output nor its failure appears. **Open, a gate before that branch's merge,** handed off at §35.9 under RD-4. Required property: a failed build names itself and carries its output, reddens its own project, and leaves every other project's results standing.

**Closed 2026-11-05 at `c95212956`** (§36.1 of the same record). Syntax error, a throwing hook, exit 7, `SIGKILL` and a child that can't start each raise in all 26 node files, and the other six packages' results match a clean run. RD-4's limit stands: a throw the setup can't foresee still ends the run.

#### RF-29 — The root run fails at `main` on rows nothing owns

Tier B: `just test` cannot exit 0, so a clean root run is not something the repository can currently read. Registered 2026-11-05 at §35.3 of the same record. **Present at `main` at `bfd2832db`, not caused by `drag2/fin-review2`:**

- **`tproc`, `TokenPackageProcessor` _should apply inheritance and render declarations_.** Every recorded run, and `test-execution-1`'s records call it pre-existing at `7aeaff260`. It expects `container.color` and receives only `state-layer.opacity`.
- **`material-x`, `radio.visual` _should match the selection state matrix_, 29 pixels.** Intermittent, and it passes alone.
- **`drag2`, `size.node` _should fill exactly the slots the assembler fills_, 5 s timeout.** Failed at `main` and at that branch's `c867a14d0`, and has not been seen since. Not explained.

None has been looked into. **Open.** Required property: a root run on a clean tree can exit 0. **Whether these block that branch's merge is the owner's** (§35.8). `F-412` keeps its own row.

**Dated 2026-11-16:** at `a8726c57d` the `tproc` row still fails, the `radio.visual` row passed once, and the `drag2` row left with drag2 (`RD-8`'s reading). `RD-8` handles each remaining row before the branch rule is on.

**Dated 2026-11-16, by the CI verification unit** ([report](ci-verification-1/ci-verification-report.md) §6): both remaining rows are **repaired in the tests, at `f0ec37881`**, under `RD-8` property 2. Neither is disabled.

- **`tproc`:** the row expected `state('hovered')` to keep `container.color`. `TokenPackage.state` is documented as deduped against what the state inherits (`TokenPackage.ts:61`, `ExtensionManager.ts:161`), and `hovered` inherits `container.color: red` from `default`. The expectation now holds only `state-layer.opacity`. A regression in the deduping still fails the row.
- **`radio.visual`:** the pointer stayed where an earlier test, possibly in another file in the same page, had left it. When that spot was over the unchecked radio, the screenshot showed it hovered. The failing capture is pixel-identical to one taken with that radio hovered on purpose. `packages/material-x/tests/support/browser-setup.ts` now moves the pointer to the page's top-left corner before each test. A scratch test that leaves the pointer there fails the row without the reset and passes with it.
- The required property, a root run on a clean tree that exits 0, held in five Chromium runs of the root suite with coverage and without `measurement` rows, on a fresh clone of `f0ec37881`.

**Closed 2026-11-16 by the architect.** Its rows are repaired at `f0ec37881` and are on `main` through #27 (`275ad0f5c`), and `verify` passed there in every engine (run 43865448668). A local root `npx just test` still exits 1, on `drag:DRF-48`'s measurement row, which runs locally under `RD-7` property 2. That row isn't one of this finding's, and `DRF-48` carries it.

#### RF-30 — The one-shot refusal says every `--sequence.*` flag erases the configured order

Tier C: a message overstates what a flag does, and nothing goes wrong because of it. `reviewer-2`, [`verification-regressions-recheck-claude.md`](../packages/drag2/.plan/reviews/fin-review2/verification-regressions-recheck-claude.md), registered at [`request-application-claude.md`](../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §36.5. `.scripts/vitest-one-shot.ts`'s group refusal ends: _A --sequence.\* flag on the command line replaces the configured sequence object wholesale and erases it._ That has been untrue since Vitest 5, at `01d88645f`: CLI options merge deeply, so `--sequence.shuffle`, `.concurrent`, `.seed` and `.hooks` leave each project's order alone, and `--sequence.groupOrder` gives every project the same value. The refusal still fires where it should. **Open, and not a merge gate.** Required property: the refusal states what a command-line flag does at the Vitest version in use. It is one sentence in one file, and it can land on either side of the merge. **Routed 2026-11-16** to the [findings unit](findings-1/findings-1-handoff.md). The sentence is unchanged at `275ad0f5c` (`.scripts/vitest-one-shot.ts:110`).

- **Closed 2026-11-16 by the architect** on `repo/findings-1` at `fc3b89680` (#29, not yet merged). The refusal (`.scripts/vitest-one-shot.ts:109`–`:111`) says that a `--sequence.groupOrder` flag gives every project that value, and that other `--sequence.*` flags leave a project's order alone. Both were read against Vitest 5.1.0 ([reading](findings-1/checks/rf30-one-shot-refusal.txt), [findings report](findings-1/findings-1-report.md) §2).

#### RF-31 — After the dependency update, `.scripts/tsdown-library.ts` fails to typecheck

Tier C, **closed at `27c60a9ac`** on `drag/size`. Read by the architect on 2026-11-14 from drag's [final cleanup report](../packages/drag/.plan/final-cleanup-report.md) §`repo:RF-31` and its [independent proof](../packages/drag/.plan/reviews/final-cleanup/proof-reviewer.md) §`repo:RF-31` (drag's §Disposition of the final cleanup). The owner approved the unit on 2026-11-14 as part of drag's final cleanup, in place of the repository unit routed below. Registered by the architect on 2026-11-13 from drag's [slot array report](../packages/drag/.plan/slot-array-report.md) at `690769539` ([output](../packages/drag/.plan/measurements/2026-11-13-slot-array-typecheck.txt)). Before closure: open.

- **Current behavior:** `npx just typecheck` from `packages/drag` exits 1, on one error that it reports at `706b91481` and at `5ec3b4b2d` alike: `.scripts/tsdown-library.ts(53,11)`, TS2322. `constructLibraryTsdownPlugins` returns `Rolldown.Plugin[]`, and the `vite` `Plugin` it holds isn't assignable to it, because the `load` hook's `options` parameter types differ (`LoadExtraOptions` against `{ ssr?: boolean }`).
- **When it started:** drag's typecheck passed at `b50204f66` ([`mangle-selection-report.md`](../packages/drag/.plan/mangle-selection-report.md)). `.scripts/tsdown-library.ts` hasn't changed since then. `31bac1381` updated `vite` to 8.3.8 and `rolldown` to 1.3.2. **The update is the inferred cause.** No run separates the two packages.
- **Reach:** the file is imported by the `tsdown.config.ts` of `core`, `tproc`, `drag`, `drag2` and `box-quad`. Only drag's typecheck was observed.
- **Why it is a problem:** each typecheck that includes the file exits 1 at every base, so a unit can show only that it adds no error, not that the typecheck passes.
- **Routed** to a repository cleanup unit that follows up `31bac1381`, for an `implementer`, which the owner starts. It isn't drag's work.
- **Required property:** the shared library plugin list typechecks with the installed `vite` and `rolldown`, with no cast that hides a real hook mismatch, and the build's output is unchanged.
- **The cause, confirmed at closure:** Vite 8.3.8's `Plugin` types the `load` options as `{ ssr? }`, and Rolldown 1.3.2's `LoadExtraOptions` has `rawId` and `attributes`. The two types share no property, so the weak-type check fails. One copy of `rolldown` is installed. No implemented hook was at fault. The error was in the four plugins' declared types. **The reach was wider than registered:** every tsdown consumer, and `material-x` through `.scripts/tsdown-component.ts`.
- **The fix:** `viteTraitsPlugin`, `constructCSSStyles`, `constructHTMLTemplate` and `constructCSSTokens` each return `Plugin & RolldownPlugin`, and each object literal ends with `satisfies Plugin`. There is no cast and no dependency or lockfile change.
- **The required property holds at `27c60a9ac`:**
  - `box-quad`, `core`, `tproc`, `vite-custom-element-assets`, `vite-traits-plugin`, `material-x` and the root `tsconfig` typecheck with exit 0. drag reports only drag2's two `TS2724` (box-quad's `BQ-12`), and drag2 has its four known errors;
  - 1,920 built files across the six tsdown consumers are byte-identical to `f9e56fe7d`'s, both plugins' `index.js` are identical, and the edited plugin sources emit identical JavaScript;
  - **one published declaration changes:** `@ydinjs/vite-traits-plugin` (0.1.0, not private) declares `viteTraitsPlugin(): Plugin$1 & Plugin` and imports `rolldown`, which is its dependency at 1.3.2. The intersection is assignable to Vite's `Plugin`, so a consumer typed against `Plugin` is unaffected. It is accepted as the fix's form.
- **What the type check guarantees.** In the fix's form, in a program that loads Vite's types:
  - **It rejects** a Rolldown-typed hook whose parameters can't take Rolldown's arguments (P4). Vite's type alone accepts the same hook (P5);
  - **it adds nothing shown for results:** P6's transform result is rejected by Vite's own type too;
  - **P7, the weak-type check:** through an intersection target TypeScript doesn't apply it. A `load` hook that declares Vite's `options?: { ssr?: boolean }` passes, and under tsdown `options.ssr` reads `undefined`, so a hook that branches on it takes its non-SSR path. P8's second `satisfies RolldownPlugin` would apply the check, and would also reject the plugins' Vite-only members;
  - **hook context:** Vite 8.3.8 augments Rolldown's `MinimalPluginContext` with `environment`, and Rolldown 1.3.2 neither declares nor supplies it. A hook that reads `this.environment` typechecks in the fix's form (Q1, Q2), under P8's form (Q5) and typed as `RolldownPlugin` alone (Q6), and under Rolldown alone the member is `undefined` ([probe](../packages/drag/.plan/reviews/final-cleanup/proof-reviewer-probes/rf31-context.txt)). **No form of the check in a program that loads Vite's types catches it.** It isn't caused by the fix's form;
  - **not mismatches:** Vite-only hooks (`config`, `configResolved`, `handleHotUpdate`) are checked against Vite's type only, and Rolldown never calls them (Q3). Rolldown's resolve options have no `scan` (Q4).
- **What makes the current hooks compatible is an audit, not the check.** The proof read every implemented hook at `27c60a9ac`. Their context members are `this.resolve`, `this.addWatchFile`, `this.warn` and `this.fs.readFile`, each declared by Rolldown's own `PluginContext` or `MinimalPluginContext`. The one options parameter in use, `constructHTMLTemplate`'s `resolveId`, is read through `'scan' in options`, and no `load` handler declares its options. So neither P7 nor the context gap hides a real hook mismatch in this code, and the required property's "no cast that hides a real hook mismatch" holds. **The audit is of `27c60a9ac`:** for a hook added or changed later that reads `options.ssr` in `load` or a Vite-only context member, the check reports nothing, and its compatibility under tsdown has to be shown another way. Nothing is registered for it, because no current hook is affected.

#### RF-32 — The two Vite plugin packages' lint exits non-zero

Tier C, **closed 2026-11-16** (below). Before closure: open. Registered by the architect on 2026-11-14 from drag's [final cleanup report](../packages/drag/.plan/final-cleanup-report.md) §`repo:RF-31` and its [proof](../packages/drag/.plan/reviews/final-cleanup/proof-reviewer.md) §The report's claims (drag's §Disposition of the final cleanup).

- **Current behavior** at `ea706c49d`, whose code is `27c60a9ac`'s ([output](../packages/drag/.plan/measurements/2026-11-14-final-cleanup-disposition-plugin-lint.txt)):
  - **`@ydinjs/vite-custom-element-assets`:** oxlint reports two `no-multi-assign` errors, at `src/css/generation.ts:256` and `:257`, so `npx just lint` stops there and exits 1. ESLint, which the recipe doesn't reach, reports seven more: `require-unicode-regexp` at `src/css/css.ts:31` and `src/index.ts:237` and `:238`, and `camelcase` at `src/html.ts:20` to `:23`;
  - **`@ydinjs/vite-traits-plugin`:** oxlint reports none, and ESLint reports one `no-restricted-syntax` (`for..in`) at `src/analyze.ts:85`.
- **No line `27c60a9ac` changed carries one.** The report saw the oxlint errors and three of the ESLint errors at `f9e56fe7d`. The four source files last changed at `a9c323f6a`. Which tool update introduced each rule's errors, and whether `main` has them, isn't established.
- **Why it is a problem:** each package's lint exits 1 at every base, so a unit that touches either package can show only that it adds no error, as `drag:DRF-38` was.
- **Required property:** both packages' lint exits 0, with no rule turned off and no disable comment, and the emitted JavaScript keeps its behavior. The `camelcase` sites are option keys passed to another library, so their runtime names stay.
- **Routed** to a repository cleanup unit for an `implementer`, which the owner starts. It isn't drag's work and doesn't gate drag's pull request. **Return to the architect** if a fix needs a rule turned off, a disable comment, or a change to a runtime name.
- **Dated 2026-11-16: two ESLint rules that re-decide the oxlint configuration** are turned off by `RD-11`. Each one is either allowed in `.oxlintrc.json` or enforced by oxlint. That amends the required property for those two rules only.
- **Dated 2026-11-16: names that another program reads** pass through `RD-10`'s exact allow list. That amends the required property for these names only: _"no rule turned off and no disable comment"_ still holds, and `camelcase` stays on. The four `html.ts` keys are such names.
- **Dated 2026-11-16: re-routed** to the CI verification unit ([handoff](ci-verification-1/ci-verification-handoff.md)), because the gate's `static` job runs every package's lint (`RD-8` property 2). At `a8726c57d`, lint fails in all eight packages, not only these two. The required property and the return condition stand.
- **Closed 2026-11-16 by the architect.** The CI unit repaired both packages' errors under `RD-8` property 2 ([report](ci-verification-1/ci-verification-report.md) §5), with `RD-10` and `RD-11`, and no disable comment. The `static` job runs every package's lint, and it passed on `main` at `275ad0f5c` (run 43865448668). Three repairs change the emitted JavaScript with no change in behavior, which the handoff's ruling on `reviewer-4` accepts ([handoff](ci-verification-1/ci-verification-handoff.md) §Remediating the feature-proof review).

#### RF-33 — In Firefox, focusing an `mx-button` doesn't delegate focus to its native button

Tier C since 2026-11-16 (below), before that Tier B; **open**. Registered on 2026-11-16 by the CI verification unit ([report](ci-verification-1/ci-verification-report.md) §6), under `RD-8` property 4. **Disabled in Firefox only,** as expected failures (`it.fails`), and the marking cites this address.

- **The rows,** in `packages/material-x/tests/`:
  - `button/button.browser.test.ts`: `mx-button` › "should delegate focus to the native button" and `mx-icon-button` › the same title;
  - `button-group/button-group.browser.test.ts`: `mx-connected-button-group roving tabindex` › "should move the tab stop to the next item on ArrowRight" and "should move the tab stop to the last item on End".
- **The failure:** in Playwright's Firefox 159.0, `element.focus()` on an `mx-button` host, whose shadow root has `delegatesFocus: true`, leaves `document.activeElement` on `body` and `shadowRoot.activeElement` `null`. The button-group rows focus a button and then press a key, so the key never reaches the group and the tab stop stays where it was. All four fail in every one of five local runs and in CI.
- **What is established:** a plain host with `delegatesFocus: true` and a `<button>` in its shadow root delegates focus in the same Firefox. Calling `focus()` on the native button directly focuses it. Neither a frame of layout before `focus()` nor a click that gives the document focus changes the result. So the cause is in what `mx-button` renders or sets, and isn't the test's. **The exact cause is not established.**
- **Required property:** in Firefox, `focus()` on an `mx-button` or `mx-icon-button` host focuses its native button, as in Chromium, and the four rows pass there without their marking.
- **Routed** as a material-x product unit, which the owner orders. The CI unit doesn't change product source.
- **Routed 2026-11-16** to the [findings unit](findings-1/findings-1-handoff.md), which the owner authorized. Read by the architect at `275ad0f5c`: every `mx-button` and `mx-icon-button` host is form-associated and calls `attachInternals()` (`material-x/src/button/button.ts:73`, `core/src/element.ts:205`), and the plain host that delegates focus in the same Firefox does neither. That is the first candidate, not a cause.
- **Ruled 2026-11-16 by the architect,** on the findings unit's elimination, relayed by the coordinator. It was read locally in Firefox 159, and the CI reading is pending.
  - **The cause, as read:** `:host { display: contents }` (`button/styles/default/main.styles.css:51`, `split/main.styles.css:2`). The attached internals, form association, the template and the slots each still delegate. The smallest reproduction is a plain host with `delegatesFocus: true`, a `<button>` and that one rule: `focus()` leaves focus on `body` in Firefox, and delegates in Chromium.
  - **Why it's Firefox's deviation:** HTML's focusing steps take a delegating host to its focus delegate, and they put no _being rendered_ condition on the host.
  - **Wider reach:** the same host rule is on FAB (`fab/styles/default/main.styles.css:5`) and list items (`list/styles/item/main.styles.css:22`), and interactive list items delegate focus (`ListInteractiveItemCore.ts:50`).
  - **The repair is accepted.** Forward `focus()` from the host to its native control, under the handoff's item 4 as amended the same day. The other ways are worse:
    - changing the host's `display` changes layout in every engine;
    - leaving the rows disabled leaves keyboard roving in a connected button group broken in Firefox.
  - **The forward adds no public type.** Its signature is `HTMLElement.prototype.focus`'s, so the declared member restates an inherited one, and no assignment changes.
  - **The required property is widened** to every material-x element whose host has `display: contents` and whose shadow root delegates focus: in Firefox, `focus()` on the host focuses the element that delegation focuses in Chromium.
  - **What the forward doesn't cover:** a path that the browser takes without calling `focus()` on the host, such as the host's `autofocus`. The report reads each such path, and the architect decides what stays open here.
  - **A report to Mozilla** is the owner's to file, with the unit's smallest reproduction. When one exists, this entry links it.
- **Dated 2026-11-16: confirmed in CI,** relayed by the coordinator. In the `firefox` job, a host with `display: contents` doesn't delegate, and the same host delegates without the rule and with `display: inline`. Chromium delegates in all three. `Tab` reaches the native button in both engines. The ruling's condition is met.
- **Dated 2026-11-16 by the architect: the forward meets the widened property, and the entry stays open for what the forward doesn't cover,** on the [findings report](findings-1/findings-1-report.md) §4 at `fc3b89680`, relayed by the coordinator. It is Tier C from here, because keyboard roving in a connected button group works in Firefox.
  - **Met:** `forwardFocus` (`material-x/src/core/utils/useCore.ts:17`–`:28`) is called by `ButtonCore` and `ListInteractiveItemCore`, which covers the seven elements whose host is `display: contents` and delegates focus. The four markings are removed. The new rows pass in three `firefox` runs ([reading](findings-1/checks/firefox-three-runs.txt)).
  - **Open: Firefox's own delegation.** One row, `mx-button` › _"should delegate focus to the native button through the shadow root alone"_, bypasses the forward. It is marked `it.fails` in Firefox and cites this entry. When it passes there, the forward and the marking are removed.
  - **Open: `autofocus` on these hosts doesn't focus in Firefox** (the report's fresh-document reading, `RF33A`). The forward can't cover it, because `autofocus` doesn't call `focus()`. There is no product workaround: a component that focused itself would duplicate the browser's `autofocus` algorithm, which has conditions of its own.
  - **Required property, from here:** the watching row passes in Firefox, and the forward is then removed. Until then, this entry names `autofocus` in Firefox as a known gap.
  - **The report to Mozilla** is the owner's to file, with the findings report §4's reproduction. This entry links it once it is filed.

- **Dated 2026-11-17 by the architect: the forward's shape changes before merge,** on the findings unit's [feature-proof review](reviews/findings-1/feature-proof-claude.md), `reviewer-2` and `reviewer-4`, relayed by the coordinator.
  - **The deviation:** `forwardFocus` assigns `host.focus` in each constructor (`material-x/src/core/utils/useCore.ts:25`), so each of the seven hosts has an own, writable `focus`. The ruling above assumed a declared member: _"the declared member restates an inherited one, and no assignment changes."_ The own property shadows a subclass's `focus()`, and `super.focus()` in such a subclass skips the forward, which in Firefox focuses nothing.
  - **Subclassing is valid use, so no owner decision is needed.** Each component class is its entry's default export, its type lets a subclass override `focus()`, and nothing published excludes that. Under CONTRIBUTING §1.1, a precondition written now to exclude it would be the change wearing a contract term. A library-wide rule on subclassing would be a contract decision of its own, and it wouldn't change this ruling, because the declared member is the ruling's own premise.
  - **The required property gains:** `focus` is a method of material-x's classes, not an own property of an instance. A subclass's own `focus()` is called, and `super.focus()` in it reaches the control. The [findings handoff](findings-1/findings-1-handoff.md)'s item 8, step 1, implements it.
  - **A control that can't take focus:** the report says that focus stays where it was. That holds by HTML's focusing steps, but it was derived, not read. Item 8, step 2, adds the rows.
- **Dated 2026-11-17 on the owner's direction: the forward is a trait while it ships,** relayed by the coordinator. The owner knows that it is a Firefox workaround, which goes when the watching row passes.
  - **How:** one trait made with core's generic `trait` (`@ydinjs/core/traits/primitives.js`), which declares `focus()`, and a `use*` function in its module, which registers the control. That is core's existing pattern of a trait and its `use*` function. It needs no change to `@ydinjs/core`, and the trait-flattener plugin's generic subset covers a trait like this one.
  - **In material-x, not in core.** The trait works around one engine for material-x's `display: contents` hosts, and it is meant to go. A core trait is published vocabulary, and under CONTRIBUTING §4 an exported value is a promise that can't be withdrawn.
  - **Its adopters** are exactly the seven hosts that register a control, through their own trait lists. It isn't in `BUTTON_CORE_TRAITS`, which the split button and the button groups share and which register no control.
  - **The required property above stands.** Each adopting class's type gains only the trait's brand, which isn't exported. The [findings handoff](findings-1/findings-1-handoff.md)'s _Item 8, step 1, amended 2026-11-17_ implements it.
- **Dated 2026-11-17 on the owner's decision: the per-class form ships, and the trait waits for `RF-44`,** relayed by the coordinator.
  - **The stop:** `vite-traits-plugin` doesn't flatten the trait, and it keeps each adopter's whole composition at runtime (`RF-44`). The owner rejected accepting that.
  - **What ships:** the parked attempt's form at `891d672ec`. A module `WeakMap` holds each host's control, one `focusControl` focuses it, and each of the seven classes declares `override focus()`, which only calls `focusControl`. That meets the required property above. The seven declarations repeat one call, and the body exists once.
  - **The trait note above is superseded.** Its reasons for material-x over core still hold for the later move. The trait is parked at `92e13f9d6`. When the plugin flattens class-based traits, the forward moves to it under `RF-44`, unless Firefox's delegation has removed the forward first.

- **Dated 2026-11-17 by the architect: the per-class form is in,** on the [findings report](findings-1/findings-1-report.md) §9 at `d756e4f4f`, relayed by the coordinator.
  - **Met:** the seven classes declare `focus()`, and each one only calls `focusControl` (`7c09927f0`). `Object.hasOwn(host, 'focus')` is false for each of them. Subclass rows for `mx-button` and `mx-list-button-item` pass in every engine. The build prints no flattener warning.
  - **A control that can't take focus is now read:** `focus()` on a disabled `mx-button` or `mx-list-button-item` leaves focus on the element that had it, in Chromium, Firefox and Safari (`a941ed888`).
  - **The registering function keeps the name `forwardFocus`.** It is accepted: the call states which control the host forwards to, and `focusControl` does the focusing.
  - **What stays open is unchanged:** the watching row, which still fails as expected in Firefox, and `autofocus` in Firefox.

#### RF-34 — In Firefox, the rotated and scaled box size is recovered to about 0.008 px, not 1e-4

Tier C, **closed 2026-11-16** (below). Registered on 2026-11-16 by the CI verification unit ([report](ci-verification-1/ci-verification-report.md) §6), under `RD-8` property 4. Until it closed, the row was **disabled in Firefox only,** as an expected failure, and the marking cited this address.

- **The row:** `packages/box-quad/tests/coordinates.browser.test.ts`, `coordinates numeric precision` › "should derive a rotated and scaled size to within a ten-thousandth".
- **The failure:** in Firefox 159.0 the size recovered from `getClientRects()` through the matrix determinant is off by 0.0076 px, against the row's tolerance of 0.0001. Chromium's residual is about 3e-5, as the row's comment says. It fails in every one of five local runs and in CI.
- **The inferred cause:** Firefox reports client rects in its layout unit of 1/60 px, so the un-projected size carries up to that rounding. Not confirmed by a probe.
- **Required property:** box-quad states the precision its recovered size has in each engine it supports, and the row asserts that precision in each engine and passes there. Whether the tolerance becomes per engine or the measurement changes is box-quad's decision.
- **Routed** to the owner of box-quad. The CI unit doesn't change product source.
- **Decided 2026-11-16 by the architect, for box-quad:** the measurement stays, because box-quad's contract keeps the browser's fractional border edges (`01-public-api.md`, _Fractional used border-box extents_). The tolerance rule in `contract/02-behavior-scenarios.md` is amended to admit an engine's measured client-rect precision. **Routed** to the [findings unit](findings-1/findings-1-handoff.md), which first confirms the inferred cause.
- **Ruled 2026-11-16 by the architect: the cause is confirmed,** on the findings unit's reading of run 43872551455, relayed by the coordinator. The architect recomputed the reading's arithmetic.
  - **The reading,** in the `firefox` job, Firefox 159.0, from the row's own fixture (20 × 10, `rotate(30deg) scale(1.5)`). Each non-integer edge is k/60 rounded to a multiple of 2^-14: right = 1559/60 + 4.07e-6 = 425711/16384. So Firefox quantizes to its 1/60 px layout unit, then reports at a resolution of 2^-14 px. In Chromium, the same edges are multiples of neither 1/60 nor 1/64.
  - **The bound.** The recovery inverts the matrix of absolute values, whose determinant is 1.125. A rounding of ±(q/2 + r/2) on each edge, with q = 1/60 and r = 2^-14, bounds each recovered dimension to 1.821 (q + r) = 0.0305 px for this fixture. The observed errors are +0.0077 in width and −0.0099 in height.
  - **The handoff's test of _"a multiple of 1/60 to within 1e-9"_ was too narrow.** It didn't allow for a reporting resolution coarser than 1e-9. The reading meets its purpose, which was to show 1/60 quantization, so item 5's stop isn't reached.
  - The handoff's item 5, as amended the same day, counts both q and r. The contract's tolerance rule names the reporting resolution.
- **Closed 2026-11-16 by the architect** on `repo/findings-1` at `fc3b89680` (#29, not yet merged), on the [findings report](findings-1/findings-1-report.md) §5. The row is now titled _"should derive a rotated and scaled size to within the engine precision"_ (`coordinates.browser.test.ts:246`) and has no marking.
  - **What it asserts:** 1e-4 in Chromium and Safari. In Firefox, 1e-4 plus the bound derived next to the fixture, which is 0.0305 px for this fixture.
  - **Where it passes:** in three `firefox` runs, and in Chromium and Safari.
  - **The contract:** box-quad's support matrix §2.3 names each engine's quantum and reporting resolution.

#### RF-35 — `mx-radio` and `mx-checkbox` draw no focus state layer, which Material's tokens define

Tier C, **closed 2026-11-17** (below). Before closure: open. Registered on 2026-11-16 by the CI verification unit ([report](ci-verification-1/ci-verification-report.md) §The `radio-focused` review), from the owner's review of baseline proposal #28. **No row is disabled:** the visual rows show what the components draw.

- **What the owner saw:** #28's `radio-focused` shows the focus outline only. The baseline it replaces also showed the grey state-layer circle.
- **Why the circle was there:** the circle is the ripple's `::before`, which only `:host(:hover)` shows (`src/core/animations/ripple/styles/main.styles.css`). Nothing in `src/radio/styles/default/main.styles.css` draws a state layer on focus. Before `f0ec37881` the pointer stayed where the previous row left it, and the hovered row before `radio-focused` left it over the same spot. A scratch witness shows `radio.matches(':hover')` true at the focused row's screenshot without the pointer reset and false with it ([output](ci-verification-1/checks/radio-focused-hover.txt)). Across the visual suite, the same reset removes an unintended hover from `radio-focused`, `checkbox-focused`, `button-focused` and, depending on file order, `checkbox-states` ([output](ci-verification-1/checks/visual-rows-hover.txt)).
- **The gap:** Material's token tables define `md.comp.radio-button.selected.focus.state-layer.color` and `.opacity`, the same for `unselected`, and `md.comp.checkbox.{selected,error,…}.focus.state-layer.*`. The components render no focus state layer, so a keyboard-focused radio or checkbox shows the outline alone. The old baselines hid that.
- **Required property:** each of `mx-radio`, `mx-checkbox` and `mx-button` either draws the focus state layer its tokens define, or the record states why it doesn't. Its focused visual row is recorded again through `repo:RD-13` when that changes.
- **Routed** as a material-x product question for the owner. The CI unit doesn't change product source.
- **Routed 2026-11-16** to the [findings unit](findings-1/findings-1-handoff.md). Its item for this finding waits for the owner's answer, which the handoff asks for.
- **Dated 2026-11-16: the owner answered yes,** relayed by the coordinator. `mx-radio`, `mx-checkbox` and `mx-button` draw the focus state layer that their tokens define.
- **Ruled 2026-11-16 by the architect: under hover and keyboard focus together, the focus layer shows,** on the findings unit's question under the handoff's item 7, relayed by the coordinator.
  - **The tokens:** the focused state-layer opacity is 0.1, the hovered one 0.08, and colors are per state and per selection.
  - **Why focus shows.** material-x already states the precedence: its states are ordered `default`, `hovered`, `focused`, `pressed`, `disabled` (`button/styles/utils.ts:20`, and radio's and checkbox's `utils.ts`). The compiled CSS emits focused after hovered.
  - **Why the precedence fails today.** A focused value equal to the default is deduplicated away. So with only `--_ripple-opacity`, hover's 0.08 would show under focus, against that order. That outcome comes from the deduplication, and no one chose it, so it isn't an owner decision.
  - **Its own variables.** The focused state's tokens are emitted under `:focus-within`, which a mouse click also sets, and the layer's trigger is the keyboard one. So the focus layer takes the focused state's color and opacity through variables of its own. The existing state-layer variables keep their values under every state.
  - The handoff's item 7, as amended the same day, states the properties.
- **Ruled 2026-11-16 by the architect: the trigger in radio and checkbox,** on the findings unit's second question under item 7, relayed by the coordinator.
  - **The question:** the ruled trigger `:host:has(.input:focus-visible)` doesn't match in Firefox 159, read locally. So in Firefox, `mx-radio` and `mx-checkbox` draw neither the layer nor, already today, their keyboard focus indicator (`RF-39`).
  - **The ruling:** in radio and checkbox, the indicator and the layer share one keyboard-focus trigger written inside the shadow tree, from the input to a later sibling: `.input:focus-visible ~ …`. That is option (iii) of the question, and the handoff's item 7, as amended again the same day, states it.
  - **Not (i):** it would knowingly leave a missing focus indicator in a supported engine, when the fix is in the lines item 7 already changes.
  - **Not (ii):** it would split the layer's trigger from the indicator's, against property 2 of item 7's amendment, and leave the indicator missing.
  - **Not a custom state set by script:** CSS expresses the trigger in every engine without a per-instance listener. material-x's existing fallback of that kind has no stylesheet that reads it (`RF-40`).
- **Dated 2026-11-16: Safari's Tab doesn't reach these controls.** In run 43886020747 at `c34cb01d7`, the 9 keyboard-focus rows fail in Safari only. The product isn't the cause: Safari's default Tab skips buttons, checkboxes and radios. `RD-12` property 10, amended the same day, has the `safari` job turn on _"Press Tab to highlight each item"_. The handoff's item 7, amended a third time, implements it.
- **Dated 2026-11-16 by the architect: met in Chromium and Firefox,** on the [findings report](findings-1/findings-1-report.md) §7 at `fc3b89680`, relayed by the coordinator.
  - **What holds:** each component draws the focus layer from its own token selection, on the keyboard-focus trigger and over hover. The spec rows read the layer against the tokens. A mutation that renames the selectors fails the 8 rows that depend on them.
  - **In Safari:** the hover and click rows pass. The keyboard rows are `RF-42`'s.
  - **The focused visual rows were recorded again** (run 43886019999), and no baseline changed. The comparator's per-pixel threshold absorbs a layer at 0.1 opacity (`RF-41`). That meets this entry's _recorded again_ clause: the recording ran, and each baseline matches the rendering within the comparator's threshold.
  - **It closes** when the Safari keyboard rows are resolved under `RF-42`, on the owner's decision.

- **Dated 2026-11-17 by the architect: the scope of _met_, and the rows,** on the findings unit's [feature-proof review](reviews/findings-1/feature-proof-claude.md), `reviewer-1` and `reviewer-3`, relayed by the coordinator.
  - **Scope.** The note above covers `mx-button`, `mx-checkbox` and `mx-radio`, the elements this entry's property names. The report's §7 says that the button's focus rule is in the sheet that every button adopts. That is true of the stylesheet, not of what is drawn: in `mx-switch-button` and `mx-switch-icon-button`, `.host` is a `<span>` and never matches `:focus-visible`, so they draw no focus layer. That is `RF-43`, outside this entry.
  - **Rows.** The rows read only `mx-button`'s filled colour and the unchecked checkbox and radio. The selected states, the other button colours and the icon button's mappings were correct at `fc3b89680` by the reviewer's rendering, but no row fails if one of them is dropped, and the visual layer can't see them (`RF-41`). The [findings handoff](findings-1/findings-1-handoff.md)'s item 8, step 3, adds a row for each.
  - **It closes** when `RF-42`'s rows are resolved and item 8's rows pass. This replaces the closing condition above.

- **Closed 2026-11-17 by the architect** on `repo/findings-1` at `d756e4f4f` (#29, not yet merged), on the [findings report](findings-1/findings-1-report.md) §8 and §9, relayed by the coordinator. Both closing conditions hold.
  - **`RF-42`'s rows are resolved:** in Safari, the 9 keyboard rows reach their controls with Option-Tab and pass (`RF-42`).
  - **Item 8's rows pass:** 10 _keyboard focus_ rows read the selected states and each other button and icon-button colour against their own focused tokens. All 28 rows pass in every engine (`verify` 44008539924 at `a81841cb0`, and 44010115020 at `d756e4f4f`). With every mapping dropped, all 10 fail. With only its own mapping dropped, 9 fail ([reading](findings-1/checks/item8-focus-layer-mutation.txt)). Two rows pass with only their own mapping dropped, because another declaration the host adopts writes the same value, as ruled in the handoff. `mx-icon-button` filled reads the button default's mapping, which tproc's deduplication leaves in its place. `mx-icon-button` tonal reads the button's tonal mapping, which `mx-icon-button` also adopts. Mutation B dropped that mapping as well, so the tonal row failed there. _Corrected 2026-11-17 on the targeted recheck's `recheck-1` ([disposition](findings-1/findings-1-handoff.md#disposition-of-the-targeted-recheck-at-14d342778)); the closure stands._
  - **The mutation reading's fixture** set an inert `data-default` attribute on that row's element, which `a941ed888` dropped. No material-x source reads that attribute, so the reading holds for the rows as merged.
  - **Not covered here:** the switch buttons (`RF-43`), and what the screenshots can't see (`RF-41`).

#### RF-36 — In Safari, `useReorderable` intermittently keeps the landed visual in the top layer past its rows' wait

Tier C, **open**. Registered on 2026-11-16 by the CI verification unit ([report](ci-verification-1/ci-verification-report.md) §Safari's inventory over three runs), under `RD-8` properties 1 and 4. **Skipped in Safari only** (`it.skipIf`), and the marking cites this address.

- **The rows,** in `packages/core/tests/traits/reorderable.browser.test.ts`, `useReorderable`:
  - "should take the visual out of the top layer once the drag lands";
  - "should not dispatch a reorder for a no-op drop", added on 2026-11-16 after run 43843800063.
- **The engine:** Safari 27.2 on macOS 26.7.2, the `macos-26` runner, through the WebdriverIO provider.
- **The failures:** each row drags the list's sole item and waits up to 1,000 ms for `item.matches(':popover-open')` to be false. In attempt 2 of run 43830910625 at `ddf72ec4e`, the first row's wait gave up (`expected true to be falsy`, 1,026 ms); it passed in attempts 1 and 3 and in run 43827320614. In run 43843800063 at `6fd774bc4`, the second row's wait gave up the same way (1,015 ms); it had passed in the five Safari runs before. Eight more rows in the file use the same 1,000 ms wait.
- **What is known:** the row registers no reorder listener, so after the 200 ms landing the session waits core's 500 ms `COMMIT_TIMEOUT` (`src/traits/reorderable.ts`) before returning the visual: at least 700 ms against the row's 1,000 ms. A late timer or frame in Safari would cross it. **The cause is not established:** that is an inference, not a reading.
- **Required property:** the rows pass in Safari in every run, with a wait that states the landing and the commit grace it covers.
- **Routed** to core's owner. The CI unit doesn't change the row's wait or core's source.
- **Dated 2026-11-16, read by the architect at `275ad0f5c`: the inference covers only the first row.** A no-op drop proposes nothing, so `land()` animates the item home and tears down with no commit grace (`src/traits/reorderable.ts:630`–`:650`). The second row's wait gave up at about 1,000 ms against a 200 ms landing, so something else held the visual: a late `animation.finished`, a late pointer release or a throttled window are candidates, and none is read. **Routed** to the [findings unit](findings-1/findings-1-handoff.md), which reads the timings first.
- **Dated 2026-11-16 by the architect: the probe caught no slow landing, and it refutes the commit-grace inference,** on the [findings report](findings-1/findings-1-report.md) §3, relayed by the coordinator.
  - **The reading:** the probe repeated both rows' gesture: the sole item, moved 90 px and released, with no reorder listener. In 75 Safari landings over five attempts, the visual left the top layer 216 to 256 ms after the gesture began. The window was visible and focused, and frames came 14 to 19 ms apart ([attempt 1](findings-1/checks/rf36-safari-timings-attempt-1.txt) to [5](findings-1/checks/rf36-safari-timings-attempt-5.txt)).
  - **What it refutes:** a sole item proposes nothing, so neither row waits the 500 ms commit grace. The _"at least 700 ms"_ above is false for both rows.
  - **What the failures were:** each held the visual about four times as long as the slowest landing the probe read. That is a stall, as with drag's two Safari rows under `RD-12`, not a narrow margin crossed.
  - **The skips stay,** and the waits don't change.
  - **Required property, amended:** the rows pass in Safari in every run, with a wait that states the landing it covers. (It said: _"…with a wait that states the landing and the commit grace it covers."_)
  - **The next reading** needs the failing condition itself. It runs the two rows unskipped, logging the probe's timestamps, in the full `browser/core` Safari project. It needs enough full Safari runs to catch a failure: about one run in six failed. It runs outside the gate, so that `verify` doesn't become intermittent. **Routed** to core's owner as its own unit, which the owner orders.

#### RF-37 — At a browser run's start, Vite warns that it can't analyze a dynamic import in the pre-bundled `vite/module-runner`

Tier C, **closed 2026-11-16** (below), low priority. Registered on 2026-11-16 by the architect, on the owner's observation relayed by the coordinator. **It doesn't affect results.** On the owner's direction, it is handled after the CI unit, not inside it. Nothing for the CI unit to do.

- **What the owner saw:** in the `safari` job's log, at the start of a Vitest 5.1.0 run, Vite warns _"The above dynamic import cannot be analyzed by Vite"_. The warning is for `import(filepath)` in `runExternalModule`, inside `packages/material-x/.vite/vitest/<hash>/deps/vitest_n_vite_module-runner.js`, the pre-bundled `vite/module-runner`.
- **Read by the architect in the devcontainer:** five of material-x's local Vitest pre-bundle directories list `"vitest > vite/module-runner"` in `deps/_metadata.json`. One of them is dated 2026-11-04, before `RD-12` added the WebdriverIO provider. So the pre-bundling doesn't need that provider, and the provider, the first suspect, is less likely to be the cause. This reads the pre-bundle, not the warning.
- **Not established:**
  - whether the `chromium` and `firefox` jobs, or a local Chromium run, print the warning;
  - what puts `vite/module-runner` into the browser's dependency pre-bundle: Vitest itself, a project's `optimizeDeps`, or a provider.
- **Required property:** a browser test run starts without this warning, or the record states the warning's source and why it stays. Silencing the warning without naming its source doesn't meet this property.
- **Routed** after the CI unit, for the owner to order.
- **Routed 2026-11-16** to the [findings unit](findings-1/findings-1-handoff.md), which the owner authorized.
- **Closed 2026-11-16 by the architect** on `repo/findings-1` at `fc3b89680` (#29, not yet merged), on the [findings report](findings-1/findings-1-report.md) §6.
  - **The source:** `@vitest/browser` 5.1.0 adds `vite/module-runner` to the browser's pre-bundle. Vite warns about a dynamic import it can't analyze only when the importer is outside `node_modules`. The repository's `cacheDir: '.vite'` put the pre-bundle there.
  - **The change:** with that line removed, Vite uses `node_modules/.vite`. The pre-bundle's entries are unchanged. CI printed the warning 0 times in each engine ([counts](findings-1/checks/rf37-ci-warning-counts.txt)).
  - **What stays:** `.gitignore`'s `.vite` lines and `package-files.ts`'s `-e .vite` stay while existing checkouts still hold old `.vite` directories. Removing them later needs no decision.

#### RF-38 — The recording workflow's write-token job writes through a symbolic link that the recorded commit places at a baseline path

Tier B, **closed 2026-11-16** (below). Before closure: open, and it blocked the merge of pull request #27. Registered on 2026-11-16 by the architect from the feature-proof review's `reviewer-1` ([review](reviews/ci-verification-1/feature-proof-claude.md)), read at `397e4ec14`.

- **The contract it breaks:** `RD-13` property 3. `propose` holds `contents: write`, `pull-requests: write` and `actions: write`, and must run no code from the repository.
- **The behavior:** `propose` checks out the recorded commit, then copies each accepted artifact file over that working tree with `cp` and runs `git add` (`baselines.yml:99`–`:130`). The path filter reads only the path's text. A branch that commits a symbolic link at `packages/x/tests/__screenshots__/a.png` that points to `.git/config` has `cp` write the artifact's content into `.git/config`. A `core.fsmonitor` key there then runs a command at `git add`, with `GH_TOKEN` in its environment.
- **What is established:** the reviewer reproduced it with the job's own commands in a scratch repository (git 2.47.3): the path passed the filter, and `git add` ran the command. The architect confirmed that GNU `cp` 9.7 writes through a destination symbolic link.
- **Reach:** only a branch in this repository, run through the label or `workflow_dispatch`, so the author has write access. That author could already change the workflow file in the branch (`RD-13`'s amended reason). The link makes the same access reachable through a change that doesn't touch `.github/`, which is the change the person adding the label reads.
- **Required property:** `RD-13` property 3's _What `propose` writes_.
- **Routed** to the implementer on `ci/verification`, by the [handoff](ci-verification-1/ci-verification-handoff.md)'s _Remediating the feature-proof review_.
- **Closed 2026-11-16 by the architect.** `propose` checks out nothing: it writes the proposal as git objects in a bare repository of its own and refuses a symbolic link in the artifact or in an accepted path of the recorded commit ([report](ci-verification-1/ci-verification-report.md) §Remediating the feature-proof review, with its witness). The reviewer's targeted recheck found `reviewer-1` to `reviewer-3` resolved ([review](reviews/ci-verification-1/feature-proof-claude.md)). It is on `main` through #27 (`275ad0f5c`). A proposal with a changed baseline hasn't run on GitHub yet, only in the witness.

#### RF-39 — In Firefox, `mx-radio` and `mx-checkbox` show no keyboard focus indicator

Tier B, **closed 2026-11-17** (below). Before closure: open. Registered on 2026-11-16 by the architect, from the findings unit's reading under its item 7, relayed by the coordinator. It predates that unit.

- **The rules:** `radio/styles/default/main.styles.css:55` and `checkbox/styles/default/main.styles.css:64` draw the indicator under `:host:has(.input:focus-visible)`.
- **The reading,** local, in Firefox 159.0 and Chromium, not yet in CI. After `Tab` onto `mx-radio`, the input is focused and matches `:focus-visible` in both engines. `:host:has(.input:focus-visible)` matches in Chromium and not in Firefox. `:host(:has(…))` matches in neither, and `:host(:focus-within)` matches in both. Radio's indicator outline is drawn in Chromium and absent in Firefox.
- **Why it is a problem:** a keyboard user in Firefox can't see which radio or checkbox has focus.
- **Required property:** in every engine the gate runs, keyboard focus on `mx-radio` or `mx-checkbox` draws the indicator that its tokens define, and a mouse click doesn't. In Chromium, the indicator's position and size don't change.
- **Routed** to the [findings unit](findings-1/findings-1-handoff.md)'s item 7, as amended on 2026-11-16, because the fix is the trigger that item 7's focus layer shares.
- **Dated 2026-11-16 by the architect: met in Chromium and Firefox,** on the [findings report](findings-1/findings-1-report.md) §7 at `fc3b89680`.
  - **Where the indicator draws now:** radio's under `.input:focus-visible ~ .off`. Checkbox's on a new `.indicator` span after the input, with `aria-hidden` and no `part`.
  - **Chromium is unchanged:** the box, outline, offset and radius match ([reading](findings-1/checks/rf39-indicator-before-after.txt)).
  - **In Firefox:** the indicator rows pass in the `firefox` job.
  - **It closes** with `RF-35`, when the Safari keyboard rows are resolved under `RF-42`.

- **Closed 2026-11-17 by the architect,** with `RF-35`, at `d756e4f4f`. In Safari, the indicator rows now reach their controls with Option-Tab and pass, so the indicator is read in every engine.

#### RF-40 — material-x's `:host:has()` fallback sets custom states that no stylesheet reads

Tier C, **open**. Registered on 2026-11-16 by the architect, while ruling on `RF-39`.

- **The code:** `useHasSlottedPolyfill` (`material-x/src/core/utils/polyfills.ts:22`) tests whether `:host:has(slot)` matches (`HOST_HAS_SUPPORTED`, `:10`). Where it doesn't, it sets the custom states `has-<slot>` on the host.
- **Read by the architect at `5a0bba69b`:** no stylesheet or source under `packages/material-x/src/` or `packages/core/src/` reads `:state(has-`.
- **Who relies on it:** text-field's lead, trail, prefix, suffix, support and counter rules (`text-field/styles/default/main.styles.css:141`–`:176`) and list items' support and overline rules (`list/styles/item/main.styles.css:35`–`:43`, `:184`) select on `:host:has(… :has-slotted)`.
- **Not established:**
  - whether Firefox renders those components differently;
  - what `HOST_HAS_SUPPORTED` reads in Firefox;
  - whether Firefox supports `:has-slotted`.
- **Required property:** in every engine the gate runs, each `:host:has()` rule in material-x applies, or the component renders the same without it. A fallback that nothing reads is either completed or removed.
- **Routed** to the owner to order. It isn't in the findings unit's scope as authorized. The architect recommends a reading first, in Firefox CI, of the two components with and without slotted content.

#### RF-41 — The screenshot comparator doesn't see a state layer at the tokens' opacities

Tier C, **open**. Registered on 2026-11-16 by the architect, from the [findings report](findings-1/findings-1-report.md) §7 (run 43886019999 at `c34cb01d7`). **No row is disabled.**

- **The comparator:** Vitest 5.1.0's screenshot comparison is pixelmatch with `threshold: 0.1`, and it allows no mismatched pixel (`@vitest/browser/dist/index.js:1617`–`:1635`). The repository sets no comparator option.
- **What it missed:** the findings unit added a focus state layer at 0.1 opacity to `mx-button`, `mx-radio` and `mx-checkbox`. The labeled recording passed all 19 visual rows and proposed nothing. So `button-focused`, `radio-focused` and `checkbox-focused` still show no layer, while the components draw one.
- **Why, by the architect's arithmetic:** at threshold 0.1, pixelmatch's limit is a YIQ distance of 35215 × 0.1², about 352.
  - A 10% near-black layer over a near-white surface moves each channel by about 22, a distance of about 245.
  - A 10% primary layer over the button's surface gives about 113.
  - Both are under the limit, and the hover layer at 0.08 is smaller still.
- **Why it matters:** a visual row titled _hovered_ or _focused_ doesn't prove its state layer, so a change that removes the layer passes. The spec-contract rows read the layer's color and opacity against the tokens, so the layer is covered, but only by them. A stored baseline can differ from the rendering by a whole state layer.
- **Required property:** one of these holds:
  - the visual layer detects a state layer at the tokens' lowest opacity on the fixtures' surfaces, with no false failure in `RD-9`'s pinned environment;
  - or `.agents/docs/test-architecture.md` states what the visual layer can't see, and names the spec rows as the coverage of state layers.
- **Routed** to the owner, for a later unit. **It doesn't block the findings unit.** Item 7's check holds: the gate's `chromium` job matches every baseline, and no other baseline changes.

#### RF-42 — Under `safaridriver`, Tab doesn't reach buttons, checkboxes or radios, and Safari's Tab preference doesn't change that

Tier C, **closed 2026-11-17** (below). Before closure: open, and the 9 rows failed in Safari, unmarked, which kept `verify` red on #29. Registered on 2026-11-16 by the architect, from the [findings report](findings-1/findings-1-report.md) §7, relayed by the coordinator.

- **The rows:** in `packages/material-x/tests/core/focus-layer.spec.browser.test.ts`, for each of `mx-button`, `mx-checkbox` and `mx-radio`:
  - _"keyboard focus"_;
  - _"keyboard focus with hover"_;
  - _"draw the focus indicator on keyboard focus"_.
- **The failure:** each row presses Tab, then asserts that the host and its native control have focus. In Safari, focus stays on `<body>` (run 43886020747 at `c34cb01d7`; `RF-33`'s `RF33T` reading before it).
- **What is established:**
  - WebKit's default Tab skips buttons, checkboxes and radios.
  - `RD-12` property 10's preference was written in both domains and read back as set, and Tab still didn't reach a button ([reading 1](findings-1/checks/rd12-tab-reading-1.txt), [reading 2](findings-1/checks/rd12-tab-reading-2.txt)).
- **Not established:** whether Safari under `safaridriver` reads the preference at all, and whether WebDriver's key actions take the path that the preference governs.
- **Why the product isn't implicated:** the trigger is the same CSS in every engine. Safari's hover and click rows pass. The rows fail at the reach assertion, before the layer is read.
- **Required property:** each of the 9 rows either reads keyboard focus in Safari through real keyboard input, or is disabled there under `RD-8` with this entry as its finding.
- **Routed** to the owner. The options and the architect's recommendation are in the [findings handoff](findings-1/findings-1-handoff.md)'s _Disposition of the report at `fc3b89680`_.

- **Closed 2026-11-17 by the architect** on `repo/findings-1` at `d756e4f4f`, on the [findings report](findings-1/findings-1-report.md) §8, relayed by the coordinator.
  - **The owner chose option (a).** In Safari only, the rows press Option-Tab. One constant in `focus-layer.spec.browser.test.ts` chooses the key by engine, and its comment cites this entry (`964af56ab`).
  - **The reading:** in `verify` 44003141576 the 9 rows pass at the unchanged reach assertion, and every other Safari project's counts equal run 43895450645's ([reading](findings-1/checks/rf42-option-tab-safari.txt)). The fallback, `it.fails` in Safari, wasn't taken. The rows that item 8 added use the same key and pass in Safari.
  - **What stays unread:** why Safari's Tab preference has no effect under `safaridriver`. Nothing depends on it now. `RD-12` property 10 records the key.

#### RF-43 — `mx-switch-button` and `mx-switch-icon-button` break the `.host` invariant, so they draw no focus state layer on keyboard focus

Tier C, **open**. Registered on 2026-11-17 by the architect, from the findings unit's [feature-proof review](reviews/findings-1/feature-proof-claude.md), `reviewer-1` (code at `fc3b89680`), relayed by the coordinator. **No row is disabled:** no row reads a switch button's focus layer.

- **What is drawn:** both elements build through `useButtonCore`, so they adopt `button/styles/default/main.styles.css` and its focus-layer rule `:host .host:focus-visible > .ripple::before` (`:111`). In their templates, `.host` is a `<span>`, and the focusable element is the `<input class="control">` before it (`switch-button.tpl.html`, `switch-icon-button.tpl.html`). So the rule never matches. Their keyboard focus indicator draws on `.control:focus-visible + .host` (`button/styles/default/switch-control.styles.css:19`).
- **The tokens:** Material's tables define `md.comp.button.filled.selected.focused.state-layer.color` and its `unselected` counterpart (tproc's cached tables). No switch token package (`defaultSwitchTokens`, `elevatedSwitchTokens`, `tonalSwitchTokens`, `outlinedSwitchTokens`, `variantSwitchTokens`) declares a focus-layer variable.
- **Not a regression:** before the findings unit, no button drew a focus layer. That unit's scope, `RF-35`'s property, names `mx-button`, `mx-checkbox` and `mx-radio`.
- **Required property:** each switch button draws the focus state layer its tokens define, checked and unchecked, on its focus indicator's trigger, with the variables and the precedence that `RF-35`'s rulings set. Or the record states why it doesn't.
- **Routed** to the owner, as a material-x product unit. The architect recommends taking it with the next material-x unit: it reuses `RF-35`'s mechanism, and the rows of `focus-layer.spec.browser.test.ts` extend to it. **It doesn't block the findings unit.**
- **Widened 2026-11-17 on the owner's direction,** relayed by the coordinator. Until then, this entry's title was _"`mx-switch-button` and `mx-switch-icon-button` draw no focus state layer on keyboard focus"_.
  - **The invariant, as the owner stated it:** in every material-x component, `.host` is the shadow root's root element, and it is the element that takes focus. Shared rules and helpers depend on this, such as the focus layer and the focus forward. It wasn't written down before. It is now in [`architecture.md`](../.agents/docs/architecture.md) §Components.
  - **The violation:** in `switch-button.tpl.html` and `switch-icon-button.tpl.html`, the root is `<span class="interaction">`. It holds `<input class="control" part="control" type="checkbox" role="switch">` and, beside it, `<span class="host" part="impl">`. Both templates were added at `1bf5c7cf9` (2026-07-11) and haven't changed since. The missing focus layer is one consequence. Others are `useButtonCore`'s target `.control ?? .host` (`button/ButtonCore.ts:106`–`:108`), whose fallback exists for the switches, and the switches' own focus-indicator trigger, `.control:focus-visible + .host`.
  - **Required property,** in place of the one above. Each switch button's `.host` is its shadow root's root element and takes focus. It carries the switch's role and checked state. It draws the focus indicator and the focus state layer through the button family's shared rules, checked and unchecked, with the variables and the precedence of `RF-35`'s rulings. `part="impl"` and `part="control"` are public styling surface, so the unit states what each part names afterwards. The package is unreleased (`0.1.0`), so under CONTRIBUTING §8 no compatibility shape is kept.
  - **The audit, in the same unit.** It reads every other material-x template against the invariant. It also reads every rule and helper that keys on `.host` for what it assumes: that `.host` is the root, that it takes focus, and that it carries `impl`. For each divergence, the unit proposes a restructure or a stated exception. Exceptions amend the owner's invariant, so the owner decides them, on the architect's recommendation. The architect's starting facts, from the first element of each template at `964af56ab`, are not yet judged:
    - `.host` is the root and takes focus in `mx-button`, `mx-icon-button`, `mx-link-button`, `mx-fab`, `mx-list-button-item` and `mx-list-link-item`;
    - `.host` is the root but doesn't take focus in `mx-list-item` (a `<div>`) and the split button (an `<mx-connected-button-group>`);
    - there is no `.host` in `mx-checkbox` and `mx-radio` (the root is `.input`), in the text fields (`.input`, and the shared `text-field-core.tpl.html`), or in the button groups, `mx-icon` and `mx-list` (a `<slot>`);
    - [`accessibility.md`](../.agents/docs/accessibility.md) §Button says that the switch variants use a native `<button>`. Their templates use `<input type="checkbox">`.
  - **Routed** to the owner as the next material-x product unit, not pull request #29. It doesn't block the findings unit.

#### RF-44 — `vite-traits-plugin` flattens only descriptor traits, though its documentation says it flattens class-based ones

Tier C, **open**. Registered on 2026-11-17 by the architect, from the findings unit's item 8 stop, relayed by the coordinator. **No row is disabled.**

- **The documentation:** [`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) §Eligibility says that _"the supported generic subset accepts a direct pure transformer whose result is a class extending its parameter. It accepts public fields, constructors, methods, accessors…"_. §Trait IR says that normalization resolves _"descriptor-based and supported class-based traits"_.
- **The code:** `packages/vite-traits-plugin/src/analyze.ts` passes every trait in a composition to `normalizeDescriptorTrait` (`src/normalize.ts:340`). When that returns `null`, it bails with `unsupported-trait` (`analyze.ts:583`–`:598`). No path normalizes a class-based trait.
- **What it cost:** the findings unit's `FocusForwarding` trait (`implementer/item8-step1-trait-wip` at `92e13f9d6`) was a module-scoped `trait(base => class extends base { override focus(…) {…} }, brand)`, inside the documented subset. `npx just build-lib` in material-x warned seven times, and each adopter's whole composition was kept at runtime, not only that trait. So the forward ships in a per-class form (`RF-33`).
- **Required property:** one of these holds:
  - the plugin flattens the generic subset that §Eligibility describes, with the compatibility contract that the document states;
  - or the document states only what the plugin implements, and names class-based traits as retained.
- **Follow-up:** once the plugin flattens class-based traits, the `RF-33` forward moves to the trait parked at `92e13f9d6`, if the forward still ships.
- **Routed** to `vite-traits-plugin`'s owner. **It doesn't block** the findings unit or pull request #29.

#### RF-45 — material-x has no size measurement, so no budget covers its entries

Tier C, **open**. Registered on 2026-11-17 by the architect, from the [findings report](findings-1/findings-1-report.md) §9 (item 8, step 1), relayed by the coordinator. **No row is disabled.**

- **The gap:** the `measurements` job (`.github/workflows/verify.yml:149`) runs the rows tagged `measurement`, and material-x has none. Its report on #29 lists box-quad, core and drag only. So no material-x entry has a size reading in CI, or a budget.
- **What it cost:** item 8, step 1's _"a budget that fails is a stop"_ had nothing to read. The architect wrote that clause on the assumption that a budget existed. The implementer measured each entry locally instead: +63 minified bytes, and +2 to +23 brotli bytes, per entry ([reading](findings-1/checks/item8-step1-size.txt)). That reading stands in for the clause, and it is accepted. The growth is the cost of the form the owner chose.
- **Why it matters:** CONTRIBUTING §15 asks that every meaningful change be measured by composition, and §18 treats a budget as the instrument that makes a change visible. material-x's changes are measured only when a unit does it by hand.
- **Required property:** one of these holds:
  - material-x's public entries have rows in the `measurements` job, each with a budget;
  - or the record states that material-x is measured by hand for each change, and how.
- **Routed** to the owner. The repository's measurement tool is still a [brief](../.agents/docs/measure/brief.md), so it may supply the instrument. **It doesn't block** the findings unit.

#### RF-46 — The deployed docs site doesn't load: Vite's build under the forced `rolldown` 1.3.2 writes a malformed `__vitePreload` call

Tier B, **open**. Registered on 2026-11-17 by the architect, on the owner's report relayed by the coordinator. **It blocks nothing already merged, and the [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) repairs it.**

- **What the owner saw.** _Publish Docs_ 44013920978 built and deployed `4e85ac046` green, but <https://ausginer.github.io/material-x/> doesn't load its preview iframe. The console reports _"Uncaught SyntaxError: identifier starts immediately after numeric literal"_ at `vite-inject-mocker-entry.js:2:9198` and `iframe-DyV7uOsB.js:1026:649`. At each position, a 32-hex-digit token follows the preload call's dependency array: `[]2d7e7e1a443a24f2869c40dcb56dd1a2)` and `__vite__mapDeps([0,1,2,3,4,5])2658f4b9db9ad6bc0ae41c8f1ddbdb67)`.
- **The cause, read by the architect** ([reading](docs-gate-1/checks/rf46-rolldown-probe.txt)). A Vite app of two lines reproduces it outside Storybook. Every `__vitePreload` call comes out as `[]<32 hex>)`.
  - Vite 8.3.8 declares `rolldown` `~1.2.18`, and the root `overrides` forces `rolldown` to 1.3.2, the version `tsdown` 0.23.7 needs (`~1.3.0`).
  - A separate install of `vite@8.3.8` resolves `rolldown` 1.2.19 and writes correct calls. The same install with `rolldown` overridden to 1.3.2 writes the malformed ones.
  - So the defect is ours: a dependency was run outside its declared range. No upstream defect is established, and no upstream report is owed. `vite@8.4.0-beta.1` declares `~1.3.2`.
- **Since when:** `31bac1381` (2026-11-13) updated `vite` to 8.3.8 and `rolldown` to 1.3.2 together. The docs build was already failing for other reasons (`RD-14`'s reading), so nothing showed it. A local build of 2026-11-15 has the same token.
- **The reach:** every Vite application build in the repository with a dynamic import. That is the docs site, and any `vite build` a test or measurement runs. The libraries build with `tsdown`, which wants 1.3, so no published package is affected. The Vitest dev server doesn't write the preload call. **Why the gate didn't see it:** the docs build exits 0, and nothing loaded the built site.
- **Required property:**
  - Vite builds with a `rolldown` inside its own declared range, and every other consumer keeps the one it declares;
  - the built docs site loads every story and docs entry with no uncaught error, and a gate check proves it (`RD-14` property 6).

## Questions

#### RQ-1 — The `TE-` local register's decisions and design-pass findings have no canonical assignment

`architect-test-execution-model-r4.md` §The local register carries forty-odd rows whose `Canonical` column reads `unassigned`. This closure assigns `RF-1`…`RF-22` over the findings a **review pass** produced, and stops there for a reason that is not arbitrary: `TE-D12`…`TE-D21` are decisions, and RD-1 keeps the kind letter separate precisely because **only the architect mints one**; `TE-F1`…`TE-F35` are the design and challenge passes' own findings, which no review pass owns and which a consolidator numbering them would be allocating on someone else's behalf.

**What is owed** is one architect pass that mints `RD-` over the decision rows and `RF-` over the design-pass findings, continuing from the `RF-22` high-water mark this entry sets (**`RF-23` to `RF-25` were minted separately 2026-11-04 and `RF-26` to `RF-30` 2026-11-05, `RF-31` 2026-11-13, and `RF-32` 2026-11-14, so the next is `RF-33`**), and fills the `Canonical` column in that document's table. Until it is taken, a citation of any of those rows is document-local and resolves through the file rather than through `entry.ts`.