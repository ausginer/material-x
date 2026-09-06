# Harness effort guard

> Retrieved when dispatching a role, or when changing a role's `model:` or `effort:`.

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

## How it loads

Nothing is passed on a command line. Three checked-in files make an ordinary
session load the guard, and they have to agree:

- [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) — a
  repository-local marketplace named `material-x`, declaring the plugin's
  directory in this checkout;
- [`.claude/settings.json`](../../.claude/settings.json) — registers that
  marketplace under `extraKnownMarketplaces` with a **relative** `directory`
  source, and enables `harness-effort-guard@material-x`;
- the plugin's own manifest, claiming the name the other two use.

A relative path is what makes the file portable: an absolute one is true of a
single machine, and a network source cannot be declared from project scope at
all — only user or managed settings can vouch for one. The
`installation.test.ts` cases hold the three files to each other, because a
disagreement between them does not fail loudly. The session simply starts
without the guard.

**The first session in a fresh clone is unguarded.** Registering the marketplace
and loading its plugins happen in that order across two starts: the first
session records the marketplace, and the next one loads the guard. `claude
plugin marketplace add ./`, run once, collapses that to zero — after it the very
next session is guarded. Either way the gap is one coordinator start, and a
coordinator is `no-role`.

**Loading is scoped to the repository root.** A session started in a
subdirectory does not read the project settings at all, so it loads no guard —
measured below. The coordinator opens the checkout root, which is what VS Code
does.

**A session that loads it any other way is unguarded**, and an unguarded session
is indistinguishable from a clean one in the transcript, because nothing is
watching. The log is what tells them apart: a role that acted and left no record
was not checked.

## The launcher is a diagnostic

[`.scripts/claude-role.sh`](../../.scripts/claude-role.sh) exists to work around
the interactive `--agent` effort bug by pinning `--effort` on a main thread, and
it also loaded the guard through `--plugin-dir`. Under the dispatch model in
[`agent-workflow.md`](agent-workflow.md) §Dispatch no role runs on a main
thread — roles are subagents of a plain coordinator, and their frontmatter
effort is honoured — so neither job is on the normal path.

It stays for reproducing one role in isolation, and it refuses to start when
`CLAUDE_CODE_EFFORT_LEVEL` is set. It is no longer how the guard is loaded, and
nothing about loading may depend on it.

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

### Loaded as an installed plugin

Taken on 2.1.263 with the plugin loaded from project settings and **no
`--plugin-dir` anywhere** — the acceptance set for the dispatch model in
[`agent-workflow.md`](agent-workflow.md) §Dispatch.

**An ordinary session loads it, and the coordinator is not governed.** A session
started in the checkout root with no `--agent` wrote `SessionStart` and `Stop`
records carrying no `agent_type`, `resolution: no-role`, `allow`. The plain
coordinator is outside the invariant, as intended, and is still recorded.

**A governed worker is checked, and a resumed one is checked again.** A
coordinator spawned a named `cleanup` worker and then resumed it with a second
instruction. The guard recorded `declared=medium, actual=medium, match` at the
worker's `PreToolUse` and at both its `SubagentStop` events — **under one
`agent_id` across the resume**, so the second generation of records belongs to
the same worker rather than a fresh one. Every coordinator turn in the same run
stayed `no-role`.

**The haiku exemption holds through the normal path.** An `Explore` worker
resolved `exempt` and allowed at both its `PreToolUse` events and its
`SubagentStop`, reporting no effort at any of them.

**A contaminated environment stops a governed worker acting.** With
`CLAUDE_CODE_EFFORT_LEVEL=low` and enforcement on, `cleanup` — which declares
`medium` — was reported by the runtime at `low`: the flattening is real and
observable. Its `PreToolUse` denied with `poisoned-env` and **the tool never
ran**; the worker reported the denial instead of output. The coordinator's own
turns were allowed as `no-role` throughout, so the denial lands on the role that
bears the invariant and not on the session.

**Subdirectory sessions load nothing.** The same settings that register the
marketplace from the checkout root register nothing from `packages/core`, with
an absolute path as well as a relative one. Project settings are not read from
below the root, so a session started there is unguarded.

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

The verdict, resolver, CLI, launcher and installation paths carry `node:test`
cases; run them from the plugin directory with `node --test 'tests/*.test.ts'`.

**Enforcement is still a deliberate flip, and it now has both results.** One
enforcing session ran clean, and one denied exactly what it should: a
contaminated environment stopped a governed worker's tool call while leaving the
coordinator alone. `/effort` mid-session, `/compact` and resume remain
unobserved. Turn it on and read the log; what a mistake there produces is a
denied tool call, which is loud.

## Known limits of the exception

Both follow from keying the exception to a declaration, which is the only thing
the guard can read: no event names the acting model, so a definition's `model:`
field is the whole of the available evidence.

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
| 2026-09-06 | How it loads       | **Replaced:** _the launcher starts a managed role, pinning `--effort` and loading the guard through `--plugin-dir`._ Under the dispatch model no role runs on a main thread, and a VS Code coordinator passes no flags, so loading moved to a repository-local marketplace registered in project settings. The launcher is demoted to a diagnostic                                                                                                                                                                                                                                    |
| 2026-09-06 | Measurements       | **Added:** the acceptance set for the installed plugin — ordinary session loads it, coordinator stays `no-role`, a governed worker matches and keeps matching across a resume under one `agent_id`, the haiku exemption holds, a contaminated environment blocks a governed worker's tool call, and subdirectory sessions load nothing                                                                                                                                                                                                                                                |
| 2026-09-06 | Measurements       | **Retaken:** the model observation, on verdict records that now retain the field, across an `opus` role and a `haiku` one. The result is unchanged and the negative now covers the effort-bearing events. **Added:** one enforcing session, clean, with an exempt subagent inside it                                                                                                                                                                                                                                                                                                  |
| 2026-09-06 | Measurements       | **Corrected:** _the guard reads a `model` field on every event and records it whenever it is present, so the acting model is not observable at the decision point._ Only announcements recorded it; the effort-bearing events dropped a reported model, so the negative result was the instrument's shape and not the runtime's. Verdict records now carry the field and the question is open. The exception's keying is untouched — the launcher reads a declaration because it runs before any event exists                                                                         |
| 2026-09-06 | Before enforcement | **Superseded:** _the model exception is designed and not yet implemented, and enforcement waits on the resolver, the decision and the launcher matching the decision table._ All four now match it                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-06 | Before enforcement | **Withdrawn:** _every project-defined role must declare `effort:`, and `explore.md` cannot satisfy the invariant — either it moves to a model with effort support or it is retired in favour of the built-in `Explore`._ Both branches treated a missing declaration as a configuration mistake. Haiku falsifies the premise: it does not participate in the effort mechanism, so an effort contract there is one the runtime cannot satisfy, and the role needed no change. Replaced by a model-level exception — `model: haiku` roles are governed but outside the effort invariant |
