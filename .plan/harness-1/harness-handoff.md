# Handoff: parallel units in session slots, and the harness without its effort guard

**Recipient:** the implementer.

**Branch:** `repo/harness-1`, from `main` at `21392e738`. **Input:** the architect's commit that adds this file.

**When it starts.** Start after `repo/ci-speed-1` merges, and begin with `git merge origin/main`. That unit rewrites some of the same text, which is why: `AGENTS.md` §Evidence, `README.md`, `.claude/agents/implementer.md` and `der.md`, `.agents/docs/handoff.md`, and the devcontainer scripts. It is still changing them. Owner decision 2 is the alternative.

**Decided** by the owner, relayed by the coordinator on 2026-11-17:

1. **Parallel development** in worktrees, with stacked pull requests. The process may change.
2. **`.scripts/claude-role.sh` is removed.** The owner uses only `cl`.
3. **The effort guard is removed.**
4. **The `${VAR:?}` rule in `AGENTS.md` gets a counter-example.**

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-17`: slots, worktrees, stacks, and the index kept as one file;
- `repo:RD-18`: the guard and the launcher removed, and `cl` reading the effort.

The records hold the readings, the reasons and the alternatives weighed.

## Item 1. Remove the guard and the launcher (`RD-18`)

**Required:** `RD-18` property 1's list, removed in full.

**Rewritten:**

- **`AGENTS.md`:**
  - §Before running a governed role is deleted. Its one surviving rule moves to §Before you change anything tracked or to §Where things are: start a role session with `cl <profile>`, which selects the role and its declared effort.
  - The _"dispatch only from the main checkout"_ paragraph goes (`RD-17` property 4).
- **`CLAUDE.md` §Running a role:** the paragraphs on `claude-role.sh` and the guard go. What remains says that the owner starts each role session with `cl`, which passes the definition's effort, because `--agent` alone doesn't.
- **`README.md`:** the marketplace step and its sentence go.
- **`.agents/docs/coordinator-setup.md`:** §Start a guarded role becomes §Start a role session, describing `cl`, its slots, and the `CLAUDE_CODE_EFFORT_LEVEL` refusal. The `claude-role.sh` commands and the manual effort check go.
- **`.agents/docs/agent-workflow.md`:** the guard links go. Line 30's consolidator sentence names only its role definition.
- **`.agents/docs/coordinator.md` and `.claude/agents/coordinator.md`:** _"governed role"_ becomes _"role"_.
- **`.claude/agents/consolidator.md`:** its _"whether it is governed"_ goes. The no-`name`, no-`model` rule and its reason stay.
- **Other mentions:** any further mention that the witness search finds.

**`cl`** reads the effort as `RD-18` property 2 says.

**Witnesses:**

1. **The search.** This returns matches only under `.plan/` directories:

   ```sh
   git grep -nE 'effort guard|effort-guard|claude-role|harness-effort|HARNESS_EFFORT|governed role|Effort guard active|harness-orchestration'
   ```

   Save the output.

2. **Settings.** `.claude/settings.json` parses, and holds `enabledPlugins` with `typescript-lsp` only.
3. **Lint and format.** `just lint`, `just fmt-check` and `just typecheck` pass. Each removed allow-list name is shown unused: a `git grep` per name, outside `.plan/`, finds nothing.
4. **`cl` reads the level.** With a stub `claude` first on `PATH` that prints its arguments and its working directory, `cl architect` passes `--effort high` and `cl implementer` passes `--effort medium`.
   - A temporary copy of a definition with another `effort:` changes what `cl` passes.
   - A definition without `effort:` makes `cl` refuse, with a non-zero exit.
   - A set `CLAUDE_CODE_EFFORT_LEVEL` makes `cl` refuse.

   These are a test file, `.scripts/cl.node.test.ts`, run by the root node project.

## Item 2. Session slots and the parallel process (`RD-17`)

**Required:**

- **`cl`'s interface:** `cl [--init] <profile> [<slot>]`, per `RD-17` properties 1 to 3.
  - No slot gives today's names and the main checkout.
  - A slot outside `b`–`z` is a usage error (exit 64).
  - `--init` creates the session and `--resume` resumes it, as today, with the root and the name of the slot.
- **Documentation.** `.agents/docs/coordinator.md`, `coordinator-setup.md` and `agent-workflow.md` state `RD-17` properties 2, 4, 5 and 7:
  - the slot names;
  - `/clear` in place of renaming;
  - the main-slot architect as the only minter;
  - the stack procedure, with what a squash merge does to it;
  - several open units, with the coordinator's per-slot summary;
  - one open task per session.
- **The worktree limit** of `RD-17` property 8 goes in `coordinator-setup.md`.

**Witnesses:**

1. **`cl` in a scratch clone,** with the stub `claude` of item 1. These are cases in `.scripts/cl.node.test.ts`:
   - `cl implementer b` creates `.claude/worktrees/b`, detached at `origin/main`. It runs the stub there with `--agent implementer --effort medium --resume 'Mx Implementer B'`;
   - `--init` passes `--name` instead;
   - a second call reuses the worktree without touching it;
   - `cl implementer B` and `cl implementer bb` exit 64;
   - `cl coordinator` keeps `Mx Coordinator` in the main checkout.
2. **Tools in the main checkout ignore a slot.** With `.claude/worktrees/b` holding a checkout of this branch with its dependencies installed, read in the main checkout:
   - `just fmt-check`, `just lint` and `just typecheck`;
   - `vitest list --filesOnly`;
   - `nx show projects`.

   Each lists or reads nothing from `.claude/worktrees/`. Compare the counts with and without the slot.

3. **The stack procedure,** in a scratch repository: `main`, then branch `a` from `main`, then branch `b` from `a`.
   - Squash-merge `a` into `main`, then `git merge main` in `b`.
   - Record which hunks conflicted: one line that `a` changed and `b` changed again, and one line that only `a` changed.
   - Read that `git diff main...b` shows only `b`'s change after the merge.

   Save the transcript as `checks/stack-procedure.txt`. It is the example that the documentation cites.

4. **Session names per directory.** Read, without starting a role session, whether Claude Code keys `--resume <name>` by the session's directory, so that `Mx Implementer` in the main checkout and `Mx Implementer B` in slot b can't collide. Also read what `--resume` does when two sessions in one directory share a name. The documentation states the answer. If `--init` on an existing name would make `--resume` ambiguous, `cl --init` refuses when the CLI can tell; otherwise the documentation says that `--init` is run once per slot.

## Item 3. The `${VAR:?}` rule

`AGENTS.md` §Evidence currently says:

> **In a destructive shell command, expand every variable in a path with `${VAR:?}`**: `rm -rf "${S:?}/probe"`, not `rm -rf $S/probe`. An unset or empty variable then stops the command instead of turning the path into `/probe`.

**Append, in the same paragraph:**

> Check each variable where the path is assembled, not only the result. `d=$B/$1` followed by `rm -rf "${d:?}"` guards nothing: with `B` and `$1` empty, `d` is `/`. Write `d="${B:?}/${1:?}"`.

That is the whole change. The old wording is quoted above, as the record of what it said.

## Order

1. `git merge origin/main`, once `repo/ci-speed-1` has merged.
2. Item 3.
3. Item 1, with its witnesses.
4. Item 2, with its witnesses.
5. **The handoff's checks** on every changed file ([`handoff.md`](../../.agents/docs/handoff.md)):
   - format Markdown, YAML and JSON;
   - the TypeScript checks on `.scripts/cl.node.test.ts`;
   - shell-check `cl.sh` by reading it;
   - `git diff --check`;
   - the links in every changed document.
6. **The pull request** to `main`, non-draft, which the implementer may open. Its `verify` passes. Never merge it.

## Stops

Return to the architect with what you have if:

- anything outside `.claude/plugins/harness-effort-guard/` and the files listed in `RD-18` property 1 still loads, calls or tests the guard;
- a tool in the main checkout reads a slot's files, and no ignore entry that the tool already honours stops it;
- `--resume <name>` can't tell sessions in different directories apart;
- removing a camelcase allow-list name fails lint in a file that isn't the guard's.

## The report

Write `.plan/harness-1/harness-report.md`. It covers:

- per item, what changed, and the witnesses with their saved outputs;
- the search's output;
- the session-name reading;
- what wasn't verified.

## Owner decisions

1. **After the merge, on the owner's machine:** `claude plugin marketplace remove material-x`, and, optionally, removing the plugin's data directory. The repository can't do either. Until then, a session may report the missing marketplace.
2. **Timing.** The default is above: start after `repo/ci-speed-1` merges. The alternative is to stack this unit on `repo/ci-speed-1` now, with its pull request's base set to that branch. It would be `RD-17`'s first stack, at the cost of the squash conflicts `RD-17` property 5 describes, in exactly the files both units change. I recommend the default: the procedure gets its first use with two units that don't overlap.
3. **The slot letters** `b` to `z`, with no letter for the main slot. Replace them if another scheme suits the owner better.
4. **What removing the guard leaves unchecked,** which the owner accepted in deciding the removal: the consolidator's no-`name`, no-`model` lens rule and its lens set (`RD-18` property 3).

## Review before merge

A targeted feature-proof review reads the diff from the merge of `main` to the head. It covers:

- the search;
- `cl`'s test and its cases;
- `.claude/settings.json`;
- the documents against `RD-17` and `RD-18`.

It records at `.plan/reviews/harness-1/feature-proof-claude.md`, and the architect decides its findings.

**Stopping boundary:** the report is committed and pushed, and the pull request is open with `verify` green. The review follows.