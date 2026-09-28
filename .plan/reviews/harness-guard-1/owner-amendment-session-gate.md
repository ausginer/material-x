# Owner amendment — the session gate, the mode's home, and worktrees

**2026-09-07.** Settles the architecture-facing remainder of `harness-guard-1` under the router boundary fixed in `d0dd0d44`, and incorporates an owner policy decision about `CLAUDE_CODE_EFFORT_LEVEL`. The worker hierarchy is unchanged: `agent-router` is the haiku main-session role, `architect` and `implementer` are resumable workers, `consolidator` and the review lenses are one-shot.

## What was measured

Two questions were probed against the live runtime rather than argued.

**A `SessionStart` hook cannot refuse startup.** Both supported shapes were tried. A hook emitting `{"continue": false, "stopReason": ...}` did not stop the session; a hook exiting `2` with a message on stderr did not stop it either. In both runs the hook is recorded as having executed and the session went on to answer normally. **There is no startup-termination mechanism to build on.**

**A tracked `env` block outranks the invoking shell.** `.claude/settings.json` `env` reaches the hook process, and when the shell exported one value while the settings file declared another, the hook saw the settings file's. This is exactly the property F-356 requires, and it needs no new code.

## Owner policy — `CLAUDE_CODE_EFFORT_LEVEL` is a session-level prohibition

A session that inherits the process-wide override cannot satisfy any per-role effort contract, because the variable outranks frontmatter for every subagent at once. It is therefore not a per-worker mismatch to be reported role by role. The remedy is to remove the variable and restart, and the guard offers no other: no repair, no override, no compensation, no downgrade to observation.

### This supersedes the exemption-ordering decision

The guard currently returns `allow` for an exempt role **before** testing the environment. That ordering was decided on the reasoning that denying an exempt role would report a session-wide fault at a role that can neither cause nor fix it. **Under the settled boundary that reasoning no longer holds:** the exempt role is now the session, and it is the only actor that can dispatch. Denying it is not reporting a fault at a bystander; it is stopping the fault at its source.

**The environment check precedes the exemption.** A poisoned session denies at `agent-router`'s first tool call, before any worker exists.

### Why this is the strongest available gate

Startup cannot be refused, so the boundary moves to the first action. It loses nothing, because of what `agent-router` is allowed to do. Its surface is `Agent`, `SendMessage` and `ListAgents` — dispatch and nothing else. **Denying its tool calls is therefore equivalent to refusing the session**: there is no other action left for it to take, and no worker can come into existence. A role with a general tool surface would have made this a partial gate; the allowlist is what makes it total.

Required properties:

1. A poisoned session denies at the router's first tool call, before any worker is spawned.
2. The denial states the remedy — remove the variable, restart — and offers no alternative path.
3. `SessionStart` still announces the condition. It cannot block, so it informs the one actor that reads model context, which under `d0dd0d44` is the party the announcement binds.
4. Worker-level `PreToolUse` denial is retained as defense-in-depth, for a worker reached by any route that skipped the router.

## F-356 — the mode's home is the tracked settings file

**Decision: an `env` block in `.claude/settings.json`,** beside the `enabledPlugins` entry that already installs the guard. Enforcement becomes a property of the checkout, which is the required property, and the measurement above shows it is not overridable by an operator's shell. Two sessions on the same commit can no longer disagree about whether the invariant is enforced.

The plugin stays generic. Whether _this_ repository enforces is repository policy, and it is now declared in the same tracked file that declares the install — one artifact, visible in a diff, reviewable in a pull request.

**Residual, stated rather than closed:** an untracked `.claude/settings.local.json` is a higher-precedence layer, so an operator can still opt out locally. That is acceptable and is not what the finding asked about — the finding asked that the default live in the checkout, and it now does. A local opt-out is a deliberate act with a file to point at, not an inherited shell variable nobody can see.

## F-361 — worktrees may not dispatch

The finding's facts were re-verified, and one was found that the round did not record.

`.claude/worktrees/agent-a4d0ec4ad722d3a16` holds **three** of the eight role definitions, no `.claude-plugin/` directory, and a settings file enabling only `typescript-lsp` — no marketplace, no guard. `/tmp/ql1-A` holds four role files. **`/tmp/wt-31ac5204` holds all eight — at commit `42f02c52`.**

That last one is the case worth naming, because it is worse than the one the finding describes. There are two failure shapes, not one:

- **An incomplete domain** resolves the missing roles as `out-of-domain` and allows them. Silent under-governance — the hazard as filed.
- **A complete but stale domain** resolves every role successfully and enforces a superseded generation of the contract. It looks exactly like a guarded session and is confidently wrong.

No per-worktree configuration fixes the second shape, because the defect is the commit the worktree is on rather than the settings it carries.

**Decision: governed dispatch happens only from the main checkout.** `agent-router` runs at the checkout root. A worktree-rooted session may run as an isolated single worker — that is what worktree isolation is for — but it is not the router and does not dispatch governed workers.

**Required property.** From a worktree root, either the same guard loads and resolves the same generation of the role set, or dispatch of a governed worker fails loudly. A silent `out-of-domain` allow is not an acceptable outcome of either shape. One signal is available and offered to implementation without prescribing its use: a linked worktree's root holds `.git` as a regular file, where the main checkout holds a directory.

## Routing

The architecture-facing findings are now settled: Q-23, Q-24, F-363, F-367 and the disposition of F-362 and F-366 in [the router-boundary amendment](owner-amendment-router-boundary.md); F-356 and F-361 here.

**Everything else in the round is a factual repair, and its mechanics belong to implementation, not to this document.** That includes the untrue observe-mode message, the acceptance claims unsupported by the log, the missing enforcement and event-set test coverage, the stdin crash ahead of the guard's own error handling, the dropped gate string, and the path-coupled assertions. Each carries its own required property in the round summary, and those properties are the brief; this amendment adds nothing to them and should not be read as having re-opened them.