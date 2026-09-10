# Challenge — test execution model, revision 3

**Architect pass, 2026-09-10, branch `drag2/fin-review`, against
[`architect-test-execution-model-r3.md`](architect-test-execution-model-r3.md)
at `8290ae6b3`.**

An independent challenge of revision 3's new architectural grounds. The owner's
direction is taken as settled and is not re-litigated: one root Vitest
invocation without Nx test orchestration, separate per-package invocation,
preserved VS Code execution, current CSS after edits and rebuilds. Workers are
treated as an implementation mechanism, not a requirement.

**Nothing here claims an identifier.** No heading opens with one at any depth.
The `TE-` names are used in mention form only; they also fall outside the local
identifier grammar (`[A-Za-z][A-Za-z0-9]*-\d+`, CONTRIBUTING §Reading one entry
of a record), so they could not claim a repository identifier even at `####`.
Revision 3's registration discipline is correct and is not a finding here.

**Instruction boundaries.** The pre-existing `node/tproc TokenPackageProcessor`
failure, TE-F6's stale-MCP headroom and the independent review of
`5f894e0c2..2aeda69fd` are outside this pass. Nothing is implemented; every
probe below is a scratchpad fixture and the working tree was clean before and
after.

## Verdict

| Ground                                        | Verdict                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TE-D8 — Nx out of test orchestration          | **Stands**, and its one stated consequence does not exist                                         |
| TE-D9 — serialize + tear down                 | **Serialization stands; the teardown trigger is refuted** and three required properties are wrong |
| TE-D10 — persistent Vite evaluator            | **Refuted on its own metrics.** Revision 3's declined fallback dominates it                       |
| TE-D11 — worker-limit precedence              | **Stands**, with two parsing gaps and one fatal interaction with TE-D9                            |
| TE-F11 — `provider.close()` is one-way        | **Confirmed**, and the falsifier is reachable in run mode                                         |
| TE-F12 — fresh process per ordinary run       | **Confirmed at source**                                                                           |
| TE-F13 — `.styles.css` id                     | **Confirmed**, independently reproduced, and incomplete as a required property                    |
| TE-F14 — `cliArguments` never reach `argv`    | **Confirmed at source**                                                                           |
| TE-F15 — environment reproduces worker output | **Output stands; the speed and the applicability do not**                                         |
| The 10 384 MiB whole-repository figure        | **Stands for what it measured**, which is not the proposed design                                 |
| IDE whole-repository budget                   | **Unresolved, and the gate that leaves it unresolved is the wrong instrument**                    |

The design needs amendment in two places — TE-D9's trigger and TE-D10's
mechanism — and both amendments are available from evidence taken in this pass.
One item is a genuine owner choice and is named at the end.

## The evidence base

All figures below are from single, individually attributable runs in this
container. `memory.max` is 17 179 869 184 B (16 384 MiB); `memory.current` at
the start of the pass was 3 159 MiB. Installed: `vitest@4.1.10`,
`vite@8.1.4`, `@vitest/browser-playwright@4.1.10`,
`vitest.explorer-1.50.8`.

## TE-D9 — the teardown boundary

### Serialization by `sequence.groupOrder` is real, and stronger than the record claims

`cli-api.BK8pd4xc.js:3628` builds groups, and `:3712` awaits each group in full
before the next begins:

```js
const groupResults = await Promise.allSettled(promises);
```

So a group boundary is a hard barrier: when group _n+1_ starts, every browser
page, orchestrator RPC and pool promise of group _n_ has already settled. This
is a better guarantee than revision 3 uses, and the amendment below turns on it.

### The stated trigger fails deterministically, not intermittently

Revision 3 triggers teardown when "a project's last test module completes", and
lists as a challenge ground that "if a project can report its last module before
the pool is finished with it, teardown races the run. No arm exhibited it; no
arm was built to provoke it either."

It is not a race. `onTestModuleEnd` is emitted from
`cli-api.BK8pd4xc.js:12661` inside `TestRun.updated`, which is called from the
`onTaskUpdate` RPC method at `:2734`; `Vitest.report` at `:13983` awaits every
reporter. The browser page is therefore **awaiting the reply to its own RPC**
while the hook runs. Closing the provider there destroys the page that is
waiting.

Measured. One browser project, four test modules, `maxWorkers: 1`, one tab; a
reporter counting `onTestModuleEnd` against the `onTestRunStart` specification
list and closing `project.browser.provider` on the last one:

| Arm                        | Tests | Reported status | Errors | Exit code |
| -------------------------- | ----- | --------------- | ------ | --------- |
| control, no teardown       | 8     | passed          | 0      | 0         |
| close, promise not awaited | 8     | passed          | **1**  | **1**     |
| close, promise awaited     | 8     | passed          | **1**  | **1**     |

The error in both teardown arms is
`Error: Failed to run the test <last module>.` — raised by
`BrowserPool.runNextTest`'s catch. Four modules and one tab are the smallest
case there is; this is the mechanism's ordinary behaviour, not a corner.

**This also disqualifies the acceptance check revision 3 used.** Its arms record
that "the string `provider was closed` appears in no log". That string is not
what this failure emits. The arms could have contained one
`Failed to run the test …` per browser project and been read as the excluded
`tproc` failure or as flake, because the accounting looked for a string this
mechanism never produces.

### A boundary that does hold, measured

Trigger teardown from the **group boundary** instead: on the first
`onTestModuleStart` belonging to a project other than the current one, close the
previous project's provider. `:3712` proves the previous group has settled.

Two browser projects, contiguous `groupOrder` 1 and 2, three and four modules:

| Arm                    | Tests | Status | Errors | Exit | Chrome processes    |
| ---------------------- | ----- | ------ | ------ | ---- | ------------------- |
| control                | 11    | passed | 0      | 0    | 14 at end           |
| group-boundary closure | 11    | passed | **0**  | 0    | 14 → **10** mid-run |

Same release, no error. The cost is that the final group's provider is not
released before the run ends, which is free — the process exits.

**Amendment.** Replace the trigger. The required property is not "no project is
torn down before its last test module has completed" but **teardown is
triggered by an event that provably follows the completion of the group the
project ran in** — module counting cannot express that, and the run-scoped
barrier already exists.

### `watch === false` does not exclude reuse — demonstrated

Revision 3 gates teardown on `config.watch === false` and calls this "a positive
check on run mode, not an assumption about the caller". It is an assumption
about the caller, and it is false.

On an instance created with `watch: false`, `vitest.runTestSpecifications()`
runs again without complaint — four modules, four fresh `onTestModuleEnd`
events.

The negative holds by exhaustion, not just by one probe. `Vitest.runFiles`
(`cli-api.BK8pd4xc.js:13570–13619`) — the single path every run entry point
funnels into — contains **no read of `config.watch` at all**; its only guards
are the awaited prior cancellation and `if (!this.pool) this.pool = createPool(this)`.
Every `config.watch` read on the run path is elsewhere and decides something
else: `:13470` (the empty-filter error), `:13481` and `:13507` (emitting
`onWatcherStart`), `:13997` (`shouldKeepServer`). Four public entry points reach
`runFiles` — `runTestSpecifications` (`:13541`), `rerunTestSpecifications`
(`:13563`), `rerunFiles` (`:13748`) and `rerunTask` (`:13761`) — and the last
two are also exposed over the API server's RPC (`:8980`, `:8985`), gated on
`api.allowExec` and, again, not on `watch`.

Composed with TE-F11, that produces the falsifier the brief requires be
preserved. Same instance, `watch: false`, one browser project whose suite
contains a genuine failure:

| Run                          | Modules executed | Reported status | Errors | `process.exitCode` |
| ---------------------------- | ---------------- | --------------- | ------ | ------------------ |
| 1 — normal                   | 4                | **failed**      | 0      | —                  |
| 2 — after `provider.close()` | **0**            | **passed**      | 1      | 1                  |

`runTestSpecifications` did not throw. The reporter was told the run **passed**
and was handed four module entities left over from run 1. **Teardown turned a
genuinely failing suite green.** The only surviving signal is one error and a
non-zero exit code — invisible to an embedder that reads reported state, which
is what the VS Code extension and any custom runner do.

**Amendment.** The gate is a proxy for "no further run will use this project"
and does not entail it. Two properties are required instead, and neither depends
on guessing the caller:

- **A project that has been torn down is marked**, and a run that would execute
  a specification belonging to a marked project **fails loudly before executing
  anything**. This converts the silent falsifier into a detectable one and is
  the only property that makes the mechanism safe under an API that permits
  reuse. Silence is the failure this mechanism risks; revision 3 says so, and
  then leaves the one path that produces silence ungated.
- **Teardown is contributed by the entry point that owns the one-shot
  contract**, not by the shared factory every consumer loads. `watch` may remain
  as a secondary guard; it may not be the whole of it.

### Three stated required properties are wrong

**"Group order is contiguous from zero."** Holes are already handled —
`cli-api.BK8pd4xc.js:3632` is `if (!group) continue;`. Contiguity buys nothing.
Starting **at zero** is actively harmful, because `0` is the default sentinel
and `:3816` diverts such projects into a trailing catch-all:

```js
if (isolate === true && order === 0 && spec.project.config.maxWorkers === 1)
  return sequential.specs.push([spec]);
```

which `:3846` appends after every other group. Measured, two browser projects
with `maxWorkers: 1`:

| `groupOrder` assignment | Observed module order                                          |
| ----------------------- | -------------------------------------------------------------- |
| b1 = 0, b2 = 1          | **b2 runs first, b1 last** — b1 demoted to the trailing group  |
| b1 = 0, b2 = 0          | **interleaved** — both browsers up at once, serialization gone |
| b1 = 1, b2 = 2          | b1 fully, then b2 — correct                                    |

The trap fires exactly in the regime the design is moving toward: a project
bounded to one worker. `VITEST_MAX_WORKERS=1` reaches the same field
(`coverage.DM_a_rWm.js:380`) and arms the same trap. The property is
**`groupOrder` is assigned from 1, never 0, for every project that must be
serialized**; contiguity is irrelevant.

**"Non-browser projects share the final group."** The three `declaration`
projects set `typecheck.enabled` (`.scripts/vitest-config.ts:179`), so their
specifications carry `pool: "typescript"` and `groupSpecs` routes them through a
separate branch into groups appended after `Math.max(...groups.keys()) + 1`,
regardless of any `groupOrder` given them. The statement is inaccurate; the
consequence is benign, but a design that assigns them a group number is
assigning something that is ignored.

**"A teardown failure is reported, never swallowed."** Correct as an aim and
insufficient as stated: in the measured arms the teardown fault surfaced as
`Failed to run the test …`, which is indistinguishable from a genuine test
failure. The property needs to be **distinguishable**, not merely present.

### One identity trap worth stating

A browser project's runtime name is not its configured name. In the probe, a
project configured as `b1` is reported throughout as `b1 (chromium)` — one
configured project expands to one runtime project per `browser.instances` entry,
and they share the parent's `sequence.groupOrder`. A teardown mechanism keyed on
configured name strings matches nothing and does so silently. Identity must come
from the reported entity's project object.

## TE-D10 — the persistent evaluator

Revision 3 replaces the workers with one persistent Vite environment per plugin
instance, on the ground that the environment "provides the same guarantee and a
stronger one" at **1 863 ms** against the workers' **15 575 ms** for the same 35
modules.

### The measured advantage belongs to a configuration that cannot be fresh

The two figures come from two different APIs with **opposite externalization
behaviour**, and the design's own mechanism is the expensive one.

Measured on one real entry, `packages/material-x/src/button/styles/default/tokens.ts`:

| Path                                                       | Cold time     | RSS           | `@ydinjs/tproc` in the module graph |
| ---------------------------------------------------------- | ------------- | ------------- | ----------------------------------- |
| `runnerImport` — what the 35-module figure used            | 450 ms        | 441 MiB       | **no** — 0 of 2 returned deps       |
| `createRunnableDevEnvironment` — what the design specifies | **19 001 ms** | **3 812 MiB** | **yes** — 29 of 32 graph nodes      |

`@ydinjs/tproc` is a workspace symlink (`node_modules/@ydinjs/tproc → ../../packages/tproc`),
so its resolved path is not under `node_modules` and Vite inlines it into the
module graph. Revision 3's statement that "`@ydinjs/tproc` is externalized as a
built artefact and stays warm across rebuilds, which is why the rebuild is
faster rather than merely equal" is **false for the mechanism the design
specifies**, and true only for the mechanism it measured.

Revision 3 anticipates a version of this and reasons in the wrong direction:
"the 35-module timing came from the per-call form and so _understates_ the
reused design rather than overstating it". For the dominant term it overstates
it by an order of magnitude.

### Externalizing tproc restores the speed and destroys the freshness

Freshness across an externalized dependency is not recoverable inside a process.
Probe, a fixture package under `node_modules` imported by a graph entry:

| Step                                                            | Value returned                                         |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| cold                                                            | `GEN-1`                                                |
| edit the package, then `moduleGraph.invalidateAll()`            | **`GEN-1`**                                            |
| edit the package, then **close the server and build a new one** | **`GEN-1`**                                            |
| same edit, with the package `noExternal` and in the graph       | `GEN-2`, and `GEN-3` after a further edit + invalidate |

An externalized module is loaded by Node's own ESM registry, which is
process-scoped and permanent. Discarding and recreating the environment does not
help. Only a new process — or inlining — recovers freshness. This is exactly the
owner requirement "current CSS after edits **and rebuilds**": under an
externalized evaluator, a `just build` of `@ydinjs/tproc` is invisible to a
running `just docs-dev`, silently, for the life of the process. The current
workers do not have this fault, because each evaluation is a fresh isolate.

### The whole shape, measured on all 35 modules

Each row is one run of all 35 `.css.ts` entries in `packages/material-x`.

| Mechanism                                                             | Cold total   | Retained RSS           | Released? | tproc rebuild seen? |
| --------------------------------------------------------------------- | ------------ | ---------------------- | --------- | ------------------- |
| persistent environment, tproc **inlined** (as specified)              | 17 702 ms    | **3 946 MiB**          | no        | yes                 |
| persistent environment, tproc **externalized** (as measured)          | 1 325 ms     | 484 MiB                | no        | **no**              |
| **one fresh isolate per generation** — revision 3's declined fallback | **1 263 ms** | **411 MiB**            | **yes**   | **yes**             |
| today: one isolate per `.css.ts` (revision 3's figure)                | 15 575 ms    | ~287 MiB × N transient | yes       | yes                 |

In the inlined arm the first entry costs 16 863 ms and the remaining 34 cost
839 ms; the second full pass costs 0 ms. The residency does not grow with
entries (3 943 → 3 946 MiB) and does not come down.

The fallback measurement is one Node process with the plugin's own two
`registerHooks` preloads —
`packages/vite-custom-element-assets/css/deps-tracker.js` and
`styles-import.js` — importing all 35 entries: **35 of 35 succeeded, first entry
526 ms, total 1 263 ms, RSS 411 MiB.**

**The fallback dominates the design on every axis the design was built to
improve.** It matches the fastest environment arm (1 263 vs 1 325 ms), holds 15 %
of the specified arm's memory, releases all of it, and is fresh across a tproc
rebuild — which neither environment arm achieves without paying the other's
cost. Revision 3's grounds for declining it — "strictly worse than TE-D10 on
rebuild latency, because an edit forces the whole set to re-evaluate including
the ~430 ms DB load" — are right in kind and wrong in magnitude: the whole set
re-evaluates in **1.26 s**, which is below revision 3's own claimed figure for
the environment it prefers.

Its one genuine risk is state shared between entries in a single isolate.
Checked: the 35 outputs hashed from one shared isolate are **byte-identical to
the 35 hashed from a fresh isolate each** — 35 compared, 0 differing. That is a
property of the current tree, not a guarantee of the mechanism, and belongs in
the demonstration list rather than in an assumption.

**Amendment.** TE-D10 as written is not adopted. The recommendation is the
per-generation isolate, with the two properties the measurements imply: a
generation is invalidated by any tracked file **including the externalized
workspace packages the current `deps-tracker` cannot see**, and no
cross-entry state may be relied upon. If TE-D10 is nevertheless pursued, it must
first state which side of the externalization fork it takes and carry the cost
of that side explicitly, because the two sides differ by 13× in time, 8× in
memory, and by the presence or absence of the freshness guarantee the whole
mechanism exists to provide.

### The virtual stylesheet id is not only an `addWatchFile` problem

TE-F13 reproduced independently: with the id left ending in `.css` the CSS
pipeline claims it; a query suffix is **not** enough, because the query is
stripped before the extension is matched. A real non-`.css` suffix works, and
all 35 entries then resolve.

The gap is on the other side. For a virtual id, `node.file` is the virtual id
itself, so the file-keyed index does not contain the stylesheet:

| Query                                                                      | Result               |
| -------------------------------------------------------------------------- | -------------------- |
| `moduleGraph.getModulesByFile('…/main.styles.css')`                        | **0 modules**        |
| edit the file, invalidate everything `getModulesByFile` returns, re-import | **pre-edit content** |
| invalidate the virtual node directly, re-import                            | post-edit content    |

The same module is also registered under a second url
(`/@id/__x00__styles:…`), so a mapping that resolves one alias can still leave
another stale. Revision 3's property — "`addWatchFile` receives real file paths
… and must be mapped back" — covers the half that makes the watcher **fire**.
The half that serves stale CSS is the reverse mapping from the fired path to the
node to invalidate, and it is not stated. Revision 3's invalidation probe
exercised the primitive by invalidating the node by hand, so it could not have
caught this; its Evidence limits say as much.

The transitive half is sound: invalidating a shared leaf propagates to importers
(`vite/dist/node/chunks/node.js:34055`) and both importing entries observed the
new value in a probe. Shared in-graph dependencies are not a hazard; the graph's
**boundary** is.

## Evidence attached to the mechanism actually measured

The whole-repository result is sound for what it measured and does not transfer.

- **The 10 384 MiB arm used the revision-2 semaphore at one CSS worker**, not
  the evaluator. Revision 3 states this. Its consequence is not stated: the CSS
  term in that figure is a **transient ~287 MiB**, whereas the proposed
  evaluator is a **retained** cost in the process that hosts it.
- **Three plugin instances participate in a root run, not one.** All 35
  `.css.ts` files are in `packages/material-x`, and its `browser`, `spec` and
  `visual` projects each embed `createMaterialXViteConfig`
  (`.scripts/vitest-config.ts:208, 216, 224`), which carries `constructCSSTokens`
  (`.scripts/vite-config.ts:77`). TE-D10's "created once per plugin instance"
  therefore means up to three persistent environments in one Vitest process.
- **Estimated, not measured:** substituting the specified evaluator for the
  capped worker in the 10 384 MiB arm gives roughly
  10 384 − 287 + 3 936 ≈ **14 033 MiB for a single environment**, above the
  13 107 MiB working ceiling; with one per participating project it exceeds the
  16 384 MiB cap outright. This is arithmetic over figures each taken from a
  single run, and it is the number the design most needs and does not have.
- **Still unproven for the real plugin**: no arm ran the converted plugin in the
  root test run, in `just build`, in `just docs-build`, or in `just docs-dev`.
  The tsdown result is one hook in a minimal build. The docs path is the one
  where a long-lived process and a rebuilt `@ydinjs/tproc` coincide, and it is
  the path the externalization fork decides.

## TE-F12 — the extension's ordinary-run lifecycle

Verified against the installed `vitest.explorer-1.50.8`, distinguishing source
reading from behaviour.

**Source, confirmed.** `dist/extension.js`, `executeRun` constructs a **new**
per-config API object for every ordinary run and disposes it in `finally`:

```js
async executeRun(e,t){this.currentRun=(async()=>{let n=new bt(this.api.config),
r=await n.spawnForRun({coverage:t,projects:an(e),…}),i=this.createRunner(r,n);
try{await i.runTests(e)}finally{i.dispose(),await r.dispose()}})();…}
```

`spawnForRun`'s reuse branch is guarded on `this.currentMeta`, an instance field
of that object, so on a fresh object it is unreachable and the spawn branch
always runs. Continuous run takes the other path — `this.api.spawnForRun(…)` on
the long-lived instance — and therefore reuses. TE-F12 is correct, and its
consequence (no accumulation across ordinary editor runs) follows.

**Also at source, and it changes what the gate costs.** `dist/workerNew.js`
builds the options for `createVitest` with **`watch: !0` unconditionally**, for
every run the extension makes, ordinary or continuous:

```js
f={config:a.configFile,...u,...d,project:a.projectFilter??u.project,watch:!0,api:!1,…}
```

So the editor's ordinary run is a **single-use process that is disposed at the
end of the run** and is nonetheless marked `watch: true`. It is exactly the case
teardown is safe for, and exactly the case the `watch` gate excludes. The gate
does not merely fail to help "Run All Tests" — it excludes the one editor path
whose lifecycle is provably one-shot.

**Not established by me, and marked as such**: no observation of the running
editor was taken. The above is source reading plus API-level simulation. The
extension's per-config queue serializing runs is read from `enqueue`/`pendingQueue`
in the same file and is consistent with revision 2's measurements; I did not
re-derive its behaviour. The absence of a limiter **across** configs I did
check: `maximumConfigs` occurs nowhere in the extension or its `package.json`,
and there is no other cross-config limiter. That is the mechanical ground under
revision 2's TE-D6 — remove the root config and nothing bounds seven concurrent
Vitest processes — and it is unaffected by anything in this revision.

**The IDE whole-repository budget remains unresolved**, and revision 3 is right
to record it rather than paper over it. What changes is the shape of the
remedy: it is not "an opt-in the owner might set wrongly", it is the loud-failure
property above. With a torn-down project marked and a later use of it made to
fail before executing anything, teardown can be enabled for a process the caller
declares single-use — which the editor's ordinary run is — without the silent
mode being reachable at all. That is a design question, not a budget exception,
and I do not treat the 14.2 GiB figure as accepted.

## TE-D8 — removing Nx from test orchestration

The decision stands. Its one stated consequence does not exist.

Revision 3 records that "with Nx out of the test path there is no
`dependsOn: ["^build"]` ordering for tests … but that is now an unstated
assumption rather than an enforced one, and the demonstration list checks it."

`nx.json`'s `targetDefaults` has keys for `build`, `typecheck`, `docs:build`,
`docs:dev`, `docs:api:build` and `docs:api:prepare` — and **no `test` key**.
Every `project.json` under `packages/` contains only a name. Every package's
`test` recipe is a bare `vitest run -c vitest.config.ts`. So
`nx run-many -t test` never built anything, and nothing is lost. The
demonstration item should be dropped rather than carried, and the sentence
corrected: this was never enforced, so it does not become unenforced.

Two consequences that are real and unstated:

- The root run always runs all 15 projects, where `just test` today names seven
  packages. Coverage is identical — the seven package configs contribute exactly
  the 15 projects the root config declares — so this is a scoping change, not a
  coverage change.
- `nx affected -t test` becomes unavailable in principle. The repository uses
  `nx affected` nowhere today, and the build path stays on Nx, so affected
  **builds** are unaffected. It is a cost to name, not a blocker.

## TE-D11 — the worker limit

The precedence order is correct and confirmed at source. Three additions.

**`VITEST_MAX_WORKERS` beats everything, per project** —
`coverage.DM_a_rWm.js:380`, inside the per-project `resolveConfig`:

```js
if (process.env.VITEST_MAX_WORKERS)
  resolved.maxWorkers = Number.parseInt(process.env.VITEST_MAX_WORKERS);
```

The route to it under the extension survives: `vitest.nodeEnv` is spread into
the spawned child's environment as `env: { ...process.env, ...a, … }`, and the
keys the extension then fixes for itself are `VITEST_VSCODE_LOG`,
`VITEST_VSCODE`, `TEST`, `VITEST_WS_ADDRESS`, `VITEST`, `NODE_ENV` and
`FORCE_COLOR` — `VITEST_MAX_WORKERS` is not among them, so a value set there
reaches the child intact. TE-D11's precedence rests on this and it holds.

**It does not accept the percentage form.** The inline option does
(`:152`, `resolveInlineWorkerOption`); the environment variable is a bare
`parseInt`, so `VITEST_MAX_WORKERS=50%` yields **50 workers**. Since the
environment variable is the route revision 3 recommends for the extension
(`vitest.nodeEnv`), this footgun sits on the recommended path and should be
stated where the route is.

**The allow-list is 20 names and excludes `maxWorkers`** —
`cli-api.BK8pd4xc.js:11082–11102`, confirming TE-F1. But it **includes
`sequence`**, and the merge is `test: { ...options.test, ...cliOverrides }`
(`:11129–11132`), which replaces the object wholesale. So any `--sequence.*` flag on
the command line **erases every project's configured `groupOrder`**, collapsing
all of them to the default `0`. Combined with the zero-sentinel trap above, a
stray `vitest run --sequence.shuffle` turns the serialized run back into the
fan-out that was fatal. TE-D9 and TE-D11 must be read together on this point.

**The fatal interaction.** `groupSpecs` refuses to place two projects with
different resolved `maxWorkers` in the same group:

```js
throw new Error(
  `Projects "${last}" and "${spec.project.name}" have different 'maxWorkers' but same 'sequence.groupOrder'.…`,
);
```

TE-D9 puts the non-browser projects in a shared group and TE-D11 sets
`maxWorkers` per project. If those values are not identical across the shared
group the run throws before executing anything. Loud, not silent — but it makes
the two decisions jointly constrained in a way neither records: **any group
holding more than one project must hold projects of equal resolved
`maxWorkers`.**

For completeness: `getThreadsCount` at `:2479` confirms that a project-level
`maxWorkers` does bound browser page concurrency, and that it is ignored
entirely when `headless` is false or the provider does not support parallelism.

## What holds, unchanged

- Retries do not re-emit a module's end event. With `retry: 2` and a
  permanently failing test, every module reported `onTestModuleEnd` exactly once.
  The source agrees: in `@vitest/runner`'s `chunk-artifact.js` both the repeat
  and retry loops close at `:3036–3037`, before `updateTask("test-finished", …)`
  at `:3053`, and a retry emits `test-retried` — never a module-level event, and
  the only two `onTestModuleEnd` emission sites are module-scoped
  (`cli-api.BK8pd4xc.js:12649`, `:12661`). Last-module counting is not broken by
  retries — it is broken by the RPC boundary above.
- Bail is cancellation, not a separate path: a bailing test calls
  `rpc().onCancel("test-failure")`, which reaches `Vitest.cancelCurrentRun`
  (`cli-api.BK8pd4xc.js:13731`). It therefore inherits the cancellation
  behaviour above and strands nothing that matters.
- Cancellation cannot strand a provider in a way that matters: cancelled
  specifications never reach module end, so a counter simply never completes,
  and the process is ending anyway.
- `browser.isolate` defaults to `true` (`coverage.DM_a_rWm.js:492`), so no
  post-module cleanup round-trip is owed to the page. Were it set to `false`,
  `runNextTest` would call `orchestrator.cleanupTesters()` **after** the last
  module, adding a second reason the stated trigger is unsafe.
- TE-F14 is confirmed: `cliArguments` is turned into an options object by
  `parseCLI` in `workerNew.js` and never becomes `process.argv`, so a
  `parseArgs(process.argv)` route is inert under the extension exactly as
  revision 3 says. It also parses with `allowUnknownOptions: false`, so a
  malformed setting fails the run rather than being ignored.
- The current `deps-tracker` is lossy in precisely the way revision 3 states —
  it reports only specifiers beginning with `.` and drops anything resolving
  under `node_modules`
  (`packages/vite-custom-element-assets/src/css/deps-tracker.ts:11–14`). Under
  the workers this only under-watches; under any persistent evaluator it is the
  difference between fresh and stale.

## The owner choice

One, and it is not the one revision 3 defers.

**Which freshness boundary the CSS evaluator is required to hold.** Everything
above reduces to it:

- **Every tracked source file, `@ydinjs/tproc` included.** Then the evaluator
  must be a process or isolate that can be discarded, because an in-process
  externalized dependency is permanently stale and an in-process inlined one
  costs 3 946 MiB. The per-generation isolate satisfies this at 1 263 ms and
  411 MiB.
- **Only files inside `packages/material-x`,** with a `@ydinjs/tproc` rebuild
  requiring a restart of `just docs-dev`. Then the externalized persistent
  environment is admissible at 1 325 ms and 484 MiB retained, and the restart
  requirement must be written down, because nothing in the tooling will announce
  it.

I recommend the first. It is what the owner's stated requirement says, it is the
cheaper of the two on every measured axis, and it is the behaviour the current
workers already have — the change is bounding their number, not changing what
they guarantee.

Revision 3's deferred item — an opt-in enabling teardown in watch mode — is
**not** an owner choice and should not be offered. The reason revision 3 declines
to recommend it ("a wrong setting produces a green run that tested nothing") is
correct, and the loud-failure property removes the need for the setting
altogether.

## Limits of this pass

- **No whole-repository arm was re-run.** The five-arm table is taken as
  reported; this pass challenges what those arms establish, not their numbers.
  In particular the "4 of 7 providers close" and Chrome-process counts are not
  independently reproduced.
- **The teardown probes use fixture suites**, four and seven trivial modules,
  not the real browser suites. They establish the mechanism's behaviour at the
  RPC boundary and at the group boundary; they do not establish timings for the
  real suites.
- **The 14 033 MiB substitution figure is arithmetic, not a measurement.** It
  combines the reported 10 384 MiB arm with a residency measured separately in
  this pass.
- **The persistent-environment measurements use a bare Vite config**
  (`configFile: false`) rooted at `packages/material-x`. The real plugin would
  build its environment from that package's own config, which sets nothing that
  would change the externalization outcome; but the number that matters —
  residency under the real config with the plugin converted — is still not
  measured by anyone.
- **The IDE was read, not run.** No observation of the running editor was taken
  in this pass; the extension findings are source plus API-level simulation, and
  are labelled as such above.
- **`compileCSS` is downstream of every arm** — oxfmt, lightningcss and the
  sourcemap are unchanged and unmeasured here, as in revision 3.
- **Continuous-run mode was not measured.**
