# Claude Code

@AGENTS.md

What follows is specific to this harness and adds no convention of its own.

## LSP

Prefer LSP over grep for code-symbol tasks — definitions, references, types, call hierarchy. Grep is still right for plain-text and non-symbol searches.

The LSP plugin is a deferred tool and can be unavailable. At the start of any code task, load it via ToolSearch and try it. If it errors, re-probe once, then fall back to grep.

State both its availability and its actual use in every completion report, with exactly one of:

- `LSP plugin - unavailable.`
- `LSP plugin - available; used: <operations and purpose>.`
- `LSP plugin - available; not used: <brief reason>.`

Availability alone is not a report. For code-symbol work, an available-but-unused LSP requires an explicit reason.

## Skills

The task-scoped procedures `AGENTS.md` names are packaged as skills here: invoke them as `test-component`, `test-visual-contract` and `use-tokens-db` rather than reading the `SKILL.md` by hand.

## Sub-agents and teams

Use sub-agents for research and exploration that can run in parallel — investigating separate parts of the codebase at the same time, for instance.

Create an agent team only when the task has genuinely independent parallel work, such as migrating several components at once. Do not create teams for reviews, small changes, or work with sequential dependencies.

## Dispatching roles

The main session is `agent-router` — selected by the tracked `agent` setting in
`.claude/settings.json`, so an ordinary session is it by default. A project role
declaring `model: haiku` and no `effort:`, whose whole tool surface is `Agent`,
`SendMessage` and `ListAgents`. It dispatches and relays; it holds no opinion about the work and
cannot read the repository. `architect` and `implementer` are spawned with a
`name` equal to the role and resumed by that name; `consolidator`, `reviewer`,
`integrity`, `cleanup` and `der` are spawned fresh every time. A worker's
conversation is disposable — the repository carries continuity — so retire and
respawn at a commit or a closing phase rather than compacting.
[`agent-workflow.md`](.agents/docs/agent-workflow.md) §Dispatch is the full
model.

The effort guard loads automatically from project settings when the session
starts at the checkout root; it needs no flags, and
[`.scripts/claude-role.sh`](.scripts/claude-role.sh) is now only a diagnostic
for reproducing one role in isolation. See
[`harness-effort-guard.md`](.agents/docs/harness-effort-guard.md).
