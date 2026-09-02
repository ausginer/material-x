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