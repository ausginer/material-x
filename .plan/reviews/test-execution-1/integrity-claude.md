# Integrity review — repository test-execution redesign

**Reviewer pass, 2026-09-11, branch `drag2/fin-review`.**
Files read at `7aeaff260bddebd729e93add39d110e4daa0944c` (the range under review is
`67af05288..7aeaff260`: `c1cab3031` implementation, `7aeaff260` post-implementation
reconciliation of the canonical contract). The working tree's actual `HEAD` at
review time was `28e2066c81993d814347112d1ab190ba166a3ad1` (one unrelated commit
later, "agents: disable subagent spawning for subagents"); that commit touches
none of the files in scope and does not affect anything below.

**Canonical contract**: `.plan/test-execution-1/architect-test-execution-model-r4.md`
at `7aeaff260`, cross-read against `.plan/test-execution-1/implementer-test-execution-model.md`.

## Scope

Package-coherence / integrity lens on the shipped result: whether neighbouring
flows, the public surface, documentation, and editor/CLI/script integrations
still agree with what the code now does, and with what the contract now claims.
I did not re-litigate the design's own mechanism choices (teardown primitive,
group-boundary trigger, CSS isolate architecture) — those are the subject of the
architect/implementer record itself and of a focused design challenge, not of
this pass. I read the full shipped diff, traced the group-assignment and
one-shot-guard code against the contract's required properties, and verified a
sample of the record's own source citations against the vitest/vite versions
actually installed in this tree.

**Method note (per the verification-boundary instruction).** I ran one real,
read-only `vitest run` (`packages/vite-traits-plugin`, a plugin-less node
project — 52 tests passed, matching the implementer's own reported count) to
confirm the carrier does not break an ordinary single-package run. This
produced no tracked-file changes (`git status` clean afterward). I did not
attempt to simulate a VS Code gesture, and did not modify any production code.
No mutation-capable or destructive experiment was run; the one live command was
a plain test invocation, not a write. See **Checkout state** at the end for the
`git status` confirmation.

## Findings

### integrity-1 — Tier C: a contract citation is off by one source line (evidentiary only, not behavioral)

**Current behavior / contract.** TE-D12 in
`.plan/test-execution-1/architect-test-execution-model-r4.md` cites the
orchestrator-release call as `cli-api.BK8pd4xc.js:2488` (for `provider.close()`)
and `:2492` (for `orchestrator.$close()`).

**Evidence.** In the vitest version actually installed in this tree
(`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js` — same hashed filename
the record cites, confirming it is reading the same build):

```
2488:  await Promise.all([...providers].map((provider) => provider.close()));
2492:  project.browser?.state.orchestrators.forEach((orchestrator) => {
2493:    orchestrator.$close();
```

`:2488` matches exactly. `:2492` is the `forEach` call that opens the loop;
`orchestrator.$close()` itself is one line later, at `:2493`.

**Why it is a problem.** Minor only — it is a one-line imprecision in the
record's own evidence trail, not a claim about repository behavior. The shipped
code (`.scripts/vitest-one-shot.ts`) calls `browser.provider.close()` and then
`orchestrator.$close()` for every orchestrator, which is the mechanism the
record specifies and which I independently confirmed exists at that shape in
the installed `@vitest/browser` pool-close code (`orchestrators = new Map()` at
`@vitest/browser/dist/index.js:2525`, consumed via `.forEach` in the pool's own
`close()`). No consumer of the contract reads the citation as a runtime
assertion, and the shipped mechanism matches the description regardless of the
off-by-one line number.

**Required property.** A citation into a vendored bundle should name the line
it means. Not required to be fixed as a condition of anything; recorded because
it was checked.

### integrity-2 — null result: `files.json` / `tsdown.config.ts` / `package.json` for the touched build-time package stay coherent

**Lens.** The task calls out `packages/material-x/files.json` by name for
Material-X components; this range adds no material-x component, but it does add
a new runtime entrypoint (`css/generation.ts`) to a different multi-entrypoint
package, `@ydinjs/vite-custom-element-assets`, which is exactly the class of
change that check exists to catch.

**Checked.** `packages/vite-custom-element-assets/files.json`'s `runtime` array,
`tsdown.config.ts`'s `entry` map, and the package's own `"files"` publish list
(`css` as a directory glob) all include/cover `css/generation.ts` consistently.
The two retired entrypoints from the old worker-per-entry mechanism
(`css-worker.ts`, `deps-tracker.ts`) are kept — correctly, since the new
generation-based worker still spawns them, just once per generation instead of
once per entry — and no stale entrypoint was left in `files.json` for code that
no longer exists. `@preact/signals-core` was removed from this package's
`dependencies` (and from `package-lock.json`'s corresponding entry); I confirmed
by grep that no file under `packages/vite-custom-element-assets/src` still
imports it. **No drift found.**

### integrity-3 — null result: `@preact/signals-core`'s removal from `vite-custom-element-assets` does not orphan anything, in or out of scope

**Lens.** `packages/material-x/src/**/tokens.ts` (many files, all outside this
range) import `@preact/signals-core` directly at the source level, but
`packages/material-x/package.json` has never declared it as a `dependency` —
this predates the reviewed range and the range does not touch that file. What
the range _does_ touch is the one other place in the workspace that declared
`@preact/signals-core`: `vite-custom-element-assets/package.json`, whose
`dependencies` entry is removed here because the refactor to a shared
generation (Sets instead of `@preact/signals-core` `signal`/`computed`) genuinely
stopped using it.

**Checked.** The root workspace `package.json` still lists
`@preact/signals-core` under its own `devDependencies` (unchanged by this
range), so local install/build/test resolution for material-x's source is
unaffected — the hoisted copy that satisfied the bare specifier before this
range still exists after it, from the same declaration as before. The
pre-existing gap in `material-x`'s own `dependencies` (a real question for a
package-coherence pass on material-x, since an external consumer installing
only the published `@ydinjs/material-x` would not get this transitive
dependency) is **not new, not touched, and not worsened by this range** — it is
out of scope for an integrity pass scoped to `67af05288..7aeaff260`. **No drift
attributable to this range.**

### integrity-4 — null result: no stale reference to the retired Nx test-orchestration or watch-mode machinery survives elsewhere in the tree

**Lens.** "Instruments that no longer instrument what they claim, scripts or
editor integrations left pointing at a retired path."

**Checked, each independently:**

- `nx.json`'s `targetDefaults` carries no `test` key and every
  `packages/*/project.json` carries no test-specific `dependsOn` — verified by
  parsing `nx.json` and reading every `project.json` under `packages/*`,
  confirming the contract's own claim that Nx never ordered tests.
- No `.github/workflows/*.yml` invokes `nx run-many -t test` or any test
  command at all (`docs.yml` is the only workflow, and it runs no tests).
- Every per-package `Justfile`'s `test` recipe is still the unchanged
  `vitest run -c vitest.config.ts {{ ARGS }}` (checked all seven:
  material-x, core, drag, drag2, box-quad, tproc, vite-traits-plugin).
- `.zed/tasks.json`'s `vitest` (non-debug) task runs `zed-test.sh`'s
  `run-vitest`, which calls `npm run test -- <file>` — i.e. the per-package
  `test` script, already one-shot; unaffected by this range and correctly so.
- No `.agents/docs/*`, `.claude/skills/*`, or `CONTRIBUTING.md` outside the two
  files this range edited (`test-architecture.md`,
  `.claude/skills/test-component/SKILL.md`) mentions watch mode, Continuous
  Run, or `--watch`, so there is nothing left describing the retired lifecycle
  elsewhere.
- The one hit for `nx run-many.*test` outside the reviewed range is inside
  `.claude/worktrees/agent-a4d0ec4ad722d3a16/Justfile` — a different agent's
  linked worktree, not a file this branch's tree carries at its own root, and
  outside the range under review.

**No drift found.**

### integrity-5 — null result: the group-assignment and one-shot-guard code satisfies the contract's required properties, traced structurally

**Lens.** "Architectural invariants the repository relies on... silently
redefined."

**Checked.** I read `assignGroupOrder` (`.scripts/vitest-config.ts`) and
`OneShotTestExecution`/`oneShotTestExecution` (`.scripts/vitest-one-shot.ts`) in
full and traced `createWorkspaceTestConfig`'s project list by hand: browser
projects appear in list order as `materialXBrowser(1), materialXSpec(2),
materialXVisual(3), coreBrowser(4), boxQuadBrowser(5), dragBrowser(6),
drag2Browser(7)`, with every non-browser project landing in the shared group
`8`. This reproduces exactly the teardown-log order both the architect and
implementer records report (`browser/material-x → spec/material-x →
visual/material-x → browser/core → browser/box-quad → browser/drag →
browser/drag2`), and the project-count arithmetic (`4+2+3+3+1+1+1=15`) matches
the "same 15 projects" claim in the `Justfile`'s own `test` recipe comment.
`browser.api.allowExec: true` is unchanged in `createBrowserTestConfig`,
consistent with TE-D16's disposition (kept, not turned off, because drag2's
`cdp()`-using suite depends on it). `closeBundle`'s unconditional firing, which
`packages/vite-custom-element-assets/src/index.ts` and
`css/generation.ts`'s reference counting depend on, is real:
`vite/dist/node/chunks/node.js:30185` calls
`hookParallel("closeBundle", ...)` with no environment/server gate, matching
the record's own citation exactly. I additionally ran the real carrier against
a plugin-less node project (`packages/vite-traits-plugin`) and it passed
cleanly with no behavioral surprise. **No drift found; the shipped mechanism
matches the contract at the sites I checked.**

### integrity-6 — null result: the VS Code verification boundary is stated honestly and matches the actual environment

**Lens.** The binding instruction to preserve the boundary and assess whether
the record states it honestly, without substituting a simulation for it.

**Checked.** `~/.vscode-server` does not exist in this container, and the
`code` binary on `PATH` self-reports "not installed." This matches what the
architect record (at multiple points, including the "Corrections to earlier
revisions" and "Readiness after implementation" sections) and the implementer
record both say plainly: no VS Code installation exists, `.vscode-server` is
absent, every extension-facing conclusion is source-derived, and
demonstrations 13–15 are named explicitly as owner-executed and undone. I found
no place in either document, or in `.vscode/settings.json`'s own change
(`vitest.watchOnStartup: false`), that claims an editor gesture was observed
rather than read from the bundled extension source. **No drift, and the record
does not overstate its own evidence here.**

## Checkout state

No tracked file was modified by this review. `git status --porcelain=2` at the
end of this pass shows only the untracked
`.plan/reviews/test-execution-1/` directory (this report and a sibling
`cleanup-claude.md` from a concurrent pass). The one live command I ran
(`vitest run` in `packages/vite-traits-plugin`) is read-only test execution and
left the tree clean, confirmed by `git status` immediately after. No worktree
or snapshot was needed because no mutation-capable or destructive experiment was
performed. No production code was changed.
