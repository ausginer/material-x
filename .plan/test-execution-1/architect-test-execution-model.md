# Test execution model — investigation and design

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `2aeda69fd`.** The
question the pass was called to answer: why does the repository's test
configuration exhaust its own devcontainer, and what has to change for
package-level and repository-level runs to be reliable.

Every number below was produced in this session, in this container, by running
the suites under a cgroup and `/proc` sampler. Nothing is carried forward from
the report that opened the pass: where a reported observation reproduced it is
marked as reproduced, and where it did not it is corrected.

**The short answer.** Two independent defects compose. One is a genuine
unbounded resource in repository-owned code — the CSS token plugin spawns one
worker isolate per `.css.ts` file with no pool and no cap, and each isolate
loads its own private copy of the Material token DB (F-434). The other is that
nothing in Vitest bounds browser concurrency _across_ projects, and the flag
that looks like it should is inert in the installed version (F-432, F-436).
Neither is fixed by the other, and the reported symptom needs both.

> **Revision note, 2026-09-10.** This document claimed fourteen identifiers at
> `####` — register depth — from a document that owns no id family. Under the
> sanctioned route in `consolidator.md` those claims are withdrawn: the headings
> below now carry **local** ids in mention form, nothing is claimed, and the
> canonical mapping is filled in when the entries are written into a register.
> The local register and the amended design are in
> [`architect-test-execution-model-reconciled.md`](architect-test-execution-model-reconciled.md),
> which supersedes the decisions here. **The measurements below stand**, with two
> exceptions it records: the visual-failure diagnosis (TE-F7) is reversed, and
> the CLI allow-list is 20 names, not 21.

## Scope

In: the shared factory `.scripts/vitest-config.ts`, the package test
configurations it builds, the root workspace configuration `vitest.config.ts`,
the two repository-level runners, and the CSS token plugin the investigation
led to.

Out, by instruction: the unrelated `tproc` failures and F-412. Also out: the
`drag2` node-test failures visible in the root run's log
(`consumer.node.test.ts`, `size.node.test.ts`) — those are absent build
artefacts, not a scheduling effect.

## How the evidence was taken

Three classes of memory evidence exist in this container and they are not
interchangeable. Conflating them is what makes the reported observations hard to
read.

- **Run-specific.** `memory.current` sampled at 1 s through a run; `VmRSS`,
  `RssAnon` and `Threads` from `/proc/<pid>/status` for the Vitest main process,
  sampled at 100 ms where thread churn mattered; and the delta in the
  `memory.events` `oom_kill` counter taken across each individual run. This is
  the only class that says anything about a particular run.
- **Background.** `memory.current` at rest, with a `ps` census by process
  family. It is charged against the same 16 GiB cap as the run.
- **Cumulative.** `memory.peak`, and the `max` / `oom` / `oom_kill` totals in
  `memory.events`. These accumulate over the container's whole life — 2 d 16 h
  at the time of the pass — and attribute nothing to any run. `memory.peak`
  reads 16 GiB and `oom_kill` reads 27; neither is evidence about the test
  suite. Both were used only as a per-run delta.

One further trap, and it is the important one: **`free` inside this container
reports the host.** `free -m` shows 47 861 MiB total. The enforced cap is
`memory.max` = 17 179 869 184 B = 16 GiB.

## The environment, as the toolchain sees it

`.devcontainer/devcontainer.json` passes `--memory=16g --memory-swap=24g`, so
the cgroup enforces 16 GiB of RAM and 8 GiB of swap. The reported budget is
confirmed. What is not confirmed is that anything inside the container knows it:

| Quantity                | Enforced | What Node sees |
| ----------------------- | -------- | -------------- |
| Memory                  | 16 GiB   | 46.74 GiB      |
| CPU quota (`cpu.max`)   | none     | 12             |
| V8 default heap ceiling | —        | 4192 MiB       |

`os.totalmem()` returns 46.74 GiB, `os.availableParallelism()` returns 12, and
V8 sizes its default old-space ceiling to 4192 MiB from the host's figure. Every
self-sizing heuristic in the toolchain therefore sizes for a machine roughly
three times larger than the one it runs in.

**Background load is a third of the budget.** At rest, `memory.current` sat
between 4.1 and 5.4 GiB across the session. The census at 5.35 GiB: `claude`
processes 1741 MiB, other `node` 1714 MiB, **26 `chrome-devtools` MCP server
processes 1192 MiB**, other Chrome 788 MiB. The reported "several possibly
stale MCP servers" is reproduced and understated — there were 26, in a container
up for 2 d 16 h.

## The execution model as it actually is

Six levels of concurrency compose. The repository sets none of them.

| #   | Level                                           | Bounded by                     | Effective value here                               |
| --- | ----------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| L1  | Package processes (`just test` → `nx run-many`) | Nx `--parallel`                | Nx's default, greater than one; unset in `nx.json` |
| L2  | Browser projects within one Vitest process      | **nothing**                    | all of them, concurrently                          |
| L3  | Pages within one browser project                | `project.config.maxWorkers`    | 11 (`min(12, cpus-1)`)                             |
| L4  | Node-pool workers within a project              | `maxWorkers` (project or root) | 11 (`cpus-1`)                                      |
| L5  | A finished browser project's footprint          | process lifetime only          | never released (F-435)                             |
| L6  | Worker isolates inside the main process         | **nothing**                    | one per `.css.ts`, ~31 concurrent (F-434)          |

L2 and L6 are the two that matter, and neither has a setting.

Verified in the installed `vitest@4.1.10` bundle
(`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js`):

- Specs are grouped by `sequence.groupOrder` (`groupSpecs`, :3782–3851) and the
  groups are awaited one at a time (:3695–3712), so **groups are sequential**.
- But browser specs are lifted out of the group entirely (:3640–3644) and handed
  to the browser pool as a sibling promise, so they are **not bounded by the
  group's `maxWorkers`**.
- Inside the browser pool, every project whose provider supports parallelism is
  started together — `await Promise.all(parallelPools.map(...))` (:2467–2477).
  Playwright declares `supportsParallelism = true`.
- Each browser project gets **its own Vite dev server and its own Chromium**.
  Nothing is shared between projects.

So the concurrent page count is the **sum over browser projects**, and no single
setting expresses it. The root workspace configuration declares 15 projects of
which **seven are browser projects** (material-x `browser`, `spec`, `visual`;
`core`; `box-quad`; `drag`; `drag2`) — up to 77 concurrent Chromium pages.

## Findings

### CLI `--maxWorkers` cannot reach a browser project in `vitest@4.1.10` (TE-F1)

Upstream #11051 is **confirmed**, at source and by measurement, in the installed
version. The mechanism is two-layered.

`resolveProjects` injects a fixed allow-list of CLI options into each child
project (:11082–11106). It holds 21 names. `fileParallelism` is one of them;
**`maxWorkers` is not**, and a child project inherits nothing else from the root
`test` config. So after startup `project.config.maxWorkers` is `undefined` for
every project while `vitest.config.maxWorkers` holds the CLI value.

Node pools recover it through a root fallback — `resolveMaxWorkers` (:3765–3771)
reads `project.vitest.config.maxWorkers` at :3767. **That line is the only
occurrence of `vitest.config.maxWorkers` in the entire bundle.** The browser
bound has no equivalent:

```js
function getThreadsCount(project) {
  const config = project.config.browser;
  if (
    !config.headless ||
    !config.fileParallelism ||
    !project.browser.provider.supportsParallelism
  )
    return 1;
  if (project.config.maxWorkers) return project.config.maxWorkers;
  return threadsCount; // min(12, cpus - 1) = 11 here
}
```

Measured on material-x's `browser` project, 8 files, same container, same hour:

| Arm                               | Peak `memory.current` | Δ over baseline | Chrome procs |
| --------------------------------- | --------------------- | --------------- | ------------ |
| default                           | 15 316 MiB            | 10 154 MiB      | 38           |
| **CLI `--maxWorkers=2`**          | 15 492 MiB            | 11 123 MiB      | 43           |
| **project-level `maxWorkers: 2`** | 11 390 MiB            | 7 040 MiB       | 26           |

The CLI arm is indistinguishable from the default; the project-level arm cuts
both figures. **This is why the reported `--maxWorkers=4` did not prevent the
kill** — the flag was inert for exactly the three projects that were the
problem, and it failed silently.

`VITEST_MAX_WORKERS` does reach browser projects (it is applied per project in
`resolveConfig`), but it is an environment variable rather than a repository
rule, and it is not the chosen control.

### the container misreports its budget to every process in it (TE-F2)

`--memory=16g` constrains the cgroup and nothing else. `/proc/meminfo`, and so
`os.totalmem()`, still report the host's 46.74 GiB; `cpu.max` carries no quota,
so `os.availableParallelism()` returns the host's 12. V8 sizes its default heap
ceiling to 4192 MiB and Vitest sizes its browser page count to
`min(12, cpus - 1)` — both from figures unrelated to the 16 GiB actually
available. No self-sizing default in this toolchain can be trusted here.

### `constructCSSTokens` spawns one unbounded worker isolate per `.css.ts`, each loading its own token DB (TE-F3)

This is the proximate cause of "material-x alone is killed", and it is a real
unbounded resource in repository-owned code rather than a scheduling artefact.

`packages/vite-custom-element-assets/src/index.ts`, the `load` handler of
`constructCSSTokens`, does `new Worker(new URL('./css/css-worker.js', …))` for
**every** module matching `/\.css\.ts/`. There is no pool, no concurrency cap,
and no `terminate()`; the worker is awaited and left to exit on its own. Vite
loads modules in parallel, so they are all alive at once.

`packages/material-x/src` holds **35 `.css.ts` files**. The worker's whole body
is `await import(id)` (`src/css/css-worker.ts`), and that import reaches
`@ydinjs/tproc` through the module's sibling `tokens.ts` — verified: 34 of the
35 `.css.ts` files import a `tokens.ts`, and 34 files under `src` import
`@ydinjs/tproc`. A worker is a full V8 isolate, so **each one loads its own
private copy of the Material token DB**, measured directly at 242 MiB RSS /
137 MiB heap per load.

Direct evidence, `VmRSS` and `Threads` from `/proc/<pid>/status` at 100 ms on an
otherwise unmodified run:

```
t=3.8s   RSS=683 MiB    Threads=54
t=4.4s   RSS=2896 MiB   Threads=84     <- +30 threads
t=5.8s   RSS=6395 MiB   (peak)
t=6.9s   RSS=4438 MiB   Threads=67     <- workers exiting, RSS follows them down
```

RSS rises from 683 MiB to 2.9 GiB in the six-tenths of a second the thread count
steps by thirty, peaks at 6.4 GiB, and falls back as the isolates exit.

**Confirmed by dose–response.** Capping the handler's concurrency with a
semaphore — the plugin otherwise untouched and fully functional — gives a clean
monotone curve at roughly 290 MiB per concurrent worker. Peak `VmRSS` of the
Vitest main process, `browser` project, 8 files, 141 tests passing in every arm:

| Concurrent `.css.ts` workers | Peak main-process RSS | Duration    |
| ---------------------------- | --------------------- | ----------- |
| unbounded (~31)              | 6461 / 6171 MiB       | 8 s / 12 s  |
| 8                            | 3794 MiB              | 11 s        |
| 4                            | 2067 MiB              | 9 s         |
| 1                            | 1056 / 1118 MiB       | 14 s / 19 s |

This also explains three earlier negative results, each of which had looked like
a refutation: `--max-old-space-size` bounds only the _main_ isolate and not the
thirty-one worker isolates, which is why capping it to 768 MiB left RSS at
7113 MiB; the memory is per-isolate V8 heap rather than allocator
fragmentation, which is why `MALLOC_ARENA_MAX=2` did nothing; and the cost is
constant in test-file count because the `.css.ts` set is fixed by the source
tree, not by which tests run (1 file 5935 MiB, 8 files 5034 MiB).

**It is specific to material-x only because material-x is the only package with
`.css.ts` files** — 35 of them, against none anywhere else. The plugin is
shared, so the defect travels to whichever package adopts the pattern next, and
its cost is linear in the number of `.css.ts` modules a package holds.

**And it is not confined to the test run.** `constructCSSTokens` is also on the
build path — `.scripts/tsdown-component.ts:15`, with `isProd: true` — where the
same `load` handler spawns the same unbounded workers. Measured on a clean
`just build-lib` for material-x, the single `tsdown` process reaches
**12 063 MiB `VmRSS` at 89 threads**, taking `memory.current` to 16 383 MiB —
the cap — with the same signature as the test run:

```
t=3s   RSS=1434 MiB    Threads=66
t=7s   RSS=10576 MiB   Threads=88
```

Rolldown flags it unprompted in the build output: _"Your build spent significant
time in plugin `vite-construct-css-tokens`"_. The build survives today because
it is short, not because it is within budget.

| Package              | Main process | Chromium total | Files |
| -------------------- | ------------ | -------------- | ----- |
| material-x `browser` | **6181 MiB** | 2264 MiB       | 8     |
| material-x `spec`    | **4264 MiB** | 2212 MiB       | 6     |
| material-x `visual`  | **6494 MiB** | 2231 MiB       | 4     |
| `core`               | 459 MiB      | 6111 MiB       | 25    |
| `box-quad`           | 393 MiB      | 3298 MiB       | 5     |
| `drag2`              | 622 MiB      | 6494 MiB       | 72    |

Every other package's main process is a normal few hundred megabytes and
Chromium dominates, as it should. material-x inverts that.

### a Vitest process does not release a finished browser project (TE-F4)

Serializing material-x's projects with distinct `sequence.groupOrder` bounds the
_concurrent_ page count but not the peak, because nothing is torn down when a
group finishes. Chrome process count across that run steps 12 → 26 → 39 → 52 and
never falls; the main process's RSS climbs monotonically to 9489 MiB. Providers
are closed only when the whole pool closes.

The consequence is structural: **within one Vitest process the peak is the sum
over browser projects, however they are scheduled.** Only a process boundary
returns the memory. Measured directly — with F-434 capped, the same four
projects cost 14 061 MiB in one process and 9908 MiB as separate processes.

### the root combined run is not merely killed, it is unusable for an hour first (TE-F5)

The root `vitest.config.ts` schedules all 15 projects, 7 of them browser
projects, concurrently. `npm test` is bare `vitest`, so it resolves this
configuration in **watch** mode, where the per-project page bound halves to 5 —
still 35 pages across seven projects.

Measured with `vitest run` against the same configuration: `memory.current`
reached the 16 GiB cap **56 seconds in** and stayed pinned there for the rest of
the run, with **202 Chromium processes**. The run was killed after roughly 104
minutes. While pinned, the container thrashed against swap and node tests that
normally take seconds reported durations of 383 s and 1456 s.

_Evidence caveat:_ a probe agent shared the container for part of this run, so
the tail of the series is contaminated. The decisive part is not — the cap was
reached at t = 56 s with 181 Chrome processes already present, before the probe
had started a browser.

### background load is part of the run's budget and is not reclaimed (TE-F6)

4.1–5.4 GiB resident before any test starts, of which 1192 MiB is **26**
`chrome-devtools` MCP server processes in a container up for 2 d 16 h. A run
designed against "16 GiB" is really offered 10–12 GiB, and the figure moves
between sessions. This is a constraint on the design, not a tidiness
observation.

### the visual matcher times out when the container is loaded (TE-F7)

The reported "intermittent visual failures" under reduced parallelism are
reproduced, and they are **not** pixel mismatches. The failure is
`Matcher did not succeed in time` from `toMatchScreenshot` on
`button.visual.browser.test.ts` — a stability timeout, not a changed baseline.

It appeared in the arm that serialized projects in one process at 14.5 GiB, and
did **not** appear in either separate-process arm once F-434 was capped, where
the visual project passed 4 files / 19 tests both times. So the trigger is
container load and per-assertion latency rather than reduced concurrency as
such, and relieving the memory pressure may well be the whole of the fix. It is
booked because a timing failure that disappears when the machine gets faster is
exactly the one that returns.

## The arrangements, measured

All eight arms are the full material-x package — 19 test files, 263 tests, four
projects — in this container, with background between 4.2 and 5.0 GiB. "Run Δ"
is the peak above that run's own baseline, so it is the figure that does not
move with background load.

| Arrangement                                            | Result                 | Peak      | Run Δ     | Chrome | Duration |
| ------------------------------------------------------ | ---------------------- | --------- | --------- | ------ | -------- |
| stock, one process                                     | **killed**, 1 OOM kill | 16 383    | 11 755    | 84     | 29 s     |
| one process, `groupOrder` + `maxWorkers: 2`            | 1 screenshot timeout   | 14 503    | 10 193    | 52     | 50 s     |
| one process, `groupOrder` + `maxWorkers: 4`            | passed                 | 16 277    | 11 311    | 65     | 53 s     |
| separate processes, `maxWorkers: 2`                    | passed                 | 12 135    | 7 384     | 26     | 53 s     |
| one process, worker cap 4                              | passed                 | 14 285    | 9 606     | 78     | 48 s     |
| one process, worker cap 4 + `maxWorkers: 4`            | passed                 | 14 061    | 9 842     | 66     | 41 s     |
| one process, worker cap 2 + `maxWorkers: 4`            | passed                 | 13 187    | 8 925     | 66     | 47 s     |
| **separate processes, worker cap 4 + `maxWorkers: 4`** | **passed**             | **9 908** | **5 697** | 30     | 58 s     |
| separate processes, worker cap 4, `maxWorkers` default | passed                 | 10 025    | 5 605     | 38     | 59 s     |

Three things fall out of the table and they drive every decision below.

1. **The worker cap is the single largest lever.** It takes the one-process run
   from killed to passing on its own.
2. **A process boundary is worth about 4 GiB** and the worker cap does not
   replace it: 14 061 MiB in one process against 9908 MiB in separate ones, at
   identical settings.
3. **`maxWorkers` buys nothing once the other two are in place** — 9908 against
   10 025 is inside the noise. Lowering it is a duration cost for no headroom.

## Decisions

### a test run's resource use is bounded by construction, and the budget is stated (TE-D1)

The repository does not rely on a self-sizing default anywhere in the test
toolchain. F-433 is the standing reason: the container's declared budget is
invisible to the runtime, so a default derived from `os.totalmem()` or
`availableParallelism()` is a number about the wrong machine.

**The stated budget.** The cap is 16 GiB. The design assumes background may
reach 6 GiB (measured 4.1–5.4, F-437) and therefore requires a run whose own
peak keeps the total below **80 % of the cap, ~13.1 GiB**. A run that only fits
an idle container is not reliable, because this container is never idle.

Against that budget the levels are settled as: L1 by D-203, L2 by D-202 and
D-203, L5 by D-202, L6 by D-200. L3 and L4 are left at their defaults by D-201,
on measurement.

### the CSS token plugin bounds its worker concurrency (TE-D2)

`constructCSSTokens` gains a bounded worker pool. This is the primary fix and
the smallest one: it is a defect in repository-owned code — an unbounded
`new Worker` per module — and it is corrected where it lives rather than
compensated for in test scheduling.

**Required properties**, rather than a prescribed implementation:

- The number of `.css.ts` worker isolates alive at once has a fixed upper bound
  that does not derive from the host's CPU count or memory.
- The bound holds for any number of `.css.ts` modules, so the plugin's cost is
  flat in the size of the source tree rather than linear in it.
- Plugin behaviour is otherwise unchanged: the same dependency tracking through
  the `MessageChannel`, the same `addWatchFile` calls, the same compiled output.

**A pool is preferred to a semaphore.** The measurement used a semaphore because
it is the minimal probe, but each isolate pays a full tproc DB import — 242 MiB
and ~390 ms — and a reused worker pays it once. A semaphore bounds the peak; a
pool bounds the peak _and_ removes most of the repeated import. The evidence for
preferring it is the 290 MiB-per-worker slope: that is import cost, not work.

**Bound of 4 is the value to implement**, from the dose–response: it holds the
main process near 2 GiB with no measurable duration cost, where a bound of 1
costs 5–10 s and buys 1 GiB that D-199's budget does not need.

**Fixing it in the plugin fixes the build as well as the tests.** That is an
independent reason the correction belongs here and not in test scheduling: the
build path reaches the cap on its own (F-434), and no amount of test-runner
configuration would have touched it.

### `maxWorkers` is not lowered repository-wide, and the CLI flag is never used (TE-D3)

No repository-wide reduction of the browser page bound is imposed. Measured, it
buys nothing once D-200 and D-202 are in place — 9908 MiB against 10 025 MiB —
and it would cost duration on every package on every run. A bound that does not
show up in the number it exists to control is machinery.

What **is** decided is the knowledge, because F-432's failure mode is silent:

- CLI `--maxWorkers` and a root-config `maxWorkers` **do not reach browser
  projects** in `vitest@4.1.10`. They must not be used, recommended, or
  documented as a memory control. Any existing instruction to pass the flag is
  wrong and is corrected.
- Where a browser project ever does need its page count bound, it is set at
  **project level**, in the shared factory, because that is the only level that
  reaches `getThreadsCount`.

If a future package needs the bound, it is set there and measured then. This
decision records that today's evidence does not call for it.

### a package run holds at most one browser project's footprint at a time (TE-D4)

Because a Vitest process never returns a finished browser project's memory
(F-435), the only bound on L5 is a process boundary. A package with more than
one browser project runs them as **separate, sequential Vitest processes**.

Today this binds `@ydinjs/material-x` alone — it is the only package with more
than one browser project. `core`, `box-quad`, `drag` and `drag2` have one each,
already satisfy this, and do not change.

The evidence is rows 5 and 7 of the arrangements table: with F-434 fixed, one
process peaks at 14 061 MiB (86 % of cap) and separate processes at 9908 MiB
(61 %), for 10 s of wall clock. D-199's budget admits the second and not the
first.

**Stated as a property, not a shape.** If a future Vitest releases a finished
browser project's resources, the property is satisfiable in one process and this
decision is met by the simpler arrangement. The property is the budget.

### the repository run is a sequence of package runs, and the root workspace config stops being an all-projects browser runner (TE-D5)

The root `vitest.config.ts` cannot complete in this container and takes an hour
to fail (F-436). A configuration known to be fatal is not left in place as a
trap for whoever types `npm test`.

- **L1**: Nx runs the `test` target at `--parallel=1`. Package processes never
  overlap, which is what makes L2 safe across packages.
- **L2 across packages** follows from L1; **within** a package it follows from
  D-202.
- `npm test` resolves to that same sequence rather than to a competing
  15-project Vitest instance.

The root workspace configuration is therefore removed, or reduced to the
projects that can safely share one process — the `node` and `declaration`
projects, which carry no browser. **Removal is the recommendation**: the reduced
form would remain a second, differently-scoped definition of what the
repository's tests are, and two such definitions drift. §Owner choices states
the cost, which is not this decision's to absorb.

### the visual matcher's settle budget is sized for a loaded container (TE-D6)

F-438 must be closed as part of this work rather than inherited as flake. The
settle budget for `toMatchScreenshot` is sized to hold on a container carrying
its normal background load, and the assertion itself — the comparison, its
tolerance, and the committed baseline — is unchanged. **No screenshot baseline
is re-recorded anywhere in this work**, and the timeout is not to be closed by
widening a tolerance.

If the failure proves unreproducible once D-200 and D-202 land, that is a
sufficient disposition provided it is demonstrated rather than assumed — see
§How implementation demonstrates the required behaviour, item 5.

### a change to test scheduling or runner configuration carries a measured peak (TE-I1)

Any change to `.scripts/vitest-config.ts`, to a package's test configuration, to
the Nx `test` target, to `constructCSSTokens`' worker bound, or to the
container's resource declaration is accompanied by the run's measured peak
`memory.current` and the `oom_kill` delta across it, taken in the devcontainer.
The reported figure is the baseline a later change is read against.

The instrument is cheap — sample `/sys/fs/cgroup/memory.current` at 1 s and
delta `memory.events` — and its absence is what let a 15-project browser
configuration and an unbounded worker spawn reach the repository unnoticed.
`free`, `memory.peak` and the lifetime `oom_kill` total do **not** satisfy this:
the first reports the host and the other two are cumulative (§How the evidence
was taken).

## Rejected alternatives

**`fileParallelism: false`** — the workaround the opening report found. It sets
`browser.fileParallelism` false, which trips the first line of `getThreadsCount`
and forces one page per project. Rejected on three grounds: it addresses L3
only, leaving L2, L5 and L6 untouched, so the seven-project root run still
multiplies and the worker storm is untouched; it is the arm that produced the
intermittent visual failures (F-438); and it pays the full duration cost of one
page per project to buy the least of the six bounds. Its one merit — that
`fileParallelism` _is_ in the CLI allow-list and so does reach browser
projects — is the accident that made it look like a fix.

**Lowering `maxWorkers` repository-wide.** Rejected on measurement, and this is
the alternative most likely to be proposed, because it is what the symptom
suggests. Once D-200 and D-202 are in place it moves the peak from 10 025 MiB to
9908 MiB — inside the run-to-run spread — while costing duration on every
package. See D-201.

**Raising the container's memory.** Rejected as a first move. The run does not
need 16 GiB; the _unbounded_ run needs more than any figure, because L2
multiplies with the number of browser projects and L6 with the number of
`.css.ts` files, and both sets will grow. With the decisions in place the
heaviest package peaks at 9908 MiB including background, so 16 GiB is not
merely sufficient but comfortable. Raising the cap first would have hidden
F-434 and F-436 rather than fixed them.

**Pinning V8's heap.** Rejected on measurement: `--max-old-space-size=768`
raised the peak rather than lowering it, and 512 MiB aborted the run with
`SIGABRT`. F-434 explains why — the flag bounds the main isolate, and the
memory was in thirty-one others.

**In-process serialization by `sequence.groupOrder` alone.** The neatest change
available, and genuinely the mechanism that makes groups sequential. Rejected
because F-435 means it bounds concurrency without bounding the peak: it finished
at 14 503 MiB, 88 % of the cap, and still lost a test to F-438. It remains the
right tool if L2 ever needs bounding inside a process that has been made cheap.

**Reducing coverage** — merging the three material-x browser projects, dropping
the visual layer from the default run, or sampling screenshots. Not considered.
The four-layer model in `.agents/docs/test-architecture.md` is what makes a
failure diagnostic, and the projects are its seams. This was a scheduling defect
and an unbounded resource; both have direct fixes.

## How implementation demonstrates the required behaviour

The work is not complete on a green suite. Each item is a measurement taken in
the devcontainer and reported with the change (I-38).

1. **The worker bound holds.** Peak main-process `VmRSS` for material-x's
   `browser` project, and the peak concurrent `.css.ts` worker count, reported
   at the implemented bound. The expectation from D-200 is ≈2 GiB against the
   ≈6.3 GiB the unbounded plugin reaches. A test that fails if the bound is
   removed — asserting the observed concurrent worker count, not the presence of
   a constant — is required, because F-434's failure mode is silent and grows
   with the source tree.
2. **The build is bounded too.** Peak `VmRSS` of the `tsdown` process and peak
   `memory.current` for a clean `just build-lib` of material-x, against the
   12 063 MiB / 16 383 MiB measured today. The build path uses the same handler
   and must show the same improvement.
3. **Package-level, every package.** Each of the seven packages run in turn,
   each reporting peak `memory.current` and an `oom_kill` delta of **zero**,
   with every peak below 13.1 GiB (D-199).
4. **Package-level, material-x specifically.** All 19 files and 263 tests pass
   in one invocation of the package's `test` target — 8 `browser`, 6 `spec`,
   4 `visual`, 1 `node` — with peak and `oom_kill` delta reported. This is the
   run that is killed today; the target from the measured arrangement is
   ≈9.9 GiB peak in ≈60 s.
5. **Repository-level.** The full repository run completes with an `oom_kill`
   delta of zero and a peak below 13.1 GiB, with wall-clock duration stated. The
   duration is a reported figure rather than a target, but a repository run
   materially longer than the sum of its package runs means the sequencing is
   wrong.
6. **F-438 is closed, not assumed away.** The visual project passes on three
   consecutive runs on a container carrying its normal background load, with no
   baseline re-recorded and no tolerance widened. If the disposition is that
   relieving memory pressure was the whole fix, those three runs are the
   evidence for it.
7. **The inert control is documented as inert.** Wherever the repository tells a
   contributor how to bound test memory, it does not say `--maxWorkers`
   (F-432, D-201).

Items 3–5 discharge the brief. Items 1, 2, 6 and 7 are what stop the defects
returning silently.

## Owner choices

Surfaced rather than decided, because each changes what a contributor's machine
or workflow must provide.

**Contributor hardware: no change is proposed, and none is needed.** With the
decisions in place the heaviest package peaks at 9908 MiB _including_ 4.2 GiB of
background, against a 16 GiB cap — 61 % used, 6.4 GiB free. The run's own
footprint is about 5.7 GiB. The 16 GiB container is comfortable rather than
marginal, and the earlier symptom was two bugs rather than a small machine.

**Reaping stale MCP servers.** 26 `chrome-devtools` processes holding 1192 MiB
in a 2 d 16 h container is 7 % of the budget lost to processes nothing is using.
This is a harness-lifecycle question rather than a test-configuration one, so it
is named and not decided: either the servers acquire a lifetime, or the
container acquires a periodic reap, or contributors restart the container before
a full run. The design does not depend on the answer — it assumes 6 GiB of
background — but every option here buys headroom more cheaply than anything in
the test configuration does.

**Losing the root `vitest.config.ts`.** D-203 removes what the Vitest IDE
extension and a root `vitest` watch session currently resolve. Per-package
configurations remain and the extension can be pointed at them, but a
contributor who runs the whole repository from the IDE today will notice. The
alternative — keeping a reduced root config for the non-browser projects — is
stated in D-203 and was recommended against on drift grounds rather than cost
grounds. The owner may weigh the IDE workflow differently.

**Making the container tell the truth.** `--cpus` in `runArgs` would set
`cpu.max`, which `availableParallelism()` respects, bringing every CPU-derived
default down proportionally. It is deliberately **not** part of the design —
D-199 bounds things explicitly so that they do not depend on a derived figure —
but it is worth doing for CPU oversubscription, and it changes the container
spec, so it is the owner's call.

## Loose ends this pass leaves

**`vite-traits-plugin` holds an unbounded parse cache.**
`packages/vite-traits-plugin/src/analyze.ts:177` keeps a module-level
`Map<string, Program>` of full oxc ASTs, evicted only on `watchChange`. It did
not appear in any measurement here — the arm dropping the trait plugin was flat
— but it is an unbounded retention in a long-lived dev server and is the same
shape of defect as F-434. Worth its own look; not this pass's work.

**The root-level run has no clean "before" measurement.** F-436's series is
contaminated after t ≈ 56 s. The finding does not rest on the contaminated part,
but a precise repository-level baseline needs a quiet container and about two
hours. Given D-203 removes the configuration that produced it, that measurement
is probably not worth taking.

**F-438's disposition is provisional.** It did not reproduce in the two
separate-process arms, which is suggestive but not proof; item 5 of the
demonstration list is what settles it.
