# Effort guard / B′ dispatch — integrity review

**Commit files were read at:** `dd3fc825ad6fc03a795334ae0ee6b44ff31f6d4c` (branch `drag2/fin-review`, working tree clean at review time).

**Scope covered:**

- Read `.agents/docs/harness-effort-guard.md`, `.agents/docs/agent-workflow.md`, `AGENTS.md`, `CLAUDE.md`, `README.md` diffs, and all `.claude/agents/*.md` frontmatter, cross-checking each doc's claims against the others and against the plugin source.
- Read `resolve-role.ts`, `guard.ts`, `verdict.ts`, `observe.ts`, `hooks/hooks.json`, `.claude-plugin/marketplace.json`, `.claude/settings.json`, `.scripts/claude-role.sh`, `installation.test.ts`, and the `.oxlintrc.json` addition.
- Verified role resolution behaviour (`resolveRole`/`findProjectRoot`) by reading the implementation directly rather than only the prose describing it.
- Verified project-root/worktree semantics against the **actual, currently-existing** worktree in this checkout, `.claude/worktrees/agent-a4d0ec4ad722d3a16` (tracked by `git worktree list`, on branch `worktree-agent-a4d0ec4ad722d3a16`, HEAD `a85fece7`), including diffing its `.claude/agents/` and `.claude/settings.json` against the current checkout's.
- Confirmed every project role's frontmatter (`architect`, `cleanup`, `consolidator`, `der`, `explore`, `implementer`, `integrity`, `reviewer`) against what `harness-effort-guard.md` claims about them.

**Scope not covered:**

- No live Claude Code session was started (guarded, unguarded, subdirectory, or worktree-rooted) to observe hook output directly — findings below rest on static evidence (file contents, code reading), not on reproducing the runtime's `PreToolUse`/`Stop` records myself. Where the documented measurements already cover a scenario (e.g. subagent frontmatter honoured from a lower parent, the haiku exemption, a contaminated environment denying a governed worker), I did not re-run them; I checked them for internal consistency only.
- VS Code extension-hosted specifics (as opposed to the CLI/session model described in the docs) were not independently verified beyond what the docs assert.
- Nested (2+ level) subagent chains beyond what `harness-effort-guard.md`'s own measurements exercise (one level: `architect → Explore`, `consolidator → reviewer/integrity`) were not tested; I found no claim in the docs that is contradicted at greater nesting depth, but I also have no positive evidence either way.
- Material X component surface / `packages/material-x/files.json` — not applicable; this change touches no Material X component.
- `.agents/docs/architecture.md` — not read; no finding here turns on an `@ydinjs` package architectural invariant, this being a harness/tooling change.

## Findings

### integrity-1 — `AGENTS.md`'s dispatch gate omits `consolidator`, which `harness-effort-guard.md` treats as governed

**Current behavior / contract:** `AGENTS.md` §"Before dispatching a governed worker" states the precondition (guard loaded, confirmed by seeing `Effort guard active`) and then closes with: _"This binds the dispatch of `architect`, `implementer`, `reviewer`, `integrity`, `cleanup` and `der`."_ — six roles, `consolidator` absent.

**Why it is a problem:** `.agents/docs/harness-effort-guard.md` §"Before enforcement" states the opposite membership: _"Every other project role — `architect`, `consolidator`, `implementer`, `reviewer`, `integrity`, `cleanup`, `der` — declares an effort and has been observed reaching it."_ — seven roles, `consolidator` included, in a sentence whose entire point is enumerating which roles the effort invariant governs. `.claude/agents/consolidator.md` frontmatter confirms it: `model: opus`, `effort: medium`, structurally identical to the six roles AGENTS.md does list — nothing distinguishes it as exempt or out-of-domain. The consolidator is dispatched by the same coordinator the gate is written for (`agent-workflow.md` §"Review round": _"The consolidator is the root console: it launches the passes"_ — something has to launch the consolidator itself, and per the dispatch model that is the plain coordinator). A coordinator that follows AGENTS.md's own checklist literally — checking the "Seen it / not seen it" gate only for the six named roles — has textual permission to dispatch a `consolidator` without ever having confirmed `Effort guard active`, even though `consolidator` sits inside the same invariant as the other six and can therefore run ungoverned exactly as the gate exists to prevent.

**Evidence:**

- `AGENTS.md` lines 32–33: ``This binds the dispatch of `architect`, `implementer`, `reviewer`, `integrity`, `cleanup` and `der`.``
- `.agents/docs/harness-effort-guard.md` lines 197–199: ``Every other project role — `architect`, `consolidator`, `implementer`, `reviewer`, `integrity`, `cleanup`, `der` — declares an effort and has been observed reaching it.``
- `.claude/agents/consolidator.md` frontmatter: `model: opus` / `effort: medium`.
- `grep -n "consolidator" AGENTS.md` returns no match at all — the word never appears in the resident instruction file that carries the dispatch gate.

**Required property:** the set of roles a resident dispatch gate names as bound by it must equal the set the plugin's own reference document (and the plugin's own decision table) treats as governed. Either `AGENTS.md`'s enumeration should include every role the guard actually governs, or the discrepancy needs a stated reason (e.g. if the consolidator is in fact dispatched some other way that already guarantees a guarded session, that reasoning is not present anywhere I read).

**Tier: B** — no runtime behaviour changes by itself, but a correct reader of the resident instruction file is misled about which roles the pre-dispatch check applies to, and the two checked-in documents disagree about a governed-role set that a downstream enforcement flip depends on being accurate.

### integrity-2 — the "run once per machine, closes it" bootstrap claim does not hold for this repository's own worktree topology

**Current behavior / contract:** `.agents/docs/harness-effort-guard.md` §"How it loads" describes the bootstrap fix as machine-scoped and unconditional: _"`claude plugin marketplace add ./`, run once per machine, closes it: after it the very next session is guarded."_ The loading model it documents is binary — "the repository root" (guarded once bootstrapped) versus "a subdirectory" (measured to load nothing, because project settings aren't read from below the root). Nothing in that document, in `agent-workflow.md` §Dispatch, or in `AGENTS.md` §"Before dispatching a governed worker" mentions a worktree (`grep -rn worktree` across `.agents/docs/*.md`, `AGENTS.md`, `CLAUDE.md`, `README.md` matches nothing but one unrelated `.plan` probe note).

**Why it is a problem:** a git worktree is not "a subdirectory" in the sense the doc measured — it is a distinct checkout root with its **own** `.claude/settings.json` and its own `.claude-plugin/`/`.claude/agents/` tree, frozen at whichever commit it was branched from. This repository has a real, currently-existing one: `.claude/worktrees/agent-a4d0ec4ad722d3a16`, tracked in `git worktree list`, on branch `worktree-agent-a4d0ec4ad722d3a16` at `a85fece7` (a `drag2` probe commit that predates this entire effort-guard change). Reading its own project settings directly:

```
.claude/worktrees/agent-a4d0ec4ad722d3a16/.claude/settings.json:
{
  "enabledPlugins": {
    "typescript-lsp@claude-plugins-official": true
  }
}
```

— no `harness-effort-guard@material-x` entry, and no `.claude-plugin/marketplace.json` file exists in that worktree at all. Its `.claude/agents/` is also a stale subset: `cleanup.md`, `consolidator.md`, `der.md` and `explore.md` don't exist there at all, and `architect.md`/`implementer.md`/`reviewer.md` differ in content from the current checkout's.

A session whose project root is that worktree (the natural way to resume or inspect isolated agent work — this is exactly what `EnterWorktree`'s `path` parameter and the `Agent` tool's `isolation: "worktree"` option exist to let someone do) would read _that_ settings.json, not the outer checkout's, and would load no guard at all, silently, with no `Effort guard active` line to warn a coordinator against dispatching there — precisely the failure mode the document itself calls out as indistinguishable from a clean session. The "run once per machine" framing implies the fix is durable and location-independent; it is not, because project-scope plugin enablement is sourced from the specific checkout's own settings file, and a worktree is a specific, separate checkout that this repository already has an instance of. Re-running `claude plugin marketplace add ./` from the outer checkout does not touch the worktree's tracked `.claude/settings.json`, so the worktree stays unguarded regardless of how many times the machine-level bootstrap step is repeated.

**Evidence:**

- `.agents/docs/harness-effort-guard.md` lines 41–56 (bootstrap paragraph) and lines 65–69 ("Loading is scoped to the repository root... measured below").
- `git worktree list` showing `.claude/worktrees/agent-a4d0ec4ad722d3a16` as a live worktree of this repository at `a85fece7`.
- Direct read of `.claude/worktrees/agent-a4d0ec4ad722d3a16/.claude/settings.json` (above) versus the current checkout's `.claude/settings.json`, which does carry the `harness-effort-guard@material-x` entry.
- `diff -rq` of the two `.claude/agents/` trees showing the worktree missing four of the eight current role definitions and differing on the other three.
- `grep -rn worktree` across the harness docs returning no hits.

I did not verify at runtime whether a session actually starting rooted at that worktree omits the `Effort guard active` announcement (that would require starting a fresh session there); the finding rests on the static fact that the settings/marketplace files it would read lack the entries the announcement depends on, which is what the plugin-loading mechanism the doc itself describes is keyed on.

**Required property:** a bootstrap or loading-model claim stated in absolute terms ("per machine", "the repository root" vs "a subdirectory") should either account for every kind of project root this repository's own tooling creates, or explicitly scope itself to exclude worktrees and say what a worktree-rooted session must do instead (e.g. re-run the bootstrap inside the worktree, or a statement that governed workers must never be dispatched into a worktree root at all).

**Tier: B** — no behaviour of the _reviewed_ change itself is wrong, but the guard is an instrument the repository is about to rely on for enforcement, and its own reference documentation makes a durability claim that a correct reader would take at face value and that a concrete, already-existing part of this repository's structure falsifies.

## Null-result note

Outside the two findings above, the change is internally coherent: every project role's frontmatter matches what `harness-effort-guard.md` claims for it (all eight declare `model`+`effort` except `explore.md`, which is `model: haiku` with no `effort:`, matching the documented exemption exactly); the three-file loading chain (`marketplace.json` → `.claude/settings.json` → plugin manifest) agrees with itself and is defended by `installation.test.ts`; the `.oxlintrc.json` addition is scoped to `.claude/plugins/*/tests/*.test.ts` only and does not touch existing package lint configuration; the README and `.scripts/claude-role.sh` demotion are consistent with the "diagnostic only" framing in `harness-effort-guard.md`. I found no drift in these areas beyond the two findings reported.
