# Local coordination and role sessions

The owner talks in Russian with a local Codex coordinator. Start from [coordinator.md](coordinator.md) and [agent-workflow.md](agent-workflow.md), then recover the authorized goal and current state from the repository and git.

## Manual relay

1. Codex prepares one compact English prompt naming the recipient, input revision, governing records and completion boundary.
2. The owner transfers it to the appropriate standalone Claude role session.
3. The role records the substantive result in the repository, follows [handoff.md](handoff.md), and returns a short status, commit, record path and next action or blocker.
4. The owner relays the closing message to Codex. Codex checks the records and git state before preparing the next handoff.

Reuse a related architect or implementer session while its context is useful. Use fresh sessions for independent reviews and a fresh consolidator for a new round. A targeted follow-up is a recheck, not a fresh independent opinion. The consolidator manages only its own review passes; it does not run the next development phase. No automated Claude router is required.

## Start a guarded role

Start from the main checkout root. Follow [AGENTS.md](../../AGENTS.md) §Before running a governed role and [harness-effort-guard.md](harness-effort-guard.md) §Starting a role session. If startup context lacks `Effort guard active`, register the local marketplace and start a new Claude session before governed work:

```sh
claude plugin marketplace add ./
```

Select both role and effort. The launcher reads the declared level from the role definition and starts at the resolved checkout root:

```sh
.scripts/claude-role.sh architect
.scripts/claude-role.sh implementer
.scripts/claude-role.sh reviewer
.scripts/claude-role.sh consolidator
```

The equivalent manual command is `claude --agent <role> --effort <declared-level>`. The frontmatter in [.claude/agents/](../../.claude/agents/) is authoritative; `--agent` alone does not select its effort. Remove `CLAUDE_CODE_EFFORT_LEVEL` before starting. Do not disable enforcement or pass a second plugin-loading mechanism to work around a refusal.

[.scripts/cl.sh](../../.scripts/cl.sh) is an optional named-session convenience: `bash .scripts/cl.sh --init architect` creates a session and `bash .scripts/cl.sh architect` resumes it. Its supported profiles are reviewer, architect, implementer, consolidator, integrity, cleanup and der. It hardcodes their levels; check them against role frontmatter when configuration changes. Prefer the definition-reading launcher for fresh sessions.

An independent architecture challenge uses a fresh `architect` session with an explicit challenge prompt. There is no `challenger` launcher profile here. Limit the task to evidence probes and a review report; the authoring architect keeps decision authority. See [Architecture challenges](agent-workflow.md#architecture-challenges).

Dispatch nested workers only from the main checkout, with the guard active. Review lenses use the consolidator's unnamed subagent path, without model overrides, as its role definition requires. A linked worktree can host one worker but cannot dispatch.

This procedure describes the local relay. It does not install a Codex role, change Claude configuration, or establish that a live role session has passed the guard. That evidence comes from the session being used.