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

**Instruction boundaries.** The pre-existing `node/tproc TokenPackageProcessor`
failure and F-412 stay outside this work. Nothing is implemented. Every probe
below is a scratchpad fixture or a reverted patch to an untracked build
artefact; the working tree was clean before this document and is clean after it.

## What changed, and why

The challenge was right on both mechanisms, and the owner's freshness boundary
settles the one question the challenge left as a fork. Revision 3's two central
mechanisms are replaced; its two other decisions survive with corrections.

| Ground                             | Revision 3                                      | Revision 4                                                                                       |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Nx out of test orchestration       | Adopted, with a claimed loss of build ordering  | **Adopted; the claimed loss is deleted** — Nx never supplied it                                  |
| Browser serialization              | `sequence.groupOrder`, contiguous **from zero** | **Kept, assigned from 1** — zero is a sentinel that destroys the ordering it was meant to create |
| Browser teardown trigger           | Last `onTestModuleEnd` of a project             | **Replaced by the group boundary** — the last-module trigger fails deterministically             |
| Teardown safety                    | Gated on `config.watch === false`               | **Marked project plus a pre-execution guard**, contributed by a one-shot entry point             |
| CSS evaluation                     | Persistent Vite environment with invalidation   | **One fresh isolate per build generation**, discarded on any tracked change                      |
| Worker limit                       | `VITEST_MAX_WORKERS` > `parseArgs` > default    | **Kept, with three interactions the order did not account for**                                  |
| Whole-repository resource evidence | 10 384 MiB, semaphore standing in for CSS       | **Re-measured with the real mechanisms** — see below                                             |

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
released, **including the last** — because the non-browser projects occupy the
highest group, group 7's provider is closed when group 8's first module starts.
And `errors=0` is now a meaningful acceptance signal, which it was not in
revision 3.

## The local register

Continuing the series. `TE-D1`…`TE-D11`, `TE-I1`, `TE-F1`…`TE-F15` are defined
in revisions 2 and 3.

| Local  | Canonical  | Subject                                                                                | Status                                      |
| ------ | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| TE-D12 | unassigned | Browser projects serialized from group 1 and released at group boundaries              | New — supersedes TE-D9                      |
| TE-D13 | unassigned | CSS evaluated by one fresh isolate per build generation                                | New — supersedes TE-D10                     |
| TE-D14 | unassigned | The requested worker limit, and the three interactions that constrain it               | New — supersedes TE-D11                     |
| TE-F16 | unassigned | The last-module teardown trigger fails deterministically at the RPC boundary           | New — refutes part of TE-D9                 |
| TE-F17 | unassigned | `sequence.groupOrder: 0` is a sentinel that demotes or interleaves the project         | New                                         |
| TE-F18 | unassigned | Resolved-URL discovery sees the whole graph, `@ydinjs/tproc` and the token DB included | New — supersedes the tracker half of TE-D10 |
| TE-F19 | unassigned | Per-entry dependency attribution collapses inside a shared generation                  | New                                         |
| TE-F20 | unassigned | Node caches an evaluation failure permanently in the isolate that produced it          | New                                         |
| TE-F21 | unassigned | No in-process signal distinguishes an ordinary VS Code run from a continuous one       | New — refines TE-F12                        |
| TE-F22 | unassigned | A retained generation worker prevents the Vitest process from closing cleanly          | New                                         |
| TE-F23 | unassigned | The whole-repository run with both real mechanisms measures Δ 5554 MiB in 63.6 s       | New — supersedes the 10 384 MiB figure      |

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
- **Teardown is contributed by an entry point that owns a one-shot lifecycle**,
  never by the shared factory every consumer loads. `just test` adds the
  teardown reporter; the root `vitest.config.ts` that the VS Code extension
  loads does not carry it. This is the whole of the ownership claim — `watch`
  is not evidence of it (TE-F21), and is not used.
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
  the fan-out that was fatal.
- **A teardown failure is distinguishable**, not merely present. The failure
  this mechanism produces when mistriggered is `Failed to run the test …`, which
  is indistinguishable from a genuine test failure; an acceptance check that
  greps for `provider was closed` reads clean while the mechanism is failing.
- **The generation worker and the browser providers are both released before
  the process closes** (TE-F22).

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

The only continuous-only marker is the `watchTests` RPC, which occurs exactly
twice in `extension.js` and only inside `syncWatcher` on the continuous runner
subclass. It travels between the extension and its own worker and is invisible
to a Vitest reporter or plugin, so it cannot gate anything in this design.

**Consequence.** `watch === false` is not merely a weak proxy — it is the wrong
question, because the one editor path whose lifecycle is provably one-shot is
marked `watch: true`. Ownership of a one-shot lifecycle can only be **declared
by the entry point**, which is what TE-D12 requires.

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
10. **Watch invalidation is wired to the discovered set.** Editing a shared
    token file re-evaluates every entry that reaches it, not only the entry that
    happened to be evaluated first.
11. **Both consumer classes pass**: the root test run, `just build`,
    `just docs-build` and `just docs-dev`. Revision 3's tsdown evidence was one
    hook in a minimal build and does not carry.
12. **Per-package invocation is unchanged**: `cd packages/<pkg> && just test`
    still runs that package's own configuration.
13. **The editor path still discovers and runs tests.** Discovery lists every
    project, a single test runs, and a project-scoped run runs, against the
    unchanged root `vitest.config.ts`.

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
- **The editor was read, not run**, and is not installed here.
- **The shared-state result is a property of the current tree**, not a guarantee
  of the mechanism.

## The owner choice

One, and it is real because TE-F21 closes the alternative.

**Whether the VS Code extension's runs get teardown.** As designed, they do not:
teardown is contributed by `just test`, and the editor loads a root
configuration that does not carry it. The editor therefore keeps serialization
and the worker bound but not release, and whole-repository runs from the editor
stay where revision 2 left them, above the working ceiling.

Turning it on there is possible — an environment key the owner sets in
`vitest.nodeEnv` would declare the lifecycle the extension itself does not — and
it is now _safe_ rather than merely tempting, because a torn-down project that
is reused fails loudly before reporting anything. But it is not free: an
ordinary editor run is a fresh one-shot process and would benefit, while a
**continuous run would fail on its second run**, loudly, saying so. The choice
is between the editor's heaviest operation fitting the budget and continuous run
remaining available, and it turns on whether the owner uses continuous run at
all.

The challenge held that this opt-in should not be offered, on the ground that
the loud-failure property removes the need for the setting. That reasoning does
not hold: the property makes the setting _safe_, but it does not make teardown
_reachable_ in the editor, because the extension declares nothing about its own
lifecycle. Something must declare it, and only the owner can.

A cheaper lever exists and is unmeasured: `VITEST_MAX_WORKERS=1` through
`vitest.nodeEnv` bounds pages per project without touching retention. Whether
that alone brings editor "Run All Tests" inside the ceiling is in the
demonstration list, not claimed here.

## Grounds a focused challenge should attack

- **The whole-repository figure is one run.** Δ 5554 MiB, 63.6 s and 32 Chrome
  processes are a single sample at an unusually low baseline.
- **Process-wide generation sharing is asserted from the shape of the code**,
  not from a case where two consumers disagree. If any consumer's options could
  reach evaluation rather than `compileCSS`, one generation is wrong.
- **Reference counting across three plugin instances is unimplemented.** The
  measured arm never released the generation at all — which is exactly what
  TE-F22 caught.
- **The 10 s close timeout was diagnosed by elimination**, pristine against
  converted, not by identifying the retained handle.
- **`--sequence.*` is not the only override that could erase configured
  structure.** The allow-list has 20 names and the merge is wholesale; only
  `sequence` was traced.
- **TE-F19's consequence is stated but not demonstrated end to end.** No arm
  edited a shared token file and observed all dependent entries re-evaluate
  through the real watcher.
- **The editor is still the weakest evidence in the design**, three revisions
  in, and it is the workflow the owner named as non-negotiable.
