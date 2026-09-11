# Decision-elimination review — test execution model

**Read at `7aeaff260`** (files read and probes executed against the working tree
at that commit; the session's `HEAD` advanced to `28e2066c8`, an
`.claude/agents/` change that touches nothing in scope). Branch
`drag2/fin-review`. Range under review `67af05288..7aeaff260`.

**Lens.** Machinery and constraints whose original justification may no longer
hold, and the causal evidence either way. Not "is this machinery justified by the
code's present responsibility" — "is the historical reason for it still alive".

## Scope

**Primary input.** This work's record carries no `decisions` projection —
`npx just decisions` exists only in `packages/drag2/Justfile`
(`.scripts/decision-status.ts`), and `.plan/test-execution-1/` is a prose
register. The projection's two halves were reconstructed by hand from the
`TE-` register in `architect-test-execution-model-r4.md` §The local register and
from the superseding notes in revisions 2 and 3:

- **retired normative content**: TE-D2, TE-D4, TE-D5 (superseded in revision 3);
  TE-D9, TE-D10, TE-D11 (superseded in revision 4); TE-D3 as revision 1 stated
  it (reversed in revision 2); TE-D16's retirement inventory; the withdrawn
  halves of still-active statements — TE-D8's "loses `dependsOn: ["^build"]`",
  TE-F15's speed and applicability claims, TE-F23 reclassified by TE-F35,
  TE-F27's `watch: true` reading;
- **current machinery**: everything `c1cab3031` added or changed —
  `.scripts/vitest-one-shot.ts`, `.scripts/vitest-config.ts`, `Justfile`,
  `package.json`, `.vscode/settings.json`, `.scripts/zed-test.sh`,
  `packages/vite-custom-element-assets/src/css/{generation,css-worker,deps-tracker}.ts`,
  `src/index.ts`, `files.json`, `tsdown.config.ts` — plus the repository-wide
  search for fan-out-era workarounds named in the brief.

**Covered.** Both directions. Forward: each retired statement traced to what it
introduced and whether that survives in the tree. Backward: each mechanism the
range shipped traced to the statement it rests on and whether that statement's
condition still obtains. Executed probes: browser page-bound arms on
`browser/drag2`; non-browser group bound arms on all five node projects; the Zed
debug recipe at head and (by worktree bisection) at `67af05288`; a direct drive
of the one-shot reporter's hooks; the `clean:build` pathspec computation.

**Not covered.** Correctness of the CSS generation mechanism (dependency
attribution, `handleHotUpdate` invalidation, worker failure paths) beyond the
question of whose decision it rests on — I read it for provenance, not for
defects. The whole-repository run was **not** executed: the container's resting
baseline during this pass was 6344–7265 MiB inside a 16 384 MiB cap with sibling
review sessions running, so a root-run figure would have been uninterpretable
against the record's own numbers and risked an OOM kill of concurrent work.
No VS Code observation was attempted or simulated; demonstrations 13–15 stay
owner-executed, as the record requires.

## Findings

### Item der-1 — the browser page bound of 2 rests on a premise this range retired (Tier C)

**Finding.** `.scripts/vitest-config.ts:22`, `const BROWSER_WORKERS = 2`, new in
`c1cab3031`. The _existence_ of an explicit project-level bound is justified and
still is. The _value 2 rather than 4_ is not: its sole recorded ground is a
condition TE-D12 removes inside this same range.

**Current behavior / contract.** The shipped comment states the ground verbatim:
"Two, rather than four, because the editor cannot separate processes and the
root configuration is what it loads." That is TE-D3 as revision 2 restated it
(`architect-test-execution-model-reconciled.md:401`): _"Two is chosen over four
because the IDE cannot separate processes and the root config is what the editor
loads: 2 is the largest bound measured to keep whole-repo 'Run All Tests'
non-fatal (14 163 MiB, no OOM), where 4 is untested there and strictly worse."_
Revision 4 carries the value forward without re-deriving it — TE-D14 says only
"**The factory default**, TE-D3's explicit value. This, not the flag, is what
bounds the editor", and TE-F34 constrains the _non-browser_ bound's magnitude
while saying nothing about the browser bound's.

**Why it is a problem.** The 14 163 MiB whole-repo figure that selected 2 was
measured under retention: TE-F4 — "a Vitest process reuses but never releases a
browser project's resources" — with the consequence revision 2 spells out as
_"The floor is ≈8.8 GiB of run Δ at one page per project, because seven browser
projects are retained at ≈1.26 GiB each"_. That floor is what made the whole-repo
editor run an owner choice and what made a larger page count "strictly worse".
This range's TE-D12/TE-F33 release each provider at its group boundary; revision
4's own teardown log shows seven of seven released and Chrome back to its
baseline, and the shipped root run peaks at 11 671 MiB. The premise "seven
browser projects are retained simultaneously" no longer obtains at head, so the
comparison that ranked 4 below 2 no longer has its subject. Revision 2 had
already flagged the choice as the pass's own weakest point — _"TE-D3's value of 2
is chosen against an untested alternative. Bound 4 was never run against
whole-repo 'Run All Tests' … if 4 also completes, the per-package argument
favours 4."_ — and that test was never run, before or after the model changed
underneath it.

The cost is paid on every run of every browser project. Measured here on
`browser/drag2` (39 files, 861 passed, 60 skipped — identical in all four arms),
`--maxWorkers` applied through the factory's own CLI route:

| Bound       | Vitest-reported duration | Run 2   |
| ----------- | ------------------------ | ------- |
| 2 (shipped) | 15.26 s                  | 17.01 s |
| 4           | 12.33 s                  | 11.89 s |

**Evidence / reproduction.** From the repository root:
`MX_TEST_TEARDOWN_LOG=1 npx vitest run --project browser/drag2` and the same with
`--maxWorkers=4`, twice each. cgroup deltas were sampled at 1 Hz but are not
reported: sibling sessions moved the baseline 6344 → 7265 MiB across the four
arms and left Chromium behind between them, so only the duration column is sound
on this container. Provenance of the retired premise: `TE-F4` and its
consequence at `architect-test-execution-model-reconciled.md:420–440` and
§Owner choices; the supersession at `architect-test-execution-model-r3.md:68–69`
("TE-D4 (package process boundary → one process plus teardown)"); the absence of
any re-derivation in revision 4 (`grep -n "TE-D4\|TE-F4" r4` returns nothing).

**Required property.** The browser page bound's magnitude is justified by a
condition that obtains at head, or it is re-derived against the post-teardown
model. **This is routed, not concluded**: choosing a value is a design decision,
and the measurement that would settle it is the whole-repository run at bound 4
against the 13 107 MiB ceiling — which cannot be taken here, and which is the
same quiet-container remeasurement TE-F35 already owes for bound 2 (11 671 MiB
leaves ~11 % headroom, so a larger page count is not obviously free). The
finding is that the record currently carries a value whose only stated reason is
expired, and says nothing about that.

### Item der-2 — the Zed debug recipe cannot run a browser test, and demonstration 20 is claimed on it (Tier B)

**Finding.** `.scripts/zed-test.sh`'s `run-vitest-debug` — rewritten by this
range under TE-D16 — fails before any test executes, at head and at
`67af05288`. `DEBUG=1` sets `ui: isDebug` in `createBrowserTestConfig`; combined
with the unconditional `headless: true` and `contextOptions: { deviceScaleFactor: 1 }`,
Playwright raises `browser.newContext: "deviceScaleFactor" option is not
supported with null "viewport"` and the run reports "no tests".

**Current behavior / contract.** TE-D16's inventory rewrites this recipe to
`vitest run` and reasons at length about what a save during a paused debug
session would do. Demonstration 20 requires that the task "reaches a breakpoint
with the CDP port attached, and saving the file while paused does **not** start a
second execution", and revision 4 records demonstrations 16–25 as evidenced at
`c1cab3031`. The implementation record evidences only the weaker half — _"runs
the file and **exits on its own**, which a watch session would not do"_ — which
is satisfied vacuously here, because the run exits on the unhandled error.

**Why it is a problem.** The record asserts a working debug path that does not
work, and the assertion is what a reader would rely on before touching this
file. Two decisions in TE-D16 are argued from behaviour of that path — the
disposition "`vitest run`, not remove `--watch`", and the removal of the
`pkill -f 'vitest.*browser'` line with the sibling CDP-port `pkill` retained
"on its own justification". Neither is falsified by this, but neither was
observed on a path that reaches a browser.

**Evidence / reproduction.**
`cd packages/drag2 && DEBUG=1 ../../node_modules/.bin/vitest run -c vitest.config.ts --no-file-parallelism --test-timeout=0 tests/free-drag/anchor.browser.test.ts`
→ 1 unhandled error, "Tests no tests". Cause isolated by adding
`--browser.ui=false` to the identical command → **1 file, 15 tests passed**. Not
introduced by this range: the same command in the pre-range shape
(`--watch` instead of `run`) in a detached worktree at `67af05288` produces the
identical `deviceScaleFactor`/`null viewport` error, so `ui: isDebug` and the
`deviceScaleFactor` pin have been mutually exclusive since before the work
began. Both inputs are unchanged by `c1cab3031`
(`git show 67af05288:.scripts/vitest-config.ts`, lines 73–80).

**Required property.** Either the debug configuration produces a browser context
the provider will accept, or the record does not claim demonstration 20's
breakpoint half as discharged. Under `headless: true` — unconditional at head —
`ui: true` shows nobody a user interface, so its justification is the one to
examine first.

### Item der-3 — the torn-down-project guard is unreachable at head (Tier C)

**Finding.** `.scripts/vitest-one-shot.ts:55–69`, the `#released` set and the
`reused` check that raises `project "…" was torn down and cannot run again`,
cannot fire in any configuration this repository ships.

**Current behavior / contract.** TE-D12 requires it ("a run that would execute a
specification belonging to a marked project fails loudly"), and TE-D15 keeps it
explicitly as "defence in depth against the silent zero-module success TE-F11
produces". Its original cause belongs to revision 3's TE-D9, which tore down
browsers **while keeping watch** — a rerun into a torn-down project was then the
live failure mode. TE-D15/TE-D16 retired watch and made any second consuming
execution a loud failure, which removed that cause.

**Why it is a problem.** `#released` is populated only at `:169`, inside
`#release`, called only at `:141` from `onTestModuleStart` — reachable only
during a run that already set `#consumed = true` at `:100`. The `#consumed`
throw at `:49` precedes the `reused` check at `:58`. So `#released` non-empty
implies the earlier throw fires first. The record presents the guard as a second
line of defence without recording that nothing can reach it; a future reader
maintaining it has no way to test it.

**Evidence / reproduction.** Call-site enumeration above, plus a direct drive of
the reporter through its own plugin
(`oneShotTestExecution().configureVitest({ vitest })`, then
`onTestRunStart` → `onTestModuleStart` across a group boundary → `onTestRunStart`
again with the released project): the second run start raises
`this Vitest process has already executed a test run…`, never the torn-down
message. This agrees with the record's own fixture result at TE-D15 ("run 2 threw
`this Vitest process has already executed a test run`").

**Required property.** Machinery kept as defence in depth is either reachable, or
the record states that it is not and why it is retained anyway.

### Item der-4 — the new shared CSS chunk escapes `clean:build` (Tier C)

**Finding.** `c1cab3031` added `css/generation` to
`packages/vite-custom-element-assets/{files.json,tsdown.config.ts}` but did not
add `generation-*.js` / `generation-*.js.map` to `files.json`'s `clean.extras`,
where its siblings `format-*`, `transform-*` and `utils-*` are listed. The
build emits a content-hashed shared chunk at the package root
(`index.js` line 4 imports `./generation-DrkXC8J5.js`), and `clean:build` never
removes it.

**Why it is a problem.** One orphan accumulates per content change and is then
served to nothing. Three are present in the working tree already.

**Evidence / reproduction.**
`ls packages/vite-custom-element-assets/*.js` → `generation-CBgxwhsC.js`,
`generation-DrkXC8J5.js`, `generation-N3GXob-7.js` alongside a single
`format-*`, `transform-*` and `utils-*`. The pathspec set `clean:build` passes
to `git clean -fx` is computed and printed directly:
`packageFilesToCleanPathspecs(files.json)` →
`["css","format-*.js","format-*.js.map","index.d.ts","index.d.ts.map","index.js","index.js.map","transform-*.js","transform-*.js.map","utils-*.js","utils-*.js.map"]`
— no `generation-*`. `.scripts/package-files.ts:105–143`.

**Required property.** Every artefact a package's build emits is reachable by
that package's clean.

### Item der-5 — §CI policy still describes a gate that does not exist (Tier B)

**Finding.** `.agents/docs/test-architecture.md:148`: _"Every pull request gates
on: formatting, linting, typechecking; tproc node tests; behavior and
accessibility browser tests; spec-contract browser tests; the curated Chromium
visual suite."_ `.github/workflows/` contains exactly one workflow, `docs.yml`,
triggered on push to `main` and `workflow_dispatch`. No pull-request gate exists,
and line 96 ("The ordinary PR gate uses one pinned Chromium environment") rests
on the same non-existent thing.

**Why it is a problem.** This is the document every role is pointed at for test
policy, and the range added its §Run lifecycle section to it. Revision 2 named
this exact sentence and left it as an owner call for the implementing pass —
_"`.agents/docs/test-architecture.md` §CI policy describes a pull-request gate
that does not exist … whether to correct the CI-policy sentence in that pass is
the owner's call"_ — the implementing pass edited the file and did not resolve
it, and revision 4 does not carry the question forward. It is pre-existing and
is included because the decision to leave it was made in this work's own record.

**Evidence / reproduction.** `ls .github/workflows` → `docs.yml` only;
`grep -n "^on:" -A4 .github/workflows/docs.yml` → `push: branches: ['main']` and
`workflow_dispatch`.

**Required property.** The document states the gate that exists, or states that
none does.

## Null results

Each is stated from this lens — "the historical reason is gone" — and each was
established here, not taken from another pass or from the record.

- **The forward pass over TE-D2, TE-D4 and TE-D5 found no surviving machinery,
  because none was ever built.** TE-D2's CSS semaphore: `grep -rn semaphore`
  over `*.ts`/`*.json`/`*.sh`/`Justfile` outside `node_modules` and `.plan`
  returns nothing. TE-D4's "a package with more than one browser project runs
  them as separate, sequential Vitest processes": `packages/material-x/Justfile`
  at `67af05288` was already a single `vitest run -c vitest.config.ts`. TE-D5's
  `nx --parallel=1`: `nx.json` sets no `parallel` key. Supersession left nothing
  behind in all three cases.
- **No fan-out-era resource workaround survives.** The brief's list —
  memory mitigations, serialization guards, retry logic, timeout overrides,
  environment flags, CI steps — was searched directly:
  `grep -rn "max-old-space\|NODE_OPTIONS\|VITEST_MAX_WORKERS\|maxWorkers\|parallel\|testTimeout\|hookTimeout\|retry\|isolate"` over the same file set returns only
  `.scripts/vitest-config.ts`'s own live bounds, the debug recipe's
  `--no-file-parallelism --test-timeout=0`, and unrelated prose. `nx.json`'s
  `targetDefaults` has no `test` key, so TE-D8's deletion of the "build ordering
  is lost" consequence required no compensating machinery, and none was added:
  the root `test` recipe is a bare `vitest run` with no build step.
- **TE-D16's retirement inventory is fully discharged and nothing it retired
  survives.** `--watch` appears nowhere in `*.sh`/`*.json`/`*.ts`/`Justfile`
  outside `.plan` and the docs that describe its retirement; the
  `pkill -f 'vitest.*browser'` line is gone; `.vscode/settings.json` sets
  `vitest.watchOnStartup` false. The boundary the decision draws — build and
  development watch untouched — is honoured: `watchChange`/`handleHotUpdate`/
  `addWatchFile` in the CSS plugin serve dev rebuilds, which TE-D13 requires.
- **`browser.api.allowExec: true` keeps a live justification, verified at the
  call site rather than taken from the record.**
  `packages/drag2/tests/sortable/input-policy.browser.test.ts` imports `cdp`
  from `vitest/browser` at `:49` and calls it at `:148` and `:1332`. The
  capability is in use; the retirement of reruns is not a reason to remove it.
- **The `@preact/signals-core` removal is correctly scoped.** Dropped from
  `packages/vite-custom-element-assets/package.json`, still a root
  `devDependency` and still imported by ~20 `packages/material-x/src/**/tokens.ts`
  modules and by `tests/support/visual-contracts.node.ts`. Nothing dangles.
- **TE-F34's constraint on the non-browser group still has its cause, measured
  here.** The five node projects share one `groupOrder` and therefore one
  resolved bound. At `--maxWorkers=11` (`cores - 1` on this 12-core container):
  **5 failed / 590 passed, 53 files**, the four extra failures being
  `node/drag2`'s `tests/consumer.node.test.ts` (three tests) and
  `tests/bench/size.node.test.ts`, each `Test timed out in 5000ms` — the exact
  shape TE-F34 records. At the shipped bound: **1 failed / 594 passed**, the one
  failure being the pre-existing `node/tproc` `TokenPackageProcessor` case the
  brief excludes. The constraint is not a preference and is not stale.
- **The CSS-evaluation machinery's justification is intact.** The per-generation
  isolate, the resolved-URL tracker, the generation-scoped invalidation and the
  discard-on-evaluation-failure rule each trace to a live statement of TE-D13
  (respectively: freshness across a rebuilt `@ydinjs/tproc`; TE-F18; TE-F19;
  TE-F20). Nothing from the superseded TE-D10 survives in the tree — the
  tracker's two old filters and the per-entry `Worker` construction are both
  gone, and no virtual-id or `.styles.css` remapping machinery was ever built,
  so TE-F13's disappearance under the new mechanism leaves nothing to remove.

## Could not be established

- **Whether `.scripts/zed-test.sh`'s surviving `pkill -f 'chrome.*--remote-debugging-port=9222'`
  still has a cause.** TE-D16 asserts it "keeps its own justification"; that
  justification is an orphaned Chromium from an interrupted debug session, which
  one-shot execution does not by itself eliminate (Zed's task carries
  `allow_concurrent_runs: false`, so a re-run kills the previous process group).
  I attempted the direct test — start the debug recipe, `kill -9` its process
  group, count surviving Chromium on port 9222 — and it is void, because der-2
  means the run never gets past `newContext` and is already in teardown when the
  kill lands. Container-wide process counts were also polluted by sibling
  sessions. **What would settle it**: der-2 fixed first, then the same kill
  probe on a run actually paused at a breakpoint.
- **Whether the browser page bound can move from 2 to 4 within the ceiling.**
  Requires the whole-repository run at bound 4 with anonymous peak and
  `memory.current` peak reported against 13 107 MiB, on a container at a
  baseline comparable to the record's — i.e. the TE-F35 remeasurement, extended
  by one arm. Not takeable here (§Scope).
- **Whether the `css/generation` tsdown entry is needed at all.** `generation.ts`
  is imported only by `index.ts` and is not in the package's `exports`, and its
  own doc comment justifies anchoring `assets` on
  `import.meta.resolve('…/package.json')` by asserting the module "is bundled
  into whichever chunk its importers share" — which the entry declaration in the
  same commit contradicts. Either the entry or the anchoring is redundant;
  deciding which is a design call, and the observable consequence is der-4.

## Method boundaries observed

- Every mutation-capable probe ran in a detached worktree of my own at
  `/tmp/claude-1000/-workspaces-material-x/de3d7aa3-.../scratchpad/wt`
  (`git worktree add --detach … 67af05288`), removed at the end of the pass.
  All other probes were read-only invocations that write no tracked file:
  `vitest run` without `--update`, `node` scripts in the scratchpad, and
  `git`/`grep` reads.
- No production code was modified. The bound arms were driven through the
  factory's own `--maxWorkers` CLI route rather than by editing the constant.
- **Shared checkout verified at the end of the pass**: `git status --porcelain`
  in `/workspaces/material-x` reports exactly one entry,
  `?? .plan/reviews/test-execution-1/` — this report and the sibling pass's,
  both untracked. No tracked file was written. Nothing was committed or pushed.
- No VS Code behaviour was observed, simulated, or inferred from an API call
  standing in for an editor gesture. Demonstrations 13–15 remain owner-executed.
