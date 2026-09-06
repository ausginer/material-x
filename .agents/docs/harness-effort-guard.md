# Harness effort guard

> Retrieved when starting a managed role, or when changing a role's `model:` or `effort:`.

**Status: built, running in observe mode.** Enforcement is not switched on. The
prerequisite that held it back is met — see
[Before enforcement](#before-enforcement) — so what remains is the mode flip
itself.

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

**No event reports the acting model, the decision point included.** The earlier
reading of this row was taken with an instrument that could not have produced
one: `model` was recorded on announcements only, so `PreToolUse`, `Stop` and
`SubagentStop` discarded a reported model rather than writing it down, and their
silence was the log's shape rather than the runtime's.

Verdict records now carry the field and the observation was retaken on 2.1.263.
Across a `SessionStart`, four `PreToolUse`, a `SubagentStart`, a `SubagentStop`
and a `Stop`, spanning an `opus` role and a `haiku` one, **no record carries a
model**. The negative stands, and now rests on the events that decide rather than
on the two that never could.

It does not bear on how the exception is keyed. The launcher decides whether to
pass `--effort` before the session exists, so it has no event to read and only
the definition's own `model:` field to go on, whatever the runtime reports later.
What the answer bears on is [Known limits](#known-limits-of-the-exception).

**An enforcing session runs clean, including a haiku subagent.** With
`HARNESS_EFFORT_GUARD_MODE=enforce`, an `architect` parent spawning `Explore`
produced seven records and no denial: `architect` matched `high` at every
`PreToolUse` and at `Stop`, and `Explore` resolved `exempt` and allowed at both
its `PreToolUse` and its `SubagentStop`, reporting no effort at either. That is
the expected observation for a role outside the invariant, arriving from the
runtime rather than from a fixture.

**Lifecycle events produce no verdicts.** Across every run above, no
`SessionStart` or `SubagentStart` emitted a verdict record. They carry no effort
by contract, and a path that cannot reach the decision table cannot fail it.

Not yet measured: `/effort` mid-session, manual and auto `/compact`, and resume.
Each re-checks on the next tool call like any other, since the guard holds no
state, but none has been observed.

## Before enforcement

Setting `HARNESS_EFFORT_GUARD_MODE=enforce` starts denying. Nothing outstanding
blocks it.

**The model exception is implemented.** The guard previously denied
[`explore.md`](../../.claude/agents/explore.md) on both available paths — it
declares no `effort:`, and being `model: haiku` it reports none either — which
would have blocked a role behaving exactly as designed. It now resolves as
`exempt`: a governed role the effort invariant does not reach, allowed on its own
row of the decision table in the plugin's
[`README.md`](../../.claude/plugins/harness-effort-guard/README.md), and recorded
as `exempt` rather than passed off as out-of-domain. A `model: haiku` definition
that also declares an `effort:` raises, and so denies — the file states a level
the runtime will never report.

Every other project role — `architect`, `consolidator`, `implementer`,
`reviewer`, `integrity`, `cleanup`, `der` — declares an effort and has been
observed reaching it.

The verdict, resolver, CLI and launcher paths carry `node:test` cases; run them
from the plugin directory with `node --test 'tests/*.test.ts'`.

**Enforcement has been run once, and is still a deliberate flip.** The enforcing
session above completed without a denial, but `/effort` mid-session, `/compact`
and resume remain unobserved. Turn it on and read the log; what a mistake there
produces is a denied tool call, which is loud.

## Known limits of the exception

Both follow from keying the exception to a declaration, which the launcher
leaves no choice about: it decides before the session exists, so a declaration is
the only thing there is to read.

- **An invocation that overrides a role's model is invisible.** The retaken
  measurement above closes the door it might have opened: no event names the
  acting model, at the decision point or anywhere else, so there is nothing to
  hold a declaration against. A `model: haiku`
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
| 2026-09-06 | Measurements       | **Retaken:** the model observation, on verdict records that now retain the field, across an `opus` role and a `haiku` one. The result is unchanged and the negative now covers the effort-bearing events. **Added:** one enforcing session, clean, with an exempt subagent inside it                                                                                                                                                                                                                                                                                                  |
| 2026-09-06 | Measurements       | **Corrected:** _the guard reads a `model` field on every event and records it whenever it is present, so the acting model is not observable at the decision point._ Only announcements recorded it; the effort-bearing events dropped a reported model, so the negative result was the instrument's shape and not the runtime's. Verdict records now carry the field and the question is open. The exception's keying is untouched — the launcher reads a declaration because it runs before any event exists                                                                         |
| 2026-09-06 | Before enforcement | **Superseded:** _the model exception is designed and not yet implemented, and enforcement waits on the resolver, the decision and the launcher matching the decision table._ All four now match it                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-06 | Before enforcement | **Withdrawn:** _every project-defined role must declare `effort:`, and `explore.md` cannot satisfy the invariant — either it moves to a model with effort support or it is retired in favour of the built-in `Explore`._ Both branches treated a missing declaration as a configuration mistake. Haiku falsifies the premise: it does not participate in the effort mechanism, so an effort contract there is one the runtime cannot satisfy, and the role needed no change. Replaced by a model-level exception — `model: haiku` roles are governed but outside the effort invariant |
