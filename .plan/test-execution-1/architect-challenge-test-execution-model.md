# Independent challenge — the test execution model

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `008b649db`.** An
independent challenge to
[`architect-test-execution-model.md`](architect-test-execution-model.md) and to
the decisions and findings it proposes (D-199…D-204, I-38, F-432…F-438), against
the live tree and against evidence taken in this session.

**No identifier is claimed here.** Every heading below mentions ids in the form
`CONTRIBUTING.md` §Reading one entry prescribes; nothing sits at `####`. That is
deliberate, and §Registration explains why it has to be.

**Outcome: the design's central holdings stand. Six grounds do not.** One
preferred mechanism is refuted by execution and must be reversed; one finding's
diagnosis is not established by the evidence quoted for it; one decision's A/B
does not isolate the effect it is attributed to; two decisions assert
repository-wide conclusions from a single package; and one decision both settles
a question and defers it to the owner. Registration does not follow the live
D-196 rules in any respect, and because of that none of the six decisions is yet
in force — which is what makes every correction below cheap.

## Scope and instruction boundaries

In: the design document, the six decisions, the obligation, the seven findings,
and the live code they rest on — `.scripts/vitest-config.ts`, `.scripts/vite-config.ts`,
`vitest.config.ts`, `nx.json`, the root and `packages/material-x` `Justfile`s,
`packages/vite-custom-element-assets/src/`, `.scripts/tsdown-component.ts`,
`.storybook/main.ts`, `.github/workflows/docs.yml`, `.vscode/settings.json`, and
the installed `vitest@4.1.10` / `@vitest/browser-playwright` / `nx@23.1.0`
bundles.

Out, by instruction: the unrelated `tproc` failures, F-412, and the stale-MCP
lifecycle question. The last is named once, at §D-202's robustness, only as a
term bounding a figure — no disposition is proposed for it. The independent
review of `5f894e0c2..2aeda69fd` is untouched.

**No design was implemented.** The plugin, the shared factory and every
configuration are unmodified; `git status` is clean. The two probes below are
throwaway fixtures in the session scratchpad.

## What reproduced

Verified first-hand, in this container, against the code actually installed.
Each is cited to the file and line a reader can open.

### The container misreports its budget (F-433)

Reproduced in every figure. `/sys/fs/cgroup/memory.max` = 17 179 869 184 B =
16 GiB, from `--memory=16g` in `.devcontainer/devcontainer.json:5`.
`os.totalmem()` = 46.74 GiB. `os.availableParallelism()` = 12.
`v8.getHeapStatistics().heap_size_limit` = 4192 MiB. `cpu.max` = `max 100000` —
no quota. `free -m` reports the host's 47 861 MiB. Every self-sizing default in
the toolchain is derived from a machine roughly three times the enforced one.

### The CLI bound cannot reach a browser project (F-432)

Confirmed at source in `vitest@4.1.10`, with one correction.

- `resolveProjects`' CLI allow-list is `cli-api.BK8pd4xc.js:11082–11102`. It
  holds **20** names, not the 21 the design states — I enumerated them. `maxWorkers`
  is absent; `fileParallelism` is present.
- `getThreadsCount` (`:2479–2484`) reads `project.config.maxWorkers` and nothing
  else, so a browser project sees only what was set at project level.
- `resolveMaxWorkers` (`:3765–3771`) is the node-pool-only root fallback, and
  `:3767` is the sole occurrence of `vitest.config.maxWorkers` — verified across
  all of `node_modules/vitest/dist` and `node_modules/@vitest`.
- `VITEST_MAX_WORKERS` does reach browser projects: `coverage.DM_a_rWm.js:380`
  assigns `resolved.maxWorkers` inside `resolveConfig`, which is invoked per
  project at `cli-api:10929`. The design's aside is right.

### Nothing bounds browser concurrency across projects (the L2 mechanism)

Confirmed at source.

- Browser specs are lifted out of the group's node task list
  (`cli-api:3642–3645`) and pushed to the browser pool as a sibling promise
  (`:3707–3711`), while `pool.setMaxWorkers(maxWorkers)` at `:3696` binds only
  the node pool. Groups themselves are awaited one at a time (`:3695–3712`).
- Inside the browser pool, every parallel-capable project starts together:
  `await Promise.all(parallelPools.map((runTests) => runTests()))` at `:2473`.
- **One elision in the record.** The parallel branch requires
  `pool.provider.mocker && pool.provider.supportsParallelism` (`:2470`), not
  `supportsParallelism` alone; a provider without a mocker would be pushed to
  `nonParallelPools` and run sequentially. The Playwright provider sets both —
  `supportsParallelism = true` at
  `@vitest/browser-playwright/dist/index.js:832` and `this.mocker = this.createMocker()`
  at `:848` — so the conclusion holds. The record states half the predicate and
  should state both, because the half it omits is the one that could change the
  answer for a different provider.
- Watch mode halves the per-project bound to 5: `Math.max(Math.floor(11 / 2), 1)`
  at `:2405`. Reproduced.

### A finished browser project is never released (F-435, mechanism)

Confirmed at source: providers are closed only in the pool's own `close()`
(`cli-api:2487–2497`). Nothing releases a project when its specs finish.

### The root configuration's shape

Confirmed exactly. `createWorkspaceTestConfig`
(`.scripts/vitest-config.ts:390–445`) declares **15 projects**, of which
**7 are browser projects** — material-x `browser`/`spec`/`visual`, `core`,
`box-quad`, `drag`, `drag2`. Per package: material-x 3 browser + 1 node; `core`
1 browser + 1 declaration; `box-quad` 1 browser; `drag` and `drag2` 1 browser +
declaration + node each; `tproc` and `vite-traits-plugin` node only. **D-202
binds `@ydinjs/material-x` alone**, as it says.

### The unbounded worker spawn (F-434)

Confirmed at source and independently measured.

`packages/vite-custom-element-assets/src/index.ts:201–259` — the `load` handler
constructs `new Worker(new URL('./css/css-worker.js', …))` for every module
matching `/\.css\.ts/u`, awaits its single message, and returns. There is no
pool, no queue, no cap, and no `terminate()`. The `MessageChannel`'s `port1` is
never closed either, so the channel and the `addWatchFile` closure are retained
per module for the life of the process. The worker's whole body is
`await import(id)` (`src/css/css-worker.ts:6`).

Counts reproduced: **35** `.css.ts` files, all in `packages/material-x`, none
anywhere else; **34** of the 35 reference `tokens`; **34** files under
`packages/material-x/src` import `@ydinjs/tproc`.

**The per-worker cost is the token-DB import, and this is now measured
independently.** Three single-process runs in this container, each its own
`node` invocation, nothing else running:

| Run | Import time | Process RSS | `heapUsed` |
| --- | ----------- | ----------- | ---------- |
| 1   | 402 ms      | 328 MiB     | 143 MiB    |
| 2   | 409 ms      | 328 MiB     | 143 MiB    |
| 3   | 446 ms      | 327 MiB     | 143 MiB    |

against a bare Node process at **41 MiB** RSS / 4 MiB heap — a **287 MiB**
delta for `@ydinjs/tproc/index.js` plus `default/motion-effects.js`, the two
specifiers a `tokens.ts` imports. That matches the design's dose–response slope
of ~290 MiB per concurrent worker almost exactly, and it settles the
attribution: **the slope is the import, not the work.** The design's own figure
(242 MiB) is 45 MiB low, which does not disturb anything that rests on it.

### Nx's package-level parallelism (L1)

The design says "Nx's default, greater than one; unset in `nx.json`". **It is 3.** `nx@23.1.0`, `task-orchestrator.js:1348–1350`:
`options['parallel'] === undefined → Number(options['maxParallel'] || 3)`.
`nx.json` sets no `parallel`, and the root `Justfile:44–45` — `nx run-many -t test
--projects=box-quad,core,tproc,drag,drag2,vite-traits-plugin,material-x` — passes
none. So the repository test run today is three package Vitest processes at a
time, each of which may hold several browser projects. Naming the number is
worth doing: D-203 changes 3 to 1, and the record reads as though it were
tightening something already close to 1.

---

## Where the design does not hold

### D-200 prefers a mechanism that breaks its own required property

D-200 states three required properties, the third being "the same dependency
tracking through the `MessageChannel`, the same `addWatchFile` calls, the same
compiled output". Three paragraphs later it prefers **a pool to a semaphore**,
on the ground that a reused worker pays the tproc import once.

**A reused isolate cannot satisfy that property.** Two arms, run in this session
against a fixture that reproduces `deps-tracker.ts`' `resolve` hook and
`styles-import.ts`' `load` hook verbatim, over two entry modules sharing a
transitive relative dependency:

```
ARM 1 — one isolate per module (today's plugin)
  A deps: [shared.mjs, deep.mjs, a.styles.css]   -> A(shared:deep)[A-v1]
  B deps: [shared.mjs, deep.mjs, b.styles.css]   -> B(shared:deep)[B-v2]

ARM 2 — one isolate reused for both (a pool)
  deps:   [shared.mjs, deep.mjs, a.styles.css,
           shared.mjs,           b.styles.css]   <- deep.mjs never re-emitted
```

The second job's transitive edge is lost, because `shared.mjs` is already in the
isolate's registry and is not re-linked, so Node's `resolve` hook never fires
for its children. `trackedFiles[B]` would omit `deep.mjs`, `addWatchFile` would
never see it, and `handleHotUpdate` would not invalidate B when it changed.

A third arm drives the same reused isolate twice over one module, editing its
stylesheet between the jobs, as an editor save would:

```
job 1 (stylesheet = B-v1): B(shared:deep)[B-v1]
job 2 (stylesheet = B-v2): B(shared:deep)[B-v1]    <- stale
```

The pooled worker serves the **pre-edit** CSS. That is the live HMR path:
`handleHotUpdate` invalidates the `.css.ts` module, Vite re-runs `load`, and the
handler returns content from before the save. Today's fresh-isolate-per-load
spawn is what makes dev HMR correct, and the dev path is real —
`just docs-dev` runs the Storybook dev server through this plugin.

**And the pool buys nothing at the chosen bound.** The peak is set by the bound,
not by the number of spawns: four live isolates hold four copies of the token DB
whether they are reused or replaced, so a pool does not lower the peak, and it
holds them for longer. The only saving is time: 31 imports avoided × ~420 ms,
spread over 4 lanes, is **≈3.3 s** on a package run the design measures at ~50 s
— against a measured semaphore cost of **+1 s** over unbounded (9 s against 8 s
in the dose–response). The record's argument that "the 290 MiB-per-worker slope
is import cost, not work" is correct, and is precisely the reason a pool cannot
help the figure D-200 exists to control.

**Amendment.** D-200's mechanism is **bounded concurrency with a fresh isolate
per load** — the semaphore that was actually measured — at bound 4. Delete the
pool preference. If a pool is ever wanted it is admissible only on the one-shot
build path (`isProd: true`), where nothing is watched and each module loads
once; that is two behaviours in one plugin for a 3 s saving, and this pass
recommends against it. Everything else in D-200 stands, including the bound, the
three required properties, and the reason the correction belongs in the plugin.

### F-438's diagnosis is not established by the string quoted for it

F-438 reports `Matcher did not succeed in time` from `toMatchScreenshot` and
concludes "a stability timeout, not a changed baseline". The string does not
support the conclusion.

`throwWithCause` (`vitest/dist/chunks/test.DNmyFkvJ.js:3708`) attaches
`cause = new Error("Matcher did not succeed in time.")` to **any** error
escaping the `expect.poll` chain. `toMatchScreenshot` sets `_poll.assert_once`,
so an assertion-phase failure is rethrown through that same path on the **first**
attempt (`:3789–3794`) rather than retried. A genuine pixel mismatch therefore
carries the identical cause.

What distinguishes the three cases is the matcher's own message, and the record
quotes none of them:

| Failure                | Message                                             | Source                               |
| ---------------------- | --------------------------------------------------- | ------------------------------------ |
| never stabilized       | `Could not capture a stable screenshot within Nms.` | `@vitest/browser/dist/index.js:2372` |
| baseline changed       | `N pixels (ratio X) differ.`                        | `:2044`                              |
| element never appeared | `Cannot find element with locator: …`               | `expect-element.js`                  |

A mismatch also produces `reference`/`actual`/`diff` attachments; a stability
failure produces none. Either is decisive and both are in the run log.

**What this does settle is that D-204 is implementable and its lever is
locatable.** There _is_ a settle budget: `browser.expect.toMatchScreenshot.timeout`,
default **5000 ms** (`index.js:2071`, merged per project at `:2081`, consumed by
`waitForStableScreenshot` at `:2431`). It is unset in `.scripts/vitest-config.ts`,
so the whole suite runs on the default.

**Amendment.** F-438's disposition is downgraded to _undiagnosed_: the class of
failure is not yet established, and the evidence that would establish it is a
line of existing log. D-204 should not pre-commit to resizing a budget for a
failure observed **once, in an arrangement the design rejects** (one process,
`groupOrder` + `maxWorkers: 2`, 14.5 GiB) and absent from both arrangements it
adopts. As written D-204 decides two incompatible things — size the budget, and
doing nothing is a sufficient disposition. Recast it as what it actually is: the
demonstration obligation already stated as item 6, with the settle budget named
as the lever **if** the primary message says stability. That keeps the useful
half — no baseline re-recorded, no tolerance widened — and stops the other half
mandating machinery nothing has yet shown to be needed.

### D-202's A/B does not isolate the effect it credits — but the decision survives

D-202 attributes the 14 061 → 9908 MiB difference (rows 6 and 8) to F-435's
retention. Those two arms differ in **two** things: the process boundary, and
whether the three material-x browser projects run concurrently. Row 5 against
row 9 is the cleaner same-settings pair — worker cap 4, default `maxWorkers`,
Δ 9606 against Δ 5605 — and carries the same confound. The arm that would
separate L2 from L5, **one process with `groupOrder` and the worker cap**, was
never run.

It does not need to be, and the record should say why rather than resting on a
confounded pair. F-435's own series is direct evidence of retention — Chrome
process count stepping 12 → 26 → 39 → 52 and never falling — and Chromium
processes are untouched by the CSS workers, so that part of the evidence is
clean even though it was taken with F-434 unbounded. **Under retention the
one-process peak is the sum over browser projects however they are scheduled**,
so serialization cannot move the browser term at all; it can only move the main
process term, which D-200 already handles. The existing arms bracket the missing
one: serialized-without-cap (row 2, Δ 10 193) is _worse_ than
concurrent-with-cap (row 5, Δ 9606), which puts the untested combination near
Δ 8–9.5 GiB — far above the separate-process Δ 5.6–5.7. If the owner wants the
arm anyway it is one ~50 s run.

**A robustness check the record does not carry and should.** D-202's necessity
depends on D-199's assumption that background may reach 6 GiB, and that
assumption is dominated by a harness-hygiene problem §Owner choices declines to
decide. Read against the cleanest container the measurements describe —
background 4.2 GiB, the 1192 MiB of stale servers already gone — row 6 lands at
≈14.0 GiB (86 % of cap) and row 8 at ≈9.9 GiB (60 %). **D-202 survives the
cleanest available container**, and saying so is what stops it being read as an
artefact of a dirty one.

**Amendment: the ground, not the decision.** D-202's property — a package run
holds at most one browser project's footprint at a time — is right, is stated as
a property rather than a shape, and is met by the arrangement it names. Its
recorded evidence should be F-435's monotone series plus the sum-under-retention
argument, with rows 5/9 as the same-settings pair and the confound
acknowledged.

One implementation note, since D-202 states a property and not a shape: the
property is satisfied without splitting any configuration, by invoking
`vitest run --project browser`, `--project spec`, `--project visual` in sequence
against the existing `packages/material-x/vitest.config.ts`. `_initBrowserProvider`
is called only for projects that received specs (`cli-api:2449–2450`), so an
unselected browser project starts no Chromium.

### D-203's L1 = 1 is asserted with no figure, and the figures are already in hand

D-203 sets Nx to `--parallel=1` and says only that this "is what makes L2 safe
across packages". The document already holds the numbers that make it a
derivation. From F-434's per-package table: `drag2` ≈ 7116 MiB (622 main +
6494 Chromium), `core` ≈ 6570 MiB (459 + 6111), material-x post-fix Δ 5697 MiB.

| Nx `--parallel` | Heaviest concurrent set   | Run Δ     | + 4.2 GiB background | Against 16 GiB |
| --------------- | ------------------------- | --------- | -------------------- | -------------- |
| 3 (today)       | drag2 + core + material-x | ≈19.4 GiB | —                    | over the cap   |
| 2               | drag2 + core              | ≈13.7 GiB | ≈17.9 GiB            | over the cap   |
| **1**           | drag2                     | ≈7.1 GiB  | ≈11.3 GiB            | inside D-199   |

That is an estimate from summed per-package peaks rather than a measurement of
the composed run, and should be labelled as one — but it is the difference
between an assertion and a derivation, and it shows the choice is not marginal:
even `--parallel=2` exceeds the cap outright.

**A gap the design does not close.** Nothing bounds L1 for the `build` target
either, and no decision covers it. `just build` (root `Justfile:12–13`) runs
`core`, `tproc` and `material-x` at the same default of 3. What makes this safe
is not stated anywhere: `nx.json` gives `build` `dependsOn: ["^build"]`, and
`packages/material-x/package.json` depends on both `@ydinjs/core` and
`@ydinjs/tproc`, so the heavy build cannot overlap the other two and the
single-package measurement is representative. That reasoning is the only thing
standing between the unmeasured repository build and the cap, and it belongs in
the record.

There is **no `nx affected` anywhere in this repository** — the build paths are
`just build`, the per-package `just build-lib`, and the docs build. A brief that
speaks of an affected build path is describing something the tree does not have;
the design is right not to model one, and should say so once rather than leave
the absence to be rediscovered.

### D-201's conclusion holds; its ground is one package, and its corrective clause has no referent

"Measured, it buys nothing" is measured on **material-x alone** — the one package
whose main process dominates and whose Chromium term is ~2.2 GiB per project.
For `core` (25 files, 6111 MiB Chromium) and `drag2` (72 files, 6494 MiB) the
browser page count **is** the dominant term, and nothing measured says a lower
bound would buy nothing there. The decision still holds, but for a different
reason than the one recorded: at L1 = 1 those packages already fit D-199's
budget, so no cut is _needed_. Record it as "not needed at the measured
per-package peaks", not as "measured to buy nothing" — the second is a claim
about packages that were never in the arm.

**And the corrective clause has nothing to correct.** "Any existing instruction
to pass the flag is wrong and is corrected", and demonstration item 7, both
presuppose an instruction that does not exist: a grep of the tree outside
`node_modules` and `.plan/` finds no document, recipe or script recommending
`--maxWorkers`, `VITEST_MAX_WORKERS` or `fileParallelism` as a memory control.
The only `fileParallelism` is `.scripts/vitest-config.ts:72` — `!isDebug`,
unrelated. Item 7 is vacuous as written. Replace it with the positive
obligation: F-432's mechanism is recorded **once**, where a contributor reaching
for the flag will meet it, so that a silent failure mode is not rediscovered by
the next person to watch a container die.

### D-200's necessity for the test path is narrower than "the single largest lever"; its necessity elsewhere is absolute

Row 4 — separate processes, `maxWorkers: 2`, **no** worker cap — passes at
12 135 MiB / Δ 7384. So a process boundary plus a lower page bound reaches a
passing package run without touching the plugin at all. Against D-199's 6 GiB
assumption that arm lands at ≈13.4 GiB, over the 13.1 threshold by **284 MiB** —
which is what keeps D-200 necessary on the test path, by a margin rather than by
the framing the record uses. The claim that the cap "takes the one-process run
from killed to passing on its own" is true (row 5) and is not the same claim.

What makes D-200 unarguable is the set of paths no runner configuration reaches,
and the record names one of the three.

- **The build**, recorded: `packages/material-x/Justfile:21–22` →
  `.scripts/tsdown-component.ts:15`, `constructCSSTokens({ isProd: true })`.
- **The docs build, which is not recorded, and which runs on `main`.**
  `.storybook/main.ts:47–48` points the Storybook builder at
  `packages/material-x/vite.config.ts` → `createMaterialXViteConfig` →
  `constructCSSTokens` (`.scripts/vite-config.ts:77`). Both `just docs-build`
  and `just docs-dev` take that path, and
  **`.github/workflows/docs.yml` runs `npm run docs` on every push to `main`, on
  `ubuntu-latest`** — 4 vCPU, 16 GB, no cgroup headroom and no swap to thrash
  into. 35 unbounded isolates at the 287 MiB measured above is ≈10 GB. This is
  the repository's only CI job, and it is the strongest single argument for
  D-200. It should be in the finding.
- **The plugin is already installed everywhere.** `constructCSSTokens` sits in
  `createViteConfig`, the base config, so `core`, `drag`, `drag2` and the root
  `vite.config.ts` all carry it. "The defect travels to whichever package adopts
  the pattern next" is not a forecast; the carrier is already in place and only
  the `.css.ts` files are missing.

---

## The owner decision the record both makes and defers

D-203 decides that the root workspace configuration is "removed, or reduced to
the projects that can safely share one process", recommends removal, and then
§Owner choices says the owner may weigh the IDE workflow differently. Per
`documentation.md` §"A decision is atomic", a decision that is partly settled
cannot be read per decision — an implementer cannot act on this one without
choosing for the owner.

**Split it.** The sequencing half is settled, evidenced and independent: L1 = 1,
L2 across packages follows from it, and `npm test` — today bare `vitest`
(`package.json`), which resolves the 15-project configuration in **watch** mode —
resolves to the package sequence instead. Nothing in that half depends on the
root configuration's fate. The root-configuration disposition is the owner's.

**And the record does not name the cost the owner is being asked to weigh.**

- **`.vscode/settings.json:3` sets `"vitest.workspaceConfig": "vitest.config.ts"`.**
  It is a tracked file, wiring the Vitest IDE extension to exactly the
  configuration F-436 shows is fatal. Three consequences the design does not
  state: removal means editing a tracked file rather than deleting one; the
  extension today points a contributor's editor at the seven-browser-project
  run, which strengthens the "not left in place as a trap" argument
  considerably; and whether the extension discovers the per-package configs with
  the setting removed is an assumption nobody has tested. The owner cannot price
  the choice without these.
- Removal also orphans `createWorkspaceTestConfig`
  (`.scripts/vitest-config.ts:390–445`), its `WorkspaceTestConfigOptions` type,
  and the two cross-package relative imports the root config carries for
  `dragBrowserCommands` and `materialXBrowserCommands`. Deleting them is part of
  the change; the record does not say so. One small thing it would also buy:
  `box-quad` is the one package whose configuration does not share a code path
  with the root — `createBoxQuadTestConfig` (`:293`) beside
  `createBoxQuadTestProjects` (`:308`), two definitions that today must be
  edited together. Removing the root config collapses them to one.

**F-436's conclusion does not depend on its contaminated series, and the record
should lean on that instead.** The seven-browser-project fan-out is established
at source — `Promise.all(parallelPools…)` at `cli-api:2473` over 7 of the 15
projects declared at `.scripts/vitest-config.ts:427–441` — so the configuration
is fatal by construction, before and after D-200. The design's own loose end
("a precise repository-level baseline needs a quiet container and about two
hours") is therefore not owed at all: the code establishes what the measurement
was reaching for.

---

## Registration — it does not follow the live D-196 rules

The live map, `packages/drag2/.plan/contract/README.md:28`:

> Every id family is declared in **the register that owns the family** (D-174)
> and cited from anywhere in the package … `D-` and `F-` are `00-index.md`;
> `I-`, `Q-` and `M-` are `05`; `P-` is `02`; `B-`, `K-` and `L-` are `07`;
> `O-` and `SC-` are `obligations.md`.

Measured against that, the numbering is the only thing that is right.

**Nothing is registered.** All fourteen ids are claimed **only** by `####`
headings inside `.plan/test-execution-1/architect-test-execution-model.md`; no
`####` claim for any of them exists anywhere under `packages/`. Under
`CONTRIBUTING.md` §Reading one entry a heading opening with an identifier at
`####` **is** the claim, so the document claims from outside every register —
the surface D-196 exists to close.

**The uniqueness instrument cannot see them.**
`packages/drag2/tests/ledger.ts:56–59` fixes the scan set as
`CURRENT_STATE = ['.plan/contract', '.plan/obligations.md']`, resolved against
`PACKAGE = packages/drag2`. The repository-root `.plan/` is outside it entirely.
So the tree-wide uniqueness rule is unenforced for exactly these ids.
`packages/drag2/.scripts/entry.sh drag2:D-200` will not resolve either.

**D-196 names this failure in its own text**, which is what makes it the live
rule rather than an inference — `00-index.md:2286`, restated at `:4751`:

> the recurrence is certain and **no register-scoped instrument can see it,
> since colliding ids that never reach a register produce no duplicate claim**.

D-196 withdrew D-193's owed uniqueness check on the ground that `violations()`
is "already shipped and broader … across every current-state document". That is
true **inside `packages/drag2` and nowhere else**, and the gap is exactly the one
D-196's own sentence describes.

**I-38 is in the wrong family.** `05-lifecycle-invariants.md` is `@ydinjs/drag2`'s
kernel and lifecycle register: I-1 is FIFO run-to-completion, I-2 is frame-slot
assignment, I-37 is how liveness may be read. "A change to test scheduling
carries a measured peak" is not a lifecycle invariant of that package, and
minting it there would put a repository verification rule inside a package's
kernel contract. Its content is a **repository rule**, and by
`documentation.md` §1 a rule in force belongs in a current-state document:
`.agents/docs/test-architecture.md`, which owns the execution model and already
carries a §CI policy, or a new permanently-numbered `CONTRIBUTING.md` Part II
section. The history goes in the `.plan/` record. Do not mint it into `05`.

**The numbering itself is correct.** Highest claimed: D-198, F-431, I-37, all in
`packages/drag2`. D-199…D-204 and F-432…F-438 are the next free ids.

**The precedent is not drift — it is one round of the same failure, and it cost
twenty-two ids.** `.plan/reviews/harness-guard-1/harness-guard-1-summary.md`
minted `F-353`…`F-372` and `Q-23`…`Q-24` from the repository-root `.plan/`, with
a `Local → canonical` table. **The registers never took the rows.**
`00-index.md` runs `#### F-352` at `:4353` straight to `#### F-373` at `:4359`,
and no heading anywhere under `packages/` claims any id in F-353…F-372;
`05-lifecycle-invariants.md` carries `#### Q-22` at `:835` and next claims
`#### Q-25` at `:827`, with no Q-23 and no Q-24. Twenty-two identifiers are
burned — allocated in a document no register can see, then skipped by the
registers to avoid a collision they could not detect.

So the failure mode is not hypothetical and it is not only re-allocation: the
observed shape is a register **stepping over** a range it cannot verify. It has
already happened once, in this exact location, one round before this one.

**And this document's claim is the stronger violation of the two.** D-174 fixes
the depth (`00-index.md:1614`):

> An identifier may open a heading only in the document that owns it, and only
> at `####`.

The harness-guard artifacts claim at `##`/`###` — off-depth, but recognisable as
a proposal. `architect-test-execution-model.md` claims at `####`, the depth
reserved for the owning register, from a document that owns no family. It does
not propose ids; it asserts register-level ownership of them.

F-431, a repository-level `oxfmt` defect, _was_ written into `00-index.md`, so
the practice that does work absorbs repository-level findings into one package's
contract register. `documentation.md` §8 lists `packages/*/.plan/` as the Record
and does not list a repository-root `.plan/` at all — including the one this
document is in.

**Three admissible repairs. The first needs no owner.**

1. **Immediate, sanctioned, and already written down.** `consolidator.md:19`
   carries the escape hatch verbatim: an id a pass mints is written into its
   owning register in the same commit, **"or the summary keeps local ids and the
   mapping is filled in when it is."** Demote the pass document's fourteen
   headings to local ids with a `Local → canonical` table, and nothing is
   claimed, nothing is burned, and no register is touched until the entries are
   ready. This is what harness-guard-1 should have done, and it is available
   today at the cost of a rename.
2. **Register into the owning file, and continue the drift.** Write D-199…D-204
   and F-432…F-438 into `packages/drag2/.plan/contract/00-index.md` in the commit
   that first uses them (D-196), demote the pass document's headings to the
   mention form, and re-home I-38's content to
   `.agents/docs/test-architecture.md`. Repository-scope decisions then live in
   one package's contract register, which is what has been happening.
3. **Correct, and larger.** Open a repository-scope register as a current-state
   document, extend `documentation.md` §8 with its row, give a claim reader a
   root that covers it so uniqueness is enforced there, and give `entry.sh` a
   second scope. This is the structural answer to a repository that has outgrown
   a package-owned `D-`/`F-` family, and it is where D-196's own holding points.
   It is also the only one of the three that stops the twenty-two-id hole
   recurring.

**The choice between 2 and 3 is the owner's**; 1 is available regardless and
should be taken now, because it is what stops these fourteen ids joining the
twenty-two.

**Because none of the ids is registered, none of D-199…D-204 is yet in force.**
Amending them now is a correction before first use, not a supersession: no new
ids are minted, no entry goes inactive, and `documentation.md`'s atomicity rule
is not engaged. That window closes the moment the first entry is written into a
register, which makes this the cheapest point at which every correction above
can be absorbed. **This pass mints nothing** — the decisions are the design's to
carry, corrected.

---

## Verdict

| Item  | Disposition                                                                                                                                                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-199 | **Stands.** The budget rule and the 80 % threshold are sound and the level assignment is right.                                                                                                                                                                      |
| D-200 | **Stands, amended.** The pool preference is refuted by execution and is replaced by the semaphore that was measured. Bound 4, the three required properties and the plugin-level siting all stand; add the docs/CI path to the finding.                              |
| D-201 | **Stands, grounds narrowed.** Repository-wide conclusion from a single-package measurement; the reason is "not needed at the measured per-package peaks". Its corrective clause and demonstration item 7 have no referent and are replaced.                          |
| D-202 | **Stands, grounds amended.** The cited A/B conflates L2 and L5; the sound ground is retention plus sum-under-retention, and it is robust to the cleanest container the measurements describe.                                                                        |
| D-203 | **Split required.** The sequencing half stands and gains the arithmetic that makes L1 = 1 a derivation. The root-configuration half is an **owner decision** the record currently both makes and defers, and its tracked cost (`.vscode/settings.json`) is unstated. |
| D-204 | **Needs amendment.** Recast as the demonstration obligation it already is, with `browser.expect.toMatchScreenshot.timeout` named as the lever conditional on the diagnosis. As written it decides two incompatible things.                                           |
| I-38  | **Right content, wrong family and wrong home.** A repository verification rule, not a drag2 lifecycle invariant.                                                                                                                                                     |
| F-432 | **Confirmed**, allow-list is 20 names not 21.                                                                                                                                                                                                                        |
| F-433 | **Confirmed** in every figure.                                                                                                                                                                                                                                       |
| F-434 | **Confirmed**, and the 290 MiB slope independently attributed to the token-DB import at 287 MiB / ~420 ms. Extend to the docs build and `.github/workflows/docs.yml`.                                                                                                |
| F-435 | **Confirmed** at source; it is the finding that carries D-202, and the record should say so directly.                                                                                                                                                                |
| F-436 | **Confirmed by construction**, which is stronger than the contaminated series it rests on. The owed repository baseline is not owed.                                                                                                                                 |
| F-437 | **Confirmed** as a design constraint; the design's independence from it is verified above.                                                                                                                                                                           |
| F-438 | **Downgraded to undiagnosed.** The quoted string does not distinguish a stability timeout from a pixel mismatch; the evidence that would is already in the run log.                                                                                                  |

## Limits of this pass

- **No resource measurement was re-run.** Every peak, Δ and Chrome count above
  is the design's own; nothing here re-derives them, and the arrangements table
  is taken as reported. What was measured here is the tproc import cost (three
  attributable single-process runs) and the isolate-reuse probe (three arms, a
  synthetic fixture reproducing the two live hooks). Everything else is source.
- **The L1 table is arithmetic on summed per-package peaks**, not a measurement
  of a composed multi-package run. It is labelled as such and is offered as a
  derivation of the choice, not as a figure.
- **The missing D-202 arm was not run.** The argument that its outcome is
  determined by retention is reasoning from F-435 and from two bracketing arms,
  not a measurement. One ~50 s run would close it if the owner wants it closed.
- **F-438's actual class is still unknown here.** This pass shows the recorded
  evidence cannot establish it; it does not establish the alternative.
- **`.agents/docs/test-architecture.md` §CI policy describes a pull-request gate
  that does not exist** — the only workflow is `docs.yml`, on push to `main`.
  Adjacent to this design and left alone, but it is a current-state document
  asserting something the tree contradicts, and I-38's re-homing would land next
  to it.
