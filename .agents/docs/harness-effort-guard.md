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

**That suite is checkout-bound by intent**, and so is `launcher.test.ts`. Both
read repository artifacts by a path relative to the plugin, so both fail if the
plugin directory is copied elsewhere. They assert things about _this_ checkout's
configuration rather than about the plugin in the abstract, so a relocated or
worktree-rooted run failing them is the expected result rather than a surprise.
Every other suite is self-contained and runs anywhere.

**The first session in a fresh clone is unguarded, and that is a bootstrap
prerequisite rather than a harmless window.** Registering the marketplace and
loading its plugins happen in that order across two starts: the first session
records the marketplace, and the next one loads the guard. Nothing stops an
owner dispatching `architect` or `implementer` in the first one — measured, and
the worker ran a tool call with no record at all — so the gap is not
self-limiting and must not be described as if it were.

`claude plugin marketplace add ./`, run once per machine, closes it: after it
the very next session is guarded. It records the marketplace in user settings as
an absolute path, leaving the checked-in project declaration untouched — so the
two coexist, and re-running the command is what fixes the user-scope entry if
the checkout ever moves. [`AGENTS.md`](../../AGENTS.md) §Before
dispatching a governed worker carries the rule as a resident instruction, and
[`README.md`](../../README.md) carries the command where a fresh checkout meets
it.

**A guarded session says so.** `Effort guard active` is startup context in every
session the guard loads into, including a roleless coordinator that has no level
to report. That line is what makes the prerequisite checkable rather than
remembered: its absence is the signal not to dispatch. The declaration form
cannot close the gap on its own — an inline manifest in settings reconciles over
two starts exactly as a directory source does, and normalises back to one.

**Loading is scoped to the repository root.** A session started in a
subdirectory does not read the project settings at all, so it loads no guard —
measured below. The coordinator opens the checkout root, which is what VS Code
does.

**A session that loads it any other way is unguarded**, and an unguarded session
is indistinguishable from a clean one in the transcript, because nothing is
watching. The log is what tells them apart: a role that acted and left no record
was not checked.

## A contaminated environment is a session-level refusal

`CLAUDE_CODE_EFFORT_LEVEL` outranks frontmatter for every subagent at once, so a
session that inherits it cannot satisfy any per-role effort contract. It is a
property of the session, not of whichever role is acting, and the guard treats it
that way: the check runs **before** the haiku exemption, so `agent-router` denies
too. The remedy is to remove the variable and start again. There is no repair, no
override, and no fallback to observing.

Denying the router is what makes this a gate rather than a report. Startup itself
cannot be refused — a `SessionStart` hook that returns `continue: false`, and one
that exits `2`, were both measured letting the session run — so the boundary is
the first tool call instead. Because the router may only dispatch, a denial there
prevents every worker from existing.

## The launcher is a diagnostic

[`.scripts/claude-role.sh`](../../.scripts/claude-role.sh) had two jobs: pinning
a role's declared `--effort` past the interactive main-thread defect, and loading
the guard through `--plugin-dir`. Under the dispatch model in
[`agent-workflow.md`](agent-workflow.md) §Dispatch the second is gone — the
checkout's own settings load the guard, the launcher no longer passes
`--plugin-dir`, and a test pins that it does not. Naming the plugin there too
would make the diagnostic a second loading mechanism, which is the one thing the
loading rule forbids.

**Its remaining reason, stated so the machinery it carries is accountable to
it:** running one effort-bearing role alone on a main thread, to reproduce that
role in isolation. That is the only context in which the main-thread `--agent`
effort defect still bites, and it is what the `resolve-role.ts` CLI, its exit
codes, the tab-separated root-and-level protocol and the launcher's own test
cases exist to serve. It is irrelevant to `agent-router`, which declares
`model: haiku` and so has no level to pin. The launcher still refuses to start
when `CLAUDE_CODE_EFFORT_LEVEL` is set; under the settled topology that refusal
is a convenience, because the guard denies the same session at its first tool
call whether or not the launcher started it.

If the diagnostic stops being run, this machinery has no other reason and should
go with it.

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
[`agent-workflow.md`](agent-workflow.md) §Dispatch. Each claim names the
instrument that carries it, and a claim the instrument does not carry is marked
rather than stated.

**The main session is a governed role by default, with no flag.** _Observation
log._ `.claude/settings.json` carries `agent: "agent-router"`, and a session
started at the checkout root **passing no `--agent`** wrote `SessionStart` and
`Stop` records carrying `agent_type: agent-router`, `resolution: exempt`,
`declared: null`, `allow`. This is the load-bearing one: without the setting an
ordinary session is roleless, which restores the full tool surface to the main
thread and puts it on the `no-role` branch — and that branch allows _before_ the
contaminated-environment gate. Exempt is governed and carrying no effort
obligation, not ungoverned: the main thread appears in the log like every other
role, which is what the trust claim needs of it.

**Normal dispatch under enforcement succeeds.** _Observation log._ The router
allowed as `exempt` at its `PreToolUse`, the `cleanup` worker it spawned recorded
`declared=medium, actual=medium, match` at `PreToolUse` and `SubagentStop`, and
the work came back. Every verdict in the run carries `enforced: true` with no
such variable exported by the invoking shell, which is also the witness that the
tracked `env` block reaches the hook.

**A contaminated session cannot dispatch.** _Observation log._ With
`CLAUDE_CODE_EFFORT_LEVEL=low` and enforcement on, the router's **first** tool
call denied with `poisoned-env` under `enforced: true`, and the run contains
**no `SubagentStart` record at all** — no worker came into existence. The same
prompt in a clean environment dispatched successfully, so the difference is the
variable and not the prompt.

**The router's tool allowlist is real, not advisory.** _Session transcripts._
Under a prompt that ordered it to invoke `Bash` and `Read` and not to refuse, a
session emitted **zero** `tool_use` blocks — both with `--agent agent-router` and
with no flag once the setting was in place — while the same prompt against a
roleless session emitted `Bash` and `Read`. Absent from the surface rather than
discouraged, and absent on the default path as well as the explicit one.

**A contaminated session cannot dispatch on the default path either.**
_Observation log._ With `CLAUDE_CODE_EFFORT_LEVEL=low`, no `--agent`, and
enforcement on, the router's first tool call denied with `poisoned-env` and the
run contains **zero `SubagentStart` records**.

**Scope limit, stated rather than substituted for.** Every session above was
driven through the CLI in print mode, which reads the same project
`.claude/settings.json` layer — that is what the `agent` key was observed to take
effect from. **The VS Code extension UI was not driven**, because a fresh
extension session cannot be started headlessly, and the explicit `--agent` probe
is not a stand-in for it. Note also that these probe records carry
`entrypoint: claude-vscode` **inherited from the environment that spawned them**;
that field does not establish which entrypoint ran, and should not be read as
though it did. The confirmation is one record: the next VS Code session's
`SessionStart` naming `agent_type: agent-router` with no flag passed.

**The worktree signal matches reality.** _Direct probe of `isLinkedWorktree`._
The checkout root answers `false`; three real linked worktrees on this machine
answer `true`. Refusal of dispatch from one is covered by unit tests, **not by a
live session** — a worktree that does not load the guard cannot be refused by it,
and that case is the documented gate's rather than the plugin's.

**A resumed worker is checked again.** _Observation log, earlier run._ A named
`cleanup` worker resumed with a second instruction produced a second
`SubagentStart`, `PreToolUse` and `SubagentStop` under **one `agent_id`**,
matching at each. This closes what §Measurements once carried as an open item.

**The haiku exemption holds through the normal path.** _Observation log, earlier
run._ An `Explore` worker resolved `exempt` and allowed at both its `PreToolUse`
events and its `SubagentStop`, reporting no effort at any of them.

**Subdirectory sessions load nothing.** _Marketplace registration state._ The
settings that register from the checkout root register nothing from
`packages/core`, with an absolute path as well as a relative one.

**Lifecycle events produce no verdicts.** _Observation log._ No `SessionStart` or
`SubagentStart` has emitted a verdict record. They carry no effort by contract,
and a path that cannot reach the decision table cannot fail it.

**Not observed, and not claimed:** `/effort` mid-session, manual and auto
`/compact`, whether a compacted session still reports its role and effort, and
dispatch refusal from a worktree in a live session.

## Enforcement is on

`.claude/settings.json` carries `env.HARNESS_EFFORT_GUARD_MODE = "enforce"`.
Enforcement is a property of the checkout rather than of an operator's shell:
two sessions on one commit cannot disagree about it, the setting is visible in a
diff, and the `env` block reaches the hook and outranks the invoking shell —
observed, `enforced: true` on every verdict of a session started with no such
variable exported. An untracked `.claude/settings.local.json` is a
higher-precedence layer, so a local opt-out remains possible; that is a
deliberate act with a file to point at rather than an inherited variable nobody
can see.

**What was exercised live before it was turned on**, all of it with the plugin
loaded from project settings and no `--plugin-dir` anywhere:

- an ordinary session loads the guard, and `agent-router` is recorded as a role
  — `resolution: exempt`, `declared: null` — rather than as a roleless thread;
- normal dispatch under enforcement succeeds: the router allowed as `exempt`,
  the `cleanup` worker it spawned `declared=medium, actual=medium, match`, and
  the work returned;
- a contaminated session denies at the router's **first** tool call, with
  `poisoned-env` under `enforced: true`, and **no `SubagentStart` record at
  all** — no worker came into existence;
- the three mutations that were previously invisible to the suite — dropping the
  mode condition, dropping the event condition, and deleting the `PreToolUse`
  hook block — each now fail tests.

**Every project role is accounted for.** `architect`, `consolidator`,
`implementer`, `reviewer`, `integrity`, `cleanup` and `der` declare an effort and
have been observed reaching it. `Explore` and `agent-router` declare
`model: haiku` and resolve `exempt`.

The verdict, resolver, CLI, launcher and installation paths carry `node:test`
cases; run them from the plugin directory with `node --test 'tests/*.test.ts'`.

**Still unobserved, and named rather than implied:** `/effort` mid-session,
manual and auto `/compact`, and whether a compacted session still reports its
role and effort. Each re-checks on the next tool call like any other, since the
guard holds no state, but none has been watched. A mistake here produces a
denied tool call, which is loud.

## Known limits of the exception

Both follow from keying the exception to a declaration, which is the only thing
the guard can read **at the point of decision**. `SessionStart` has been seen to
carry `model`; no effort-bearing event has. The narrow negative is what the
design needs and what the evidence supports — a fact unavailable at `PreToolUse`
is a fact no verdict can rest on.

- **An invocation that overrides a role's model is invisible.** No effort-bearing
  event names the acting model, so at the moment a verdict is reached there is
  nothing to hold a declaration against. A `model: haiku`
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

| Date       | Section                                               | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-06 | How it loads                                          | **Replaced:** _the launcher starts a managed role, pinning `--effort` and loading the guard through `--plugin-dir`._ Under the dispatch model no role runs on a main thread, and a VS Code coordinator passes no flags, so loading moved to a repository-local marketplace registered in project settings. The launcher is demoted to a diagnostic                                                                                                                                                                                                                                    |
| 2026-09-06 | Measurements                                          | **Added:** the acceptance set for the installed plugin — ordinary session loads it, coordinator stays `no-role`, a governed worker matches and keeps matching across a resume under one `agent_id`, the haiku exemption holds, a contaminated environment blocks a governed worker's tool call, and subdirectory sessions load nothing                                                                                                                                                                                                                                                |
| 2026-09-06 | Measurements                                          | **Retaken:** the model observation, on verdict records that now retain the field, across an `opus` role and a `haiku` one. The result is unchanged and the negative now covers the effort-bearing events. **Added:** one enforcing session, clean, with an exempt subagent inside it                                                                                                                                                                                                                                                                                                  |
| 2026-09-06 | Measurements                                          | **Corrected:** _the guard reads a `model` field on every event and records it whenever it is present, so the acting model is not observable at the decision point._ Only announcements recorded it; the effort-bearing events dropped a reported model, so the negative result was the instrument's shape and not the runtime's. Verdict records now carry the field and the question is open. The exception's keying is untouched — the launcher reads a declaration because it runs before any event exists                                                                         |
| 2026-09-06 | Before enforcement                                    | **Superseded:** _the model exception is designed and not yet implemented, and enforcement waits on the resolver, the decision and the launcher matching the decision table._ All four now match it                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-07 | A contaminated environment is a session-level refusal | **Superseded:** _an exempt role still allows under `CLAUDE_CODE_EFFORT_LEVEL`, because blocking it would report a session-wide fault at the one role that cannot cause or fix it._ The exempt role became the main session and the only actor that can dispatch, so denying it stops the fault at its source rather than at a bystander. The environment check now precedes the exemption. Record: [`owner-amendment-session-gate.md`](../../.plan/reviews/harness-guard-1/owner-amendment-session-gate.md)                                                                           |
| 2026-09-07 | How it loads                                          | **Added:** the observe/enforce mode is declared in the tracked `.claude/settings.json` `env` block, beside the install. Measured to outrank the invoking shell, so enforcement is a property of the checkout                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-07 | How it loads                                          | **Added:** governed dispatch happens only from the main checkout. A worktree may present an incomplete role set, which resolves as `out-of-domain` and allows, or a complete one from an older commit, which enforces a superseded contract                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-07 | Enforcement is on                                     | **Replaced:** _§Before enforcement — nothing outstanding blocks it._ Enforcement is on and declared in the tracked settings file; the section records what was exercised live before the flip rather than what remained to do (F-353, F-356)                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-07 | Loaded as an installed plugin                         | **Corrected:** two acceptance claims had no record in the log the section names as its instrument, and the text described a roleless coordinator the router boundary retired. Every claim now names its instrument, and the unobserved is listed as unobserved (F-353)                                                                                                                                                                                                                                                                                                                |
| 2026-09-07 | Known limits of the exception                         | **Narrowed:** _no event names the acting model, at the decision point or anywhere else._ `SessionStart` has been seen to carry it; the negative the design rests on is about effort-bearing events and is stated at that scope (F-360)                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-07 | The launcher is a diagnostic                          | **Amended:** it no longer passes `--plugin-dir`, so the stated loading rule is true of it, and a test pins that. Its one remaining reason — running a single effort-bearing role on a main thread — is stated, so the CLI and separator protocol are accountable to something current (F-357, F-366)                                                                                                                                                                                                                                                                                  |
| 2026-09-07 | How it loads                                          | **Added:** the two-start bootstrap is inferred from observed states rather than reproduced end to end (F-371). **Added:** the installation and launcher suites are checkout-bound by intent, so a relocated run failing them is expected (F-372)                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-07 | Loaded as an installed plugin                         | **Added:** `agent-router` is the tracked project default via the `agent` setting, so the main thread holds the role with no flag. Re-taken without `--agent`: the role, the tool restriction and the contaminated-session refusal all hold on the default path. The VS Code extension UI itself remains undriven and is named as a scope limit                                                                                                                                                                                                                                        |
| 2026-09-06 | Before enforcement                                    | **Withdrawn:** _every project-defined role must declare `effort:`, and `explore.md` cannot satisfy the invariant — either it moves to a model with effort support or it is retired in favour of the built-in `Explore`._ Both branches treated a missing declaration as a configuration mistake. Haiku falsifies the premise: it does not participate in the effort mechanism, so an effort contract there is one the runtime cannot satisfy, and the role needed no change. Replaced by a model-level exception — `model: haiku` roles are governed but outside the effort invariant |
