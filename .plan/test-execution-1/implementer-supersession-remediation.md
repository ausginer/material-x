# In-flight CSS supersession, and the review round's settled remediation

**Implementer pass, 2026-09-12, branch `drag2/fin-review` from `c29707ef6`.** Implements the boundary recorded at `375a9c00e` against the round consolidated at `e618e5677`: the TE-D17 contract change, and the four remaining findings the design pass deliberately did not absorb. [`architect-test-execution-model-r4.md`](architect-test-execution-model-r4.md) §The handoff boundary after the review round is the work list; the superseded revisions and the challenge artefacts were not implemented against.

**Nothing here claims an identifier.** No heading opens with one, at any depth, and the local `TE-` names fall outside the local identifier grammar in any case (`repo:RD-1`).

**Boundaries kept.** `BROWSER_WORKERS` is untouched at two. Nothing of `repo:RD-2` — the workflow, the pinned image, the branch rule, the baseline-maintenance policy — is built here. No canonical id is assigned; the round's eleven results stay pending registration by the consolidator. Test watch is not reintroduced.

## What landed

| Change | Where |
| --- | --- |
| Supersession, bounded re-issue, response drop | `packages/vite-custom-element-assets/src/css/generation.ts` |
| Dependency set from the producing generation | the same file |
| Request ids scoped to the generation that issues them | the same file |
| The unreachable torn-down branch removed | `.scripts/vitest-one-shot.ts` |
| The browser UI dropped from the debug recipe | `.scripts/vitest-config.ts` |
| The generation chunk added to `clean.extras` | `packages/vite-custom-element-assets/files.json` |
| The declared interpreter matched to the syntax | `.scripts/zed-test.sh` |
| The `repo` scope made resolvable | `packages/drag2/.scripts/entry.ts`, `tests/ledger.ts` |

## An invalidation supersedes the request in flight (TE-D17)

`discardGeneration()` no longer routes through `fail()`. It clears `current` first — so the successor is what the superseded requests land in — detaches every pending request, and re-issues each one through the same `issue()` the first attempt used. The dying generation is then disposed: every request has moved or failed, so there is nothing left to drain, and an answer the dying worker still posts is dropped by the id lookup that no longer finds it.

Three consequences fall out of the shape rather than being added to it.

- **A request carries its own path and attempt count** instead of being a pair of callbacks closed over one generation, which is what makes a re-issue possible at all.
- **The dependency set comes from the generation that produced the code.** The resolve path reads the producing generation's own set rather than a lexical capture of the one the request started in, which is the interaction the design note flags: fixing the copy without fixing the source would have registered the wrong watch set. The copy itself is gone with it — its only caller iterates synchronously and drops the reference.
- **Request ids are generation-scoped.** A response is only ever matched inside the generation that issued it, so the counter belongs to the generation and not to the process.

**The bound is two attempts**, the contract's minimum: one supersession is always survivable, and the second rejects with an error naming concurrent invalidation. The message names no file and its stack points into the generation module rather than into a `.css.ts` the developer did not edit.

### Verification

**At the module boundary**, against the built artefact, on a fixture entry whose own module is rewritten mid-evaluation:

```
cold          : MARKER-A deps=43 ms=516
superseded    : MARKER-B deps=43 ms=496
marker file   : post-change (successor produced it)
deps carry the marker module: true
```

The superseded request resolves rather than rejecting, resolves with the **post-change** content, and its dependency set is the successor's. The bound:

```
two supersessions: REJECTED CSS evaluation superseded by concurrent invalidation 2 times
names a .css.ts   : false
stack points into a .css.ts: false
recovery after   : ok bytes=4762 deps=43 MARKER-A
```

**Through a real Vite dev server** on material-x's own configuration, with the change delivered by the server's own watcher — no manual event injection, and the delivery time observed by a second plugin so the overlap is measured rather than assumed:

```
dev warm         : MARKERA bytes=3666
dev after a save : MARKERB
dev overlap      : MARKERC resolved at 483 ms, invalidation delivered at 62 ms
  overlapped     : yes — the change landed inside the evaluation
dev next request : MARKERC
```

**Through a real Rolldown rebuild**, on an entry that reads one of its modules at link time and the other 400 ms later — the shape that tears a single entry's stylesheet — with the second change landing inside the rebuild's evaluation:

```
build 1 at  510 ms: M1A + M2A
build 2 at 1216 ms: M1C + M2C     ← the raced rebuild
build 3 at 1666 ms: M1C + M2C
```

The raced rebuild's artefact carries one generation's view of both modules, and carries it with no re-request behind it: build 2 is the artefact the race produced, read at its own `BUNDLE_END`. `M1B + M2C` is what the torn alternative reads as — the pre-change module the entry loaded at link time beside the post-change one it loaded late — and no arm of the shipped code produced it.

**Against the pre-change implementation**, same probes, the package rebuilt from `HEAD`'s source and restored afterwards:

```
rolldown : [plugin vite-construct-css-tokens] Error: CSS evaluation generation was discarded
dev server: Error: CSS evaluation generation was discarded
             at discardGeneration (…/generation-DrkXC8J5.js:105:45)
             at PluginContext.watchChange (…/index.js:238:51)
```

The rebuild fails on the save; in the dev server the rejection escapes the watcher callback and ends the process. Both arms pass on the shipped code.

### Two limits the probes measured, neither of them a contract change

**Rolldown's watcher does not deliver a change during a build.** Instrumented across three builds, every `watchChange` call arrives between `END` and the next `START`, never inside a build — a change written 250 ms into a 700 ms rebuild is delivered 470 ms later. So the race TE-D17 governs is not reachable from Rolldown's _own_ watcher; the delivery in the arm above is the one a co-tenant consumer makes, which is the ordinary case in this repository because three plugin instances share one process generation. The property is unchanged and the route to it is narrower than the design assumes.

**Supersession governs requests in flight and cannot govern one already answered.** An entry evaluated and resolved before the discard has already been handed to the consumer; a later entry evaluated after it reads post-change files. Within a build that mixture is corrected by the rebuild the same change triggers, and in the dev server by the re-request. This is what TE-D17 says — "every request **in flight** when its generation is discarded" — stated here because a fixture was built that mistakes the two, and its first reading looked like a failure of the mechanism.

## The one-shot reporter's dead branch is removed

`#released`, the set feeding it and the reuse throw are gone. The property they were credited with is satisfied by the `#consumed` check above them, which no module start can reach without having passed. Removing the only write to instance state left `#release` using none, so it is now a module-level `release()` — one call site, and the lint gate names the same fact.

## The debug recipe executes its tests again

`ui: isDebug` is removed. The UI nulls the viewport, Playwright rejects `deviceScaleFactor` against a null viewport, and the context is therefore never created; the UI is also unreachable behind the unconditional `headless: true`, so nothing is lost by dropping it and the pinned device scale that every raster depends on is kept. Debugging attaches to the CDP port, which the same recipe already opens.

**Demonstration 20 is discharged on evidence that distinguishes the behaviour from its failure.** `.scripts/zed-test.sh <file> "" debug` on a browser test:

```
Test Files  1 passed (1)     Tests  50 passed (50)
```

against `Tests no tests   Errors 1 error` with the UI restored by a single flag, reproduced here on the same file. With the port attached from a second process while the task runs:

```
CDP up after ~1s: Chrome/153.0.8010.36, ws://127.0.0.1:9222/devtools/browser/…
attached to: http://localhost:9876/__vitest_test__/?sessionId=…
Debugger.paused: reason=other at :7
```

— a breakpoint reached on the `debugger` statement of a probe test, the run then completing on its own. The probe test was removed afterwards.

## The remaining C-tier items

- **`clean.extras` covers the generation chunk.** `clean:build` now removes `generation-*.js` and its map; the three orphaned chunks the tree carried were swept by the first run of it, and the chunks the A/B arms above left behind by the next.
- **`zed-test.sh` declares `bash`**, which is what parses its hyphenated function names and what `.zed/tasks.json` has always invoked it with.
- **`repo:RD-1` resolves.** `SCOPES` gains a `repo` row carrying the record's root and its current-state document, and `documents()` is parameterised on both rather than hard-wired to one package. The three refusals stay distinguishable and `drag2` stays the first row, which is the example the unqualified-address hint offers. A case in `entry.node.test.ts` reads `repo:RD-1` back.

## Verification of the tree as a whole

- **The whole-repository run**, `npx just test` with the teardown log on, at a 5044 MiB container baseline: **2467 passed, 60 skipped, 2 failed**, 60.88 s, seven of seven providers released in the recorded boundary order, no `close timed out`, no `Failed to run the test`, no unhandled error, Chrome back to its baseline of 8.
- **Resources**, sampled at 1 Hz: peak `memory.current` 11 228 MiB, peak anonymous 9374 MiB — both under the 13 107 MiB working ceiling — `memory.events.oom_kill` **0**. Δ `memory.current` 6184 MiB and Δ anonymous 6052 MiB, which land **below** the reproduced pair the record makes the comparison (7356–7412 and 6618–6685). The interval is not attributed to any change landed here: this run is 6–10 s shorter than the two it is compared with and ran on a container 1.5–1.9 GiB higher at rest, and a 1 Hz sampler can miss a peak. It is recorded as a reading, not as an improvement.
- **Both failures are attributed away from this work.** `node/tproc`'s `TokenPackageProcessor` failure is the pre-existing one, outside this work by instruction. `node/drag2`'s `size.node.test.ts` failed at **5001 ms** against the 5 s default timeout and **passes alone in 1.51 s** — the contention timeout the implementation record already measured on this file under oversubscription, on a container now carrying a higher resting load. Neither file reaches the CSS generation module, the reporter or the browser options this pass touched.
- **Gates.** `just typecheck` over nine projects and the root configuration, `just fmt-check`, `just lint` and `just build` all pass.

## What is owed, and what is not claimed

- **The editor, demonstrations 13–15**, stay owner-executed and unobserved. No VS Code installation exists in this container.
- **How many supersessions a real `@ydinjs/tproc` rebuild produces** is still unmeasured, and it is the ground the design names for attacking the bound. One save delivers exactly one `watchChange` call — measured here, on a real dev server — so a bound of two survives a save; a rebuild writing 29 artefacts while an evaluation is in flight has not been driven.
- **The worker-bound experiment** is not taken, and the constant is unchanged.