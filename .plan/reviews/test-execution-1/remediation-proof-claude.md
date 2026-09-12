# test-execution-1 — the supersession remediation, independently reviewed

**Files read at `783c97665`**, the head of the reviewed range
`375a9c00e..783c97665` on `drag2/fin-review`. The checkout head is `c19e0cf7a`
(`repo: format`), which touches `AGENTS.md`, `CLAUDE.md` and `README.md` only and
intersects neither the range nor anything cited here.

**Canonical inputs.** The test-execution architecture through `375a9c00e`
(`architect-test-execution-model-r4.md` §An invalidation arriving during
evaluation supersedes the request, §The handoff boundary after the review
round), the round consolidated at `e618e5677`, and
[`implementer-supersession-remediation.md`](../../test-execution-1/implementer-supersession-remediation.md).

**Isolation.** Every execution ran in detached worktrees at `783c97665`
(`wt-review`), `375a9c00e` (`wt-base`) and `9884b1fb1` (`wt-bp`), each with
`node_modules` symlinked from the checkout and its packages built there. No
production code was modified in any tree; `git status --porcelain` is empty in
the checkout and carries no tracked entry in any worktree.

**Nothing here claims an identifier.** No heading opens with one at any depth;
the pass-local names sit in the bodies.

## Scope

**Covered.** TE-D17's eight observable properties, attacked by execution at
three levels — the generation module directly, a real Vite dev server with
watcher-delivered saves and no injected events, and a real Rolldown build. The
seven remaining repairs against the findings that produced them. The
implementation boundary. The root run's two failures, attributed by controlled
reproduction rather than by file non-overlap.

**Not covered.** The design outside the remediation: the memory delta (TE-F37),
the browser page bound, `NON_BROWSER_WORKERS`' value, `repo:RD-2`'s content, and
id registration. The editor demonstrations 13–15, which remain owner-executed —
no VS Code installation exists in this container. A breakpoint actually pausing
under the Zed debug recipe: I verified the port and the execution, not
`Debugger.paused` (the implementing pass did).

## Result

**Five findings: two tier A, three tier C.** Both tier A items are **routed** —
each turns on a contract or a settled constant that this pass does not own, and
neither is a departure from TE-D17 as written.

**Everything the remediation claims for itself reproduced**, including the
claims I tried hardest to break. The two root-run failures are both attributed
away from this work on independent evidence, and the `node/drag2` timeout was
reproduced **at the pre-remediation parent** and then produced on demand by
raising the worker bound.

| Local | Tier | Claim                                                                                     |
| ----- | ---- | ----------------------------------------------------------------------------------------- |
| rem-1 | A    | A generation demoted by an entry's throw cannot be superseded, and publishes a torn sheet |
| rem-2 | A    | The settled bound is exhausted by **two** concurrently written tracked files              |
| rem-3 | C    | A new comment points the reader below for something above it                              |
| rem-4 | C    | Demonstration 20 is recorded discharged with one of its two clauses unevidenced           |
| rem-5 | C    | The item the repair unblocked is neither settled nor carried as owed                      |

---

## Tier A

### A generation demoted by an entry's own throw cannot be superseded, and a real save inside another entry's evaluation publishes a torn stylesheet

**rem-1. Routed.**

**Current behaviour.** An entry's own evaluation failure demotes the generation
without discarding it: the worker's error branch sets `current = undefined` and
leaves the other in-flight requests on the generation to drain, which is
TE-D13's rule and is unchanged by this range. `discardGeneration()` then begins
`if (!current) { return; }`, so every invalidation arriving after that demotion
is a no-op, and the requests still in flight on the demoted generation are
never re-issued. `findReferences` puts `discardGeneration`'s only call site
outside its own module at `index.ts:261`, the `watchChange` hook, so this early
return is the whole of what an invalidation can reach.

**Why it is a problem.** TE-D17 states the requirement it exists to enforce as
"a stale or failed generation must never publish output", and rules out letting
an in-flight request settle against the generation it started in precisely
because "modules already loaded hold pre-change content and modules not yet
loaded hold post-change content: the result is not merely stale, it is
**torn**, and no consumer can tell." In this window the tear is produced and
published, and the save that should have prevented it is discarded silently.

**Evidence.** A real Vite dev server, files all created before the server
starts so the watcher sees changes only, saves written to disk with no injected
events. One entry throws 150 ms in; a second reads `early.ts` at link time and
`late.ts` 800 ms later; both token files are saved at 300 ms:

```
boom              : REJECTED: the entry threw
watcher events    : 2
slow published    : A/B
torn (A/B)        : true
superseded (B/B)  : false
```

`--early: A` is the pre-change module the entry had already loaded; `--late: B`
is the post-change one it loaded after the save. Both watcher events were
delivered and both were no-ops. Reproduced independently at the module
boundary against the built artefact, same shape, same result.

**Bound of the consequence, measured and not.** The demoted generation is
disposed once it drains, so no handle leaks, and the next request starts a
fresh generation — recovery is immediate. In the dev-server path
`handleHotUpdate` returns every entry for a tracked file, which should
re-request the torn entry; I did not drive that end to end through a browser,
so the tear is established and its lifetime is not. In the build path a
throwing entry fails its own build, so a torn artefact needs the throw and the
publish in **different** builds sharing the process generation; I did not reach
that shape without staging it.

**Pre-existing, and in scope.** The same early return stands at `375a9c00e`, so
this range did not introduce it. It is reported here because TE-D17 is the
contract that now says this cannot happen and this range is TE-D17's
implementation: TE-D13's drain-on-failure rule and TE-D17's never-publish-torn
rule meet here and disagree.

**Required property.** A generation that has stopped being current — however it
stopped — does not publish an answer evaluated across a change it was told
about.

**Routed.** Which of the two rules yields is a contract choice, not a defect a
review pass can resolve.

### The settled bound of two is exhausted by two concurrently written tracked files, not by a 29-artefact rebuild

**rem-2. Routed.**

**Current behaviour.** `ATTEMPTS = 2`, the contract's minimum. A request is
issued to at most two generations; the second supersession rejects it with
`CSS evaluation superseded by concurrent invalidation 2 times`.

**Why it is a problem.** The record reasons about the bound against a
`@ydinjs/tproc` rebuild writing 29 tracked artefacts, and r4 names it as the
ground a challenge should attack — "a bound that is too low turns a
`@ydinjs/tproc` rebuild into a loud failure". The remediation records the
measurement as still owed. It is much cheaper than 29: **two** tracked files
written while one evaluation is in flight are enough, because each one is its
own `watchChange` call and therefore its own discard. Two files is a `git
checkout`, an editor's save-all, a formatter pass, or any build that emits more
than one artefact.

**Evidence.** A real Vite dev server, one plugin instance, a warm entry that
tracks the token files, a fresh generation, then one request in flight while
_N_ tracked files are rewritten at once:

```
N=1 : watcher events 1  → resolved
N=2 : watcher events 2  → REJECTED: CSS evaluation superseded by concurrent invalidation 2 times
N=3 : watcher events 2  → REJECTED: …
N=29: watcher events 2  → REJECTED: …
      next request      → resolved: BB
```

`N=1` is the case the implementing pass measured and it holds — an ordinary
single save survives, which is the whole of what the bound was chosen to buy.
`N=2` does not.

Through a real Rolldown build, with the change delivered by a co-tenant Vite
dev server's own watcher — the co-tenancy this repository actually runs, three
plugin instances to one process generation:

```
one tracked file saved mid-evaluation  → artefact B/A          (correct, not torn)
two tracked files saved mid-evaluation → BUILD FAILED: CSS evaluation superseded …
```

**What this does not say.** The implementation conforms to TE-D17 exactly: the
bound is at least 2, exhausting it is loud, the message names concurrent
invalidation rather than a file, and the stack points into the generation
module and not into a `.css.ts` — all verified. **No torn output is published
on this path**, which is the guarantee that matters most and which held in
every arm. The finding is that the settled value does not survive a two-file
write, and that the dev-server consumer of an ordinary multi-file save sees a
transform error. Recovery is one request away and was measured.

**Required property.** The bound's value is chosen against the smallest write
burst a consumer of this repository actually produces, not against a single
save.

**Routed.** The record places the constant's value with the architect, and the
remediation correctly did not move it.

## Tier C

### A new comment points the reader below for something that is above it

**rem-3.** The comment added at `.scripts/vitest-config.ts` ends "debugging
attaches to the CDP port below". The CDP launch arguments
(`--remote-debugging-port=9222`, under `isDebug`) are roughly ten lines
**above** that comment; nothing below it concerns the port. Introduced by this
range. **Required property.** A comment's directions point at what it names.

### Demonstration 20 is recorded as discharged with one of its two clauses unevidenced

**rem-4.** Demonstration 20 reads "reaches a breakpoint with the CDP port
attached, **and** saving the file while paused does **not** start a second
execution." The remediation records it discharged and evidences the first
clause only — the run, the attached port, `Debugger.paused`. The second clause
has no evidence in the record. r4's repair sentence ("A discharge must show the
breakpoint and the attached port, not the exit code") names what the old
evidence failed to distinguish, not a narrowing of the demonstration. This is
the round's own standard — a demonstration is discharged by evidence that
distinguishes it from its failure — applied to the half that was never in
dispute. **Required property.** Every clause of a demonstration recorded as
discharged carries evidence, or the demonstration records which clause does
not.

### The item this repair unblocked is neither settled nor carried as owed

**rem-5.** `der` left one item explicitly unsettled — whether the debug
recipe's surviving CDP-port `pkill` still has a cause — and void until the
`ui`/`deviceScaleFactor` conflict was repaired; r4's work list says the repair
"blocks the round's one genuinely unestablished item". The repair landed. The
remediation's `zed-test.sh` keeps `cleanup-debug-processes` unchanged, says
nothing about it, and "What is owed, and what is not claimed" does not list it.
An item that was parked on a blocker and is no longer blocked is neither
answered nor visible. **Required property.** An obligation released by a repair
is discharged in that pass or restated as owed by it.

---

## What survives falsification

### TE-D17's observable properties

Every property in the brief was attacked by execution and every one held.

**An invalidation rejects no pending caller, and the re-issue is against the
successor.** At the module boundary, against the built artefact, on a fixture
whose `early` module is loaded at link time and whose `late` module is loaded
600 ms in, with both rewritten and a third module introduced mid-evaluation:

```
cold          : .x{--early:A;--late:A} deps= 6 extra= false
superseded    : .x{--early:B;--late:B} deps= 7
  torn (early:A + late:B)                : false
  successor deps carry extra.ts          : true
  deps object is the cold generation's   : false
  settlements                            : 1
```

The accepted answer is wholly post-change, it carries a module that **only the
successor generation ever resolved**, the returned set is not the object the
request started against, and the caller's promise settles exactly once.

A first attempt of mine produced a false negative worth recording: re-requesting
the same entry inside one generation is served from the isolate's module cache
and never goes in flight, so the discard had nothing to supersede. Each arm
above uses a distinct entry for that reason.

**Responses from discarded generations cannot resolve a request or publish
output.** The discarded generation's pending map is emptied before it is
disposed, so the dying worker's answer finds no request; the `deps` object
identity check above is the positive half of the same property — the published
set is the producing generation's, not a lexical capture.

**Repeated invalidation respects the bound and reports it correctly.**

```
two discards  : REJECTED CSS evaluation superseded by concurrent invalidation 2 times
  message names a file                   : false
  stack points into a .css.ts            : false
three discards: REJECTED … 2 times        (rejects at the second, not the third)
recovery      : .x{--early:A;--late:A}
```

**A real Vite dev-server update produces no torn stylesheet.** Real server, real
watcher, no injected events; the save lands 201 ms into an evaluation that
resolves at 964 ms:

```
watcher delivered: early2.ts@203ms
published        : --early: B; --late: A      (both files' current contents)
torn             : false
```

The 964 ms resolution against a 700 ms entry is the re-issue: the caller waited
for the generation that finished, not the one that started.

**A real Rolldown rebuild produces no torn stylesheet.** A real build with the
change delivered by a co-tenant dev server's watcher — the route the record
identifies as the reachable one — emitted `B/A`, one generation's view of both
modules. Under two files it fails the build instead of emitting anything
(rem-2). No arm of the shipped code emitted a pre-change/post-change mixture.

**Genuine failures still fail, and do not become accidental supersession.**

```
boom : {"message":"the entry threw",
        "stack":"Error: the entry threw | at …/boom.css.ts:2:7"}
```

The entry's own error, with its own stack pointing at the entry, rejecting only
the request that threw while a sibling request continued on the same
generation.

**Success, failure and supersession leave no handle preventing exit.** Four
paths, each measured with `process.getActiveResourcesInfo()` at exit:

```
success              : exited naturally after 5 ms; live handles: none
failure              : exited naturally after 3 ms; live handles: none
supersede            : exited naturally after 3 ms; live handles: none
exhausted-no-release : exited naturally after 2 ms; live handles: none
```

The last arm deliberately never calls `releaseGeneration()`: a discard that
exhausts the bound must leave nothing behind on its own, and it does.

Across fifteen whole-repository runs there is no `close timed out`, no `Failed
to run the test` and no unhandled error in either arm, and a teardown-logged run
releases seven of seven providers in boundary order with headless Chrome
returning to its baseline:

```
closed browser/material-x (chromium) (group 1) at boundary 1->2
… spec/material-x 2->3, visual/material-x 3->4, browser/core 4->5,
  browser/box-quad 5->6, browser/drag 6->7, browser/drag2 7->8
```

### The root run's two failures

**`node/drag2`'s `size.node.test.ts` timeout is a pre-existing contention
timeout, not a regression.** Eight runs at `783c97665` interleaved one-for-one
with seven at `375a9c00e`, same container, same builds, same harness:

| Arm                     | slot test median | max     | timeouts |
| ----------------------- | ---------------- | ------- | -------- |
| head (`783c97665`), n=8 | 628 ms           | 932 ms  | **0**    |
| base (`375a9c00e`), n=7 | 438 ms           | 5003 ms | **1**    |

The failing test is `the non-composed baseline > should fill exactly the slots
the assembler fills` — the one `await import()` of built output in the file —
and the only occurrence in fifteen runs landed on the **pre-remediation** arm.
Base also failed `packaging.node.test.ts > should publish no declaration the
entries cannot reach` in 2 of 7; head in 0 of 8. Node-group wall time is
indistinguishable (head median 30 969 ms, base 30 148 ms, spreads overlapping).

The mechanism is contention, produced on demand rather than inferred. In
isolation the test never approaches the timeout; at the shipped bound it does
not fail; at TE-F34's oversubscribed bound it fails every time:

```
node/drag2 alone,      n=3 : slot 383 / 478 / 492 ms, 0 failures
node group, bound 6,   n=4 : slot 485–866 ms,         0/4 timeouts
node group, --maxWorkers=11, n=4 : slot 5001–5004 ms, 4/4 timeouts
                                   + consumer.node.test.ts 4/4, 4/4, 3/4
```

So it is an incidental pre-existing flaky timeout **whose cause is the shared
non-browser group's contention** — the two candidates the brief separates are
the same answer here — and it is not a consequence of this remediation. The
part worth carrying: TE-D14 asks the shared non-browser group to stay green,
and it is not reliably green at either commit. Every intermittent failure I
observed in fifteen runs landed on the pre-remediation arm, which is evidence
about the group's margin, not about this range.

**`node/tproc`'s failure is independently attributed and is not a contention
artefact.** It failed in 15 of 15 runs in both arms, and reproduces in
isolation at the branch point `9884b1fb1` in 7 ms of test time with the
byte-identical assertion:

```
expected { 'state-layer.opacity': 0.08 } to deeply equal { 'container.color': 'red', …(1) }
```

`packages/tproc` was last touched 422 commits before the review head, and
`git diff 9884b1fb1..783c97665 -- packages/tproc` is empty. This is derived from
execution at a commit predating the branch, not from file non-overlap.

### The remaining repairs

- **The unreachable `#released` branch is gone**, and the property it was
  credited with still has a holder: `#consumed` is set unconditionally in
  `onTestRunStart` after the empty-list exemption and throws before anything a
  second run could reach. `#release` carried the set's only write, so it is now
  a module-level `release()`; no instance state is read by it.
- **The Zed debug recipe executes its tests.** On a browser test at head:
  `Test Files 1 passed (1) Tests 25 passed (25)`, and on a second file with the
  port polled from outside the run, CDP answered at ~2 s with
  `Chrome/153.0.8010.36`. The falsifying half was established twice by the round
  and is not re-derived here.
- **`clean.extras` covers the chunk.** The pathspecs `clean:build` computes now
  include `generation-*.js` and its map, and the tree carries exactly one
  `generation-*` chunk.
- **The request counter is generation-scoped**, and the id-drop behaviour is its
  witness: an answer from a discarded generation is matched only against that
  generation's own map, which no longer holds the request.
- **The dependency set comes from the producing generation** — the successor-only
  module in the accepted set, and the object-identity check, above. The copy is
  gone and its single caller still iterates synchronously with no intervening
  await, so nothing can observe the live set changing. `findReferences` on
  `EvaluationResult` returns four sites, all inside `generation.ts` — the type
  is never named outside the module — and `evaluate` has exactly one call site
  outside it, the `load` hook at `index.ts:208`. `css/generation.js` is also
  absent from the package's `exports`, so the set cannot escape to a second
  holder.
- **`zed-test.sh` declares `bash`.** `sh -n` still reports
  `line 53: Syntax error: Bad function name` (`sh` is dash here); `bash -n`
  parses; `.zed/tasks.json` invokes `bash` as it always did.
- **`repo` resolves, and the refusals stay distinguishable.**

  ```
  repo:RD-2    → #### RD-2 — Pull-request verification is accepted policy whose implementation is owed
  repo:RD-99   → unknown local id in repo: RD-99
  boxquad:D-1  → unknown scope: boxquad / this build resolves drag2, repo
  D-171        → not a qualified address / … write drag2:D-171 …
  drag2:D-171  → unchanged
  ```

  `drag2` is still the first row, which is the example the hint offers.

### The boundary held

The range touches fourteen files, six of them the round's own records. No
`.github`, `.vscode` or `.zed` file is touched; nothing of `repo:RD-2` is built.
`BROWSER_WORKERS` is 2 and its declaration is untouched — including the comment
der-1 reported, which is correctly left to the architect. No watch
configuration is reintroduced. No canonical id is minted: `.plan/00-index.md`
§Findings still reads "None allocated", and the heading rewrites in the four
pass artefacts and the summary put the identifier out of opening position
everywhere I checked, under the `[A-Za-z][A-Za-z0-9]*-\d+` grammar `ledger.ts`
defines.

**Gates.** `just typecheck`, `just fmt-check`, `just lint` and `just build` all
pass at this tree.

## Method notes

**A symlinked-`node_modules` worktree fails `just lint` for a reason that is not
in the tree.** `eslint` reports five `import-x/order` errors on `.scripts/`
files importing `@ydinjs/*` workspace packages, because those resolve through
the symlink to paths outside the worktree root and change import group. The
same command in the checkout at the same tree exits 0. Recorded so the next pass
does not report it as a regression.

**One thing outside the range, seen on the way past.** `just fmt-check` passes
at `783c97665` and **fails at the checkout head `c19e0cf7a`**, whose whole
subject is `repo: format`: `prettier --check` reports `CLAUDE.md` and
`README.md` as unformatted there, and all three files it touched are clean one
commit earlier. That is a live gate failure on the branch, outside the reviewed
range and attributable to no part of the remediation, so it is recorded here
rather than counted against this work.

**Delegation.** None. Every claim here was executed in this agent.

**LSP plugin — available; used**: `findReferences` on `evaluate`,
`discardGeneration`, `EvaluationResult` and `Generation`, to establish the call
surfaces the two tier A findings rest on — that `discardGeneration` has exactly
one trigger and `evaluate` exactly one consumer, so no second path into either
behaviour was missed. The rest of the review turned on runtime behaviour under
real consumers and on timing distributions across repeated runs, where it does
not apply.
