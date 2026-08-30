# Claude Code

Everything normative lives in the repository's durable instructions, imported here:

@AGENTS.md

What follows is specific to this harness and adds no convention of its own.

## LSP

Prefer LSP over grep for code-symbol tasks — definitions, references, types, call hierarchy. Grep is still right for plain-text and non-symbol searches.

The LSP plugin is a deferred tool and can be unavailable. At the start of any code task, load it via ToolSearch and try it. If it errors, re-probe once, then fall back to grep.

In every completion report, state both its availability and its actual use, with exactly one of:

- `LSP plugin - unavailable.`
- `LSP plugin - available; used: <operations and purpose>.`
- `LSP plugin - available; not used: <brief reason>.`

Do not report availability alone. For code-symbol work, an available-but-unused LSP requires an explicit reason.

## Skills

The task-scoped procedures listed in `AGENTS.md` are packaged as skills here: invoke them as `test-component`, `test-visual-contract` and `use-tokens-db` rather than reading the `SKILL.md` by hand. They apply even when a request does not name them.

## Sub-agents and teams

Use sub-agents for research and exploration that can run in parallel — investigating separate parts of the codebase at the same time, for instance.

Create an agent team only when the task has genuinely independent parallel work, such as migrating several components at once. Do not create teams for reviews, small changes, or work with sequential dependencies. A multi-lens review round is not an exception: its passes are parallel independent sub-agents that must not message each other, because a pass that sees another's findings stops being a second opinion.