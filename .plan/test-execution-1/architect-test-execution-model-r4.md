# Test execution model — revision 4, reconciled with the revision-3 challenge

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `c4c76e638`.**
Reconciles [`architect-test-execution-model-r3.md`](architect-test-execution-model-r3.md)
with [`architect-challenge-test-execution-model-r3.md`](architect-challenge-test-execution-model-r3.md)
and with the owner's freshness boundary. It supersedes revision 3 where marked
and keeps its evidence where it stands.

**Nothing here claims an identifier.** No heading opens with one, at any depth.
The local `TE-` series continues under the sanctioned `consolidator.md` route;
the names also fall outside the local identifier grammar
(`[A-Za-z][A-Za-z0-9]*-\d+`, CONTRIBUTING §Reading one entry of a record), so
they could not claim a repository identifier even at `####`. No repository
register is opened and no repository rule is placed in `@ydinjs/drag2`'s
lifecycle family.

**Amended 2026-09-10 from settled owner direction**, against this document at
`a8cd06441`. The lifecycle question revision 4 left open is closed: browser
teardown is performed for editor runs as well, the repository's test execution
model is one-shot everywhere, and test watch and VS Code Continuous Run are
retired along with the machinery that exists only to serve them. The amendment
is carried by TE-D15 and TE-D16 and by the corrections marked against TE-D12
and TE-F21.

**Reconciled 2026-09-11 with the focused challenge of the amendment**
([`architect-challenge-test-execution-model-r4.md`](architect-challenge-test-execution-model-r4.md)
through `aeff2a679`), which found no contradictory evidence against any chosen
mechanism and required seven corrections. All seven are applied at the
statements that own them rather than collected into an errata section, and one
of them is applied against the challenge's own disposition on evidence the
challenge did not have. The design is implementation-ready; what remains is
listed under implementation verification obligations.

**Instruction boundaries.** The pre-existing `node/tproc TokenPackageProcessor`
failure and F-412 stay outside this work. Nothing is implemented. Every probe
below is a scratchpad fixture or a reverted patch to an untracked build
artefact; the working tree was clean before this document and is clean after it.

## What changed, and why

The challenge was right on both mechanisms, and the owner's freshness boundary
settles the one question the challenge left as a fork. Revision 3's two central
mechanisms are replaced; its two other decisions survive with corrections.

| Ground                             | Revision 3                                      | Revision 4                                                                                        |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Nx out of test orchestration       | Adopted, with a claimed loss of build ordering  | **Adopted; the claimed loss is deleted** — Nx never supplied it                                   |
| Browser serialization              | `sequence.groupOrder`, contiguous **from zero** | **Kept, assigned from 1** — zero is a sentinel that destroys the ordering it was meant to create  |
| Browser teardown trigger           | Last `onTestModuleEnd` of a project             | **Replaced by the group boundary** — the last-module trigger fails deterministically              |
| Teardown safety                    | Gated on `config.watch === false`               | **Marked project plus a pre-execution guard**, installed in every configuration by a plugin       |
| Where teardown applies             | CLI only; the editor was an open owner choice   | **Everywhere, the editor included** — the model is one-shot and the contract is enforced (TE-D15) |
| Test watch and Continuous Run      | Watch retained, teardown withheld from it       | **Retired**, together with the machinery that served only them (TE-D16)                           |
| CSS evaluation                     | Persistent Vite environment with invalidation   | **One fresh isolate per build generation**, discarded on any tracked change                       |
| Worker limit                       | `VITEST_MAX_WORKERS` > `parseArgs` > default    | **Kept, with three interactions the order did not account for**                                   |
| Whole-repository resource evidence | 10 384 MiB, semaphore standing in for CSS       | **Re-measured with the real mechanisms** — see below                                              |

**The headline: the whole repository runs in one Vitest process at 7570 MiB
peak over a 2015 MiB baseline — Δ 5554 MiB — in 63.6 s, with the real
per-generation CSS evaluator and real group-boundary teardown, 0 unhandled
errors, and all seven browser providers released.** Revision 3's best arm was
Δ 6181 MiB in 96 s, and it was measured on a mechanism this revision discards.

## The whole-repository run, re-measured

One Vitest process, all 15 projects, `memory.max` 17 179 869 184 B (16 384 MiB),
`memory.current` sampled at 1 Hz. Baseline in this pass was **2015 MiB**, lower
than revision 3's 4.0–4.6 GiB, so the peaks are not directly comparable and the
run delta is the figure that transfers.

| Quantity                 | Value                                              |
| ------------------------ | -------------------------------------------------- |
| Peak `memory.current`    | **7570 MiB** (baseline 2015 MiB, **Δ 5554 MiB**)   |
| Working ceiling          | 13 107 MiB (80 % of the cap)                       |
| Chrome processes         | **32** peak, baseline 4                            |
| Duration                 | **63.56 s**                                        |
| Result                   | 157 files, 2467 passed, 60 skipped, **1 failed**   |
| The one failure          | pre-existing `node/tproc`, excluded by instruction |
| Unhandled errors         | **0**                                              |
| Providers released       | **7 of 7**, each at its group boundary             |
| `memory.events.oom_kill` | **0**                                              |

The teardown log from that run, verbatim:

```
runStart specs=157 groups=1,2,3,4,5,6,7,8
closed browser/material-x (chromium) (group 1) at boundary 1->2
closed spec/material-x (chromium) (group 2) at boundary 2->3
closed visual/material-x (chromium) (group 3) at boundary 3->4
closed browser/core (chromium) (group 4) at boundary 4->5
closed browser/box-quad (chromium) (group 5) at boundary 5->6
closed browser/drag (chromium) (group 6) at boundary 6->7
closed browser/drag2 (chromium) (group 7) at boundary 7->8
runEnd modules=157 errors=0
```

Two properties of that log matter beyond the total. Every browser project is
released, the last one included — because in **this** configuration the
non-browser projects occupy the highest group, so group 7's provider is closed
when group 8's first module starts. That is a property of the root
configuration, not of the mechanism: a project sitting in the final group is
never released by a boundary, because the boundary is another group starting
(TE-F29). And `errors=0` is now a meaningful acceptance signal, which it was not
in revision 3.

## The local register

Continuing the series. `TE-D1`…`TE-D11`, `TE-I1`, `TE-F1`…`TE-F15` are defined
in revisions 2 and 3.

| Local  | Canonical  | Subject                                                                                                  | Status                                      |
| ------ | ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TE-D12 | unassigned | Browser projects serialized from group 1 and released at group boundaries                                | New — supersedes TE-D9                      |
| TE-D13 | unassigned | CSS evaluated by one fresh isolate per build generation                                                  | New — supersedes TE-D10                     |
| TE-D14 | unassigned | The requested worker limit, and the three interactions that constrain it                                 | New — supersedes TE-D11                     |
| TE-D15 | unassigned | Every Vitest process executes at most one test run, enforced from an unremovable carrier                 | New — closes revision 4's owner choice      |
| TE-D16 | unassigned | Test watch and Continuous Run are retired, with the machinery serving only them                          | New                                         |
| TE-F16 | unassigned | The last-module teardown trigger fails deterministically at the RPC boundary                             | New — refutes part of TE-D9                 |
| TE-F17 | unassigned | `sequence.groupOrder: 0` is a sentinel that demotes or interleaves the project                           | New                                         |
| TE-F18 | unassigned | Resolved-URL discovery sees the whole graph, `@ydinjs/tproc` and the token DB included                   | New — supersedes the tracker half of TE-D10 |
| TE-F19 | unassigned | Per-entry dependency attribution collapses inside a shared generation                                    | New                                         |
| TE-F20 | unassigned | Node caches an evaluation failure permanently in the isolate that produced it                            | New                                         |
| TE-F21 | unassigned | No in-process signal distinguishes an ordinary VS Code run from a continuous one                         | New — refines TE-F12                        |
| TE-F22 | unassigned | A retained generation worker prevents the Vitest process from closing cleanly                            | New                                         |
| TE-F23 | unassigned | The whole-repository run with both real mechanisms measures Δ 5554 MiB in 63.6 s                         | New — supersedes the 10 384 MiB figure      |
| TE-F24 | unassigned | A plugin's `configureVitest` installs a reporter that no CLI flag can remove                             | New                                         |
| TE-F25 | unassigned | `Vitest.report` does not catch reporter errors, so `onTestRunStart` can abort a run                      | New                                         |
| TE-F26 | unassigned | The extension appends to configured reporters rather than replacing them                                 | New                                         |
| TE-F27 | unassigned | An empty specification list emits a run start without executing anything                                 | New                                         |
| TE-F28 | unassigned | `browser.api.allowExec` gates reruns, snapshot updates and the in-test `cdp()` API, and denial is silent | New — scope corrected at reconciliation     |
| TE-F29 | unassigned | A boundary never releases the project in the final group; process close does                             | New — falsifies part of TE-D12              |
| TE-F30 | unassigned | One consuming execution per extension-created process, by call-site enumeration                          | New — strengthens TE-F12                    |
| TE-F31 | unassigned | The extension's child has a noop watcher; continuous changes arrive over `onFilesChanged`                | New — refines TE-F21                        |
| TE-F32 | unassigned | The retained handle is the parent-side `MessagePort` with a live listener                                | New — identifies TE-F22's handle            |

Superseded by this pass: **TE-D9**, **TE-D10**, **TE-D11**. **TE-D8** stands,
amended. **TE-D1**, **TE-D3**, **TE-D6**, **TE-D7**, **TE-I1** stand.
**TE-F11**, **TE-F13**, **TE-F14** are confirmed. **TE-F15**'s output claim
stands; its speed and applicability claims are withdrawn.

## Decisions

### Nx stays out of test orchestration, and nothing is lost with it (TE-D8)

The decision is unchanged: the root `Justfile`'s `test` recipe becomes a single
`vitest run` against the root configuration, per-package invocation stays
available unchanged, and `nx.json`'s `build`, `typecheck` and docs targets are
untouched.

**The claimed consequence is deleted.** Revision 3 recorded that removing Nx
loses `dependsOn: ["^build"]` ordering for tests. Verified here: `nx.json`'s
`targetDefaults` has keys for `build`, `typecheck`, `docs:build`, `docs:dev`,
`docs:api:build` and `docs:api:prepare` and **no `test` key**; every
`packages/*/project.json` carries only `$schema`, `name` and sometimes
`implicitDependencies`; every package's `test` recipe is a bare
`vitest run -c vitest.config.ts`. `nx run-many -t test` never built anything, so
there is nothing to become unenforced. The demonstration item that checked it is
dropped.

Two real consequences, unchanged from the challenge's reading: the root run
covers all 15 projects where `just test` names seven packages today — identical
coverage, since those seven configs contribute exactly those 15 projects — and
`nx affected -t test` becomes unavailable in principle, which costs nothing
because the repository uses `nx affected` nowhere and affected **builds** stay
on Nx.

### Browser projects are serialized from group 1 and released at group boundaries (TE-D12)

Each browser project gets its own `sequence.groupOrder`, **assigned from 1**;
the non-browser projects share the highest group. When the first test module of
a later group starts, every browser project in an earlier group has its provider
closed and its Chromium exits.

**Why the boundary and not the last module.** `groupSpecs` awaits
`Promise.allSettled(promises)` for a whole group before the next group begins
(`cli-api.BK8pd4xc.js:3712`), so the first module of group _n+1_ provably
follows the completion of group _n_ — every page, orchestrator RPC and pool
promise of that group has settled. The last-module trigger has no such
guarantee, and it does not merely risk a race: it fails every time (TE-F16).

**Why from 1.** `groupOrder: 0` is Vitest's default sentinel, and
`cli-api.BK8pd4xc.js:3816` diverts a project with `isolate === true`,
`order === 0` and `maxWorkers === 1` into a trailing catch-all group appended
after every other (TE-F17). Holes are irrelevant — `:3632` is
`if (!group) continue;` — so contiguity buys nothing and revision 3's
"contiguous from zero" was wrong in the half that mattered.

**Required properties.**

- **Teardown is triggered by an event that provably follows the completion of
  the group the project ran in.** Module counting cannot express that.
- **Teardown is installed by the shared factory into every configuration the
  repository ships**, root and per-package alike, through the carrier TE-D15
  specifies. Revision 4 originally required the opposite — that a one-shot entry
  point contribute it, and that the root configuration the extension loads not
  carry it — because the editor's lifecycle was an open question then. It is not
  open now: the model is one-shot everywhere, so the contract belongs where no
  consumer can fail to get it. `watch` is still not evidence of anything
  (TE-F21) and is still not used.
- **A project that has been torn down is marked, and a run that would execute a
  specification belonging to a marked project fails loudly before executing
  anything.** Verified: the guard throws
  `project "b1 (chromium)" was torn down and cannot run again` before any module
  runs, in place of the silent zero-module green run TE-F11 produces.
- **Identity comes from the runtime project object, never a configured-name
  string.** A project configured as `b1` is reported throughout as
  `b1 (chromium)`; one configured project expands to one runtime project per
  `browser.instances` entry. A mechanism keyed on configured names matches
  nothing, silently.
- **The serialization invariant is checked before any specification executes**:
  every browser project has a distinct, non-zero `groupOrder`. This is what
  makes the `--sequence.*` erasure in TE-D14 loud instead of a silent return to
  the fan-out that was fatal. The check reads
  `spec.project.config.sequence.groupOrder` and never the position of a
  specification in the list, because **the list is unsorted at that point** —
  `sequencer.sort` runs later, inside `executeTests`. Measured on the fixture,
  `onTestRunStart` received `n1[go=3] decl[go=4] b1[go=1] …`.
- **Teardown at a boundary releases every browser project except the one in the
  final group** (TE-F29). The final group's provider is released by process
  close, which is safe but is not this mechanism. The property to assert is
  therefore Chrome returning to baseline before the process exits — which
  holds in both cases — and boundary closures only where a later group exists.
- **A teardown failure is distinguishable**, not merely present. The failure
  this mechanism produces when mistriggered is `Failed to run the test …`, which
  is indistinguishable from a genuine test failure; an acceptance check that
  greps for `provider was closed` reads clean while the mechanism is failing.
- **The generation worker and the browser providers are both released before
  the process closes** (TE-F22).

### Every Vitest process executes at most one test run (TE-D15)

The repository's test execution model is one-shot. A root CLI run, a per-package
CLI run and an ordinary run started from the VS Code Vitest UI each start a
Vitest process, execute one test run, release the browser providers at the group
boundaries TE-D12 establishes, and end. **Browser teardown applies to editor
runs as well** — the owner choice revision 4 recorded is closed in favour of
always tearing down.

Watch and Continuous Run rerun inside a process that has already torn down its
browsers, so they are not supported. TE-D16 retires them.

**The invariant, stated so it can be observed:** at most one _consuming_
execution per Vitest process. A run whose specification list is non-empty
consumes the process's single execution. A run with an empty list does not,
because Vitest emits a run start for it and executes nothing
(`cli-api.BK8pd4xc.js:13463`); a filter that matches no files must not spend the
lifecycle (TE-F27).

**The carrier — a plugin, not a configured reporter.** The mechanism is a
reporter, because teardown needs `onTestModuleStart` and the runtime project
object. But `test.reporters` is removable: when `--reporter` is present on the
command line, Vitest **replaces** the resolved reporter list wholesale
(`coverage.DM_a_rWm.js:437–452`), so a configured reporter is one flag away from
silently vanishing along with the contract it enforces. The reporter is
therefore installed by a **plugin** carried in the shared factory, from the
`configureVitest` hook, which runs at `cli-api.BK8pd4xc.js:13152` — after CLI
reporter replacement and before `createReporters` reads `resolved.reporters` at
`:13177`. Measured: with `--reporter=dot` on the command line, the plugin's push
survives and the reporter is constructed and driven (TE-F24).

Required properties of the carrier:

- **It is installed by the shared factory into every configuration**, so root
  and per-package runs and the editor all get it without an entry point opting
  in.
- **Installation is idempotent.** `configureVitest` is invoked once per project
  (`projects.flatMap`), so an unguarded push installs one reporter per project —
  fifteen in a root run.
- **It survives the editor.** The extension's own plugin appends its reporter to
  the configured list rather than replacing it, and passes `reporter: void 0`,
  so the CLI replacement branch is not taken (TE-F26).
- **What is pushed is a reporter instance, never a name.** `createReporters`
  normalizes only array entries and returns anything else unchanged
  (`cli-api.BK8pd4xc.js:11367–11382`, `return referenceOrInstance`); string
  normalization happens earlier, in `resolveConfig`, which has already run. A
  string pushed from `configureVitest` is therefore handed to `Vitest.report`
  as a string, `r[name]?.(…)` is `undefined`, and **the contract silently does
  nothing** — the one outcome it may not have. An instance, or a resolvable
  `[name, options]` tuple, is required.
- **The plugin reaches the projects that have no plugins today.**
  `configureVitest` hooks are gathered per project
  (`projects.flatMap(project => project.vite.config.getSortedPluginHooks(…))`),
  and the factory declares no `plugins` anywhere: `createNodeTestProject` and
  `createDeclarationTestProject` (`.scripts/vitest-config.ts:163, 173`) build
  from `createTestBaseConfig` alone, and the browser projects receive plugins
  only through the Vite config they merge in. A run filtered to
  `--project=node/tproc` would otherwise carry no carrier at all. This is why
  "into every configuration" is load-bearing rather than tidy.
- **The scope of "no flag can remove it" is the `test` command.** `:13177`
  branches on `resolved.mode === "benchmark"` to `createBenchmarkReporters`,
  which never reads `resolved.reporters`, so `vitest bench` drops the carrier.
  The repository runs no benchmarks, so this costs nothing today; the claim is
  narrowed rather than defended.

**The enforcement point — `onTestRunStart`.** It is the earliest per-run hook:
`Vitest.runFiles` awaits `this._testRun.start(specs)` before it creates the
pool, before `initializeGlobalSetup` and before `pool.runTests`. `Vitest.report`
is `await Promise.all(this.reporters.map(...))` with no `try`/`catch`
(`:13983`), so a throw there rejects the run before any module executes
(TE-F25). Verified end to end on an instance created with `watch: true` — the
extension's own configuration: run 1 executed 8 modules and released both
providers; run 2 threw
`this Vitest process has already executed a test run` and executed nothing.

Three checks live at that point, and all three fail loudly:

- a **second consuming execution**, which names the contract and says that watch
  and continuous reruns are retired. This is what "never silently succeeds with
  zero modules" covers: **reuse**. The neighbouring case is not ours to claim —
  a run whose filter matches nothing reports a successful run of nothing, and
  under the extension's unconditional `watch: true` it does not even raise
  `FilesNotFoundError` (TE-F27). That route predates every revision and
  survives. The carrier does see `specs.length === 0` at the one hook that runs
  for such a run and could refuse a filtered empty execution; that is recorded
  as an available strengthening rather than a requirement, because its blast
  radius on legitimate editor gestures cannot be measured without an editor;
- a specification belonging to a **torn-down project**, which holds even if it
  were the first execution — TE-D12's marking, kept as defence in depth against
  the silent zero-module success TE-F11 produces;
- the **serialization invariant**, every browser project carrying a distinct
  non-zero `groupOrder`, which is what makes TE-D14's `--sequence.*` erasure
  loud.

**The guard's scope is every path that emits a run start**, which is
`Vitest.runFiles` and therefore all four public run entry points and the two
RPC methods that reach them. It is **not** every path that executes
specifications: `Vitest.collectTests` (`:13692`) goes straight to `createPool`,
`initializeGlobalSetup` and `pool.collectTests` without calling
`_testRun.start`, and the browser pool's collect path launches Chromium. The
guard cannot see it. The exception is unreachable here — the extension collects
through `experimental_parseSpecifications` (verified), and no CLI entry point
collects after running in one process — but the scope is stated as what it is
rather than claimed wider.

**The boundary of "before test reporting", stated honestly.** `Promise.all`
invokes every reporter's `onTestRunStart`, so on a rejected second attempt the
other reporters do see a run start. No test executes and no test result is
reported. That is the strongest position available from a public hook. One
consequence follows and the implementation must not paper over it: the throw
happens before `runningPromise` is assigned, so the `finally` that calls
`_testRun.end` never runs and **no `onTestRunEnd` is emitted for the refused
execution**. A consumer pairing start with end sees an unbalanced start; the
extension recovers, because `executeRun`'s `finally` disposes and ends the run.
The refusal must propagate to the caller and must never be absorbed into a
"completed" run.

**Why not prevent it at entry.** `Vitest.runFiles` is the single funnel — four
public entry points (`runTestSpecifications`, `rerunTestSpecifications`,
`rerunFiles`, `rerunTask`) and two of those also exposed over the API server —
so wrapping it would refuse the second execution before anything at all was
reported. It is rejected: `runFiles` is internal and unmarked, and a monkey
patch over it disappears without a word when the name changes in a Vitest
upgrade. A contract whose whole purpose is to make a silent failure loud must
not be enforced by a mechanism that can go silent. The reporter hook is public
API, and if it were ever removed the run would fail rather than proceed
unguarded.

**Discovery is unaffected.** The extension collects tests through
`experimental_parseSpecifications` — AST-based, never reaching `runFiles` — so
listing tests neither consumes the lifecycle nor trips the guard, and root-config
discovery is preserved exactly as revision 2 established it.

### Test watch and Continuous Run are retired, with the machinery that served them (TE-D16)

TE-D15 makes a second execution in one process a loud failure. The modes that
depend on one are therefore withdrawn, and the machinery whose only
responsibility was supporting them is removed rather than left to fail.

**Retired.** `vitest --watch` in any form for tests; VS Code Continuous Run —
both the "eye" gesture and `vitest.watchOnStartup`, the setting that turns it on
for every config at activation without a gesture; and any rerun issued into a
process that has already run. Continuous Run cannot be disabled as a gesture, so
it is retired by documentation plus the loud failure; the setting can be, and
is.

**The inventory, and what happens to each.**

| Item                                                               | Responsibility                                                                                                                               | Disposition                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| root `package.json` `"test": "vitest"`                             | bare `vitest` is watch mode — the only watch entry point in the repository                                                                   | becomes the one-shot root run TE-D8 already requires                                    |
| `.scripts/zed-test.sh`, `run-vitest-debug`                         | the only `--watch` in the tree                                                                                                               | becomes **`vitest run`** — deleting the flag is not enough (below)                      |
| `.scripts/zed-test.sh`, `pkill -f 'vitest.*browser'`               | kills a surviving watch runner so it cannot respawn Chrome — its comment says so                                                             | **removed**; the sibling `pkill` on the CDP port keeps its own justification            |
| `.vscode/settings.json`, `vitest.watchOnStartup`                   | the extension's continuous-run switch: _"Watch every test file after the extension is loaded. This is the same as enabling continuous run."_ | set explicitly **`false`**, beside TE-D7's other change to that file                    |
| `.agents/docs/test-architecture.md` and the `test-component` skill | say nothing about run lifecycle today                                                                                                        | **gain** the one-shot statement, the retirement, and what a second execution looks like |

Two of those need their reasoning on the record.

**The debug recipe must become `vitest run`, not lose a flag.**
`.zed/tasks.json`'s `vitest:debug` invokes `.scripts/zed-test.sh … debug`, whose
`run-vitest-debug` calls the binary directly:
`DEBUG=1 vitest -c vitest.config.ts --no-file-parallelism --test-timeout=0 --watch <file>`.
Deleting `--watch` leaves `vitest -c … <file>`, and the default is
`watch: !isCI && process.stdin.isTTY && !isAgent`
(`vitest/dist/chunks/defaults.9aQKnqFk.js:48`) — while the task sets
`use_new_terminal: true`, so stdin **is** a TTY and the session stays in watch
mode. That is worse than a no-op: unlike the extension's child, this process has
a real Vite watcher and no `onFilterWatchedSpecification` filter, so a save
during a paused debug session would reach `scheduleRerun` with a non-empty list
and hit the one-shot guard, converting today's working "save to re-run" into a
loud failure instead of into nothing. The disposition is `vitest run`, which is
also what TE-D8 already specifies for the root `"test"` script.

What is lost is re-running on save, which is what has been retired. The session
itself is unaffected: `--watch` is not what holds it open — `--test-timeout=0`
and a test paused on a breakpoint are — and the task, its terminal and the CDP
port survive unchanged.

**`browser.api.allowExec` leaves this inventory, and the reasoning is worth
keeping.** Revision 4 put it here on the ground that it gates the API server's
`rerun`, `rerunTask` and `updateSnapshot` — the browser UI's re-run buttons —
and nothing else. The challenge corrected the scope: it **also** gates the
in-test `cdp()` API, through `isCdpAllowed` / `assertCdpAllowed`
(`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300` and `:3305`). It
then concluded that the capability is unused and the change harmless. It is not
unused: `packages/drag2/tests/sortable/input-policy.browser.test.ts` imports
`cdp` from `vitest/browser` at `:49` and calls it twice, at `:148` and `:1332`.
Setting `allowExec: false` would break that suite.

Two reasons settle it against the change, and the second is the stronger:

- the capability is in use, and retiring reruns is no reason to remove an
  unrelated one;
- denial is a **silent `return`** at each gate, whereas TE-D15's guard already
  makes a rerun into a consumed process a loud failure. Setting the flag false
  would replace a loud failure with a silent no-op for exactly those RPCs. The
  guard is the better instrument, and the gate would work against it.

The flag stays explicitly `true`, which also keeps Vitest's "API server is
exposed to network" warning quiet — the condition is
`api.allowWrite == null && api.allowExec == null`, so an explicit value of
either polarity silences it. `allowWrite` is untouched and already resolves to
`false` under the exposed-host branch. Debugging never depended on the gate in
any case: the Zed flow drives raw Chrome through `--remote-debugging-port=9222`
from the factory's launch args, and Vitest's own breakpoint support calls
`provider.getCDPSession` directly (`cli-api.BK8pd4xc.js:2652`), past it.

**The boundary, precisely.** Only _test_ watch is retired. Build and development
watch are untouched and remain valid: `just docs-dev`, Vite's and tsdown's own
watchers, the CSS plugin's `handleHotUpdate` and `addWatchFile`, and every
consequence of TE-D13 — repeated CSS generation still happens on every rebuild
and still requires a fresh disposable isolate per generation. Nothing in this
decision touches them.

### CSS is evaluated by one fresh isolate per build generation (TE-D13)

The workers buy exactly one thing: a cold ESM registry, so a `.css.ts` graph is
evaluated against current file contents. Revision 3 concluded that a persistent
Vite environment provides that guarantee and a stronger one. It does not, at the
boundary the owner has now stated.

**The owner's boundary decides the fork the challenge identified.** Freshness
covers every input affecting generated CSS, including a rebuilt
`@ydinjs/tproc`. An in-process evaluator cannot hold it: an externalized
dependency is loaded by Node's own process-scoped registry and is permanently
stale, and inlining `@ydinjs/tproc` costs 3 946 MiB retained on the challenge's
measurement. Measured here by an independent route — a bare specifier resolved
through a `node_modules` symlink, exactly `@ydinjs/tproc`'s shape:

| Step                            | Fresh worker per generation | The host process's own `import()` |
| ------------------------------- | --------------------------- | --------------------------------- |
| cold                            | `GEN-1`                     | —                                 |
| repeat, no change               | `GEN-1`                     | —                                 |
| after the dependency is rebuilt | **`GEN-2`**                 | `GEN-2`                           |
| after it is rebuilt again       | **`GEN-3`**                 | **`GEN-2`** — permanently stale   |

**The mechanism costs less than what it replaces, on every axis.** All 35
`.css.ts` entries in `packages/material-x`, with the plugin's own two
`registerHooks` preloads:

| Arrangement                                  | Total         | First entry | RSS           | Output              |
| -------------------------------------------- | ------------- | ----------- | ------------- | ------------------- |
| today — one fresh isolate per entry          | 15 312.1 ms   | 511.7 ms    | —             | reference           |
| **one fresh isolate per generation**         | **1186.7 ms** | 480.7 ms    | **412.9 MiB** | **35/35 identical** |
| the same, entries evaluated in reverse order | 1270.5 ms     | —           | 374.1 MiB     | **35/35 identical** |

**Generation ownership.** One generation per Node process, acquired by each
plugin instance that needs it and released when the last one is done; the
generation terminates when its reference count reaches zero. Three plugin
instances participate in a root run — material-x's `browser`, `spec` and
`visual` projects each embed `createMaterialXViteConfig`, which carries
`constructCSSTokens` — and process-wide sharing is sound because evaluation
depends only on file contents, never on the consumer's options: `isProd` reaches
`compileCSS`, which is downstream. The measured whole-repository figure is for a
process-wide generation.

**Dependency discovery.** The resolve hook reports **the URL `nextResolve`
returns**, filtered to `file:`, and filters on nothing else. The current
tracker's two rules — only specifiers beginning with `.`, and nothing resolving
under `node_modules` — are both removed. Measured over the 35 entries: the
current rules report **66** paths, resolved-URL discovery reports **123**,
including **29 under `packages/tproc`** — its built artefacts, `default-theme.json`
and the 14 token-database JSON files, which are reached by
`import(…, { with: { type: 'json' } })` and are therefore module-graph inputs
like any other (TE-F18). Node's ESM resolution follows the workspace symlink, so
`@ydinjs/tproc` resolves to `packages/tproc/…` and not to a `node_modules` path.

**Invalidation.** Generation-scoped, never entry-scoped. A change to any file in
the generation's dependency set, or to any `.css.ts`, discards the generation;
the next request creates a new one, which evaluates the complete graph against
current files. This is the owner's contract exactly — shared within a
generation, complete across generations — and it is also forced by TE-F19: in a
shared generation, per-entry attribution collapses to 119 recorded edges against
583 in the per-entry arm, with a median of 3 per entry and **one entry
attributing none at all**. Per-entry `addWatchFile` would therefore leave 34 of
35 entries unwatched against a shared token file. Every entry registers the
generation's whole set.

**Concurrent requests.** Requests are multiplexed onto the generation over one
port with request identifiers; concurrent `load` calls are served by one
isolate. Verified against the real plugin, converted: six concurrent `load`
calls returned correct output in 582.9 ms and registered 31 watch files. A
request arriving while a generation is being discarded is served by the next
generation, never by the dying one.

**Failure cleanup.** A worker `error` or non-zero `exit` drops the generation
and rejects every pending request with the underlying error; the next request
starts a new generation. **An evaluation failure also discards the generation**,
because Node caches a module's evaluation failure permanently: measured, a
module that throws keeps throwing the original error in the same isolate after
the file is corrected, and a fresh isolate returns the corrected value (TE-F20).
Without this rule, fixing a broken `.css.ts` in watch mode would appear not to
work until the dev server restarted.

**Shared-state protection.** The required property is that output must not
depend on evaluation order, nor on which entries share a generation. Held today
and measured in both directions: shared generation against one fresh isolate per
entry, 35 of 35 byte-identical; forward order against reverse order, 35 of 35
byte-identical. This is a property of the current tree, so it belongs in the
demonstration list rather than in an assumption.

**The `.styles.css` id still needs a non-`.css` suffix** (TE-F13) only if a Vite
module graph is involved. It is not, under this mechanism: the styles file is
loaded by the `registerHooks` `load` preload inside the isolate, and never
becomes a Vite module. The virtual-id problem revision 3 hit, and the reverse
mapping the challenge showed it had only half-solved, both disappear with the
mechanism that created them.

**Both consumer classes are covered without a Vite dev server.** The isolate is
a plain `node:worker_threads` worker with two `--import` preloads, so the tsdown
build path needs nothing new.

### The requested worker limit, and what constrains it (TE-D14)

The precedence order stands; three interactions the order did not account for
are added, and the CLI route is narrowed to a contract that can be stated
exactly.

Precedence, highest first:

1. **`VITEST_MAX_WORKERS`** — applied inside the per-project `resolveConfig`
   (`coverage.DM_a_rWm.js:380`), after every other resolution including the
   `fileParallelism: false` clamp, so it wins unconditionally and needs no code
   from us. It is the only route that reaches the VS Code extension, through
   `vitest.nodeEnv`; the keys the extension fixes for itself are
   `VITEST_VSCODE_LOG`, `VITEST_VSCODE`, `TEST`, `VITEST_WS_ADDRESS`, `VITEST`,
   `NODE_ENV` and `FORCE_COLOR`, and this is not among them.
2. **`parseArgs(process.argv)`** in the shared factory, applied as each project's
   `maxWorkers`, so that `vitest run --maxWorkers=N` behaves as its own
   documentation says despite TE-F1.
3. **The factory default**, TE-D3's explicit value. This, not the flag, is what
   bounds the editor.

**The environment variable does not accept the percentage form.** It is a bare
`Number.parseInt`, and `resolveInlineWorkerOption` — which does understand `N%`
— runs earlier in the same function (`:222` against `:380`), so the value is
never re-resolved. `VITEST_MAX_WORKERS=50%` yields **50 workers**. This footgun
sits on the route recommended for the extension and belongs beside the route.

**`--sequence.*` erases every project's `groupOrder`.** `sequence` is one of the
20 names in the CLI override allow-list, and the merge is
`test: { ...options.test, ...cliOverrides }` (`:11129`), which replaces the
object wholesale. A stray `vitest run --sequence.shuffle` therefore collapses
every project to `groupOrder: 0` — which, by TE-F17, both destroys the
serialization and arms the sentinel. TE-D12's pre-execution invariant check is
the answer; the two decisions must be read together.

**Projects sharing a group must have equal resolved `maxWorkers`**, or
`groupSpecs` throws before executing anything (`:3826`). TE-D12 puts every
non-browser project in one group, so the factory must derive their `maxWorkers`
from a single resolved value. It does, under all three precedence routes: the
environment variable applies the same number to every project, and so do the
flag and the default. The constraint is loud rather than silent, but neither
revision 3 nor its predecessors recorded that the two decisions are jointly
constrained.

**The CLI contract, stated exactly.** `parseArgs` runs with `strict: false`,
because Vitest passes many flags it does not declare. The accepted forms are a
positive integer and `N%`, matching Vitest's own inline semantics; anything else
fails the configuration load with a diagnostic rather than being silently
coerced. Under the extension the route is inert by construction — `cliArguments`
are turned into an options object by `parseCLI` and never become `process.argv`
(TE-F14), and `parseCLI` runs with `allowUnknownOptions: false`, so a malformed
extension setting fails the run rather than being ignored. That inertness is
acceptable only because the factory default bounds the editor.

## Findings

### The last-module teardown trigger fails deterministically (TE-F16)

`onTestModuleEnd` is emitted from `TestRun.updated`
(`cli-api.BK8pd4xc.js:12661`), reached from the `onTaskUpdate` RPC method at
`:2734`, and `Vitest.report` at `:13983` awaits every reporter. The browser page
is awaiting the reply to its own RPC while the hook runs, so closing the
provider there destroys the page that is waiting.

Measured on a two-browser-project fixture, three and four modules,
`maxWorkers: 1`:

| Trigger                        | Modules | Tests | Unhandled errors | Exit  | Chrome at end |
| ------------------------------ | ------- | ----- | ---------------- | ----- | ------------- |
| none (control)                 | 8       | 11    | 0                | 0     | 11            |
| last `onTestModuleEnd`         | 8       | 11    | **2**            | **1** | 6             |
| **first module of next group** | 8       | 11    | **0**            | 0     | **3**         |

Both errors in the middle arm are
`Failed to run the test <last module of the project>`. In that arm one provider
also never reported closing at all — the close promise did not settle before the
run ended.

This disqualifies revision 3's acceptance check, which recorded that "the string
`provider was closed` appears in no log". That string is not what this failure
emits, so revision 3's whole-repository arms could each have carried one
`Failed to run the test …` per browser project and been read as the excluded
`tproc` failure. **Their pass status cannot be certified**, which is one reason
this pass re-measured rather than inheriting.

### Group order zero is a sentinel, not a number (TE-F17)

Measured on the same fixture, two browser projects at `maxWorkers: 1` and one
node project:

| Assignment           | Observed order                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| b1=0, b2=1, n1=2     | b2 → n1 → **b1 last** — b1 demoted to the trailing catch-all group     |
| b1=0, b2=0, n1=1     | n1 first, then **b1 and b2 interleaved** — serialization gone entirely |
| **b1=1, b2=2, n1=3** | b1 → b2 → n1                                                           |

The trap fires exactly in the regime this design moves toward, and
`VITEST_MAX_WORKERS=1` reaches the same field and arms it the same way.

### Resolved-URL discovery sees the whole graph (TE-F18)

Over the 35 entries, with both rules of the current tracker evaluated alongside
the resolved URL from `nextResolve`:

| Discovery rule                                      | Distinct paths                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| current — relative specifiers, minus `node_modules` | 66                                                                  |
| resolved `file:` URLs                               | **123**                                                             |
| of which `packages/material-x`                      | 88                                                                  |
| of which **`packages/tproc`**                       | **29** — built artefacts, `default-theme.json`, 14 token JSON files |
| of which under a real `node_modules` path           | 3                                                                   |
| non-`file:` (`node:` builtins)                      | 6                                                                   |

The freshness boundary this establishes is precise: **every input reached
through the module graph is discoverable**, and inputs read through `fs` rather
than imported are not. There are none today — the token database is reached by
`import(…, { with: { type: 'json' } })` in `packages/tproc/src/DB/DB.ts`. One
boundary remains and should be written down rather than discovered: a dependency
consumed from a real `node_modules` directory rather than through a workspace
symlink falls under Vite's default watcher ignore, so its rebuild would not
trigger invalidation. `@ydinjs/tproc` is not such a dependency.

### Per-entry attribution collapses inside a shared generation (TE-F19)

Segmenting the resolve trace by the entry being evaluated, in one shared
isolate: **119** attributed edges in total against **583** in the per-entry
worker arm, a median of **3** per entry, the first entry absorbing 17 and **one
entry attributing none at all**. The union across the generation is complete;
the per-entry split is not, because a module already loaded for an earlier entry
resolves none of its own imports again.

### Node caches an evaluation failure permanently (TE-F20)

| Step                                        | Result     |
| ------------------------------------------- | ---------- |
| import a module that throws                 | `BOOM`     |
| correct the file, re-import in same isolate | **`BOOM`** |
| correct the file, import in a fresh isolate | `FIXED`    |

### No in-process signal separates an ordinary editor run from a continuous one (TE-F21)

`vitest.explorer@1.50.8`, `dist/workerNew.js`, builds the `createVitest`
options with **`watch:!0` unconditionally** — a bare literal, no ternary, no
guard — for every run the extension makes. Ordinary and continuous runs reach
the child through the same spawn with the same argv and the same environment
keys; nothing named `continuous`, `once` or a mode flag exists anywhere in the
init payload or is forwarded into `createVitest`. The reuse guard confirms
revision 3's TE-F12 — `spawnForRun`'s reuse branch is gated on `currentMeta`, an
instance field of an object `executeRun` creates fresh, so an ordinary run
always spawns and is disposed in `finally`, while continuous reuses the
long-lived instance.

The nearest thing to a continuous-only marker is the `watchTests` RPC, called
only from `syncWatcher` on the continuous runner subclass. It is **not** the
only RPC the extension sends its worker — `runTests`, `updateSnapshots`,
`onFilesChanged`, `onFilesCreated`, `unwatchTests`, `getFiles`, `collectTests`,
`cancelRun` and others share that channel — and no claim that it is may enter
this design. What is specific to it is its effect: it is the call that enables
the worker's watch tracking. Either way it travels between the extension and its
own worker and is invisible to a Vitest reporter or plugin, so it cannot gate
anything here.

**Where a continuous rerun actually comes from**, which matters because it is
not the child's own watcher. The extension creates Vitest with
`server: { middlewareMode: true, watch: null }`, and Vite installs a **noop**
watcher in exactly that case (`vite/dist/node/chunks/node.js:25752–25757`). File
changes reach the child by being **forwarded**: the extension's own file-system
watcher calls `bt.onFileChanged`, which — only when that object's `currentMeta`
is set, i.e. on the long-lived continuous or debug process — sends the
`onFilesChanged` RPC, whose worker handler is
`onFilesChanged(e){ e.forEach(f => this.vitest.watcher.onFileChange(f)) }`. That
reaches `VitestWatcher`, `onWatcherRerun` and `Vitest.scheduleRerun`, which has
no `config.watch` guard of its own. Changes arriving while a persistent process
is still spawning are buffered in `_pendingFileChanges` and flushed on spawn.

Three independent mechanisms therefore keep an **ordinary** editor run from
producing a second consuming execution, and none of them is `watch`: the child's
watcher is a noop; `executeRun` builds a fresh API object that is never
registered with the extension's watcher, so nothing is forwarded to it; and even
a delivered change would be filtered out by the worker's
`onFilterWatchedSpecification`, whose `shouldRunSpecification` returns `false`
until `watchTests` enables tracking — leaving an empty, non-consuming execution.
Continuous Run is the only path that produces a non-empty rerun, which is
exactly the path TE-D16 retires.

**Consequence.** `watch === false` is not merely a weak proxy — it is the wrong
question, because the one editor path whose lifecycle is provably one-shot is
marked `watch: true`. A one-shot lifecycle cannot be _detected_; it can only be
**declared**. Revision 4 read that as "declared by the entry point"; the owner
has since declared it for the repository, so TE-D15 states it as a property of
every Vitest process this repository starts, and TE-D16 retires the modes that
would contradict it.

### A retained generation worker prevents a clean process close (TE-F22)

The same single-project command, with and without the converted plugin:

| Plugin                                | Outcome                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| pristine                              | exits cleanly                                                |
| converted, generation worker retained | `close timed out after 10000ms`, then Vitest forces the exit |

`worker.unref()` is not sufficient; the parent's `MessagePort` keeps the loop
alive. The whole-repository run completed and reported correctly and then paid
the 10 s close timeout. Teardown is not the cause — with the pristine plugin the
fixture's `vitest.close()` took 339 ms without teardown and **4 ms with it**.

**The handle is now identified rather than inferred**, which settles one of
revision 4's own challenge grounds. Measured on a host/worker fixture holding a
parent-side `port.on('message')` listener — the shape a multiplexed request port
must have:

| Disposition                       | Result                     |
| --------------------------------- | -------------------------- |
| nothing                           | still alive at 1552 ms     |
| `worker.unref()` only             | **still alive at 1550 ms** |
| `worker.unref()` + `port.unref()` | exits in 50 ms             |
| `worker.unref()` + `port.close()` | exits in 51 ms             |
| `worker.terminate()`              | exits in 52 ms             |

**The parent-side `MessagePort` with a live `message` listener is the retained
handle**, and `terminate()` is sufficient because it detaches the port.
Unref-ing the worker without touching the port is the one disposition that looks
correct and is not. The challenge reports the same rule from a fixture in which
`worker.unref()` alone sufficed when the worker used a one-shot listener; here
the parent held a persistent listener in both arms and it did not, which is the
sharper statement of the same fact — the parent side is what holds the loop.

**`closeBundle` is the right backstop** behind reference-counted release. Vite's
plugin container close calls `hookParallel("closeBundle", …)` unconditionally
(`vite/dist/node/chunks/node.js:30185`), while `buildEnd` at `:30184` is gated on
environment and server options; `closeBundle` therefore fires for a dev-server
close and for a rolldown build alike.

### A plugin can install a reporter that no flag can remove (TE-F24)

`configureVitest` is a plugin hook invoked at `cli-api.BK8pd4xc.js:13152` with
`{ project, vitest, injectTestProjects, … }`, awaited in `Promise.all`, and
`vitest.config` there is the same object `createReporters(resolved.reporters, …)`
reads at `:13177`. Measured with `--reporter=dot` on the command line, which had
already replaced the configured reporters:

```
[oneshot] configureVitest: same object as resolved? true  reporters before: [["dot",{}]]
[oneshot] reporters after: 2
[oneshot] reporter constructed and initialised
[oneshot] onTestRunStart #1 specs=1
```

### Reporter errors are not caught, so a reporter can abort a run (TE-F25)

`Vitest.report` is `await Promise.all(this.reporters.map((r) => r[name]?.(…)))`
with no `try`/`catch` (`:13983`), and `runFiles` awaits `_testRun.start(specs)`
before `createPool`, before `initializeGlobalSetup` and before `pool.runTests`.
Measured on an instance created with `watch: true`:

| Run | Modules executed | Outcome                                                            |
| --- | ---------------- | ------------------------------------------------------------------ |
| 1   | 8                | passed, 0 errors, both providers released, Chrome back to baseline |
| 2   | **0**            | **threw** `this Vitest process has already executed a test run`    |

### The extension appends to configured reporters (TE-F26)

`workerNew.js`'s own plugin: `let t = o(e.test.reporters); t.length ||
t.push(['default', {isTTY:!1}]); t.push(s); e.test.reporters = t`. It passes
`reporter: void 0` into `createVitest`, so Vitest's CLI-replacement branch —
guarded by `if (cliReporters.length)` — is not taken. A reporter declared or
installed by the repository's configuration therefore runs inside the
extension's child process.

### An empty specification list emits a run start without executing (TE-F27)

`cli-api.BK8pd4xc.js:13463` calls `_testRun.start([])` and `_testRun.end([], [])`
when no specification matched, then throws `FilesNotFoundError` only when not in
watch mode. Under the extension, which always sets `watch: true`, a filter that
matches nothing therefore produces a run start and no error. This is why TE-D15
counts only non-empty executions.

### `allowExec` gates reruns and snapshot updates, and denial is silent (TE-F28)

`cli-api.BK8pd4xc.js:8982`, `:8987` and `:9036` gate `rerun`, `rerunTask` and
`updateSnapshot` on `config.api.allowExec`, each with the comment "silently
ignore exec attempts if not allowed" and a bare `return`. It does **not** gate
`browser.commands`, which the factory also configures — but it does gate one
more thing revision 4 missed: the in-test `cdp()` API, through `isCdpAllowed` /
`assertCdpAllowed` (`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300`
and `:3305`). That capability is in use —
`packages/drag2/tests/sortable/input-policy.browser.test.ts` imports `cdp` from
`vitest/browser` at `:49` and calls it at `:148` and `:1332` — which is why
TE-D16 leaves the flag alone. Vitest's own breakpoint support does not pass the
gate: it calls `provider.getCDPSession` directly
(`cli-api.BK8pd4xc.js:2652`).

### The final group is released by process close, not by a boundary (TE-F29)

The boundary mechanism releases a project when a **later** group's first module
starts, so a project occupying the final group is never released by it.
Revision 4 read its own root-run log as evidence that "every browser project is
released, including the last"; that holds because the root configuration's
non-browser projects sit in the highest group, and it is a property of that
configuration rather than of the mechanism.

Measured on a fixture filtered to one browser project — which is what a
project-filtered run instantiates, because `--project` rejects non-matching
projects during resolution:

| Quantity                      | Value                |
| ----------------------------- | -------------------- |
| projects resolved             | `b1 (chromium)` only |
| boundary closures             | **0**                |
| Chrome baseline               | 6                    |
| Chrome during run             | 10                   |
| Chrome after `vitest.close()` | **6**                |

The provider is released by `Vitest.close()` → `pool.close()` →
`browserPool.close()`. Safe, but not the mechanism the design credits.

The configurations whose final group is a browser group are ordinary ones:
`packages/box-quad`'s entire per-package configuration declares exactly one
project, `browser` (`.scripts/vitest-config.ts:293`); material-x's
`test-behavior`, `test-spec` and `test-visual` recipes and box-quad's
`test-behavior` all pass `--project`; and so does every project-filtered editor
gesture. This bounds TE-D12's benefit honestly: in the editor it does work for
"Run All Tests" and nothing for the single-project gestures.

Configurations that end in a node or declaration project do release their last
browser project, and the declaration case had to be checked rather than assumed:
**typecheck projects do emit `onTestModuleStart`**. Measured on the same
fixture, `moduleStart decl[go=4]` fires after both browser groups, in its own
appended group, and closes group 2's provider on the way.

### One consuming execution per extension-created process, by enumeration (TE-F30)

Revision 4 left this as a per-gesture question for the demonstration list. It is
answerable from the bundle, and the answer is exhaustive rather than sampled.

`dist/extension.js` contains exactly **one** `rpc.runTests(` site and exactly
**one** `rpc.updateSnapshots(` site, and they are the two arms of a single
ternary called once — mutually exclusive, no loop. Three run profiles exist in
total (`Run`, `Debug`, `Coverage`), created together; there is no fourth. A
gesture queued behind another stores a thunk that calls `executeRun` again,
which builds a new API object and spawns again. So no gesture can issue two runs
against one process.

`vitest.updateSnapshot` deserved its own trace and closes favourably. It is a
**command, not a profile**, and its manifest exposes it only on
`testing/item/context` and `testing/item/gutter` with `commandPalette` gated
`when: "false"` — so it is reachable only against a **single test item**. It
takes the same `:run` profile as an ordinary run, builds a request with
`continuous` false, and reaches `executeRun` and therefore a fresh process; the
worker's `updateSnapshots` enables snapshot update and calls `runTests` once.

| Gesture                                | Path                                                      | Consuming executions |
| -------------------------------------- | --------------------------------------------------------- | -------------------- |
| single test / file / project / Run All | `:run` profile → `enqueue` → `executeRun` → fresh process | 1                    |
| update snapshots                       | command → the same `:run` profile → the same path         | 1                    |
| coverage                               | `:coverage` profile, its own queue → `executeRun`         | 1                    |
| debug                                  | `bt.forDebug`, `currentMeta` preset                       | 1                    |
| a gesture queued behind another        | `pendingQueue` → `executeRun` again → a new process       | 1 each               |
| Continuous Run                         | `spawnForContinuesRun` → reuse of the long-lived process  | the 2nd fails loudly |

This is source-derived. No editor gesture has been exercised in any pass, so the
demonstration that remains is a confirmation in a real editor, not an open
question about the code.

## Corrections to earlier revisions

Stated rather than quietly dropped.

- **Revision 3's teardown trigger was wrong**, and its acceptance check could
  not have detected that it was wrong. Both are corrected above.
- **Revision 3's `watch === false` gate is withdrawn.** It was described there
  as "a positive check on run mode, not an assumption about the caller"; it is
  an assumption about the caller, and TE-F21 shows it excludes the one editor
  case teardown is safe for.
- **Revision 3's "contiguous from zero" property is withdrawn** in both halves.
- **TE-F15's speed and applicability claims are withdrawn.** The 1 863 ms figure
  came from `runnerImport`, which externalizes `@ydinjs/tproc`; the mechanism
  revision 3 actually specified inlines it, at 19 001 ms and 3 812 MiB for a
  single entry on the challenge's measurement. The byte-identical output claim
  stands.
- **The 10 384 MiB figure is superseded.** It measured the revision-2 semaphore
  standing in for CSS and a teardown trigger this revision refutes.
- **Revision 4's claim that the boundary releases every browser project
  "including the last" is corrected by TE-F29.** It is true of the root
  configuration and of no configuration whose final group is a browser group.
- **Revision 4's reading of `watchTests` is tightened.** It is the call that
  enables the worker's watch tracking; it is not the only RPC the extension
  sends its worker, and this record does not say that it is.
- **Revision 4's `allowExec` disposition is withdrawn**, and the challenge's
  replacement for it is declined on evidence the challenge did not have: the
  in-test `cdp()` API it also gates is used by drag2's input-policy suite, and
  denial is silent where TE-D15's guard is loud. The scope correction to TE-F28
  is accepted; the change to the flag is not.
- **Revision 4's own teardown-ownership property is corrected by TE-D15.** It
  required the teardown carrier to sit in a one-shot entry point and to stay out
  of the configuration the extension loads. That followed from the editor's
  lifecycle being unsettled; with the model declared one-shot everywhere, the
  carrier belongs in the shared factory, and revision 4's open owner choice is
  closed.
- **The VS Code extension is not installed in this container.** The editor
  server present is Zed. All extension findings in every revision are source
  reading — here, of the marketplace artefact self-reporting
  `vitest.explorer@1.50.8` — plus API-level simulation. No running editor has
  been observed in any pass, and revision 2's phrasing "the installed extension"
  overstated that.

## How implementation demonstrates the required behaviour

The obligation is on the shipped implementation, not on this pass's probes.

1. **The root run reproduces the resource result with the real mechanisms.** One
   `vitest run` over all 15 projects, with the converted plugin and the teardown
   reporter as shipped: peak `memory.current` at or below the Δ 5554 MiB
   measured here over the run's own baseline, no `oom_kill`, and duration within
   the 63.6 s measured here plus a stated margin. The semaphore figure is not
   inherited.
2. **The run is clean by the right signal.** Zero unhandled errors, and zero
   occurrences of `Failed to run the test` — not the absence of
   `provider was closed`, which this mechanism never emits.
3. **Every browser provider is released, and the count is asserted**: seven of
   seven closed, each at a group boundary, with Chrome processes returning to
   the run's baseline before the process exits.
4. **The process closes cleanly.** No `close timed out` line; the generation
   worker is terminated when its last consumer releases it.
5. **The serialization invariant fails loudly when broken.** A run with
   `--sequence.shuffle` aborts before executing a specification, naming the
   projects whose `groupOrder` was erased.
6. **A torn-down project fails loudly on reuse.** Driving a second run against
   the same instance raises before any module executes, instead of reporting a
   zero-module success.
7. **CSS output is unchanged and order-independent.** All 35 entries, three
   ways: one isolate per entry, one shared generation forward, one shared
   generation reversed — byte-identical across all three.
8. **Freshness holds across a workspace rebuild.** With `just docs-dev` running,
   rebuild `@ydinjs/tproc` and observe the next generation produce CSS from the
   rebuilt artefact, without restarting the dev server.
9. **A corrected file recovers.** Break a `.css.ts`, observe the error, correct
   it, and observe the next request succeed without a restart.
10. **Dev-watch invalidation is wired to the discovered set** — development
    watch, which TE-D16 keeps. Editing a shared token file re-evaluates every
    entry that reaches it, not only the entry that happened to be evaluated
    first.
11. **Both consumer classes pass**: the root test run, `just build`,
    `just docs-build` and `just docs-dev`. Revision 3's tsdown evidence was one
    hook in a minimal build and does not carry.
12. **Per-package invocation is unchanged**: `cd packages/<pkg> && just test`
    still runs that package's own configuration.
13. **The editor path still discovers and runs tests.** Discovery lists every
    project, a single test runs, and a project-scoped run runs, against the
    unchanged root `vitest.config.ts`.
14. **The editor releases its browsers.** A whole-repository run from the editor
    releases every browser project it visited at a group boundary; a
    project-filtered gesture releases its single provider at process close, not
    at a boundary (TE-F29). The property asserted in both cases is **Chrome
    returning to baseline before the process exits** — boundary closures are
    asserted only where a later group exists.
15. **Confirm in a real editor what the code already says.** TE-F30 settles by
    enumeration that no gesture can issue two consuming executions against one
    process; what is owed is the confirmation itself — a single test, a file, a
    project, "Run All Tests" and "Update snapshots", none tripping the guard.
    A gesture that does trip it is a defect to resolve before shipping.
16. **The carrier cannot be removed.** `vitest run --reporter=dot` still tears
    down and still enforces the contract; the reporter is installed exactly once
    in a 15-project root run.
17. **The second execution fails loudly and reports no tests.** A rerun issued
    into a process that has already run raises before any module executes, the
    message names the retired mode, and no test result is reported.
18. **An empty run does not spend the lifecycle.** A filter matching no files,
    followed by a real run, succeeds.
19. **The retired machinery is gone.** No `--watch` remains in the tree, the
    debug recipe is `vitest run` and no longer inherits watch from a TTY, and
    `.vscode/settings.json` sets `vitest.watchOnStartup` explicitly false.
20. **The debug task is run mode.** `.zed/tasks.json`'s `vitest:debug` reaches a
    breakpoint with the CDP port attached, and saving the file while paused does
    **not** start a second execution.
21. **The carrier is present in a plugin-less project.**
    `vitest run --project=node/tproc` enforces the contract.
22. **The carrier is an instance, not a name.** A root run with `--reporter=dot`
    shows the enforcement reporter's hooks firing, not merely its presence in
    the list.
23. **`watchOnStartup` behaves as documented.** It is off — confirming nothing
    in the repository has set it — and enabling it produces the loud failure
    rather than a hang or a silent pass.
24. **The generation worker's port is released**, evidenced by the absence of
    `close timed out` under the real plugin in the root run.
25. **`cdp()` still works.** drag2's input-policy suite passes, which is the
    check that `browser.api.allowExec` was not turned off (TE-F28).

## Evidence limits

- **The whole-repository arm is a single run**, with the teardown reporter and
  `groupOrder`/`maxWorkers` assignment applied by a probe configuration
  wrapping the real root config, and the per-generation evaluator applied as a
  reverted patch to the untracked built plugin artefact. The mechanisms measured
  are the ones specified; their code will live elsewhere.
- **Baselines differ between passes.** This pass ran at a 2015 MiB baseline
  against revision 3's 4.0–4.6 GiB. Peaks are not comparable across passes; run
  deltas are, and the delta improved.
- **No control arm was re-run in this pass.** Revision 3's unbounded OOM figure
  and its intermediate arms are taken as reported.
- **The lifecycle probes use fixture suites** — three and four trivial modules —
  not the real browser suites. They establish the mechanism at the RPC boundary
  and at the group boundary, not timings for real suites.
- **The converted-plugin evidence covers the Vite `load` path only.** Six
  concurrent entries through the real plugin, and all 35 through the evaluation
  harness. Watch invalidation, `just build`, `just docs-build` and `just docs-dev`
  are not exercised; the demonstration list carries them.
- **`compileCSS` is downstream of every arm** — oxfmt, lightningcss and the
  sourcemap are unchanged and unmeasured, as in every previous pass.
- **Continuous-run mode was not measured**, in any pass.
- **The editor was read, not run**, and is not installed here. `.vscode-server`
  is absent entirely; the artefact read across this pass and its challenge is an
  unpacked copy of the marketplace build self-reporting
  `vitest.explorer@1.50.8`. **Every VS Code conclusion in this record is
  source-derived**, and none is editor-observed: this includes TE-F12, TE-F21,
  TE-F26, TE-F30 and TE-F31.
- **The shared-state result is a property of the current tree**, not a guarantee
  of the mechanism.
- **The one-shot contract was verified programmatically**, against a fixture
  with `watch: true`, and through a real `vitest run` for the carrier. That each
  editor gesture issues exactly one consuming execution is now established by
  call-site enumeration (TE-F30) rather than by sampling gestures, but it is
  still source-derived; the confirmation in a running editor is owed.
- **The port-handle result is a fixture**, not the converted plugin. It
  identifies the handle class; it does not prove the converted plugin holds no
  other handle.
- **The `--project` falsification uses a fixture**, two trivial browser modules
  and one typecheck module, not the real suites.

## The lifecycle policy, settled

Revision 4 recorded one owner choice — whether the VS Code extension's runs get
teardown. It is closed: **they do.** Nothing in this record now presents editor
teardown as open.

What the owner settled, and what follows from it:

- Root and per-package CLI runs are one-shot. Ordinary VS Code Vitest runs
  started from the UI are one-shot. Browser providers are released at the group
  boundaries TE-D12 establishes wherever a later group exists, and at process
  close for the project occupying the final group (TE-F29); in every case they
  are released before the process exits.
- Watch and continuous reruns inside one Vitest process are unsupported, by
  intent rather than by limitation.
- **Reuse after teardown** fails loudly before executing or reporting tests, and
  never succeeds silently with zero modules. The claim is scoped to reuse: a run
  whose filter matches nothing still reports a successful run of nothing, which
  is Vitest's own pre-existing behaviour under `watch: true` and is not created,
  closed or claimed by this design (TE-F27).

The reasoning revision 4 used to keep the question open no longer applies. It
turned on the absence of an in-process signal separating an ordinary editor run
from a continuous one (TE-F21), which made an opt-in the only way to declare a
one-shot lifecycle and left the owner carrying that declaration per run. With
the whole model declared one-shot, nothing needs detecting: the contract is
uniform, the carrier is uniform, and the case the missing signal endangered —
continuous run — is retired rather than protected.

**No owner choice remains open in this record.** Two questions belong to
implementation rather than to the owner: whether the debug task wants anything
back after `--watch` is removed, which the demonstration list settles by
exercising it; and whether any editor gesture issues more than one consuming
execution per process, which the same list settles by exercising each one.

## Implementation readiness

**The design is implementation-ready.** Every mechanism it selects has survived a
focused challenge without contradictory evidence: the one-shot enforcement, the
carrier that installs it, group-boundary provider teardown, the disposable
per-generation CSS isolate, and the retirement of test watch. The seven
corrections the challenge required are applied above, at the statements that own
them. One of them — the `allowExec` disposition — is resolved against the
challenge's own recommendation, on evidence it did not have, and TE-D16 carries
the reasoning.

Nothing further is owed to design. What remains is verification during
implementation, and it divides into three kinds.

**Confirmations of mechanisms already measured** — these have been demonstrated
on probes, fixtures or a patched artefact, and must be re-demonstrated on the
shipped code: demonstrations 1–7, 16 and 17. The root-run resource result is the
weightiest: it must be reproduced with the real evaluator and the real teardown
integration rather than inherited.

**Paths never exercised in any pass** — these are new work, not repetition:
demonstrations 8–12 (the `@ydinjs/tproc` rebuild under `just docs-dev`,
dev-watch invalidation against the discovered set, `just build`,
`just docs-build`, `just docs-dev`, and per-package invocation after the
change), 18 (an empty run not spending the lifecycle), and 19–25 (the retired
machinery, the debug task in run mode, the carrier in a plugin-less project,
`watchOnStartup`, the generation worker's port, and drag2's `cdp()` suite).

**The editor, which no pass has run** — demonstrations 13–15. TE-F30 has
converted this from an open question about the code into a confirmation:
enumeration of the extension bundle shows no gesture can issue two consuming
executions against one process. The confirmation is still owed, and it is the
one obligation whose failure would be a design defect rather than an
implementation defect, because the contract would then turn a working gesture
into a loud failure.

## Grounds a focused challenge should attack

- **The whole-repository figure is one run.** Δ 5554 MiB, 63.6 s and 32 Chrome
  processes are a single sample at an unusually low baseline.
- **Process-wide generation sharing is asserted from the shape of the code**,
  not from a case where two consumers disagree. If any consumer's options could
  reach evaluation rather than `compileCSS`, one generation is wrong.
- **Reference counting across three plugin instances is unimplemented.** The
  measured arm never released the generation at all — which is exactly what
  TE-F22 caught.
- ~~The 10 s close timeout was diagnosed by elimination~~ — **settled**: the
  handle is the parent-side `MessagePort` with a live listener (TE-F32).
- **`--sequence.*` is not the only override that could erase configured
  structure.** The allow-list has 20 names and the merge is wholesale; only
  `sequence` was traced.
- **TE-F19's consequence is stated but not demonstrated end to end.** No arm
  edited a shared token file and observed all dependent entries re-evaluate
  through the real watcher.
- **The editor is still the weakest evidence in the design**, three revisions
  in, and it is the workflow the owner named as non-negotiable. TE-D15 now rests
  on it in a new way: if any editor gesture issues two consuming executions in
  one process, the contract turns a working gesture into a loud failure.
- **The one-shot counter's exemption for empty runs is a hole by construction.**
  A run that matches nothing does not consume the lifecycle, so a mistaken
  filter followed by a real run is allowed — correct, but it means the invariant
  is "at most one execution that executed", not "at most one call".
- **The carrier depends on `configureVitest` and on `vitest.config` being the
  object `createReporters` reads.** Both are internal arrangements verified at
  one version. `Vitest._createRootProject` assigns `this._config = resolved`
  (`cli-api.BK8pd4xc.js:13097`), so the identity is by construction rather than
  by coincidence; that the pair fails loudly rather than silently if either
  changes is still reasoned, not measured.
- **TE-F30 is an enumeration of one bundle at one version.** It is exhaustive
  over that bundle, not over extension versions, and no editor has run it.
- **Keeping `allowExec: true` leaves the API server's rerun RPCs reachable.**
  They are made loud by TE-D15 rather than absent, and the server binds
  `0.0.0.0` as it already did. That is a deliberate trade of a silent gate for a
  loud guard, and it is the place to attack if the trade is wrong.
