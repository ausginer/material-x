# Challenge — test execution model, revision 4 as amended

**Architect pass, 2026-09-11, branch `drag2/fin-review`, against
[`architect-test-execution-model-r4.md`](architect-test-execution-model-r4.md)
at `deca4deeb`,** reading `a8cd06441..deca4deeb` and the prior challenge as
amended through `c4c76e638`.

A focused challenge of the amendment only. The settled execution model — one
root Vitest invocation, per-package invocation, group-boundary teardown, one CSS
isolate per generation — is not reopened; no contradictory evidence was found
against any of it. The eight load-bearing properties of TE-D15 and TE-D16 were
attacked directly.

**Nothing here claims an identifier.** No heading opens with one at any depth.
`TE-` names are used in mention form and fall outside the local identifier
grammar. **Nothing is implemented.** Every probe is a scratchpad fixture; the
working tree was clean before and after.

## Verdict

**The amendment survives. Both new contracts hold on their load-bearing
mechanisms, and every mechanism that could have falsified them was found to
point the other way.** Two of the prior challenge's open items are closed
favourably and one of revision 4's own challenge grounds is settled.

It is **not** implementation-ready exactly as written. Seven corrections are
required first. None changes a mechanism; all are inventory, wording or
required-property corrections, and two of them fall in the class the brief names
as design defects rather than implementation detail.

| Property under attack                               | Result                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Carrier survives `--reporter`                       | **Holds** — verified at source, not only measured; 3 properties to add |
| `onTestRunStart` precedes pool, setup, execution    | **Holds exactly**; one consequence to record                           |
| Empty runs neither consume nor hide a failure       | **Consumes: no.** **Hides: the pre-existing route survives**           |
| Ordinary editor gestures usable under `watch: true` | **Holds, by three independent mechanisms**                             |
| Continuous Run and second execution fail explicitly | **Holds**                                                              |
| Every gesture has a valid one-shot lifecycle        | **Holds; `updateSnapshots` traced and closed favourably**              |
| Retirement retires only reruns                      | **Two inventory defects** — the debug recipe, and `watchOnStartup`     |
| Teardown holds at the boundary for every project    | **Falsified as stated** — the final group is never released by it      |
| The generation isolate is released, never retained  | **Holds; TE-F22's handle is now identified rather than inferred**      |

## Evidence provenance, stated first

**The VS Code extension is not installed in this container**, and `.vscode-server`
is gone entirely since the previous pass — only Zed is present. The artefact
read here is an unpacked copy left in a scratchpad by the revision-4 pass; its
`package.json` self-reports `publisher: vitest`, `name: explorer`,
`version: 1.50.8`, and its `dist/` file sizes match the extension that was
installed in this container on 2026-09-10 and read by the previous challenge.
That is the strongest provenance available. **All extension findings below are
source reading of that artefact. No editor gesture has been exercised in any
pass**, and revision 4 is right to say so.

Vitest `4.1.10`, Vite `8.1.4`, `@vitest/browser-playwright` `4.1.10`.
`memory.max` 17 179 869 184 B.

## The carrier can always be installed (TE-D15, TE-F24)

**Holds, and the ground is stronger than revision 4's measurement.** Revision 4
verified this by running it. It is also true by construction, which matters
because the claim is about what no flag can do:

- `Vitest._createRootProject` assigns `this._config = resolved`
  (`cli-api.BK8pd4xc.js:13097`), so `vitest.config` is **the same object** as the
  local `resolved` — revision 4's probe printed this and the assignment proves it.
- `configureVitest` hooks are invoked at `:13152`;
  `createReporters(resolved.reporters, this)` runs at `:13177`. Strictly between,
  in the same method, with nothing else touching `reporters` in that window.
- The CLI replacement branch is inside `resolveConfig`
  (`coverage.DM_a_rWm.js:443–451`, guarded by `if (cliReporters.length)`), which
  has already completed. A `--reporter` flag cannot reach the push.
- The extension appends rather than replaces and passes `reporter: void 0`
  (`workerNew.js`), so the branch is not taken there either (TE-F26 confirmed).

**Three required properties to add.** Each is a way the carrier goes silent
rather than loud, which is the one thing this contract may not do.

1. **The pushed value must be a reporter instance, not a name.**
   `createReporters` normalizes only array entries; anything else is returned
   unchanged (`:11367–11382`, `return referenceOrInstance`). String
   normalization happens earlier, in `resolveConfig`, so a string pushed from
   `configureVitest` is never normalized — it is handed to `Vitest.report` as a
   string, `r[name]?.(…)` is `undefined`, and **the contract silently does
   nothing**. An instance, or a resolvable `[name, options]` tuple, is required.
2. **The plugin must reach projects that have no plugins today.** The hook set
   is gathered per project (`projects.flatMap(project => project.vite.config.getSortedPluginHooks(...))`),
   and `createNodeTestProject` and `createDeclarationTestProject`
   (`.scripts/vitest-config.ts:163, 173`) build their configs from
   `createTestBaseConfig` alone, which declares **no `plugins` at all**. A run
   filtered to `--project=node/tproc` would otherwise carry no carrier.
   Revision 4 requires installation "into every configuration"; this is why the
   word _every_ is load-bearing rather than tidy.
3. **`vitest bench` drops the carrier.** `:13177` branches on
   `resolved.mode === "benchmark"` to `createBenchmarkReporters(toArray(resolved.benchmark?.reporters), …)`,
   which never reads `resolved.reporters`. The repository runs no benchmarks, so
   this costs nothing today; "no CLI flag can remove it" should read "no flag of
   the `test` command".

## The enforcement point (TE-D15, TE-F25)

**Holds exactly as claimed.** `Vitest.runFiles` (`:13570`) opens with

```js
await this._testRun.start(specs);
await this.coverageProvider?.onTestRunStart?.();
```

and only then awaits the previous run, assigns `runningPromise`, and inside it
reaches `if (!this.pool) this.pool = createPool(this)`,
`await this.initializeGlobalSetup(specs)` and `await this.pool.runTests(...)`.
`_testRun.start` is the **first statement in the method**. `Vitest.report`
(`:13983`) is an uncaught `Promise.all`, so a throw there rejects before the
pool exists, before global setup, before any module, and before any test result.

**One consequence to record.** The throw happens _before_ `this.runningPromise`
is assigned, so the `finally` that calls `_testRun.end` never runs and **no
`onTestRunEnd` is emitted for the refused execution**. A consumer that pairs
start with end sees an unbalanced start. The extension recovers — `executeRun`'s
`finally { i.dispose(), await r.dispose() }` calls `endTestRun()` — but the
required property should say that the refusal must propagate to the caller, and
must not be implemented in a way that swallows it into a "completed" run.

**One coverage gap, unreachable but real.** `Vitest.collectTests` does **not**
call `_testRun.start`; it goes straight to `createPool`, `initializeGlobalSetup`
and `pool.collectTests`, and the browser pool's collect path calls
`project._initBrowserProvider()` and launches Chromium. So the guard — including
the torn-down-project check — cannot see a pool-driven collect. The extension
never takes that path (`workerNew.js`'s `collectSpecifications` calls
`experimental_parseSpecifications`, confirmed), and neither CLI entry point
collects after running in one process. The design should state the guard's scope
as _every path that emits a run start_, and name `collectTests` as the exception
with the reason it is unreachable, rather than claiming it covers every path
that executes specifications.

## Empty executions (TE-F27)

**They do not consume the lifecycle, and the exemption is necessary.** Verified
at `:13461–13471`: an empty specification list produces `_testRun.start([])` and
`_testRun.end([], [], coverage)`, then throws `FilesNotFoundError` **only** when
`!watch || !(changed || related)`. Under the extension, which always sets
`watch: true`, a filter matching nothing yields a run start, a run end, and no
error. Counting only non-empty executions is correct and forced.

**They do, however, leave the silent-zero-test route open.** That route is not
created by the amendment — it is Vitest's behaviour under `watch: true` and
predates every revision — but TE-D15's summary says reuse after teardown "never
succeeds silently with zero modules", and the neighbouring case _does_: an
editor gesture whose filter matches nothing reports a successful run of nothing.
The contract language should be scoped to reuse, which is what it actually
covers.

A strengthening is available at no cost and is worth recording as an option
rather than a requirement: the carrier already sees `specs.length === 0` at the
one hook that runs for empty executions, and could fail an empty execution that
was issued with a filter. It is declined here only because the blast radius on
legitimate editor gestures has not been measured, and that measurement needs an
editor.

## The editor under `watch: true` (TE-D16, TE-F21)

**Ordinary gestures remain usable, and the retirement is exactly aligned with
the mechanism.** This was the property most likely to break, because
`Vitest.scheduleRerun` (`:13860`) has **no `config.watch` guard** and ends in
`await this.runFiles(specifications, false)` — a second consuming execution —
and `Vitest`'s constructor subscribes to its own watcher unconditionally
(`:13037`, `new VitestWatcher(this).onWatcherRerun((file) => this.scheduleRerun(file))`).
Three independent mechanisms stop it from firing in an ordinary editor run, and
all three were verified:

1. **The child has no real file watcher.** The extension creates Vitest with
   `server: { middlewareMode: true, watch: null }`, and Vite installs a noop
   watcher in exactly that case — `serverConfig.watch !== null ? chokidar.watch(...) : createNoopWatcher(...)`
   (`vite/dist/node/chunks/node.js:25752–25757`). `registerWatcher` binds `change`,
   `unlink` and `add` to a watcher that never emits.
2. **The extension does not forward changes to an ordinary run's process.** Its
   file-system watcher calls `onFileChanged` on the members of `apisByFolder` —
   the long-lived per-config API objects. `executeRun` builds a _fresh_
   `new bt(this.api.config)` per ordinary run, which is never registered there,
   and `bt.onFileChanged` forwards only when its own `currentMeta` is set, which
   on the long-lived object happens only for continuous and debug runs.
3. **Even a delivered change would produce an exempt empty run.** The worker
   registers `onFilterWatchedSpecification` unconditionally
   (`workerNew.js`, `new Y(e, this.runner)` → `onFilterWatchedSpecification(e => this.shouldRunSpecification(e) ? true : (scheduleAstCollection(e), false))`),
   and `shouldRunSpecification` returns `false` immediately unless `enabled`,
   which only `watchTests` sets — and only the continuous runner calls
   `watchTests`. `scheduleRerun` applies that filter before `runFiles`, so the
   specification list would be empty and the execution non-consuming.

**Continuous Run therefore is the only path that produces a non-empty rerun**,
and under TE-D15 it fails loudly on its second execution. The retirement lands
precisely on the mechanism that distinguishes the two, which is a better
position than revision 4 claims for itself: TE-F21 says no in-process signal
separates the two runs, and that is true, but the _extension's own_ filter hook
separates them from outside, and it is what makes the ordinary gesture safe
rather than merely untested.

**Inventory defect 1 — `vitest.watchOnStartup`.** The extension reads this
setting per workspace folder and, when true, issues
`vscode.commands.executeCommand('testing.startContinuousRun', profile)` for
**every** config at activation. Its own manifest names what it is: _"Watch every
test file after the extension is loaded. This is the same as enabling continuous
run."_ The default is `false`, so this is a latent rather than an active
hazard — but it is the one setting that turns the retired mode on without a
gesture, and a retirement inventory that does not name it is incomplete. A user or a committed `.vscode/settings.json`
with that setting enabled would start the retired mode automatically on every
editor start and receive an unprompted loud failure. Revision 4's inventory
says Continuous Run "has no setting to disable and so is retired by
documentation plus the loud failure"; it has a setting that _enables it
automatically_, and the inventory must carry it. The disposition is cheap and
belongs beside TE-D7, which already edits that file: set
`"vitest.watchOnStartup": false` explicitly.

## Every gesture's lifecycle, and `updateSnapshots` (the open item, closed)

**Traced end to end. It does not reuse a consumed process.**

`vitest.updateSnapshot` is a **command**, not a profile, and its manifest
exposes it only on `testing/item/context` and `testing/item/gutter`, with
`commandPalette` gated `when: "false"` — so it is reachable only against a
single test item. It resolves that item's API, takes the **`:run` profile** —
the same profile as an ordinary run —
builds `new TestRunRequest([item], undefined, profile, false)`, sets
`updateSnapshots: true` on the request object, and calls the profile's
`runHandler`. That handler is `(e, t) => i.enqueue(e, t, false)`; `enqueue`
branches on `request.continuous`, which is false, so it reaches `executeRun`,
which constructs `new bt(this.api.config)` — **a fresh API object, therefore a
fresh spawned process, disposed in `finally`**.

Inside that process exactly one RPC is issued:
`let l = (t,n) => 'updateSnapshots' in e ? this.handle.rpc.updateSnapshots(t,n) : this.handle.rpc.runTests(t,n)`,
called once. On the worker side, `updateSnapshots` is

```js
async updateSnapshots(e,t){ let n=this.getGlobalTestNamePattern(); this.vitest.enableSnapshotUpdate();
  try { return await this.runTests(e,t) } finally { … } }
```

— one `runTests`, one `rerunTestSpecifications`, one `runFiles`. **One consuming
execution in a fresh process.**

The rest of the inventory, from the same reading:

| Gesture                                | Path                                                                                           | Executions |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| single test / file / project / Run All | `:run` profile → `enqueue` → `executeRun` → fresh `bt` → fresh process                         | 1          |
| update snapshots                       | command → the **same** `:run` profile → same path                                              | 1          |
| coverage                               | `:coverage` profile, its own `nn` and queue → `executeRun`                                     | 1          |
| debug                                  | `bt.forDebug` with `currentMeta` preset; worker does `this.debug && await this.vitest.close()` | 1          |
| a gesture queued behind another        | `pendingQueue` → `executeRun` again → **a new `bt`**, a new process                            | 1 each     |
| Continuous Run                         | `spawnForContinuesRun` → `this.api.spawnForRun` → **reuse**                                    | 2nd fails  |

Three run profiles exist in total (`Run`, `Debug`, `Coverage`), created together
in `setupProcessAPI`; there is no fourth.

**The one-run-per-process property is exhaustive, not per-gesture.** The bundle
contains exactly **one** `rpc.runTests(` site and exactly **one**
`rpc.updateSnapshots(` site, and they are the two arms of a single ternary
called once — `await l(files, request)` or `await l()`, mutually exclusive, no
loop. `Nt.runTests` itself has two call sites: `executeRun`, whose handle is the
fresh `bt`, and the debug flow, once per websocket connection. The queue does
not weaken it either: a gesture arriving mid-run stores a thunk that calls
`executeRun` again, which spawns again. So no gesture can issue two runs against
one process, by enumeration rather than by inspection of each gesture.

Revision 4's demonstration 15 can therefore be narrowed from "confirm that none
of them trips the guard" to a confirmation in a real editor, which is still
owed — but it is no longer an open question about the code.

## The retirement inventory (TE-D16)

**Inventory defect 2 — removing `--watch` from the debug recipe does not leave
run mode.** `run-vitest-debug` invokes the binary directly:

```sh
DEBUG=1 "$vitest_bin" -c vitest.config.ts --no-file-parallelism --test-timeout=0 --watch "$test_file"
```

Deleting `--watch` leaves `vitest -c … <file>`, and the default is
`watch: !isCI && process.stdin.isTTY && !isAgent`
(`vitest/dist/chunks/defaults.9aQKnqFk.js:48`). `.zed/tasks.json`'s
`vitest:debug` sets `use_new_terminal: true`, so stdin **is** a TTY and the task
stays in watch mode. Worse than a no-op: unlike the extension's child this one
has a real Vite watcher and no `onFilterWatchedSpecification` filter, so a save
during a debug session would reach `scheduleRerun` with a non-empty
specification list and hit the one-shot guard — converting today's working
"save to re-run while paused" into a loud failure rather than into nothing. The
disposition must be **`vitest run`**, not "remove `--watch`". The same reading
makes revision 4's row for the root `"test": "vitest"` correct, since TE-D8
already specifies `vitest run` there.

**Inventory precision — `allowExec` gates more than three RPCs.** Revision 4
says it "gates nothing else". It also gates CDP:
`@vitest/browser/dist/index.js:3071–3077` defines `isCdpAllowed` — which reads
`api.allowExec` on both the project and the root, browser and top-level — and
`assertCdpAllowed` guards `sendCdpEvent` and `trackCdpEvent` (`:3300`, `:3305`),
the in-test `cdp()` API.

The conclusion is unchanged but needs the right ground. **Debugging is not
damaged**, for two reasons that had to be checked rather than assumed: the Zed
debug flow drives raw Chrome through `--remote-debugging-port=9222` supplied in
the factory's launch args, not through the gated RPC; and Vitest's own
breakpoint support calls `provider.getCDPSession` directly
(`cli-api.BK8pd4xc.js:2652`), which does not pass the gate. The repository's
browser commands use no CDP. What the change actually removes is the in-test
`cdp()` capability, which nothing uses — and that is what the inventory should
say.

**The rest of the inventory holds, verified.**

- The warning condition is exactly as revision 4 states:
  `if (api.allowWrite == null && api.allowExec == null)` and only when
  `parentApi` is present (`coverage.DM_a_rWm.js`, `resolveApiServerConfig`), so
  an explicit `false` keeps it quiet.
- `allowWrite` is untouched by the change, and already resolves to **false**
  today under the exposed-host branch (`api.allowWrite ??= parentApi?.allowWrite ?? false`),
  so `canWrite` — which reads only `allowWrite` (`@vitest/browser:3068`) — is
  unaffected. No write path is disabled by setting `allowExec: false`.
- `pkill -f 'vitest.*browser'` is safe to remove: the conflict it protects
  against is ownership of CDP port 9222, which only a debug run takes and which
  the sibling `pkill` covers on its own terms.
- Build and development watch are untouched. The plugin's `addWatchFile` calls
  and its `handleHotUpdate` hook
  (`packages/vite-custom-element-assets/src/index.ts:73, 116, 208, 252, 284`)
  are not reached by anything in TE-D16, and repeated CSS generation across
  rebuilds is a consequence of TE-D13 rather than of test watch.

## Teardown at the boundary (TE-D12)

**Falsified as stated.** Revision 4 says every browser project is released
"**including the last** — because the non-browser projects occupy the highest
group". That is true of the root configuration and **only** of it. The mechanism
releases a project when a _later_ group's first module starts, so a project in
the final group is never released by it.

Measured, a project-filtered run — which is what every ordinary editor gesture
issues, because `--project` rejects non-matching projects during resolution:

```
projects instantiated: b1 (chromium)
runEnd passed modules=2 errors=0 boundaryClosures=0 chrome=10
before close: chrome=10 (baseline 6)
after  close: chrome=6
```

**Zero boundary closures.** The provider is released by `Vitest.close()` →
`pool.close()` → `browserPool.close()`, which is safe, but it is not the
mechanism the design credits.

The configurations where the final group is a browser group are not exotic:

- **`packages/box-quad`'s entire per-package configuration** — `createBoxQuadTestConfig`
  (`.scripts/vitest-config.ts:293`) declares exactly one project, `browser`.
- material-x's `test-behavior`, `test-spec` and `test-visual` recipes, and
  box-quad's `test-behavior`, all of which pass `--project`.
- **Every ordinary editor gesture on a browser test.**

Configurations with a node or declaration project do release their browser
project, and this had to be checked rather than assumed for the declaration
case: **typecheck projects do emit `onTestModuleStart`.** Measured on a fixture
with one browser project at `groupOrder` 1 and one `typecheck` project at 2 —
`MODULE START decl type1.test-d.ts` fires after both browser modules end, in its
own appended group.

**Corrections required.** The required property becomes: _teardown at group
boundaries releases every browser project except the one occupying the final
group; the final group's provider is released by process close._ Demonstration 3
("seven of seven closed, each at a group boundary") stays valid for the root
run. **Demonstration 14 as written would fail** — an arrow-triggered run of a
single browser project releases its provider at process close, not at a
boundary — and should assert Chrome returning to baseline before the process
exits, which is the property that actually matters and which the design already
asks for in demonstration 3.

This also bounds the benefit honestly: in the editor, TE-D12 does work for
"Run All Tests" and nothing for the single-project gestures, because those
instantiate one project.

**One more property, cheaply verified.** The specification list handed to
`onTestRunStart` is **unsorted** — the fixture reported
`decl[go=2]` before `b1[go=1]`, since `sequencer.sort` runs later inside
`executeTests`. The pre-execution serialization invariant must read
`spec.project.config.sequence.groupOrder`, never the list order.

## The generation isolate (TE-D13, TE-F22)

**Holds, and revision 4's own challenge ground is settled.** It lists "the 10 s
close timeout was diagnosed by elimination, pristine against converted, not by
identifying the retained handle". The handle is now identified. Measured on a
host/worker fixture with a **persistent** `port.on('message')` listener, which
is the shape a multiplexed request port must have:

| Disposition                          | Result                     |
| ------------------------------------ | -------------------------- |
| nothing                              | still alive at 1500 ms     |
| `worker.unref()` only                | **still alive at 1500 ms** |
| `worker.unref()` + `port.unref()`    | exits in 18 ms             |
| `worker.unref()` + `port.close()`    | exits in 22 ms             |
| `worker.terminate()`, port left open | exits in 25 ms             |

With a one-shot `port.once` listener instead, `worker.unref()` alone suffices —
which is why the fault only appears in the real, multiplexed shape. So
TE-F22's sentence is exactly right, and the implementable rule is sharper than
it states: **the parent-side `MessagePort` with a live `message` listener is the
retained handle, and `terminate()` alone is sufficient because it detaches the
port.** Unref-ing the worker without touching the port is the one disposition
that looks correct and is not.

**One hook covers all three consumer classes** for the abnormal-exit case.
Vite's plugin container close calls `hookParallel("closeBundle", …)`
unconditionally (`vite/dist/node/chunks/node.js:30185`), whereas `buildEnd` at
`:30184` is gated on environment and server options. `closeBundle` therefore
fires for dev-server close and for the rolldown build alike, and is the right
backstop behind reference-counted release. Success and failure are already
covered by revision 4's rules — release on last consumer, drop the generation on
worker `error`, non-zero `exit`, or an evaluation failure (TE-F20).

## What the amendment must correct before implementation

Seven items. None changes a mechanism.

1. **TE-D12's release property** — the final group is released by process close,
   not by the boundary; and **demonstration 14** must assert Chrome returning to
   baseline rather than a boundary closure.
2. **TE-D16's debug-recipe disposition** — `vitest run`, not "remove `--watch`".
3. **TE-D16's inventory** — add `vitest.watchOnStartup`, disposed by setting it
   explicitly false beside TE-D7's other `.vscode/settings.json` change.
4. **TE-F28's scope** — `allowExec` also gates the browser `cdp()` API; state
   why debugging is nonetheless unaffected.
5. **TE-D15's carrier properties** — push an instance rather than a name;
   install into the plugin-less node and declaration configs; note that
   `vitest bench` does not read `resolved.reporters`.
6. **TE-D15's guard scope** — "every path that emits a run start", with
   `Vitest.collectTests` named as the exception and the reason it is unreachable.
7. **TE-D15's silence claim** — scope it to reuse; the empty-run route to a
   silent zero-test success is pre-existing and survives.

## Demonstrations still owed at implementation time

Revision 4's list stands, with these changes: item 14 amended as above, item 15
narrowed to an editor confirmation rather than an open question about the code,
and these added.

- **The debug task is run mode.** `.zed/tasks.json`'s `vitest:debug` reaches a
  breakpoint, and saving the file while paused does **not** start a second
  execution.
- **The carrier is present in a plugin-less project.** `vitest run --project=node/tproc`
  enforces the contract.
- **The carrier is an instance.** A root run with `--reporter=dot` shows the
  enforcement reporter's hooks actually firing, not merely present in the list.
- **`watchOnStartup` is off** — it defaults to `false`, so this confirms nothing
  in the repository has set it — and enabling it produces the loud failure
  rather than a hang or a silent pass.
- **The three editor gestures that pass a project filter** release their
  provider at process close, with Chrome back to baseline.
- **The generation worker's port is released**, evidenced by the absence of
  `close timed out` under the real plugin in the root run.

## Limits of this pass

- **No editor was run.** The extension is not installed in this container; the
  artefact read is an unpacked copy from the previous pass's scratchpad,
  identified above. Every gesture conclusion is source-derived.
- **No whole-repository arm was re-run.** Δ 5554 MiB, 63.6 s and 32 Chrome
  processes are taken as reported, and remain a single sample.
- **The teardown and lifecycle probes use fixtures** — two trivial browser
  modules and one typecheck module — not the real suites.
- **The `updateSnapshots` trace is static.** It establishes one RPC per gesture
  and a fresh process per gesture from the code; it does not observe the editor
  issuing it.
- **The port-handle result is a fixture**, not the converted plugin. It
  identifies the handle class; it does not prove the converted plugin holds no
  other handle.
- **Process-wide generation sharing was not attacked** in this pass. Revision 4
  lists it as an open ground and it remains one.
- **`compileCSS` is downstream of every arm**, unchanged and unmeasured, as in
  every previous pass.
