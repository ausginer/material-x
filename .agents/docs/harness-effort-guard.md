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

A role outside the effort invariant — one whose definition declares
`model: haiku` — starts the same way without `--effort`. The resolver reports it
as a role it resolved and no level to pin, which is a success rather than the
refusal an undeclared role gets: there is no level to pass, and passing one would
manufacture the very mismatch the guard exists to catch.

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

**Hooks do not report the acting model.** The guard reads a `model` field on
every event and records it whenever it is present; across every observation so
far, no record carries one — not even `SessionStart` and `SubagentStart`, which
ask for it explicitly. The model a role is running under is therefore not
observable at the decision point, and only the definition's own `model:` field
can be read.

**Lifecycle events produce no verdicts.** Across every run above, no
`SessionStart` or `SubagentStart` emitted a verdict record. They carry no effort
by contract, and a path that cannot reach the decision table cannot fail it.

Not yet measured: `/effort` mid-session, manual and auto `/compact`, and resume.
Each re-checks on the next tool call like any other, since the guard holds no
state, but none has been observed.

## Before enforcement

Setting `HARNESS_EFFORT_GUARD_MODE=enforce` starts denying. One thing has to be
built first.

**The model exception is designed and not yet implemented.** The guard as built
denies [`explore.md`](../../.claude/agents/explore.md) on both available paths —
it declares no `effort:`, and being `model: haiku` it reports none either — so
switching enforcement on today blocks a role that is behaving correctly. The
decision table in the plugin's [`README.md`](../../.claude/plugins/harness-effort-guard/README.md)
now places `model: haiku` roles outside the effort invariant while keeping them
inside the domain; enforcement waits on the resolver, the decision and the
launcher matching it.

Every other project role — `architect`, `consolidator`, `implementer`,
`reviewer`, `integrity`, `cleanup`, `der` — declares an effort and has been
observed reaching it.

Four things move, and the decision table is the specification for the first two:

- the resolver gains a fourth outcome for a definition declaring `model: haiku`,
  distinct from both `declared` and `undeclared`, and reports the
  `model: haiku`-plus-`effort:` combination as the configuration defect it is;
- the decision reads that outcome before the process-wide override check, and
  allows;
- the resolver's CLI reports an exempt role as a success carrying no level,
  keeping its existing non-zero exits for an unknown, duplicated or undeclared
  role — so the launcher still refuses the cases it refuses today;
- the launcher omits `--effort` for exactly that success, and passes it
  otherwise.

## Known limits of the exception

Both follow from the measurement above: the exception is keyed to a declaration,
because a declaration is the only thing the guard can read.

- **An invocation that overrides a role's model is invisible.** A `model: haiku`
  role spawned onto a model that does carry effort stays exempt and runs
  ungoverned; a role declaring an effort spawned onto `haiku` reports none and
  denies, and its fix is the invocation rather than the file — which is why the
  denial message names both.
- **A model gaining or losing effort support is a manual edit.** Nothing detects
  it. This is deliberate: inferring which models bear effort would mean keeping a
  second, silently drifting copy of the runtime's capability matrix, and the
  runtime gives the guard no reliable basis for one.

Recording, not enforcement, is what would surface either: an exempt role that
acts still appears in the log, so a divergence between the declared model and
observed behaviour is discoverable before it is enforced.

## Change record

What this document used to say, and what changed it.

| Date       | Section            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-06 | Before enforcement | **Withdrawn:** _every project-defined role must declare `effort:`, and `explore.md` cannot satisfy the invariant — either it moves to a model with effort support or it is retired in favour of the built-in `Explore`._ Both branches treated a missing declaration as a configuration mistake. Haiku falsifies the premise: it does not participate in the effort mechanism, so an effort contract there is one the runtime cannot satisfy, and the role needed no change. Replaced by a model-level exception — `model: haiku` roles are governed but outside the effort invariant |
