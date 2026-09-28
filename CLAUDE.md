# Claude Code

@AGENTS.md

What follows is specific to this harness and adds no convention of its own.

## LSP

For code-symbol questions (definitions, references, types, call hierarchy), prefer LSP when it is available. If loading or using it fails, continue with another suitable tool and state what evidence supports the conclusion. Use text search for text and diff questions.

## Skills

The task-scoped procedures `AGENTS.md` names are packaged as skills here: invoke them as `test-component`, `test-visual-contract` and `use-tokens-db` rather than reading the `SKILL.md` by hand.

## Sub-agents and teams

Use sub-agents for research and exploration that can run in parallel — investigating separate parts of the codebase at the same time, for instance.

Create an agent team only when the task has genuinely independent parallel work, such as migrating several components at once. Do not create teams for reviews, small changes, or work with sequential dependencies.

## Running a role

**Each role is its own session, started by the owner.** There is no routing layer and no tracked main-thread default: one `architect` session when architectural work is needed, one `implementer` for settled implementation, a fresh `consolidator` for a review round, or a fresh `reviewer`, `integrity`, `cleanup` or `der` for a single lens. The owner coordinates them.

**The role and the effort are selected separately.** `--agent` applies the definition's model and not its `effort:`, so a session started with the flag alone runs at whatever effort was in force and the guard denies its first tool call. [`.scripts/claude-role.sh`](.scripts/claude-role.sh) makes both selections from the definition — `.scripts/claude-role.sh architect` — and by hand it is `claude --agent <role> --effort <the level that role declares>`.

Nothing watches a session's size or replaces it. A conversation is disposable and the repository carries continuity, so an owner ends a session at a commit or a closing phase and starts the next one.

The effort guard loads automatically from project settings when the session starts at the checkout root; it needs no flags. See [`harness-effort-guard.md`](.agents/docs/harness-effort-guard.md) §Starting a role session.