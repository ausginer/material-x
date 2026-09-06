# Harness effort guard

> Retrieved when starting a managed role, or when changing a role's `model:` or `effort:`.

**Status: built, running in observe mode.** Enforcement is not switched on; one
prerequisite is outstanding, in [Before enforcement](#before-enforcement).

A role's frontmatter declares the reasoning effort it must run at, and
[`agent-workflow.md`](agent-workflow.md) §Agent configuration treats that as the
executable truth. The guard makes it one: it compares each acting role's
declared effort against the effective effort the runtime reports, and fails
closed when they disagree.

The plugin is [`.claude/plugins/harness-effort-guard/`](../../.claude/plugins/harness-effort-guard/);
its own [`README.md`](../../.claude/plugins/harness-effort-guard/README.md) is
the reference for the domain it governs, the decision table, the modes and the
log. What follows is how it is run here and what has been measured.

## Starting a managed role

```sh
.scripts/claude-role.sh architect
```

The launcher reads the role's declared effort from its definition, refuses if
`CLAUDE_CODE_EFFORT_LEVEL` is set, and starts Claude with `--agent`, a matching
`--effort`, and the `--plugin-dir` that loads the guard.

`--effort` rather than the environment variable: it sets the parent session's
effort while leaving each subagent's frontmatter free to override it.
`CLAUDE_CODE_EFFORT_LEVEL` flattens the whole tree to one level — measured
below.

**A session started any other way is unguarded**, and an unguarded session is
indistinguishable from a clean one in the transcript, because nothing is
watching. The log is what tells them apart: a role that acted and left no record
was not checked.

## Measurements

Claude Code 2.1.260, ambient effort `medium`.

**The main-thread bug is real.** `claude --agent architect`, whose definition
declares `high`, runs at `medium`; the same invocation with `--effort high` runs
at `high`. This is why the launcher exists.

**Subagent frontmatter is honoured, including from a lower parent.** A
`consolidator` parent at `medium` spawning `reviewer` and `integrity` produced
`medium`, `high` and `high` respectively — each role at its own declared level.

**A sonnet role reaches `high`.** `integrity` is `model: sonnet, effort: high`
and reported `high`, so the declared level is not capped by that model.

**`CLAUDE_CODE_EFFORT_LEVEL` flattens children.** With it set to `medium`, a
`reviewer` declaring `high` ran at `medium`. Per-role effort cannot be honoured
while it is present, which is why the launcher refuses to start at all.

**A text-only turn is caught, but only afterwards.** A turn that called no tool
never reached `PreToolUse`; `Stop` reported the wrong effort once the inference
had already happened. Tool actions fail closed; text-only turns can only be
invalidated retrospectively.

**Lifecycle events produce no verdicts.** Across every run above, no
`SessionStart` or `SubagentStart` emitted a verdict record. They carry no effort
by contract, and a path that cannot reach the decision table cannot fail it.

Not yet measured: `/effort` mid-session, manual and auto `/compact`, and resume.
Each re-checks on the next tool call like any other, since the guard holds no
state, but none has been observed.

## Before enforcement

Setting `HARNESS_EFFORT_GUARD_MODE=enforce` starts denying. One thing has to be
decided first.

**[`explore.md`](../../.claude/agents/explore.md) cannot satisfy the
invariant.** It declares no `effort:`, which denies; and it is `model: haiku`,
which reports no effort at all, so declaring one denies on the other row
instead. Both paths deny, and no measurement changes that. Either the role moves
to a model with effort support and declares a matching level, or it is retired
in favour of the built-in `Explore`, which is out of domain and therefore
ungoverned.

Every other project role — `architect`, `consolidator`, `implementer`,
`reviewer`, `integrity`, `cleanup`, `der` — declares an effort and has been
observed reaching it.
