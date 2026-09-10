# Test execution model — revision 3, from the owner's execution model

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `dfa7e1d05`.**
Develops the design from settled owner direction rather than from the previous
scheduling arrangement. It supersedes decisions in
[`architect-test-execution-model-reconciled.md`](architect-test-execution-model-reconciled.md)
(revision 2) where marked, and keeps revision 2's evidence where it stands.

**Nothing here claims an identifier.** No heading opens with one, at any depth.
The local register continues revision 2's `TE-` series under the sanctioned
`consolidator.md` route — local ids, canonical mapping filled in when the
entries are written into a register. No repository register is opened and no
repository rule is placed in `@ydinjs/drag2`'s lifecycle family.

**No later challenge exists.** The brief refers to "subsequent challenge
findings"; the tree at `dfa7e1d05` carries only the revision-1 challenge, which
revision 2 already reconciled. Nothing has been read into this pass beyond it.

## The owner's direction, and what it costs

Four requirements, and each one moved something that revision 2 had settled.

| Requirement                                                                                   | Effect on revision 2                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Remove Nx from test orchestration; one root Vitest invocation, no process-per-package fan-out | **Overturns** the package-sequence design (TE-D4, TE-D5)     |
| Preserve VS Code extension discovery and execution                                            | Kept; revision 2's root-config finding is what makes it work |
| Reconsider why CSS workers exist                                                              | **Overturns** the semaphore (TE-D2)                          |
| Release browser machinery before the next run                                                 | **Rehabilitates** `sequence.groupOrder`, twice rejected      |

The last is the interesting one. Revision 1 and revision 2 both rejected
`groupOrder` because, under retention, serialization bounds concurrency without
bounding the peak. That reasoning was correct and is now obsolete: it assumed
nothing could be released. Once a project's browser can be torn down,
serialization is what makes the release _arrive in time_, and the two together
turn the peak from a sum into a maximum.

**The headline: the whole repository now runs in one Vitest process at 10 384 MiB
peak, inside the budget, where it was OOM-killed before.**

## The local register

Continuing revision 2's series. `TE-D1`…`TE-D7`, `TE-I1`, `TE-F1`…`TE-F10` are
defined there.

| Local  | Canonical  | Subject                                                                                             | Status                                             |
| ------ | ---------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TE-D8  | unassigned | Nx removed from test orchestration; one root Vitest invocation                                      | New — supersedes TE-D5                             |
| TE-D9  | unassigned | Browser projects serialized and torn down at completion, run mode only                              | New — supersedes TE-D4, rehabilitates `groupOrder` |
| TE-D10 | unassigned | CSS evaluation by persistent Vite environment with selective invalidation                           | New — supersedes TE-D2                             |
| TE-D11 | unassigned | How the requested worker limit is resolved                                                          | New — refines TE-D3                                |
| TE-F11 | unassigned | `provider.close()` is one-way, and the next run is a **silent no-op**                               | New                                                |
| TE-F12 | unassigned | The extension spawns a fresh process per ordinary run                                               | New — refines TE-F4                                |
| TE-F13 | unassigned | `.styles.css` collides with `vite:css-post` unless the id stops ending in `.css`                    | New                                                |
| TE-F14 | unassigned | `vitest.cliArguments` never reach `process.argv`                                                    | New                                                |
| TE-F15 | unassigned | A Vite environment reproduces worker output exactly, 8.4× faster, and works inside a rolldown build | New                                                |

Superseded by this pass: **TE-D2** (semaphore → environment), **TE-D4** (package
process boundary → one process plus teardown), **TE-D5** (`nx --parallel=1` → Nx
removed). **TE-D1**, **TE-D3**, **TE-D6**, **TE-D7**, **TE-I1** stand.

## The whole-repository run, measured

One Vitest process, all 15 projects, this container, background 4.0–4.6 GiB.
"Run Δ" is peak above that run's own baseline.

| Arrangement                                               | Result         | Peak       | Run Δ     | Chrome  | Duration |
| --------------------------------------------------------- | -------------- | ---------- | --------- | ------- | -------- |
| today, unbounded (revision 2's figure)                    | **OOM-killed** | 16 383     | 12 049    | 162     | 42 s     |
| serialized + `maxWorkers: 2` + CSS cap 4, **no teardown** | passed¹        | 14 978     | 10 971    | 104     | 95 s     |
| **teardown, not serialized**                              | passed¹        | 11 770     | 7 507     | **109** | 71 s     |
| serialized + teardown + CSS cap 4                         | passed¹        | 10 771     | 6 503     | 26      | 93 s     |
| **serialized + teardown + CSS cap 1**                     | **passed¹**    | **10 384** | **6 181** | **26**  | **96 s** |

¹ One pre-existing failure in every arm including the controls —
`node/tproc TokenPackageProcessor`, excluded by instruction. One arm also caught
the intermittent `radio` pixel mismatch (TE-F7). **No arm produced a
teardown-induced failure**, and the string `provider was closed` appears in no
log.

Two readings decide the design.

- **Teardown alone is not enough.** Row 3 tears down but does not serialize:
  Chrome stays at 109 and only **4 of 7** providers close before the run ends,
  because every browser project has already launched by the time the first one
  finishes. Peak falls only to 11 770.
- **Serialization alone is not enough** — row 2, and it is why revision 1 and 2
  rejected it.

Together they take Chrome from 104–162 processes to **26** and the peak from
fatal to 10 384 MiB, against the 13 107 MiB budget ceiling.

## Decisions

### Nx is removed from test orchestration (TE-D8)

The root `Justfile`'s `test` recipe stops calling
`nx run-many -t test --projects=… --skipNxCache` and becomes a single
`vitest run` against the root configuration, which already declares every
package's projects. Per-package invocation is unchanged and stays available:
`cd packages/<pkg> && just test` runs that package's own configuration.
`npm test` resolves to the same root run rather than to bare `vitest`, which is
watch mode.

This is a **test-orchestration** change only. `nx.json`'s `targetDefaults` for
`build`, `typecheck` and the docs targets are untouched, and `just build`
continues to run through Nx.

Revision 2 reached the opposite arrangement — a sequence of package processes at
`--parallel=1` — because one process could not hold seven browser projects. TE-D9
removes that constraint, and the root run measured here is **faster** than the
package sequence it replaces as well as lighter: one Vite server per project
started once, rather than seven Vitest processes each paying its own startup.

One consequence to carry: with Nx out of the test path there is no
`dependsOn: ["^build"]` ordering for tests. Nothing in the test path depended on
it — the suites that need built artefacts build them in `beforeAll` — but that
is now an unstated assumption rather than an enforced one, and the demonstration
list checks it.

### Browser projects are serialized and released as they finish (TE-D9)

Each browser project gets its own contiguous `sequence.groupOrder`, so the
groups run one at a time; when a project's last test module completes, its
browser provider is closed and its Chromium exits. Non-browser projects share
the final group.

**Both halves are required**, on the evidence above: serialization without
teardown peaks at 14 978 MiB, teardown without serialization at 11 770 MiB with
109 Chrome processes, and the pair at 10 384 MiB with 26.

**Run mode only.** TE-F11 is the constraint: `provider.close()` cannot be
undone, and a project that runs again in the same instance afterwards produces
**zero test modules without erroring**. Teardown is therefore gated on
`config.watch === false`. Watch and the editor keep today's retaining behaviour,
which TE-F12 shows is already bounded there.

**Required properties**, rather than a prescribed implementation:

- No project is torn down before its last test module has completed.
- Teardown never runs when the instance may run that project again — the gate is
  a positive check on run mode, not an assumption about the caller.
- A teardown failure is reported, never swallowed: the failure mode this
  mechanism risks is silence, so it must be the one thing that cannot happen
  quietly.
- Group order is contiguous from zero, because groups are keyed into a sparse
  array by that number.

### CSS evaluation moves to a persistent Vite environment (TE-D10)

**What the workers actually provide is one guarantee: a cold ESM registry per
evaluation**, so a `.css.ts` graph is evaluated against current file contents
with no native `import()` cache in the way. Isolation is incidental — the worker
is awaited one at a time inside `load`, and its whole observable contract is a
single string, the module's `default` export.

The cost of buying that guarantee with a fresh isolate is that the _stable_ part
of the graph is re-imported every time. Of the modules a `.css.ts` reaches, the
volatile in-repo files are a handful; the expensive part is the `@ydinjs/tproc`
chain, whose `DB/index.ts` does a module-scope `await DB.load()` over 147 MB of
token JSON — ~256 MiB and ~430 ms, paid 35 times.

**A Vite environment provides the same guarantee and a stronger one.** Verified
in this session against the installed `vite@8.1.4`:

| Claim                         | Evidence                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same output                   | **35 of 35 `.css.ts` modules byte-identical** between the worker path and `runnerImport`                                                                                   |
| Faster                        | worker path **15 575 ms**, environment path **1 863 ms** for the same 35                                                                                                   |
| Works without a dev server    | `runnerImport` stands up a `RunnableDevEnvironment` with no HTTP server                                                                                                    |
| Works in the no-Vite consumer | called from a plugin `load` hook **inside a real tsdown/rolldown build**: 557 ms, correct CSS, build completed                                                             |
| Freshness is selective        | edit a `.styles.css`, re-import → **stale** (4747 B); `environment.moduleGraph.invalidateModule(node)` → **fresh** (4782 B), with **6 of 6 modules retained** in the graph |
| Dependencies come back        | `runnerImport` returns exactly the volatile in-repo set plus the styles file                                                                                               |

The invalidation row is the important one. The worker guarantee is "everything
cold"; this is "everything that changed, cold — and nothing else". `@ydinjs/tproc`
is externalized as a built artefact and stays warm across rebuilds, which is why
the rebuild is faster rather than merely equal.

**Required properties:**

- Every `.css.ts` is evaluated against current file contents on each build, and
  after each edit during development. Serving pre-edit content is the one
  failure this mechanism must not have.
- Invalidation is driven from the environment's own module graph, not from a
  separately maintained dependency set. The existing `deps-tracker` set is
  **lossy** — it filters to relative specifiers and drops `node_modules`, so it
  never recorded bare or dynamic imports — and a graph that misses an edge now
  serves stale CSS instead of merely under-watching.
- The environment is created once per plugin instance and reused; creating one
  per `load` call reproduces the cost the change exists to remove.
- `addWatchFile` receives real file paths: the styles module is registered under
  a virtual id (TE-F13) and must be mapped back.
- Both consumer classes are covered — the Vite consumers and the tsdown build.

**`.styles.css` needs an id that does not end in `.css`** (TE-F13). Verified
twice: with the id left as `…/main.styles.css`, `vite:css-post` throws
`Cannot read properties of undefined (reading 'get')`; prefixing a virtual
marker is **not** enough, because the suffix is what Vite matches on. With the
virtual id also carrying a non-`.css` suffix, all 35 modules resolve and the
output is identical.

**The fallback, if TE-D10 proves too large.** One fresh worker per _build
generation_ — evaluating every `.css.ts` in one isolate, discarded whenever any
tracked file changes — preserves the freshness guarantee exactly and cuts the
cost from 35 token-DB imports to one. It keeps both `registerHooks` preloads and
needs no Vite in the tsdown path. It is strictly worse than TE-D10 on rebuild
latency, because an edit forces the whole set to re-evaluate including the
~430 ms DB load, and it has no invalidation primitive at all. It is named here
so the choice is visible, not recommended.

### The requested worker limit is resolved by precedence (TE-D11)

Three mechanisms exist and they are not interchangeable. Measured on
material-x's `browser` project, all reaching the browser pool correctly:

| Mechanism                                        | Run Δ      | Chrome | Reaches the extension?        |
| ------------------------------------------------ | ---------- | ------ | ----------------------------- |
| default (CPU-derived)                            | 11 234 MiB | 40     | —                             |
| `VITEST_MAX_WORKERS=2`                           | 6369 MiB   | 26     | **yes**, via `vitest.nodeEnv` |
| `parseArgs(process.argv)` → project `maxWorkers` | 6527 MiB   | 26     | **no** (TE-F14)               |
| CLI `--maxWorkers=2` unaided                     | no effect  | —      | — (TE-F1)                     |

**The owner's `parseArgs` proposal works** — it read `--maxWorkers=2` from argv,
applied it per project, and produced the same figures as the other working
routes. It is adopted, with its limit stated rather than discovered later.

Precedence, highest first:

1. **`VITEST_MAX_WORKERS`** — Vitest's own override, applied inside
   `resolveConfig` for every project including browser ones, so it needs no code
   from us and wins automatically over whatever the config sets. It is the only
   route that also works under the extension, through
   `vitest.nodeEnv: {"VITEST_MAX_WORKERS": "…"}`.
2. **`parseArgs(process.argv)`** in the shared factory, applied as each
   project's `maxWorkers`. This is what makes `vitest run --maxWorkers=N` behave
   as a reader expects, bypassing TE-F1.
3. **The factory default**, TE-D3's explicit value.

**Compatibility concerns, raised as asked.** `parseArgs` must run with
`strict: false` — Vitest passes many flags it does not declare, and a strict
parse throws. It must also handle the percentage form (`--maxWorkers=50%`) that
Vitest itself supports, which means reimplementing a small piece of Vitest's
resolution; that duplication is the price of the route and is a reason to prefer
the env variable where one knob suffices. And under the extension it silently
does nothing (TE-F14) — which is acceptable only because the factory default,
not the flag, is what bounds the editor.

## Findings

### `provider.close()` is one-way, and the next run is a silent no-op (TE-F11)

`PlaywrightBrowserProvider.close()` sets `this.closing = true`, and nothing ever
resets it; `_throwIfClosing` then rejects any later `openPage`. Re-initialisation
does not help: `_initBrowserProvider` returns early while `this.browser.provider`
is assigned, and `_initParentBrowser` while `this._parentBrowser` is.
`TestProject.close()` says so in its own doc comment — _"This can only be called
once… If the resources are needed again, create a new project."_

Measured, one instance, `watch: true`, the same eight specs twice:

| Recovery attempt                                        | Run 2 result                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| none                                                    | **0 test modules, no error**                                                                   |
| clear `project.browser`, `.provider`, `._parentBrowser` | **0 test modules**, plus `Error: Orchestrator not found for session … This is a bug in Vitest` |

The failure mode is the dangerous one: a run that executes nothing and reports
success. That is why TE-D9 gates teardown on run mode with a positive check, and
why no opt-in is offered to enable it in watch mode.

### The extension spawns a fresh process per ordinary run (TE-F12)

Revision 2 measured a long-lived instance and found retention plateauing per
project. That models continuous-run mode. For an **ordinary** run the extension
builds a fresh per-config API object and always spawns, disposing in `finally` —
the reuse branch is unreachable because the object is new.

So accumulation across editor runs does not occur for ordinary runs at all, and
is confined to continuous run ("eye" icon). That is what makes TE-D9's run-mode
gate acceptable rather than a gap: the editor's common path never accumulates,
and its uncommon path is bounded by the number of distinct browser projects
touched.

### Evidence limits

Stated rather than assumed.

- **The whole-repository figures come from a probe harness**, not from the
  shipped configuration: a probe root config assigning `groupOrder` and
  `maxWorkers`, and a probe reporter closing providers on
  `onTestModuleEnd`. The mechanism is what was measured; the implementation will
  differ in where the code lives.
- **The CSS figures are the plugin's evaluation step in isolation.** The
  worker-vs-environment comparison drove `css-worker.js` with its real preloads
  against `runnerImport`, outside the plugin. `compileCSS` — oxfmt, lightningcss,
  the sourcemap — is downstream of both and unchanged, and was not re-measured.
- **TE-D10 was not implemented end to end.** No arm ran the real suite with the
  plugin converted; the CSS cap used in the whole-repo arms is the revision-2
  semaphore standing in for the memory profile. The environment's _measured_
  advantage is on evaluation cost and correctness, not on a converted suite.
- **Invalidation was verified on one edit to one leaf** of one entry's graph,
  with `hot: false`. Watch-mode wiring — which file event drives which
  invalidation — was not exercised.
- **The tsdown result is one plugin hook in a minimal build**, not the real
  material-x build with the plugin converted.
- **The dependency-graph census** (module and edge counts, the volatile/stable
  split) is delegated work I did not re-derive. The lossiness of the current
  tracker I did confirm from its source; the counts I did not.
- **Continuous-run mode was not measured**, in either the retention or the
  teardown design.
- **No arm ran on a clean container.** Background sat at 4.0–4.6 GiB throughout.

## What this does not resolve

**The budget still assumes background stays low.** The root run's own footprint
is 6181 MiB, so it fits 13 107 MiB with 6 GiB of background — but only just, and
revision 2's stale-MCP finding (TE-F6) remains the cheapest headroom available.
This is an improvement on revision 2's position, not an escape from it.

**Editor "Run All Tests" does not benefit from TE-D9.** The extension forces
`watch: true`, so the teardown gate keeps it off there, and that operation stays
where revision 2 left it — completing at ~14.2 GiB, outside the budget. TE-D9
would help it, and cannot be used, because the two cases are indistinguishable
from inside Vitest and the failure mode is silent. If the owner does not use
continuous run, an explicit opt-in would recover it; I decline to recommend one
because a wrong setting produces a green run that tested nothing.

**Both new mechanisms lean on internals.** `provider.close()` driven from a
reporter is not a consumer-facing API, and `runnerImport` /
`createServerModuleRunner` are marked experimental in Vite's own types. Neither
is load-bearing for correctness of the tests themselves — a teardown fault is
loud if TE-D9's third property is honoured, and a CSS fault is caught by the
visual and spec layers — but both are version-fragile, and TE-I1's measured-peak
obligation is what would catch a regression.

## Grounds a focused challenge should attack

- **TE-D10 is the largest change and the least implemented.** Evaluation
  equivalence is established for 35 modules; the plugin conversion, watch
  wiring, and the real tsdown build are not. If the conversion cannot keep
  `addWatchFile` correct through the virtual id, the fallback in TE-D10 is where
  this lands.
- **TE-D9's teardown trigger is `onTestModuleEnd` counting.** If a project can
  report its last module before the pool is finished with it, teardown races the
  run. No arm exhibited it; no arm was built to provoke it either.
- **The run-mode gate may be the wrong shape.** It protects watch by disabling
  the mechanism entirely, which costs the editor's heaviest operation. A
  sharper signal — if one exists — would be worth more than the gate.
- **Removing Nx removes an ordering constraint** nothing else asserts.
- **The CSS comparison used `runnerImport`, which creates an environment per
  call.** The design requires one reused environment; that is
  `createRunnableDevEnvironment`, which is what the invalidation probe used, but
  the 35-module timing came from the per-call form and so _understates_ the
  reused design rather than overstating it — worth confirming in the direction
  it matters.
- **`maxWorkers: 2` is inherited from revision 2** and was not re-derived against
  the teardown design, where Chromium is no longer the accumulating term.
