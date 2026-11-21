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

#### RD-6 — One workflow verifies every push to `main` and every ready pull request, in Chromium, Firefox and WebKit on a named runner, and one aggregate check gates merge

**Decided 2026-11-16 by the architect** on `ci/verification` at `a8726c57d`, on the owner's requirements relayed by the coordinator the same day ([design](ci-verification-1/ci-verification-design.md) §1, O1 to O8). **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it. It is `RD-2`'s deliverable 2, and it prepares deliverable 3, which the owner performs. Deliverable 1 is `RD-9`.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668. **The branch rule is on:** on 2026-11-16 the owner added `verify` from GitHub Actions as a required status check to the ruleset _Main protection_ (20963220), active on the default branch with no bypass actor, read back by the architect through the API. The ruleset also requires the branch to be up to date with `main`, which the [design](ci-verification-1/ci-verification-design.md) §5 step 5 called unnecessary; that is the owner's choice.

**Amended 2026-11-16, before implementation,** on the owner's direction relayed by the coordinator at `81d4c91b1` (O9 and O10 in the design): CI runs on a plain runner and doesn't pull the development image, and Chromium is Playwright's build. The title, property 2, property 4's third sentence, and the reasons about the image changed. What it said before is at the end.

**Amended 2026-11-16 by `RD-12`,** on the owner's correction (O13): the third engine is Safari on a macOS runner, not Playwright's WebKit. The title, properties 2, 3, 4, 6, 7 and 8, and two reasons changed. `RD-12` holds the readings, the provider and the reasons. What they said before is at the end.

**Amended 2026-11-17 by `RD-14`,** on the owner's answer to the findings unit's question 2, relayed by the coordinator: the docs build is a gate job. Properties 3, 8 and 9 changed. `RD-14` holds the reasons, and the [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) implements it. What they said before is at the end. **Unimplemented** until that handoff's pull request merges.

**Amended 2026-11-17 by `RD-12`,** on the owner's decision relayed by the coordinator: the third engine of the gate is Playwright's WebKit, and Safari runs weekly outside it. The title and properties 2, 3, 4, 7 and 8 changed. **Amended the same day by `RD-15`** (the `[noci]` marker): properties 3, 8 and 9. **Unimplemented** until the [CI-speed handoff](ci-speed-1/ci-speed-handoff.md)'s pull request merges. What they said before is at the end.

**Amended 2026-11-18 by `RF-51`,** recorded by the main slot's architect from slot `b`'s [declarations-check handoff](declarations-check-1/declarations-check-handoff.md), proposal 3: `static` also runs the published-declarations check that `RF-51`'s answer decided. Property 3 changed. **Unimplemented** until that handoff's pull request merges. What it said before is at the end.

**Amended 2026-11-18 by `RD-21`,** on the owner's choice relayed by the coordinator: the engines' system packages are fetched once by `system-deps` and installed offline. Properties 2 and 8 and one reason changed. **Unimplemented** until the [CI-deps handoff](ci-deps-1/ci-deps-handoff.md)'s pull request merges. What they said before is at the end.

**Amended 2026-11-19 by `RD-7`,** recorded by the architect from `reviewer-1` of `RF-65`'s [feature proof](reviews/size-base-1/feature-proof-claude.md) at `11017eaac`: the measurement job also adds `actions: read`, to find `main`'s stored size reading. Property 9 changed. `RD-7`'s amendment of the same day owed this change and didn't name it. **Unimplemented** until #72 merges. What it said before is at the end. **Implemented** by #72, merged 2026-11-19 as `359c87f8a` (dated by the architect with `RF-65`'s closure).

**Properties.**

1. **Triggers (O1).** A push to `main`; a `pull_request` event of type `opened`, `reopened`, `synchronize` or `ready_for_review`; and `workflow_dispatch`. Every job skips a draft pull request. No other trigger, and no `pull_request_target`. A newer run for the same pull request cancels the older one. A run for a push to `main` is never cancelled.
2. **The environment (O9, O13).** Every job runs on a GitHub-hosted runner named `ubuntu-24.04`. Safari's `macos-26` runner belongs to the Safari workflow, outside the gate (`RD-12` properties 6 and 12). Each label is named, not `*-latest`, so an operating system changes only by an edit. Each job uses the Node major version that the workflow names. **CI doesn't pull the development image, and no job runs in a container.** Chromium, Firefox and WebKit are the builds that the exact `playwright` dependency pins (`RD-9`). A job installs its engine's system packages offline from the cache that `system-deps` fills, falling back to `aube exec -- playwright install --with-deps <engine>`, and its browser with `aube exec -- playwright install <engine>` (`RD-21`). Screenshots are reproducible because of `RD-9`'s pinned visual environment, not because of the runner's operating system.
3. **The gate jobs.** `static` runs the root `just fmt-check`, `just lint`, `just typecheck` and `just typecheck-declarations` (`RF-51`). `chromium` runs the root suite, with every project, including node, declaration and visual. `firefox` and `webkit` run every browser project except visual in their engine (`RD-12` property 11). `docs` runs the root `just docs-build`, loads the built site with `just docs-smoke`, and uploads the Pages artifact (`RD-14`). **The three test jobs exclude `measurement` rows (`RD-7`).** In a run that `RD-15`'s marker reduces, only `records` runs, and the jobs above are skipped. Every job runs the repository's own recipes on a fresh checkout after `aube ci` (`RD-16`). If a recipe needs a step that a developer's tree happens to satisfy, the recipe is repaired. The workflow adds no private step.
4. **One engine selection (O2).** `MX_TEST_ENGINES`, a comma-separated list of `chromium`, `firefox`, `webkit` and `safari`, read by the shared factory in `.scripts/vitest-config.ts`. It defaults to `chromium`. Each browser project except visual is declared once per listed engine. A Chromium project keeps its name, and another engine's project is named `<name>/<engine>`. A non-Chromium project takes no Chromium launch arguments, and runs with `fileParallelism: false` and one worker, because a background page gets no input in Firefox, and Safari allows one session. WebKit does too unless `RD-12` property 11's reading allows file parallelism. A Safari project uses the WebdriverIO provider (`RD-12` properties 2 and 3). **It replaces `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`.** drag's `test-engines` recipe keeps its name and runs drag's browser and shipped projects in the engines that the variable lists. A local run is Chromium only (`RD-13` property 7).
5. **Visual runs in Chromium only.** Its baselines are per engine and platform, and only Chromium baselines exist. **The gate never writes, updates or approves a baseline.** The recording workflow proposes baselines in a pull request that the owner merges (`RD-13`). When `chromium` fails, the actual and diff images are uploaded as a workflow artifact.
6. **A row that needs an instrument that an engine's driver doesn't provide** runs only in the engines that provide it, by an engine condition, as drag's `isChromium` rows do. Chromium-only instruments are the DevTools Protocol, heap snapshots and `--expose-gc`. Safari's driver also lacks media emulation (`RD-12` properties 4 and 5). That limits the row's scope and doesn't disable it, so `RD-8` doesn't apply to it.
7. **Coverage (O4).** `chromium` runs with V8 coverage and uploads it to Codecov on every run. A failed upload fails the job. Codecov's project and patch statuses are `informational`, so a percentage never blocks a merge. Firefox and WebKit contribute no coverage, because the V8 provider cannot instrument them.
8. **The aggregate check.** `verify` needs `static`, `chromium`, `firefox`, `webkit` and `docs`, `RD-15`'s `scope` and `records`, and `RD-21`'s `system-deps`. It succeeds only if `scope` succeeded and every job of the mode that `scope` chose succeeded, while every other job was skipped (`RD-15` property 5). **It is the one check the branch rule requires,** so adding or splitting a job changes `verify`'s list and not the rule. A job not in `verify`'s list cannot block a merge.
9. **Permissions.** The workflow's token is `contents: read`. Only the measurement job adds `pull-requests: write` (`RD-7`). `actions: read` is added by `scope` (`RD-15`) and by the measurement job, which finds `main`'s stored size reading with it (`RD-7`). Only `deploy`, which runs for `main` alone, adds `pages: write` and `id-token: write` (`RD-14`). A third-party action is pinned to a full commit hash.

**Why.**

- **One aggregate check** keeps the branch rule stable while jobs change, and it makes a skipped or missing job a failure of `verify` instead of a check nobody required.
- **Plain runners, not a container,** on the owner's direction. The Linux jobs share one operating system, one Node version and one lockfile per run, so the only difference between `chromium` and `firefox` is the engine. `safari` also differs in operating system, because Safari exists only on macOS (`RD-12`). Playwright chooses each Linux engine's system libraries, and `RD-21` fetches them once per cache key, before the test jobs start, and installs them offline on each runner.
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

**What it said before the amendments of 2026-11-17 by `RD-12` and `RD-15`.**

- The title said _"in Chromium, Firefox and Safari on named runners"_.
- Property 2 said: _"Every job except `safari` runs on a GitHub-hosted runner named `ubuntu-24.04`, and `safari` runs on `macos-26` (`RD-12` property 6)."_ and _"Chromium and Firefox are the builds that the exact `playwright` dependency pins (`RD-9`), and a job installs its engine with `npx playwright install --with-deps <engine>`. Safari is the runner image's own and isn't pinned (`RD-12` property 7)."_
- Property 3 said: _"`firefox` and `safari` run every browser project except visual in their engine."_ and _"Every job runs the repository's own recipes on a fresh checkout after `npm ci`."_
- Property 4 listed _"`chromium`, `firefox` and `safari`"_ and said that a non-Chromium project runs serially _"because a background page gets no input in those engines"_.
- Property 7 said: _"Firefox and Safari contribute no coverage"_.
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox`, `safari` and `docs`, and succeeds only if each succeeded."_
- Property 9 named no `actions: read`.
- **Why it changed:** the owner's decision of 2026-11-17, which `RD-12`, `RD-15` and `RD-16` decide.

**What it said before the amendment of 2026-11-18 by `RF-51`.** Property 3 said: _"`static` runs the root `just fmt-check`, `just lint` and `just typecheck`."_ **Why it changed:** `RF-51`'s standing check, decided on the owner's condition that it needs no custom rule, runs in the gate after the build.

**What it said before `RD-13`.** Property 4 said: _"drag's `test-engines` recipe keeps its name and runs `chromium,firefox`, so its project names are `browser`, `browser/firefox`, `shipped` and `shipped/firefox`, which are `drag:DRO-18`'s selection. A local `just test` without the variable runs Chromium only, as it does today."_ Property 5 said: _"CI never writes, updates or approves a baseline."_ **Why it changed:** the owner's decisions (O14, O15), which `RD-13` decides.

**What it said before `RD-21`.**

- Property 2 said: _"Chromium, Firefox and WebKit are the builds that the exact `playwright` dependency pins (`RD-9`), and a job installs its engine with `npx playwright install --with-deps <engine>`."_
- Property 8 said: _"`verify` needs `static`, `chromium`, `firefox`, `webkit` and `docs`, and `RD-15`'s `scope` and `records`."_
- The reason about plain runners said: _"Playwright's installer adds each Linux engine's system libraries on the runner."_
- **Why it changed:** `RF-58`, a slow mirror timing out jobs before any test runs, which `RD-21` decides.

**What it said before `RD-7`'s amendment of 2026-11-19.** Property 9 said: _"Only the measurement job adds `pull-requests: write` (`RD-7`), only `scope` adds `actions: read` (`RD-15`), and only `deploy`, …"_ **Why it changed:** the merge base's size reading is `main`'s own, kept as an artifact, and a pull request's run needs `actions: read` to find and download it.

#### RD-7 — Size, allocation and speed checks notify and never fail the build

**Decided 2026-11-16 by the architect,** on O5 and O6 ([design](ci-verification-1/ci-verification-design.md) §1). **Unimplemented:** [`ci-verification-handoff.md`](ci-verification-1/ci-verification-handoff.md) implements it.

**Implemented 2026-11-16** by pull request #27, squash-merged to `main` as `275ad0f5c`. `verify` passed on that push, run 43865448668.

**Properties.**

1. **What a measurement row is.** A row whose verdict compares a quantity with a budget, a ceiling or a control figure: bytes of a bundle, bytes allocated, or time elapsed. **A row that asserts behavior is not a measurement,** even if it counts. Examples are a retention check (_should not retain …_) and a deterministic work count that a contract invariant states, such as `drag:DRI-17`'s layout reads and spatial searches. Those rows stay in the gate.
2. **Marking.** Each measurement row carries the Vitest tag `measurement`, which the shared factory declares. The gate's test jobs run with that tag filtered out. The measurement job runs only that tag. **A local `just test` runs every row, as it does today,** so `drag:DRD-68` property 5 stays true where it is stated: an over-ceiling row fails `npx just test` until the unit re-bases.
3. **The rows at this decision.** In `packages/drag/tests/size.node.test.ts`, each composition's ceiling and control verdict. Its graph verdict (`present`, `absent`) is `drag:DRI-18`'s and stays in the gate, so each composition's row splits into a graph row and a ceiling row. The assertions themselves don't change. In `packages/drag/tests/hot-path.browser.test.ts`, the two rows that bound bytes allocated per sample. **No speed row exists.** The implementer confirms there are no others.
4. **The measurement job is outside the gate.** `verify` doesn't need it. It concludes successfully whenever it ran to its report. An exceeded ceiling or a failing measurement row becomes a warning annotation and a line in the report, never a failed step. `continue-on-error` covers a crash, so even a broken measurement can't fail the workflow.
5. **The size comment (O5).** It reports every row that the root `just size` measures (`box-quad`, `core` and `material-x` through size-limit, `drag` through `bench/size/measure.ts`): the reading at the head, the reading at the merge base of the head and the pull request's base branch, the difference, and the row's limit at the head. Brotli for every row, and gzip where the instrument reports it. Rows that exist at one side only are marked added or removed. **The pull request's run measures the head. The merge base's reading is the one that `main`'s own `verify` run for that commit took, with that tree's instruments, and kept as an artifact of the run. The pull request's run builds no base.** A merge base for which no reading is stored gives "no base reading", the report says that none is stored, and the head is still reported. **A lookup that fails** (an API error, a rate limit, a missing permission, or a download that fails after the reading was found) gives "no base reading" too, and the report says that the lookup failed, not that none is stored. **A run that looks up no base,** a push or a manual run, says nothing about a stored reading. (The two sentences that open in bold type were added by the architect's amendment of 2026-11-19, below. Until the owner's amendment of that day, the sentences before them read: _"Both sides are measured in the same job, on the same runner, each tree with its own instruments. … A base tree whose instruments cannot produce the machine-readable reading gives "no base reading", and the head is still reported."_ The amendment of 2026-11-16 had changed _"in the same image"_ to _"in the same job, on the same runner"_.) The comment is one per pull request, identified by a hidden marker and updated on each run. It is posted only when the pull request comes from this repository. Otherwise, and on a push or a manual run, the report goes to the job summary only.
6. **The allocation result** is reported in the same comment and summary as each row's pass or fail, with its message.

**Noted 2026-11-18 by the architect, not substantive:** property 5's parenthesis gains `material-x`, whose size-limit rows `RD-24` adds and which land with #68. Until then it read _"`box-quad` and `core` through size-limit"_. The rule doesn't change.

**Dated 2026-11-18 by the architect:** the merge-base reading of property 5 has failed on every pull request since this decision was implemented, so no comment has shown a base or a difference. That is `RF-65`. **Closed 2026-11-19 by the architect:** `RF-65` is closed. #74's comment, on merge base `359c87f8a`, shows the base that `main`'s run stored and the difference for every row.

**Amended 2026-11-19 by the owner: the merge base's reading is `main`'s own, kept as an artifact of its run, and a pull request doesn't build its base.** Relayed by the coordinator and recorded by the architect, on the [base-reading plan](size-base-1/size-base-plan.md) for `RF-65` (issue #69) on `repo/size-base-1` at `ddbfbbdfd`. The owner had asked to keep `main`'s sizes in a store instead of building `main` again in every pull request, and he was ready to give up the comparison if no store worked. The plan weighed (a) a stored file, the wiki or an issue, (b) `main`'s own reading kept by CI, (c) no comparison, and (d) the repaired base build. The owner chose (b) with the workflow artifact: _"Yes, the artifact looks good. I could argue with the architect's conclusions or suggest fixes, like enabling the wiki and trying it, but why? If the artifact idea doesn't work out, we'll look again then."_ (translated).

- **What changes:** property 5's base reading and the last bullet of **Why**. The comment, its rows, its marks, the fork rule and properties 1 to 4 and 6 don't change. So this is an amendment of `RD-7`, not a new decision.
- **What it accepts:**
  - No base, and a comment that says so, when `main`'s run for the merge base stored no reading. That happens when the run was reduced (`RD-15`), hadn't uploaded yet, crashed, or is older than the 90 days that the repository keeps an artifact, and when the merge base isn't a `main` commit.
  - Two readings from two runs. A difference can include a change of the runner image or of Node's minor version between `main`'s run and the pull request's run.
- **Unimplemented:** the plan's [repair](size-base-1/size-base-plan.md#the-repair-for-b-with-the-artifact), properties 1 to 7, implements it on `repo/size-base-1`. `RF-65` closes on it. **Implemented** by #72, merged 2026-11-19 as `359c87f8a`. `main`'s push run 44456046120 stored the first reading, and #74's run 44457238397 compared with it (`RF-65`'s closure).
- **It also amends `RD-6` property 9:** the measurement job adds `actions: read`. That was recorded later the same day, from `reviewer-1` below.

**Amended 2026-11-19 by the architect, on `RF-65`'s [feature proof](reviews/size-base-1/feature-proof-claude.md) at `11017eaac`,** relayed by the coordinator. Property 5 states two cases that the owner's amendment left implicit. The owner's choice doesn't change.

- **`reviewer-1`, accepted, Tier C:** `RD-6` property 9 said that only `scope` adds `actions: read`. It is amended on this date.
- **`reviewer-2`, a record statement:** a push run's or a manual run's summary said that _"`main`'s run for the merge base stored no size reading"_. That run looks up no merge base, and on a push to `main` it is the run that stores the reading. Property 5 now says that such a run says nothing about a stored reading. The plan's implementation note, _"A push run's summary says the same"_, doesn't meet it. The implementer repairs it.
- **The proof's observation on a failed lookup: not acceptable, and repaired before #72 merges.** As implemented, an API error, a rate limit, a missing permission or a failed download gives the same notice and comment as a run that stored nothing.
  - That makes property 5's _"the report says that none is stored"_ false whenever a stored reading exists and the lookup fails.
  - If the lookup failed in every run, every comment would show "No base reading" as an expected absence. That is `RF-65`'s own failure mode, which went unnoticed from #27 to #68.
  - The plan's _"naming an instrument's failure"_, not adopted, was about the reading script. A failing script still fails its step, and its log shows it. A failing lookup changes only the comment's sentence, so the sentence must tell the cases apart.
  - **The required property** is property 5's sentence on a lookup that fails. A missing run, or a run whose artifact list has no unexpired `size-reading`, is a missing reading. Any call that fails is a failed lookup. The distinction doesn't depend on matching gh's error text. The job still succeeds in both cases (property 4).

**Why.**

- **A tag separates the rows without moving files,** and drag's size file holds graph rows that must keep gating. A separate project or file suffix would split `size.node.test.ts` across two files for the same compositions.
- **Locally nothing changes.** `DRD-68` makes an over-ceiling row stop a drag unit before release. That is a rule about drag's units, which run locally. CI notifies, as O6 asks.
- **The merge base, not the base branch's tip,** because the comment reports what this pull request changes, not what landed on `main` meanwhile.
- **The merge base's reading is the one `main`'s own run took,** because `main` measures every commit it verifies already, and the owner didn't want a second build of `main` in every pull request. The reading then depends on an artifact of an earlier run, which can be missing or expired, and the comment says so when it is. (Until the amendment of 2026-11-19: _"**Measuring both sides in one job** depends on no artifact from an earlier run, which can be missing or expired."_)

**Not adopted.**

- **Building the merge base in each pull request's run,** which property 5 required until 2026-11-19 and which the plan's option (d) repaired. The owner didn't want `main` built again in every pull request.
- **A committed file on `main`, the wiki, an issue, a cache entry, a third-party service, or no comparison:** the plan's [options](size-base-1/size-base-plan.md#options) and [recommendation](size-base-1/size-base-plan.md#recommendation).

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

1. **The inventory comes first.** The unit reads every failing row and check in each gate job, at its own base: Chromium and Firefox locally; WebKit, and the visual result on CI's operating system, in CI. A row counts as intermittent if it both fails and passes in five runs of its file. (**Amended 2026-11-17 by `RD-12`:** _"Safari"_ became WebKit, because Safari left the gate. A Safari failure is triaged under `RD-12` property 7.)
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

#### RD-12 — The gate's third engine is Playwright's WebKit on Linux, and real Safari runs outside the gate, weekly and on demand, on a macOS runner through Vitest's WebdriverIO provider

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

**Amended 2026-11-17 by the architect** on `repo/ci-speed-1` at `229829ef7`, on the owner's decision relayed by the coordinator the same day. **The required `verify` runs Chromium, Firefox and Playwright's WebKit, on Linux and headless. Real Safari leaves the gate** for a separate workflow that no rule requires, that runs weekly, and that anyone can start by hand on any branch or commit. The owner's words: _"что-то необязательное, которое не будет тормозить разработку … но и при этом останется как возможность прогнать его against the code и получить некий результат … weekly"_, and _"обязательно возможность ручного старта"_. **Sharding Safari is not adopted for now** (_"с шардами погоди"_). The title, properties 1, 6, 7 and 8, and two items of _Not adopted_ change in place, each with what it said before. Properties 11 and 12 are added. The Safari properties that the weekly workflow keeps (2 to 5, 9 and 10) are unchanged. `RD-6` changes with it, and `RD-15` and `RD-16` are decided in the same unit. **Unimplemented:** the [CI-speed handoff](ci-speed-1/ci-speed-handoff.md) implements it.

- **Why the gate moves to WebKit.** The `safari` job is the gate's longest, at about 12 minutes: 9.5 minutes of tests and about 2 of `npm ci` on macOS. Firefox takes about 9, and Chromium about 6.5. It is serial by Safari's one session (property 3), and four of its rows fail intermittently on timing: `RF-36` (three rows), `drag:DRF-49`, `drag:DRF-50` and `drag:DRF-52`. Playwright's WebKit runs on the same Linux runners as the other engines, at the version the `playwright` dependency pins, through the provider and commands Chromium and Firefox use. It keeps the WebKit engine family in every pull request. What only real Safari has, macOS's input and preferences, `safaridriver` and the shipped build, is read weekly instead.
- **The cost, accepted by the owner:** a change that breaks only real Safari can merge, and the weekly run finds it within a week.
- **What a failing weekly run produces** is property 12's issue. A finding is the architect's, after a reading, so a workflow doesn't write one. A red scheduled run on its own notifies only the user who last edited the workflow's `cron` line, which is GitHub's rule for scheduled runs, and nothing asks anyone to read it.
- **The Safari findings.** The timing failures `RF-36`, `drag:DRF-49`, `drag:DRF-50` and `drag:DRF-52`, and `drag:DRF-51`'s 16 px offset, stop holding the gate. Their Safari conditions stay and apply to the weekly run. None is closed, because no cause is established and Safari still runs them. The same rows run in WebKit in the gate. Whether WebKit reproduces any of them is read in the CI-speed unit, and a row that fails there is an `RD-8` row like any other.
- **Read at `229829ef7`:** Playwright's WebKit build `webkit-2388` doesn't launch in the devcontainer, for 26 missing system libraries. After an `apt-get update`, `playwright install-deps --dry-run webkit` resolves its 247 Debian 13 packages ([reading](ci-speed-1/checks/webkit-local-probe.txt)). The install itself and a launch after it were not read.

**Dated 2026-11-17 by the architect** on `repo/ci-speed-1` at `4136c0eea` (pull request #31), on the CI-speed unit's stop at item 1's WebKit inventory ([inventory](ci-speed-1/checks/webkit-inventory.txt), runs 44049217432 and 44050452080).

- **WebKit, serial, on `ubuntu-24.04`:** 4 failed, 1,613 passed and 18 skipped of 1,635, in a 280 s test step. Firefox's was 428 s and Chromium's 290 s.
- **The four failures are two drag rows, each in `browser/drag/webkit` and `consumer/drag/webkit`, and each failed in 5 of 5 runs of its file.** The [CI-speed handoff](ci-speed-1/ci-speed-handoff.md)'s _Disposition of the stop at `4136c0eea`_ decides both as test repairs. No row is disabled.
- **The Safari findings' rows all pass in WebKit:** `RF-36`'s three, `drag:DRF-49`, `DRF-50`, `DRF-51` and `DRF-52`. That is evidence that those failures belong to Safari, its driver or its runner, and not to the WebKit engine. It is a reading, not a repair.
- **Tab** reaches the button, checkbox and radio in WebKit: the 28 rows of `focus-layer.spec.browser.test.ts` pass. That confirms property 11's keyboard bullet. drag's two reduced-motion rows run there, and pass.

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

1. **The engines are `chromium`, `firefox`, `webkit` and `safari`.** `MX_TEST_ENGINES` lists those names. `webkit` is Playwright's WebKit build, which the exact `playwright` dependency pins as it pins Chromium and Firefox. `safari` is real Safari (property 2). A project is named `<name>/<engine>`, except Chromium's, which keeps its name. (**Amended 2026-11-17 at `229829ef7`.** This property said: _"The engines are `chromium`, `firefox` and `safari`. `MX_TEST_ENGINES` lists those names. `webkit` is no longer an engine, and naming it is the unknown-engine error. A Safari project is named `<name>/safari`. Chromium and Firefox projects don't change."_)
2. **Safari projects use the WebdriverIO provider; Chromium and Firefox stay on Playwright's.** `@vitest/browser-webdriverio` and `webdriverio` are exact `devDependencies` at the root. The driver is the `safaridriver` that ships with macOS, and nothing installs a browser or a driver for Safari. A Safari project's instance is `{ browser: 'safari' }`.
3. **A Safari project runs:**
   - **not headless,** because Safari has no headless mode;
   - **with one worker and without file parallelism,** as every non-Chromium project already does (`RD-6` property 4), and **as the only Safari project in its Vitest process** (property 6). Safari allows one session. In one process, the next project opens its browser before `RD-3`'s release closes the previous one. (**Amended 2026-11-16 at `347d4e499`.** This item said: _"Safari also allows only one session, and `assignGroupOrder` gives each browser project its own group, so `RD-3`'s release closes one Safari session before the next project opens one"_. That was false; see the readings at `347d4e499`.);
   - **with Vitest's trace view off.** CI keeps no trace, so this loses nothing. Chromium and Firefox keep Vitest's default;
   - **in a test frame that the orchestrator doesn't scale,** at the configured 1280 × 720, **inside a top-level viewport that contains the whole frame,** so that pointer input reaches every point of the frame. If the provider's window size leaves the frame or the top-level viewport smaller, the Safari configuration makes the window large enough. From inside a Safari test, the implementer shows the frame's inner size, the top-level viewport's size and that no scale transform applies. (**Amended 2026-11-16 at `83ff45024`.** This item didn't name the top-level viewport. It said: _"If the provider's window size leaves the frame smaller, the Safari configuration makes the window large enough. The implementer shows the frame's inner size and that no scale transform applies, from inside a Safari test."_)
4. **Every repository browser command that a Safari row calls has a WebdriverIO implementation** with the same name, arguments, result and coordinate frame as its Playwright implementation. The command selects its implementation from the provider that runs it. Pointer movement, presses and key presses use WebDriver actions. **The pointer's state lasts from `pointerDown` to `pointerUp`:** a command doesn't release the input state between them, because Playwright's mouse doesn't. A command that has no WebDriver counterpart, which is each CDP command and `emulateReducedMotion`, **throws an error that names the command and the provider.** It never does nothing. (**Dated 2026-11-16,** on the feature-proof review's `reviewer-5`, [review](reviews/ci-verification-1/feature-proof-claude.md): the frame is the same, and the precision differs. `pointerMove` sends each interpolated point to WebDriver rounded to a whole CSS pixel, because WebDriver drivers disagree about fractional pointer coordinates and some refuse them, while Playwright sends them unrounded. Each point is within 0.5 px of Playwright's, and the kept position is the unrounded target, so the interpolation is Playwright's. A sub-pixel difference in a Safari row isn't a product difference until it is shown to exceed that bound.)
5. **A row that needs an instrument that an engine's driver doesn't provide runs only in the engines that provide it,** by an engine condition, as drag's `isChromium` rows do. This generalizes `RD-6` property 6 from Chromium-only instruments to every driver's instruments. It limits the row's scope and doesn't disable it, so `RD-8` doesn't apply to it. **A row limited for any other reason is a disabled row under `RD-8`,** with its finding. The report lists every row that is newly limited for Safari, with the command it needs.
6. **The Safari job runs on GitHub's `macos-26` runner,** in the Safari workflow of property 12 and not in `verify` (**amended 2026-11-17 at `229829ef7`;** it was a job of `verify`), named by that label and not by `macos-latest`, so the operating system changes only by an edit. It uses the Node major version that the workflow names, like every other job. Before the tests, it enables remote automation with `sudo safaridriver --enable`. **Its log names the macOS version and Safari's version** before the tests run. Every other job stays on `ubuntu-24.04`. **The job runs each Safari project in its own Vitest process, one after another,** through the root recipe `test-safari`, which the job calls with `--tags-filter '!measurement'`. The recipe:
   - sets `MX_TEST_ENGINES=safari` itself;
   - builds what the root `test` recipe builds, once for all projects, and shares those build steps with `test` instead of copying them;
   - takes the list of Safari projects from the configuration when it runs, with a listing that opens no browser. Nothing writes the list out, so a new Safari project runs with no edit to the recipe or the workflow;
   - passes its arguments to every project's run, and runs every listed project even after one fails;
   - logs each project's name and exit status;
   - exits non-zero if the listing fails or lists no project, or if any project's run fails.

   (**Amended 2026-11-16 at `347d4e499`.** The job ran every Safari project in one Vitest process, with `npx just test --project '*/safari'`.)

7. **Safari isn't pinned.** Its version is the runner image's, and the job log's Safari version tells whether a failure comes from a repository change or from an image update. **A Safari failure is triaged from property 12's issue, not under `RD-8`,** which governs the gate. A failing Safari row that no finding names becomes a finding when the architect reads it. Whether a known intermittent row is skipped in Safari is decided in its own finding. `RD-9` pins only the visual environment, and visual runs in Chromium only. (**Amended 2026-11-17 at `229829ef7`.** The third sentence said: _"A Safari failure is handled under `RD-8`, like any engine's, whether it comes from a repository change or from an image update, and the job log's Safari version tells which."_)
8. **Locally, Safari can't run, and WebKit runs only on request.** The devcontainer runs Linux, so Safari can't run there. **Playwright's WebKit runs locally with `MX_TEST_ENGINES=webkit`** once the development image carries WebKit's system libraries ([dev image handoff](ci-speed-1/devimage-handoff.md)) and the devcontainer installs its build (`RD-13` property 7). A local run is still Chromium by default, and a local WebKit run is a reproduction, not evidence (`RD-13` properties 7 and 8). (**Amended 2026-11-17 at `229829ef7`.** The first two sentences said: _"**Locally, nothing runs Safari or WebKit.** The devcontainer runs Linux, so Safari can't run there, and no Playwright WebKit build is installed or started anywhere."_) A developer on macOS with remote automation enabled can run `just test-safari`, and the repository promises nothing more there. (**Amended 2026-11-16 at `347d4e499`:** this sentence named _"`MX_TEST_ENGINES=safari`"_, and a single Vitest process run with it opens only its first Safari project.) (**Amended 2026-11-16 by `RD-13`.** This property said: _"drag's `test-engines` runs `chromium,firefox`. Its project names are `browser`, `browser/firefox`, `shipped` and `shipped/firefox`, which are exactly `drag:DRO-18`'s selection."_)
9. **A Vitest or provider upgrade re-reads the Safari job,** because the provider is released apart from Vitest. The reading is the Safari job's result on the upgrade's pull request. No row watches it.
10. **A Safari page reports the same user preferences as a Chromium or Firefox page reports by default:** `prefers-reduced-motion: no-preference` (added at `83ff45024`).
    - **How each engine gets it:** Chromium and Firefox have it from Playwright's default, and drag's landing rows also reset it by emulation. Safari's driver can't emulate the preference, so **the `safari` job sets the runner's macOS preference before the tests.** It turns Reduce Motion off as the runner's user, reads the value back, and logs it. The step fails if the value read back isn't off.
    - **This is the job's environment, like remote automation in property 6, not a limit on rows.** A row that needs the default preference isn't an instrument row under property 5. It gets no engine condition and isn't disabled. A row that needs a non-default preference, such as drag's two reduced-motion rows and their reset, needs emulation, so it stays limited under property 5.
    - **If the job can't set the preference, or Safari still reports `reduce` after the job has set it, the unit stops** under `RD-8` property 5. The rows that need motion are then neither limited nor disabled, and the owner decides.
    - **Any other macOS preference** that the runner image sets differently from Chromium's and Firefox's default, and that a row depends on, is named here by an amendment before the job sets it.
    - **Tab** (added at `c34cb01d7`, amended at `fc3b89680`). Safari's default Tab doesn't move focus to buttons, checkboxes or radios. **The job sets no preference for it,** because setting Safari's _"Press Tab to highlight each item"_ changed nothing under `safaridriver`. **A Safari row reaches such a control with Option-Tab** (`{Alt>}{Tab}{/Alt}`), the key that moves focus to every control under Safari's default settings. Chromium and Firefox keep Tab. The owner chose this under `RF-42`, and it is real keyboard input, not a limit on rows. (**Amended at `d756e4f4f`.** The previous sentence said: _"How a Safari row reaches such a control by keyboard is `RF-42`'s, and is recorded here once the owner decides."_) (**Amended at `fc3b89680`.** This bullet said: _"In a Safari page, Tab moves focus to every element that Chromium's and Firefox's default Tab reaches: links, buttons and every form control. The setting is Safari's 'Press Tab to highlight each item', not the system's keyboard navigation, which changes more than Safari. As with Reduce Motion, the `safari` job turns it on as the runner's user before the tests, reads it back and logs it, and the step fails if the value read back isn't on. The implementer picks the keys with a reading. It is the job's environment, not a limit on rows. The unit stops under `RD-8` property 5 if the job can't set it, or if Tab still doesn't reach a button in a Safari row after it is set. The keyboard-focus rows are then neither limited nor disabled, and the owner decides."_)

11. **The gate's WebKit job** (added 2026-11-17 at `229829ef7`). `verify`'s `webkit` job runs on `ubuntu-24.04`, installs its engine as `RD-6` property 2 says, and runs every browser project except visual in WebKit, without `measurement` rows, headless, through Playwright's provider and the commands Chromium and Firefox use. (**Amended 2026-11-18 by `RD-21`.** It said that the job _"installs its engine with `npx playwright install --with-deps webkit`"_.)
    - **Conditions.** A row conditioned on `safari` doesn't apply to `webkit`. Playwright's WebKit has media emulation, so drag's reduced-motion rows run in it, and a Chromium-only instrument stays Chromium-only (property 5).
    - **Keyboard.** A WebKit row presses Tab, as Chromium and Firefox do. Option-Tab stays Safari's (property 10). The architect's understanding of WebKit's source, which this decision didn't re-read and no run has shown: WebKit makes Tab skip buttons and form controls only in its macOS port, where it follows macOS's keyboard-access setting and Option inverts it, and on Linux its Tab reaches every control. Tab is also the key a Linux user presses. **If Tab doesn't reach a button, checkbox or radio in WebKit, the unit stops,** and the owner decides. Option-Tab isn't substituted, because on Linux it isn't a focus key.
    - **Parallelism.** WebKit runs without file parallelism and with one worker, as Firefox does, **unless** the unit's reading meets both conditions:
      - three consecutive runs of the WebKit job with file parallelism and Chromium's worker count fail no row that the serial run passes;
      - the parallel test step takes at least 20 % less time than the serial one.

      Firefox is serial because a page in the background gets no input there. Nothing has read whether WebKit's does, and the three runs read exactly that, through every input row. The configuration's comment states which case holds.
12. **Safari outside the gate** (added 2026-11-17 at `229829ef7`). The workflow `.github/workflows/safari.yml` holds the Safari job of property 6, unchanged.
    - **Triggers.** A weekly `schedule`, and `workflow_dispatch` with an optional `ref` input: a branch, tag or commit SHA, which the job checks out. Without it, the job checks out the ref the run was started on. No `push` or `pull_request` trigger.
    - **Not required.** `verify` doesn't need it, and the ruleset names only `verify`, so it never blocks a merge.
    - **Concurrency.** One run per checked-out ref at a time. A newer run waits, and none is cancelled.
    - **A failing scheduled run** opens one issue, or comments on the one that is already open. It is labelled `safari`, and the issue or comment names the run, the commit, the macOS and Safari versions, and each project that failed. A job that runs no repository code does this, after the test job, with `issues: write`. The test job keeps `contents: read`. A passing run closes nothing: whoever triages the issue closes it.
    - **A failing manual run** produces its red run only, because whoever started it reads it.

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

- **Playwright's WebKit in place of Safari.** It isn't Safari, which is why Safari keeps its own workflow (property 12). (**Amended 2026-11-17 at `229829ef7`.** This item said: _"**Playwright's WebKit, on Ubuntu or on macOS.** That is the build that `9c96be2d8` runs, and the owner's correction rules it out: it isn't Safari."_ The owner's decision of 2026-11-17 makes it the gate's third engine, beside Safari and not in place of it.)
- **Playwright's WebKit on a macOS runner** (2026-11-17). Its macOS port is closer to Safari, Option-Tab included, but a `macos-26` runner has 3 vCPU against Linux's 4, and the owner chose Linux and headless.
- **Safari in `verify` as a job that `verify` doesn't need** (2026-11-17). It would still spend about 12 macOS minutes on every push, and report a red check that blocks nothing on every flake. The owner asked for a weekly run.
- **Sharding Safari across runners** (2026-11-17), on the owner's word. It is also `RD-12`'s rejected matrix: each shard repeats checkout, install and build on macOS.
- **Keeping Playwright's WebKit as a fourth engine — adopted 2026-11-17** by the amendment at `229829ef7`. This item said: _"No requirement names it, it can't run locally (`drag:DRO-18`), and an engine that no job runs is machinery with no use."_ The gate's `webkit` job now runs it, and the [dev image handoff](ci-speed-1/devimage-handoff.md) reads whether it runs locally.
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
- **By the amendment of 2026-11-17:** `RD-6`'s title and properties 2, 3, 4, 7 and 8, in place with what each said before; `RD-8` property 1's engine; `RD-13` property 7's engines; and a dated note on `drag:DRO-18`. `.agents/docs/test-architecture.md` §CI policy and `verify.yml`'s comments change with the implementation, not here.

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
   - **Engines:** `MX_TEST_ENGINES` still defaults to `chromium`. The devcontainer installs Playwright's Chromium and WebKit builds, and WebKit launches where the development image carries its system libraries (`RD-12` property 8). (**Amended 2026-11-17 by `RD-12`.** This sentence said: _"The devcontainer installs only Playwright's Chromium."_) drag's `test-engines` sets no engine list: it runs drag's browser and shipped projects in the engines that `MX_TEST_ENGINES` lists, which is Chromium by default.
   - **Other engines** run in CI. A developer who sets either variable locally gets an unchecked run, and its result is not evidence.
8. **What a unit owes locally.** A local check covers Chromium, without visual. Firefox, WebKit and visual results are read in CI on the unit's pull request. A unit that changes something they can see pushes and reads them there before it reports. **A unit that changes something only Safari can see,** such as a WebdriverIO command, the Safari configuration or the Safari workflow, starts the Safari workflow on its branch (`RD-12` property 12) and reads it before it reports. (**Amended 2026-11-17 by `RD-12`.** The second sentence said: _"Firefox, Safari and visual results are read in CI on the unit's pull request."_ The sentence about the Safari workflow is new.) A visual change is recorded through property 2, and the owner reviews the proposal.
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
6. **The gate loads the built site.** A build that exits 0 isn't enough (`RF-46`). `just docs-smoke` serves `.docs` at the base path the build was made for, and opens it in Playwright's pinned Chromium under a name that isn't a secure context, which the check asserts. It fails on any uncaught exception, any console error, any failed request for one of the site's own resources, or a render error or timeout that Storybook reports. It loads:
   - the manager's `index.html`, which passes when the preview it embeds reports that its entry rendered;
   - `iframe.html` for every story and docs entry in `.docs/index.json`, which passes when Storybook reports that the entry rendered;
   - `api/index.html`, which passes on `load`.

   **Its result depends only on the build and the pinned browser.** The check answers every request outside its server's origin itself, without the network, so a third-party host's availability or latency neither fails nor passes it. Whether a third-party resource loads on the deployed site is outside the check. **Each page is observed from navigation until its `load` event or its completion signal, whichever is later, and not after.** An error that a page raises only after that is outside the check. Behavior after the first render belongs to the component tests.

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

**Amended again 2026-11-17 by the architect** on `repo/docs-gate-1` at `81c9fe47e`, on the docs gate's [feature proof](reviews/docs-gate-1/feature-proof-claude.md) (`reviewer-1` to `reviewer-3`), relayed by the coordinator. Property 6 changed:

- **Third-party requests.** It didn't say what the check does with a request outside its origin. Its rule for failed requests covered only the site's own resources, and its console-error rule had no exception. With the fonts' and MDN's hosts unreachable, 100 of 102 pages failed on console errors.
- **The manager and the observed period.** It listed the pages without saying when each one passes. The manager passed on `load`, before it loads its preview, so it passed on `RF-46`'s broken build. An error raised after an entry's render event was caught in some entries and missed in others.

The [docs-gate handoff](docs-gate-1/docs-gate-handoff.md)'s _Disposition of the feature proof_ holds the reasons and the alternatives weighed. **Unimplemented** until its remediation lands.

**Amended 2026-11-19 by the architect** on `repo/story-http-1` at `0900d5aee`, on the [story-http plan](story-http-1/story-http-plan.md) for `RF-62`, relayed by the coordinator. Property 6 changed: `docs-smoke` opens the site under a name that isn't a secure context, and asserts that it isn't one.

- **What it said before:** _"`just docs-smoke` serves `.docs` at the base path the build was made for, and opens it in Playwright's pinned Chromium."_
- **Why an amendment and not a dated note:** it changes what the gate checks. A site that renders only in a secure context passed the property as it stood, because the check opened `127.0.0.1`, which a browser treats as a secure context. `RF-61` and `RF-62` were both defects of that kind, and the gate couldn't fail on either.
- **Why the check asserts its own condition:** without the assertion, a later change to the origin or to the browser's launch could make the check run in a secure context again, and nothing would show it.
- **Not adopted,** with the reasons in the plan's [_Not adopted_](story-http-1/story-http-plan.md#not-adopted): a fix to the story alone, a lint rule against secure-context APIs, and serving on the machine's network address.
- **Implemented** by `d6674ecfb` on #74, not yet merged. The server stays on `127.0.0.1`, and Chromium maps the reserved name `mx-docs.test` to it. The `docs` job of #74's run 44457238397 passed 102 of 102 pages at `http://mx-docs.test:32897/material-x/`.

#### RD-15 — A pull request or push whose commit carries `[noci]` gets a fast `verify` when every change since the last fully verified commit is a record or Markdown

**Decided 2026-11-17 by the architect** on `repo/ci-speed-1` at `229829ef7`, on the owner's decision relayed by the coordinator the same day. The owner's example is `[noci] drag: changed plan`. **`verify` must still run:** it recognizes the marker and succeeds quickly, because GitHub's own `[skip ci]` doesn't start the workflow and leaves the required `verify` pending. **The skip holds only if every change since the last fully verified commit is under `.plan/` or is a `*.md` file.** Otherwise the run is full. The range is checked, not only the head commit, because a push cancels the running `verify`, so earlier commits may never have been verified. In the owner's words: _"правильнее действительно будет перепроверять `.plan` и `.md`-файлы"_. **Unimplemented:** the [CI-speed handoff](ci-speed-1/ci-speed-handoff.md) implements it.

**Properties.**

1. **The marker** is the literal `[noci]`, case-sensitive, anywhere in the message of the run's commit _H_. For a `pull_request` event, _H_ is the pull request's head commit, and for a push to `main`, the pushed commit. **A `workflow_dispatch` run is always full.** GitHub's own markers, `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]` and `[actions skip]`, keep the workflow from starting, so `verify` stays pending and the merge is blocked. `[noci]` without a space is not one of them.
2. **The last fully verified commit** _B_ is the newest ancestor of _H_, or _H_ itself, for which a `verify` run concluded `success` in full mode. A run counts as full only if `static`, `chromium`, `firefox`, `webkit` and `docs` each concluded `success`, not `skipped`. _B_ is read from the GitHub Actions API, among `verify.yml`'s recent successful runs, and ancestry is read with `git merge-base --is-ancestor` on a full-history checkout.
3. **The range** is the tree difference from _B_ to _H_, `git diff --name-only --no-renames B H`, so a merge commit and a rename count by every path they touch. **The run is reduced only if** _H_ carries the marker, _B_ exists, and every path in the range is either under a directory named `.plan` at any depth or ends in `.md`. An empty range qualifies. `.mdx` is not Markdown here: Storybook builds it.
4. **What a reduced run checks.** `records` runs the install, `just fmt-check` and the record resolver's tests (`.scripts/entry.node.test.ts`). Those are the gate's checks that read records and Markdown: `oxfmt` formats both, and the resolver's tests resolve entries in the real records. **No other gate check reads them.** Lint ignores `.plan/` (`RD-8` property 3), the root `tsconfig.json` doesn't include it, Storybook's stories are `*.mdx` and `*.stories.tsx`, and TypeDoc's `readme` is `none`. The implementer confirms this by search, and adds to `records` any check that the search finds. (**Amended 2026-11-17 at `4136c0eea`,** on the implementer's search. `packages/drag/tsconfig.json` includes `./.plan/probes/callback-list/allocation.ts`, so drag's typecheck reads a `.plan/` file. `records` therefore also runs `just typecheck`, the root recipe, which covers any later `tsconfig` that includes a record. The sentence _"the root `tsconfig.json` doesn't include it"_ was true and incomplete.)
5. **Modes.** `scope` decides the mode and logs _H_, _B_ with its run, the mode, and the paths that kept the run full. **Full:** every gate job runs as `RD-6` property 3 says, `system-deps` runs as `RD-21` property 1 says, and `records` is skipped. **Reduced:** `records` runs, and `system-deps`, `static`, `chromium`, `firefox`, `webkit`, `docs` and `measurements` are skipped. `verify` succeeds only if `scope` succeeded, every job of its mode succeeded, and every job outside it was skipped. On `main`, a reduced run skips `docs`, so `deploy` doesn't run, and the site stays at its last deployment, which the range couldn't change. (**Amended 2026-11-18 by `RD-21`,** which adds `system-deps`. Property 2's list of the jobs that make a run full doesn't change, because those jobs need `system-deps`. Before, _Full_ said _"every gate job runs as `RD-6` property 3 says, and `records` is skipped"_, and _Reduced_ listed _"`static`, `chromium`, `firefox`, `webkit`, `docs` and `measurements`"_.)
6. **It fails toward a full run.** If the API can't be read, no _B_ is found, the history can't answer ancestry, or the range can't be computed, the mode is full, and the log says why. `scope` fails only if it can't name a mode, and then `verify` fails.
7. **Permissions.** `scope` adds `actions: read`, to read runs and jobs. It runs no install. Its only repository code is the decision script, which uses Node's built-in modules, `git` and `gh`. (**Amended 2026-11-17 at `0706f41f5`:** this said _"It runs no install and no repository code beyond `git`"_, which contradicted the handoff's script.)

**Why.**

- **A marker, not a path rule alone,** because the owner asked for one. A record-only push stays full unless its author asks for less.
- **The range from the last fully verified commit, not from the previous push.** The previous push's run may have been cancelled, so a range from it can hide an unverified source change.
- **A reduced run still checks what changed.** Without `records`, a misformatted record or a broken entry could reach `main` under `[noci]`, and the next full run would fail on a change that isn't its own.
- **One more job in `verify`, not a second required check,** so the ruleset stays as it is (`RD-6` property 8).

**Not adopted.**

- **GitHub's `[skip ci]`, or `paths-ignore` on the workflow.** Either one keeps the workflow from starting, so the required check never reports.
- **The head commit's paths only,** or a range from the previous push's `before`. Both are ruled out by the cancellation above.
- **A range from the merge base with `main`.** It counts unverified commits on the branch as verified.
- **A reduced run with no checks.** See _Why_.

#### RD-16 — The repository installs, runs scripts and records with aube, `package-lock.json` stays its one lockfile, and only listed packages at listed versions run install scripts

**Decided 2026-11-17 by the architect** on `repo/ci-speed-1` at `229829ef7`, on the owner's decision relayed by the coordinator the same day: aube instead of npm for installs, if it holds the tree. The owner's references are <https://aube.sh/bun-users> and <https://aube.sh/settings/#setting-overrides>.

**Amended 2026-11-17 by the architect** at `0706f41f5`, on the owner's decision relayed by the coordinator: **a full move from npm to aube, with no speed condition,** for local development, CI and the records. The owner's words: _"я бы хотел полностью перекатиться на aube, без дополнительных условий, если только нет каких-то прям капитальных проблем"_. Yarn and pnpm are rejected. **Only a capital problem stops it** (property 11), and the timing is a reading that decides nothing. The supply chain is the owner's main concern: _"allowScripts/allowBuilds немного меня настораживает, ибо проблемы с poisoned supply chain - это причина почему я вообще не допускаю building tools на host"_. The owner also pointed to `strictDepBuilds`. The title and every property changed. What they said before is at the end. **Unimplemented:** the [CI-speed handoff](ci-speed-1/ci-speed-handoff.md)'s item 4 implements it.

**Read at `229829ef7`** by the architect in the devcontainer, with aube 2.10.1 of 2026-11-16 ([reading](ci-speed-1/checks/aube-probe.txt)):

- **aube applies the root `overrides`, `$` references included.** Resolved without a lockfile, the manifests give one vite 8.4.0-beta.1 and one rolldown 1.3.2. With `overrides` deleted, the same resolution gives vite 8.3.8 and 8.4.0-beta.1, and rolldown 1.2.19 and 1.3.2. aube warns that `$` is deprecated in favour of a catalog.
- **A frozen install from `package-lock.json`** installs 901 packages and links the npm workspaces. It keeps one vite and one rolldown, and leaves the lockfile byte-identical. Its default layout is isolated: 52 top-level entries, against npm's 655.
- **Dependency scripts differ:** aube read neither `allowScripts` list. It ran `esbuild` and `nx` from its built-in list, and skipped `rs-module-lexer` and `unrs-resolver`, which npm runs.

**Read at `0706f41f5`** by the architect, on scratch fixtures with aube 2.10.1, and with 2.10.0 for the script policy ([reading](ci-speed-1/checks/aube-policy-probe.txt)):

- **`strictDepBuilds` fails the install** on a dependency script that no entry reviews: _"dependencies with build scripts must be reviewed before install"_. That holds the owner's quotation of the docs.
- **It doesn't override the built-in trusted list.** With `strictDepBuilds` alone, `esbuild` ran unlisted. Only `useDefaultTrustedDependencies=false` removes the built-in list, and with both settings every unlisted script fails the install.
- **`allowBuilds` pins exact versions.** `esbuild@0.28.1` allows 0.28.1 only. With `esbuild@0.28.0` listed, the installed 0.28.1 counts as unreviewed, and the install fails. Semver ranges are refused. A deny by bare name (`esbuild: false`) counts as reviewed at any version.
- **Where aube reads the settings:**
  - `strictDepBuilds` and `useDefaultTrustedDependencies` are read from `.npmrc` and from the environment. `package.json`'s `aube` field and a workspace YAML without `packages:` don't set them.
  - `allowBuilds` and the catalog are read from `package.json`'s `aube` field.
- **A mismatched `packageManager` pin downloads another aube** (_"Switching to aube@2.10.0 … Downloading aube v2.10.0…"_). With `managePackageManagerVersions=false`, `packageManagerStrict=error` and `packageManagerStrictVersion=true`, it fails instead.
- **The release-age gate** (`minimumReleaseAge` with `minimumReleaseAgeStrict=true`) fails a resolution that only a too-young version satisfies: `ERR_AUBE_NO_MATURE_MATCHING_VERSION`.
- **Exceptions, read on 2.10.0:**
  - `minimumReleaseAgeExclude` in `.npmrc` takes one comma-separated value, whose entries are names, `*` patterns, or names with an exact version (`esbuild@0.28.1`). A pattern can't carry a version, and repeated lines keep only the last.
  - An entry covers its package and not that package's dependencies.
  - The gate doesn't apply to a frozen or fresh-lockfile install of locked versions, or to an `aube add` that leaves them locked. Only a re-resolution of vite 8.4.0-beta.1 is blocked, and then by vite and next by postcss 8.5.33.
  - With `minimumReleaseAgeStrict=false`, a young version that alone satisfies its range is installed without notice.
- **npm warns about aube's `.npmrc` keys,** and says that they will stop working in its next major version, whenever it runs inside the checkout.
- **Overrides through the catalog hold.** With `aube.catalog` and `catalog:` in place of each `$` reference, the manifests resolve to one copy each of `@mdx-js/react`, eslint, react, rolldown and vite, with no warning.
- **`aube import` is not faithful:** it rewrote npm's nested `ansi-regex@6.6.0` as 6.2.2, which is still in its dependents' range.
- **nx 24.0.6 knows no aube lockfile,** and builds its external nodes from a bun, yarn, pnpm or npm lockfile.
- **aube's releases** are weekly: 2.9.0 on 2026-11-02, 2.10.0 on 2026-11-09 and 2.10.1 on 2026-11-16.

**Dated 2026-11-17 by the architect** at `4136c0eea`, on the CI-speed report's item 4 ([report](ci-speed-1/ci-speed-report.md)). The move is green: every gate job passed on aube's tree in run 44046829370 at `e9e8f92a2`. The witness that removed nx's `allowBuilds` entry failed `aube ci` as required (run 44048707632 at `6092c5f26`). The catalog change wrote no lockfile diff. Each reading is decided as follows:

- **`savePrefix=`** (empty) replaces `save-exact`, which aube doesn't read. It is accepted as property 7's equivalent.
- **`aube add` at the workspace root needs `-W`.** Accepted. `implementer.md` says `aube add -D -W <name>`.
- **`aube exec` installs first when `package.json` changed** (_"Auto-installing: package.json has changed"_). **Superseded the same day by property 12:** the owner turned the auto-install off. (This reading said: _"Accepted. That install is the same `aube install`, under the same script policy, version pin and release age, from the lockfile. It is not a fetch of an unlocked package, which is what property 8's "never `aubx` or `aube dlx`" excludes. In CI, `aube ci` runs first, so nothing changed and nothing installs."_)
- **`just oxlint-migrate` needs `@oxlint/migrate`,** which `npx` used to fetch unpinned at each run. It becomes an exact devDependency at 1.93.0, `oxlint`'s version, published 2026-11-09. The recipe then runs from the lockfile.
- **`aube add` rewrites the hoisted layout,** and drops nested entries that the workspace manifests no longer name. That staleness predates this unit and is `RF-47`. It is repaired in its own commit, before `@oxlint/migrate` is added.
- **The merge base's size reading fails** until this pull request merges, because `main` has no aube settings. Accepted: `measurements` reports it and never fails the run (`RD-7`).

**Dated 2026-11-17 by the architect** at `633ef72d8`, on the stop at `RF-47`'s repair ([reading](ci-speed-1/checks/rf47-resolution.txt)):

- **aube's first full write of `package-lock.json`** is accepted as `RF-47`'s repair, with its whole diff. The resolution reading is under `RF-47`.
- **What that write puts in the file**, besides placement:
  - the root entry's `devDependencies` carry `catalog:` for the five catalog entries, where npm's file had versions;
  - `vite`, a peer, appears under the `dependencies` of the `vite-custom-element-assets` and `vite-traits-plugin` entries;
  - the root's `version` and `hasInstallScript`, and the workspaces' `license`, are dropped.

  None of this changes what installs. It is what GitHub's dependency graph and nx read, so property 11's two stops on them are witnessed on this commit, not only after the merge.

- **`aube exec` reads its own options directly after the binary's name,** up to the first argument it doesn't own. Property 8 gains its `--` rule.

  (_Corrected 2026-11-17 by the architect at `c57722b67`,_ on the feature proof's `reviewer-1`. This bullet said: _"`aube exec` reads its own options after the binary, so `.agents/docs/handoff.md`'s `aube exec eslint … -c eslint.config.ts` never passes `-c` to eslint."_ That command was `aube exec eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts …`. aube stopped at `--flag`, so `-c` reached eslint. The probe it relied on put `-c` directly after the binary. The rule stands, because it goes by form.)

- **`aube install --fix-lockfile --lockfile-only`** does nothing on a fresh lockfile: _"Lockfile is up to date, resolution step is skipped"_.

**Properties.**

1. **aube is the repository's package manager.** Locally, in CI and in every record, installs, dependency changes, `package.json` scripts and local binaries go through aube. npm, yarn and pnpm install nothing of the repository. They run nothing of it, with three exceptions: npm's one bootstrap step in CI (property 9), nx's script runner (amended 2026-11-17 at `c57722b67`), and the release workflow's `npm stage publish` of a checked tarball, outside any checkout (amended 2026-11-20 by `RD-27` property 6, because aube implements neither trusted publishing nor staging).
   - **nx's script runner.** nx 24.0.6 runs a `package.json` script target as `npm run <script>`. Its `nx:run-script` executor takes the command from the detected package manager. Detection reads `nx.json`'s `cli.packageManager`, then the lockfile's name, so `package-lock.json` gives npm (`nx/dist/src/utils/package-manager.js`, `detectPackageManager` and npm's `run`). Its schema allows only `yarn`, `pnpm`, `npm` and `bun`, so no setting gives aube.
   - **What npm does there.** It reads `.npmrc`, warns once for each aube key, and runs the script line, which is `just <recipe>` or the tool command. It installs nothing. No `package.json` names a `pre<script>` or `post<script>` for a script it has, so npm runs nothing else. The root's `postinstall` belongs to the install lifecycle, which nx never runs.
   - **What it exports doesn't change aube's settings.** npm exports each `.npmrc` key as `npm_config_<key in lower case>`, such as `npm_config_usedefaulttrusteddependencies`. aube's environment names are snake case, such as `npm_config_use_default_trusted_dependencies`, so the two don't match. The one name that matches, `npm_config_node_linker`, carries the same value. Read on 2.10.0 with npm 11.20.0: under `npm run`, `aube install` of an unlisted `esbuild` still fails as unreviewed, as it does when run directly. `esbuild` is on aube's built-in trust list, so the install would run its script if `useDefaultTrustedDependencies=false` had been lost. So properties 4, 5 and 12 hold under nx.
   - **The exception is permanent** (amended 2026-11-17 at `d6838d0f1`, on the owner's decision relayed by the coordinator the same day). nx keeps running scripts with `npm run`. The owner's reason: speed beyond installs doesn't matter here, and more toolchain work would delay Landing. Replacing the runner was considered and declined (see _Not adopted_).
   - **What returns it to the architect.** npm says the keys "will stop working in the next major version". If an npm release stops running a script beside them, every nx target fails, so a gate job fails. That is property 11's stop on nx's commands.
   - (This bullet said: _"**Revisited** when nx knows aube, or when npm stops running a script beside these keys. npm says the keys "will stop working in the next major version". If that breaks the runs, a gate job fails, because every nx target runs through npm. The alternative is to replace nx's inferred script targets with explicit ones that run `aube run`. That costs a target definition for each script in each package, 78 today, or a local nx plugin, and it changes nothing about what runs."_)
   - (This property said: _"npm, yarn and pnpm install nothing and run nothing of the repository, except npm's one bootstrap step in CI (property 9)."_ The feature proof's `reviewer-2` read `npm run` in the final run's `docs` job.)

   `package.json` names `"packageManager": "aube@2.10.0"`, the newest release that meets property 6's age on 2026-11-17. One edit changes the version in `packageManager`, the workflows and the development image together. `engines.node` stays `>=24`, and nothing names npm in `engines`.

2. **`package-lock.json` stays the one lockfile,** which aube reads and writes. No `aube-lock.yaml` or `pnpm-lock.yaml` is committed. `.npmrc` sets `defaultLockfile` to `package-lock.json`, so a stray `aube-lock.yaml` can't take precedence over it.
3. **Overrides go through the catalog.** `package.json`'s `aube.catalog` holds the five pinned versions: `@mdx-js/react`, eslint, react, rolldown and vite. Each override and each direct dependency on one of them is `catalog:`, so each version is written once. No `$` reference remains.
4. **Only listed packages, at listed versions, run install scripts.**
   - **The settings.** `.npmrc` sets `strictDepBuilds=true` and `useDefaultTrustedDependencies=false`.
   - **The allow list.** `package.json`'s `aube.allowBuilds` allows exactly `esbuild@0.28.1`, `nx@24.0.6`, `rs-module-lexer@2.8.0` and `unrs-resolver@1.11.1`, the four that npm's `allowScripts` allows today.
   - **The deny list.** It denies `edgedriver`, `geckodriver` and `fsevents` by name. npm skips all three today: the first two aren't covered, and `fsevents` installs only on macOS.
   - **npm's `allowScripts`** is deleted.
   - **What follows.** An unlisted package with an install script fails the install, and so does a listed package at another version. Updating such a package therefore updates its pin in the same change, which is the review. The root package's own `postinstall` (`.scripts/link-tsserver.ts`) runs, as it does under npm.
5. **The version pin is enforced, never fetched.** `.npmrc` sets `managePackageManagerVersions=false`, `packageManagerStrict=error` and `packageManagerStrictVersion=true`. A different aube fails instead of downloading the pinned one.
6. **Release age, with exact-version exceptions** (amended 2026-11-17 at `588eeae42`).
   - **The gate.** `.npmrc` sets `minimumReleaseAge=10080`, which is 7 days, and `minimumReleaseAgeStrict=true`. A resolution that only a younger version satisfies fails.
   - **What it applies to.** It applies when a version is resolved anew: adding a dependency, changing its version, or re-resolving the lockfile. A frozen or fresh-lockfile install of locked versions isn't gated. So CI, `aube install` on a fresh lockfile, and the catalog change of property 3 need no exception.
   - **An exception** is an entry of `.npmrc`'s single `minimumReleaseAgeExclude` value, comma-separated, written as `name@exact-version` only. A bare name or a `*` pattern would exempt every later version, so neither is allowed.
     - It is added in the change whose resolution failed on that version, and it names one package. A dependency of an excepted package that is too young needs its own entry.
     - Each entry is listed here with its reason and the date its version turns 7 days old.
     - After that date the entry exempts nothing, so the first change after it that touches `.npmrc` or the dependencies removes it.
   - **No exception is needed at `588eeae42`.** vite 8.4.0-beta.1, published 2026-11-16, and postcss 8.5.33, the only version that satisfies vite's `^8.5.33` (2026-11-13), are locked. A re-resolution before 2026-11-23 would need `vite@8.4.0-beta.1,postcss@8.5.33`.
   - **aube's own version** in property 1 meets the same age.

   (This property said: _"**Release age.** `.npmrc` sets `minimumReleaseAge=10080`, which is 7 days, and `minimumReleaseAgeStrict=true`. A resolution that needs a younger version fails rather than quietly taking an older one. An exception is a `minimumReleaseAgeExclude` entry named here with its reason. The aube version in property 1 meets the same age. A frozen install resolves nothing, so CI is unaffected."_ The owner chose, on 2026-11-17, to keep the 7-day gate if aube has per-package exceptions and to drop it otherwise: _"Давай 2, если не умеет, то 3. Возрастное ограничение штука хорошая, но всё-таки у меня контейнер и dev deps only, поэтому это чуть менее важно"_. aube has them, so the gate stays.)

7. **The layout is hoisted** (`node-linker=hoisted` in `.npmrc`). Every other `.npmrc` key stays only if aube reads it, and the report names the keys it drops.
8. **Commands.**
   - `aube ci` in CI, on a fresh checkout, and `aube install` locally.
   - `aube add` and `aube remove` to change dependencies.
   - `aube run <script>` for a `package.json` script.
   - **`aube exec <binary>` in place of `npx`.** Never `aubx` or `aube dlx` for a repository tool, because they fetch a package that isn't installed.
     - **`--` before the binary when it gets an option** (added 2026-11-17, its reason corrected the same day at `c57722b67`). aube 2.10.0 also reads its own options after the binary's name, until the first argument it doesn't own. Those options include `-c` (its shell mode), `-v`, `-V` and `--version`, `-h` and `--help`, and `--silent` ([reading](ci-speed-1/checks/rf47-resolution.txt)). So `aube exec eslint -c x` loses `-c` to aube, while `aube exec eslint --flag … -c x` and `aube exec eslint file.ts -c x` pass it to eslint. Whether an option survives therefore depends on what comes before it. A command that passes the binary any argument beginning with `-` is written `aube exec -- <binary> <args>`, wherever it is written. The rule goes by form, not by a list of colliding options, because aube's options change between versions.
   - **Who changes:** recipes, scripts, editor tasks, workflows, agent definitions and documentation say so. Instructions addressed to consumers of the published packages keep `npm install`, because those are the consumers' commands.
9. **CI.**
   - **The bootstrap.** Each workflow installs aube with `npm install -g @endevco/aube@<version>`. That is npm's only remaining command, because `setup-node` ships npm, and the registry that serves it is the one every dependency already comes from. The step runs outside the checkout, so the install of aube reads no repository configuration. npm reads `.npmrc` later, under nx (property 1). (Amended 2026-11-17 at `c57722b67`. The reason said: _"so npm doesn't read the repository's `.npmrc`"_.)
   - **The cache.** It caches aube's store under a key of the OS, aube's version and the lockfile's hash, then runs `aube ci`. `setup-node`'s `cache: npm` goes.
   - **Scope.** This covers `verify` (`measurements`' merge-base tree included), the Safari workflow and `baselines.yml`.
10. **Timing is a reading.** Cold and warm `aube ci` times on `ubuntu-24.04` and `macos-26`, beside `npm ci`'s at `229829ef7`. They decide nothing.
11. **Capital problems** are the only stops. The unit returns to the architect, and the owner decides, if:
    - **the tree doesn't hold:** a frozen install doesn't give one vite 8.4.0-beta.1 and one rolldown 1.3.2; or it changes `package-lock.json`; or the catalog form resolves another copy;
    - **a check fails only on aube:** a gate job, `docs-smoke`, or the Safari workflow's install or listing fails on aube's tree and passes on npm's at the same commit, and no configuration change repairs it;
    - **the script policy doesn't hold** at the pinned version, locally or in CI, in any of these ways:
      - a dependency script runs without a matching `allowBuilds` entry;
      - an unlisted script, or a listed package at another version, doesn't fail the install;
      - the built-in list can't be turned off;
    - **a mismatched `packageManager` downloads** despite property 5;
    - **GitHub's dependency graph** loses vite or rolldown from `package-lock.json` after aube writes it;
    - **nx's commands that the recipes run fail** on the aube tree.

    A speed figure, a warning, documentation churn, or a `package-lock.json` diff that aube writes once and then keeps stable is not a capital problem.

12. **Only an install command installs** (added 2026-11-17, on the owner's decision).
    - **The setting.** `.npmrc` sets `aubeNoAutoInstall=true`. `aube run` and `aube exec` then skip their check of `node_modules/.aube-state` against `package.json` and the lockfile, and install nothing.
    - **What installs.** Only `aube install`, `aube ci`, `aube add` and `aube remove` change `node_modules`. After a pull or a merge that changes `package.json` or `package-lock.json`, the developer runs `aube install`.
    - **The value is exactly `true`.** aube reads the key as a strict boolean: `true` and `1` turn the check off, and any other value leaves the auto-install on without notice. The witness reads it at the pinned version.
    - **Nothing overrides it.** An environment value (`AUBE_NO_AUTO_INSTALL`, or its `npm_config_` form) would. CI sets none. The development image sets neither form today (read 2026-11-17), and its handoff already forbids `AUBE_*` variables and any aube configuration, so it needs no change.
    - **CI is unaffected:** `aube ci` installs before any `aube run` or `aube exec`.

**Why.**

- **`package-lock.json`, not `aube-lock.yaml`.** GitHub's dependency graph reads `package-lock.json` for the transitive dependencies that its security alerts cover. nx 24 reads it and knows no aube lockfile. A frozen install from it keeps every resolved version, while `aube import` re-deduplicates them. aube reads and writes the file, so keeping it costs nothing in the move.
- **The catalog, not `$`.** aube warns that `$` is deprecated, and an aube that dropped it could resolve a second vite. npm, which needed `$`, no longer reads `package.json`.
- **Deny by default, with version pins:** the owner's supply-chain rule. A script runs only after someone listed its package and version. `strictDepBuilds` alone would leave the built-in list in force, and a bare-name allow would run a new version unreviewed.
- **No download of a package manager,** and a 7-day release age: both close a path by which a freshly published release runs without review.
- **Strict release age, with exact-version exceptions.** Without strict mode, a young exact pin installs without notice, so the gate would cover only ranges. An exact-version exception lets one reviewed release through and nothing published after it.
- **`aube exec`, not `aubx`:** `npx` and `aubx` both fetch a missing binary from the registry, and `aube exec` runs only what the lockfile installed.
- **No auto-install,** on the owner's word of 2026-11-17: _"да, ставим, чтобы не шалил"_ ("yes, set it, so that it doesn't act up"). A command that runs a tool doesn't also install. A stale tree then shows up as the tool's own failure, which `aube install` repairs, rather than as an install in the middle of another command.
- **npm as CI's bootstrap, not `jdx/aube-action`.** The action would add a third party to the supply chain, for a step that the npm registry, already trusted, serves.

**Not adopted.**

- **Yarn and pnpm,** on the owner's word.
- **`aube-lock.yaml`,** and `pnpm-lock.yaml` written by aube. See _Why_.
- **Keeping `$` overrides** with the warning accepted. See _Why_.
- **aube's built-in trusted list,** and `strictDepBuilds` without `useDefaultTrustedDependencies=false`.
- **`managePackageManagerVersions` at its default,** which downloads the pinned aube.
- **The isolated layout.** That is a separate change to how modules resolve. `RD-19` reads it and keeps hoisted.
- **Explicit `aube run` targets, or a local nx plugin, in place of nx's `npm run`** (considered 2026-11-17, declined by the owner). Explicit targets cost a definition for each script in each package, 78 today. A plugin is new toolchain to maintain. Either would change only which program starts the script line, and property 1 reads that npm there installs nothing and leaves aube's policy intact.

**What it said before the amendment of 2026-11-17.**

- The title said: _"CI installs with whichever of `npm ci` with `setup-node`'s cache and aube a measurement on the gate's runner shows faster, and `package-lock.json` stays the lockfile"_.
- Property 1 set two arms: _"**A** is today's: `actions/setup-node` with `cache: npm`, then `npm ci`. **B** is aube at an exact version, 2.10.1 unless the unit names a newer one"_, with the hoisted layout.
- Property 2 required B to hold the tree before any timing, with `aube.allowBuilds` matching npm's `allowScripts` and `strictDepBuilds`.
- Properties 3 and 4 set a measurement and its rule: _"**B wins only if** its warm median on `ubuntu-24.04` is at least 20 % and at least 10 seconds below A's. Otherwise A wins."_
- Property 5 said: _"`package-lock.json` stays the lockfile, and npm keeps working for a developer. The root `overrides` keep their `$` references, and aube's warning is accepted, because a catalog would move them where npm doesn't read them."_ It also said that aube is pinned in the workflows, and an action to a full commit hash.
- Property 6 said that if A won, the workflows wouldn't change.
- The reasons said: _"B adds a second tool, a second allow list kept equal to the first, and a deprecation warning, so a gain in the noise of five runs doesn't pay for that."_ They also said that a catalog wasn't adopted, because npm doesn't read catalogs.
- **Why it changed:** the owner's decision of 2026-11-17 for a full move without a speed condition, and the probes at `0706f41f5`, which showed `strictDepBuilds` leaving the built-in list in force.

#### RD-17 — Units run in parallel in long-lived session slots, each slot a locked worktree on the `/workspaces/worktrees` volume with aube's shared store, and a stacked pull request is brought up to date by merging `main` into it

**Decided 2026-11-17 by the architect** on `repo/harness-1` at `21392e738`, on the owner's request relayed by the coordinator the same day: _"можем попробовать распараллелить именно разработку - создавать stack prs, и работать в разных worktree"_, and on session names, _"надо мне только понять, как правильно переименовывать готовые сессии … Возможно, стоит добавить какое-то правило в `cl`-скрипт"_. The process may change. `RD-15` and `RD-16` were decided on `repo/ci-speed-1` and weren't on this branch then, so this entry is numbered after them. **Implemented** on `repo/harness-1` by the [harness handoff](harness-1/harness-handoff.md), at `0b6eba25a` and `45194fb88`, and the [feature proof](reviews/harness-1/feature-proof-claude.md) at `fbae00994` holds. It reaches `main` when #33 merges. (_Was:_ _"**Unimplemented:** the harness handoff implements it."_)

**Amended 2026-11-17 by the architect** on `repo/harness-1` at `4c489e745`, on the owner's proposal relayed by the coordinator: the slot root moves out of the checkout to its own volume, `/workspaces/worktrees`. The owner approved the amendment as proposed (_"Yes, it all looks right"_, as relayed). The owner added that aube's store must be shared: _"aube's shared storage will help a lot here, otherwise it's easy to eat all the free space"_ (as relayed). The cause was the architect's reading that Node resolves upward from a slot inside the checkout into the main checkout's `node_modules`. The title and properties 1, 3 and 8 changed, and property 9 is new. What they said before is at the end.

**Amended 2026-11-17 by the architect** on `repo/harness-1` at `51a992b49`, from the harness report's [session-name reading](harness-1/harness-report.md#witness-4-session-names), relayed by the coordinator. Property 2 gains what `--resume <name>` does after a `/clear`. Nothing else in property 2 changes: the reading shows that `/clear` keeps the name, which is what the property relies on.

**Read at `21392e738`** by the architect, in the devcontainer:

- **The workspace filesystem.** `/workspaces` is the container's overlay, owned by root. Only `/workspaces/material-x` is bind-mounted from the host, and `node_modules` is a volume inside it. A sibling directory such as `../material-x-b` would therefore be lost on a container rebuild and invisible on the host.
- **The ignores.** `.claude/worktrees` is ignored by git (`.gitignore` line 55) and by ESLint (`eslint.config.ts`), and Claude Code's own worktree feature uses it.
- **git is 2.47.3,** which has no `git worktree add --relative-paths` (2.48), so a worktree's links are absolute container paths.
- **`.scripts/cl.sh`** maps each profile to one agent, one effort and one fixed session name, and resumes by that name.

**Read at `2643f2d7d` and `4c489e745`** by the architect, in the devcontainer ([reading](harness-1/checks/slot-root-probe.txt)):

- **Resolution.** From a directory inside the checkout, `require.resolve('vite')` finds `/workspaces/material-x/node_modules/vite`. From a directory outside it, both `require` and `import` fail. Nothing above `/workspaces` holds a `node_modules`, `NODE_PATH` is empty, and Node's global folders don't exist.
- **Mounts.** `/workspaces` is root-owned and holds only `material-x`. The checkout is a bind, and its `node_modules` is the `_nodemodules` volume. `post-create/chown.sh` gives that volume to `node`. Both are on the host's btrfs.
- **git.** A worktree on another filesystem works, and its `.git` file is an absolute path. With the worktree directories gone, `git worktree prune` removed an unlocked worktree and kept a locked one. `git worktree remove` refuses a locked one until it is unlocked.
- **Links across mounts.** A hardlink from the `node_modules` volume to the checkout's bind fails with _"Invalid cross-device link"_. A reflink (`cp --reflink=always`) across the same two mounts succeeds. The main checkout's `node_modules` is a copy today: link count 1.
- **aube 2.10.0.** `storeDir` is read from `AUBE_STORE_DIR`, and `cacheDir` from `AUBE_CACHE_DIR`, besides their `npm_config_` forms and `.npmrc`. Outside CI, `node_modules` is linked from a global virtual store under `cacheDir`, and that store is hardlinked from `storeDir`. With the store on tmpfs and the cache left on the overlay, two hoisted projects got copies (link count 1). With both on tmpfs, the second project's file had link count 4: one inode in the store, the virtual store and both projects. `aube store status` verifies the store against its package indexes.
- **The repository's `postinstall`,** `.scripts/link-tsserver.ts`, writes `typescript/lib/tsserver.js` in place.
- **Disk.** 35 GB free of 248 GB. The main `node_modules` is 736 MB, and aube's store 691 MB.

**Properties.**

1. **A slot** is a lowercase letter from `b` to `z`, or no letter for the main slot.
   - The main slot is the main checkout.
   - Slot _s_ is the worktree `/workspaces/worktrees/<s>` (amended 2026-11-17).
   - **`/workspaces/worktrees`** is the devcontainer's named volume `${localWorkspaceFolderBasename}_worktrees`. `post-create` gives it to `node`, as it does `node_modules`.
   - A slot holds one unit at a time: that unit's branch is checked out there, with its own `node_modules`.
   - **Nothing is installed in `/workspaces/worktrees` or `/workspaces` themselves.** So Node's resolution from a slot stops at the slot's own `node_modules`.
2. **A session is named by its slot, never by its task.**
   - `cl [--init] <profile> [<slot>]` starts or resumes `Mx <Role>` in the main slot, and `Mx <Role> <S>`, with the letter in upper case, rooted in slot _s_.
   - When a unit ends, the owner clears the session (`/clear`), and the slot takes the next unit. **No session is renamed.**
   - Each name is unique among live sessions, so `SendMessage` reaches it.
   - **Resuming after a `/clear` may open the resume picker** (amended 2026-11-17). Read in Claude Code 2.1.326's bundle ([reading](harness-1/checks/session-names.txt)):
     - `/clear` starts a new session id with the cleared session's title;
     - `--resume <name>` matches titles exactly, ignoring case, over the sessions of every worktree of the repository;
     - with one match it resumes that session, and with more than one it opens the picker with the name as its search text, newest first.
     - **Accepted.** The owner takes the newest entry, which is the session that `cl` means. The name's job is to stay unique among live sessions, and `/clear` keeps that.
     - **Whether the picker opens is inferred, not read:** the key that the search deduplicates by wasn't read. Property 2 holds either way, so no further reading is needed.
     - `cl --init` runs once per slot and profile. A second `--init` adds another session with the same title.
3. **`cl` prepares a missing slot and nothing more** (amended 2026-11-17).
   - **It creates a missing slot** with `git worktree add --detach --lock --reason "session slot"` at `origin/main`, and reuses one that exists. It never removes, cleans, switches or unlocks one.
   - **It fails closed without the volume.** With a slot argument, `cl` refuses, with a non-zero exit and a message that names the devcontainer mount, unless `/workspaces/worktrees` is a mount point. It never creates that directory. The main slot doesn't need the volume.
   - The session checks out its unit's branch and installs there.
   - The owner removes a slot with `git worktree unlock`, then `git worktree remove`.
4. **Who runs where.**
   - The coordinator runs in the main slot.
   - **Only the main slot's architect mints, amends, supersedes or renumbers a record identifier.** An architect in another slot, such as a challenge, proposes and doesn't record.
   - Any other role may run in any slot, the consolidator and its passes included. `AGENTS.md`'s _"dispatch only from the main checkout"_ existed for the effort guard, which `RD-18` removes. A worktree's role definitions are those of its branch, which is the work that runs there.
5. **Stacks.**
   - **Opening one.** A unit that builds on another's unmerged work branches from that unit's branch, and its pull request's base is that branch. `verify` runs on it, because `pull_request` has no branch filter.
   - **While the lower pull request is open,** its changes reach the upper branch by merging the lower branch into it.
   - **Merge order.** The lower pull request merges first, and the owner merges each one.
   - **After the lower one squash-merges:**
     - retarget the upper pull request to `main` (`gh pr edit <number> --base main`), unless GitHub did it when the lower branch was deleted;
     - in the upper branch, `git fetch origin && git merge origin/main`, with no rebase and no force-push;
     - in each conflict, a hunk that is the lower unit's change takes `main`'s text, and a hunk that is the upper unit's own keeps its text.
   - **What a squash merge does to a stack.** `main` gets one new commit whose tree holds the lower unit's changes and none of its commits, while the upper branch keeps those commits. So the merge sees the lower unit's changes on both sides of the fork point. Identical hunks merge cleanly. A line that the lower unit changed and the upper unit changed again conflicts, and the upper unit's version is the one to keep. After the merge, the upper pull request's diff against `main` is its own change, and its own squash merge adds one commit, as every pull request does.
6. **The repository record stays one file.** `.plan/00-index.md` isn't split, nor is a package's index.
   - **What conflicts there have been:**
     - two units minting the same next identifier, which property 4's single minter prevents;
     - two units amending the same entry, which is a real dependency that the stack order has to express;
     - edits to neighbouring entries, which are ordinary text conflicts.
   - **Why not split.** A split would change the record resolver (`.scripts/entry.ts`, `RD-5`), its tests, and every link into the index, for a cost nobody has measured.
   - **Revisit it** when a unit's report records a conflict in an index that neither the single minter nor the stack order prevented. The coordinator keeps the count.
7. **Coordination.**
   - **One open task per session,** as before.
   - **One unit per slot,** and several units open at once. For each slot, the coordinator's working summary keeps the unit, branch, pull request, base, state and next dependency.
   - **Upper units wait on decisions.** An upper unit's implementation waits until the lower unit's decisions that it builds on are committed. Its plan names them.
   - **Reviews.** Each pull request has its own review, which reads the diff from its base's head.
8. **Limits** (amended 2026-11-17).
   - **A slot's git links are absolute container paths,** so the host's git can't use a slot. The lock keeps `git worktree prune`, and `git gc`'s prune, from removing a slot's entry where the volume isn't mounted: on the host, or in a container without the volume.
   - **The volume isn't visible on the host.** Uncommitted work in a slot exists only there, and it is lost if the volume is deleted. A slot's commits are in the main checkout's `.git`, on the bind.
   - **Each slot installs its own dependencies,** and property 9 shares their files.
   - **`.claude/worktrees/` stays Claude Code's own** (`isolation: "worktree"` and `EnterWorktree`), with its git and ESLint ignores. `cl` doesn't use it. A worktree there still resolves upward into the main checkout's `node_modules`.
9. **Slots share aube's store by hardlinks** (added 2026-11-17, on the owner's addition).
   - **The setting.** `devcontainer.json`'s `containerEnv` sets `AUBE_STORE_DIR=/workspaces/worktrees/.aube/store` and `AUBE_CACHE_DIR=/workspaces/worktrees/.aube/cache`. Both are needed, because `node_modules` is linked from the global virtual store under `cacheDir`, which is hardlinked from the store. With either on another mount, every file is copied.
   - **Where it is set.** The devcontainer's environment survives a rebuild, is in the repository, and doesn't reach CI. In `.npmrc` the setting would reach CI and every checkout. A user-level config would be in `/home/node`, on the overlay, which a rebuild loses.
   - **The image rule stands.** The development image's handoff forbids `AUBE_*` variables in the image, because an environment value overrides `.npmrc`'s script and version policy. These two set no policy key, and they are in the devcontainer, not the image. `RD-16` property 12 still holds, because neither is `aubeNoAutoInstall`.
   - **CI is unaffected.** It sets neither variable, and aube disables the global virtual store under CI.
   - **The main checkout's `node_modules` copies,** as it does today. It is a different mount (the `_nodemodules` volume), and a hardlink across mounts fails, as read. `link(2)` says that it fails across different mounts even of the same filesystem, so two mounts of one volume wouldn't help. That is one tree, 736 MB at `4c489e745`, and it is accepted with any warning aube prints for it.
   - **No install step writes into an existing file under `node_modules`.** A file there may be a hardlink of the store's, so a write in place changes the store and every slot that links it.
     - `.scripts/link-tsserver.ts` replaces `typescript/lib/tsserver.js` with a new file rather than writing into it, so its write never reaches another link.
     - Any later script that changes a dependency's file does the same.
     - Nobody edits a dependency's file in a slot by hand.

**Why.**

- **Slots, not task names.** A long-lived name is never wrong, so nothing is renamed. The coordinator's address book changes only when the owner adds a slot.
- **A volume outside the checkout** (amended 2026-11-17). It has no `node_modules` above it, it survives a rebuild, and it keeps each slot's dependencies off the host, which is why `node_modules` is already a volume.
- **A shared store:** the owner's concern for disk space. A slot's copy of the tree is about 736 MB, with 35 GB free.
- **Merging `main` in, not rebasing,** because `AGENTS.md` forbids rewriting pushed commits and force-pushing.
- **One minter:** two architects in parallel could both mint `RD-19`.

**Not adopted.**

- **Sibling worktrees** (`../material-x-b`), the coordinator's first proposal. They would be lost on a container rebuild and invisible on the host.
- **Renaming a finished session** by task. Its name is how messages reach it.
- **Avoiding the picker after a `/clear`** (amended 2026-11-17). None of these is better than one keystroke in the picker:
  - **`cl` resumes by session id,** found in Claude Code's transcripts under `CLAUDE_CONFIG_DIR/projects/`. That format is Claude Code's private storage, and the CLI offers no query for session titles.
  - **`claude --continue`** resumes the newest session in the directory. A slot's directory holds the sessions of every role run there, so it can resume the wrong role.
  - **Renaming before `/clear`.** The new session takes the renamed title, so it would need a second rename back, and property 2 renames no session.
- **Rebasing the upper branch onto `main`.** It needs a force-push.
- **Splitting the index now.** See property 6.
- **Slots inside the checkout** (`.claude/worktrees/<s>`), this entry's first choice. Node resolves upward from there into the main checkout's `node_modules`, so a package missing from a slot loads silently from the main checkout. That path is also Claude Code's own.
- **A bind from the host** for `/workspaces/worktrees`. It would put every slot's dependencies on the host.
- **Reflinks** (`packageImportMethod=clone-or-copy`). A reflink across mounts works on this host's btrfs, so it would also share the main tree's extents, and a write in place couldn't reach the store. Not adopted, for these reasons:
  - it saves one tree, 736 MB;
  - it depends on the host's filesystem;
  - a link count can't witness it;
  - aube's documentation gives btrfs hardlinks as faster.

**What the amendment of 2026-11-17 changed.**

- The title said: _"each slot a worktree under `.claude/worktrees/`"_.
- Property 1 said that slot _s_ is _"the worktree `.claude/worktrees/<s>` inside the main checkout. It is on the host's bind mount and already ignored."_
- Property 3 said: _"`cl` prepares a missing slot and nothing more. It creates `.claude/worktrees/<s>` detached at `origin/main` when it is missing, and reuses it when it exists. It never removes, cleans or switches one. The session checks out its unit's branch and installs there. The owner removes a slot with `git worktree remove`."_
- Property 8 said: _"A slot's git links are absolute container paths, so on the host `git worktree list` reports the slots as prunable. **Don't run `git worktree prune` on the host.** Each slot installs its own dependencies."_
- _Why_ said: _"**Inside the checkout,** for the bind mount and the existing ignores."_

**What the second amendment of 2026-11-17 changed.** Property 2 had no bullet on resuming after a `/clear`, and _Not adopted_ had no entry on avoiding the picker. Nothing was removed.

#### RD-18 — The effort guard and `.scripts/claude-role.sh` are removed, and `cl` starts every role session at the effort its definition declares

**Decided 2026-11-17 by the architect** on `repo/harness-1` at `21392e738`, on the owner's decisions relayed by the coordinator: _"устаревший скрипт, его стоит удалить; я сейчас пользуюсь только `cl`"_ (`claude-role.sh`), and _"этот гард тоже в принципе можно убрать (`cl` как раз решил эту проблему более \"брутфорсом\")"_. **Implemented** on `repo/harness-1` by the [harness handoff](harness-1/harness-handoff.md), at `4c489e745`, and the [feature proof](reviews/harness-1/feature-proof-claude.md) at `fbae00994` holds. It reaches `main` when #33 merges. Property 4's steps are the owner's and are pending. (_Was:_ _"**Unimplemented:** the harness handoff implements it."_)

**What still depended on the guard,** read at `21392e738`:

- **Top-level sessions:** nothing. `cl` passes `--effort` and refuses `CLAUDE_CODE_EFFORT_LEVEL`, which is what the guard checked on a main thread. Its levels equal every role definition's `effort:`.
- **Subagents: not effort.** The harness starts a subagent on its ordinary path at its definition's effort, whatever the parent's level.
  - **The guard's record:** a `consolidator` at `medium` spawned `reviewer` and `integrity` at `high` (2.1.260), and an unnamed `cleanup` lens matched its `medium` under enforcement (2.1.263). Both are in `.agents/docs/harness-effort-guard.md` §Measurements and §Governed worker identity, at `21392e738`.
  - **The owner's correction says the same:** _"Агенты харнессом запускаются сразу с заданным effort, а вот для top-level сессий он это не умеет (точнее, там в принципе катавасия с effort происходит, из-за \"дефолта\"; субагенты от этого избавлены). Мы это раскопали когда гард делали."_
  - **The default-effort problem the guard was built for is a top-level one:** `--agent` doesn't apply the definition's effort (2.1.260 and 2.1.263), and `cl` handles it.
- **What the guard checked beyond that,** each in the dispatching call:
  - **the consolidator's lens set,** its dispatch topology;
  - **an explicit `model` argument** on a lens launch, refused before the child started. That argument is the dispatcher's own choice, not a harness default;
  - **a named spawn in an interactive session.** On 2.1.263 it took the in-process teammate path, and a named `integrity` lens ran at its parent's `medium`, not its declared `high`. The guard refused it (`harness-effort-guard.md` §Governed worker identity, _"A named lens reproduces the original failure"_, at `21392e738`). The same record shows that a name alone isn't the trigger, because print mode took the subagent path with one.

  `consolidator.md` requires lens launches with no `name` and no `model`. **Without the guard, that rule and the lens set are unchecked.** A subagent's effort on the ordinary path is not among them.

- **Flagged for the owner:** the teammate-path reading is the one recorded exception to _"subagents start at their definition's effort"_, and it is kept here with its source.
  - Nobody has read it since 2.1.263. The CLI is now 2.1.326.
  - The devcontainer enables agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), whose teammates may take the same path.
  - The no-`name` rule keeps the consolidator's lenses off it, at the cost of a UI label. It stays whatever a later reading finds.

- **Tests, CI and lint.**
  - No workflow, recipe or Vitest project runs the plugin's tests.
  - `.oxlintrc.json` has an override for them.
  - `eslint.config.ts`'s camelcase allow list names the guard's log fields.
- **Documents:**
  - `AGENTS.md` §Before running a governed role and the `Evidence` link to it;
  - `CLAUDE.md` §Running a role;
  - `README.md`'s marketplace step;
  - `.agents/docs/coordinator-setup.md` §Start a guarded role, and `agent-workflow.md` and `coordinator.md`;
  - `consolidator.md` and `coordinator.md` among the role definitions;
  - `.agents/docs/harness-effort-guard.md` and `harness-orchestration.md`.

**Properties.**

1. **Removed:**
   - the guard plugin: `.claude/plugins/harness-effort-guard/`, and `.claude-plugin/marketplace.json`, whose only plugin it is;
   - in `.claude/settings.json`: `env.HARNESS_EFFORT_GUARD_MODE`, `extraKnownMarketplaces.material-x` and `enabledPlugins["harness-effort-guard@material-x"]`. `typescript-lsp` stays;
   - `.scripts/claude-role.sh`;
   - `.agents/docs/harness-effort-guard.md` and `.agents/docs/harness-orchestration.md`. Both last existed at `21392e738`, which is where to read them, and `.plan/harness-guard-2/` keeps its record;
   - the lint entries that only the guard used: `.oxlintrc.json`'s override, and each name on ESLint's camelcase allow list that no remaining source uses (`RD-10`'s exact list);
   - **the text that names any of these,** in the documents listed above.
2. **`cl` reads the effort from the role definition,** the `effort:` field of the session root's `.claude/agents/<agent>.md` frontmatter, and refuses to start if the field is missing or empty. Its profile table keeps the profile, the agent and the session name. It still refuses a set `CLAUDE_CODE_EFFORT_LEVEL`, which overrides every subagent's declared level, guard or no guard.
3. **The consolidator's dispatch rules stay written and become unchecked:** its lens set, no `model` on a lens launch, and no `name`. A subagent's effort on the ordinary path needs no check, because the harness applies it. The no-`name` rule keeps lenses off the teammate path, which on 2.1.263 didn't apply the declared effort (the flag above). (**Corrected 2026-11-17 at `3ec67162c`,** on the owner's correction: this property said _"`consolidator.md` states why: a named spawn was observed to ignore the declared effort"_, and the reading above it said _"for subagents"_ as if the guard were the only check on their effort.)
4. **The owner's own configuration** isn't the repository's. After the merge, the owner removes the registered marketplace (`claude plugin marketplace remove material-x`) and may delete the plugin's data directory.
   - **A second registration** (added 2026-11-17, on the feature proof's `reviewer-1`). The owner's user-level settings also enable `harness-effort-guard@devcontainer-clipboard`, version 0.1.0, installed on 2026-10-06 from another project's marketplace. Its cached copy runs on `SessionStart`, `Stop`, `SubagentStop` and every `PreToolUse`. With `HARNESS_EFFORT_GUARD_MODE` unset, it applies no verdict, but it still announces _"Effort guard active"_. **That announcement checks nothing,** and no repository document explains it.
   - **Whether to disable or uninstall it is the owner's choice,** because the registration serves the owner's other projects too. `claude plugin marketplace remove material-x` doesn't remove it. Until the owner removes it, sessions in this container may show the announcement, and it says nothing about whether the consolidator's dispatch rules hold.

**Why.**

- **The owner's decision,** and `cl` covers every session the owner starts.
- **The harness starts subagents at their declared effort,** so the guard added no effort check there. What it added was enforcement of the consolidator's own dispatch rules, which bind one role and stay written.
- **Reading the level in `cl`** replaces `claude-role.sh`'s one remaining property, that the launcher and the definition can't drift. `coordinator-setup.md`'s manual _"check them against role frontmatter"_ goes with it.

**Not adopted.**

- **Keeping the guard in observe mode.** Nothing would read what it logs.
- **A smaller hook that checks only named spawns.** The owner chose removal. If the consolidator's rule is broken in practice, that is a new decision.
- **Keeping the two guard documents** as current-state documents. They describe a mechanism that no longer exists. Their measurements are in git history at `21392e738` and in `.plan/harness-guard-2/`.

#### RD-19 — The layout stays hoisted: the isolated layout is not adopted, because its two modes resolve differently and it buys no check this repository lacks

**Decided 2026-11-18 by the owner,** relayed by the coordinator, on the [isolated-layout report](aube-isolated-1/aube-isolated-report.md) at `96b2975d3`, read in slot `b` with aube 2.10.0 ([reading](aube-isolated-1/checks/isolated-reading.txt)). Recorded by the main slot's architect, who agrees with the report's recommendation. The owner also decided to fix the report's three findings. They are `RF-51`, `RF-52` and `RF-53`, and they don't depend on the layout.

**Properties.**

1. **`node-linker=hoisted` stays,** as `RD-16` property 7 says.
2. **Revisit** when one of these holds, and not otherwise:
   - aube deprecates or changes the hoisted linker, or a defect that only hoisted has becomes a capital problem in `RD-16` property 11's sense;
   - an aube release makes the isolated layout resolve an undeclared import the same with and without the global virtual store. The witness is the reading's `eslint-plugin-oxlint` typecheck.
3. **An adoption decided later owes at least:**
   - one mode locally and in CI, set in the repository;
   - every gate job green in that mode, Firefox, WebKit and visual included, and `just size`;
   - size-limit loading `size-limit-preset-rolldown`;
   - `link-tsserver.ts` failing loudly when the dependencies are installed, and never writing into a shared virtual store;
   - the `RF-48` reading repeated on that layout.

**Why.**

- **Parity.** Under aube 2.10.0, the isolated layout has two modes: the global virtual store, aube's default outside CI, and a project-local store, its default in CI. They resolve a dependency's undeclared import differently. The same commit typechecks locally and fails in all eight packages in CI. A local pass would no longer predict CI.
- **No gain for the slots.** Hoisted files are already hardlinks of the shared store (`RD-17` property 9). Warm installs take about 1 s on both layouts, and `RF-48` reproduces on both.
- **Weak strictness here.** The root declares every tool, and workspace packages resolve through the root's `node_modules` on both layouts. So the isolated layout checks only imports that no manifest in the repository declares. It found one, `RF-52`. It doesn't catch a published package that imports what its own manifest doesn't name, which is `RF-51`'s class.
- **Two working things break,** and each would need a repair first: size-limit's plugin loading under the global virtual store, and the editor's `tsserver.js`.

**Not adopted.**

- **Isolated with the global virtual store everywhere** (`--enable-global-virtual-store` in CI). CI would resolve through a store-wide hidden hoist whose content depends on what that runner installed. Locally, every slot shares that directory.
- **Isolated and project-local everywhere.** Typecheck fails in all eight packages until each undeclared import of a dependency is repaired, and the slots then gain nothing over hoisted.

#### RD-20 — material-x supports the current stable release of each engine until its first release, and a browserslist is owed before that release

**Decided 2026-11-18 by the owner,** relayed by the coordinator, in answer to the question that `RF-43` left open: _"for now yes; for material-x's release we'll make a proper browserslist"_. The question was whether material-x states a browser floor. The architect recommended the current stable release of each engine (`RF-43`'s entry of 2026-11-18). Recorded by the architect on `repo/traits-plugin-1` at `68077cdef`. `RF-43` was closed on `main` at `377ca72df` (#35), which this branch doesn't contain yet. **This entry answers `RF-43`'s last bullet,** _"Still open, and the owner's: whether material-x states a browser floor"_. That bullet gets a dated pointer to this entry when this branch next merges `main`.

**Properties.**

1. **The floor until the first release.** `@ydinjs/material-x` supports the current stable release of Chromium, Firefox and Safari. A behaviour that fails only in an earlier release is outside what the package supports. The floor moves with each engine's stable release, and no version is pinned.
2. **What source may use doesn't change.** `CONTRIBUTING.md` Part I's _"Use Baseline-2025 features"_ stays. Each Baseline 2025 feature is in each engine's current stable release, so the two rules agree. Invoker commands, which the switch buttons' `input` and `change` depend on, are Baseline since December 2025 (`RF-43`'s reading of MDN and web-features).
3. **A browserslist is owed before material-x's first release.** The owner writes the query. The deadline is that release, not a merge. The release owes at least:
   - a browserslist query in `packages/material-x` that states a minimum version of each engine, and replaces property 1, its `CONTRIBUTING.md` bullet and this entry's floor;
   - a check of each platform feature the source relies on against that query. Invoker commands need Chromium 135, Firefox 144 and Safari 26.2. A lower minimum needs another activation path for the switch buttons, or the minimum is raised;
   - the supported browsers stated for consumers in [`packages/material-x/README.md`](../packages/material-x/README.md);
   - a decision on how Part I's Baseline-2025 rule relates to the query: it stays, it follows the query, or the query replaces it.
4. **Where the floor is stated:** `CONTRIBUTING.md` Part I, _Language and platform_, until the browserslist replaces it.

**Why.**

- **A reviewer needs a floor to judge a dependency on a recent feature.** `RF-43`'s feature proof found that a switch fires `click` and never `input` or `change` in an engine without invoker commands. With no floor stated, that couldn't be read as a defect or as accepted behaviour.
- **A moving floor costs no user yet.** The package is unreleased (`RF-51`: a defect in its published surface _"blocks its first release, not a user"_). A list of minimum versions is a promise to consumers, so it is made with the release.

**Dated 2026-11-20 by the architect: the floor of property 1 now covers every released `@ydinjs` package** (`RD-27` property 3, on the owner's answer: _"for now; minimum versions will be derived later for all packages"_). Property 3 doesn't change: material-x's browserslist is still owed before its first release, unless the unit that derives minimum versions for every package decides otherwise.

#### RD-21 — One job fetches the engines' system packages before the test jobs start, and every job that launches a browser installs them offline from the cache

**Decided 2026-11-18 by the owner,** relayed by the coordinator, on Architect B's proposal in the [CI-deps handoff](ci-deps-1/ci-deps-handoff.md) at `073266198`, which answers `RF-58`. The owner's earlier direction was that system dependencies are installed up front, before any test starts. The owner chose this cache over a custom image: _"the cache looks simpler, much simpler"_, because the cache goes cold only every few weeks. Recorded by the main slot's architect on `repo/ci-deps-1`. It was proposed as `RD-20`. That number went to the browser floor on `repo/traits-plugin-1`, so this entry is `RD-21`. **Implemented 2026-11-18** on `repo/ci-deps-1` (#38, not yet merged): the code at `10100984f`, and the report at `a4a90f683`. It applies to `main` when #38 merges. `RF-58`'s closure holds the reading. Before: unimplemented, and the handoff implemented it.

**Properties.**

1. **The fetch job.** `system-deps` runs in a full run after `scope`, as a matrix over `chromium`, `firefox` and `webkit`.
   - **Each leg's cache key** is built from:
     - `ImageOS`;
     - the runner image's release, the part of `ImageVersion` before its first dot (`20261111`);
     - the runner's architecture;
     - the engine;
     - the exact `playwright` version in the root `package.json`.

     The two pools of one release fetched the same volume per engine (`RF-58`). Their build numbers differ, so a key with the build number would miss on whichever pool didn't fetch.

   - **On a hit,** the leg ends after the lookup, and it doesn't install aube or the dependencies.
   - **On a miss,** Playwright still chooses the packages. An apt configuration sets download-only mode and an archive directory, and `aube exec -- playwright install-deps <engine>` runs. apt then downloads exactly what Playwright's install would download on this image, and installs nothing. Each leg saves its own engine's directory under its key, so a re-run after a timeout doesn't fetch that engine again.
2. **Every job that launches a browser on Linux** installs through one local composite action, `.github/actions/browser`, with an `engine` input. That covers `chromium`, `firefox`, `webkit`, `docs`, `measurements`, and the recording workflow's job. The action:
   1. restores the engine's archives under the same key;
   2. **on a hit,** installs those archive files with `apt-get install --no-download`, without `apt-get update`, so it never reaches the mirror. **The install names the files themselves,** so it doesn't depend on the versions in the runner's package lists: a fetch made after an `apt-get update` can hold a newer version than those lists name, such as Mesa's upgrade in Chromium's set. **apt's archive cache, `Dir::Cache::Archives`, is the restored directory for that command:** under `--no-download`, apt keeps only archives that are already in its archive cache under its own file names, and it treats a file named elsewhere as a download. (Added 2026-11-18. The offline install failed this way in every job of the CI-deps cold run, and the [CI-deps handoff](ci-deps-1/ci-deps-handoff.md#the-second-stop-the-cause-and-item-1b) cites apt's source. The mechanism doesn't change.);
   3. checks the result with `aube exec -- playwright install-deps --dry-run <engine>`;
   4. **on a miss, or if the install or the check fails,** writes a warning annotation that says which of the three happened, then runs `aube exec -- playwright install --with-deps <engine>`. The fallback keeps the job correct when the cache is wrong or missing;
   5. installs the browser with `aube exec -- playwright install <engine>`. The fallback's command has already done this.
3. **Order.** Each job of property 2 that is in `verify.yml` `needs` `system-deps`, and so does `verify`: in full mode `system-deps` must succeed, and in reduced mode it is skipped. The recording workflow has no fetch job. It restores what `main`'s runs saved, and falls back on a miss.
4. **Timeouts.** The test jobs' limits don't change. `system-deps` has 30 minutes: a miss on the slow pool fetches WebKit's 125 MB in about 21 minutes at 100 kB/s, and a hit takes well under a minute. **When every test job's restore hits, that limit is the only place a slow mirror can still fail a run,** and it fails the run before any test starts. **A test job whose own restore misses** falls back to the mirror, as property 2.4 says, and on the slow pool it can time out as it did before this decision. `webkit` (8 minutes) and `docs` (5 minutes) can't fetch their sets at 100 kB/s within their limits. That miss happens when:
   - the job runs on a runner image of another release than its engine's `system-deps` leg, as during an image rollout (inferred from the key, not observed);
   - the entry is evicted between the leg and the job;
   - the leg fails to save;
   - the recording workflow runs before any run has saved for its image.

   The fallback keeps such a job correct, not on time, and its warning names the miss. (**Amended 2026-11-18** by the architect, on the [CI-deps report](ci-deps-1/ci-deps-report.md)'s witness 3, forced-miss run 44259919530, where `webkit` fell back on `us-east-2.ec2.archive.ubuntu.com` and was cancelled at its limit. The property said that the test jobs' limits don't change _"because their install no longer depends on the mirror"_, and that the `system-deps` limit _"is the only place a slow mirror can still fail a run"_, without the condition that every restore hits.)

5. **What doesn't change:** the plain runners, the engines, the package list (still Playwright's), the browser download, and the mirror. `RD-9`'s visual environment is the same set of packages.

**Why.**

- **A fetch, not an install, up front.** Each job is a fresh virtual machine, so a package installed in one job doesn't exist in the next. On a plain runner, fetching is the only work one job can do for the others.
- **An offline install from exact files, not the cache plus `apt-get update`.** After an update, apt installs any newer version from the mirror. A mirror publish between two runs would then send the jobs to the slow mirror again.
- **Playwright still names the packages,** through its own `install-deps`. Its `--dry-run` checks the offline install in every job, so a stale or partial cache leads to the fallback and not to a browser that fails to launch.
- **One leg per engine, in parallel.** Each engine's set is what that engine needs on a fresh runner, so a Chromium job doesn't unpack WebKit's 181 packages.
- **One composite action,** because six jobs in two workflows install engines (CONTRIBUTING §6).
- **The cache's scope,** from GitHub's documentation of dependency caching and not read in a run: a run restores caches saved on its own branch, on a pull request's base branch, or on the default branch. So `main`'s runs fill the cache that every pull request reads, and a pull request's own save serves only that pull request. A pull request that changes the `playwright` version misses until its own fetch saves.

**What it costs.** On a hit, a full run's critical path gains the `system-deps` legs: runner allocation, checkout and one cache lookup per leg. The handoff's witness 4 measures it against the CI-speed unit's full run of 518 s.

**Not adopted.**

- **A custom CI image with the packages installed,** considered by the owner and declined: the cache is much simpler, and it goes cold only every few weeks. An image also reverses `RD-6`'s plain-runner amendment, which was the owner's direction, and Playwright's own image adds a second place to pin its version.
- **Another mirror,** for example `azure.archive.ubuntu.com`. It couples the gate to one provider's mirror that the runner didn't choose, and every job stays on the mirror's path.
- **Caching the archives inside each test job,** with no fetch job. It adds nothing to the critical path. But on a miss up to five jobs fetch in parallel, Chromium's set three times, and a slow mirror stalls a test job, which is the opposite of the owner's direction.
- **Caching the browsers.** Their CDN wasn't the stall.
- **Removing packages from Chromium's set,** such as the fonts. The visual baselines were recorded with them (`RD-9`).
- **Changing the miss path** (added 2026-11-18, with property 4's amendment). A test job's miss falls back to today's install, as it did before this decision, so the miss path is no worse than before. Three changes were considered and not adopted:
  - **A longer limit for the fallback.** A step can't have a limit of its own that is longer than its job's. So `webkit` would need about 30 minutes in every run, and that would hide a hung test for 30 minutes on a hit as well.
  - **Failing fast on a miss.** It turns a job that would pass on the fast pool into a failed run, and its re-run lands on whichever pool the queue assigns.
  - **Restoring another release's archives** with a restore key. That would cover the rollout case. But a set fetched for one image can ask the other for a downgrade, or miss a package, so it adds a third path for an inferred case.

  **What reopens it:** a test job in the gate that misses on its own, outside a forced witness, and times out. The architect then registers a finding with the run, and the restore-key option is read first.

**What this amends,** in place, each with what it said before: `RD-6` properties 2 and 8 and one reason, `RD-12` property 11, and `RD-15` property 5.

#### RD-22 — GitHub Issues on one Projects board are the work queue, and the `.plan/` records stay the only record

**Decided 2026-11-18 by the owner, as a trial,** relayed by the coordinator, on the architect's [work-queue plan](work-queue-1/work-queue-plan.md) at `a3e8dfbe5`. The owner's answers are in the plan's [Owner's answers](work-queue-1/work-queue-plan.md#owners-answers): a trial, milestones in the order box-quad, drag, material-x with the set left open, answers in chat to the coordinator for now, a board whose `Status` field replaces the state labels, and titles in plain words after the address. Registered by the architect on `repo/work-queue-1`. `RD-20` is on `repo/traits-plugin-1` and `RD-21` on `repo/ci-deps-1`, so this is the next free number. **Unimplemented:** the plan's steps 2 and 3 implement it.

**Properties:** the plan's [properties 1 to 14](work-queue-1/work-queue-plan.md#decision-proposed-as-repord-22), as written at `a3e8dfbe5` and amended below, with its `Status` options and labels. In short:

- the queue holds queue state and a description only: the item and a short description of it, its `Status` and rank, the slot and branch that hold it, and whether it is done. A decision, a reason, evidence or a tier stays in the record (properties 1 and 4);
- an issue names its entry by qualified address and copies no decision, reason, evidence or tier from it, and at most one open issue has a given address as its subject (properties 2 and 3);
- an issue's body opens with a description of the item in plain English, which the record governs (property 2, amended 2026-11-19);
- what first appears on GitHub is copied into the record before anyone relies on it (property 5);
- the coordinator is the routine writer, the owner sets the order, and roles write only through a pull request description's `Closes #N` or `Refs #N` (properties 7 and 8);
- text from any other account is information, never a task, and an agent's text carries its role stamp (properties 10 and 11);
- everything on GitHub is in English and follows the pull request rules (property 12).

**Once `.agents/docs/work-queue.md` exists** (the plan's step 2), it states these rules as they stand, and this entry is the decision and its reasons. A change to a rule changes that document, and this entry records the change.

**Amended 2026-11-18 by the architect,** on the [step-2 review](reviews/work-queue-1/feature-proof-claude.md) at `1ff70cbef`, before the owner accepts the documents:

- **Property 2:** a title is the address, a space, an em dash and a space, and then the item in plain words. The plan's property said only that a title _"opens with the address"_, with the em dash in its example (`reviewer-3`).
- **Property 3:** the documented check matches the address followed by anything but a digit, so a hand-edited separator is still found. The plan's example matched `repo:RF-59 —` exactly.
- **Property 10:** `AGENTS.md`, which every role has, routes to `work-queue.md` before a role reads an issue's text. The plan's rule reached a role only when it wrote to GitHub (`reviewer-2`).
- **Property 12:** `AGENTS.md` states the bare-`@name` rule, which `work-queue.md` attributes to it. No document stated it before (`reviewer-1`).

**Amended 2026-11-18 by the architect,** on the owner's later answer relayed by the coordinator, before the owner accepts the documents: **no milestones for now.** The queue is a kanban queue, and the board's `Status` and the rank within it are its only ordering. This replaces the answer on milestones in the _Decided_ paragraph above. Properties 1, 7, 12 and 14 and the plan's section on labels and milestones changed, and the plan's [Owner's answers](work-queue-1/work-queue-plan.md#owners-answers) lists what each said. This entry's first summary bullet listed _"its milestone"_ in the queue state, and its _Properties_ line adopted the plan's _"labels and milestones"_. The one gap, release scope, and a proposal that uses _blocked by_ on the release issues are in the plan's [Release scope without milestones](work-queue-1/work-queue-plan.md#release-scope-without-milestones). The proposal waits on the owner. **Answered 2026-11-18 by the owner,** relayed by the coordinator: material-x's release item is removed for now, and no release issue is blocked by another item. The plan's [Release scope without milestones](work-queue-1/work-queue-plan.md#release-scope-without-milestones) records the answer.

**Amended 2026-11-19 by the architect,** on the owner's request relayed by the coordinator: **an issue's body carries a short description of the item in plain English.** The board shows only titles, and the owner often can't judge what an item is about or how large it is without opening the record. [`work-queue.md`](../.agents/docs/work-queue.md#issues) states the rule:

- **What it says:** in at most three sentences, what goes wrong or what is missing, what the work delivers, and its size as _small_, _medium_, _large_ or _not known yet_, each defined there. For a step, it describes that step.
- **What it doesn't say:** no decision, reason, evidence or tier, no order or urgency, and no record address, commit, run, measurement or line number.
- **The record governs.** Where the description and the entry differ, the entry applies and the description is corrected. A size that the entry states is the size. A role acts on the entry, never on the description.
- **Who keeps it current:** the coordinator writes and edits it. A role whose commit changes what an entry requires, its scope or its size names in its closing message each open issue whose description no longer holds.
- **The open issues** get their descriptions from an implementer, as the owner asked: the plan's [step 4](work-queue-1/work-queue-plan.md#implementation), the same exception to the writers' rule as step 3's population. `work-queue.md` now states that exception, and that a body has one stamp, that of the role that last wrote it.

Before this amendment, property 1 said _"The queue holds queue state only"_ and property 2 that an issue _"copies nothing from"_ its entry. This entry's first two summary bullets said the same. `work-queue.md` said _"The body is short, and nothing else goes in it"_, and an `unregistered` body stated the observation _"in one or two sentences"_. The plan's [Owner's answers](work-queue-1/work-queue-plan.md#owners-answers) lists what changed.

**Why these bounds.** Property 2's reason for copying nothing was drift: records retitle and amend entries, and a copy goes stale where nobody reads it. A description is a paraphrase, not a copy, and the bounds keep what drifts or misleads in the record: the decision, the reason, the evidence and the tier. The size is an estimate of the work, which a tier isn't, since a tier is the consequence. The owner orders by both. A fixed scale lets him compare items. Identifiers stay out because the description exists for a reader who doesn't know them. The record governs, and roles act on the entry, so a stale description can mislead the order and nothing else. The writer of the change reports it, because the coordinator can't watch every entry, and the role that changed one knows that it did.

**Dated 2026-11-19 by the architect: implemented on this branch.** The plan's steps 2 to 4 are done: `work-queue.md` and the other documents in its [Where the rules live](work-queue-1/work-queue-plan.md#where-the-rules-live), reviewed at `1ff70cbef`; the labels, issues and board ([step 3 readback](work-queue-1/checks/step3-readback.txt)); and a description on every open issue ([step 4 readback](work-queue-1/checks/step4-readback.txt), at `f8b46e347`). The _Unimplemented_ line above is answered. The documents reach `main` with this branch's pull request. Which issues are open, their `Status` and their descriptions are queue state, which is on GitHub and not in this entry (property 1).

**The trial.** The owner may end or change it at any time. Ending it amends this entry. Until then the queue's issues and board are what is next, and they never stand in for a record entry. No review point is set. The plan names the first step if the trial shows drift: a small check of open issues whose entry is closed, duplicate addresses, and items whose `Status` disagrees with the issue.

**Why.** A queue must answer what is next across every slot at once. A record entry exists on its branch until that branch merges, while an issue exists in one place for every branch. The queue lived only in the coordinator's session and was nearly lost twice. The rest is in the plan's [Problem](work-queue-1/work-queue-plan.md#problem), its [Readings](work-queue-1/work-queue-plan.md#readings) and its [_Rejected or changed_](work-queue-1/work-queue-plan.md#rejected-or-changed-from-the-coordinators-proposal) section, which this entry adopts: no tier labels, the `safari` label kept out of the queue, the board replacing the state labels, and no issues for #37 and #38.

#### RD-23 — The visual project compares screenshots at a threshold that sees a state layer at the tokens' lowest opacity, chosen by a reading on GitHub's runner

**Decided 2026-11-18 by the owner,** relayed by the coordinator, on the architect's [state-layer visual plan](state-layer-visual-1/state-layer-visual-plan.md) at `b76c7a012`, which answers `RF-41`. The owner chose branch (a): the visual layer sees state layers. He accepts the review load: _"Yes, let's"_. Recorded by the main slot's architect on `repo/state-layer-visual-1`. The plan proposed `RD-24` if `RD-22` and `RD-23` were registered first. `RD-22` is on `repo/work-queue-1`, and no branch registers `RD-23`, so this decision is `RD-23`. The material-x size plan on `repo/mx-size-1` proposes `RD-23` too, and that plan's decision takes the next free number when it is registered. **Implemented 2026-11-18** on `repo/state-layer-visual-1` (#66, not yet merged), as the architect read it on the [feature proof](reviews/state-layer-visual-1/feature-proof-claude.md) at `b51d3a9a0`. The [threshold reading](state-layer-visual-1/checks/threshold-reading.md) (run 44276375207) chose 0.01, which `0bd5a467b` sets, and `test-architecture.md` §What screenshots prove states the rule. #67 (`082c6086b`) re-recorded the five baselines that fail at 0.01 in both runs: the three focused ones, `button-group-standard-disabled` and `checkbox-disabled`. Run 44279730764 at `362851ed3` passes them in two `chromium` attempts. **Changed 2026-11-18 by the architect.** Until then, this line was the implementer's, at `0bd5a467b`: _"Partly implemented … Their re-recording under property 4 is still owed."_ Before that, the entry said unimplemented.

**Properties:** the plan's [properties 1 to 6](state-layer-visual-1/state-layer-visual-plan.md#decision-proposed-as-the-next-free-rd-), as written at `b76c7a012`. In short:

- one threshold for the visual project, in its browser configuration, with `includeAA` off and no mismatched pixel allowed, and no row overrides it (property 1);
- the threshold is the largest swept value at which the three focused rows fail against their stale baselines, the three hovered rows fail with the hover layer's opacity set to 0, and two runs at one commit agree on every row (property 2);
- the reading sweeps 0.1, 0.06, 0.045, 0.03, 0.02, 0.01 and 0 on GitHub's `ubuntu-24.04` runner in `RD-9`'s environment, twice at each and once with the mutation, outside the gate, and is saved (property 3);
- each row that fails in both runs is re-recorded under `RD-13`, and the owner reviews each changed baseline (property 4);
- if no value qualifies, the comparator stays at 0.1, and that is a stop for the owner before the unit takes `RF-41`'s documentation branch (property 5);
- `test-architecture.md` §What screenshots prove states the rule that applies (property 6).

**Property 2 (i), amended 2026-11-18 by the architect,** on `reviewer-1` of the feature proof, relayed by the coordinator. **The value doesn't change.**

- **The premise was false for one row.** Condition (i) read _"each of the three focused rows fails against its current baseline, the stale one with no focus layer"_. The stale `checkbox-focused` baseline shows the hover layer instead. Its disc is `237,237,236`, a layer of about 0.08 over the white surface, and the new baseline's disc is `232,232,231`, which is 0.1. The architect read both pixels from the two images. The old image was probably recorded before #27's `beforeEach` parked the pointer, which is inferred. So that row's witness measured the hover layer against the focus layer. It is the only row that rules out 0.045 to 0.02.
- **Condition (i) now reads:** each of the three focused rows fails against its stale baseline, which doesn't show the focus layer. The baseline has no layer, or another state's layer. The diff covers the layer's area, not only its edges.
- **0.01 stays, because the row it rests on is a real case of this decision's subject.** A row titled _focused_ whose baseline shows the _hovered_ state is a wrong baseline, the kind this decision exists to catch. From 0.02 to 0.045 the comparator passes it. 0.045 was inferred and not read on the runner. The cost is review load, which the owner accepted, and the 21 jobs of the reading showed no false failure.
- **The owner's option:** to trade that case for less review load, a new reading with a no-layer witness for the checkbox chooses the value. That is a new unit, and the owner orders it.

**The review load is accepted.** Every later change that moves a rendering by more than the new threshold proposes a baseline change, and the owner reviews it. That is what a baseline is for.

**Why,** and **Not adopted:** the plan's sections of those names, which this entry adopts. In short: a row titled _hovered_ or _focused_ exists to show that state, and at 0.1 three of its baselines are wrong without anything failing. One setting, because `RD-9` pins the environment that the default threshold absorbs. The reading chooses the value, not the arithmetic. Not adopted: the documentation branch by default, per-row thresholds, fixtures with more contrast, and an allowance of mismatched pixels.

#### RD-24 — material-x is measured by size-limit with the Rolldown preset, one row per runtime entry and one complete row, with no ceiling until its first publication

**Decided 2026-11-18 by the owner,** relayed by the coordinator, on Architect B's [size plan](mx-size-1/mx-size-plan.md) at `d512c8def`, which answers `RF-45`. The owner answered in two steps: _"Let's leave it without limits for now. The package is under heavy development, so there's no point in setting limits yet."_ Then yes to all 18 runtime entries plus `complete`, and yes to CI notifying as `RD-7` decides. Recorded by the main slot's architect on `repo/mx-size-1`. It was proposed as `RD-23`. That number went to `RF-41`'s decision on `repo/state-layer-visual-1`, and `RD-20` to `RD-22` are on `repo/traits-plugin-1`, `main` and `repo/work-queue-1`, so this entry is `RD-24`. **Unimplemented:** the plan's [Implementation](mx-size-1/mx-size-plan.md#implementation) implements it.

**Properties:** the plan's [properties 1 to 8](mx-size-1/mx-size-plan.md#decision-registered-as-repord-24), as written at registration. In short:

- one row per entry in `files.json`'s `runtime` list, and one `complete` row that measures a single module importing every entry. A row never lists several files for a composition (property 1);
- the rows come from `files.json`, or the size configuration fails when the two disagree (property 2);
- size-limit 14.3.0 and `size-limit-preset-rolldown` as devDependencies, a `size` recipe that builds first, and material-x in the root `just size` and `.scripts/size-reading.ts` after `core` (property 3);
- Brotli governs (property 4);
- no ceiling until the first publication, so the rows report and never signal. A unit that changes material-x's runtime output reports each row against its base, with its control row (property 5);
- before the first publication of `@ydinjs/material-x`, which the owner performs, a unit sets each ceiling to its reading after the release's last change, with no slack. The size configuration's comment states the rule and names this decision (property 6);
- CI notifies, as `RD-7` decides (property 7);
- hand readings with another bundler end (property 8).

**No issue stands for the boundary.** On 2026-11-18 the owner removed material-x's release item: _"Let's remove the material-x release card for now. It'll be built up from the spec, and that's quite big."_ The coordinator closed #58 as not planned. The plan's property 6 named that issue until registration, and the plan records the change.

**`RF-45` stays open** until the ceilings exist ([How this meets `RF-45`](mx-size-1/mx-size-plan.md#how-this-meets-rf-45)). A row without a ceiling isn't the budget its required property asks for.

**`RD-7`'s property 5** lists the packages that the root `just size` measures. When this unit's rows land, the main slot's architect adds material-x there in a dated, non-substantive note. The rule doesn't change.

- **Done 2026-11-18** on `repo/mx-size-1`, so that the note lands with the rows.
- **Dated 2026-11-18 by the architect: the comment shows no base or difference** while `RF-65` is open. Property 5's own reading is then the only signal of a row's growth: a unit that changes material-x's runtime output reads its rows before and after. The **Why**'s _"the pull requests' comments show it"_ holds once `RF-65` is repaired. **Closed 2026-11-19 by the architect:** `RF-65` is repaired and closed, and #74's comment shows each material-x row's base and change.

**Why,** and **Not adopted:** the plan's sections of those names, which this entry adopts. In short: the repository's instrument, not a new one. Every entry, because a row costs about a tenth of a second and an entry without a row is `RF-45`'s gap. No ceiling while almost every change moves rows on purpose. A boundary that the owner performs, not a schedule. Not adopted: ceilings re-based at each approved change, amending `RF-45`'s required property, slack, rows for only some entries, and hand measurement.

**Dated 2026-11-20 by the architect: the rule after the release is stated** (property 6's _"The architect states the rule that governs the limits after the release"_). It is `RD-27` property 2, in the owner's words: a ceiling may be lowered without asking, and raising one needs his approval. The release workflow refuses a package with a row over its ceiling. `RF-45` closes when material-x's ceilings exist, as before.

#### RD-25 — An agent may open a pull request without being asked, and the owner merges it

**Decided 2026-11-19 by the owner,** relayed by the coordinator: _"Shall we let them open one without asking? I'll say 'yes' anyway, so why suffer. Merging stays with me for now."_ (translated). Registered by the architect on `repo/work-queue-1` at `cf8261417`. `RD-24` is the highest number on any branch on `origin` and in any slot, so this is the next free number. **Implemented** in `AGENTS.md` in the commit that registers it.

- **The rule:** once a unit is finalized and its branch is pushed, an agent may open the branch's pull request without being asked, if the branch has no open pull request. The rest is unchanged: the pull request leaves out session links, is written in English, and names its issue with `Closes #N` or `Refs #N` (`RD-22` property 8, [`handoff.md`](../.agents/docs/handoff.md#publish-the-branch)).
- **What stays with the owner:** merging. An agent doesn't merge a pull request and doesn't enable auto-merge. The owner's _"for now"_ makes this a standing rule until he changes it, and a change amends this entry.
- **What it said before.** `AGENTS.md` said _"**Do not open a PR, force-push, push `main`, or rename, delete or otherwise move any other shared ref** unless asked."_ and _"**The owner merges pull requests.** Agents may create a PR when asked, but must leave it open for the owner. Do not merge it or enable auto-merge."_ Those lines came from #13 (`cc8c2e5f5`), and no record entry held them.
- **Where the rule lives:** `AGENTS.md`, which every role has. No role definition, `coordinator.md`, `handoff.md` or `work-queue.md` repeated the old rule. `coordinator.md`'s _"merging and releasing each require authorization"_ doesn't change.

**Why.** The owner approved every request to open a pull request, so asking cost a round trip and decided nothing. Merging is where his decision lies, and it stays his.

**Amended 2026-11-21 by `RD-32`: a plan alone doesn't finalize a unit that implements it.** The rule above still holds once a unit is finalized and pushed. A plan and its implementation now share one branch and one pull request, so the pull request opens after the implementation. Until then, the rule let an architect's pushed plan have a pull request of its own, as #90 has.

#### RD-26 — Traits are plain classes in two layers, a component names its traits in a `Composed` annotation, and the flattener is a required build step

**Decided 2026-11-19 by the owner,** relayed by the coordinator, on Architect B's [feasibility study](trait-decorators-1/trait-decorators-plan.md) and [migration plan](trait-decorators-1/trait-migration-plan.md) at `250b55f96`. The plan's [owner's decisions](trait-decorators-1/trait-migration-plan.md#the-owners-decisions-2026-11-19) section lists his answers. Registered by the architect on `repo/traits-migration-1`, which merged `repo/trait-decorators-1` into `origin/main` at `24c6672ce` (`e49b67e24`, `RD-17`). `RD-25` is the highest number on any branch on `origin`, so this is the next free number. **Unimplemented:** the plan's [seven commits](trait-decorators-1/trait-migration-plan.md#commits) implement it on this branch, and its pull request opens after the plan's [proofs](trait-decorators-1/trait-migration-plan.md#the-proofs-before-the-pull-request) hold.

**It supersedes the `trait()`/`impl()` design:**

- core's transformer `trait(transformer, brand)` and `impl(Base, [traits])` in `traits/primitives.ts`;
- the descriptor `trait()` in `traits/attributes.ts`;
- the flattener as an optional optimization, which retained with a warning whatever it couldn't prove safe ([`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) §Purpose).

No register entry held that design. It lived in the code, in that document and in `architecture.md` §Traits and attributes, and in `RF-44`'s rulings. This is a new entry and not an amendment, because it replaces the API and the plugin's purpose.

**Properties:**

1. **Layer (a), `@ydinjs/core/traits/composition.js`, knows nothing of elements.**
   - A trait is a plain class. It extends a bound, `bound()`, which is `null` at runtime and types what the trait requires of its base.
   - A trait brands itself with the decorator `@trait`, which the plugin compiles. `trait` keeps its name in `composition.js`, as a decorator whose type accepts only a class with a bound's heritage, and whose body throws, as `compose` does. _(Amended 2026-11-20, below. It was `trait(this)` in the trait's static block.)_
   - A component names its base and its traits once, in a constant's annotation: `const X: Composed<Base, [Traits…]> = compose(Base)`. Exactly one class in the module extends `X`.
   - `compose` throws unless its argument is `null`, so a component that isn't flattened fails when its module is evaluated.
2. **The flattener lowers each composition.**
   - It replaces the constant with the base.
   - It copies each trait's members in list order, before the component's own.
   - It merges statics by property 3.
   - It generates `static { impl(this, …brands) }` when the list has a trait, and neither the block nor the import for an empty list. _(Amended 2026-11-20, twice, below.)_
   - Every case the copy can't carry is a build error. Layer (a) has no runtime composition to fall back on.
3. **A static merges by the kind its declaration states,** read syntactically.
   - An array concatenates, and an object spreads shallowly. The types say the same through `MergeStatics`.
   - These shapes are build errors: a tuple, an `as const` array, a class instance, a function, a mixed union, `typeof`, and an alias that can't be resolved syntactically.
   - Two contributors that give one key different kinds are a build error, and the base's declaration counts as a contributor.
4. **The last trait wins any other shared key:** a method, a whole accessor pair or a simple static.
   - The types agree: neither `never` nor an overload.
   - **Each trait is trimmed alone in the instance type.** A trait loses only the keys that a later trait in the list declares, and a trait that loses none enters the intersection whole, with its declaration kinds and its ES-private members. A key of the base's instance doesn't count. A trait that is trimmed loses the base's instance keys as well, because the base supplies them unmapped. So a subclass's override of a base member keeps its kind check, and only the trimmed trait's own members lose theirs. _(Amended 2026-11-19 twice, below.)_
   - **A trait's `declare` member is a key in the types only.** In the types it is shared like any member, and it wins when it comes later. The flattener copies nothing for it, and `trait-member-conflict` doesn't count it. _(Amended 2026-11-19, below.)_
   - The flattener warns at build time, in the Vite or tsdown console, with `trait-member-conflict`, naming both traits and the key. There is no runtime `console.warn`.
   - The warning is silent when the component declares the key, and the component's declaration wins over every trait.
5. **A member is copied across languages only when its text parses to the same tree in both,** apart from positions. The same file extension always copies.
   - A `.js` module's static and member kinds come from the `.d.ts` that its package's `types` condition names.
6. **Layer (b), `@ydinjs/core/traits/attribute-traits.js`, is optional sugar over layer (a).**
   - `accessor name!: T`, with `@attributes({ name: Converter })` below `@trait`, is lowered in the trait's own build. It becomes a `get`/`set` pair and `static observedAttributes: readonly string[]`. _(Amended 2026-11-20, below, a second time. It was `attributes(this, { name: Converter })` in the trait's static block.)_
   - The plugin's layer (b) code is a part of its own, and nothing in layer (a)'s code imports it.
7. **The brand install names symbols, not classes.**
   - The generated block reads `impl(this, $a, $b)`.
   - In the trait's own build, `@trait` becomes a static method, `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`, where `$brand` is a module-level `Symbol` that the build exports. A bundle that never uses `instanceof` drops the trait class. One that uses it keeps the class, without its members where property 8 applies. _(Amended 2026-11-19, below.)_
   - The author writes `@trait` above the class. A trait module evaluated without the plugin fails, as an unbuilt component does: trait sources always go through the plugin. _(Amended 2026-11-20, below. It said the author writes `trait(this)`, whose optional second parameter let an unbuilt trait module run.)_
8. **An application build deletes each trait class's copied instance members** from the trait module. An application build is Vite's `build` without `build.lib`. A library build keeps them, because another package copies from its `.js`.
9. **The flattener is a required build step** for every module that composes traits.

**The owner's earlier answers stay:**

- the bound is `null`;
- a trait brands itself with `trait(this)` in a static block, which became `@trait` on 2026-11-20 (below);
- `compose` throws unless `base === null`;
- `impl` is always generated, for a list with a trait since 2026-11-20 (below);
- `super.traitMember` in a component is a build error;
- `#brand!: true` goes where a trait's members already exist on its bound.

**The owner's words,** translated. On property 4: _"Trait order was always meant to matter; object assignment inherits it anyway."_ On property 6: _"So nobody has to write get/set by hand; plus a slightly smaller size where `instanceof` is needed."_

**Property 7 was proposed by Architect B, within the owner's answer "a generated `impl`", and accepted by the owner on 2026-11-19,** relayed by the coordinator: `impl(this, $a, $b)`, with `/* @__PURE__ */ trait(this, $brand)` in the trait's own build. The evidence is [P41](trait-decorators-1/trait-decorators-plan.md#evidence) ([transcript](trait-decorators-1/checks/brand-shaking.txt)), with rolldown 1.3.2, minified:

- with `impl(this, Linked)`, the trait class and its members stay in every bundle: 1,988 B, 650 B brotli;
- with `impl(this, $linked)` and the pure call, a bundle that never uses `instanceof Linked` drops the class: 1,486 B, 551 B brotli;
- a bundle that uses `instanceof` keeps the class, and property 8 takes its members out: 1,890 B with them, 1,643 B without.

That is the size the owner's _"where `instanceof` is needed"_ asks for. It also keeps today's size: today's flattened output links a module-level brand, and its trait objects are pure and dropped.

**Amended 2026-11-19 by the architect, on Architect B's proposal in the [migration plan](trait-decorators-1/trait-migration-plan.md#proposed-rd-26-amendment) at `b53beff07`. The owner approved it the same day,** relayed by the coordinator: _keep `trait(this)` in source, and have the build emit the static method._ Property 7's second bullet now names the static `[Symbol.hasInstance]` method, which replaces the accepted `/* @__PURE__ */ trait(this, $brand)`.

- **Why the pure call goes:** it breaks `instanceof`. The implementer found this in the migration's commit 3. rolldown and esbuild remove a pure call whose result is unused, even inside a class they keep, so the brand is never installed. P41 read only whether the class survived, and its bytes. Its figures for the pure-marked form with `instanceof` describe a bundle whose `instanceof` is false.
- **The evidence is [P42](trait-decorators-1/trait-decorators-plan.md#evidence)** ([transcript](trait-decorators-1/checks/brand-install.txt)). It runs each bundle in Node 26.13, minified, with rolldown 1.3.2 and esbuild 0.28.1, from the trait's own build and from a rolldown library build of it.
  - **The static method:** a bundle that never uses `instanceof` drops the class. With rolldown that bundle is 446 B, 213 B brotli. A bundle that uses `instanceof` keeps the class: `instanceof` is `true` for the trait's element and `false` for another element and for `null`. The library build keeps the install.
  - **The pure call:** `instanceof` is `false` for every object in both bundlers, and the library build drops the install.
  - **The unmarked call:** every trait class stays, with its members.
  - **A static field of the same value:** holds all four of the plan's properties too. It is rejected because a toolchain that lowers class fields to assignment, such as `useDefineForClassFields: false`, makes it throw. `Function.prototype[Symbol.hasInstance]` isn't writable, so the assignment raises a `TypeError`.
- **The owner's intended follow-up, not decided here:** after this pull request, an `@trait` decorator that the plugin compiles replaces `static { trait(this); }` in source. _(Decided 2026-11-20, below.)_ Trait sources are always built and tested through the plugin, as material-x's CSS is. That pass needs its own decision.

**One branch and one pull request,** on the owner's decision 5:

- the commits don't need to build in between;
- there is no temporary old plugin path;
- the migration is verified locally in full before the pull request opens.

The plan holds the files, the diagnostics, the baseline and the proofs.

**What it closes.** Each entry has a dated note of 2026-11-19, and the architect writes each closure on this branch after the plan's proofs hold, before the pull request opens:

- `RF-54` closes when the migration merges;
- `RF-57` closes when the migration merges, with one exception recorded;
- `RF-63` closes when the migration merges.

`RF-44`'s language rule takes the route back that its ruling named. `RF-60` doesn't change: its one-URL rule in `flattenToDir` carries over to the rewritten harness.

**Why:**

- **The annotation carries the types.** A decorator can't, in either compiler ([P1](trait-decorators-1/trait-decorators-plan.md#the-verdict)). The annotated constant typechecks under `isolatedDeclarations` in TypeScript 7.0.2 and 6.0.3, and the language service sees each member before any transform runs.
- **Plain classes keep each member's declaration kind,** so TS2610 and TS2611 apply to traits (`RF-57`).
- **Merging statics by declared kind** is what lets layer (a) know nothing of elements. `observedAttributes` is one more array.
- **Last-wins is the order object assignment already gives.** The warning moves the conflict to the build, where the author sees it.
- **A required flattener** removes the runtime composition and its retained-with-warning path. A composition the plugin can't carry is now an error, not a silent cost.

**Not adopted:**

- **a decorator that names the traits:** it can't change the class's type (P1);
- **a merged interface beside the class** (the study's forms A and B): it is the boilerplate the owner wanted gone, and it repeats the list;
- **`impl(this, Linked)`,** which names the trait class: every bundle keeps the class (P41);
- **`/* @__PURE__ */ trait(this, $brand)` in the trait's own build,** which property 7 first named: a bundler removes the call, so `instanceof` is false (P42, amended 2026-11-19);
- **a static `[Symbol.hasInstance]` field:** a toolchain that lowers class fields to assignment makes it throw (P42);
- **a shared key as a build error:** the owner chose last-wins;
- **stripping types in the plugin before inserting JavaScript into a `.ts` module:** Vite re-reads the code by the module's id and ignores `moduleType` ([P39](trait-decorators-1/trait-decorators-plan.md#evidence) §5, `RF-44`'s note of 2026-11-19);
- **deduplicating `observedAttributes`:** each engine calls back once per change despite duplicates (P39 §3).

**Amended 2026-11-19 by the architect: each trait is trimmed alone, and a trait's `declare` member is a key in the types only** (property 4's third and fourth bullets). On Mx Implementer's report from the migration's core commit, relayed by the coordinator. **No owner decision is needed.** Property 4's rule, the last trait wins in the types too, doesn't change, and neither do the runtime and the declaration surface. What changes is the form P40 recorded, which trims more than the rule asks.

- **What broke.** P40's `MergeInstances` folds from the first trait, so a shared key sends all the earlier traits, merged, through `Omit`. Each of them loses its declaration kinds and its ES-private members.
  - SwitchIconButton's list ends `…, FocusForwarding, IconButtonLike`, and IconButtonLike declares `color`, which ButtonLike also declares.
  - So FocusForwarding lost `#brand`, and `useButtonCore(this, …)` failed with TS2345.
  - IconButton lists FocusForwarding after IconButtonLike, so it wasn't affected.
- **The rule now** is property 4's third bullet. [P43](trait-decorators-1/trait-decorators-plan.md#evidence)'s [`trimmed.ts`](trait-decorators-1/probes/types/last-wins/trimmed.ts) is one form that meets it: it reads the list from the last trait back and carries the later traits' keys. The implementer chooses the form.
- **P43** ([probe](trait-decorators-1/probes/types/last-wins/p43-shared-key.ts), [transcript](trait-decorators-1/checks/shared-key.txt)), in TypeScript 7.0.2 and 6.0.3, which agree on every result and differ only in the order they print a union:
  - (a) In SwitchIconButton's order, P40's form fails with TS2345 on `#brand`, and trimming each trait alone passes. `color` is `"outlined" | "elevated" | "tonal" | null`, so `'standard'` and `'text'` fail with TS2322.
  - (b) IconButton's order passes in both forms.
  - (c) After the shared key, an own field over Disableable's `disabled` or IconButtonLike's `width` still fails with TS2610. One over ButtonLike's `size` doesn't, because ButtonLike lost `color` and went through `Omit`. P40's form loses `disabled` too.
  - (d) A nominal trait that loses a key loses its `#brand`, so passing the component where that trait is expected fails with TS2345.
  - (e) With no shared key, ButtonLike's `color` keeps TS2610, as in P40 (b).
  - (f) A trait that loses no key keeps TS2611 for its fields. IconButtonLike's `declare color` is a property, so a component's accessor over `color` fails with TS2611.
- **What remains of the exception:** only a trait that loses a key goes through `Omit`. Its own other members lose TS2610 and TS2611, and its ES-private members go (P43 (c), (d)). Since the second amendment below, the base's members keep theirs (P44). `RF-57`'s note says so.
- **A `declare` member** is allowed in a trait and isn't copied: the plan's `trait-field` row already says so. It states a type that the runtime member already has, from an earlier trait or the base, and nothing checks that. Its kind in the types is a property (P43 (f)). No type-only accessor exists: `declare accessor` is TS1243, and with an `abstract accessor` every component must implement the member (TS2515).
- **The one composition this touches** is IconButtonLike's `declare color: Extract<IconButtonColor, ButtonColor> | null`, in IconButton and SwitchIconButton.
  - **At runtime, `color` is ButtonLike's accessor,** today and after the migration. Today IconButtonLike's descriptor `trait()` installs only `width`, and `color` is only in its type. After the migration, IconButtonLike's `declare color` isn't copied. `observedAttributes` names `color` once, from ButtonLike.
  - **The flattener doesn't warn,** because no two traits supply `color`.
  - **In the types, `color` is `"outlined" | "elevated" | "tonal" | null`.** That is the baseline surface's type, the intersection of the two descriptors. The props keep `IconButtonColor`.
  - **The cost:** in those two components, an own field over ButtonLike's `size` or `shape` isn't reported (no TS2610), and an accessor over `color` fails with TS2611. No component overrides either key today.
- **The plan's proof 6** now reads: no composition in the tree has two traits that supply one key, so the build prints no `trait-member-conflict`. IconButtonLike's `declare color` over ButtonLike's `color` shares a key in the types only.
- **Not adopted:**
  - **dropping the `declare`:** `color` becomes `ButtonColor | null`, which differs from the baseline surface;
  - **reordering SwitchIconButton's list:** `observedAttributes` and the prototype's member order change, which differs from the runtime baseline;
  - **a copied `color` accessor in IconButtonLike:** two traits would supply `color`, and the flattener would warn;
  - **an `abstract accessor color`:** every component would have to implement it (TS2515).

**Amended again 2026-11-19 by the architect: a trimmed trait also loses the base's keys** (property 4's third bullet, its fourth sentence). On Architect B's proposal in the [migration plan](trait-decorators-1/trait-migration-plan.md#proposed-rd-26-amendment-property-4) at `f8eef5262`, relayed by the coordinator. **No owner decision is needed:** it restores what the old types allowed, and changes no rule the owner set.

- **What broke at `2bf0418ab`.** Every trait carries its bound's members, so `Omit<Trait, K>` also mapped every member the trait inherits from `HTMLElement`, and a mapped type has only properties.
  - A subclass of IconButton or SwitchIconButton got TS2425 on a legitimate `override click()`.
  - An own field over a base accessor lost TS2610.
  - The old types allowed the override and reported the field.
- **The evidence is [P44](trait-decorators-1/trait-decorators-plan.md#evidence)** ([transcript](trait-decorators-1/checks/surface.txt)), read with TypeScript 7.0.2 and 6.0.3 on the built declarations at `2bf0418ab`.
  - §3b: TS2425 on the built IconButton and SwitchIconButton, and none on Button, which trims no trait.
  - §4: the trimmed trait without the base's keys, on the same pair and on Disableable with FocusForwarding.
  - The transcript ends with P43's cases run with `Omit<Trait, K | keyof Base>`, and two `override click()` cases added. Every error is the same, on the same line, apart from the printed type, and the two TS2425 go.
- **P43's `trimmed.ts` doesn't meet the bullet as it now reads:** its `Without` leaves the base's keys in. The form on the branch is the implementer's.

**Dated 2026-11-19 by the architect: implemented on `repo/traits-migration-1`, and the proofs hold.** Read at `aa73be64e`, relayed by the coordinator. The _Unimplemented_ line above is answered, and the implementer opens the pull request next. The [proofs record](trait-migration-1/checks/proofs.md) holds the readings:

- proofs 1 (the runtime baseline), 3 (the declaration surface, with its 19 expected differences), 5 (the flattened JavaScript), 6 (no flattener warning) and 7 (the repository's checks);
- proof 4: eleven size rows smaller, which the owner accepted;
- proof 2: 2,116 of 2,117 tests pass. The one failure is drag's per-sample allocation row, which the migration doesn't touch. It is recorded under `drag:DRF-53`.

`RF-54`, `RF-57` and `RF-63` are closed on this date.

`RF-66` was registered on the same date, from PR #76's repair verification. The flattener doesn't follow re-exports. It doesn't block the pull request, and it must close before `@ydinjs/vite-traits-plugin` is first published.

**Amended 2026-11-20 by the architect: a trait declares itself with `@trait`, and an empty composition emits no `impl`** (property 1's second bullet, property 2's fourth, property 7's second and third, and the owner's earlier answers). **Decided by the owner,** relayed by the coordinator: _"Тогда давай сделаем `@trait` и все починки сразу"_ ("Then let's do `@trait` and all the fixes at once"). This is the follow-up the amendment of 2026-11-19 named, with two fixes folded in. The [plan](trait-decorator-1/trait-decorator-plan.md) holds the design, the proofs, the files and the open questions.

- **The owner had already decided three things.**
  - Trait sources always go through the plugin, tests included: _"we ship the same code we test"_. A trait imported without the plugin is a case to avoid, not one to support.
  - The plugin compiles `@trait` itself, not through oxc-transform's decorator lowering.
  - The output stays property 7's, and a built trait stays recognizable by the exact generated method.
- **The source form** is `@trait` above `export class T extends Bound`.
  - The plugin recognizes it by the name the module imports `trait` under from `…/composition`.
  - It replaces it with property 7's install: the exported brand, the static method first in the class body, and the import removed. An empty static block that layer (b) leaves is removed.
  - The built JavaScript is the same as before, so a built package's consumers and property 8 don't change.
- **The decorator changes no type,** which P1 says it can't anyway. Its type accepts only a class that carries a bound's static `[$bound]`, which `trait(this)` never checked. Declarations drop it.
- **The evidence is [P45](trait-decorator-1/trait-decorator-plan.md#evidence)** ([transcript](trait-decorator-1/checks/p45-decorator.txt)), with TypeScript 7.0.2 and 6.0.3, which agree on every line.
  - `@trait` above or after `export` checks clean, and the declarations carry no decorator and keep `#private`.
  - A class with no bound is TS1238, `@trait()` is TS2554, the old `trait(this)` is TS2554, and `@trait` on a method is TS1241.
- **A new error, `trait-decorator`,** covers what TypeScript doesn't, because a build doesn't typecheck:
  - a called `@trait`;
  - `@trait` on a class expression, a nested class or a member;
  - `@trait` beside another decorator;
  - any other use of the imported `trait`.
- **An empty composition** (property 2) gets neither `static { impl(this); }` nor the `impl` import.
  - ListItem is the case today. It costs `list/list-item` about 44 B Brotli ([PR #78's measurement](trait-mixin-measure-1/README.md#size)).
  - This narrows the owner's earlier _"`impl` is always generated"_ to a list with a trait, under his authorization of the fixes.
- **Recommended, and open for the owner:** ListItem extends `ControlledElement` directly, and `ListItemCoreTraits = readonly []` goes. The [plan](trait-decorator-1/trait-decorator-plan.md#fix-2-listitem-extends-controlledelement) gives the reason.
- **`RF-66` doesn't block it.** Recognition is syntactic in the trait's own module, and resolution doesn't change.
- **Not adopted:**
  - **`trait` as a `declare function`:** a decorator is a value reference, and a throwing function gives the failure a name, as `compose` does. No built module imports it, so it costs nothing.
  - **`export @trait class` as the written form:** the plugin accepts it, but `oxfmt` prints it across three lines.
  - **Keeping `trait(this)` beside `@trait`:** `CONTRIBUTING.md` Part II §8 says not to keep a legacy form before release.
- **Unimplemented** until the plan's proofs hold.

**Amended 2026-11-20 a second time, by Architect B: layer (b) declares a trait's attributes with `@attributes(TABLE)`** (property 6's first bullet). **Decided by the owner,** relayed by the coordinator: _"`@attributes(TABLE)` давай сделаем вместе с `@trait`, чтобы задача была в целом 'move to decorators'"_ ("let's do `@attributes(TABLE)` together with `@trait`, so the task as a whole is 'move to decorators'"). It answers the `@trait` plan's open question 2 and ships in the same pull request. The [plan](attributes-decorator-1/attributes-decorator-plan.md) holds the design, the proofs and the files it adds to the `@trait` plan's.

- **The owner's decisions for `@trait` carry over:** trait sources always go through the plugin, the plugin compiles the decorator itself, and the built JavaScript stays what it is.
- **The source form** is `@trait`, then `@attributes(TABLE)`, each on its own line above `export class T extends Bound`, with the `accessor name!: T` lines in the body. A trait has no static block left.
  - `@attributes` decorates only a class that `@trait` decorates, because layer (b) is a trait's sugar.
  - The plugin accepts this one order.
  - TABLE is what it was: an object literal, or a module-scope `const` bound to one.
- **The plugin** recognizes `@attributes` by the name the module imports `attributes` under from `…/attribute-traits`. It lowers the class as before, removes the decorator and the unused import, and leaves `@trait` to the trait module's transform. That transform places the method after the `static observedAttributes` that layer (b) inserts, so a built trait's class body keeps today's order.
- **The type checks the table against the decorated class.** `attributes(TABLE)` returns a generic class decorator. TypeScript infers the class from the decorator context and rejects a table that doesn't fit with TS1238 on the `@attributes` line. The decorator changes no type, and declarations drop it.
  - Every case that core's declaration tests check still fails.
  - A shared constant with a key that names no member is now a type error too. Before, only the plugin reported it.
  - The body throws with a message that names the plugin, as `trait` and `compose` do.
- **The evidence is [P46](attributes-decorator-1/attributes-decorator-plan.md#evidence)** ([transcript](attributes-decorator-1/checks/p46-attributes.txt)), with TypeScript 7.0.2 and 6.0.3, which agree on every line. The valid forms check clean, and their declarations carry no decorator. The eight cases of the declaration tests, and the extra key, are TS1238. An uncalled `@attributes` is TS1270, the old call TS2554, and a decorator on a member TS1240. The reversed order has no TypeScript error, which is why the plugin refuses it.
- **A new error, `attributes-decorator`,** covers misuse:
  - `@attributes` not called with one table;
  - `@attributes` on a class without `@trait`, above it, or twice;
  - `@attributes` on a class expression, a nested class or a member;
  - any other use of the imported `attributes`.

  `trait-decorator` allows `@attributes(TABLE)` as the one other decorator after `@trait`.

- **Not adopted:**
  - **`@attributes` on any class:** layer (b) is a trait's sugar.
  - **Either order:** one form is one thing to learn and to diagnose.
  - **`@trait(TABLE)`:** layer (a)'s `trait` would know layer (b)'s table, which property 6 forbids.
- **Unimplemented** until the plan's proofs hold, with the `@trait` plan's.

**Amended 2026-11-20 a third time, by the architect: a `load` stage keeps a trait's class doc in the published declarations** (the decorator passes' source form, unchanged). **Decided by the owner,** relayed by the coordinator, choosing [P47](trait-jsdoc-probe-1/trait-jsdoc-probe.md)'s way 1 over its recommended `export @trait class`: _"Давай короч тогда `load`. Да, больше мороки, но код выглядит как надо"_ ("Let's go with `load` then. Yes, more hassle, but the code looks right"). The [`@trait` plan](trait-decorator-1/trait-decorator-plan.md#the-doc-in-the-declarations-a-load-stage) holds the design, proofs 11 and 12, and P48. **Unimplemented:** the implementer adds the stage on `repo/trait-decorator-1`, which merges this branch.

- **The defect** (P47). rolldown's declaration emitter, oxc's, drops a JSDoc in front of a class's decorators. tsdown's declaration plugin records each module's code before any transform of ours runs. So the 10 published trait `.d.ts` files lose their class docs.
- **The written form stays** `/** doc */`, then `@trait` and `@attributes(TABLE)`, each on its own line, then `export class`. The owner also asked whether a tool option like Babel's old `decoratorsBeforeExport` exists. None does: `oxfmt` 0.78 has no decorator option, and oxc and TypeScript attach comments by fixed rules.
- **The stage,** a `load` hook of the `trait-attributes` plugin:
  - **What it does.** For an exported class declaration whose decorators come before `export`, with a JSDoc directly in front of them, it moves `export` to the first decorator's start. _(Amended 2026-11-20 a fourth time, below: `export default` too, and other comments may follow the JSDoc.)_ JavaScript and TypeScript read the result, `/** doc */ export @trait @attributes(T) class X`, the same way. The emitter, TypeScript 6 and tsc 7 all keep its doc.
  - **Why it comes first.** rolldown runs `load` before every `transform`, so the declaration plugin records the rewritten code.
  - **What it reads:** candidate modules with an absolute file id and no query, in every build and not on the dev server, which emits no declarations. It parses only a file with a line that starts with `@`, and returns `null` when it has nothing to move.
  - **What it returns:** the code and a hires map whose `sourcesContent` is the file.
- **It hands the existing compile a form that compile already accepts,** `export @trait class` (P45 case (h)).
  - The trait module's transform, layer (b)'s lowering, both decorator checks and the analysis loader don't change.
  - No internal form that source can't write is needed, and no second compile stage either. Of P47's three costs for way 1, only the second read of each candidate module remains, and only in a build.
- **The diagnostics see the written text:** the same decorators, in the same order, with the same arguments. **Their positions:**
  - Every diagnostic that the plugin reports carries the `pos` it would carry without the stage.
  - The stage records the spans it moved per module id, and the reporter moves a `pos` inside one back by the moved length.
  - rolldown shows no position from `pos` today, with or without the stage. Vite's dev path, which shows one, doesn't run the stage.
- **The evidence is P48** ([`p48/`](trait-jsdoc-probe-1/probes/p48/), [transcript](trait-jsdoc-probe-1/checks/p48-run.txt)), by the architect at `eda3b1bfc`, with tsdown 0.23.7 and rolldown 1.3.2. The stage was added to the implementer's compile, and `@ydinjs/core` and `@ydinjs/material-x` were built with and without it:
  - all 293 built files are byte-identical, except the 10 trait `.d.ts` files;
  - each of those differs only by added comment lines, and has its source doc directly before `export declare class`: 10/10;
  - a diagnostic's `pos` is 7 later with the stage, and neither build reports a `loc`.
- **What retires it:** when the emitter keeps a doc in front of decorators, the plan's proof 11 mutation stops failing, and the stage is deleted.
- **Not adopted:**
  - **`export @trait class` as the written form** (P47's recommendation): the owner prefers the decorators above `export`.
  - **P47's ways 2, 3a and 3b,** for the reasons in [its record](trait-jsdoc-probe-1/trait-jsdoc-probe.md#results).
  - **The probed internal form,** `static { trait(this); … }`. It is the source form that `trait-decorator` rejects, it needs a second compile stage in the analysis loader too, and it moves an inline table's positions into the class body.
  - **`export` on the doc's last line,** which keeps every line and column: 30 built files changed (P48).

**Dated 2026-11-20 by the architect: the three amendments of 2026-11-20 are implemented,** by PR #85, merged at `3457e3463`. The [feature proof](reviews/trait-decorator-1/feature-proof-claude.md)'s verdict at `f8acb005b` is that nothing blocks. Their _Unimplemented_ lines are answered.

- **`reviewer-1` is accepted as resolved.** `.storybook/main.ts` sets `typescript: { reactDocgen: false }`, because react-docgen's parser rejects decorators before `export`. The re-review read every docs page and every story's `argTypes` with docgen on and off and found them identical. Nothing the site shows reads docgen's output.
- **`reviewer-3` and `reviewer-4`** are decided in the amendment below. **`reviewer-5`** is deferred by the owner.

**Amended 2026-11-20 a fourth time, by the architect: no trait form loses its doc, and the plugin leaves no import it emptied** (the third amendment's stage, and property 2's fourth bullet). **Asked by the owner,** relayed by the coordinator: _"The owner wants both done"_, for the feature proof's `reviewer-3` and `reviewer-4`. Registered on `repo/trait-decorator-2`, from `origin/main` at `645410c12`. An amendment, because both findings are about how this decision's properties hold. The [plan](trait-decorator-2/trait-decorator-2-plan.md) holds the diagnosis, the tasks, the proofs and the probes. **Unimplemented.**

**Approved by the owner on 2026-11-20,** relayed by the coordinator: _"Да, давай по обоим пунктам"_ ("Yes, go on both"). The two points were the plan's tasks 1 to 4, which the implementer takes on this branch, and the plan's [question 1](trait-decorator-2/trait-decorator-2-plan.md#questions-for-the-owner), answered yes as recommended: `@ydinjs/core` declares `"sideEffects": false`, as its own unit with a size reading, before core's first release. That unit is `RD-30`, planned on `core/side-effects-1`. Neither unit waits for the other.

- **The doc forms** (`reviewer-3`, [transcript](trait-decorator-2/checks/doc-forms.txt)).
  - **`@trait export abstract class` keeps its doc.** The finding came from the probe's test, `(export )?declare class`, which can't match `export declare abstract class`.
  - **Two forms lose it, both because of the stage:** a comment between the JSDoc and the first decorator, because the stage requires only whitespace there; and `@trait export default class X`, because the stage reads only `export class`.
  - **Both keep it from now on, and neither is refused.** The stage reads `export default class` too, and moves `export default`. A statement counts as documented when a JSDoc lies between the previous statement and the first decorator, whatever comments follow the JSDoc. The emitter keeps the doc of each form the stage produces, and the compile already accepts each one. Refusing a form would make the compiler a lint rule about comment placement, or remove `export default`, which the resolver supports.
  - **An anonymous `export default` trait** is refused already, by `trait-decorator`.
- **The bare import** (`reviewer-4`, [transcripts](trait-decorator-2/checks/bare-imports.txt)). material-x's built JavaScript has eight bare imports of core modules, from two mechanisms.
  - **The plugin's, three of them:** `list-item.js`, `ButtonCore.js` and `ButtonGroupCore.js` import `composition.js` bare. The lowerer keeps `import { compose, type Composed }` after removing the composition, and the trait transform keeps `import { type Composed }` after removing `trait`. Under `verbatimModuleSyntax`, both are emitted as an import that rolldown keeps for an external module.
  - **Decided:** when the plugin removes an import specifier and no value specifier remains in that declaration, it removes the declaration. An inline `type` specifier isn't a value specifier. The lowerer removes `compose` once nothing in the module references it. A declaration the plugin didn't touch stays as written. Property 2's _"nor the import"_ then holds for the module: an empty composition leaves no import of `composition.js`.
  - **rolldown's, five of them:** a material-x trait class that the package's runtime doesn't read is tree-shaken away, and rolldown keeps its external imports as bare imports. No hook of the plugin sees those uses go. This unit leaves them.
- **Not adopted:**
  - **`treeshake.moduleSideEffects: 'no-external'` in material-x's build:** it would drop a deliberate bare import of any package without a warning. In the probe it also changed `fab.d.ts`.
  - **core's `sideEffects` as the fix for `reviewer-4`:** it lets only a consumer's bundler drop the import, and material-x's published file would keep it.
  - **Moving `export` for every decorated class, with no doc test:** that widens the stage's rewrites, the scope that `reviewer-5` questions.
- **Answered by the owner** (above): `@ydinjs/core` declares `"sideEffects": false`, which is core's published contract. It is true of all 27 built modules today. It goes in before core's first release, as its own unit with a size reading (`RD-30`). This amendment doesn't need it. Until the answer, this bullet began _"**For the owner:** whether"_ and said _"Recommended before core's first release"_.

**Dated 2026-11-20 by the architect: the fourth amendment is implemented on `repo/trait-decorator-2`** (PR #88, not yet merged). Its _Unimplemented_ line is answered, and it applies to `main` when #88 merges. The [feature proof](reviews/trait-decorator-2/feature-proof-claude.md)'s _Re-review at `9bbbc8c3f`_, committed at `fe800111a` and relayed by the coordinator, finds that nothing blocks and that there's no new finding.

- **`reviewer-1` is resolved** by `fc5986185`. It was Tier A: the stage threw on a comment between `export` and `default`, so the build failed. The stage now moves `export` or `export default` with every comment between them, taking the span from the declaration, and it leaves a module it can't parse as written.
- **The non-trait rows' deviation is accepted, within property 1.** They assert that a decorated `export default class` that isn't a trait differs from the build without the plugin only by the kept doc. Property 1 reads every documented class whose decorators come before `export`, as the third amendment's stage already did for `export class`. Whether the stage should rewrite a class that isn't a trait stays `reviewer-5`'s question, which the owner deferred.
- **No test witnesses the parse-error guard.** The proof records this as a note, not a finding: with oxc-parser 0.158 the stage returns `null` for every unparseable input it tried whether or not the guard returns, so the guard changes no output.

#### RD-27 — Each `@ydinjs` package is released by one workflow that stages it on npm with provenance for the owner to approve, and box-quad's first release is 1.0.0

**Decided 2026-11-20 by the owner,** relayed by the coordinator, in answer to Q1 to Q5 of Architect B's [box-quad release plan](https://github.com/ausginer/material-x/blob/repo/box-quad-release-1/.plan/box-quad-release-1/box-quad-release-plan.md#questions-for-the-owner) (PR #79, `0ef585e09`). The workflow's design is the architect's, in the [release workflow plan](release-workflow-1/release-workflow-plan.md), within the owner's Q4. Registered by the main slot's architect on `repo/release-workflow-1`, from `origin/main` at `d69e3ddbc`. `RD-26` is the highest number on any branch on `origin`. **Implemented 2026-11-20** on `repo/release-workflow-1` (#81, not yet merged): the plan's tasks 1 to 3 at `e73411cf4`, corrected after the feature proof in the commit that follows it. The [report](release-workflow-1/release-workflow-report.md) holds the proofs. It applies to `main` when #81 merges. **Still pending:** the dispatched check runs after the merge, which need box-quad's own task 1 first; what the first release must show; and the owner's settings O1 to O3. Before: unimplemented. **Corrected 2026-11-20:** this line also listed the architect's decisions on the feature proof's `reviewer-2` and `reviewer-3` as pending, and the amendment below records them.

**The owner's answers,** quoted where his words were relayed:

- **Q1:** box-quad's first version is `1.0.0`.
- **Q2:** a ceiling at the reading after the release's last change, with no slack. _"Вниз изменять можно без вопросов, вверх - с моего одобрения"_ ("It can go down without asking; up only with my approval").
- **Q3:** the current stable Chromium, Firefox and Safari, as `RD-20` states, for now. Minimum versions will be derived later, for all packages.
- **Q4:** a release workflow with provenance, not a hand publish: _"я заколебался руками публиковать"_ ("I'm sick of publishing by hand").
- **Q5:** he holds the `@ydinjs` scope on npm.
  - His account used 2FA _"for authorization only"_, with an authenticator app and three security keys.
  - On 2026-11-20 he switched it to authorization and writes: _"2FA обновил: ✓ Enabled for authorization and publishing"_ ("Updated 2FA").

**Properties.** Each applies to every `@ydinjs` package's releases, drag's next, except where it names box-quad.

1. **Versions.**
   - Each package versions independently, by semver, with its own `CHANGELOG.md`.
   - box-quad's first release is `1.0.0`. Any other package's first version is the owner's answer at its release.
   - A dependency on another `@ydinjs` package is an exact version that is on the registry when the dependent package is released.
   - A release is one tag, `@ydinjs/<name>@<version>`, on one `main` commit. The owner pushes it, and agents push no tag.
2. **Size ceilings.**
   - **At a package's first release,** each of its size rows gets a ceiling equal to its reading after the release's last change, with no slack.
   - **A ceiling may be lowered** without asking.
   - **Raising one needs the owner's approval,** which the unit that raises it records with the reading.
   - **The release workflow refuses** a package with a row over its ceiling. `verify` goes on only notifying (`RD-7`).
   - This is the rule after the release that `RD-24` property 6 asked the architect to state. It governs material-x's ceilings when it is released.
3. **Browser support.**
   - A released package supports the current stable release of Chromium, Firefox and Safari, as `RD-20` property 1 states for material-x, and its README says so.
   - No minimum version is promised until a later unit derives the minimum versions for every package. Until then, a version that leaves stable leaves support, and that isn't a breaking change.
4. **Publishing.**
   - **No package is published by hand.** `.github/workflows/release.yml`, started by the release tag, checks the commit and the package, builds, packs and checks the tarball.
   - **It stages the tarball with `npm stage publish`,** under the package's trusted publisher, with provenance.
   - **The owner approves** each staged version on npm with his second factor. That approval is the gate: npm lets no OIDC or granular token approve.
   - **The first publish** of a package, before a trusted publisher can exist for it, stages with a stage-only granular token that lives for a day. That token is then revoked.
   - The plan's [design](release-workflow-1/release-workflow-plan.md#the-design) specifies the triggers, the jobs, their checks and permissions, the environment and the tags.
5. **2FA.**
   - **The account** stays in authorization and writes.
   - **Each package,** once its first version is approved, is set to _"Require two-factor authentication and disallow tokens"_. Trusted publishing is unaffected.
   - **The trusted publisher** allows `npm stage publish` only. It is configured within the 2 days before the package's second release, because npm expires an unvalidated configuration after 2 days.
6. **npm stages the release** (an exception to `RD-16` property 1, amended on this date).
   - The workflow's `stage` job runs `npm stage publish` on the tarball that `prepare` checked, outside any checkout, with an npm pinned in the workflow.
   - aube implements neither trusted publishing nor staging. aube still installs, builds and packs.
7. **What agents don't do:**
   - push a release tag;
   - approve or reject a staged version;
   - create a token;
   - configure a trusted publisher;
   - change the environment or a ruleset.

   These are the owner's acts.

**Why:**

- **Staging gives the owner's approval a second factor at the registry,** independent of GitHub. So nothing an agent, a tag or a compromised workflow does can make a version public.
- **Trusted publishing removes the long-lived token.** npm removes direct publishing with granular tokens in January 2027 anyway.
- **One tag per package per version** keeps each package's history its own, and needs no release tool.
- **The ceiling rule** is the owner's words.
- **Support follows the suite,** which runs each engine's current stable release and nothing older.

**Not adopted:** the plan's [section](release-workflow-1/release-workflow-plan.md#not-adopted). That covers a GitHub release, a release tool, a long-lived token, direct publish from CI, `aube publish`, several packages in one run, and a `prepack` script.

**Answered by the owner on 2026-11-20,** relayed by the coordinator: the plan's three [questions](release-workflow-1/release-workflow-plan.md#questions-for-the-owner). Nothing is left open for him, and the plan's tasks 1 to 3 can start.

- **The `RD-16` amendment** (property 6) is approved: _"Конечно да, пусть npm работает"_ ("Yes, of course, let npm do it"). The release workflow's `npm stage publish` of the checked tarball, outside any checkout, is the one npm step of a release.
- **The environment `npm` has no required reviewer:** _"Согласен с архитектором"_ ("I agree with the architect"). His approval on npm, with his second factor, is the gate.
- **The first publish uses the token** (property 4): _"Давай (а) попробуем"_ ("Let's try (a)").
  - The token is stage-only and granular, lives for a day, and is stored as the secret `NPM_STAGE_TOKEN` of the environment `npm`. It is revoked after the publish, and the first version keeps its provenance.
  - If npm refuses a stage-only token for a name that doesn't exist yet, the fallback is that he stages the `prepare` job's tarball himself.

**Amended 2026-11-20 by the architect,** on `reviewer-2` and `reviewer-3` of Mx Reviewer B's feature proof of PR #81 at `e73411cf4`, relayed by the coordinator. Both block the first tag. The plan's [amendment](release-workflow-1/release-workflow-plan.md#amendment-a-release-runs-on-main) has the reading, the sources and task 4. **Task 4 implemented 2026-11-20** on `repo/release-workflow-1` (#81, not yet merged), in the commit after `644bbf1ed`. The [report](release-workflow-1/release-workflow-report.md) holds the proofs. **Unimplemented:** O1 as amended, which is the owner's setting. The reviewer reads it before the first tag. **Answered by the owner on 2026-11-20,** relayed by the coordinator: _"Q4-5 согласен."_ ("I agree with Q4–5."). That answers the plan's [questions](release-workflow-1/release-workflow-plan.md#questions-for-the-owner) 4 and 5 as recommended, and he approved task 4.

- **Q4:** a release is tagged at `main`'s head, and he merges nothing until its run has started.
- **Q5:** O1 as amended. The environment `npm` admits only the branch `main`, with no tag rule and the administrator bypass off. That setting is his to make.

- **`reviewer-3`: a release runs on `main`** (property 4).
  - **The finding.** A tag push runs the tagged commit's own `release.yml`, so whoever tags a commit off `main` can delete its commit checks. The environment admitted the tag, so such a run could stage and read `NPM_STAGE_TOKEN`.
  - **How the run starts.** The tag push's run only dispatches `release.yml` on `main`, with the tag as input. That run's `prepare` and `stage` are `main`'s own file, which only a reviewed pull request changes (`Main protection` has no bypass actors).
  - **What it checks first:** its ref is `refs/heads/main`; the tag points at its own commit, which is `main`'s head when it starts; and `verify` passed on that commit. Equality replaces _reachable from `origin/main`_, because npm's provenance names the run's `GITHUB_SHA`.
  - **O1:** the environment `npm` admits only the branch `main` (GitHub matches the rule against the run's `GITHUB_REF`), with no tag rule and no administrator bypass. So no other ref gets the OIDC environment claim that the trusted publisher requires, nor the token.
- **Property 1 gains:** the release commit is `main`'s head when the release run starts. If `main` moves first, the run refuses, and the release takes a new version.
- **`reviewer-2`: what the owner compares before approving** (property 4).
  - **On GitHub,** the release run that his tag dispatched: its branch is `main`, it succeeded, and its summary names his tag and commit.
  - **On npm,** in _Staged Packages_ or with `npm stage view`: the stage id and the `shasum` equal the summary's.
  - **The digest is npm's `shasum`** (SHA-1). It is what npm's review page and `npm stage view` show, and npm computes no sha256.
  - **The summary** carries `shasum` and `integrity` beside the sha256, which stays as the check between the jobs.
  - **Not before approval:** the transparency-log entry, which exists at stage time. The summary links it. The provenance is still read after approval, at step 6.
- **Why:** the boundary moves to where GitHub enforces it, a branch rule on the environment. A summary written by the tagged commit's own file and a hand check would not hold it. The stage id and the `shasum` tie the version the owner approves to the run he has checked.

**Amended 2026-11-20 by the architect,** on `reviewer-7` of Mx Reviewer B's feature proof of PR #81 at `30175e027`, relayed by the coordinator. The plan's [section](release-workflow-1/release-workflow-plan.md#the-dispatch-names-main-by-its-short-name) has the reading and the sources. Nothing changes in `release.yml`. `releasing.md` gains the recovery and states O1's rule as a branch rule.

- **`reviewer-7`: the dispatch keeps `--ref main`, because a run on a tag `main` fails closed** (property 4).
  - **The finding.** A writer can create a tag named `main`, which `Release tags` doesn't cover. GitHub doesn't document which ref a dispatch takes for a short name that names both a branch and a tag.
  - **Why it fails closed.** A run on a tag `main` runs that tag's own `release.yml`, so its ref check and `stage`'s `if` can't be relied on. The environment `npm`, whose one rule is the branch `main`, refuses `stage`, so the run gets neither the trusted publisher's OIDC claim nor `NPM_STAGE_TOKEN`. Nothing is staged, and the owner's step 4 requires a run on the branch `main`.
  - **Recovery needs no new version:** the owner deletes the tag `main` and, while his release tag is still `main`'s head, dispatches the release himself.
  - **O1's reading** before the first tag confirms one policy, of type `branch` and named `main`, with `custom_branch_policies` `true`, `protected_branches` `false` and `can_admins_bypass` `false`. The short name is safe only through that setting.
- **Not adopted:**
  - **A ruleset that restricts creating `refs/tags/main`** (_Restrict creations_, no bypass). It would prevent only a release that fails closed and recovers, and adds an owner setting with no security property. O2 doesn't change.
  - **The full ref `refs/heads/main`.** The endpoint most likely accepts it, by `gh`'s and a widely used dispatch action's behaviour, but GitHub doesn't document it, and the line first runs at the first release's tag.

#### RD-28 — tproc keeps reading Material's own token database, converts one dated site release into a committed store of its own, and builds its CSS from that store

**Proposed 2026-11-20 by the architect,** on the coordinator's task for issue #82, on `tproc/tokens-source-1`. `RD-27` is the highest decision number on any branch on `origin` and in any slot (`repo/release-workflow-1`), so this is the next free number. **Step 1 implemented 2026-11-20** on `tproc/tokens-source-1` (#84, not yet merged); steps 2 and 3 are not. Until then this said _"Not implemented."_ It answers `RF-67`.

**Amended 2026-11-20 by the architect,** on the owner's answers relayed by the coordinator. They are quoted in the plan's [amendment](tokens-source-1/tokens-source-plan.md#amendment-tprocs-own-token-store).

- **A store of tproc's own** replaces the stored tables: _"сохраняем уже наш родной, safe-json, а не таблицу с персональными данными гуглеров. Поля и данные остаются ещё оригинальными, не адаптированными под CSS"_ ("we store our own safe JSON, not a table with Google employees' personal data; fields and data stay original, not adapted to CSS").
- **The history is rewritten** for `Q2` (`RD-29`).
- **The owner accepts it or chooses otherwise.** `Q1` and `Q3` are open, and `Q4` is new.
- The title, properties 1 to 5 and the order changed, and property 8 is new. What they said before is at the end of this entry.

**Accepted 2026-11-20 by the owner.** His answers, relayed by the coordinator, are quoted in the plan's [record of them](tokens-source-1/tokens-source-plan.md#the-owners-answers-to-q1-q3-and-q4).

- **Step 1 is approved:** _"Шаг 1 - го."_ ("Step 1, go.")
- **`Q1` — yes:** the weekly change notification is step 3.
- **`Q3` — yes:** the store is committed in the public repository.
- **`Q4` — (a):** step 1 keeps the CSS layer's surface and adds the pure value-to-CSS function, and no new generation interface.
  - He first chose otherwise, concerned that the CSS layer reads the tables, so deleting them breaks the build. Step 1 already covers that: it moves `resolve`, `processToken` and `processTokenSet` from `DB` onto the reader in the change that deletes the tables (property 8).
  - Told this, he chose (a): _"Я просто не подумал, что мы прям совсем новый API делать будем"_ ("I just didn't think we'd be building an entirely new API").
- **`RD-29` is deferred by the owner.** Step 1 doesn't depend on it, and it still needs step 1 on `main` first. Step 2 no longer waits for the rewrite: it follows step 1. Until this, the order said that step 2 came _"after the rewrite"_.

**Step 1 implemented 2026-11-20 by the implementer,** on the coordinator's task, at the plan's [field rulings](tokens-source-1/tokens-source-plan.md#field-rulings). The proofs are in [`step-1.txt`](tokens-source-1/checks/step-1.txt).

- The store, `packages/tproc/tokens/`, is 103 files and 53.8 MB, converted once from the 14 committed tables in legacy mode. The tables are deleted, and `packages/tproc/.data/` is git-ignored.
- The reader is `src/store/`. `processToken`, `processTokenSet` and `resolve` read it and keep their exports, `processToken.ts` exports `toCSSValue`, and `src/theme.ts` holds the theme that `DB` used to hold. `DB`, `DB/index.ts` and `TokenTable.ts` are deleted.
- P4 and P10 hold: material-x's 34 compiled stylesheets and 213 build outputs are byte-identical, and all 3,950 tokens read the same from the store as from `DB`.
- P11: 217 tokens conflict, in 704 table pairs, against the plan's estimate of about 223. Each conflicting copy is one that a later component table carries without its tree, and the copy kept is the first table's ([list](tokens-source-1/checks/step-1-conflicts.md)).
- Not in step 1: the update report's diff sections, which P7 tests in step 2, and the first fetch.

**Amended 2026-11-20 by the architect,** on `reviewer-1` and `reviewer-2` of the step's [feature proof](reviews/tokens-source-1/feature-proof-claude.md). Property 4 gains the [second field rulings](tokens-source-1/tokens-source-plan.md#field-rulings-from-the-feature-proof). They change the store in PR #84, before it merges. The implementer reruns P1–P5, P10 and P11, and the new P12, from the 14 tables read at `a182ba6aa`. They stay inside the owner's _"fields and data stay original"_: they keep token data that was dropped, and they leave out only Material's component catalogue, which isn't token data.

- **Confirmed 2026-11-20 by the architect:** three `schema.ts` changes at `96208a0c0` follow these rulings and need none of their own. `variationAxes`, `FILL` and `HEXP` are optional, as upstream gives them. A resolved `type` is `ResolvedTokenType`, of literals. A `customComposite` property is `CompositeProperty`, with exactly one value field. An unknown key is still refused, and the store's bytes don't change.

**The second rulings implemented 2026-11-20 by the implementer,** in PR #84. P1–P5, P10, P11 and P12 hold ([transcript](tokens-source-1/checks/step-1.txt), its last section). The store is 58.9 MB, and `storeVersion` stays 1. No child value is unresolved, and the 704 conflicts are unchanged.

**Steps 2 and 3 approved by the owner,** relayed by the coordinator on 2026-11-20.

**Ruled 2026-11-20 by the architect,** on the implementer's questions for steps 2 and 3, relayed by the coordinator. The plan's [rulings for steps 2 and 3](tokens-source-1/tokens-source-plan.md#rulings-for-steps-2-and-3) have the readings and the proofs. The release is `2026-11-19_06-20-01`, database `41.1.12` in all 14 tables. The architect read the 14 tables and ran `main`'s converter on them.

- **Three keys upstream added,** under property 4's rule:
  - `system.navigation` is dropped. It is the guideline site's page tree of 55 nodes, with page titles, slugs and ids, and no token data.
  - A context tag group's `description` (140 records) and a tag's (392) are kept in `context.json`. They are upstream's text about the contexts, and all 14 tables agree on them.
  - `storeVersion` becomes 2, because `context.json` gains a key after the store reached `main`.
- **Duplicates, property 5:** the converter keeps a copy that covers every other copy. A copy covers another when the two are identical, or when the other has no reference tree, equals it in every other field but `values`, and has only `values` entries that each equal a different one of its own. A token for which no copy covers every other refuses the update.
  - At this release, all 704 conflicting copies of 217 tokens are covered. Each lacks a tree, and 98 have fewer values. 27 copies of 5 tokens list the same entries in another order. The kept copy is always a system table's and has a tree.
  - So the conflicts weren't caused by step 1's mixed snapshot, as the plan had said: component tables carry the system tokens they reference as partial copies.
  - It stays inside the owner's _"fields and data stay original"_. A covered copy holds no token data that the kept copy lacks.
- **Step 3,** the implementer's proposals with one correction:
  - **What counts as a change:** the site's current database, by `versionName` or version id, isn't one that the manifest records. A new release id that serves the same database isn't a change. Confirmed.
  - **The issue:** a weekly workflow opens one issue labelled `tokens-release`, as `safari.yml` does, and `work-queue.md` names that label as a non-queue label. Confirmed.
  - **Corrected:** a run comments on the open issue only when the current database isn't one that the issue already names. Under the proposal, every weekly run commented while the versions differed.
  - **P9:** before merge, against a stub `gh`. A real `workflow_dispatch` run is owed after merge, on the owner's go. Confirmed.

**Steps 2 and 3 implemented 2026-11-20 by the implementer,** on `tproc/tokens-update-1`, at the rulings above. The plan has the [result](tokens-source-1/tokens-source-plan.md#steps-revised) and the proofs are in [`step-2.txt`](tokens-source-1/checks/step-2.txt).

- The store is converted from release `2026-11-19_06-20-01`, database `41.1.12`, at `storeVersion` 2. 704 copies of 217 tokens are covered, and there is no conflict.
- The [update report](tokens-source-1/checks/step-2-report.md) lists 30 tokens added, none removed, no deprecation added and 104 selected values changed.
- material-x's CSS changes in one place: `xsmall` buttons get a 4px icon-label space, from `md.comp.button.xsmall.icon-label-space`. P1–P3, P5–P8 and P12 hold.
- The weekly check is `.github/workflows/tokens.yml`. P9 holds before merge, and a `workflow_dispatch` run is owed after merge, on the owner's go.

- **The source stays the design-system database tables that m3.material.io serves** (`_dsm/data/dsdb-m3/<release>/<KIND>.<id>.json`). The [survey](tokens-source-1/tokens-source-plan.md#survey) found no other public source with contextual values. material-web, Flutter's `material_ui`, Compose and MDC-Android each export the same database for one context, months behind. The Figma Design Kit has no component tokens, and its variables can't be read headlessly without an Enterprise plan.
- **Required properties:**
  1. **tproc reads only the committed store,** through a reader with no network path. A missing or invalid store file fails the load and names the file. `DB`, `DB/index.ts` and `TokenTable.ts` are deleted.
  2. One update script writes the store. It fetches every table from one dated release address (`2026-11-19_06-20-01`), not from `latest`, and refuses a set whose tables report different `system.version.versionName`. It converts the tables in memory, and never writes a raw table into the repository. `packages/tproc/.data/` is git-ignored.
  3. **The store is at `packages/tproc/tokens/`.**
     - `manifest.json` records the store's shape version, and the release id with the database's `versionName`, version id and publish time. It also records the fetch date, each converted table's kind, component id and name, and each store file's SHA-256.
     - `context.json` holds the context tag groups and their tags.
     - `sets/<tokenSetName>.json` holds one token set and its tokens.
  4. **The store keeps upstream's field names and values,** not CSS.
     - Each token's `values` and `contextualReferenceTree` keep upstream's order, with context tags as a group-to-tag-name object and each tree as `tokenName` and `childNodes`.
     - It drops every internal id, revision, time, state, author and settings field, so no personal data can pass, and a final scan refuses a store that holds an email address or a `gaiaId` key.
     - Converting the same tables twice gives byte-identical files.
     - The converter is the store's only writer. The store is in oxfmt's `ignorePatterns` and is marked `linguist-generated`.
     - The plan's [store section](tokens-source-1/tokens-source-plan.md#the-store) is the schema.
     - **It keeps every field that carries a token's data,** whether tproc reads it or not: `elevation`, `svgPath` and `undefined: true` among the literal fields, `resolvedCustomCompositeValue` where an entry has no `resolvedValue`, and a token's `description`. Ruled on 2026-11-20 ([field rulings](tokens-source-1/tokens-source-plan.md#field-rulings)). Until then, the plan's lists left them out.
     - **It also keeps a tree node's `fieldNames`, each child node's value as an index into its token's `values`, and each set's display groups,** with `parentGroup`, `orderInParentTokenSet`, `orderInParentDisplayGroup` and `description`. A group is identified by its path of `displayName`s, in `parentGroup` and in a token's `displayGroup`. The component catalogue stays out. Ruled on 2026-11-20 ([second rulings](tokens-source-1/tokens-source-plan.md#field-rulings-from-the-feature-proof)). Until then, a token's group was its `displayName`, and a tree kept only `tokenName` and `childNodes`.
     - **Every key is ruled, at every depth:** the allow list keeps it or the drop list names it, and a key in neither refuses the conversion. Inside a value field, keys and types match the schema exactly. Until then, the allow list stopped at a value field's name.
     - **`context.json` keeps a context tag group's and a tag's `description`, and the drop list names `system.navigation`.** `storeVersion` is 2. Ruled on 2026-11-20 ([step 2 rulings](tokens-source-1/tokens-source-plan.md#step-2)). Until then, neither record kept a `description`, and the store was at version 1.
  5. **The converter refuses** a table whose fields the converter reads are missing or of another type. It also refuses a tag id that resolves to no tag, a tree that doesn't start at the token's own value, a reference to a token that isn't in the store, and a token for which no table's copy covers every other. It names the table, the token and the field.
     - **A token that more than one table carries is stored from the copy that covers every other,** and a token for which no copy does is refused. A copy covers another when the two are identical, or when the other has no `contextualReferenceTree`, equals it in every other field but `values`, and has only `values` entries that each equal a different one of its own. Ruled on 2026-11-20 ([step 2 rulings](tokens-source-1/tokens-source-plan.md#step-2)). Until then, this said: _"A token that two tables convert differently is allowed only in step 1's legacy conversion of today's mixed snapshot. There the table `DB.load()` reads first wins, and each conflict is listed."_
  6. An update is a pull request carrying a report: tokens added and removed, deprecations added, and each changed one-hop reference and literal for `expressive` and `web`, by token set, with the difference in material-x's generated CSS. The report is saved in that pull request's record.
  7. The component list is explicit, one manifest row per component id.
  8. **The CSS layer** (`processToken`, `processTokenSet`, `TokenPackage`, `resolve`, `variable`, `selector`) reads the reader and keeps its surface. Its value mapping is one exported pure function from a stored value to a CSS value. The reader's selection rule is today's: the first contextual entry whose tags include any of `expressive` and `web`, otherwise the first entry.
- **Order:**
  - **Step 1** converts today's committed tables in a legacy mode without fetching, deletes them, and switches tproc to the store. It must leave material-x's generated CSS byte-identical, and the reader must give the same value, reference tree and resolved value as `DB` for every token. It merges before `RD-29`'s rewrite.
  - **Step 2,** after step 1, updates to a dated release in its own pull request.
  - **Step 3,** after step 1, is the weekly change notification.
  - The plan's [revised steps](tokens-source-1/tokens-source-plan.md#steps-revised) carry proofs P1–P11.

**Why.** The database is Material's authority, and its export is the only public form of it with every property tproc renders: contextual values, one-hop references, reference trees, token sets and deprecation. What made the reading fragile was that tproc followed `latest`, kept no record of what it took, fetched during test runs and compared nothing on change. Each of these is fixed without leaving the source. A dated address makes a release consistent and repeatable while the site keeps it, and the committed store doesn't depend on how long that is.

- **Why a converted store and not pruned tables.** An allow list of fields keeps out personal data, and any field upstream adds, by construction, where pruning removes only the fields someone thought of. A store named by token set, with tag names in place of ids, can be read and diffed by a person, which the tables' internal ids prevent. The CSS layer is unchanged, so step 1's byte-identical CSS remains a complete safety net for what material-x renders. Parity with `DB` covers the rest.

**What it said before the amendment.**

- The title was _"tproc keeps reading Material's own token database, from a committed, pruned snapshot of one dated site release that only an update script writes"_.
- Property 1: _"tproc reads only the committed snapshot, and `DB.load()` has no network path. A missing or invalid table fails the load and names the file."_
- Property 2: _"One update script writes the snapshot. It fetches every table from one dated release address (`2026-11-19_06-20-01`), not from `latest`, and refuses a set whose tables report different `system.version.versionName`."_
- Property 3: _"A committed manifest records the release id, the database's `versionName`, version id and publish time, the fetch date, each table's kind, component id and name, and each stored file's SHA-256."_
- Property 4: _"Stored tables keep only the fields `TokenTable.ts` declares, in upstream array order, and no revision, author, time or settings field. Storing the same release twice gives byte-identical files. They are minified and marked `-diff`."_
- Property 5: _"The update script refuses a table whose shape differs from what tproc reads, or whose references name something missing, and names the table, the token and the field."_
- The order: _"the mechanism lands first with today's data, normalized without fetching, and must leave material-x's generated CSS byte-identical. The first update to a dated release is a separate pull request. The plan's [steps](tokens-source-1/tokens-source-plan.md#plan) carry proofs P1–P9."_
- The status asked the owner to answer `Q1`–`Q3` of the [plan](tokens-source-1/tokens-source-plan.md#owner-questions).

#### RD-29 — Material's tables are removed from every commit, once, by a rewrite that the owner runs, and the record keeps a map from old commit hashes to new ones

**Proposed 2026-11-20 by the architect,** on the owner's answer to `RD-28`'s `Q2`, relayed by the coordinator: _"Да, конечно, всё переписываем, не хватало мне ещё претензий от гугла"_ ("Yes, of course, we rewrite everything; claims from Google are the last thing I need"). He then added (translated): _"The old pull requests need checking too: the data may have survived there."_

- **Number.** `RD-28` is the highest decision number on any branch on `origin` and in any slot, so this is the next free number.
- **Status.** **Proposed, and deferred by the owner on 2026-11-20. Not executed.** The owner runs it when he schedules it, after answering `QH1`–`QH4` of the [plan](tokens-source-1/history-rewrite-plan.md#owner-questions). It removes what `RF-67` found. Until his answer, this line began: _"**Not executed.** The owner runs it, after answering"_.
- **The owner's answer** (translated; quoted in [the plan](tokens-source-1/history-rewrite-plan.md#the-owners-answer-2026-11-20)): _"Not doing it for now, but we keep it in mind: I want to do it at some point. The hashes aren't a problem … The backup could perhaps just be deleted, we're already living fine on the new version."_
  - He accepts that every commit hash and every _Verified_ badge changes.
  - Deleting the `backup/*` branches rather than rewriting them is his inclination, not a decision. `QH1`–`QH4` stay open.
  - Property 1 is unchanged: `RD-28` step 1 doesn't wait for the rewrite, and the rewrite needs step 1 on `main` first.
- **Who.** Agents don't force-push or change a ruleset, and the plan names who does each step.

- **Required properties:**
  1. **Precondition:** `RD-28` step 1 is on `main`, so the rewrite can remove the tables from every commit, the tip included.
  2. **The rewrite** is `git filter-repo` 2.47.0 or later, `--sensitive-data-removal --invert-paths`, with the paths `.data/tokens/`, `packages/material-x/.data/tokens/` and `packages/tproc/.data/tokens/`. It runs on a fresh mirror clone in the devcontainer. Before anything is pushed:
     - no blob holds an address at google.com or a `"gaiaId"` key;
     - no commit touches the three paths;
     - `main` builds.
  3. **Every branch is pushed rewritten, and nothing else changes.**
     - The freeze puts every unit's work on `origin` first.
     - The push is `git push --force origin 'refs/heads/*:refs/heads/*'`, which deletes nothing.
     - The rulesets `Main protection` (20963220) and `Backup preservation` (20963078) are turned off only for the push, then restored and compared with their saved JSON.
  4. **GitHub Support** is asked to dereference the affected pull requests, run a garbage collection and remove cached views. The request names the affected pull request count and the first changed commit.
  5. **The record keeps a map.**
     - The first commit after the rewrite adds filter-repo's `commit-map` under `.plan/history-rewrite-1/`.
     - It re-points the resolver's retired-scope commit in `.scripts/entry.ts`.
     - Hashes that record text cites stay as written, and they are read through the map.
  6. **A guard in `verify`** fails a pull request whose head has the old initial commit `e1e11870` as an ancestor, or whose commits add a path under `.data/tokens/` at any depth.
  7. **Local copies** of the old history are removed: the main checkout, slots b–f, the scratch worktrees, the one transcript that holds two of the addresses, and any other clone the owner has. The plan's step 10 lists them.

**Why.**

- **Why the three paths are removed.** The owner asked for the personal data to leave the history. Removing the three paths does that completely, and the check is simple: no blob under them, and no blob with a marker. Redacting the addresses inside the tables would keep Google's tables in the history, and would trust a pattern to find every personal field.
- **Why the rewrite changes so much.** It changes every commit hash, because `--sensitive-data-removal` also removes every commit's signature. The map keeps the record's citations readable without rewriting the record.
- **Why Support is needed.** Without it, GitHub keeps the old commits reachable through the 55 `refs/pull/N/head` refs and by hash. Only Support can remove those.
- **Why nothing else on GitHub needs removing.** The scan of the pull requests' and issues' text, the artifacts, the deployed site and the run logs found no copy ([reading](tokens-source-1/checks/history-scan.txt)).

#### RD-30 — `@ydinjs/core` declares `"sideEffects": false`, and the release check bundles a bare import of each export to prove the claim of every package that makes it

**Decided 2026-11-20 by the owner,** relayed by the coordinator, answering question 1 of the [`@trait` follow-ups plan](https://github.com/ausginer/material-x/blob/repo/trait-decorator-2/.plan/trait-decorator-2/trait-decorator-2-plan.md#questions-for-the-owner) as recommended: _"Да, давай по обоим пунктам"_ ("Yes, go on both"). `RD-26`'s fourth amendment, on `repo/trait-decorator-2`, records the answer. The check's design is the architect's. Registered on `core/side-effects-1`, from `origin/main` at `e4b0e475d`. `RD-29` is the highest decision number on any branch on `origin` and in any slot, so this is the next free number. The [plan](core-side-effects-1/core-side-effects-plan.md) holds the readings, the tasks, the proofs and the probes. It must be in before core's first release.

**Implemented 2026-11-20 by the implementer** on `core/side-effects-1` ([report](core-side-effects-1/core-side-effects-report.md)). Until then this said _"Unimplemented."_

- core declares the field, and step 7 runs the `side-effects` check. Proofs 1–7 hold. `just release-check core` lists no `side-effects` problem, and lists `@ydinjs/core/utils/runtime.js` with a scratch top-level effect. box-quad passes.
- rolldown 1.3.2 doesn't bundle CSS, so the check emits an imported stylesheet as an asset itself, and property 4 holds as written. For that reason the `moduleSideEffects: true` mutation fails the two effect rows and not the CSS row.
- rolldown is imported when step 7 runs, not at the module's top, because a release run's first step runs `release-check.ts release` before `aube ci`, so evaluating the module must need only Node's built-in modules. With a static import, that step fails with `ERR_MODULE_NOT_FOUND` ([probe](reviews/core-side-effects-1/checks/without-dependencies.txt)). Separately, with a static import the root `just test` failed `drag:DRI-17`'s hot-path row, which passes alone. That is an observation for #70, not a reason for the import's position.
- An import that rolldown doesn't resolve, such as an export whose file is missing or a module's import of an undeclared package, is reported as that import, with a repair that applies to it, and not as an effect. Before the feature proof's `reviewer-2`, such an export was reported as keeping bytes, and an unresolved relative import made the check throw.
- **Corrected 2026-11-20** after the [feature proof](reviews/core-side-effects-1/feature-proof-claude.md) (`reviewer-1`, `reviewer-2`). This line explained the lazy import only by DRI-17, and didn't name unresolved imports.

1. **The claim.** core's `package.json` declares `"sideEffects": false`.
   - **It is true of the 27 modules at `e4b0e475d`.** Their top levels only import other core modules, bind functions, classes and values, and call `Symbol`, `bound()` (which returns `null`) and `createEventNotifier` (which returns a closure). `element.js`'s static block assigns its own module's bindings. No module writes a global, defines an element, adopts a stylesheet or adds a listener, and core imports no CSS ([reading](core-side-effects-1/checks/top-level.txt)).
   - **The one observable thing is a throw:** `element.js` and the modules that extend `Event` throw where the global doesn't exist. Leaving the module out removes only that failure.
   - **rolldown agrees without the field:** told that every module has effects unless it proves otherwise, it keeps nothing of a bare import of any of the 27 ([reading](core-side-effects-1/checks/consumer-drop.txt)).
2. **The check.** The release workflow's step 7 checks the claim of every packed manifest whose `sideEffects` is `false`, box-quad's included:
   - for each export, it bundles a bare import of the specifier from the consumer project with the repository's rolldown, with `treeshake.moduleSideEffects` a function that returns `true`. Only a function overrides the package's field ([reading](core-side-effects-1/checks/oracle.txt));
   - each bundle must emit no code and no asset. Otherwise it reports a `side-effects` problem that names the specifier and the bytes kept;
   - a manifest whose field has another value, such as an array, is reported until the check reads that form.
3. **A module that gains an effect** fails the next release's check run. Its author removes the effect, marks the call `/* @__PURE__ */`, or changes the field to an array of the modules that have effects and extends the check to read it.

- **Why `false` and not an array:** an empty array means the same, and neither form keeps out a module that nobody listed. The check does, in either form.
- **Why rolldown judges it:** it is the repository's bundler, and it keeps what it can't prove free of effects. When it is wrong, the release fails on an effect that isn't one, which is the safe side.
- **Why at release:** the field is a contract once the package is published, and step 7 already installs the tarball that is published, in every check run, release run and `just release-check`.
- **What it changes** ([plan](core-side-effects-1/core-side-effects-plan.md#the-size-reading)):
  - **No size row,** of 33, because size-limit bundles with rolldown, which already drops these modules. The five bare imports of core that rolldown keeps in material-x's built `IconButtonCore.js`, `TextFieldCore.js`, `ButtonGroupCore.js` and `focus-forwarding.js` cost 0 bytes in a rolldown bundle, with or without the field ([reading](core-side-effects-1/checks/size-reading.txt));
  - **No built file** of core or material-x. material-x's build treats core as external, so its published files keep the five imports ([reading](core-side-effects-1/checks/build-identity.txt));
  - **An esbuild consumer's bundle:** 14 of material-x's 18 runtime entries lose 42 to 51 minified bytes, which are `attribute-traits.js`'s `bound` and its two calls. A bare import of a core module keeps up to 959 bytes without the field, and nothing with it ([reading](core-side-effects-1/checks/consumer-entries.txt)).
- **Not adopted:**
  - **the check in the pull-request workflow as well:** no job there packs a package, and nothing is published between a pull request and the check run before the next release;
  - **a test that reads the top level of core's source:** the claim is about the built modules, which the plugin and tsdown write.
- **`RD-26` and `RD-27` don't change.** `RD-26`'s fourth amendment and this unit don't wait for each other. `RD-27`'s properties don't enumerate the checks, and its plan's step 7 gains one.

#### RD-32 — A unit's plan and its implementation share one branch and one pull request, and a change to project documentation has its own

**Decided 2026-11-21 by the owner,** relayed by the coordinator: _"A change to project documentation (rules for agents, user-visible documentation, etc.) is a separate PR, that's right. But a plan is part of a feature's implementation, so they must go in one PR."_ (translated). Proposed by Mx Architect B in the description of [#93](https://github.com/ausginer/material-x/pull/93), from slot b, which doesn't mint. Registered by the architect on `repo/one-pr-rule-1`. `RD-31` is the highest number on any branch on `origin`, so this is the next free number. **Implemented** in `agent-workflow.md`, `AGENTS.md` and `work-queue.md` by #93 (`2f95645a6`), which the owner merged.

- **The rule:** [`agent-workflow.md` §One branch and one pull request per unit](../.agents/docs/agent-workflow.md#one-branch-and-one-pull-request-per-unit).
- **It amends `RD-25`'s rule.** An agent still opens a pull request without being asked once the unit is finalized and pushed. A plan alone no longer finalizes a unit that implements it. Merging stays with the owner.
- **What the documents said before.** `AGENTS.md` allowed a pull request _"once a unit is finalized and pushed"_, and an architect's pushed plan counted, as for #90. `work-queue.md` said that an issue moves to _In progress_ with its pull request.
- **A unit with nothing to implement,** such as a decision that only records an answer, has its own pull request. This entry is one.
- **Not settled: a feature's own user documentation.** The owner's words put user-visible documentation in a separate pull request. The rule as written keeps a feature's JSDoc and its component page with the feature, as `implementer.md` makes the documentation a task needs part of its implementation. Only documentation that no feature owes has its own pull request. If the owner meant a feature's documentation too, the section's last bullet and `implementer.md` change, and this entry is amended.

**Why.** A plan is part of its feature's implementation, so the owner reviews and merges them together. Project documentation isn't a feature's, so it has its own pull request.

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
- **Dated 2026-11-18 by the architect: the forward is the trait,** on `repo/traits-plugin-1` at `17065ddf0` (`RF-44`'s item 3, which the owner accepted). `FocusForwarding`, as parked at `92e13f9d6`, replaces the per-class `focus()` declarations, `forwardFocus` and `focusControl` in eight hosts. The FAB is the eighth: #35 made it register a control. The flattener copies the trait's `focus()` into each host, so `Object.hasOwn(host, 'focus')` stays false, and the subclass rows pass in every engine ([witness](traits-plugin-1/checks/item3-witness.txt)). What stays open is unchanged.

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

- **Dated 2026-11-17 by the architect: a third row failed the same way in the gate,** reported by the coordinator. It is registered here and not as a new finding, because it has the same gesture, the same wait and the same teardown as the two skipped rows.
  - **The row:** "should restore pre-existing inline styles on the target after landing", in the same file. It isn't skipped.
  - **The failure:** attempt 1 of run 44030423689 at `a51e5cb1c`, in `browser/core`. The row drags the sole item 90 px and releases it, then waits up to 1,000 ms for `item.style.position` to be `relative` again. The wait gave up at 1,031 ms: `expected 'fixed' to be 'relative'` ([log](docs-gate-1/checks/safari-flake-44030423689-attempt-1.txt)).
  - **What the reading shows:** `fixed` is the lift's inline position (`pinVisual`, `src/traits/reorderable.ts:303`). `teardown` restores it in the same call that takes the visual out of the top layer (`:503`–`:509`). So, as in both skipped rows, `teardown` hadn't run about four times the probe's slowest landing after the gesture.
  - **Other runs:** in attempt 2, which re-ran the whole `safari` job, the row passed. It passed in Safari in each of the branch's five earlier `verify` runs (44016421012 to 44027436469). `a51e5cb1c` differs from the green `8f62beedf` (run 44027436469) only in `.plan/`.
  - **For a change to the Safari job's speed:** these rows wait on the wall clock, against a landing of about 250 ms. A change that adds load on the runner, or makes Safari sessions share it, plausibly makes a stall longer and more frequent. That is an inference: no reading of the stall's cause exists. `drag:DRF-49` and `drag:DRF-50` are Safari-only stalls of the same kind, and their causes are not read either. In this run, `browser/core` took 14 s of the job.
  - **What it changes:** the stall reaches rows that aren't skipped. Seven more rows in the file use the same 1,000 ms wait. The cause is still not established, and the required property doesn't change. **No row is disabled.**

**Dated 2026-11-17 by the architect,** on `repo/ci-speed-1` at `229829ef7`: `RD-12`'s amendment moves Safari out of the gate. Once it is implemented, these rows no longer fail `verify`. Their Safari skips stay and apply to the weekly Safari workflow, where the unskipped third row can still turn a run red, and that run's issue names it (`RD-12` property 12). The finding stays open, because no cause is established. **The three rows run in WebKit in the gate.** The CI-speed unit reads whether WebKit reproduces the stall, and if it does, the row is an `RD-8` row in WebKit.

**Dated 2026-11-18 by the architect: a reading is planned, and the owner accepted it,** relayed by the coordinator. The [Safari reading plan](reorderable-safari-1/reorderable-safari-plan.md) on `repo/reorderable-safari-1` instruments the three rows and dispatches `safari.yml` on its branch, at most three times. The owner lets the implementer dispatch with no stop before each. If no failure is caught, the unskipped third row keeps a failure diagnostic. The reading establishes the cause, and the repair is decided on it. The required property doesn't change.

**Dated 2026-11-19 by the architect: the reading caught no stall, and the third row's diagnostic must not act on the page before its wait gives up,** on the implementer's [report](reorderable-safari-1/reorderable-safari-report.md) at `3cdc52d21` and the [feature proof](reviews/reorderable-safari-1/feature-proof-claude.md) at `63ba89b8f`, relayed by the coordinator. Read on `repo/reorderable-safari-1` at `63ba89b8f`, the head of #71, which says `Refs #44`.

- **The reading:** three dispatches of `safari.yml`, runs 44282566548, 44285063425 and 44287092259, all at the scratch commit `0a107f84e`, on macOS 26.7.2 (25G332) and Safari 27.2. 630 landings of the three rows, unskipped, in 21 `browser/core` runs: 3 inside the full Safari job and 18 alone. **None stalled.** Teardown ran 210 to 246 ms after the gesture's start, p50 218, p90 234 and p99 236. The marks came in one order in every landing, and teardown followed `finished` within 5 ms. The feature proof recomputed every number from the runs' logs. The outputs are in [`reorderable-safari-1/checks/`](reorderable-safari-1/checks/).
- **What it doesn't read:** no landing failed, so none of the plan's candidates A to E is read. If failures were independent of the run, 21 passing runs would have a probability of about 0.02 at the record's rate of one failing run in six. The report lists reasons that it can't tell apart: a condition these runs didn't have, such as the runner's load or the projects' order, or the instruments.
- **Two instrumented readings have caught no stall:** these 630 landings, and the findings unit's 75 in a separate scratch file ([findings report](findings-1/findings-1-report.md) §3). Every recorded failure came from a row without instruments.
  - This reading ran, during every landing, a loop that requests every frame and a 50 ms timer. A frame request makes the browser update the rendering in that frame, and an animation's `finished` settles in a rendering update. So the frame loop could prevent a stall of kind A or C. **That is an inference, not a reading.**
  - The findings probe read frames only before and after each landing, so it had no frame loop during one. Its five jobs would all pass with a probability of about 0.4 at the same rate, so it doesn't test the inference either.
- **Ruling on the feature proof's `reviewer-1`: accepted, Tier B, and the diagnostic changes before #71 merges.**
  - **What holds:** as committed in `171254dc2`, the diagnostic runs the reading's frame loop and 50 ms timer, a `MutationObserver` and a wrapper of `Element.prototype.animate` during every landing of the third row, in every run. That row is the only one through which `RD-12`'s weekly Safari run can show this finding. The row had no frame loop before the diagnostic.
  - **Why Tier B:** if the frame loop prevents the stall, the weekly row passes for a reason other than a repair, and the diagnostic never fires. The instrument the record relies on to see this finding would then be unsound, and a weekly pass would read as evidence that it isn't.
  - **Why a change rather than a reading:** whether the frame loop prevents the stall would take more dispatches to read, and could stay unread at this rate. A diagnostic that schedules nothing of its own until the wait gives up can't prevent the stall, and the change is a few lines in the test file. The owner's answer 2 kept the diagnostic so that a weekly failure carries its trace, and that needs a row that can still fail.
  - **The properties** are in the plan's [step 3](reorderable-safari-1/reorderable-safari-plan.md#implementation), amended on this date. In short: until the wait gives up, the diagnostic requests no frame and runs no timer of its own; the wait's own polls may record their time and `document.timeline.currentTime`; only after the wait gives up may it watch frames and a timer, for a stated bound, before the row fails.
- **Limits that stand after the change:**
  - The trace reads the state when the wait gives up and in the short watch after it. It doesn't read how long a stall lasts or what ends it, as the plan's 10 s watch would have.
  - It covers only the wait after `ue.pointer` returns. If `ue.pointer` doesn't return, as under candidate B or a stalled driver, the row fails at the test's timeout with no trace, its `finally` doesn't run, and the trace's listeners, observer and wrapper stay installed for the file's later rows. That is outside the plan's _"when the row's wait gives up"_, and no change is required for it.
- **Owed when a weekly run fails in the third row:** the trace exists only in the failing job's log, which the weekly issue links and GitHub keeps for a limited time. The unit that takes the failure first saves the trace into `.plan/reorderable-safari-1/checks/`, and the architect reads it against candidates A to E.
- **What doesn't change:** both Safari skips stay, `src/` doesn't change, and the required property stands. **The finding stays open.**

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

#### RF-40 — material-x's `:host:has()` fallback is complete in the build, and no test in the gate observes it

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-16 by the architect, while ruling on `RF-39`.

- **The code:** `useHasSlottedPolyfill` (`material-x/src/core/utils/polyfills.ts:22`) tests whether `:host:has(slot)` matches (`HOST_HAS_SUPPORTED`, `:10`). Where it doesn't, it sets the custom states `has-<slot>` on the host.
- **Read by the architect at `5a0bba69b`:** no stylesheet or source under `packages/material-x/src/` or `packages/core/src/` reads `:state(has-`.
- **Who relies on it:** text-field's lead, trail, prefix, suffix, support and counter rules (`text-field/styles/default/main.styles.css:141`–`:176`) and list items' support and overline rules (`list/styles/item/main.styles.css:35`–`:43`, `:184`) select on `:host:has(… :has-slotted)`.
- **Not established:**
  - whether Firefox renders those components differently;
  - what `HOST_HAS_SUPPORTED` reads in Firefox;
  - whether Firefox supports `:has-slotted`.
- **Required property:** in every engine the gate runs, each `:host:has()` rule in material-x applies, or the component renders the same without it. A fallback that nothing reads is either completed or removed.
- **Routed** to the owner to order. It isn't in the findings unit's scope as authorized. The architect recommends a reading first, in Firefox CI, of the two components with and without slotted content.
- **Corrected 2026-11-18 by the architect,** on slot `c`'s [handoff](host-has-fallback-1/host-has-fallback-handoff.md) and [reading](host-has-fallback-1/checks/rf40-reading.txt) at `83a985b99`, relayed by the coordinator. Until then, this entry's title was _"material-x's `:host:has()` fallback sets custom states that no stylesheet reads"_.
  - **The premise didn't hold.** The reading at `5a0bba69b` searched `src/` only. The build passes every material-x stylesheet through `hasSlottedFallbackVisitor` (`vite-custom-element-assets/src/css/utils.ts`), which adds `:host(:state(has-<class>))` beside each `:host:has(.<class>:has-slotted)`. So the shipped sheets read each state the polyfill sets, and the names agree (reading A and B). The architect confirmed reading A on a material-x build of the same day: the built text-field sheet carries `has-lead`, `has-trail`, `has-prefix`, `has-suffix`, `has-support` and `has-counter`, and the list item's carries `has-support` and `has-overline`.
  - **The _Not established_ items are answered** (reading D). Firefox 159 doesn't match `:host:has()`, `HOST_HAS_SUPPORTED` reads `false`, the polyfill sets the states, and the fallback rules apply. Chromium 158 and WebKit 27.2 match `:host:has()`. Firefox supports `:has-slotted`, which doesn't matter, because the build rewrites it in every engine.
  - **The required property holds at the CSS level. No test in the gate observes it** (reading F). A mismatch between a slot's `name`, the class beside `:has-slotted` and the derived state would break Firefox alone, as `RF-39`'s defect did.
  - **The owner's question:** does this entry close on the reading, as _not a defect_, or when the handoff's item 1 lands, with rows that pass in all three engines and fail in Firefox when the fallback is disabled? **The architect recommends the tests,** as the handoff does. The correction above holds under either answer.
  - **Separate:** the detection itself runs at import. That is `RF-59`.
- **Dated 2026-11-18 by the architect: the rows hold, with one rule unobserved,** on the [feature proof](reviews/host-has-fallback-1/feature-proof-rf40-claude.md) of the handoff's items 1 and 2, which read the code at `90789d260`.
  - **The coupling is witnessed:** when a slot's class disagrees with its `name`, the lead rows fail in Firefox alone (the review's mutation _3c_).
  - **`list/styles/item/main.styles.css:184`,** the three-line leading video's size, has no row. The handoff's item 4 adds one.
  - **It closes** when item 4 is in and the pull request's run on item 4's commit passes the rows in all three jobs, per the [handoff's disposition](host-has-fallback-1/host-has-fallback-handoff.md#closing-rf-40-and-rf-59).
- **Closed 2026-11-18 by the architect** on `repo/host-has-fallback-1` (#59, not yet merged), relayed by the coordinator. The closure rests on the [report](host-has-fallback-1/host-has-fallback-report.md) at `28a3ad4bb`, and on the run's job logs, which the architect read.
  - **Every rule this entry lists has a row in the gate:** text field's `lead`, `trail`, `prefix`, `suffix`, `support` and `counter`, on both text field elements, and the list item's `support`, `overline`, both together, and the three-line leading video at `:184` (item 4).
  - **The rows pass on the tree that merges.** #59's run 44276212222 is on `4df80913f`, which merges `origin/main` at `7a4f82eb4`. It passes `text-field.browser.test.ts` (26 tests) and `list-item.browser.test.ts` (7 tests) in the `chromium` job 134705238062, the `firefox` job 134705238220 and the `webkit` job 134705238152 ([reading](host-has-fallback-1/checks/rf40-pr-run.txt)). The earlier run 44273791779, on `5b1a4d35d`, isn't cited. It predates #37 and #61, and #61 changes the text field and list item sources and the flattener that compiles them in the gate.
  - **The rows test the fallback:** with the polyfill setting no state, they fail in Firefox alone (the report's item 1 witness 2, and item 4 witness 2). The coupling's witness is the review's mutation _3c_.
  - **The rows assert outcomes only,** so they stay valid when the polyfill and the build's rewrite go (`RF-59`).
  - **Corrected at this closure:** the run's reading quoted the Runner Image Provisioner's version, `20261103.629`, as the runner image. It now gives the Runner Image group's version: `20261111.370.1` in the `chromium` and `firefox` jobs, and `20261111.127.1` in the `webkit` job.

#### RF-41 — The screenshot comparator doesn't see a state layer at the tokens' opacities

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-16 by the architect, from the [findings report](findings-1/findings-1-report.md) §7 (run 43886019999 at `c34cb01d7`). **No row is disabled.**

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
- **Dated 2026-11-18 by the architect: decided by `RD-23`,** on the owner's choice of branch (a), relayed by the coordinator. The visual layer sees state layers, at a threshold that a reading on GitHub's runner chooses. The [state-layer visual plan](state-layer-visual-1/state-layer-visual-plan.md) on `repo/state-layer-visual-1` implements it, and that unit's pull request closes this entry.
- **Closed 2026-11-18 by the architect** on `repo/state-layer-visual-1` (#66, not yet merged), relayed by the coordinator. The closure rests on the [feature proof](reviews/state-layer-visual-1/feature-proof-claude.md) at `b51d3a9a0`, which finds no Tier A or B defect, and on the implementer's [report](state-layer-visual-1/state-layer-visual-report.md). **The first branch of the required property holds:**
  - The visual project compares at 0.01, with antialiased pixels excluded, no mismatched pixel allowed, and no row's override.
  - In the [reading](state-layer-visual-1/checks/threshold-reading.md) (run 44276375207, 21 jobs), each focused row fails against a baseline that doesn't show its focus layer, and each hovered row fails with the hover layer at 0. The two runs agree on every row.
  - Run 44279730764 at `362851ed3` passes all 19 rows with the re-recorded baselines in both `chromium` attempts, jobs 134717314524 and 134722348592.
  - `test-architecture.md` §What screenshots prove states the rule.
- **Corrected at the closure:** the registration's _"`button-focused`, `radio-focused` and `checkbox-focused` still show no layer"_ held for the first two only. `checkbox-focused`'s baseline showed the hover layer (`RD-23`, property 2 (i)'s amendment).

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

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-17 by the architect, from the findings unit's [feature-proof review](reviews/findings-1/feature-proof-claude.md), `reviewer-1` (code at `fc3b89680`), relayed by the coordinator. **No row is disabled:** no row reads a switch button's focus layer.

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
- **Planned 2026-11-18 by the architect** on `repo/host-invariant-1` from `e9236603e`, in the [host-invariant handoff](host-invariant-1/host-invariant-handoff.md), on the owner's authorization relayed by the coordinator. The handoff judges the audit's starting facts.
  - **Ruled:** the switch's `.host` is a native `<button type="button" role="switch" part="impl">`, the shadow root's one top-level element, and the `<input>` and part `control` are removed (R1, R3). The switch stays a controlled component: activation fires `click`, `input` and `change` and changes no state, and `aria-checked`, `:state(checked)` and the form value follow `checked` alone (R2). The switches draw focus only through the button family's shared rules (R4).
  - **Judged:** `mx-list-item` meets the invariant, since it takes no focus. `mx-fab` diverges: its shadow root doesn't delegate focus and no forward reaches `.host`.
  - **Waiting on the owner:** the three exceptions E1 to E3 (native-input controls, slot-only components, the split button), whether `mx-fab`'s forward is in this unit, and whether R2's controlled model stands. The implementer starts after the architect records the answers here and in `architecture.md` §Components.
- **Answered 2026-11-18 by the owner,** relayed by the coordinator, and recorded by the architect in [`architecture.md`](../.agents/docs/architecture.md) §Components and the [handoff](host-invariant-1/host-invariant-handoff.md#the-owners-answers).
  - **E1, E2 and E3 are approved.** The owner proposed that E1 cover any focus target that can't be a container, not only `<input>` and `<textarea>`, and said he might be extrapolating. **The architect accepts this, with a limit:** the criterion applies to the native element that the component's semantics need, not to an element the component chooses. Without the limit, today's switches would qualify, since their `<input>` can't be a container, and the exception would swallow the invariant. A container that gives the same semantics, such as a `<button>` with a role, takes precedence. The members are unchanged.
  - **`mx-fab`'s focus forward is in this unit** (item 3).
  - **R2 stands, and the owner states it as a principle for the repository:** every material-x component is controlled. It is in `architecture.md` §Components. The components that don't meet it are `RF-50`'s. Checkbox and radio join this unit as item 7.
- **Stopped 2026-11-18, and decided by the architect,** on the [host-invariant report](host-invariant-1/host-invariant-report.md#the-stop) at `7667a2a5a`, relayed by the coordinator with the owner's rejection of the new baseline. `button-group-connected-selected` differs: under R2 the group's `value` sets `checked`, so the connected group's `::slotted([checked])` rule draws for the first time. **The owner rejects the new rendering:** _"in the spec they are obviously not rounded like that"_. **Neither rendering is the spec's:** the selected button is a full pill, which is `RF-56`. The [handoff](host-invariant-1/host-invariant-handoff.md)'s new item 8 repairs it in this unit, because the unit can't finish on either baseline.

- **Feature proof decided 2026-11-18 by the architect,** on the [review](reviews/host-invariant-1/feature-proof-claude.md) at `5b1544100`, which read the code at `2bef29ac0`, relayed by the coordinator. The [handoff's disposition](host-invariant-1/host-invariant-handoff.md#disposition-of-the-feature-proof-review-at-5b1544100) routes each finding.
  - **`reviewer-1`, the group path, is remediated in this unit.** The join case contradicts item 1's property 6. **The ruling on a missing `value`:** both groups document `value` as the one selected segment, so a `null` selects nothing and matches no switch. The group controls its switches' `checked` only while it has a value. Removing the value clears the selection it made, and a switch that joins a group with no `value` keeps its `checked`. That reading keeps the consumer as the only other writer, so it meets the controlled principle with no owner decision. It needs no change to the context contract. `button-group.mdx:112` says that the standard group has no segmented selection, against its own code and story, so the remediation corrects it too.
  - **`reviewer-3` to `reviewer-5`** are remediated in this unit: the _States_ claims, item 6 for the two group entries, and the PERCENT count.
  - **The switch's activation depends on invoker commands** (`command` and `commandfor`, R1's dispatch after `click`). In an engine without them, a switch fires `click` and never `input` or `change`. They are Baseline since December 2025: Chromium 135, Firefox 144 and Safari 26.2 (MDN's _Invoker Commands API_ and the web-features entry, read 2026-11-18). No record states a browser floor, so this isn't a defect. **The owner's question:** does material-x state a browser floor? The architect recommends the current stable release of each engine, which includes invoker commands. It doesn't block #35.
  - **It closes** when the targeted recheck of items 9 and 10 finds no defect.

- **Closed 2026-11-18 by the architect,** on the targeted [recheck](reviews/host-invariant-1/feature-proof-recheck-claude.md), which read the code at `564d02e38` and has no finding. The [handoff's disposition](host-invariant-1/host-invariant-handoff.md#disposition-of-the-targeted-recheck-at-c1a40a3fc) holds the reasons.
  - **Met:** items 1 to 12. Each switch's `.host` is its root and takes focus, and the five feature-proof findings are resolved, the group path and the checkbox's and radio's form value among them.
  - **The reviewer's note is accepted behaviour:** a switch whose own `value` changes inside a group with a value keeps its `checked` until the group's next event. The group writes `checked` only on a join and on a change to its own `value`. A consumer's write to a switch, of `checked` or `value`, stands until then. No code, and no new entry.
  - **The merge's condition, not the closure's:** the full `verify` run 44245582616 at `c1a40a3fc`, `webkit` included. A row of this unit that fails there reopens this entry.
  - **Still open, and the owner's:** whether material-x states a browser floor (this entry's 2026-11-18 decision).
  - **Answered 2026-11-18 by the owner, in `RD-20`:** material-x supports the current stable release of each engine until its first release, and a browserslist is owed before that release. Recorded by the architect when `repo/traits-plugin-1` merged `main` at `68debb425`.

#### RF-44 — `vite-traits-plugin` flattens only descriptor traits, though its documentation says it flattens class-based ones

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-17 by the architect, from the findings unit's item 8 stop, relayed by the coordinator. **No row is disabled.**

- **The documentation:** [`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) §Eligibility says that _"the supported generic subset accepts a direct pure transformer whose result is a class extending its parameter. It accepts public fields, constructors, methods, accessors…"_. §Trait IR says that normalization resolves _"descriptor-based and supported class-based traits"_.
- **The code:** `packages/vite-traits-plugin/src/analyze.ts` passes every trait in a composition to `normalizeDescriptorTrait` (`src/normalize.ts:340`). When that returns `null`, it bails with `unsupported-trait` (`analyze.ts:583`–`:598`). No path normalizes a class-based trait.
- **What it cost:** the findings unit's `FocusForwarding` trait (`implementer/item8-step1-trait-wip` at `92e13f9d6`) was a module-scoped `trait(base => class extends base { override focus(…) {…} }, brand)`, inside the documented subset. `npx just build-lib` in material-x warned seven times, and each adopter's whole composition was kept at runtime, not only that trait. So the forward ships in a per-class form (`RF-33`).
- **Required property:** one of these holds:
  - the plugin flattens the generic subset that §Eligibility describes, with the compatibility contract that the document states;
  - or the document states only what the plugin implements, and names class-based traits as retained.
- **Follow-up:** once the plugin flattens class-based traits, the `RF-33` forward moves to the trait parked at `92e13f9d6`, if the forward still ships.
- **Routed** to `vite-traits-plugin`'s owner. **It doesn't block** the findings unit or pull request #29.

- **Dated 2026-11-18 by the architect: planned, and the owner's answer is pending,** on the coordinator's relay of the owner's queue. The [plan](traits-plugin-1/traits-plugin-handoff.md) is on `repo/traits-plugin-1`, from `83a985b99`.
  - **More of the document didn't hold** ([probes](traits-plugin-1/checks/rf44-probes.txt)). One bailout retains every `impl` site in its module, not only its own. The parse cache is keyed by id only. A cyclic trait list overflows the stack. The lowered shape joins a class's lone getter with a trait's setter, and sends the class's `super.key` to the base. §Plugin architecture described a private `.scripts/flattener`, not the public package. No shipped output is affected today: no material-x or core class hits either accessor case, and no source module has two sites.
  - **The required property, amended:** the document states only what the plugin implements, in every section, not only for class-based traits. The architect narrowed [`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) to descriptor traits on the same day. It keeps the four rules the document stated correctly and the code didn't follow, and the plan's item 1 repairs the code to them.
  - **The owner's question:** does the plugin also flatten method traits, a closed subset of class-based traits with only methods and accessors and no `super`, so that the forward moves to the parked trait? The alternative is descriptor-only, and the forward stays per-class until Firefox removes it. **The architect recommends method traits.** The owner chose the trait form and declined only its retained compositions. The plan's item 1 is needed under either answer. The generic subset as the document described it is not adopted: it is a compiler for class semantics that no trait needs (CONTRIBUTING §2.2).
  - **Derived, not measured:** flattening copies the member into each adopter, so the trait form ships about what the per-class form ships. The plan's item 3 measures it, and the owner accepts or declines any growth.

- **Dated 2026-11-18 by the implementer: the plan's item 1 is in,** on `repo/traits-plugin-1`. The plugin now does what the narrowed document says, and the owner's answer is still pending for items 2 and 3.
  - **Repaired:** a bailout retains only its own `impl` site, and `analyzeModule` returns it among `bailouts` in place of throwing it. The parse cache is keyed by id and source. A cyclic trait-list reference bails with `unsupported-trait-list`. A class that declares one half of a trait's accessor, uses `super.key` for a trait's key or `super.observedAttributes`, or uses a computed `super[key]` is retained, with the reason codes `class-accessor-half`, `class-super-trait-member` and `class-computed-super`. The `impl` and descriptor-factory patterns no longer name `traits` or `piirre`.
  - **Witnesses** ([item 1](traits-plugin-1/checks/item1-witness.txt)): the built JavaScript of `@ydinjs/core` (27 files) and `@ydinjs/material-x` (92 files) is byte-identical before and after, and neither build prints a flattener warning. Each repair, reverted alone, fails at least one of the plugin's tests.

- **Decided 2026-11-18 by the owner: answer C, method traits,** relayed by the coordinator. The plugin also flattens method traits, a closed subset of class-based traits with only methods and accessors and no `super`. The focus forward moves to the trait parked at `92e13f9d6` while `RF-33`'s forward ships. Recorded by the architect.
  - **The owner's aside:** _"we gave up classes long ago exactly because of the complexity"_. That confirms the generic subset's rejection: the plugin doesn't become a compiler for class semantics. Each class-based trait outside the closed subset stays retained with a warning.
  - **Unblocked:** the plan's items 2 and 3, as they stand. They start after #37 merges and `main` is merged into this branch (`RD-17`). #37 changes `Branded`'s type in `primitives.ts` and doesn't change the `trait(transformer, brand)` call that item 2 recognizes.
  - **Still owed:** when item 2 is reported, the architect widens [`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) to method traits. The owner accepts or declines item 3's measured bytes against the per-class form.

- **Dated 2026-11-18 by the implementer: the plan's item 2 is in,** on `repo/traits-plugin-1`, after `origin/main` was merged in at `be491e375`. Item 3 depends on #35, which added the FAB as an eighth host that forwards focus, so `main` was merged before #37 lands, on the coordinator's instruction for that case.
  - **Flattened:** a method trait is a `trait(transformer, brand)` from `primitives` with a named brand, a one-parameter transformer that returns `class extends <parameter>`, and only non-static methods and accessors with static keys. Its members are copied as their origin source, in trait order, before the class's own members. Each origin binding that a member reads is linked as a converter is, and a global keeps its name. A new walker, `src/free-references.ts`, finds the free names. It models an allowlist of node types and retains the trait on any other, `var`, nested functions and classes, `super`, `eval` and `import.meta` included. No dependency was added. `TRAIT_IR_VERSION` is 2.
  - **Retained, with four new reason codes:** `unsupported-trait-member` (a member outside the subset, or a body the walker doesn't model), `trait-accessor-half` (a later trait's lone getter or setter over an earlier accessor), `trait-binding-shadowed` (the consumer module or class binds a name that a member reads, or the class isn't module-scoped) and `trait-source-language` (a TypeScript trait in a JavaScript consumer). `class-accessor-half` and `class-super-trait-member` now cover method trait keys too.
  - **Two repairs on the way,** each with a failing row before it: the origin's synthetic-export scan stopped at the first relative import, so a later private binding wasn't exported (the built-package row). A normalization bailout named the trait, not the retained site.
  - **One emitted line changed** ([witness](traits-plugin-1/checks/item2-witness.txt) W1): `static observedAttributes` is emitted only when a descriptor layer contributes it. material-x's `list/list-item.js`, an `impl(ControlledElement, [])`, loses its own copy of the base's list and inherits it, as the runtime composition does. Every other built file of `@ydinjs/core` (27) and `@ydinjs/material-x` (91) is byte-identical, and neither build prints a flattener warning.
  - **Witnesses** (W2): each of twelve rules, reverted alone, fails at least one of the plugin's 138 tests.
  - **Still owed:** the architect widens the document to method traits. Item 3 is next.

- **Dated 2026-11-18 by the implementer: the plan's item 3 is in,** on `repo/traits-plugin-1`. The focus forward is the trait `FocusForwarding` (`material-x/src/core/traits/focus-forwarding.ts`), as parked at `92e13f9d6`. It replaces the eight per-class `focus()` declarations, `forwardFocus` and `focusControl`. The FAB is the eighth adopter: #35 made it register a control, after the handoff counted seven.
  - **Placement,** as parked: the shared lists `ICON_BUTTON_CORE_TRAITS`, `SWITCH_CORE_TRAITS` and `LIST_INTERACTIVE_ITEM_CORE_TRAITS`, and the own lists of `mx-button`, `mx-link-button` and `mx-fab`. `BUTTON_CORE_TRAITS` doesn't name it, so `mx-split-button` and the button group don't adopt it.
  - **Held** ([witness](traits-plugin-1/checks/item3-witness.txt)): the build prints no flattener warning. Each adopter's emitted class extends `ControlledElement` directly, declares its own `focus()` and doesn't import the generic `trait`. The suites of the eight hosts pass in chromium, firefox and webkit (1092 tests), with `RF-33`'s rows among them. mx-button's delegation row still fails in Firefox, so the forward still ships.
  - **Measured** (W1), against the per-class form: +19 or +20 minified bytes in five entries, the brand symbol and its install. +84 in `icon-button`, `switch-button` and `switch-icon-button`: their shared lists are spread arrays that the bundler keeps after flattening, and they keep `FocusForwarding`'s dead class layer too. Brotli moves by −23 to +43. A variant, measured and not committed, names the trait in those three hosts' own lists, and every entry grows by 19 to 21.
  - **Pending the owner:** accept or decline the growth, and choose between the parked placement and the variant.

- **Dated 2026-11-18 by the architect: the document is widened to method traits,** on the implementer's item 2 report and a reading of the code at `17065ddf0`. [`trait-flattener-plugin.md`](../.agents/docs/trait-flattener-plugin.md) now states what the plugin implements for both kinds of trait. That covers the recognition from `primitives`, the definition, member, scope and linking rules, the walker's conservative allowlist, `TRAIT_IR_VERSION` 2, member insertion, and a table of all twelve reason codes. Its change record says what changed, including that `observedAttributes` is emitted only with a descriptor trait.
  - **`RF-44`'s required property now holds in the document and the code,** item 2's witnesses read with it. The entry stays open for item 3, whose bytes the owner accepts or declines. The architect doesn't decide that here.

- **Dated 2026-11-18 by the architect: the feature proof of items 1 and 2 holds, with three Tier C findings,** on the [proof](reviews/traits-plugin-1/feature-proof-claude.md) at `8a5365adc`, read at `5ecec6af3`.
  - **The note above was wrong.** It said that the required property held in the document and the code. The proof found two places where the document said more than the code does (`reviewer-1`, `reviewer-3`), and one hole in the walker (`reviewer-2`).
  - **`reviewer-1`: the document is narrowed.** It now names the binding forms that are linked: named and default imports, and `const`, `let` and `var` declarations with an identifier name. A member that reads a function, class, enum or namespace declaration, a destructured variable or a namespace import is retained, as the code does. That site warns and keeps correct output, and no trait needs more yet. A trait that needs a module function linked widens the code then.
  - **`reviewer-2`: a code defect.** `(eval)(src)` and `(eval as F)(src)` pass the walker, which contradicts the document's conservative rule. The repair: any reference to `eval` retains the trait.
  - **`reviewer-3`: the code is widened.** A `.ts` trait copied into a `.tsx` consumer can fail the build, where the contract promises a warning. The rule: copy only between the same languages, and from JavaScript into TypeScript. The document states one known limit of the second case: rare JavaScript forms that TypeScript reads differently, such as `a < b > (c)`.
  - **Routed:** `reviewer-2` and `reviewer-3` to the implementer, as the [handoff](traits-plugin-1/traits-plugin-handoff.md)'s item 2b. The document already states their target, and its change record says that item 2b meets it.
  - **The required property holds** when item 2b is in. Item 3's bytes stay the owner's.

- **Dated 2026-11-18 by the architect: the item 2b recheck holds, with two Tier C findings against the architect's language rule,** on the [recheck](reviews/traits-plugin-1/feature-proof-recheck-claude.md) at `b72ee0b8b`. `reviewer-2` and `reviewer-3` are resolved.
  - **`recheck-1`:** `.mts` and `.cts` reject `<T>x` and `<T>(x) => x`, which `.ts` accepts, so grouping them as one language repeats `reviewer-3`'s build error.
  - **`recheck-2`:** TypeScript reads JavaScript's `a < b > (c)` as a call, so the JavaScript-into-TypeScript pair changed a member's meaning with no warning. The document had named that as a known limit, which didn't meet its own headline.
  - **The ruling:** a member is copied only between files of the same extension, and every other pair is retained. The JavaScript-into-TypeScript pair goes, because no shipped trait uses it. A parse-equivalence check is the route back if a method trait in built JavaScript is ever consumed by TypeScript. The document states the rule, and the [handoff](traits-plugin-1/traits-plugin-handoff.md)'s item 2c implements it.
  - **The required property holds** when item 2c is in. Item 3's bytes stay the owner's.

- **Dated 2026-11-18 by the implementer: the plan's item 2c is in,** on `repo/traits-plugin-1`. `canCopySource` copies a method trait's members only when the origin's and the consumer's file extensions are equal, and every other pair is retained with `trait-source-language` ([witness](traits-plugin-1/checks/item2c-witness.txt)).
  - **Rows,** each failing before and passing after: a `.ts` trait that returns `<number>x`, into an `.mts` and into a `.cts` consumer, and a `.js` trait that returns `a < b > (c)`, into a `.ts` consumer, are retained. A `.ts` trait into a `.ts` consumer still flattens.
  - **The built-package row** from `method-package-consumer.ts` is retained. A new `method-package-consumer.mjs`, of the package's own extension, flattens. Its runtime rows still fail when item 2's origin-scan repair is reverted.
  - **material-x's build** is byte-identical to the build with the plugin at `17065ddf0` (93 files), and core's is too. The build prints no retention warning. No shipped trait is retained.

- **Closed 2026-11-18 by the architect** on `repo/traits-plugin-1` at `9c0bb2f60` (not yet in a pull request), on the [second recheck](reviews/traits-plugin-1/feature-proof-recheck-2-claude.md) and the owner's answer on item 3, both relayed by the coordinator. The [handoff's disposition](traits-plugin-1/traits-plugin-handoff.md#disposition-of-the-second-recheck-at-9c0bb2f60-and-the-owners-answer-on-item-3) holds the ruling.
  - **The required property holds** in the document and the code. Item 2c is in, and `recheck-1` and `recheck-2` are resolved.
  - **The owner accepts item 3** as committed at `17065ddf0`, with its growth: +19 or +20 minified bytes in five entries, and +84 in `icon-button`, `switch-button` and `switch-icon-button`. In the owner's words, translated: _"Since it's dead code, a plain tree-shake removes it. Maybe that's how it should be done, but let the architect decide. For now I'm for the dead-code option — we'll clean it up later."_ The cleanup is `RF-63`.
  - **One comment is still owed before the pull request opens,** the recheck's `recheck-3`, Tier C. The JSDoc of `TRAIT_SOURCE_LANGUAGE` still says that JavaScript is copied into TypeScript. The handoff's item 3b corrects it. It changes no output and doesn't bear on the required property.
  - **Item 3b is in** at `c3af883d7`. It changes only those two lines of `diagnostics.ts`. The architect read the diff: the reason is now _"a method trait's origin module has a different file extension from the consumer's"_, which agrees with `canCopySource`'s JSDoc and the document's reason table. The unit is complete. Its pull request waits for #38's merge and the merge of `main` into this branch.

- **Dated 2026-11-19 by the architect: the language rule's route back is taken,** under `RD-26` property 5. This entry stays closed. Only the rule it recorded changes.
  - **The new rule:** `canCopySource` becomes the parse-equivalence check, in the plugin's `composition/copy.ts`.
    - The same extension copies.
    - Any other pair copies when the member's text parses without error in both languages, and the two trees are equal apart from positions.
  - **What the check refuses** ([P36](trait-decorators-1/trait-decorators-plan.md#evidence) §3, [transcript](trait-decorators-1/checks/portability.txt)):
    - over real built JavaScript it refused none of 1,294 members: core's 44 and Vite's `dist` 1,250;
    - it refuses `a < b > (c)` from `.js` into `.ts`, and `<string>x` from `.ts` into `.tsx` or `.mts`.
  - **A refused copy is a build error** (`trait-source-language`), not a retention. Layer (a) has no runtime composition to fall back on.
  - **The hazard that keeps the check:** Vite's TypeScript transform re-reads inserted code by the module's id, and it ignores `moduleType` ([P39](trait-decorators-1/trait-decorators-plan.md#evidence) §5, [transcript](trait-decorators-1/checks/static-merge.txt)).
    - A built-JavaScript `a < b > (c)` inserted into a `.ts` module came out as `a(c)`. That happened both when it was inserted before `vite:oxc`, and when the plugin stripped types itself and returned `moduleType: 'js'`.
    - So stripping types in the plugin isn't a route in Vite, though rolldown alone honours `moduleType: 'js'` (P36 §4).

#### RF-45 — material-x has no size measurement, so no budget covers its entries

Tier C, **open**. Registered on 2026-11-17 by the architect, from the [findings report](findings-1/findings-1-report.md) §9 (item 8, step 1), relayed by the coordinator. **No row is disabled.**

- **The gap:** the `measurements` job (`.github/workflows/verify.yml:149`) runs the rows tagged `measurement`, and material-x has none. Its report on #29 lists box-quad, core and drag only. So no material-x entry has a size reading in CI, or a budget.
- **What it cost:** item 8, step 1's _"a budget that fails is a stop"_ had nothing to read. The architect wrote that clause on the assumption that a budget existed. The implementer measured each entry locally instead: +63 minified bytes, and +2 to +23 brotli bytes, per entry ([reading](findings-1/checks/item8-step1-size.txt)). That reading stands in for the clause, and it is accepted. The growth is the cost of the form the owner chose.
- **Why it matters:** CONTRIBUTING §15 asks that every meaningful change be measured by composition, and §18 treats a budget as the instrument that makes a change visible. material-x's changes are measured only when a unit does it by hand.
- **Required property:** one of these holds:
  - material-x's public entries have rows in the `measurements` job, each with a budget;
  - or the record states that material-x is measured by hand for each change, and how.
- **Routed** to the owner. The repository's measurement tool is still a [brief](../.agents/docs/measure/brief.md), so it may supply the instrument. **It doesn't block** the findings unit.
- **Dated 2026-11-18 by the architect: `RD-24` is its repair,** on the owner's answers, relayed by the coordinator. The [size plan](mx-size-1/mx-size-plan.md) on `repo/mx-size-1` adds the rows without ceilings. The ceilings are owed before material-x's first publication, and the pull request that sets them closes this entry. Until then, the entry stays open, and the rows' pull request says `Refs` for its issue.

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
- **The repair, decided 2026-11-17 by the owner,** relayed by the coordinator: adopt `vite@8.4.0-beta.1`. It declares `rolldown` `~1.3.2`, so the whole tree stays on one `rolldown`, 1.3.2, inside every consumer's range. A separate install of the beta writes correct preload calls, and the repository's lockfile resolves with it ([reading](docs-gate-1/checks/rf46-rolldown-probe.txt) D and E). The [docs-gate handoff](docs-gate-1/docs-gate-handoff.md) item 1 says what the implementer checks, and when to stop. **The fallback,** if the beta stops, is the owner's: Vite 8.3.8 with a nested override that pins its own `rolldown` to `~1.2.18`. When the stable `vite@8.4.0` ships, the pin moves to it as an ordinary update.

#### RF-47 — The committed lockfile installs nested versions that the workspace manifests no longer name

Tier B, **open**. Registered on 2026-11-17 by the architect on `repo/ci-speed-1` at `4136c0eea`, from the CI-speed report's item 4.

- **What:** `package-lock.json` keeps three nested entries that are out of date with the manifests:
  - lightningcss 1.32.0, with its 12 platform packages, under `packages/vite-custom-element-assets`, whose `package.json` names `1.33.0`;
  - `@types/node` 26.1.1 and `undici-types` 8.3.0, under `packages/size-limit-preset-rolldown`, which names `26.6.6`;
  - `ansi-regex` 6.6.0.
- **Effect:** `npm ci`, `aube ci` and `aube install` all install them as locked. So `vite-custom-element-assets` builds and tests against lightningcss 1.32.0, while its manifest says 1.33.0. Neither installer's frozen mode reported the drift.
- **Seen:** an `aube add` of an unrelated package dropped all three (the report's release-age witness). The cause before the move to aube is not established. It predates the CI-speed unit.
- **Required property:** every installed workspace dependency is the version its manifest names, and a frozen install of the committed lockfile installs exactly that.
- **Repair** (amended 2026-11-17 by the architect, after the stop at `633ef72d8`): `aube install --fix-lockfile`, in its own commit, **with its whole diff.** That diff is aube's first full write of the lockfile, not a change confined to the three entries. Both target versions are older than `RD-16`'s 7 days: lightningcss 1.33.0 is from 2026-07-20, and `@types/node` 26.6.6 from 2026-10-28.
  - **What it changes, read by resolution** ([reading](ci-speed-1/checks/rf47-resolution.txt), [instrument](ci-speed-1/checks/rf47-resolution.mjs)). No `name@version` is new to the lockfile. Fifteen leave it: the stale lightningcss 1.32.0 with its 12 platform packages, `@types/node` 26.1.1, `undici-types` 8.3.0 and `ansi-regex` 6.6.0. Every added entry re-places a version that the lockfile already holds. Nine resolutions of existing entries change, each within its range:
    - the two targets: lightningcss 1.33.0 for `vite-custom-element-assets`, and `@types/node` 26.6.6 for `size-limit-preset-rolldown`;
    - `ansi-regex` 6.6.0 → 6.2.2, for the `strip-ansi` copies under `@puppeteer/browsers` and `@wdio/logger`;
    - `@typescript-eslint/utils` 8.72.1 → 8.72.2, for both `eslint-plugin-import-x` copies. 8.72.2 is the root's `typescript-eslint` and `@typescript-eslint/types` version;
    - `eslint-plugin-import-x` 4.18.1 → 4.17.1, for `eslint-import-resolver-typescript`. 4.17.1 is `eslint-config-vaadin`'s exact pin;
    - `@emnapi/core` and `runtime` 1.11.1 → 1.11.0, under `@napi-rs/wasm-runtime`, which installs only on `wasm32`.
  - **Out-of-range resolutions** go from four to two. The two that remain are the eslint 10 peers of `eslint-plugin-jsx-a11y` and `eslint-plugin-react`, which the catalog's eslint pin overrides on purpose.
  - **Why the whole diff.** aube writes this layout at its first write, whatever triggers it: the `aube add` under _Seen_ dropped the same entries. A repair confined to three entries would be a hand-edited lockfile, which the next `aube add` rewrites anyway, inside an unrelated change. `RD-16` property 11 already says that a lockfile diff that aube writes once and then keeps stable is not a capital problem. The owner, told the size, said: _"а, ну ладно, это не страшно. npm тоже любит пол-локфайла переписать"_ ("oh well, that's not scary; npm likes to rewrite half the lockfile too").
  - **Its witnesses** are in the CI-speed handoff, _Disposition of the stop at `633ef72d8`_.

  (This bullet said: _"`aube install --fix-lockfile`, which re-resolves only the drifted entries, in its own commit. The diff is limited to those entries, and the report lists it."_ It assumed that `--fix-lockfile` touches only drifted entries. On 2.10.0 it rewrites the layout.)

- **Routed** to the implementer, in the CI-speed unit.

#### RF-48 — After one `aube add`, the main checkout's `node_modules/@ydinjs` links were gone, and `aube install` reported nothing to do

Tier C, **decided, implemented, open** (decided 2026-11-17 at `51a992b49`; see _Decision_ below). The rule is in `implementer.md` at `45194fb88`, and the [feature proof](reviews/harness-1/feature-proof-claude.md) at `fbae00994` holds. The finding stays open until required property 3 closes it. Registered on 2026-11-17 by the architect on `repo/ci-speed-1` at `c57722b67`, from the CI-speed report's _Remediation of the stop at `633ef72d8`_ and the feature proof's _The open items_.

- **What was seen:** after remediation step B's `aube add -D -W @oxlint/migrate@1.93.0`, `node_modules/@ydinjs/` was missing from the main checkout. The root typecheck failed (nx: _"Cannot find package '@ydinjs/vite-traits-plugin'"_), and `aube install` answered _"Already up to date"_. `aube install --frozen-lockfile --force` restored the links.
- **What holds:** the committed state. A fresh worktree of `633ef72d8`, `57c8849a2` or `9dab0c066` links all seven workspace packages on `aube install`. The lockfile keeps a `link` entry for each of them, and CI installs with `aube ci`.
- **The cause is not established.** It was seen once, in a checkout whose `node_modules` other sessions were using at the same time. So the cause may be aube's incremental `add` with the hoisted linker, or a concurrent operation from another session. It is not reproduced in isolation.
- **Why it matters:** `implementer.md` teaches `aube add -D -W <name>`. If the cause is aube's, every dependency change can leave a tree that fails to typecheck, and aube's state check doesn't notice.
- **Required property:** after `aube add` or `aube remove`, `node_modules` links every workspace package, or the install command fails.
- **Next:** a reading. In a scratch worktree that no other session uses, run `aube install`, then one `aube add -D -W` of a mature package with no install script, and list `node_modules/@ydinjs`. If the links are gone, it is aube's defect: the owner may report it upstream, and `implementer.md` gains the repair command beside the add rule. If they are not, this finding closes as not reproduced. **Not part of the CI-speed unit.** Its handoff doesn't depend on it.
- **Scheduled 2026-11-17** by the architect at `d6838d0f1`, in the [harness handoff](harness-1/harness-handoff.md)'s item 2, witness 2. That witness already installs dependencies in slot `b`, a worktree under `.claude/worktrees/` that no other session uses, so the reading adds one `aube add`, two listings and a revert there. It is not a stop for that unit. The architect closes or keeps this finding from what the harness report records. (_Corrected 2026-11-17:_ `RD-17`'s amendment at `4c489e745` moved the slots, so slot `b` is `/workspaces/worktrees/b`, not a worktree under `.claude/worktrees/`. No other session used it for the reading.)

**Decision.** Recorded 2026-11-17 by the architect on `repo/harness-1` at `51a992b49`, from the [harness report](harness-1/harness-report.md#the-rf-48-reading) and its [reading](harness-1/checks/rf48-reading.txt), relayed by the coordinator. **The defect is aube's, and the repository works around it with one rule in `implementer.md`.**

- **Read in slot `b`,** with no other command using it, on aube 2.10.0 with the hoisted linker:
  - before the add, `node_modules/@ydinjs` held all seven workspace packages;
  - `aube add -D -W left-pad@1.3.0` exited 0, and `node_modules/@ydinjs` then didn't exist;
  - `aube install` then answered _"Already up to date"_ and restored nothing;
  - the same happened a second time;
  - reverting `package.json` and `package-lock.json` and running `aube install` restored all seven links both times, and `aube store status` passed afterwards.
- **So the cause is aube's `add` and `remove`,** not a concurrent operation. The finding's first sighting is the same defect. (_Amended 2026-11-17,_ on the feature proof: this said _"aube's `add`"_. The harness report's [repair reading](harness-1/checks/rf48-repair.txt), step 4, shows `aube remove left-pad` at the root dropping `node_modules/@ydinjs` and `size-limit-preset-rolldown`, and `aube install --frozen-lockfile --force` restoring both. Required property 1's command is witnessed for both by that reading.)
- **Inferred from the output, not read on disk:** `add`'s listing of the root importer leaves out every workspace package and two packages that the root manifest doesn't name (`prettier` and `@testing-library/dom`), and `install`'s listing has them. So `add` relinks the root from its manifest alone, without the workspace links. `install` compares the manifest and the lockfile, which `add` has already made consistent, so it finds nothing to do.
- **The committed state stays sound.** The lockfile keeps its `link` entries, and CI installs with `aube ci`. The defect reaches only a local tree, and it fails loudly: the next typecheck can't find a `@ydinjs` package.

**Required properties.**

1. **The repair is a reinstall from the lockfile that `add` just wrote:** `aube install --frozen-lockfile --force`. It restored the links at the first sighting, in the shared main checkout, where the manifest change was kept. The isolated reading didn't run it, because the revert was enough. So the harness handoff's [item 5](harness-1/harness-handoff.md#item-5-the-repair-after-aube-add-rf-48) witnesses it in a slot, for `aube add` and `aube remove`, before the rule is written.
2. **`implementer.md` gains the rule beside the `aube add -D -W` rule:** after `aube add` or `aube remove`, run `aube install --frozen-lockfile --force`, and confirm that `node_modules/@ydinjs` holds the workspace packages. It cites `repo:RF-48`. That meets the required property above by procedure, because aube can't meet it.
3. **The rule is removed when aube's defect is gone.** When the pinned aube version (`packageManager` and the workflows' `AUBE_VERSION`) changes, the unit that changes it repeats the isolated reading in an unused slot. If the links survive an `aube add`, that unit removes the rule and closes this finding. aube 2.10.1 is available. Nobody has read whether it fixes the defect.
4. **An upstream report is the owner's choice.** The reading is a complete reproduction: a hoisted workspace, one `aube add -D -W` of a package with no install script, and a listing before and after.

**Not adopted.**

- **A `just` recipe that wraps `aube add`** with the reinstall. The rule is one line for the one role that adds dependencies, and the failure it prevents is loud. A wrapper is code to maintain for a defect in a pinned tool version.
- **Editing `package.json` by hand and running `aube install`,** instead of `aube add`. It loses `add`'s resolution of the latest compatible version, and nobody has read whether `install` after a manifest change has the same defect.
- **Closing the finding with the documentation only.** Without the rule, a developer who follows `implementer.md` can still be left with a tree that fails to typecheck.

**Widened 2026-11-18 by the architect** on `repo/aube-isolated-1`, on the isolated-layout unit's [feature proof](reviews/aube-isolated-1/feature-proof-claude.md) at `f480544a6`, `reviewer-1` and `reviewer-2`, relayed by the coordinator.

- **What was read.**
  - In slot `b`, twice: `aube install --fix-lockfile` recorded a peer edit and dropped `node_modules/@ydinjs` and `node_modules/size-limit-preset-rolldown`. `aube install --frozen-lockfile --force` restored them ([first](aube-isolated-1/checks/react-peer-install.txt), [second](aube-isolated-1/checks/types-react-peer-install.txt)).
  - In the reviewer's scratch hoisted workspace ([probe](reviews/aube-isolated-1/checks/manifest-edit-probe.txt)):
    - a plain `aube install` after a hand edit of `dependencies` writes the lockfile and drops the workspace links. That is read only there, not in the repository;
    - after an edit to the peer fields only, a plain `aube install` answers _"Already up to date"_, and `aube install --frozen-lockfile` and `aube ci` exit 0 against a lockfile that lacks the edit. Only `--fix-lockfile` writes it. In slot `b`, a plain `aube install` also left the lockfile unchanged after the peer edit, twice.
- **The decision is widened** (`reviewer-1`): the defect follows every aube command that writes `package-lock.json`, not only `add` and `remove`. The _Decision_ bullet _"So the cause is aube's `add` and `remove`"_ stands as a reading of those two. The rest of the record now reads as follows.
  - **The required property** reads: after any aube command that writes `package-lock.json`, `node_modules` links every workspace package, or the command fails.
  - **Required property 2's rule** in `implementer.md` names every such command: `add`, `remove`, `install --fix-lockfile`, and an `install` after a hand edit of a manifest. Each is followed by `aube install --frozen-lockfile --force`.
  - **The _Not adopted_ bullet on hand edits** stays not adopted for adding a dependency, because it loses `add`'s resolution. Its clause _"nobody has read whether `install` after a manifest change has the same defect"_ is answered: it has, in the scratch workspace.
- **A peer change** (`reviewer-2`) is recorded like this.
  - **The command:** the peer fields are edited by hand, because `peerDependenciesMeta` has no aube command. `aube install --fix-lockfile` records the edit in the same commit, and the reinstall follows. `implementer.md` states both.
  - **`aube add --save-peer` is not adopted.** Nobody has read what it writes, and an optional peer needs `peerDependenciesMeta` anyway.
  - **The drift that no gate detects is accepted.** A frozen install passes against a lockfile that lacks a workspace manifest's peer fields. No install here reads those fields: the workspace installs each peer through a devDependency (`CONTRIBUTING.md` Part I, _Dependencies of a published package_). So the drift misleads nobody. The next lockfile write records it, as an unrelated diff in someone else's change. The review of a peer change reads the lockfile diff.
  - **Not adopted: a gate check** that compares each manifest's peer fields with the lockfile. It would be a custom check for fields that no installer here reads, which is the kind of machinery that `RF-51`'s answer declined.
- **Status unchanged:** decided, implemented as widened, and open until required property 3 closes it.

**Queued 2026-11-18 by the owner,** relayed by the coordinator, and recorded by the main slot's architect. Two follow-ups, neither urgent. They come after the material-x work and don't displace it.

1. **The reading of aube 2.10.1,** required property 3's reading, in an unused slot.
   - **Not before 2026-11-23.** 2.10.1 was published on 2026-11-16, and `RD-16`'s 7-day release age covers the aube version too.
   - **It reads every command that the widened property names:** `add`, `remove`, `install --fix-lockfile`, and `install` after a hand edit of a manifest. Each is followed by a listing of `node_modules/@ydinjs` and `node_modules/size-limit-preset-rolldown`.
   - **Its result applies property 3 as written.** If the links survive every command, the unit that moves the pin to 2.10.1 removes the rule and closes this finding. Otherwise the rule stays, whatever the pin.
2. **An upstream bug report to aube.** The owner files it himself, which answers required property 4. It is built from a minimal reproduction of the repository's readings: a scratch hoisted workspace outside this repository, with a workspace package that the root depends on, one command that writes the lockfile, and listings of `node_modules` before and after, with aube's version. The reviewer's [scratch workspace](reviews/aube-isolated-1/checks/manifest-edit-probe.txt) is already close to that form. **It follows the 2.10.1 reading** and runs on the newest aube that reading covers, so the report doesn't describe a defect that is already fixed. The reproduction is saved under this record. No agent files anything upstream.

#### RF-49 — `just oxlint-migrate` writes a configuration that differs from the hand-maintained `.oxlintrc.json`

Tier C, **closed 2026-11-20** on `repo/oxlint-migrate-1` (see _Closure_ below). Before closure: decided at `d6838d0f1`, unimplemented. Registered on 2026-11-17 by the architect on `repo/ci-speed-1` at `c57722b67`, from the CI-speed report's step B and its [comparison](ci-speed-1/checks/oxlintrc-migrate-compare.txt).

- **What:** the recipe runs `@oxlint/migrate` 1.93.0 on `eslint.config.ts` and writes `.oxlintrc.json`. Its output differs from the committed file in these ways:
  - it drops every comment;
  - it narrows `ignorePatterns` from 76 entries to the 15 of `eslint.config.ts`;
  - it drops one top-level rule and adds three;
  - it loses the override for the harness guard plugin's tests;
  - it changes rules inside the other overrides.

  The committed file is therefore maintained by hand beyond the tool's output. The step left it unchanged.

- **Why it matters:** a developer who runs the recipe to pick up an eslint change silently discards those hand edits, unless they read the whole diff.
- **Required property:** the record says which file is the source of the oxlint rules. Either the recipe's output is the file, so the hand edits move into `eslint.config.ts` or into the script's post-processing, or the file is hand-maintained, so the recipe is a diff aid that doesn't write it, or it is deleted.
- **Not part of the CI-speed unit,** which only moved the recipe from `npx` to `aube exec`. The choice is the owner's, since the oxlint configuration is outside that unit's decisions. Until it is made, the recipe stays as it is.

**Decision.** Recorded 2026-11-17 by the architect on `repo/harness-1` at `d6838d0f1`, on the owner's choice relayed by the coordinator the same day: **each side is split into a file that a tool writes and a file that a person writes.** That answers the required property above: the recipe's output is one file, and `.oxlintrc.json` is maintained by hand on top of it.

- **Why the recipe can't write `.oxlintrc.json` today.** It reads `eslint.config.ts`. That file includes the configs that `buildFromOxlintConfigFile('./.oxlintrc.json')` derives, and a block that turns off ESLint rules oxlint already runs. So the recipe reads rules that the previous `.oxlintrc.json` turned off, and its output depends on its own last output.
- **Read at `d6838d0f1`** by the architect, in `node_modules`:
  - `@oxlint/migrate` 1.93.0's CLI takes the ESLint config as a positional argument (`.argument("[eslint-config]", …)`) and the output path as `--output-file <file>`, default `.oxlintrc.json` (`dist/bin/oxlint-migrate.mjs`).
  - oxlint 1.93.0's schema defines `extends` as a list of paths relative to the file that holds it, merged first to last.
  - `eslint-plugin-oxlint`'s `buildFromOxlintConfigFile` follows `extends`, recursively.
  - Each package's `.oxlintrc.json` already `extends` `../../.oxlintrc.json`, and each package's `eslint.config.ts` re-exports the root's.

**Required properties.**

1. **The ESLint side.** `eslint.base.config.ts` holds the repository's own ESLint configuration: today's `eslint.config.ts` above the `buildFromOxlintConfigFile` spread. `eslint.config.ts` is the base, then the spread, then the block that turns off what oxlint covers, then the `unbound-method` block. The `unbound-method` block stays last, because its comment's reason still holds. What a package's `eslint.config.ts` imports doesn't change.
2. **The oxlint side.**
   - `just oxlint-migrate` passes `eslint.base.config.ts` to `@oxlint/migrate` and writes `.oxlintrc.migrated.json`. The script's post-processing reads and writes that file. Nothing in the recipe writes `.oxlintrc.json`.
   - `.oxlintrc.migrated.json` is exactly what the recipe writes at that commit, formatted as `just fmt` leaves it. Nobody edits it by hand.
   - `.oxlintrc.json` is hand-written JSONC. It `extends` `.oxlintrc.migrated.json`, and carries `options`, `ignorePatterns`, the custom overrides, and their comments. A key that oxlint or `buildFromOxlintConfigFile` doesn't take from an extended file stays in `.oxlintrc.json`.
   - A change to a rule goes in `eslint.base.config.ts`, then through the recipe, or in `.oxlintrc.json` as an override with its reason. It never goes in `.oxlintrc.migrated.json`.
3. **Two commits, in RF-49's own unit.**
   1. **The split, with no rule change.** `.oxlintrc.migrated.json` holds today's rules, moved. Witness: `oxlint --print-config` and ESLint's `--print-config` give the same output before and after, for a TypeScript file at the root and in each package, run from the root and from the package's directory. oxlint's and ESLint's lint results over the tree are also the same.
   2. **One regeneration.** `just oxlint-migrate` writes `.oxlintrc.migrated.json`. The lint fallout is repaired in the same unit, in source, in `eslint.base.config.ts`, or as an override in `.oxlintrc.json`. The unit's record lists each rule the regeneration changed and what was done about it.
4. **Placement.** After the harness unit and the isolated aube layout, beside `RF-43` to `RF-45`. Not part of the harness unit.

**Not adopted.**

- **Filtering by config name.** `buildFromOxlintConfigFile`'s configs are named `oxlint/from-oxlint-config`, `oxlint/from-oxlint-config-override-<n>` and `oxlint/oxlint-config-ignore-patterns`, so a wrapper could give the recipe `eslint.config.ts` without them. That isn't better than the split: it depends on a naming convention that the plugin doesn't document as a contract, it also needs a name on the hand-written block, and it adds code that the positional argument makes unnecessary. The split is the owner's choice.
- **One hand-maintained `.oxlintrc.json`,** with the recipe as a diff aid or deleted. A rule change in ESLint would then reach oxlint only through a hand copy.

**Closure.** Implemented on 2026-11-20 by the implementer on `repo/oxlint-migrate-1`, from `d69e3ddbc` (`origin/main`), in the two commits of property 3. Requested as issue #47. The evidence is in [`oxlint-migrate-1/checks/`](oxlint-migrate-1/checks/). Its probes are `capture.sh`, which captures both linters' `--print-config` for a TypeScript file at the root and in each package, from the root and from the package's directory, and both linters' results over the tree, and the comparison scripts beside it.

- **Commit 1, the split, `b02f4f635`.**
  - `eslint.base.config.ts` is the part of `eslint.config.ts` above the spread. `eslint.config.ts` is the base, the spread, the block of disables, then the `unbound-method` block. The root `tsconfig.json` includes the new file.
  - `.oxlintrc.migrated.json` holds the rules and the five generated overrides of the previous `.oxlintrc.json`, moved. `.oxlintrc.json` extends it and carries `options`, `ignorePatterns`, `plugins`, `categories` and the custom override with its comments.
  - **Read in oxlint 1.93.0: `plugins` and `categories` stay in `.oxlintrc.json`.** oxlint doesn't take `categories`, `options` or `ignorePatterns` from an extended file. A file without `plugins` contributes oxlint's default set, so without `plugins` in `.oxlintrc.json` the `oxc` plugin was added.
  - **Witness ([`witness-split.txt`](oxlint-migrate-1/checks/witness-split.txt)).** ESLint's `--print-config` is byte-identical in all 17 captures. Both linters' results are identical in every package and at the root, and ESLint lints one more file, `eslint.base.config.ts`, with no message. oxlint's `--print-config` is identical in the 8 package captures. In the 9 root captures it differs in two ways: the `extends` key, and five top-level rules printed without their options. That is how oxlint prints an extended file's rules: each package's config already printed them that way at `d69e3ddbc`. A [probe](oxlint-migrate-1/checks/options-probe.txt) shows that `return-await`'s `always` still applies through `extends`.
- **Commit 2, one regeneration.**
  - **The recipe.** `.scripts/oxlint-migrate.ts` runs `@oxlint/migrate` from the root, with `eslint.base.config.ts` and `--output-file .oxlintrc.migrated.json` as relative paths, because the tool joins both to the working directory. It removes the `.bak` copy that the tool leaves of the file it replaces. The `just oxlint-migrate` recipe then formats the output with `oxfmt`.
  - **Proof.** On the commit's tree, two runs of the recipe leave `.oxlintrc.json` and `.oxlintrc.migrated.json` byte-identical ([`new-recipe.txt`](oxlint-migrate-1/checks/new-recipe.txt)). The previous recipe, run on `d69e3ddbc`, rewrote `.oxlintrc.json` with 164 insertions and 126 deletions ([`old-recipe.txt`](oxlint-migrate-1/checks/old-recipe.txt)). So `aube exec just oxlint-migrate && git diff --exit-code .oxlintrc.json .oxlintrc.migrated.json` passes on the new recipe and fails on the old one. It is a check to run by hand. No CI job runs it.
  - **Witness ([`witness-regeneration.txt`](oxlint-migrate-1/checks/witness-regeneration.txt)).** Both linters' results are identical to `d69e3ddbc`'s in every package and at the root. The rule state changes as listed below.
- **Each rule the regeneration changed, and what was done.** "On" and "off" are the effective state for a `.ts` and a `.test.ts` file, from the root and from a package's directory.
  - **Turned on in oxlint, with no finding in the tree:** `func-name-matching`, `import/newline-after-import`, `logical-assignment-operators`, `no-implicit-globals`, `no-unreachable-loop`, `no-useless-assignment`, `one-var`, `prefer-arrow-callback`, `prefer-regex-literals`, `require-unicode-regexp`, `typescript/consistent-return`, `typescript/explicit-member-accessibility`, `typescript/no-unsafe-enum-assignment`, `typescript/strict-void-return`. Kept. ESLint ran each of them before, at least from a package's directory. Where `buildFromOxlintConfigFile` maps one, ESLint's form is now off, and the witness lists each ESLint rule whose state changed.
  - **`typescript/no-unsafe-type-assertion` (194 findings) and `typescript/promise-function-async` (103):** turned off in `.oxlintrc.json`'s `rules`, with the reason. Neither linter ran them before: `eslint.config.ts` turns them off as rules that oxlint runs, and the previous `.oxlintrc.json` didn't have them. The findings are in most packages, including `vite-traits-plugin` and core's traits, which are outside this unit. Turning either on is a source change of its own.
  - **`typescript/unbound-method` (54 findings, all in `drag`):** turned off in `.oxlintrc.json`, with the reason. ESLint's form, last in `eslint.config.ts`, stays the instrument and reports none. Oxlint's port also reports a method passed with its receiver, as in `drag.use(this.#release, this)`.
  - **`typescript/no-generated-empty-object-type` (2 findings):** set to `allow` in the custom override, beside `typescript/no-empty-object-type`. That is the intent the comment in `eslint.config.ts` states. That comment said oxlint doesn't implement the rule. oxlint 1.93.0 implements it, so the comment now says why the `allow` doesn't reach ESLint.
  - **`no-use-before-define` and `import/no-duplicates`:** the regenerated override from `eslint.base.config.ts`'s TypeScript block turns them off, and `eslint.base.config.ts` turns ESLint's forms off. Without a repair, neither linter would run them. They are kept on in the custom override with their previous options, because the tree meets both. **Whether they should stay on is the owner's question:** the ESLint block that turns them off gives no reason.
  - **`typescript/dot-notation`:** dropped by the tool. ESLint's `@typescript-eslint/dot-notation` now runs from the root as well. From a package's directory, ESLint already ran it. No action.
  - **Other changes in the file:** `.test.*` override now also covers `.spec.*`, the first override also matches JavaScript files, and the `import` plugin is named per override. `ignorePatterns`, `options` and `categories` now appear in `.oxlintrc.migrated.json`, and oxlint doesn't read them from an extended file. Each has no effect on the results above.
- **Not changed, and outside this entry.** A package's `.oxlintrc.json` doesn't set `plugins` or `categories`. So from a package's directory, oxlint runs with its default plugins, `oxc` included, and the `correctness` category on, where the root config turns `correctness` off. That held at `d69e3ddbc` and is unchanged here. It is a reading, not a finding registered by this unit.
- **How a rule changes now:** in `eslint.base.config.ts` and then `just oxlint-migrate`, or as an override with its reason in `.oxlintrc.json`. `.oxlintrc.migrated.json` is never edited by hand.

**Corrected and amended 2026-11-20** by the implementer on `repo/oxlint-migrate-1`, after `e2a33205d`. This follows the feature proof ([`reviews/oxlint-migrate-1/feature-proof-claude.md`](reviews/oxlint-migrate-1/feature-proof-claude.md)) and the owner's ruling, relayed by the coordinator. The bullets above stay as they were written.

- **`typescript/unbound-method`: the reason was wrong** (`reviewer-1`). The closure said that ESLint's form _"stays the instrument and reports none"_, and that oxlint's port _"also reports a method passed with its receiver"_. `.oxlintrc.json` said the same. The reviewer measured otherwise:
  - with the root configuration, ESLint reports 30 lines in `drag`, including methods passed with their receiver, such as `src/sortable.ts:59`. That is why `drag:DRD-37` turns ESLint's form off in `drag`;
  - oxlint's port reports those 30 lines and 18 more, and every extra line is a private `#method` read without a receiver, which ESLint doesn't report;
  - outside `drag`, the port reports nothing in the tree.

  The rule's state, off, is unchanged, and it matches `d69e3ddbc`: in `drag`, neither linter ran it. `.oxlintrc.json`'s reason now states the measured difference.

- **An option change that the list above leaves out** (`reviewer-2`). `no-shadow-restricted-names` gained `reportGlobalThis: true`, so it now also reports a binding that shadows `globalThis`. ESLint's form already had the option, and it is off. There is no finding in the tree. Kept.
- **The owner's ruling on the two rules kept on above:** _"`import/no-duplicates` оставляем (включаем), а `no-use-before-define` предлагаю выключить."_ ("We keep `import/no-duplicates` (turn it on), and I suggest turning `no-use-before-define` off.")
  - `import/no-duplicates` stays on in `.oxlintrc.json`'s custom override, with `prefer-inline`.
  - `no-use-before-define` is `off` there, with the quotation as its reason. That turns it off for TypeScript files (`.ts` and `.test.ts` resolve from on to off), and no other rule's effective state changes. JavaScript files keep the state that `eslint.base.config.ts`'s JavaScript block gives them. That is unchanged, and the owner's question was about the TypeScript override.
- **`retargetJsOnlyOverrides` is removed from `.scripts/oxlint-migrate.ts`** (`reviewer-3`). It retargeted 0 overrides with both the old recipe and the new one, because the tool now writes the first override with a JavaScript and a TypeScript glob. The recipe's script now only runs the tool and removes its `.bak` copy. Property 2's post-processing is the `oxfmt` step of the `just oxlint-migrate` recipe. Two runs of the recipe still leave `.oxlintrc.json` and `.oxlintrc.migrated.json` byte-identical, and no `.bak` file remains.
- **Lint results after these changes:** `just lint` exits 0. oxlint reports 0 diagnostics at the root and in each of the 8 packages. Turning `no-use-before-define` off can only remove findings, and there were none.

#### RF-50 — `mx-checkbox`, `mx-radio` and the text fields change their own state on user interaction, against the controlled principle

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, on the owner's principle that every material-x component is controlled ([`architecture.md`](../.agents/docs/architecture.md) §Components), relayed by the coordinator with the answers to `RF-43`. **No row is disabled.**

- **What was read** at `e9236603e`:
  - **`mx-checkbox` and `mx-radio`.** Activation runs the native input's activation behaviour: a checkbox inverts `checked` and clears `indeterminate`, and a radio sets `checked`. The host's `checked` and `indeterminate`, `:state(checked)` and the form value don't change, because `CheckableCore.ts`'s `change` handler only notifies. So until the consumer answers, the input's state, which assistive technology reads, disagrees with the host's. The row _"should reflect the checked control back on interaction"_ (`tests/core/elements/CheckableCore.browser.test.ts:227`) asserts the input's toggle.
  - **The switch buttons** have the same split, and their form value also follows the input (`SwitchCore.ts:94`–`:95`). `RF-43`'s R2 and item 1 remove it.
  - **`mx-text-field` and `mx-multiline-text-field`.** Typing changes the native field's text. The `value` getter reads it (`TextFieldCore.ts:224`), and `:state(populated)` and the form value follow it on `input` (`:202`–`:204`). The typed text is state that the component holds.
  - **Components that meet the principle:** the split button's `open`, the groups' `value`, the list items' `selected` and the FAB's `extended` change only when the consumer sets them.
- **Required property:** each component meets the principle, or the record states its exception.
- **Checkbox and radio.**
  - Required: after an activation and the consumer's synchronous `input` and `change` handlers, the native input's `checked` and `indeterminate` equal the host's.
  - The events, their order, interfaces and flags don't change.
  - The row at `:227` is reversed.
  - This is item 7 of the [host-invariant handoff](host-invariant-1/host-invariant-handoff.md).
- **The text fields: a question for the owner.**
  - **Read strictly:** after each `input`, the field reverts to `value` unless the consumer set it, as React does for a controlled `<input>`. The revert rewrites the field while the user types. It has to keep the caret in place, it breaks the native undo history, and it must not run during an IME composition.
  - **The architect recommends an exception:** a text field's text is the user's input. `value` reads it and the consumer may set it, and `:state(populated)` and the form value follow it. That is an uncontrolled field, so it is an exception to the principle, not a reading of it.
- **Routed:** checkbox and radio to the host-invariant unit, item 7. The text fields to the owner, and they block nothing.
- **Answered 2026-11-18 by the owner,** relayed by the coordinator: **the text fields are an exception to the principle,** as the architect recommended. The text is the user's input. `value` reads it, and the consumer may set it. In the owner's words: _"this is already a question of performance. Speed matters more than the principle."_ `architecture.md` §Components states the exception.
  - **No code changes.** `TextFieldCore.ts` already behaves this way: the `value` getter reads the native field, and the setter writes it, `:state(populated)` and the form value (`:224`–`:231`, read by the architect at `e9236603e`).
  - **What remains of this entry:** checkbox and radio, under item 7. It closes when item 7's rows pass.

- **Feature proof decided 2026-11-18 by the architect** (`RF-43`'s entry of the same day). `reviewer-2`: a checked `mx-checkbox` or `mx-radio` whose `value` is removed submits nothing, because its `value` callback gates on the native input's `checked` and writes the raw value. Item 7 required that the form value follow the host only, so item 7 owes it, and no new entry is needed. The form value is `value ?? 'on'` while the host is checked, as the switch's already is. It is item 10 of the [handoff's disposition](host-invariant-1/host-invariant-handoff.md#disposition-of-the-feature-proof-review-at-5b1544100). This entry closes with `RF-43`.

- **Closed 2026-11-18 by the architect,** with `RF-43`, on the same recheck. Item 7 and item 10 hold: activation leaves the native input as the host's state, and the form value is `value ?? 'on'` while checked, for both elements. The text fields remain the principle's one exception.

#### RF-51 — `material-x/react.d.ts` imports React's types by an absolute path on the build machine

Tier B, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, from the [isolated-layout report](aube-isolated-1/aube-isolated-report.md) at `96b2975d3`, finding 1, on the owner's decision to fix it (`RD-19`). `RF-50` is allocated on `repo/host-invariant-1`. **No row is disabled.**

- **What was read:**
  - the hoisted build writes `import { DetailedHTMLProps, HTMLAttributes } from "/workspaces/worktrees/b/node_modules/react/index.js"` into `packages/material-x/react.d.ts` ([reading](aube-isolated-1/checks/isolated-reading.txt), line 110);
  - the source, `src/react.ts:2`, imports the types from `react`;
  - `packages/material-x/package.json` names neither `react` nor `@types/react`, and it exports the file as the `types` of `./react.js`.
- **The cause, inferred:** tsdown's `neverBundle: [/node_modules/u]` (`material-x/tsdown.config.ts:12`) keeps the import external by its resolved path, because no manifest entry names `react`.
- **Effect:** a consumer's TypeScript can't resolve the import, so the React typings that material-x publishes don't work. Tier B, for the published surface. The package is unreleased, so this blocks its first release, not a user.
- **Required property:**
  - no declaration file that any package publishes imports by an absolute path;
  - `react.d.ts` imports React's types by the bare specifier `react`;
  - `@ydinjs/material-x` declares `react` as an optional peer dependency, with a range that covers React 19, the major the workspace builds and tests against. A consumer that doesn't import `./react.js` needs no React.
- **The witness:** the built `react.d.ts` imports from `"react"`, and a search of every package's built `.d.ts` files finds no import of an absolute path. The search runs before and after the repair.
- **Not decided here:** a standing check for this class. The report names `import-x/no-extraneous-dependencies`, which `eslint.config.ts` turns off with no reason stated. Turning it on is a lint-policy question for the owner, under `RD-10` and `RD-11`.
- **Routed** to the isolated-layout unit's handoff, on `repo/aube-isolated-1`.
- **Answered 2026-11-18 by the owner,** relayed by the coordinator.
  - **`@types/react` is declared beside `react`.** The required property gains: `@types/react` is an optional peer too, with the same range, because `react.d.ts` imports types that only `@types/react` provides. The [isolated-layout handoff](aube-isolated-1/aube-isolated-handoff.md)'s item 1, as amended, carries it.
  - **The owner asked for a written rule** on which field a package goes in, `@types/*` packages included, and on what a published declaration file's imports require. The rule is in [`CONTRIBUTING.md`](../CONTRIBUTING.md) Part I, _Dependencies of a published package_. Applied to today's manifests, it finds this entry's `react` and `@types/react`, and `RF-55`.
  - **The standing check: only if it doesn't mean a custom rule, and the owner noted that TypeScript already reports an error in `react.d.ts`.** The architect read both ([reading](aube-isolated-1/checks/rf51-declarations-typecheck.txt)):
    - **The error** is the one the owner's editor shows: TS7016, _"Could not find a declaration file for module '…/node_modules/react/index.js'. … implicitly has an 'any' type."_ The specifier is a path to React's JavaScript, with no declarations beside it. TypeScript looks for `@types/react` only for the bare specifier `react`. So `DetailedHTMLProps` and `HTMLAttributes` are `any`, and every JSX type in the file is `any` with them.
    - **Why no gate fails on it:** no checked program contains the file. material-x's `typecheck` includes `src/**` and `tests/**`, not the build output. A program that does load it, such as a consumer's or any project extending `tsconfig.base.json`, runs with `skipLibCheck: true` (`tsconfig.base.json:7`), which suppresses every error inside a `.d.ts` file. With `skipLibCheck` off, the file fails with TS7016 (exit 2). With it on, the same file passes (exit 0). The editor reports errors in the file that is open, so it shows the error.
    - **So the check needs no custom rule:** a TypeScript program over every published declaration file, as a consumer reads them, with `skipLibCheck` off and no ambient `types`. It is a configuration and a recipe, and the gate runs it after the build. **Decided** in that form, with this property: the gate fails when a published declaration file doesn't type-check that way.
      - **Form,** recorded 2026-11-18 by the main slot's architect from slot `b`'s [declarations-check handoff](declarations-check-1/declarations-check-handoff.md), proposal 2: the root `tsconfig.declarations.json`, run by the root recipe `just typecheck-declarations`, which first builds every package that writes declarations. Every built declaration file is checked, including those of private packages. The program resolves modules as `nodenext`. At `83a985b99`, `bundler` mode gave the same result, before the repair and after it ([probe](declarations-check-1/checks/rf54-mapped-brand-probe.txt) A, C and D). The gate's `static` job runs it after `just typecheck` (`RD-6` property 3).
    - **What it doesn't catch:** an import that resolves only because the workspace hoists an undeclared package to the root, and an absolute path that happens to reach a declaration file on the build machine. `CONTRIBUTING.md`'s rule names the first. Neither is worth a custom rule.
    - **It can't land green today.** Over the 108 built declaration files, with `react` declared, it finds one error: TS2611 in `material-x/text-field/TextFieldCore.d.ts`, which is `RF-54`. **The check lands together with `RF-54`'s repair,** in one unit after this one. The owner schedules it.

**Closed 2026-11-18 by the architect,** from the implementer's [fixes report](aube-isolated-1/aube-isolated-fixes-report.md) and the [feature proof](reviews/aube-isolated-1/feature-proof-claude.md), which holds. The required property, with the owner's amendment, is on `main` through #34 (head `f45c7f753`, merged as `83a985b99`).

- `@ydinjs/material-x` declares `react` and `@types/react` as optional peers, both `^19` (`ef530af97`, `9fadeb8ec`). The root installs React 19.3.1 and `@types/react` 19.3.0.
- The built `react.d.ts` imports from `"react"`. The absolute-path search over the 108 built declaration files finds nothing after the repair, and finds only this file before it ([before](aube-isolated-1/checks/abs-import-search-before.txt), [after](aube-isolated-1/checks/abs-import-search-amended.txt)).
- `verify` passed in full at `f480544a6` (run 44231766539) and on `main` at `83a985b99` (run 44233935238). The run at `f45c7f753` (44233678056) was reduced by `[noci]`, because that commit changed only records.
- **The standing check is not part of this closure.** Its form is recorded above, and `RD-6` property 3 carries it as unimplemented until the [declarations-check handoff](declarations-check-1/declarations-check-handoff.md)'s pull request merges.

#### RF-52 — `.storybook/manager.tsx` imports `@storybook/icons`, which no manifest declares

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, from the [isolated-layout report](aube-isolated-1/aube-isolated-report.md) at `96b2975d3`, finding 2, on the owner's decision to fix it (`RD-19`). **No row is disabled.**

- **What was read:** `.storybook/manager.tsx:1` imports `MoonIcon` and `SunIcon` from `@storybook/icons`. No `package.json` in the repository names it. It resolves only because the hoisted layout places Storybook's own dependency, 2.0.2 (`storybook`'s range `^2.0.2`), at the root. The isolated layout's `lint` fails on it.
- **Required property:** every import under `.storybook/` resolves to a package that the root manifest declares.
- **The repair:** declare `@storybook/icons` as an exact root devDependency at 2.0.2, the version that Storybook already resolves, so the lockfile adds no version. Install it as `RD-16` says, and reinstall from the lockfile afterwards (`RF-48`).
- **Not adopted: removing the import.** The manager's theme control uses the two icons.
- **Routed** to the isolated-layout unit's handoff, on `repo/aube-isolated-1`.

**Closed 2026-11-18 by the architect,** from the implementer's [fixes report](aube-isolated-1/aube-isolated-fixes-report.md), item 2, and the [feature proof](reviews/aube-isolated-1/feature-proof-claude.md), which holds. On `main` through #34 (merged as `83a985b99`): the root `package.json` declares `"@storybook/icons": "2.0.2"`, exact (`8bf346d94`), and the lockfile's entry keeps the same version, `resolved` and `integrity`. A listing of every import under `.storybook/`, `.storybook/docs/` included, reports `@storybook/icons` alone before the change and nothing after it ([before](aube-isolated-1/checks/storybook-imports-before.txt), [after](aube-isolated-1/checks/storybook-imports-after.txt)). `verify` passed in full at `f480544a6` (run 44231766539) and on `main` (run 44233935238).

#### RF-53 — The root `just clean-build` exits 1, because `size-limit-preset-rolldown` has no `files.json`

Tier C, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, from the [isolated-layout report](aube-isolated-1/aube-isolated-report.md) at `96b2975d3`, finding 3, on the owner's decision to fix it (`RD-19`). **No row is disabled.**

- **What was read** ([reading](aube-isolated-1/checks/clean-build-reading.txt)):
  - the root recipe runs `clean:build` in seven projects, the preset included (`Justfile:17`);
  - the preset's `clean-build` runs `.scripts/package-files.ts clean`, which imports the package's `files.json` (`:55`–`:61`) and exits 1 with `ERR_MODULE_NOT_FOUND`;
  - the other six packages have a `files.json`;
  - the import fails before `git clean` runs, so nothing is deleted.
- **Required property:**
  - the root `just clean-build` exits 0;
  - each package's clean removes its own build outputs and nothing else. For the preset, these are the files its manifest publishes: `index.js`, `index.js.map` and `index.d.ts`;
  - every package cleans through one mechanism.
- **Routed** to the isolated-layout unit's handoff, on `repo/aube-isolated-1`. The handoff chooses the form.

**Closed 2026-11-18 by the architect,** from the implementer's [fixes report](aube-isolated-1/aube-isolated-fixes-report.md), item 3, and the [feature proof](reviews/aube-isolated-1/feature-proof-claude.md), which holds. On `main` through #34 (merged as `83a985b99`): the preset's `files.json` is `{ "runtime": ["index"] }` (`292b1649b`), so it cleans through `.scripts/package-files.ts`, as the other six packages do. After a build, the root `just clean-build` exits 0 with 7 of 7 tasks, and the preset's clean removes exactly `index.js`, `index.js.map` and `index.d.ts` and no tracked file ([reading](aube-isolated-1/checks/preset-clean.txt)). `verify` passed in full at `f480544a6` (run 44231766539) and on `main` (run 44233935238).

#### RF-54 — material-x's published `TextFieldCore.d.ts` doesn't type-check: the `@ts-expect-error` on `value` isn't in the declaration

Tier C, **closed 2026-11-19** (below). Before closure: decided 2026-11-18 (see _Decided_ below), repaired in #37, and open. Registered on 2026-11-18 by the architect, while answering `RF-51`'s question about a standing check ([reading](aube-isolated-1/checks/rf51-declarations-typecheck.txt) B). **No row is disabled.**

- **What was read:**
  - `src/text-field/TextFieldCore.ts:223` suppresses TS2611 on `override get value()` with `@ts-expect-error`, citing microsoft/TypeScript#54879;
  - the built `text-field/TextFieldCore.d.ts:40` declares the same accessor without the directive;
  - a program that type-checks the declarations with `skipLibCheck` off reports _"TS2611: 'value' is defined as a property in class '…', but is overridden here in 'TextFieldCore' as an accessor."_ No other built declaration file in the repository reports an error.
- **Effect:** a consumer of `mx-text-field` or `mx-multiline-text-field` whose `skipLibCheck` is off gets a type error in material-x's typings. With it on, nothing is reported.
- **Required property:** every published declaration file type-checks with `skipLibCheck` off. This one doesn't, so `RF-51`'s standing check can't land until this repair does.
- **The repair** is decided below. (Before the decision, this bullet said: _"**Not decided:** the repair. The base type that declares `value` as a property comes from the `Valuable` trait through `impl`. Whether the declaration can carry an accessor, or the trait's type has to change, needs a reading of #54879's status and of `@ydinjs/core`'s trait types."_)
- **Routed** to the owner, with `RF-51`'s check, as one unit after the isolated-layout unit.

**Decided 2026-11-18** by the main slot's architect, on slot `b`'s [declarations-check handoff](declarations-check-1/declarations-check-handoff.md), proposal 1, and its [probe](declarations-check-1/checks/rf54-mapped-brand-probe.txt) at `83a985b99`, relayed by the coordinator: **a trait's instance fields are typed by a mapped type.** `@ydinjs/core`'s `Branded<P, B>` (`src/traits/primitives.ts`) becomes `{ [K in keyof P]: P[K] } & Readonly<Record<B, true>>`. The `@ts-expect-error` at `TextFieldCore.ts:223` is removed.

- **Why it works.** TypeScript doesn't apply TS2610 and TS2611 to a base property that a mapped type produces (read in TypeScript 6.0.3's checker, `checkKindsOfPropertyMemberOverrides`, and reproduced with 7.0.2). An attribute trait's fields are declared in a type literal today (`Trait<{ value: string | null }, …>`), so the check applies to them.
- **Why it is correct for attribute traits.** The attribute `trait()` (`src/traits/attributes.ts`) installs each field as an accessor on the prototype (`Object.defineProperty`), so a subclass's accessor overrides it at runtime. TS2611 protects against a base field, defined on the instance, that shadows a subclass accessor. An attribute trait never creates that field.
- **The transformer trait is unchanged.** core's other `trait()`, in `src/traits/primitives.ts`, also returns `Branded<P, B>`, with `P` as `Omit<InstanceType<U>, keyof InstanceType<T>>`. `Omit` is already a mapped type, so its fields are already exempt today. A transformer's class field with a subclass accessor over it type-checks with no directive at `2544a24fd` ([probe](declarations-check-1/checks/rf54-transformer-trait-probe.txt)). There the exemption hides a real hazard, because a class field is an own property of the instance and shadows the subclass's accessor. The repair doesn't create that gap and doesn't widen it. It is a limit of TypeScript's checking of mixins, recorded here and not registered. In the repository, the attribute `trait()` builds on the transformer trait and re-types its result, and otherwise only core's own tests build one.
- **What it costs.** It changes no emitted JavaScript. With the mapped type, a property override of the wrong type is still an error, and the brand stays nominal (probe B). The exemption also covers TS2610, a subclass field over a trait field. TS2610 couldn't fire before either, because a trait field was typed as a property.
- **Why at the source.** `@ts-expect-error` doesn't survive declaration emit (microsoft/TypeScript#54879, open). The mapped type makes the source and the declaration agree, so neither needs a directive. It also covers every later accessor override of a trait field.
- **The risk.** The exemption is checker behaviour, not a documented rule. If TypeScript drops it, core's type test and `RF-51`'s check both fail, so the change can't go unnoticed.
- **Not adopted:**
  - **Carrying the directive into the declaration** by post-processing tsdown's output. That is a custom build step for one line, and it hides the error from consumers instead of removing it.
  - **Declaring each trait's fields as accessors** (`{ get value(): …; set value(…) }`). That would be every trait's annotation, `trait()`'s mapped `FieldReadersFromConverters` can't produce accessors, and `Props` reads the same `P`.
  - **Excluding the file from the check.** That fails `RF-51`'s property.

**Routed** to the same handoff, which lands the repair before the check. The architect closes this finding from that unit's report and review.

**Dated 2026-11-19 by the architect: the decided repair is in, and this entry closes with `RD-26`'s migration.**

- **The repair is in.** #37 (`35bfc6209`) made `Branded` a mapped type and removed the directive at `TextFieldCore.ts:223`. It also put `just typecheck-declarations` in the gate (`verify.yml`). The status line above wasn't updated then, and the entry wasn't closed.
- **The mechanism goes.** Under `RD-26`, `Branded` is deleted with `primitives.ts`.
  - Layer (b)'s attributes are `accessor` declarations, lowered to `get`/`set` pairs, and never `declare` properties.
  - So a subclass's accessor override typechecks with no directive and no mapped type. TextFieldCore's `value` is that case.
  - In [P31](trait-decorators-1/trait-decorators-plan.md#evidence), the accessor override passes in both compilers. Case (d) shows that a `declare` member is this finding's TS2611.
- **One `declare` member stays,** under `RD-26` property 4's amendment of 2026-11-19: IconButtonLike's `declare color`, which keeps the baseline's type for `color` in IconButton and SwitchIconButton. There an accessor over `color` fails with TS2611 ([P43](trait-decorators-1/trait-decorators-plan.md#evidence) (f)). No declaration in the repository overrides it, so proofs 3 and 7 don't change. The closure records it.
- **Proof 3's expected differences,** ruled by Architect B on 2026-11-19 at `f8eef5262`, on the reading at `2bf0418ab` ([P44](trait-decorators-1/trait-decorators-plan.md#evidence)), which the closure cites:
  - `static [$bound]` on each trait class's static side: a type-only `unique symbol` that `composition.js` doesn't export, with no runtime value;
  - `focus` on FocusForwarding's eight adopters, typed as `HTMLElement`'s `focus` intersected with FocusForwarding's override of the same signature. **Known limit:** a subclass's override with a wrong signature isn't reported against that intersection (no TS2416). The plan's proof 3 records why each repair costs more.
- **It closes** when the [migration plan](trait-decorators-1/trait-migration-plan.md)'s proofs 3 and 7 hold on `repo/traits-migration-1`: the declaration surface, and `just typecheck-declarations`. The architect writes the closure on that branch before its pull request opens.

**Closed 2026-11-19 by the architect** on `repo/traits-migration-1` at `aa73be64e`, not yet merged, relayed by the coordinator. It rests on the migration's [proofs](trait-migration-1/checks/proofs.md). The required property holds: every published declaration file type-checks with `skipLibCheck` off.

- **Proof 7:** `just typecheck-declarations` passed at `15d50a10e`, after the trimmed-trait fix. It builds every package that writes declarations, then type-checks them as a consumer. The architect read it in the proofs record and didn't run it again.
- **The case this entry read is gone at the source.** `TextFieldCore.ts:220` and `:224` override `value` with `get` and `set` and no directive. Valuable declares `accessor value!: string | null` (`traits/valuable.ts:20`), which layer (b) lowers to a `get`/`set` pair. Neither `Branded` nor `primitives.ts` is left in any package's sources.
- **Proof 3:** the surface differs from commit 1's only by 15 named renames and 19 differences, both of the two kinds the plan expects ([comparison](trait-migration-1/checks/surface-compare.txt)): `static [$bound]` on the 11 trait classes, and `focus` on the 8 `FocusForwarding` adopters. The reading after `15d50a10e` is byte-identical to the one before it.
- **Recorded with it:**
  - IconButtonLike's `declare color`: in IconButton and SwitchIconButton, an accessor over `color` fails with TS2611 ([P43](trait-decorators-1/trait-decorators-plan.md#evidence) (f)). No declaration in the repository overrides it.
  - The `focus` limit: a subclass's `focus` override with a wrong signature isn't reported against the adopters' intersection (no TS2416).
- **What reopens it:** a published declaration file that fails `just typecheck-declarations`, which is in the gate.
- **No GitHub issue** names this entry.

#### RF-55 — The two Vite plugins pin `rolldown` in `dependencies`, while their public types hand rolldown's `Plugin` to the consumer's Vite

Tier C, **closed 2026-11-20** on `repo/rolldown-peer-1` (below). Before closure: open. Registered on 2026-11-18 by the architect, from applying `CONTRIBUTING.md`'s rule on published dependencies to today's manifests ([reading](aube-isolated-1/checks/rf51-declarations-typecheck.txt) C). **No row is disabled.**

- **What was read:**
  - `@ydinjs/vite-custom-element-assets` and `@ydinjs/vite-traits-plugin` both declare `"rolldown": "1.3.2"` in `dependencies` and `"vite": "^8.1.4"` in `peerDependencies`;
  - each `index.d.ts` imports `Plugin` from `rolldown` and from `vite`, and `css/transform.d.ts` imports `SourceMapInput` from `rolldown`;
  - both plugins also use `RolldownMagicString` at runtime.
- **Why it matters:** the plugin's `Plugin` type comes from its own pinned `rolldown`, and the consumer's Vite types plugins with the `rolldown` it brings. When the two copies differ, the types can clash, which is `RF-31`'s cause, and the consumer installs a second `rolldown`. Under the rule's second question, the plugins share the consumer's copy, so `rolldown` is a peer.
- **Required property:** the two plugins meet the rule. Either `rolldown` is a peer whose range covers the `rolldown` of every Vite major in the `vite` peer range, or their public types name only Vite's types.
- **Routed** to the owner of the two Vite plugins. **It doesn't block** anything.
- **Read again on 2026-11-20 by the architect: two copies drop the plugins' output in a build, with no error** ([probe](rolldown-peer-1/checks/consumer-probe.txt)).
  - A stand-in plugin, which returns a `RolldownMagicString` from `transform` as both plugins do, was installed with aube into an empty Vite 8.3.8 project.
  - Declared as today, it gets `rolldown` 1.3.2, and Vite gets its own 1.2.19. `vite build` exits 0 without the plugin's edit. For the traits plugin, the build would ship unflattened compositions.
  - As a peer, the plugin and Vite share one copy, in the hoisted and the isolated layout, and at Vite 8.1.4 and 8.4.0-beta.1. The edit is kept.
  - **A limit the peer doesn't close:** a consumer whose own tree holds two copies. With tsdown 0.23.7 beside Vite 8.3.8, the plugin gets the root's 1.3.3, and the edit is dropped again.
  - Neither plugin is on the registry, so no consumer has been affected.
- **Decided 2026-11-20 by the architect,** on the owner's direction, relayed by the coordinator: _"О, ну тут peer напрашивается )"_ ("A peer is the obvious fit here"). The [plan](rolldown-peer-1/rolldown-peer-plan.md) on `repo/rolldown-peer-1` has the reading, the tasks and the proofs. **Tasks 1, 2, 3 and 4 implemented 2026-11-20** (below).
  1. **`rolldown` is a peer of both plugins,** `"rolldown": "^1.1.4"`, and leaves `dependencies`. It isn't optional, because each main entry imports it at runtime. The private `@ydinjs/vite-custom-element-assets` moves too.
  2. **Its floor is the floor that the `vite` floor declares.** Vite 8.1.4 declares `~1.1.4`. The two floors move in one commit, which `CONTRIBUTING.md`'s _Peers_ rule now states. The caret covers rolldown's major 1, because the plugins use only rolldown's public API, which is the same at 1.1.4 as at 1.3.2.
  3. **The `vite` peer becomes `^8.1.4 || ^8.4.0-beta.1`,** so that the workspace's own Vite is inside the range. It returns to one caret range when the workspace moves to a stable 8.4.
  4. **Public types and runtime imports don't change:** both still name `rolldown`, which is now the consumer's copy.
     - Naming the types through Vite's `Rolldown` namespace wouldn't remove the peer, because Vite doesn't export the `RolldownMagicString` constructor at runtime.
     - The `RolldownPlugin` half of each return type is for a tsdown or rolldown host, which uses the consumer's `rolldown`, not Vite's.
  5. **The workspace and its lockfile don't change.** The root's `catalog:` devDependency (1.3.2) is the workspace's peer. With the edited manifests, a frozen install passes and aube writes no lockfile change, so no version is resolved anew, and `RD-16`'s release-age gate needs no exception.
  - **Open for the owner:** the consumer with two copies of its own. The plan's [question 1](rolldown-peer-1/rolldown-peer-plan.md#questions-for-the-owner) recommends returning a string and a map when the host's copy differs.
  - **Proposed to `RD-27`'s release check:** peer checks for step 7, in the plan's [section](rolldown-peer-1/rolldown-peer-plan.md#what-rd-27s-release-check-needs-to-know-about-peers). They don't block box-quad, which has no peers.
- **The owner's answer to question 1,** relayed by the coordinator on 2026-11-20: _"RF-55: (а), согласен"_ ("RF-55: (a), agreed"). He accepts the design, and a host whose `rolldown` isn't the plugin's copy gets a string and a source map from both plugins, as the plan's task 3 describes. Task 3 changes `packages/vite-traits-plugin/src`, so it waits for `repo/trait-decorator-1` to merge.
- **Tasks 1 and 2 implemented 2026-11-20** by the implementer on `repo/rolldown-peer-1` (#83, not yet merged).
  - **Task 1:** both manifests declare `"rolldown": "^1.1.4"` and `"vite": "^8.1.4 || ^8.4.0-beta.1"` as peers, and `rolldown` left `dependencies`. `aube install --fix-lockfile` wrote the new `peerDependencies` into the two workspace packages' lockfile entries, and resolved no version. The plan expected no lockfile change, and its lockfile section allows this one. The workspace holds one `rolldown`, 1.3.2. `just build`, `just typecheck`, `just typecheck-declarations` and the traits plugin's 100 tests pass, and publint passes on the plugin's aube tarball ([reading](rolldown-peer-1/checks/workspace-proof.txt)).
  - **The plan's `aube exec publint` packs with `npm pack`,** which `RD-16` property 1 doesn't allow. Publint was rerun on the tarball that `aube pack` wrote.
  - **Task 2** ([script](rolldown-peer-1/checks/plugin-consumer.sh), [reading](rolldown-peer-1/checks/plugin-consumer.txt)): the packed plugin in empty projects with Vite 8.3.8 (hoisted and isolated), 8.1.4 and 8.4.0-beta.1. In each, the plugin and Vite resolve one `rolldown` (1.2.19, 1.1.8 and 1.3.3), the plugin type-checks against `defineConfig` and `RolldownOptions` with `skipLibCheck` off, and `vite build` writes the flattened class.
  - **The mutation:** with the old manifest, Vite 8.3.8 gets rolldown 1.2.19 and the plugin 1.3.2. The build exits 0 and leaves `compose(Base)` unflattened. The type-check still passes, so only the build tells the two manifests apart.
  - **Two additions to the plan's consumer projects.** Each project declares `@types/node`, because Vite's declarations reference Node's types and fail with `skipLibCheck` off without it. Each also declares `rolldown` at the range its Vite declares, because a module that imports `rolldown` must declare it in the isolated layout. Declaring that range keeps one copy.
  - **`RF-55` stays open** until task 3 lands. The pull request says `Refs #48` until then.
- **Ruled 2026-11-20 by the architect** on the [feature proof](reviews/rolldown-peer-1/feature-proof-claude.md) of tasks 1 and 2 at `0d0cb4875`, relayed by the coordinator.
  - **`reviewer-1`: `npm pack` is outside `RD-16` property 1, and no exception is added.**
    - **What publint runs.** Without `--pack`, publint 0.3.25 detects `aube`, which isn't one of its packers, and runs `npm pack --json --dry-run --ignore-scripts` in the package directory (`@publint/pack`, `pack-as-json.js`). It writes no tarball and runs no lifecycle script, but npm reads the repository's `.npmrc` and computes the package's file list. Property 1's exceptions are CI's bootstrap, nx's script runner and `RD-27`'s `npm stage publish` outside any checkout, and this is none of them.
    - **Why there is no exception.** publint lints a tarball path directly (`publint <file.tgz>`), so a form without npm costs nothing. That form is also more exact, because publint then lints the files that `aube pack` packs, which are the files a release publishes (`RD-27` step 5). `--pack false` isn't the fix: publint then can't tell a file that exists from one that is published.
    - **`tsdown`'s `publint: true`** in material-x's build is inside the rule. tsdown detects aube and runs `aube pack --pack-destination <temp> --ignore-scripts`, then hands that tarball to publint.
    - **Task 1's publint proof is met** by the rerun on the `aube pack` tarball ([reading](rolldown-peer-1/checks/workspace-proof.txt)). The one `npm pack` run ran no repository script, and no repair follows from it.
    - **Where the fix applies.** In material-x's `publint` recipe (`packages/material-x/Justfile`), which `aube run publint` reaches, and nowhere else: no workflow, recipe or document runs publint without a tarball. `RD-27` runs no publint, so it isn't affected. A release check that adds publint lints the tarball that its step 5 packed.
  - **`reviewer-2`: the feature proof's V1 transcript is enough for task 2's property,** and task 2 needs nothing more ([transcript](reviews/rolldown-peer-1/checks/consumer-variants.txt)). The consumers declare no `rolldown` and take the real packed plugin, in the plan's whole matrix: 8.3.8 hoisted and isolated, 8.1.4 hoisted, and 8.4.0-beta.1 hoisted, plus 8.1.4 isolated. Each resolves one copy, type-checks against `defineConfig` with `skipLibCheck` off, and builds flattened. The mutant tarball in the same consumer gives two copies and an unflattened build, so the check discriminates. Task 2's committed consumers, which declare Vite's `rolldown` range, stay as the evidence for the typing case: a module that imports `rolldown` in the isolated layout (V3).
  - **The nit is withdrawn:** the plan's reading is right. Vite 8.2.6, published 2026-11-09, declares `~1.2.18`. The feature proof's _"`~1.2.0` to `~1.2.4`"_ leaves 8.2.6 out ([registry](rolldown-peer-1/checks/vite-rolldown-ranges.txt)).
  - **Implementer task R1,** on this branch, before task 3: material-x's `publint` recipe packs with `aube pack --ignore-scripts --pack-destination <temp dir>`, runs `publint` on that tarball, and removes the temp dir. Proofs:
    - `aube run publint` in `packages/material-x` passes after `just build`, and its output never says _"Packing files with `npm pack`"_;
    - with one file that the manifest's `exports` names deleted from the built output, the recipe fails and names that file;
    - the temp dir is gone after a pass and after a failure.
- **Task R1 implemented 2026-11-20** by the implementer on `repo/rolldown-peer-1` (#83, not yet merged) ([script](rolldown-peer-1/checks/publint-recipe.sh), [reading](rolldown-peer-1/checks/publint-recipe.txt)).
  - **The recipe** creates its temp dir with `mktemp -d`, removes it from an `EXIT` trap, writes the tarball there with `aube pack --ignore-scripts --pack-destination`, and runs `publint run` on that tarball.
  - **A pass:** after `just build`, `aube run publint` exits 0 with _"All good!"_ and lints the `.tgz` in the temp dir. Its output doesn't mention `npm pack`.
  - **A failure:** with `button/button.js` deleted from the built output, the recipe exits 1 and reports _"pkg.exports["./button/button.js"].default is ./button/button.js but the file does not exist."_ With the file restored, it passes again.
  - **The temp dir:** each run gets an empty `TMPDIR` of its own, and that `TMPDIR` holds no entries after the pass, the failure or the rerun.
  - **Not rerun:** the recipe's old form, which would run `npm pack` once more. The feature proof already read its output.
- **Task 3 implemented 2026-11-20** by the implementer on `repo/rolldown-peer-1` (#83, not yet merged), after `repo/trait-decorator-1` merged (#85).
  - **The traits plugin** (`src/plugin.ts`) keeps the native magic string when the build's host runs the plugin's copy of rolldown, `this.meta.rolldownVersion === VERSION`, with `VERSION` from `rolldown`. Otherwise both of its transforms return a string and a source map, as they already did on the dev server. It compares once per transformed module.
  - **`@ydinjs/vite-custom-element-assets`** makes the same comparison in `constructCSSTokens`'s production `transform`, the one hook of it that returned a magic string. Its other hooks already return strings.
  - **Consumer D** ([script](rolldown-peer-1/checks/host-copy.sh), [reading](rolldown-peer-1/checks/host-copy.txt)): the packed plugin beside Vite 8.3.8 and tsdown 0.23.7, hoisted, with no `rolldown` declared. The plugin gets rolldown 1.3.3 and Vite gets 1.2.19, and `vite build` writes the flattened class. **The mutation:** the same tarball with the check replaced by `true` gives `compose(Base)` twice and no `impl(this`, as before task 3. Beside Vite 8.3.8 alone, the plugin shares Vite's 1.2.19 and the build is flattened.
  - **The node test** (`packages/vite-traits-plugin/tests/emit.node.test.ts`) calls both transforms with a stubbed `meta.rolldownVersion`. With `VERSION`, `code` is a `RolldownMagicString` and there is no map. With another version, `code` is a string and the map names the module. Each branch fails under its mutation: with the check removed, the other-copy cases fail, and with `native` always `false`, the same-copy cases fail. The plugin's 157 tests pass.
  - **The private plugin** has no test project, so a probe covers it ([script](rolldown-peer-1/checks/assets-host-copy.ts), [reading](rolldown-peer-1/checks/assets-host-copy.txt)). It gives the same two results, and with the built check replaced by `true`, both hosts get a magic string.
  - **A limit:** the host recognizes a magic string by `instanceof` its own binding's class, and the plugin compares versions. Two copies of one version that each load their own native binding still pass a magic string that the host drops ([probe](reviews/rolldown-peer-1/checks/same-version-copies.txt), `own-binding`). Two copies that share one binding keep the edit. No package manager has been shown to produce that tree. Corrected 2026-11-20 by the implementer, on the task 3 feature proof's `reviewer-1`. Until then, this said: _"Two copies of one version, installed at two paths, would still pass a magic string that the host drops."_
  - **What was left:** task 4, below. Until the architect's ruling below, this said: _"Nothing in `RF-55` is left unimplemented. It closes when #83 merges, and the pull request says `Closes #48`."_
- **Ruled 2026-11-20 by the architect** on `reviewer-1` of task 3's [feature proof](reviews/rolldown-peer-1/feature-proof-task3-claude.md) at `aaa29b3a0`, relayed by the coordinator. **`RF-55` stays open** for task 4.
  - **The property stands:** the plugins keep the native magic string only when the host's `rolldown` is the plugin's copy. What the host checks is its binding's class, by `instanceof`, so that class is the copy.
  - **The version comparison doesn't deliver it,** and the plan offered it as a test. With two copies of one version that each load their own binding, the host drops the edit and the build exits 0 ([probe](reviews/rolldown-peer-1/checks/same-version-copies.txt), `own-binding`). Two copies that share one binding keep it. So task 3's limit is narrower than its bullet above says: it needed two bindings of one version, not only two paths. Whether a package manager produces that tree isn't established.
  - **Task 4 checks the identity itself.** rolldown 1.3.2 gives each `transform` handler a lazy `meta.magicString` built from the host's binding. The plugins take the native path only when that object is `instanceof` their own `RolldownMagicString`, outside the dev server. Otherwise, with no `meta.magicString` too, they return a string and a map. The version comparison goes. The plan's [task 4](rolldown-peer-1/rolldown-peer-plan.md#task-4-the-hosts-binding-not-its-version) has the properties and the proofs.
  - **Closing.** The architect closes `RF-55` on the branch, before #83 merges, once task 4's proof is read, as `RF-23` and `RF-31` were closed. _"It closes when #83 merges"_ above is replaced by this. The pull request says `Refs #48` until the closure, and `Closes #48` from it.
- **Ruled 2026-11-20 by the architect** on the implementer's finding at `d79bf6f38` ([reading](rolldown-peer-1/checks/consumer-paths.txt)), relayed by the coordinator. **`RF-55` stays open.**
  - **The finding:** Vite 8.1.4 and 8.3.8 pass the `transform` handler their own `{ moduleType, ssr }`, without `meta.magicString`. Only 8.4.0-beta.1 passes it. So task 4 as first written put every stable Vite in the peer range on the string path, one-copy builds included. The plan had blamed the floor's rolldown for the missing `meta.magicString`, but Vite drops it.
  - **The ruling:** the binding check decides where the host offers `meta.magicString`. Where it doesn't, `this.meta.rolldownVersion === VERSION` decides, as in task 3. Both apply outside the dev server only.
  - **The limit, as the probes show it:** on a host without `meta.magicString`, which today means Vite 8.1 to 8.3, two copies of one version that each load their own binding still drop the edit. No package manager has been shown to produce that tree. If one is shown, it is Tier A and the fallback becomes the string path.
  - **Why:** the string path everywhere would slow the common one-copy build on stable Vite, to guard against a tree not shown to occur. The owner's answer (a) kept every other build unchanged.
  - **The fallback goes** when the `vite` peer floor reaches a Vite that passes `meta.magicString`.
  - The plan's [amendment](rolldown-peer-1/rolldown-peer-plan.md#amended-a-host-that-offers-no-metamagicstring) has the properties and the proofs.
- **Task 4 implemented 2026-11-20, as amended,** by the implementer on `repo/rolldown-peer-1` (#83, not yet merged).
  - **The traits plugin** (`src/plugin.ts`).
    - **Which host takes a magic string:** outside the dev server, a host whose `transform` meta has a `magicString` key is native exactly when the magic string the plugin edited is that instance. A host with no such key is native exactly when `this.meta.rolldownVersion === VERSION`.
    - **Reading the key:** the check uses `'magicString' in meta`, which doesn't call rolldown's lazy getter.
    - **Editing the host's instance:** `lowerAttributes`, `transformTraitModule` and `flattenModule` take a `createMagic` factory. Its default is `new RolldownMagicString(code)`. The two transforms pass one that returns the host's instance when it is `instanceof` the plugin's `RolldownMagicString`, and a new one otherwise. So a changed module builds at most one magic string, and a module the plugin doesn't change builds none.
  - **`@ydinjs/vite-custom-element-assets`:** `constructCSSTokens`'s production `transform` makes the same two-part check, and edits the host's instance when it is of the plugin's class. That transform built one magic string per module before, and builds one now. The plugin has no build kind, so it has no dev-server guard, as under task 3.
  - **The node test** (`packages/vite-traits-plugin/tests/emit.node.test.ts`, [mutations](rolldown-peer-1/checks/emit-mutations.sh), [reading](rolldown-peer-1/checks/emit-mutations.txt)) calls both transforms in the four cases.
    - The plugin's class at another version is native: the host's own instance, edited, with no map.
    - Another class at the same version gets a string and a map.
    - No `magicString` at the same version is native.
    - No `magicString` at another version gets a string and a map.
    - Five mutations each fail their own cases: the version deciding where the host offers a magic string, never native, any host instance edited, and a host that offers none always a string or always native. The plugin's 161 tests pass.
  - **The consumers** ([script](rolldown-peer-1/checks/consumer-paths.sh), [reading](rolldown-peer-1/checks/consumer-paths.txt)), each with the third argument its host passed and the path the plugin took. Every build but the mutant's writes the flattened class.
    - **Vite 8.3.8, hoisted and isolated, and Vite 8.1.4:** one copy, no `magicString`, native by version.
    - **Vite 8.4.0-beta.1:** one copy, `magicString` offered, native by binding.
    - **Consumer D:** two copies, no `magicString`, a string and a map, flattened. **Its mutant,** with the packed check replaced by `true`, isn't flattened.
  - **Two copies of one version** ([script](rolldown-peer-1/checks/same-version-copies-real.sh), [reading](rolldown-peer-1/checks/same-version-copies-real.txt)): the feature proof's tree with the built plugin, on a rolldown 1.3.2 host that offers `magicString`. `shared-binding` is native and `own-binding` gets a string and a map, and both keep the edit. A mutant of `own-binding` with the check replaced by `true` drops it.
  - **material-x** ([script](rolldown-peer-1/checks/host-path-witness.sh), [reading](rolldown-peer-1/checks/host-path-witness.txt)).
    - Its 213 built files are identical to `main`'s at `3457e3463`, names and bytes.
    - Every changed module took the native path, by binding: 26 traits and 5 assets returns in the tsdown build, and 34 and 5 in Storybook's Vite build.
    - docs-build exits 0, and docs-smoke passes 105 of 105 pages.
  - **The private plugin's probe** ([script](rolldown-peer-1/checks/assets-host-binding.ts), [reading](rolldown-peer-1/checks/assets-host-binding.txt)) gives the same four results, and each of the same five mutations changes its own cases.
  - **The limit** is the ruling's. On a host without `meta.magicString`, which today means Vite 8.1 to 8.3, two copies of one version that each load their own binding still drop the edit. No package manager has been shown to produce that tree. The version fallback goes when the `vite` peer floor reaches a Vite that passes `meta.magicString`.
  - **`RF-55` stays open** until the architect reads task 4's proof. The pull request says `Refs #48`.
- **Closed 2026-11-20 by the architect** on `repo/rolldown-peer-1` at `e068354fd` (#83, not yet merged), under the plan's [_Closing_](rolldown-peer-1/rolldown-peer-plan.md#closing), as `RF-23` and `RF-31` were closed. The pull request says `Closes #48` from this closure.
  - **Read:** task 4's [feature proof](reviews/rolldown-peer-1/feature-proof-task4-claude.md), at `129640d0b`, with its [rerun](reviews/rolldown-peer-1/checks/task4-rerun.txt) and [probe](reviews/rolldown-peer-1/checks/meta-getter-reads.mjs). It finds no defect against task 4 as amended. The earlier proofs, of [tasks 1 and 2](reviews/rolldown-peer-1/feature-proof-claude.md), [R1](reviews/rolldown-peer-1/feature-proof-r1-claude.md) and [task 3](reviews/rolldown-peer-1/feature-proof-task3-claude.md), each met their task, and each finding they raised is ruled above or was the coordinator's.
  - **The required property holds.** Both plugins declare `rolldown` as a peer, `^1.1.4`, and not in `dependencies`. Their public types name the consumer's `rolldown`. The plan's tasks 1 to 4 are in, and each proof the plan prescribed was rerun by a reviewer and matched its reading.
  - **What the closure rests on in task 4's proof:**
    - the consumer paths, the same-version copies and the host-path witness match their readings line for line, and Vite 8.4.0-beta.1 returns the host's own instance, so it is native by binding, not by version;
    - material-x's 213 built files are byte-identical to `main`'s at `3457e3463`;
    - `'magicString' in meta` doesn't call rolldown's lazy getter, and the native path builds no more magic strings than before task 4;
    - with rolldown's getter memoized, the traits plugin's `magic === meta.magicString` holds exactly when the ruling's `instanceof` does. A host whose getter isn't memoized would take the string path, which is correct and slower;
    - the assets plugin needs no dev-server guard, because its `transform` is registered only when `isProd` is true, and both of its callers pass that only for a build.
  - **The architect read** both checks in `src/plugin.ts` and `src/index.ts` and both manifests at `e068354fd` against the amended property 1. `e068354fd` adds only the proof's record to `129640d0b`.
  - **Not read, and not owed by the plan:** CI on #83, which was pending at `e068354fd` and is the merge's gate, not the closure's; a tsdown host on another `rolldown` copy, and a getter that isn't memoized, which are readings; the private plugin's probe mutations, which have no committed script. The plan asks that probe for the four cases, and the rerun gives them.
  - **What stays:** the limit, as ruled. On a host without `meta.magicString`, which today means Vite 8.1 to 8.3, two copies of one version that each load their own binding still drop the edit. If a package manager is shown to produce that tree, it is Tier A, and the fallback becomes the string path. The version fallback and the `VERSION` import go when the `vite` peer floor reaches a Vite that passes `meta.magicString`. That change has its own decision, which isn't open here.
- **Issue:** #48.

#### RF-56 — In a connected button group, a selected button isn't a full pill, and a pressed button's inner corners grow instead of shrinking

Tier C, **open**. Registered on 2026-11-18 by the architect, from `RF-43`'s stop at `7667a2a5a` and the owner's rejection of the new `button-group-connected-selected` baseline, relayed by the coordinator. `RF-51` to `RF-55` are allocated on `repo/aube-isolated-1`. **No row is disabled.**

- **The tokens,** read through tproc. For each size, `md.comp.button-group.connected.<size>.*`:

  | Size | `container.shape` | `inner-corner.corner-size` | `pressed.inner-corner.corner-size` | `selected.inner-corner.corner-size` |
  | --- | --- | --- | --- | --- |
  | xsmall | circular | 8dp | 4dp | 50% |
  | small | circular | 8dp | 4dp | 50% |
  | medium | circular | 8dp | 4dp | 50% |
  | large | circular | 16dp | 12dp | 50% |
  | xlarge | circular | 20dp | 16dp | 50% |

  Material's 50% is half the shorter side, so a selected button's inner corners are full, like its outer ones. The owner's reference image of Material's connected group agrees: selected buttons are pills, and unselected ones keep small inner corners.

- **What is drawn,** in `button-group/styles/connected/main.styles.css`:
  - the group emits only `inner-corner.corner-size` (`connected/tokens.ts` selects the default state alone). The pressed and selected sizes aren't emitted;
  - `::slotted(:active), ::slotted([checked])` set the inner corners to the button's `--_container-shape`;
  - for a checked switch button, `--_container-shape` is the button's own toggle shape, `md.comp.button.<size>.selected.container.shape.round` (12dp for small, `button/styles/shape/main.css.ts`). So a selected button's corners become 12dp, and an end button's outer corners lose their full shape too;
  - a pressed button's inner corners take the container shape, which is larger than the resting size, where the tokens make them smaller.
- **Since when:** the rule was never drawn for a selection until `RF-43`'s R2. Before it, the group's `value` set only the custom state `checked`, and `[checked]` didn't match. `button-group/spec-consistency.md:35` records the morph as matching the spec, and it doesn't.
- **Required property:** a connected group's buttons have the shapes that the group's tokens define, at every size. The [host-invariant handoff](host-invariant-1/host-invariant-handoff.md)'s item 8 states them.
- **Routed** to the host-invariant unit, item 8.

#### RF-57 — A transformer trait's class field shadows a subclass's accessor at runtime, and TypeScript doesn't report the override

Tier C, **closed 2026-11-19** (below). Before closure: open. Registered on 2026-11-18 by the architect, on the owner's request relayed by the coordinator, from the note in `RF-54`'s decision and its [probe](declarations-check-1/checks/rf54-transformer-trait-probe.txt). `RF-56` is allocated on `repo/host-invariant-1`. **No row is disabled.**

- **What was read** at `2544a24fd`:
  - core's transformer `trait()` (`src/traits/primitives.ts`) types a trait's instance fields as `Omit<InstanceType<U>, keyof InstanceType<T>>`, which is a mapped type. So TypeScript doesn't apply TS2610 or TS2611 to them.
  - A transformer whose subclass declares a class field `x`, with a subclass of the traited class overriding `x` with `get` and `set`, type-checks with no directive.
  - At runtime the class field is an own property of every instance, so it shadows the subclass's accessor.
- **What doesn't have the hazard:** attribute traits. The attribute `trait()` builds on the transformer trait but installs each field as a prototype accessor, so a subclass's accessor overrides it. `RF-54`'s mapped `Branded` doesn't create this hazard and doesn't widen it.
- **Effect today:** none observable. In the repository, only the attribute `trait()` and core's own tests build transformer traits, and `@ydinjs/core` is unreleased. So the finding is Tier C.
- **Why it is registered:** the owner may publish core's traits as a separate package. Other people would then write transformer traits with class fields, and the type contract would accept an override that the runtime ignores. **Once the transformer `trait()` is published outside the repository, this finding is Tier B**, because the types it publishes then mislead a correct integrator.
- **Required property,** due before the transformer `trait()` is published outside the repository: an author of a transformer trait, or a consumer who overrides one of its fields, can't be misled. Either the types reject an accessor override of a field that the trait installs on the instance, or the transformer `trait()`'s published contract says what such a trait must do. That is: it installs its instance members on the prototype, as accessors and methods, not as class fields or constructor assignments, because its field types don't tell a property from an accessor.
- **Repair direction,** recommended and not yet decided:
  - **The contract is the minimum.** It goes in the transformer `trait()`'s JSDoc, and in the package's documentation when that package exists.
  - **A type-level repair is unread.** It would keep the declaration kind of the trait's fields, for example by exposing the transformer's instance type instead of an `Omit` delta, without breaking `impl`'s composition. Nobody has read whether that is possible. A repair that changes `Trait`'s public shape is decided when this finding is scheduled.
- **Not adopted:**
  - **A runtime check on the transformer's result,** for own fields that shadow an accessor. Once the contract states the rule, a class field is incorrect use of it, and the trait doesn't corrupt state that it owns. So the check fails both conditions of `CONTRIBUTING.md`'s _Definition of success_ for a defensive check.
  - **A custom lint rule.** That is the machinery that `RF-51`'s answer declined.
- **Routed** to the owner. It isn't scheduled, and it blocks nothing.

**Dated 2026-11-19 by the architect: this entry closes with `RD-26`'s migration, with one exception recorded.**

- **The transformer `trait()` this entry names is deleted** with `primitives.ts`.
- **In layer (a), a trait is a plain class whose members keep their declaration kinds.** `MergeInstances` doesn't count the base's keys, so the intersection of traits that share no key of their own stays a plain intersection. [P40](trait-decorators-1/trait-decorators-plan.md#evidence) (b) shows the results in TypeScript 7.0.2 and 6.0.3 ([transcript](trait-decorators-1/checks/types.txt)):
  - a subclass's accessor over a trait field fails with TS2611;
  - a component's own field over a trait accessor fails with TS2610.
- **A trait field with an initializer is a build error** (`trait-field`), so a trait can't install the own instance property that shadowed the accessor at runtime.
- **The exception,** narrowed by `RD-26` property 4's amendment of 2026-11-19: in a composition where a later trait declares a key of an earlier trait, only that earlier trait goes through `Omit`, a mapped type. Its other members then lose TS2610 and TS2611, and its ES-private members go ([P43](trait-decorators-1/trait-decorators-plan.md#evidence) (c), (d)). Every other trait keeps its kinds.
  - The case this entry needs is a component's own field over a trait's accessor. A trait still can't install an instance field, so the exception doesn't bear on this entry's required property.
  - The flattener's `trait-member-conflict` warning names every pair that supplies one key. A `declare` member supplies nothing, so a key that a later trait only declares isn't warned about.
  - One composition has such a key today: IconButtonLike's `declare color` over ButtonLike's `color`, in IconButton and SwitchIconButton. There ButtonLike's `size` and `shape` don't report an own field (P43 (c)).
  - **The cost is the trimmed trait's own members only** (`RD-26` property 4, amended again 2026-11-19). At `2bf0418ab` it also reached the base's members: a subclass of IconButton or SwitchIconButton got TS2425 on `override click()`, and an own field over a base accessor lost TS2610 ([P44](trait-decorators-1/trait-decorators-plan.md#evidence)). The trimmed trait now loses the base's keys as well, which repairs both.
- **It closes** when the [migration plan](trait-decorators-1/trait-migration-plan.md)'s proofs hold on `repo/traits-migration-1`. The architect writes the closure on that branch before its pull request opens, with this exception recorded.

**Closed 2026-11-19 by the architect** on `repo/traits-migration-1` at `aa73be64e`, not yet merged, relayed by the coordinator. It rests on the migration's [proofs](trait-migration-1/checks/proofs.md), all of which hold. The required property holds: the hazard can't be written, and the types report the overrides that this entry's case hid.

- **The transformer `trait()` is gone.** `primitives.ts` is deleted, and no package's sources build a trait from a transformer.
- **A trait can't install an instance field.** The flattener fails any instance field of a trait class with `trait-field`, except a `declare` field and a private field with no initializer, neither of which is copied (`vite-traits-plugin/src/composition/trait-class.ts:414`). That is stricter than the plan's row, which names a field with an initializer. `diagnostics.node.test.ts` reads it.
- **The types keep the kinds.** core's `composition.declaration.test.ts` passes at `15d50a10e`, in core's 297 tests:
  - TS2610 on an own field over a trait's accessor;
  - TS2611 on an accessor over a trait's field;
  - after a shared key, TS2610 on another trait's accessor and on a base accessor, the [P44](trait-decorators-1/trait-decorators-plan.md#evidence) §3 and §4 cases. The proofs record states that those two fail without the fix.
- **The exception stays as recorded above:** only the trimmed trait's own members lose their kinds. A trait can't install an instance field, so the exception doesn't bear on this entry's property.
- **What reopens it:** a trait form that installs an instance member the copy doesn't carry as an accessor or a method, or a type form that maps a trait that loses no key.
- **GitHub:** issue #50. The migration's pull request closes it.

#### RF-58 — Each gate job fetches its engine's system packages from the Ubuntu mirror, so a slow mirror times out jobs before any test runs

Tier C, **closed 2026-11-18** (below). Before closure: open, decided, unimplemented. Registered on 2026-11-18 by the architect, on Architect B's proposal in the [CI-deps handoff](ci-deps-1/ci-deps-handoff.md) at `073266198` and its [mirror reading](ci-deps-1/checks/mirror-reading.tsv), relayed by the coordinator with the owner's choice of `RD-21`. **No row is disabled.**

- **What was read:** 19 jobs of runs 44237471520, 44238673598 and 44240485947 (#35 and #37). Each job's `playwright install --with-deps` step downloads its engine's `.deb` files.
  - All 12 jobs on runner image `20261111.127.1` used the mirror `us-east-2.ec2.archive.ubuntu.com`. Each fetched at 70 to 202 kB/s, or was cancelled at its job limit while fetching.
  - All 7 jobs on `20261111.370.1` used `azure.archive.ubuntu.com`, at 8.2 to 45.9 MB/s. Both pools ran in the same runs and the same minutes.
  - The package indexes and Playwright's browser downloads were fast on both pools.
  - The volume per engine is the same on both pools: Chromium 32.1 MB, Firefox 48.8 MB, WebKit 125 MB. `docs` and `measurements` fetch Chromium's set too.
- **Why it matters:** a job that times out tests nothing. Its re-run lands on whichever pool the queue assigns, and #35 and #37 each needed several attempts. At 100 kB/s, WebKit's set takes about 21 minutes against an 8-minute limit.
- **Required property:** no gate job contacts the Ubuntu mirror while the cache holds its engine's packages for the job's key. When `system-deps` reaches the mirror, that happens before any test job starts. A test job reaches it only when its own restore misses, and its warning then names the miss. (**Amended 2026-11-18** by the architect, with `RD-21` property 4. The second sentence said _"When a run does reach the mirror, that happens before any test job starts"_. A test job whose restore misses falls back to the mirror, so that sentence held only when every restore hits.)
- **Routed** to `RD-21`. The [CI-deps handoff](ci-deps-1/ci-deps-handoff.md) implements it. It closes when that handoff's witnesses hold and a review reads them.
- **Closed 2026-11-18 by the architect** on `repo/ci-deps-1` at `a4a90f683` (#38, not yet merged), relayed by the coordinator. The closure rests on the [CI-deps report](ci-deps-1/ci-deps-report.md), the [feature proof](reviews/ci-deps-1/feature-proof-claude.md) and the handoff's [item 3](ci-deps-1/ci-deps-handoff.md#item-3-the-feature-proofs-three-findings). The required property holds in every run read:
  - **Witness 2** is three warm runs, the last of them 44264485321 on item 3's `10100984f`. In that run, every test job restored its engine's entry, wrote no warning, had no `Get:` from any `archive.ubuntu.com` host, and passed. Those jobs ran on both pools, and `docs`, `measurements` and `firefox` ran on the incident pool, `20261111.127.1`. The architect read those five jobs' logs, and they agree with [`checks/item3-run.tsv`](ci-deps-1/checks/item3-run.tsv).
  - **Witness 3,** the forced miss in run 44259919530, wrote the warning and fell back to the mirror, as `RD-21` property 4 states. Its `webkit` job was cancelled at its limit on `20261111.127.1`, which is the miss path that property 4 names, not a defect of the hit path.
  - **Not read in a run:** a hit whose entry holds no archive. `actions/cache`'s source shows that it saves an empty directory ([reading](ci-deps-1/checks/actions-cache-empty-directory.txt)), and the step, run locally with stubs, skips the install and runs the check ([witness](ci-deps-1/checks/empty-entry-step.txt)). The recording workflow was read in its YAML and wasn't run (witness 6).
  - **What reopens it** is `RD-21`'s condition: a test job in the gate that misses on its own, outside a forced witness, and times out.

#### RF-59 — material-x's `:host:has()` detection runs at import: it appends to `document.body` and forces a style computation

Tier A, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, on slot `c`'s [handoff](host-has-fallback-1/host-has-fallback-handoff.md) proposal 2, relayed by the coordinator. `RF-58` is proposed on `repo/ci-deps-1`, so this is the next free number. **No row is disabled.**

- **The code,** read by the architect at `83a985b99`: `HOST_HAS_SUPPORTED` (`material-x/src/core/utils/polyfills.ts:10`–`:20`) is evaluated when the module loads. It creates an element with a shadow root, appends it to `document.body`, reads `getComputedStyle`, and removes it.
- **What a consumer observes:**
  - **Every consumer that imports `mx-text-field`, `mx-multiline-text-field` or a list item pays for a style computation at import,** before any element exists, whether or not it ever uses one.
  - **An import before `<body>` exists throws.** While the parser is in `<head>`, `document.body` is `null`, so `document.body.append` throws a `TypeError`, and the module and every module that imports it fail to evaluate. Loading a custom-element library from `<head>` is a correct integration, so that elements upgrade as they parse: an `async` module script, or a dynamic `import()` that settles before the body is parsed. **Observed** at `abfc843a8` ([reading](host-has-fallback-1/checks/rf59-head-import.txt)). A classic bundle in `<head>` throws in all three engines, whenever the body arrives. A dynamic `import()` throws in all three when the body arrives after the module graph. An `async` module throws in Chromium and Firefox. No element is defined.
- **Tier A** on the throw's consequence: a correctly integrated consumer gets an import failure. The trigger depends on load timing, which lowers its priority within the tier and not its tier.
- **Required property:** importing a material-x module neither touches the document nor forces a style computation. Each component that the polyfill serves renders in every engine as it did with the detection.
- **The repair, decided by the architect on 2026-11-18:** no detection. `useHasSlottedPolyfill` sets the `has-<slot>` state in every engine, beside the class it already sets. The build writes each state selector into the same rule as the `:host:has()` selector it stands for, so where both match they set the same declarations. Chromium 158 and WebKit 27.2 match `:host(:state())` (`RF-40` reading D). The states are private. So rendering doesn't change, and nothing remains to run at import. The [handoff](host-has-fallback-1/host-has-fallback-handoff.md#item-3-rf-59-the-polyfill-sets-its-states-in-every-engine-and-detects-nothing)'s item 3 implements it. The repair holds whether `RF-40` closes on tests or on the reading.
- **The polyfill can't be removed yet** ([reading](host-has-fallback-1/checks/rf59-light-dom.txt), at `b44c655d7`). The owner asked about a light-DOM selector, `:host(:has(> [slot=<name>]))`. Chromium 158 doesn't parse it. Firefox 159 matches it only when the host's own style is computed, and the match goes stale after a light-DOM change. Only WebKit 27.2 follows changes. Chromium also lacks `:has-slotted`, so no CSS selector there tells that a slot has content. The selector can't see text in the default slot. Selectors 4 makes it invalid ([csswg-drafts#11859](https://github.com/w3c/csswg-drafts/issues/11859), open). The polyfill and the build's rewrite can go together when every supported engine matches `:has-slotted` and `:host:has()`.
- **Routed** to `repo/host-has-fallback-1`'s unit as item 3, on the owner's agreement of 2026-11-18, relayed by the coordinator.
- **Changed 2026-11-18.** Until then, the direction was _"detect once, on the first `useHasSlottedPolyfill` call, when a host exists"_, and the entry was routed _"to the owner to order. It isn't in `repo/host-has-fallback-1`'s unit, which is test-only."_ The direction changed because a lazy detection still forces a style computation and still needs a document. `CSS.supports()` can't replace it, because Firefox reports `:host:has()` as supported and doesn't match it.
- **Amended 2026-11-18 by the architect,** on `reviewer-1` of the [feature proof](reviews/host-has-fallback-1/feature-proof-claude.md) at `f88437c6b`. The required property's second sentence said _"The detection gives the same answer as it does today."_ The decided repair has no detection, so that sentence couldn't be checked against the code. It now states what the detection's answer served: each component renders in every engine as it did. The handoff's item 3, witness 3, checks it. The first sentence doesn't change.
- **Closed 2026-11-18 by the architect** on `repo/host-has-fallback-1` (#59, not yet merged), relayed by the coordinator, per the [handoff's condition](host-has-fallback-1/host-has-fallback-handoff.md#closing-rf-40-and-rf-59). The closure rests on the [report](host-has-fallback-1/host-has-fallback-report.md) at `28a3ad4bb`, and on the run's job logs, which the architect read.
  - **The required property's first sentence holds.** `HOST_HAS_SUPPORTED` is gone, and the module evaluates declarations only. The import row in `tests/core/utils/polyfills.browser.test.ts` fails before the repair and passes after it, in all three engines (item 3 witness 1). The head-import probe defines the element in every scenario and every engine, `classic-bundle` included (witness 2).
  - **Its second sentence holds in the gate,** on the tree that merges. #59's run 44276212222 is on `4df80913f`, which merges `origin/main` at `7a4f82eb4` ([reading](host-has-fallback-1/checks/rf40-pr-run.txt)). In the `chromium` job 134705238062, `visual` passes with no baseline changed. Its four files pass, the screenshot upload is skipped, and the branch changes no file under `__screenshots__` against `origin/main`. `browser` passes in that job, in the `firefox` job 134705238220 and in the `webkit` job 134705238152, `polyfills.browser.test.ts` and `RF-40`'s rows included.
  - **What remains isn't this finding:** the polyfill and the build's rewrite stay until every supported engine matches `:has-slotted` and `:host:has()` (above).

#### RF-60 — A flattener runtime-equivalence row failed once in CI with no change, and its cause isn't established

Tier B, **closed 2026-11-19** (below). Before closure: open. Registered on 2026-11-18 by the architect, on the coordinator's report of `verify` run 44245582616. `RF-58` and `RF-59` are on `repo/ci-deps-1` and `repo/host-has-fallback-1`, so this is the next free number. **No row is disabled.**

- **What was observed** ([excerpt](traits-plugin-1/checks/rf60-flatten-flake.txt)). In attempt 1, the `chromium` job (job 134603867751) failed one row: `node/vite-traits-plugin` › `tests/flatten.node.test.ts` › _"should preserve trait brands for instanceof"_, at `:84`: _"flattened: expected Foo{ extra: 'here' } to be an instance of "_. The message names no trait, because a trait is the anonymous function that `abstractTrait` returns. The assertion at `:84` is the one against `Nameable`. The same file's other five rows passed, `Checkable`'s assertion at `:83` among them. Attempt 2 passed every job with no change.
- **The tree:** `c1a40a3fc` on `repo/host-invariant-1`. Its `vite-traits-plugin` is `main`'s at `83a985b99`. It doesn't have `RF-44`'s item 1, so the source-keyed parse cache can neither cause nor fix what was seen there.
- **Ruled out, by reading:** a parse-cache collision. Every test that reuses a fixture's id parses that fixture's own source, and the ad-hoc sources in `analyze.node.test.ts` use ids that no fixture has. So an id-keyed cache serves the same AST that a source key would.
- **The cause: a second evaluation of `nameable.ts`,** the [plan](traits-flaky-1/traits-flaky-plan.md)'s candidate (B), established by its [ruling on step 3](traits-flaky-1/traits-flaky-plan.md#ruling-on-step-3-with-the-cause). Vite's module runner can evaluate one file twice when the file is requested under two URL strings at the same time. The row imported `nameable.ts` by its file URL (`file:///…/gen-X/nameable.ts`) while the generated `foo-flat.ts` imported it by a relative specifier (`/tests/fixtures/gen-X/nameable.ts`). Each evaluation creates its own `Symbol('Nameable')`, so the flattened prototype could carry a brand that isn't the test's `Nameable.brand`.
  - **The mechanism,** in Vite 8.4.0-beta.1, which this repository pins and Vitest 5.1.0 reaches ([runner reading](traits-flaky-1/checks/rf60-runner-reading.txt) §3). The runner deduplicates in-flight requests only by their URL string. The server answers `invalidate: true` while it holds no transform result for the module. The runner applies that answer to a module node that it is already evaluating, and evaluates the file again.
  - **Reproduced in the row's setup** ([reproduction](traits-flaky-1/checks/rf60-reproduction.txt)): 8 of 1,000 repeats failed, in one worker, with coverage, beside 24 busy-loop processes. Every failure is (B), in a repeat where one file was fetched under two URL strings and both answers carried `invalidate: true`. 1,522 trait loads under one URL string failed 0 times.
  - **Reproduced with Vite alone,** without Vitest and without load ([Vite-only](traits-flaky-1/checks/rf60-vite-only.txt)): 12 to 50 of 1,000 repeats evaluated the module twice with file URLs, and 0 of 4,000 did with one URL string.
  - **The flattener and its generated text play no part.** The entry's first candidate (A), a brand link that reads `undefined`, wasn't seen in any failure. Step 1's message tells (A) from (B) ([mutations](traits-flaky-1/checks/rf60-step1-mutations.txt)).
  - **Before the cause was found,** nothing reproduced it: 40 local runs of the plugin's suite at `c1a40a3fc`; 150 runs, and 44 runs beside 24 busy-loop processes, under the root configuration with coverage at `91fc5d662` ([repetitions](traits-flaky-1/checks/rf60-repetitions.txt)). A probe that delayed the generated module's transform by 300 ms to 2 s still evaluated it once ([delay probe](traits-flaky-1/checks/rf60-delay-probe.txt)). In a suite run, only the brand row's block imported a trait by its file URL concurrently with the consumers, once. The reproduction repeated that block 1,000 times.
  - **Related upstream, not a duplicate:** [vitejs/vite#24062](https://github.com/vitejs/vite/issues/24062), open when read on 2026-11-19. It reports that an import by file URL misses the runner's cache and fetches the module again, without a second evaluation, in a sequential case. This defect is concurrent, and the module is evaluated again.
- **The repair** (`446b21bd6`, tests only) meets the ruling's properties 1 to 4. A test imports a generated module by its file URL only when no other module imports it, which leaves the consumers `foo-composed` and `foo-flat`. `flattenToDir` also writes `augmented.ts`, which re-exports each augmented trait module by the consumers' relative specifier, and a test reaches a trait through it (`Flattening.augmentedUrl`). The brand row's block and `flatten-method.node.test.ts`'s first block changed; the imports stay concurrent. `flattenToDir`'s documentation states the rule and its reason. Step 1's failure message (`05cb93d52`) stays. The plan's serialized imports (its step 3 as first approved) are withdrawn.
- **Why the row can't fail again.** After the repair, every generated file that two importers reach is requested under one URL string. The runner deduplicates concurrent requests for that string, and it reuses the evaluated node for later requests. The defect then has no second URL string to start from. What remains is the generated text, which is deterministic over fixed fixtures. If the row fails anyway, step 1's message names the candidate, and the entry reopens.
- **Why it matters:** a row whose result depends on more than the code is an unsound instrument. A rerun hides it, and it costs a full gate run each time.
- **Required property:** the row's result depends only on the code. Either a reproduction names the cause and the cause is repaired, or the record states why the row can't fail again.
- **The architect's direction,** for the unit that takes it: first make the row report what it needs. When the assertion fails, it prints the generated `foo-flat.ts`, the generated `nameable.ts` and the brand key that the flattened prototype carries. Then reproduce under the root config with coverage, repeated. The unit is [`traits-flaky-1`](traits-flaky-1/traits-flaky-plan.md): its step 1 is this direction, its step 2 is the reproduction, and the ruling replaces its step 3.
- **Routed** to the owner to order, beside `RF-44`, because both concern `vite-traits-plugin`. It isn't `RF-44`'s: that entry is about what the plugin's document and code say, and this row fails in a tree without that unit's changes. **It doesn't block** #35 or `RF-44`.
- **The upstream report is owed, and filing it is the owner's decision,** because it writes to GitHub. The owner intends to file it later. A draft for `vitejs/vite` is ready at [`upstream-vite-issue.md`](traits-flaky-1/upstream-vite-issue.md), with what to check before posting. Filing it isn't a closure condition. When it is filed, this entry links it. When a Vite release fixes the defect, the rule in `flattenToDir` stays, because it costs nothing and keeps the tests independent of how the runner handles URL strings.
- **Changed 2026-11-19 by the architect,** with the cause. Until then, the observed message was quoted as _"…to be an instance of Nameable"_, which is the source line's name and not the message's. The entry also carried _"**A candidate, not established:** the symptom matches a flattened class whose `Nameable` brand link evaluates to `undefined`. Then the brand would be installed under the key `"undefined"`, and only that assertion would fail. Under Vitest's module runner, a named import that the module doesn't export may read as `undefined` instead of failing to link. No reading shows why the generated `nameable.ts` would lack its synthetic export in one run."_ That candidate is (A) above, and no failure showed it. The _Not reproduced_ bullet's 40 runs are now in the cause's last-but-one item.
- **Closed 2026-11-19 by the architect** on `repo/traits-flaky-1` at `33259f600` (#73, not yet merged), relayed by the coordinator, per the plan's [closure conditions](traits-flaky-1/traits-flaky-plan.md#what-the-closure-needs). The required property's first branch holds: a reproduction names the cause, and the repair removes the cause's precondition from the tests.
  - **The ruling's properties 1 to 3 are in the tree that merges.** `33259f600` merges `origin/main` at `359c87f8a` into the repair, and the merge changes none of the repair's three files. #73 carries this record with the repair, so the closure reaches `main` only together with the repair.
  - **The witnesses are saved.** Witness 1 is the step 1 [mutations](traits-flaky-1/checks/rf60-step1-mutations.txt). Witnesses 3 to 5 are the [repair proof](traits-flaky-1/checks/rf60-repair-proof.txt)'s §1 to §3: no test imports by file URL a module that another module imports; 0 failed repeats of 1,000 and 0 files under two URL strings, against 8 and 478 before the repair; and with the file-URL trait imports restored, 10 failures and 525 such files.
  - **A feature proof read them.** The [feature proof](reviews/traits-flaky-1/feature-proof-claude.md) at `87c68312d` read the repair at `446b21bd6` and found no defect of any tier. It re-ran witnesses 4 and 5 at the committed head ([re-proof](reviews/traits-flaky-1/checks/rf60-repair-reproof.txt)): 0 failures and 0 files under two URL strings, against 26 failures and 572 files with the mutation. It re-ran both step 1 mutations against the repaired imports.
  - **The cause and why the row can't fail again** are stated above.
  - **Not read:** a CI run of the repaired row. Every rate comes from one dev container with 12 processors. The URL log, not the failure count, is the discriminating witness. Whether a file is requested under two URL strings depends on the import specifiers, not on the machine's speed.

#### RF-61 — `createContext` calls `crypto.randomUUID`, so on a page served over plain HTTP every material-x button, both button groups and the text field fail to import

Tier A, **closed 2026-11-18** (below). Before closure: open. Registered on 2026-11-18 by the architect, on the [work-queue plan](work-queue-1/work-queue-plan.md)'s reading of `createContext` at `377ca72df`, relayed by the coordinator. `RF-60` is on `repo/traits-plugin-1`, so this is the next free number. **No row is disabled.**

- **The code,** read at `377ca72df`: `createContext` returns `crypto.randomUUID()` (`core/src/controllers/useContext.ts:33`–`:35`). Its JSDoc says that it requires HTTPS. `material-x/src/button-group/button-group-context.ts:25` calls it when the module loads, to create `BUTTON_GROUP_CTX`. No other source calls it on `main`.
- **Observed** ([reading](work-queue-1/checks/rf61-insecure-context.txt), [probe](work-queue-1/checks/rf61-insecure-context-probe.mjs)), in Chromium 158, Firefox 159 and WebKit 27.2. Over plain HTTP from a host other than `localhost`:
  - `isSecureContext` is `false`;
  - `crypto.randomUUID` is `undefined`, and calling it throws a `TypeError`;
  - `crypto.getRandomValues` works.

  From `localhost`, all three APIs work.

- **What a consumer observes,** read in the code and not run: on such a page, the button group module throws when it is evaluated. So the module, and every module that imports it, fails, and no button group is defined. A page served from a LAN address over HTTP is an ordinary case, for example a development server opened on a phone, or an intranet.
- **Tier A:** a correct integration gets an import failure. The JSDoc's requirement doesn't lower the tier. It describes core's function, and material-x calls that function at import without stating any requirement to its consumers.
- **Required property:** `createContext` works in every context a page can run in, secure or not. Each token stays distinct from every other context's token, including the tokens of another copy of `@ydinjs/core` on the same page. The coordinator suggested `crypto.getRandomValues`, which works in both contexts. The repair is the unit's to choose.
- **Routed** to the owner to order, through the work queue (`RD-22`).
- **Amended 2026-11-18 by the architect,** on the [import witness](context-token-1/checks/rf61-import.txt) in slot `f`, at `377ca72df` after a build. That file is on `repo/context-token-1`. Until then, the title said _"so on a page served over plain HTTP the button group module throws when it loads"_.
  - **The import failure is observed.** From a LAN address over HTTP, importing the button group, `mx-button` or `mx-text-field` rejects with the `TypeError` in Chromium 158, Firefox 159 and WebKit 27.2, and no element is defined. `mx-checkbox` loads. From `localhost`, every entry loads.
  - **The reach is wider.** 9 of material-x's 20 exports import the context: every button through `ButtonCore.ts` or `SwitchCore.ts`, both button groups, and the text field through its icon button.
  - **The repair is planned** in the [context-token handoff](context-token-1/context-token-handoff.md) on `repo/context-token-1`: `createContext` derives its token from `Math.random()`. The required property stands. The handoff adds that the token stays a string and that creating one does no other work.
- **Repaired 2026-11-18** on `repo/context-token-1` at `090febe06`, pull request #39. The [feature proof](reviews/context-token-1/feature-proof-claude.md) read the code at `ef8d5cf43` and holds, with no finding in the unit. Both files are on `repo/context-token-1`, and the [handoff's disposition](context-token-1/context-token-handoff.md#disposition-of-the-feature-proof-review-at-8f83af6a3) holds the ruling. **The entry stays open until #39 merges.** The architect then closes it, citing the merge commit: on this branch if it hasn't merged, and otherwise on the main slot's branch.
- **The review's `reviewer-1`** is registered as `RF-62`.
- **Closed 2026-11-18 by the architect:** pull request #39 merged to `main` as `5b0e3e25b`, relayed by the coordinator. The required property holds there. `createContext` returns `` `ydin-context-${Math.random()}` ``, and the review and the import witness above read that code. Its issue is #52. The pull request that carries this closure to `main` says `Closes #52` (`RD-22` property 8).

#### RF-62 — The checkbox's `WithLabel` story calls `crypto.randomUUID`, so it throws in a Storybook served over plain HTTP from a LAN address

Tier C, **closed 2026-11-19** (below). Before closure: open. Registered on 2026-11-18 by the architect, from the context-token unit's [feature proof](reviews/context-token-1/feature-proof-claude.md), `reviewer-1` (code at `ef8d5cf43`), relayed by the coordinator. That review is on `repo/context-token-1`. `RF-61` is the last number allocated on any branch. **No row is disabled.**

**Carried 2026-11-19 by the architect** to `repo/story-http-1` from `repo/work-queue-1` at `1028c65f6`, where it was registered and which hasn't merged, so that its closure merges with its repair. The text from the line above to _Routed_ is that registration's, except where the change line below says. When `repo/work-queue-1` merges `main`, this entry replaces that branch's copy.

- **The code,** read at `377ca72df`: `material-x/src/checkbox/checkbox.stories.tsx:93`, in `WithLabel`, calls `crypto.randomUUID()` when the story renders, for the `id` that a `<label>`'s `htmlFor` names (`:102`–`:103`). The same file's playground story uses a constant id, `PLAYGROUND_ID` (`:70`). Once `RF-61`'s repair is in, this is the only `randomUUID` in `packages/*/src`.
- **Run, not only inferred** ([run](story-http-1/checks/rf62-insecure-origin.txt)). Over plain HTTP from a host other than `localhost`, `crypto.randomUUID` is undefined in all three engines (`RF-61`'s reading). The [story-http plan](story-http-1/story-http-plan.md#scope-only-withlabel) built the site and ran `docs-smoke` from an origin that isn't a secure context: 101 of 102 pages passed. The only failure is the story `checkbox--with-label`, with `TypeError: crypto.randomUUID is not a function`. The checkbox docs page embeds the story and doesn't render it either, but it passed, because the error comes after the page's completion signal, which is outside `RD-14` property 6's observed period. No other story, docs page or third-party page failed. The deployed docs are served over HTTPS and aren't affected.
- **Why the gate didn't see it:** `docs-smoke` served the site on `127.0.0.1` and opened that address. A browser treats loopback as a secure context, so `crypto.randomUUID` exists there, and the gate couldn't fail on this defect, nor on `RF-61`'s.
- **Tier C:** stories aren't in the package's exports, so no consumer observes it, and no gate row renders a story over plain HTTP.
- **Required property:** no story or docs code calls an API that the platform restricts to secure contexts, so every story renders over plain HTTP from any host. The review's alternative, a record stating that the docs need a secure context, isn't adopted: the case is the one `RF-61` calls ordinary, and a label's id needs only to be unique on the page.
- **Not remediated in `RF-61`'s unit,** which changes `@ydinjs/core` alone and whose proof is complete ([disposition](context-token-1/context-token-handoff.md#disposition-of-the-feature-proof-review-at-8f83af6a3)).
- **Routed** to the owner to order, through the work queue (`RD-22`). It is small enough to go with the next material-x unit.
- **The unit:** the [story-http plan](story-http-1/story-http-plan.md) on `repo/story-http-1`, its [properties 1 to 4](story-http-1/story-http-plan.md#the-repair), its [witnesses](story-http-1/story-http-plan.md#how-a-reviewer-proves-it) and its [closure](story-http-1/story-http-plan.md#what-the-closure-needs). The repair is `d6674ecfb`. `WithLabel` takes the constant id `WITH_LABEL_ID`, and `docs-smoke` opens every page at `http://mx-docs.test:<port>`, a name that Chromium maps to `127.0.0.1`, and fails unless the first page reports `isSecureContext === false`. `RD-14` property 6 is amended on the same date.
- **Changed 2026-11-19 by the architect,** with the plan's run and cause. The bullet now titled _Run, not only inferred_ said: _"**Inferred, not run:** over plain HTTP from a host other than `localhost`, `crypto.randomUUID` is undefined in all three engines (`RF-61`'s reading). So in a Storybook served that way, for example from a phone or another machine, the story throws when it renders. The deployed docs are served over HTTPS and aren't affected."_ _Why the gate didn't see it_ and _The unit_ are new. The tier's reason, _"no gate row renders a story over plain HTTP"_, is as registered, and the repair changes it: `docs-smoke` now does.
- **Closed 2026-11-19 by the architect** on `repo/story-http-1` at `0900d5aee` (#74, not yet merged), relayed by the coordinator, per the plan's [closure](story-http-1/story-http-plan.md#what-the-closure-needs). The required property holds: the search finds no secure-context API in what Storybook loads, and the gate renders every story from an origin that isn't a secure context.
  - **The repair is in the tree that merges.** `b04ece9ec` merges `origin/main` at `359c87f8a` after `d6674ecfb`, and `81ae7af1f` merges it again at `d1ea40e22` (#73). #74 carries this record with the repair, so the closure reaches `main` only together with the repair.
  - **Witnesses 1 to 4 are saved** ([witnesses](story-http-1/checks/rf62-repair-witnesses.txt)): the search is empty at the repair and hits line 93 at its parent; 102 of 102 pages pass under `mx-docs.test`; with the story reverted, `checkbox--with-label` fails with the `randomUUID` error; without the resolver rule every page fails, and with the origin back on `127.0.0.1` the `isSecureContext` assertion alone fails the run.
  - **A feature proof read them.** The [feature proof](reviews/story-http-1/feature-proof-claude.md) at `0900d5aee` read the repair at `b04ece9ec`, re-ran witnesses 1 to 4, checked that the id is unique where the story renders, and found no defect.
  - **Witness 5,** read by the architect: #74's run 44457238397 on `b04ece9ec` passed, and its `docs` job 135335388643 logged _"102 of 102 pages passed at http://mx-docs.test:32897/material-x/ in 20.5 s"_. The check fails the run unless the first page is not a secure context, so that assertion held in CI.

#### RF-63 — A shared trait list built with a spread keeps a flattened method trait's dead class layer in an esbuild bundle, and other bundlers aren't measured

Tier C, **closed 2026-11-19** (below). Before closure: open. Registered on 2026-11-18 by the architect, from `RF-44`'s item 3 measurement and the owner's answer on it, relayed by the coordinator. `RF-62` is on `repo/work-queue-1`, so this is the next free number. **No row is disabled.**

- **What was measured** ([W1](traits-plugin-1/checks/item3-witness.txt)), by the implementer, with esbuild 0.28.1 (`--bundle --minify --format=esm`), at `17065ddf0`. `icon-button`, `switch-button` and `switch-icon-button` grow by 84 minified bytes against the per-class form. The five other adopters grow by 19 or 20. Of the 84, 64 or 65 bytes are dead code:
  - `ICON_BUTTON_CORE_TRAITS` (`IconButtonCore.ts:56`) and `SWITCH_CORE_TRAITS` (`SwitchCore.ts:33`) are module-level arrays built with a spread, `[...BUTTON_CORE_TRAITS, …]`;
  - after flattening, nothing reads them at runtime, and esbuild keeps them, with every trait they name. That now includes `FocusForwarding`'s `trait(…)` call and its class layer;
  - **this predates the unit:** the same lists already kept the generic trait runtime in these entries and in `fab`, in both forms;
  - a variant that names the trait in each host's own list grows every entry by 19 to 21 bytes. It wasn't adopted.
- **The owner's hypothesis, not tested:** a tree-shaking bundler removes the dead lists, either rolldown, which this repository builds with and measures sizes with (`size-limit-preset-rolldown`), or a consumer's bundler. esbuild is one such bundler, and it keeps them. Whether a spread of an imported array can be removed depends on what the bundler assumes about the spread's iteration.
- **Tier C:** only shipped bytes change, by at most 65 per entry. The lists are exported, so a library build that doesn't bundle them keeps them by definition. Only a bundle decides.
- **Required property:** one of these holds:
  - in each bundler the record names, no adopter's bundle carries a trait list or a trait layer that flattening has made dead;
  - or the record states which named bundler keeps them, by how many bytes, and why that is accepted.
- **The architect's direction,** for the unit that takes it: measure before any change. Bundle the eight adopters' entries at the head with rolldown, at the repository's version, through `size-limit-preset-rolldown`, and with esbuild as W1 did. For each entry, record whether `Symbol("FocusForwarding")`'s `trait(…)` call and the spread lists survive, and the bytes. The architect then rules from that reading. The bundler set is rolldown and esbuild unless the owner names another.
- **Routed** to the owner to order, through the work queue (`RD-22`). The owner accepted the growth for now. **It doesn't block** `RF-44`'s pull request.

**Dated 2026-11-19 by the architect: this entry closes with `RD-26`'s migration, and the repair on hold isn't needed.**

- **No shared list is left.** Under `RD-26`, each `*_TRAITS` value list becomes a tuple type, and each component's brand install is a generated literal, `impl(this, $a, $b)`. So a bundler has no runtime list to keep.
- **A trait class that only brands drops** where nothing uses `instanceof`, because the trait's own build installs the brand as a static `[Symbol.hasInstance]` method, which has no side effect (`RD-26` property 7, amended 2026-11-19). [P41](trait-decorators-1/trait-decorators-plan.md#evidence), with rolldown, gives 1,486 B against 1,988 B. [P42](trait-decorators-1/trait-decorators-plan.md#evidence) shows that the class drops with the static method in both bundlers.
- **The closure reads both named bundlers.** P41 measured rolldown only, and this entry names rolldown and esbuild. So the closure reads the eight `FocusForwarding` adopters' entries at the migration's last commit, with both bundlers, as this entry's direction states: whether the brand install, a trait class or a list survives; `instanceof` in each bundle that keeps a trait class; and the bytes.
  - If esbuild keeps a trait class, the closure records it under the required property's second branch: the bundler, the bytes and why that is accepted.
- **Eleven size rows shrink at `2bf0418ab`,** outside proof 4's noise bound, because core's runtime trait factory left the bundles.
  - Seven entries carried it because of this entry's defect: a module they import kept a dead spread of a shared trait list. One of them, `button/split-button`, also exports a trait object.
  - Three carried it only because the entry exports a trait object: core's `traits/reorderable`, `fab/fab` and `checkbox/checkbox`.
  - The eleventh row is `complete`, which holds all of them.
  - The owner accepted all eleven on 2026-11-19, relayed by the coordinator: a decrease is always approved under his standing rule.
  - Each row's cause is in [`size.md`](trait-migration-1/checks/size.md), and the plan's proof 4 records the acceptance. The closure cites them.
- **It closes** on that reading, on `repo/traits-migration-1`, before its pull request opens. The architect writes the closure.

**Closed 2026-11-19 by the architect** on `repo/traits-migration-1` at `aa73be64e`, not yet merged, relayed by the coordinator. It rests on the migration's [proofs](trait-migration-1/checks/proofs.md) and on the adopters' [reading](trait-migration-1/checks/rf63-adopters.txt) ([script](trait-migration-1/checks/rf63-adopters.ts)). The required property holds by its first branch, in both named bundlers.

- **No list is left.** No package's sources build a trait list as a value: each list is a tuple type, and each brand install is a generated `impl(this, …)`.
- **No adopter's bundle keeps a trait class.** All eight adopters' built entries were bundled, minified, with rolldown 1.3.2 and esbuild 0.28.1. Each of the 16 bundles keeps no trait class, so no `[Symbol.hasInstance]` method survives. esbuild drops them as rolldown does. The bytes per bundle are in the reading, from 14,655 B (`list-button-item`, rolldown) to 25,920 B (`switch-icon-button`, esbuild) minified.
- **`instanceof` holds where a class is kept.** With `instanceof Disableable` added, each bundle keeps that one class. In Chromium, an adopter, a `div` and `null` read `true`, `false` and `false`, in all 16.
- **The size rows:** the eleven decreases above, which the owner accepted.
- **What reopens it:** a runtime trait list, or a bundle of an adopter that keeps a trait class it never tests with `instanceof`.
- **GitHub:** issue #63. The migration's pull request closes it.

#### RF-64 — The list item sets `--_support-row-size`, which no rule reads, and clamps its supporting text to two lines whatever the item's line count

Tier C, **open**. Registered on 2026-11-18 by the architect, from the host-has fallback unit's `implementer-1`, which the [feature proof](reviews/host-has-fallback-1/feature-proof-rf40-claude.md) of its items 1 and 2 confirmed, relayed by the coordinator. `RF-63` is on `repo/traits-plugin-1`, so this is the next free number. **No row is disabled.**

- **The code,** read by the architect at `90789d260`. `list/styles/item/main.styles.css:48` sets `--_support-row-size: calc(2 * var(--_supporting-text-line-height))` in the rule for an item with both `support` and `overline`. Nothing in `packages/` reads it.
- **Since `ede90d958`** (_refactor(material-x): fix list-item styling_, 2026-05-17). That commit replaced `.support`'s `max-block-size: var(--_support-row-size, 0)` with `calc(2 * var(--_supporting-text-line-height))`, whatever the line count, and removed the declaration that set one line.
- **Not established:** whether the two-line clamp is right for an item with `support` alone. Its container takes the two-line height, and wrapped supporting text would show two lines in it. Neither Material's tables nor a rendering was read for that case.
- **Tier C,** as the dead declaration. If the reading shows that a two-line item should clamp its supporting text to one line, that is a rendering a consumer sees, and the entry is re-tiered by consequence.
- **Required property:** the list item's supporting text is clamped to the line count that Material gives for the item's configuration, and no declaration remains that no rule reads.
- **The architect's direction,** for the unit that takes it: read first. Read Material's list item tables through tproc, and render an item whose supporting text wraps, with `support` alone and with `support` and `overline`, in all three engines. The repair is decided from that reading.
- **Routed** to the owner to order, through the work queue (`RD-22`). **It doesn't block** #59.

#### RF-65 — CI's merge-base size reading has failed on every pull request since `RD-7` was implemented, so no size comment shows a base or a difference

Tier B, **closed 2026-11-19** (below). Before closure: open. Registered on 2026-11-18 by the architect, from `reviewer-1` of the [feature proof](reviews/mx-size-1/feature-proof-claude.md) of `RD-24`'s rows and the coordinator's report on #68, relayed by the coordinator. `RF-64` is on `main`, so this is the next free number. **No row is disabled.**

- **Observed.** The `measurements` job's _Sizes at the merge base_ step (`.github/workflows/verify.yml`) runs `aube ci` in a worktree of the merge base, then `just size-reading`. `.scripts/size-reading.ts` first runs `just build` in `box-quad`, which runs `tsdown` alone. Its configuration imports `.scripts/tsdown-library.ts`, which imports `@ydinjs/vite-traits-plugin`, and that package's `index.js` is build output that nothing in the worktree has built. The step logs `Cannot find module '…/_temp/base/node_modules/@ydinjs/vite-traits-plugin/index.js'` and the notice _"The merge base gave no machine-readable size reading"_. The architect read this in #68's run 44279774938 (job 134717402054, merge base `a133bebee`).
- **Since the first merge base that had the script.** #29's run 44012472388, on merge base `275ad0f5c`, which is #27 and `RD-7`'s implementation, fails the same way. Every size comment the architect read opens with "No base reading": #27 to #31, #33 to #35, #37 to #39, #59, #61 and #66 to #68. #36 has no size comment. So no comment has ever shown a base. The feature proof's _"#37, #38, …"_ and the coordinator's _"since about #37"_ read fewer comments.
- **Why the head side reads.** The job's _Measurement rows_ step runs `just test` first, and its `_package-builds` builds `vite-traits-plugin` along with `box-quad`, `core`, `tproc` and `vite-custom-element-assets`. So the head's reading depends on an earlier step. The four packages whose `tsdown.config.ts` uses `.scripts/tsdown-library.ts` are `box-quad`, `core`, `tproc` and `drag`. Each needs the plugin's build, and none declares the plugin.
- **What it falls short of:**
  - **`RD-7` property 5:** the base, the difference, and the _added_ and _removed_ marks. Its _"no base reading"_ clause is for a base whose instruments can't give the reading. These bases have the instruments, and the reading fails on a build that nothing ran.
  - **`RD-24` property 5's comment, and its **Why**.**
  - **The size plan's step 4,** _"as added"_.
- **Tier B:** an instrument the repository relies on gives no answer, and the comment reports that as an expected absence.
- **What stands in until the repair:** each unit's own reading before and after its change, as `RD-24` property 5 requires for material-x and CONTRIBUTING §15 for every package.
- **Required property:** in a tree where only `aube ci` has run, `aube exec just size-reading <output>` exits 0 and writes every row that the root `just size` measures. The merge-base step then reads every base that contains the repair with the base tree's own instruments, as `RD-7` property 5 states, and the workflow needs no change.
- **The architect's direction,** for the unit that takes it:
  - **Declare the prerequisite once,** where the build order is derived. Each package whose build imports `@ydinjs/vite-traits-plugin` declares it, and the reading builds each package so that its declared prerequisites build first. `size-reading.ts` keeps no second, hand-kept list of packages to build.
  - **Witness 1:** in a fresh worktree at the repair's commit, after `aube ci`, `aube exec just size-reading` exits 0 with every row. At the parent commit it fails as above. Save both.
  - **Witness 2:** the first pull request whose merge base contains the repair shows a base reading and the differences in its comment. A pull request whose merge base predates the repair still says "No base reading", as `RD-7` property 5 allows. That isn't a failure of the repair.
- **Not established:** whether `_package-builds`, which builds the plugin beside the four packages in one `nx run-many`, orders the plugin first, or succeeds because the plugin happens to finish first. The direction orders it either way.
- **Routed** to the owner to order, as its own unit, through the work queue (`RD-22`). The architect recommends ordering it before the next pull request that changes a measured package's runtime output. **It doesn't block** #68. #68's merge base predates any repair, so the repair in #68 wouldn't give #68 a base reading.

**Dated 2026-11-19 by the architect: the repair is `main`'s stored reading, and the cause is wider than recorded.** On the [base-reading plan](size-base-1/size-base-plan.md) (issue #69) on `repo/size-base-1` at `ddbfbbdfd`, and the owner's choice, relayed by the coordinator. The owner chose option (b), `main`'s own reading kept as a workflow artifact, and `RD-7` property 5 is amended on this date.

- **Correction to _Why the head side reads_:** _"none declares the plugin"_ is wrong. `core`, `tproc` and `material-x` declare `@ydinjs/vite-traits-plugin` in `implicitDependencies` in their `project.json`. `box-quad` and `drag` don't, and their two `build` tasks are the only ones in nx's task graph without an edge to the plugin's build ([graphs](size-base-1/checks/task-graphs.txt)).
- **Three more prerequisites are missing in a fresh tree:** `size-limit-preset-rolldown`, `@ydinjs/vite-custom-element-assets` and `@ydinjs/tproc`. With only `aube ci` run, the reading also needs those three built. nx's task graph already orders all three before the packages that need them ([layers](size-base-1/checks/fresh-tree-layers.txt)). CI shows only `box-quad`'s failure because the reading stops at the first failure.
- **_Not established_ is answered:** `_package-builds` builds `box-quad` after the plugin by schedule, not by declaration. In run 44284889649 the plugin's build finished at 10:24:37.098 and `box-quad`'s at 10:24:38.107, with no edge between them ([CI excerpt](size-base-1/checks/ci-merge-base-failure.txt)).
- **An observation to add:** the root `just size` also passes by schedule. Only material-x's `size` target declares `dependsOn: ["^build"]`, and `nx.json` gives `size` no default, so the `size` tasks of `box-quad`, `core` and `drag` depend on nothing. They pass in a fresh tree because nx runs material-x's prerequisite builds before them at `--parallel=1`. Nothing has failed, so this is a latent defect, not an observed one. The plan's property 3 repairs it.
- **Required property, amended:** each pull request's size comment compares the head with the reading that `main`'s own run stored for the merge base, or says that none is stored. (It said: _"in a tree where only `aube ci` has run, `aube exec just size-reading <output>` exits 0 and writes every row that the root `just size` measures. The merge-base step then reads every base that contains the repair with the base tree's own instruments, as `RD-7` property 5 states, and the workflow needs no change."_) The fresh-tree reading stays owed, as the plan's properties 1 and 2 and witness 1, because `main`'s stored reading is now every pull request's base and mustn't depend on an earlier step.
- **The architect's direction above is superseded** by the plan's [repair](size-base-1/size-base-plan.md#the-repair-for-b-with-the-artifact), [witnesses](size-base-1/size-base-plan.md#how-a-reviewer-proves-it) and [closure](size-base-1/size-base-plan.md#what-the-closure-needs). Its rule of one declaration per package that imports the plugin, and no hand-kept build list in `size-reading.ts`, is the plan's properties 1 and 2.
- **Routed** to the implementer on `repo/size-base-1`, as the plan's [Order](size-base-1/size-base-plan.md#order) states. The entry stays open. It is repaired once the change merges, and it closes on the plan's [closure](size-base-1/size-base-plan.md#what-the-closure-needs): witnesses 1 to 3 saved and read by a feature proof, and witnesses 4 to 6 observed after the merge.

**Closed 2026-11-19 by the architect** on `repo/story-http-1` at `0900d5aee`, the branch that merges next, relayed by the coordinator, per the plan's [closure](size-base-1/size-base-plan.md#what-the-closure-needs). The amended required property holds: #74's size comment compares the head with the reading that `main`'s own run stored for its merge base, and #72's comment said that none was stored.

- **The owner chose (b), and `RD-7` is amended** (2026-11-19, above).
- **The repair is merged:** #72, as `359c87f8a`.
- **Witnesses 1 to 3 are saved** ([1](size-base-1/checks/witness-1-fresh-tree.txt), [2](size-base-1/checks/witness-2-ordering.txt), [3](size-base-1/checks/witness-3-graphs.txt)), and the [feature proof](reviews/size-base-1/feature-proof-claude.md) re-ran them at `910c5e4b3`, byte for byte. The [narrowed proof](reviews/size-base-1/feature-proof-lookup-claude.md) read the lookup's paths at `d41499005`.
- **Witnesses 4 to 6, read by the architect after the merge:**
  - **Witness 4.** `main`'s push run 44456046120 on `359c87f8a` succeeded. Its `measurements` job 135331418124 uploaded `head-size.json`, the file that its report reads as the head, as the artifact `size-reading`, id 14497722541, 779 bytes, expiring 2027-02-17. The downloaded file holds 33 rows, as the root `just size` measures (witness 1).
  - **Witness 5.** #74's run 44457238397, merge base `359c87f8a`, logged _"base reading: run 44456046120, artifact 14497722541"_ and passed that file as `--base`. The comment, posted at 04:19:34, shows a base and a change for all 33 rows. Every change is 0, as expected, because #74 changes no measured entry. The comment's base column equals the downloaded artifact, row for row.
  - **Witness 6.** #72's run 44451082302, merge base `91fc5d662`, which stored no reading, gave the notice _"main's run for the merge base 91fc5d66… stored no size reading"_, its `measurements` job succeeded, and its comment opens with _"**No base reading:** `main`'s run for the merge base stored no size reading"_.
- **Not observed in a run: witness 5's probe,** a change that adds bytes to one measured entry and shows a non-zero change for that row only. No pull request since the merge changes a measured entry. The architect closes without it, because each part it would show is established another way:
  - the base is `main`'s file, not the head's: the run passes the downloaded artifact as `--base` and its own reading as `--head`, and the comment's base column equals the artifact;
  - the change is computed per row from those two files, and `.scripts/size-report.node.test.ts` checks a grown, a shrunk, an unchanged, an added and a removed row. Those rows passed in #74's `chromium` job.
- **What reopens it:** a comment whose base or change disagrees with `main`'s stored reading for the merge base. The first pull request that changes a measured entry, expected to be `RF-63`'s, shows the non-zero change. The architect reads it then.
- **The dated notes that `RF-65` caused are closed** in `RD-6`, `RD-7` and `RD-24`, on the same date.

#### RF-66 — The flattener doesn't follow re-exports, so a trait or a component's base imported through a barrel module is refused

Tier B, **open**. Registered on 2026-11-19 by the architect, from `verifier-3` of the [repair verification](reviews/traits-migration-1/repair-verification-claude.md) of PR #76 at `abc945b47`, and Architect B's [ruling](trait-decorators-1/trait-migration-plan.md#verifier-3-a-base-or-a-trait-through-a-re-export) at `ea5fefe46`, relayed by the coordinator. `RF-65` is the highest number on any branch on `origin`, so this is the next free number. **No row is disabled.**

- **Observed** ([witnesses](reviews/traits-migration-1/checks/repair-verification-witnesses.txt), V-W5):
  - K4: a base imported from a module that does `export { SBase } from './sbase.ts'` gives `static-kind`, _"the base's class chain can't be read to find its kind"_;
  - K5: a trait imported through a re-export gives `trait-unresolved`, _"isn't a class whose static block calls trait(this)"_.
- **Why.** `heritageClass` (`vite-traits-plugin/src/composition/annotation.ts:402`) follows one `import` to its module, and looks for the class only among that module's own classes. `export { X } from`, `export { X as Y } from` and `export * from` aren't followed. The base's walk uses it for each class in the chain, so a parent class reached through a re-export is refused too. A trait reference is resolved the same way.
- **Its reach.** A base's walk runs for nearly every composition, because every attribute trait contributes `observedAttributes`, and the base's declared kind is a contributor (`RD-26` property 3). So a base from a barrel module refuses almost every component. A trait through a barrel was already refused at `0c5705d87`, but a base through one still built. It is refused since the repair of `reviewer-2`, which reads the base's declared kind.
- **Nothing in the repository hits it.** material-x imports `ControlledElement` from `@ydinjs/core/element.js`, which declares it. The refusal is safe: it fails the build, never flattens wrongly.
- **Tier B:** a valid composition is refused, with a message that names the class chain rather than the re-export. `@ydinjs/vite-traits-plugin` isn't published yet, so no user has met it.
- **Required property:** a trait or a base reference resolves through named and star re-exports, including a renaming one, by following the module graph through the loader. This holds for each class in a base's chain too. An ambiguous star export, or a cycle, is `trait-unresolved`.
- **Until then:** under the ruling, the plugin document states the limit before PR #76 merges. A trait or a component's base must be imported from the module that declares it, or the build is refused (`trait-unresolved`, or `static-kind` for a base).
- **It must close before `@ydinjs/vite-traits-plugin` is first published.** It doesn't block PR #76.

#### RF-67 — tproc's token snapshot has no recorded provenance, mixes two database versions, carries personal data, and a missing file is fetched from `latest` while tests run

Tier B, **open**. Registered on 2026-11-20 by the architect, on `tproc/tokens-source-1`, from the reading for issue #82 ([plan](tokens-source-1/tokens-source-plan.md#what-the-sites-data-does)). `RF-66` is the highest number on any branch on `origin`, so this is the next free number. `RD-28` proposes the repair. **No row is disabled.**

- **Observed** ([addresses](tokens-source-1/checks/site-addresses.txt), [snapshot against `latest`](tokens-source-1/checks/snapshot-vs-latest.txt)):
  - the committed component tables report database version `35.0.28` and the system tables `37.0.32`, and nothing in the repository records which release they came from;
  - the same addresses serve `41.1.12` today. In 8 of the 14 tables, 52 tokens were added and 333 tokens' values or reference trees changed. The responses send `no-store` and no `ETag` or `Last-Modified`;
  - `DB.ts`'s `download` fetches the table from `latest` when its cache file can't be imported (`DB.ts:54`). So a missing or unreadable file makes a test or build run read whatever the site serves that day, and write it into the snapshot;
  - the committed `COLOR` table lists 38 distinct Google employee email addresses under `system.settings`, and the tables carry account ids under `revisionAuthor`. tproc reads neither;
  - the snapshot is 147 MB, pretty-printed.
- **Tier B:** no rendering changes while the files are present. The visual-contract tests take their token oracle from this snapshot, so an instrument the repository relies on has no recorded provenance and can change silently.
- **Not a defect:** the addresses don't name content hashes. `20543ce18892f7d9` is the design system's id and `TOKEN_TABLE.<id>` the component's id. The site also serves each release under a dated address, so a release can be pinned.
- **Read again on 2026-11-20 by the architect: where the personal data is** ([reading](tokens-source-1/checks/history-scan.txt)). Only counts and locations are recorded.
  - **In git:** 63 blobs, under 39 paths in three directories. `.data/tokens/` dates from 2025-11-25, `packages/material-x/.data/tokens/` from 2026-03-24, and `packages/tproc/.data/tokens/` from 2026-07-13. Every one of the 72 refs GitHub serves reaches them: 13 branches, 55 `refs/pull/N/head` and 4 `refs/pull/N/merge`.
  - **Not outside git on GitHub:** the 84 issues and pull requests, their 71 comments, the 56 unexpired artifacts (the deployed docs site among them) and the 271 run logs that still exist hold no copy. 124 logs have expired. There are no review comments, reviews, commit comments, releases, tags or forks, and the wiki and discussions are off.
  - **On this machine:** the main checkout, slots b–f and two scratch worktrees have the tables checked out. One transcript of the architect's session holds two of the addresses, which a probe printed on 2026-11-20.
  - **The data isn't only in `system.settings`.** Across the 14 committed tables, addresses occur 630 times:
    - 546 in `settings`' `emailAddress` values;
    - 14 in `system.author.email`;
    - 70 in `system.componentDisplayGroups[].revisionAuthor.email`.

    `revisionAuthor` also carries the account ids. The store keeps none of these fields, and the final scan of `RD-28` property 4 refuses any address that a kept field might carry.

  - `RD-28` stops the data entering the tree, and `RD-29` removes it from the history.

#### RF-68 — `mx-list` is exposed as a list whose items aren't list items

Tier A, **open**. Registered on 2026-11-20 by the architect, on `repo/list-sortable-1`, while answering the owner's question about focus for `RD-31`. `RF-67` is the highest `RF-` on any branch on `origin`, so this is the next free number.

- **What happens:** `mx-list` sets `role="list"` through its internals (`src/list/list.ts`). No list item sets a role: `mx-list-item`, `mx-list-button-item` and `mx-list-link-item` set none, and their hosts are `display: contents`. In Chromium 158, the list is `list`, and each item is `generic`, with its text, `button` or `link` inside ([reading](list-sortable-1/checks/list-a11y.txt), [probe](list-sortable-1/probes/list-a11y.ts)). WAI-ARIA requires a `list` to contain `listitem` elements. A screen reader that counts the items of a list, or moves from item to item, gets nothing from this one.
- **What is established:** the roles in Chromium's tree, by that reading. Firefox, WebKit and the screen readers themselves aren't read.
- **Required property:** each item of `mx-list`, and of `mx-sortable-list` once `RD-31` adds it, is exposed as a list item. The button and the link inside an interactive item keep their roles, names and focus.
- **Not in `RD-31`'s scope.** `RD-31` doesn't change item roles, and its sortable list has the same items.

**Dated 2026-11-21 by the architect:** the owner calls the missing role a bug to fix, in its own unit outside `RD-31`, relayed by the coordinator. #92 tracks it. `RD-31`'s third amendment makes a static item without a handle a tab stop in `mx-sortable-list`, so the fix also gives that focused item its role. Neither unit waits for the other.

**Dated 2026-11-21 by the architect: the repair is decided, and the entry moves to the fix's branch.** The [handoff](list-roles-1/list-roles-handoff.md) holds the readings, the decision, the properties and the proofs. The repair is **Unimplemented**.

- **Read in three engines** ([reading](list-roles-1/checks/list-roles.txt), [probe](list-roles-1/probes/list-roles.ts)): Chromium 158, Firefox 159 and WebKit 27.2, through each engine's own accessibility tree. In WebKit the list is `group`, not `list`, and no item has a node. Screen readers still aren't read.
- **Decided:** `listitem` goes on the item's row, the outermost element of its shadow tree that has a box. For `mx-list-item` that is its `.host`, which `RD-31` makes take focus. Each interactive item gains a row element around its button or link, and the row has no box while its control is in the top layer. The host keeps `display: contents` and sets no role. The required property is unchanged.
- **Not adopted:** the role on the host. WebKit then puts each interactive item's button or link outside its item, because it parents shadow content by its box past a `display: contents` host.
- **Seen, not registered:** WebKit parents an item's slotted light-DOM nodes by the DOM, past the host, so the label text and a handle are the list's children in WebKit, with the role anywhere but on a host with a box. It is on `main` already, it isn't this entry's property, and it has been read only in Playwright's WebKit build.
- **The record lives on `material-x/list-roles-1`,** because the repair lands there and #90's merge date isn't known. That branch carries this entry and byte-identical copies of the reading and the probe registered with it. #90 removes its copy of the entry, and further datings are made on the fix's branch.
- **Size:** _small_. A few tens of bytes on three list rows, and no row has a limit (`RD-24`).

**Dated again 2026-11-21 by the architect: the repair is re-ruled,** at `001f8d833`, on the owner's principle for hosts and his rule on shadow-tree elements, relayed by the coordinator. The [handoff](list-roles-1/list-roles-handoff.md#the-decision) holds the new decision, the readings and what it replaces. The repair is **Unimplemented** in its new form.

- **Decided:** each item's host takes a box (`display: block`) and `listitem` through its internals, and the row element goes. Read in three engines: the layout is `main`'s, and every control and slotted node is inside its item, WebKit included. While an item's `.host` is lifted, a state toggled from its `beforetoggle` takes the host's box away. The interactive items drop `FocusForwarding`, because Firefox delegates focus through a box host.
- **This replaces the _Decided_, _Not adopted_ and _Seen, not registered_ items of the dating before.** They said: _"`listitem` goes on the item's row, the outermost element of its shadow tree that has a box. [...] The host keeps `display: contents` and sets no role."_; _"the role on the host. WebKit then puts each interactive item's button or link outside its item, because it parents shadow content by its box past a `display: contents` host."_; and that WebKit's split of slotted nodes stays, which the box host now repairs for the list items.
- **Owner question,** in the handoff: whether a consumer's `tabindex` on an `mx-list-item` host stands as a tab stop. `RD-31` gets a follow-up on its branch.

**Dated a third time 2026-11-21 by the architect: the repair is re-ruled again,** at `4c727d25d`, on the owner's direction to fold `mx-list-item`'s inner `div` into its host in this unit, relayed by the coordinator. The [handoff](list-roles-1/list-roles-handoff.md#the-decision) holds decisions 1 and 3 as re-ruled, the readings, and [what they replace](list-roles-1/list-roles-handoff.md#what-the-second-re-ruling-replaces). The repair is **Unimplemented** in this form.

- **Decided:** `mx-list-item` has no inner element and no part `impl`: its host is its box, with its layout and its elevation on `:host`. Every item's drag lifts its host, so the `lifted` state goes. While core's trait lifts a host, its `:host` rule's own padding, overflow, color and background keep the UA popover's values out. Read in three engines ([reading](list-roles-1/checks/list-fold.txt), [probe](list-roles-1/probes/list-fold.ts)): the layout and the pixels are `main`'s, a lifted host keeps its rect and the list its size, and focus reaches a static host with `tabindex` and survives a lift. The trees are clean ([reading](list-roles-1/checks/list-roles-fold.txt)).
- **This replaces the _Decided_ item's lift of the dating before:** _"While an item's `.host` is lifted, a state toggled from its `beforetoggle` takes the host's box away."_ It also replaces the ruling that kept `mx-list-item`'s `div` and made its fold `RD-31`'s follow-up.
- **`architecture.md`'s `.host` invariant gains a case,** _the host is the box_, for `mx-list-item`.
- **`RD-31`'s follow-up** writes a static item's tab stop and description on its host, and drops its `visual` callback and `mx-list-item`'s `FocusForwarding`. The owner question stands, and the fold strengthens the recommended answer.
- **Seen, not registered,** in the handoff: the list items and the FAB draw no penumbra, because their `all: unset` resets the elevation's `box-shadow`, and `interactive.styles.css` ships nowhere.

## Questions

#### RQ-1 — The `TE-` local register's decisions and design-pass findings have no canonical assignment

`architect-test-execution-model-r4.md` §The local register carries forty-odd rows whose `Canonical` column reads `unassigned`. This closure assigns `RF-1`…`RF-22` over the findings a **review pass** produced, and stops there for a reason that is not arbitrary: `TE-D12`…`TE-D21` are decisions, and RD-1 keeps the kind letter separate precisely because **only the architect mints one**; `TE-F1`…`TE-F35` are the design and challenge passes' own findings, which no review pass owns and which a consolidator numbering them would be allocating on someone else's behalf.

**What is owed** is one architect pass that mints `RD-` over the decision rows and `RF-` over the design-pass findings, continuing from the `RF-22` high-water mark this entry sets (**`RF-23` to `RF-25` were minted separately 2026-11-04 and `RF-26` to `RF-30` 2026-11-05, `RF-31` 2026-11-13, and `RF-32` 2026-11-14, so the next is `RF-33`**), and fills the `Canonical` column in that document's table. Until it is taken, a citation of any of those rows is document-local and resolves through the file rather than through `entry.ts`.

#### RQ-2 — Does a switch in a button group follow the group's `value` when the switch's own `value` changes, through a reactive value?

**Opened 2026-11-18 by the architect,** on the owner's direction relayed by the coordinator. **Not for now.** The owner: _"Hmm… it looks like this calls for a signal (yes, we don't use them now, it's just a direction)."_

- **The behavior:** when a switch's own `value` changes while its group has a value, the switch isn't reconciled until the group's `value` next changes. It was accepted in the host-invariant handoff's [disposition of the targeted recheck](host-invariant-1/host-invariant-handoff.md#disposition-of-the-targeted-recheck-at-c1a40a3fc). That handoff's item 9 names the two events on which the group writes `checked`: a join, and a change to the group's `value`. `connected-button-group.mdx` and `button-group.mdx` state the same.
- **Why a question, not a finding:** the code does what the ruling and the documentation say, so no stated property is broken. Tier goes by consequence, and a consumer would observe this, so as a defect it would be Tier A. It isn't a defect.
- **The question:** should material-x's properties become reactive values that a group can observe, so that the group's match holds whenever the group has a value? That is the stronger invariant the disposition named.
  - It is a design question for `@ydinjs/core`'s component model, not a repair of the group.
  - The disposition rejected reconciling on the switch's own `value`, because that makes the group a second writer that reacts to consumer writes. A reactive value would change that premise. It wouldn't make the group a second writer.
- **What answers it:** a design unit for reactive values in `@ydinjs/core`, when the owner orders one. The stronger invariant would then be a decision of its own. Until then, the ruling stands.
- **Routed** to the owner, through the work queue (`RD-22`), as not for now.