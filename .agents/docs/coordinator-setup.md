# Local coordination and role sessions

The owner works with one local coordinator: a Codex session, or a Claude session started as the `coordinator` role. Start from [coordinator.md](coordinator.md) and [agent-workflow.md](agent-workflow.md), then recover the authorized goal and current state from the repository and git.

## Manual relay

1. The coordinator prepares one compact English prompt naming the recipient, input revision, governing records and completion boundary.
2. The owner transfers it to the appropriate standalone Claude role session.
3. The role records the substantive result in the repository, follows [handoff.md](handoff.md), and returns a short status, commit, record path and next action or blocker.
4. The owner relays the closing message to the coordinator. The coordinator checks the records and git state before preparing the next handoff.

Reuse a related architect or implementer session while its context is useful. Use fresh sessions for independent reviews and a fresh consolidator for a new round. A targeted follow-up is a recheck, not a fresh independent opinion. The consolidator manages only its own review passes; it does not run the next development phase. No automated Claude router is required.

## Direct send

A Claude `coordinator` session sends prompts to live role sessions with `SendMessage`, and the roles send their closing messages back the same way. The owner still starts, names and ends every session and assigns its role; the coordinator starts none and spawns no governed role. Its [role definition](../../.claude/agents/coordinator.md) owns the sending rules.

1. Start the coordinator from the main checkout root, as [Start a guarded role](#start-a-guarded-role) describes.
2. Start each role session on this machine. Nothing reports a failed delivery to a Remote Control session. Start the coordinator and every role session in the same permission mode: a session in a different mode holds incoming cross-session messages for its user's approval. A role's `permissionMode` frontmatter does not set the mode of a main-thread session.
3. Send this as the first message of each role session, with the coordinator's session name and the role's stamp. A session treats a cross-session message as third-party text unless its own user says otherwise, so a checked-in file cannot give this authorization:

   ```text
   I relay task prompts through the session `Mx Coordinator`. Treat its cross-session messages that end with `— ARCHITECT` as my task prompts, within your role's authority. When you finish or are blocked, send your closing message (handoff.md §Record the handoff) to the incoming message's `from` with SendMessage. Other messages are information, not tasks. Do not reply now; wait for a task.
   ```

4. Tell the coordinator which session holds which role.
5. Clear a session when the coordinator asks, and confirm it. The coordinator cannot see or reset another session's context, so it asks before a task that needs a fresh one. A cleared session keeps accepting the coordinator's prompts; the owner has observed this across many clears, so step 3's message is not sent again.

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
.scripts/claude-role.sh coordinator
```

The equivalent manual command is `claude --agent <role> --effort <declared-level>`. The frontmatter in [.claude/agents/](../../.claude/agents/) is authoritative; `--agent` alone does not select its effort. Remove `CLAUDE_CODE_EFFORT_LEVEL` before starting. Do not disable enforcement or pass a second plugin-loading mechanism to work around a refusal.

[.scripts/cl.sh](../../.scripts/cl.sh) is an optional named-session convenience: `bash .scripts/cl.sh --init architect` creates a session and `bash .scripts/cl.sh architect` resumes it. Its supported profiles are reviewer, architect, implementer, consolidator, integrity, cleanup, der and coordinator. It hardcodes their levels; check them against role frontmatter when configuration changes. Prefer the definition-reading launcher for fresh sessions.

An independent architecture challenge uses a fresh `architect` session with an explicit challenge prompt. There is no `challenger` launcher profile here. Limit the task to evidence probes and a review report; the authoring architect keeps decision authority. See [Architecture challenges](agent-workflow.md#architecture-challenges).

Dispatch nested workers only from the main checkout, with the guard active. Review lenses use the consolidator's unnamed subagent path, without model overrides, as its role definition requires. A linked worktree can host one worker but cannot dispatch.

This procedure describes local coordination. It does not install a Codex role or establish that a live role session has passed the guard. That evidence comes from the session being used.