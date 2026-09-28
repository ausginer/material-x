# Harness effort guard

> Retrieved when starting a role session, or when changing a role's `model:` or `effort:`.

**Status: built, enforcing.** The tracked settings carry `env.HARNESS_EFFORT_GUARD_MODE = "enforce"`, so a denial blocks the tool call — see [Enforcement is on](#enforcement-is-on).

A role's frontmatter declares the reasoning effort it must run at, and [`agent-workflow.md`](agent-workflow.md) §Agent configuration treats that as the executable truth. The guard makes it one: it compares each acting role's declared effort against the effective effort the runtime reports, and fails closed when they disagree.

**It asserts three properties of the role contract, and repairs none of them** — the governed identity a dispatch selected, the model the selected role declares where the runtime lets that be observed, and the effort it declares. Model and effort are independent, so a worker matching one and violating the other is still invalid. What identity means here, and why a child's is not simply the field the runtime reports, is [The role-contract trust boundary](#the-role-contract-trust-boundary) below.

It also asserts the **dispatch topology**: `consolidator` may bring into being only the review lenses its topology allows, and an out-of-domain substitute is refused before the child starts. That assertion is described in [Governed dispatch topology](#governed-dispatch-topology) below.

The plugin is [`.claude/plugins/harness-effort-guard/`](../../.claude/plugins/harness-effort-guard/); its own [`README.md`](../../.claude/plugins/harness-effort-guard/README.md) is the reference for the domain it governs, the decision table, the modes and the log. What follows is how it is run here and what has been measured.

## How it loads

Nothing is passed on a command line. Three checked-in files make an ordinary session load the guard, and they have to agree:

- [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) — a repository-local marketplace named `material-x`, declaring the plugin's directory in this checkout;
- [`.claude/settings.json`](../../.claude/settings.json) — registers that marketplace under `extraKnownMarketplaces` with a **relative** `directory` source, and enables `harness-effort-guard@material-x`;
- the plugin's own manifest, claiming the name the other two use.

A relative path is what makes the file portable: an absolute one is true of a single machine, and a network source cannot be declared from project scope at all — only user or managed settings can vouch for one. The `installation.test.ts` cases hold the three files to each other, because a disagreement between them does not fail loudly. The session simply starts without the guard.

**That suite is checkout-bound by intent**, and so is `launcher.test.ts`. Both read repository artifacts by a path relative to the plugin, so both fail if the plugin directory is copied elsewhere. They assert things about _this_ checkout's configuration rather than about the plugin in the abstract, so a relocated or worktree-rooted run failing them is the expected result rather than a surprise. Every other suite is self-contained and runs anywhere.

**The first session in a fresh clone is unguarded, and that is a bootstrap prerequisite rather than a harmless window.** Registering the marketplace and loading its plugins happen in that order across two starts: the first session records the marketplace, and the next one loads the guard. Nothing stops an owner running `architect` or `implementer` in the first one — measured, and the worker ran a tool call with no record at all — so the gap is not self-limiting and must not be described as if it were.

`claude plugin marketplace add ./`, run once per machine, closes it: after it the very next session is guarded. It records the marketplace in user settings as an absolute path, leaving the checked-in project declaration untouched — so the two coexist, and re-running the command is what fixes the user-scope entry if the checkout ever moves. [`AGENTS.md`](../../AGENTS.md) §Before running a governed role carries the rule as a resident instruction, and [`README.md`](../../README.md) carries the command where a fresh checkout meets it.

**A guarded session says so.** `Effort guard active` is startup context in every session the guard loads into, and it names the acting role's declared level when there is one. That line is what makes the prerequisite checkable rather than remembered: its absence is the signal not to start work. The declaration form cannot close the gap on its own — an inline manifest in settings reconciles over two starts exactly as a directory source does, and normalises back to one.

**Loading is scoped to the repository root.** A session started in a subdirectory does not read the project settings at all, so it loads no guard — measured below. A role session opens the checkout root, which is what VS Code does.

**A session that loads it any other way is unguarded**, and an unguarded session is indistinguishable from a clean one in the transcript, because nothing is watching. The log is what tells them apart: a role that acted and left no record was not checked.

## A contaminated environment is a session-level refusal

`CLAUDE_CODE_EFFORT_LEVEL` outranks frontmatter for every subagent at once, so a session that inherits it cannot satisfy any per-role effort contract. It is a property of the session, not of whichever role is acting, and the guard treats it that way: the check runs **before** the haiku exemption, so an exempt role denies too. Exempting the roles that carry no level would leave a contaminated session able to act through them while every role that does carry one is refused. The remedy is to remove the variable and start again. There is no repair, no override, and no fallback to observing.

Startup itself cannot be refused — a `SessionStart` hook that returns `continue: false`, and one that exits `2`, were both measured letting the session run — so the boundary is the first tool call instead.

## Starting a role session

Work is driven by **direct role sessions**: the owner starts one session per role — `architect` when architectural work is needed, `implementer` for settled implementation, a fresh `consolidator` for a review round, or a fresh `reviewer`, `integrity`, `cleanup` or `der` for a single lens — and coordinates them personally. Nothing routes between the owner's prompt and the role.

**The role and the effort are two separate selections, and the runtime applies only the first.** `--agent <role>` applies the definition's `model:` and does **not** apply its `effort:`; the session runs at whatever effort was already in force. So the owner selects the effort explicitly, and a session started without it is denied at its first governed tool call rather than reasoning cheaper than the role requires. That is the operating contract, measured on 2.1.263 in [Direct role sessions](#direct-role-sessions) below, and the guard is the assertion rather than the repair.

[`.scripts/claude-role.sh`](../../.scripts/claude-role.sh) does exactly the two selections and nothing else — it reads the declared level out of the definition and passes it — which is why it is the shortest reliable form:

```sh
.scripts/claude-role.sh architect      # → claude --agent architect --effort high
```

Its equivalent by hand is `claude --agent <role> --effort <the level that role's frontmatter declares>`. There is nothing else to it: the launcher is not an orchestration layer, holds no session state, and starts one role. It does not load the guard — the checkout's own settings do that, and it passes no `--plugin-dir`, which a test pins. Naming the plugin there would make it a second loading mechanism, which is the one thing the loading rule forbids. It also refuses to start when `CLAUDE_CODE_EFFORT_LEVEL` is set, which is a convenience: the guard denies the same session at its first tool call whether or not the launcher started it.

The `resolve-role.ts` CLI, its exit codes and the tab-separated root-and-level protocol exist to serve this path and no other.

## Measurements

Claude Code 2.1.260, ambient effort `medium`.

**A role session does not apply its own declared effort.** `claude --agent architect`, whose definition declares `high`, runs at `medium`; the same invocation with `--effort high` runs at `high`. Re-taken on 2.1.263 in [Direct role sessions](#direct-role-sessions), where it still holds and now holds in print mode too.

**Subagent frontmatter is honoured, including from a lower parent.** A `consolidator` parent at `medium` spawning `reviewer` and `integrity` produced `medium`, `high` and `high` respectively — each role at its own declared level.

**A sonnet role reaches `high`.** `integrity` is `model: sonnet, effort: high` and reported `high`, so the declared level is not capped by that model.

**`CLAUDE_CODE_EFFORT_LEVEL` flattens children.** With it set to `medium`, a `reviewer` declaring `high` ran at `medium`. Per-role effort cannot be honoured while it is present, which is why the launcher refuses to start at all.

**A text-only turn is caught, but only afterwards.** A turn that called no tool never reached `PreToolUse`; `Stop` reported the wrong effort once the inference had already happened. Tool actions fail closed; text-only turns can only be invalidated retrospectively.

**No event reports the acting model, the decision point included.** The earlier reading of this row was taken with an instrument that could not have produced one: `model` was recorded on announcements only, so `PreToolUse`, `Stop` and `SubagentStop` discarded a reported model rather than writing it down, and their silence was the log's shape rather than the runtime's.

Verdict records now carry the field and the observation was retaken on 2.1.263. Across a `SessionStart`, four `PreToolUse`, a `SubagentStart`, a `SubagentStop` and a `Stop`, spanning an `opus` role and a `haiku` one, **no record carries a model**. The negative stands, and now rests on the events that decide rather than on the two that never could.

It does not bear on how the exception is keyed. The launcher decides whether to pass `--effort` before the session exists, so it has no event to read and only the definition's own `model:` field to go on, whatever the runtime reports later. What the answer bears on is [Known limits](#known-limits-of-the-exception).

**An enforcing session runs clean, including a haiku subagent.** With `HARNESS_EFFORT_GUARD_MODE=enforce`, an `architect` parent spawning `Explore` produced seven records and no denial: `architect` matched `high` at every `PreToolUse` and at `Stop`, and `Explore` resolved `exempt` and allowed at both its `PreToolUse` and its `SubagentStop`, reporting no effort at either. That is the expected observation for a role outside the invariant, arriving from the runtime rather than from a fixture.

### Loaded as an installed plugin

Taken on 2.1.263 with the plugin loaded from project settings and **no `--plugin-dir` anywhere**. Each claim names the instrument that carries it, and a claim the instrument does not carry is marked rather than stated.

> **Four rows in this subsection were taken under the retired `agent-router` topology** and are kept as the record of what was observed, not as statements about the current harness: the main session is no longer a tracked default role, and no router exists to dispatch or to be denied. What they establish about the plugin — that project settings load it, that the tracked `env` block reaches the hook, that a contaminated session is refused at its first tool call, and that a `tools:` allowlist is real rather than advisory — is independent of who was acting. The current acceptance set is [Direct role sessions](#direct-role-sessions).

**The main session was a governed role by default, with no flag.** _Observation log, retired topology._ `.claude/settings.json` carried `agent: "agent-router"`, and a session started at the checkout root **passing no `--agent`** wrote `SessionStart` and `Stop` records carrying `agent_type: agent-router`, `resolution: exempt`, `declared: null`, `allow`. Exempt is governed and carrying no effort obligation, not ungoverned.

**Normal dispatch under enforcement succeeded.** _Observation log, retired topology._ The router allowed as `exempt` at its `PreToolUse`, the `cleanup` worker it spawned recorded `declared=medium, actual=medium, match` at `PreToolUse` and `SubagentStop`, and the work came back. Every verdict in the run carries `enforced: true` with no such variable exported by the invoking shell, which is also the witness that the tracked `env` block reaches the hook.

**A contaminated session could not dispatch.** _Observation log, retired topology._ With `CLAUDE_CODE_EFFORT_LEVEL=low` and enforcement on, the router's **first** tool call denied with `poisoned-env` under `enforced: true`, and the run contains **no `SubagentStart` record at all** — no worker came into existence. The same prompt in a clean environment dispatched successfully, so the difference is the variable and not the prompt. Re-taken with no `--agent` at all, the first tool call denied the same way and the run contains **zero `SubagentStart` records**.

**A `tools:` allowlist is real, not advisory.** _Session transcripts, retired topology._ Under a prompt that ordered it to invoke `Bash` and `Read` and not to refuse, a session running a role whose definition allowed neither emitted **zero** `tool_use` blocks — both with the role passed explicitly and with no flag once the setting was in place — while the same prompt against a roleless session emitted `Bash` and `Read`. Absent from the surface rather than discouraged.

**The worktree signal matches reality.** _Direct probe of `isLinkedWorktree`._ The checkout root answers `false`; three real linked worktrees on this machine answer `true`. Refusal of dispatch from one is covered by unit tests, **not by a live session** — a worktree that does not load the guard cannot be refused by it, and that case is the documented gate's rather than the plugin's.

**A resumed worker is checked again.** _Observation log, earlier run._ A named `cleanup` worker resumed with a second instruction produced a second `SubagentStart`, `PreToolUse` and `SubagentStop` under **one `agent_id`**, matching at each. This closes what §Measurements once carried as an open item.

**The haiku exemption holds through the normal path.** _Observation log, earlier run._ An `Explore` worker resolved `exempt` and allowed at both its `PreToolUse` events and its `SubagentStop`, reporting no effort at any of them.

**Subdirectory sessions load nothing.** _Marketplace registration state._ The settings that register from the checkout root register nothing from `packages/core`, with an absolute path as well as a relative one.

**Lifecycle events produce no verdicts.** _Observation log._ No `SessionStart` or `SubagentStart` has emitted a verdict record. They carry no effort by contract, and a path that cannot reach the decision table cannot fail it.

**Governed dispatch selects the governed role.** _Observation log, 2.1.263, enforcement on, two fresh CLI processes — the running session that edited the definitions is not evidence, since a changed role definition does not take effect in a session already running._ Taken under the retired router topology; the consolidator half is the part the current topology still asserts.

The consolidator path reaches depth 2: `PreToolUse` on the dispatcher with `dispatch_target: consolidator`; `SubagentStart consolidator, declared: medium`; `PreToolUse consolidator, dispatch_target: cleanup, declared=medium actual=medium, allow match`; `SubagentStart cleanup`; `SubagentStop cleanup, declared=medium actual=medium, allow match`. The lens was selected as the governed `cleanup` role rather than by name or by prose, and **no `general-purpose` record appears in the run at all** — which is the claim, since the earlier failure was legible only as such a record existing.

`dispatch_target` is what carries the claim. A denied dispatch leaves no `SubagentStart` to read the chosen role from, so the field is recorded on the verdict that decides rather than inferred from the child that followed.

**Not observed, and not claimed:** a live refusal of a topology escape — no dispatcher attempted one, and no prompt was written to make it, since a fixture that instructs a model to misbehave establishes the model's compliance rather than the guard's refusal. That refusal is covered by unit and end-to-end cases over the real payload shape, on the same footing as the worktree row. Also unobserved: `/effort` mid-session, manual and auto `/compact`, whether a compacted session still reports its role and effort, and dispatch refusal from a worktree in a live session.

### Direct role sessions

The acceptance set for the direct-session topology. Taken on 2.1.263 with the plugin loaded from project settings, enforcement on, no `--plugin-dir` and no tracked `agent` default, in an environment whose ambient effort is `medium`.

**`--agent` alone does not apply the role's declared effort, and the guard denies.** _Observation log, fresh CLI process._ `claude -p --agent architect`, with no `--effort` and no `CLAUDE_CODE_EFFORT_LEVEL`, wrote `SessionStart agent_type: architect, declared: high` and then `PreToolUse … declared: high, actual: medium, deny, cause: mismatch, enforced: true` on its first tool call, followed by the same verdict at `Stop`. The session held the role and ran at the ambient level.

This also **retires the earlier print-mode negative**: the defect was recorded as interactive-only, on the strength of a 2.1.260 reading in which `-p --agent integrity` reached its declared `high`. It no longer does. The defect is a property of `--agent`, not of the entrypoint, so nothing about the direct-session contract depends on which one the owner uses.

**The explicit selection is the whole repair.** _Observation log, fresh CLI process._ The same invocation with `--effort high` wrote `PreToolUse … declared: high, actual: high, allow, cause: match` and the same at `Stop`. One flag separates the two runs.

**A direct effort-bearing role session is seen and matched on tool-bearing events.** _Observation log._ The interactive session that made this change ran as `--agent implementer`: `SessionStart agent_type: implementer, model: claude-opus-5, declared: medium, resolution: declared`, then `PreToolUse … declared: medium, actual: medium, allow, cause: match, enforced: true, worktree: false` on every tool call in it. The role reaches the guard, and the verdict is a match rather than a `no-role` allow.

That session does not by itself separate _frontmatter honoured_ from _ambient level coincided_, because `implementer` declares `medium` and the ambient level is `medium`. The `architect` pair above is what separates them, and it separates them the other way: the level is the owner's selection, not the definition's.

### Governed worker identity

Taken on 2.1.263 with the plugin loaded from project settings, enforcement on, no `--plugin-dir`, in an interactive `implementer` session at ambient `medium`. The acceptance set for the role-contract repair. Each row names its instrument.

**A named child resolves its governed role from its own record.** _Observation log._ An `Explore` worker spawned with `name: identity-probe-one` produced `PreToolUse agent_type: identity-probe-one, governed_role: Explore, identity_source: agent-record, resolution: exempt, allow`. Before the repair the same worker resolved `out-of-domain`, which is an allow that asserts no invariant. The raw address and the resolved role appear as **separate fields** in every record, which is the second claim.

**Its announcement defers rather than guessing.** _Observation log._ The `SubagentStart` for that worker carries `identity_source: deferred`, no `governed_role`, and `resolution: no-role` — not the `out-of-domain` the address would have produced.

**An unnamed governed lens stays on the subagent path and is checked.** _ Observation log._ A `cleanup` worker spawned with no `name` produced `SubagentStart agent_type: cleanup`, then `PreToolUse governed_role: cleanup, identity_source: agent-record, declared: medium, actual: medium, allow, match` and the same at `SubagentStop`. Its record carries no model, and the verdict says `model_check: unverified` rather than claiming a pass.

**A wrong explicit model override is refused before the child starts.** _Interactive denial and observation log._ An `Agent` call with `subagent_type: cleanup, model: opus` was blocked at the dispatcher's `PreToolUse` with `deny, cause: dispatch-model`, naming the declared `sonnet` against the requested `opus`. The run contains **no `SubagentStart` for it** — no worker came into existence.

**A named lens reproduces the original failure, and is now refused.** _Observation log._ An `integrity` worker spawned with a `name` resolved `governed_role: integrity` from its record and produced `declared: high, actual: medium, deny, cause: mismatch` at its first tool call. That is the arcb defect reproduced live under this build — a lens declaring `high` running at the parent's `medium` — and it is the measurement the Review Swarm containment rests on. It denied rather than allowing, which is the acceptance result; nothing was retried or repaired.

**The teammate path honours the declared model and not the declared effort.** _Observation log, same run._ That `integrity` worker's record reported `model: sonnet`, matching its declaration, so `model_check: match` while the effort mismatched. The arcb round's four opus lenses are therefore attributable to the explicit `model: opus` on those dispatches — which is now refused — rather than to the spawn path. A runtime-model **mismatch** was consequently not reproducible live without an override the guard no longer permits, so that denial path rests on fixtures and on the arcb records rather than on a live observation, and is marked as such.

**`name` is not by itself the discriminator between the two spawn paths.** _Raw payload capture, fresh CLI process._ `claude -p` spawning `Explore` **with** `name: probe-carrier-one` produced a **subagent**-path worker: `agent_id` `ab9ce48a690e55328` with no address embedded, `agent_type: Explore`, and a record carrying `toolUseId` and no `customAgentType`. The architect's table reads `name` as selecting the teammate path; on this evidence print mode takes the subagent path regardless, and the interactive session above takes the teammate path with the same argument. The design does not depend on which trigger applies — it keys on `agent_id` and reads `customAgentType ?? agentType`, correct on both shapes — so nothing was adapted to this, and it is recorded because the trigger is not what the artifact says it is.

**No first-class role carrier exists in 2.1.263.** _Raw payload capture._ Across `PreToolUse`, `SubagentStart` and `SubagentStop`, the complete field sets are as the architect measured: no `subagent_type`, no `customAgentType`, no `agent_config`. This was re-checked rather than assumed, because such a field arriving would supersede the private record entirely.

## Enforcement is on

`.claude/settings.json` carries `env.HARNESS_EFFORT_GUARD_MODE = "enforce"`. Enforcement is a property of the checkout rather than of an operator's shell: two sessions on one commit cannot disagree about it, the setting is visible in a diff, and the `env` block reaches the hook and outranks the invoking shell — observed, `enforced: true` on every verdict of a session started with no such variable exported. An untracked `.claude/settings.local.json` is a higher-precedence layer, so a local opt-out remains possible; that is a deliberate act with a file to point at rather than an inherited variable nobody can see.

**What was exercised live before it was turned on**, all of it with the plugin loaded from project settings and no `--plugin-dir` anywhere:

- an ordinary session loads the guard, and the acting role is recorded as a role rather than as a roleless thread;
- normal dispatch under enforcement succeeds: the `cleanup` worker spawned by a dispatcher recorded `declared=medium, actual=medium, match`, and the work returned;
- a contaminated session denies at its **first** tool call, with `poisoned-env` under `enforced: true`, and **no `SubagentStart` record at all** — no worker came into existence;
- the three mutations that were previously invisible to the suite — dropping the mode condition, dropping the event condition, and deleting the `PreToolUse` hook block — each now fail tests.

**Every project role is accounted for.** `architect`, `consolidator`, `implementer`, `reviewer`, `integrity`, `cleanup` and `der` declare an effort and have been observed reaching it. `Explore` declares `model: haiku` and resolves `exempt`.

The verdict, resolver, CLI, launcher, topology and installation paths carry `node:test` cases; run them from the plugin directory with `node --test 'tests/*.test.ts'`.

**Still unobserved, and named rather than implied:** `/effort` mid-session, manual and auto `/compact`, and whether a compacted session still reports its role and effort. Each re-checks on the next tool call like any other, since the guard holds no state, but none has been watched. A mistake here produces a denied tool call, which is loud.

## Governed dispatch topology

**The failure this answers was observed, not anticipated.** A prompt addressed to `architect` produced a `general-purpose` child carrying a rewritten investigation prompt: the `SubagentStart` that followed the dispatching `PreToolUse` was `general-purpose`, and there was no `SubagentStart: architect` anywhere in the run. The generic child resolved `out-of-domain`, which is an **allow**, so no effort invariant applied to it and every record in the run says the session was clean.

That is the structure of the defect rather than an accident of it: **the effort table cannot see a substitution that leaves the domain the table governs.** A role prompt is the only other protection, and a prompt is advice to a model.

So the guard refuses it. One dispatcher is constrained and nothing else is: `consolidator` to its four lenses. It is the one place left where the topology requires a governed worker and a model chooses which — the owner selects every other role by starting its session. The plugin's own [`README.md`](../../.claude/plugins/harness-effort-guard/README.md) §Governed dispatch topology carries the decision table, the `name`-versus- `subagent_type` distinction and the reasoning about defaulted and absent fields.

**Narrow by construction.** Out-of-domain agents remain legitimate everywhere else: an architect delegating a search, an implementer spawning `Explore`. The assertion is about the one place where the topology requires a governed worker, and it is a topology assertion only — it repairs no state and manages no session, exactly as the effort behaviour beside it does not.

**The prose was ambiguous and is now mechanical.** The dispatcher prose named the worker and said nothing about the field that actually selects the role. `name` addresses a worker for a later resume; `subagent_type` decides what it is. [`consolidator.md`](../../.claude/agents/consolidator.md) now names the argument for each lens, because the two fields are independent and a call can carry one without the other. It also states what a lens launch must **not** carry — a `name`, whose spawn path the runtime does not yet govern, and a `model`, which the role declares for itself — and the guard refuses both at that boundary.

## The role-contract trust boundary

**A child worker's role identity currently rests on an undocumented Claude Code artifact, because the documented one stops carrying it.** The hooks reference defines `agent_type` as the agent's name and the sub-agents reference attaches that to the definition's frontmatter `name`. On the in-process teammate spawn path the field holds the worker's assigned runtime address instead — a value the documentation says it does not hold, and one the runtime silently rewrites when it collides. No hook payload carries `subagent_type`, `customAgentType`, `agent_config`, a parent agent id, or any identifier that joins a dispatching call to the child it produced. Re-checked against 2.1.263 by capturing raw payloads: `SubagentStart` carries eight fields, child `PreToolUse` eleven, and none of them is a role carrier.

So the governed role of a child is read from the runtime's per-agent record, keyed on the exact `agent_id` and located from the transcript path the payload supplies. **Main-thread roles are untouched** and continue to resolve directly from `agent_type`, which is what `--agent` gave them.

**The dependency is fail-closed, and that is the whole of what makes it acceptable.** A record that is missing, unreadable, malformed or names no role denies with `unresolved-identity`. There is no fallback to the reported `agent_type`: that fallback is the defect being closed, since an address resolves out-of-domain and out-of-domain is an allow. If Anthropic moves, renames or reshapes the record, governed child work stops immediately and one grep of the log says why — rather than silently returning to the ungoverned state.

**A child's identity may be deferred.** At `SubagentStart` the record does not exist yet; that event cannot deny, so identity is recorded as `deferred` rather than resolved from the address. The previous log asserted `out-of-domain` about workers that were in fact governed, which is the instrument stating a falsehood about the thing it exists to witness.

**Review Swarm workers must currently be unnamed.** A named spawn takes the teammate path, and that path has been observed not to honour the selected role's declared configuration — lenses declaring `high` running at the parent's `medium`, live and under this build. The guard understands named workers; the runtime does not yet run them as the role that was selected. The containment is enforced at the consolidator boundary and stated in [`consolidator.md`](../../.claude/agents/consolidator.md), and it is a compatibility measure with an expiry rather than a property of the design: named workers stay legitimate elsewhere, and a named governed _dispatcher_ must still resolve correctly, which is why child record resolution stands independently of it.

**The upstream defect has been reported** — that `agent_type` carries something the documentation says it does not, and that no hook carries the selected role. **A future first-class documented carrier should replace this compatibility layer.** Whoever next upgrades the runtime should re-check whether `subagent_type`, `customAgentType` or a verified `agent_config` field has arrived in the hook payloads; if one has and it names the selected role, it supersedes the private record and this layer should be withdrawn in its favour.

## Known limits of the exception

Both follow from keying the exception to a declaration, which is the only thing the guard can read **at the point of decision**. `SessionStart` has been seen to carry `model`; no effort-bearing event has. The narrow negative is what the design needs and what the evidence supports — a fact unavailable at `PreToolUse` is a fact no verdict can rest on.

- **An invocation that overrides a role's model is invisible to the _event_, and is now partly visible elsewhere.** No effort-bearing event names the acting model, so nothing at the moment of the verdict holds a declaration against a payload field. Two other points do. A spawning call's explicit `model` is refused at the parent's `PreToolUse` when it contradicts the selected role's declaration, before the worker exists. And a child's per-agent record exposes the effective model on the teammate shape, where it is compared and a disagreement denies. The subagent shape carries no model, and there the check is recorded as `unverified` rather than claimed — a main-thread session's model likewise remains unchecked at the decision point.
- **A model gaining or losing effort support is a manual edit.** Nothing detects it. This is deliberate: inferring which models bear effort would mean keeping a second, silently drifting copy of the runtime's capability matrix, and the runtime gives the guard no reliable basis for one.

Recording, not enforcement, is what would surface either: an exempt role that acts still appears in the log, so a divergence between the declared model and observed behaviour is discoverable before it is enforced.

## Change record

What this document used to say, and what changed it.

| Date | Section | Change |
| --- | --- | --- |
| 2026-09-06 | How it loads | **Replaced:** _the launcher starts a managed role, pinning `--effort` and loading the guard through `--plugin-dir`._ Under the dispatch model no role runs on a main thread, and a VS Code coordinator passes no flags, so loading moved to a repository-local marketplace registered in project settings. The launcher is demoted to a diagnostic |
| 2026-09-06 | Measurements | **Added:** the acceptance set for the installed plugin — ordinary session loads it, coordinator stays `no-role`, a governed worker matches and keeps matching across a resume under one `agent_id`, the haiku exemption holds, a contaminated environment blocks a governed worker's tool call, and subdirectory sessions load nothing |
| 2026-09-06 | Measurements | **Retaken:** the model observation, on verdict records that now retain the field, across an `opus` role and a `haiku` one. The result is unchanged and the negative now covers the effort-bearing events. **Added:** one enforcing session, clean, with an exempt subagent inside it |
| 2026-09-06 | Measurements | **Corrected:** _the guard reads a `model` field on every event and records it whenever it is present, so the acting model is not observable at the decision point._ Only announcements recorded it; the effort-bearing events dropped a reported model, so the negative result was the instrument's shape and not the runtime's. Verdict records now carry the field and the question is open. The exception's keying is untouched — the launcher reads a declaration because it runs before any event exists |
| 2026-09-06 | Before enforcement | **Superseded:** _the model exception is designed and not yet implemented, and enforcement waits on the resolver, the decision and the launcher matching the decision table._ All four now match it |
| 2026-09-07 | A contaminated environment is a session-level refusal | **Superseded:** _an exempt role still allows under `CLAUDE_CODE_EFFORT_LEVEL`, because blocking it would report a session-wide fault at the one role that cannot cause or fix it._ The exempt role became the main session and the only actor that can dispatch, so denying it stops the fault at its source rather than at a bystander. The environment check now precedes the exemption. Record: [`owner-amendment-session-gate.md`](../../.plan/reviews/harness-guard-1/owner-amendment-session-gate.md) |
| 2026-09-07 | How it loads | **Added:** the observe/enforce mode is declared in the tracked `.claude/settings.json` `env` block, beside the install. Measured to outrank the invoking shell, so enforcement is a property of the checkout |
| 2026-09-07 | How it loads | **Added:** governed dispatch happens only from the main checkout. A worktree may present an incomplete role set, which resolves as `out-of-domain` and allows, or a complete one from an older commit, which enforces a superseded contract |
| 2026-09-07 | Enforcement is on | **Replaced:** _§Before enforcement — nothing outstanding blocks it._ Enforcement is on and declared in the tracked settings file; the section records what was exercised live before the flip rather than what remained to do (F-353, F-356) |
| 2026-09-07 | Loaded as an installed plugin | **Corrected:** two acceptance claims had no record in the log the section names as its instrument, and the text described a roleless coordinator the router boundary retired. Every claim now names its instrument, and the unobserved is listed as unobserved (F-353) |
| 2026-09-07 | Known limits of the exception | **Narrowed:** _no event names the acting model, at the decision point or anywhere else._ `SessionStart` has been seen to carry it; the negative the design rests on is about effort-bearing events and is stated at that scope (F-360) |
| 2026-09-07 | The launcher is a diagnostic | **Amended:** it no longer passes `--plugin-dir`, so the stated loading rule is true of it, and a test pins that. Its one remaining reason — running a single effort-bearing role on a main thread — is stated, so the CLI and separator protocol are accountable to something current (F-357, F-366) |
| 2026-09-07 | How it loads | **Added:** the two-start bootstrap is inferred from observed states rather than reproduced end to end (F-371). **Added:** the installation and launcher suites are checkout-bound by intent, so a relocated run failing them is expected (F-372) |
| 2026-09-07 | Loaded as an installed plugin | **Added:** `agent-router` is the tracked project default via the `agent` setting, so the main thread holds the role with no flag. Re-taken without `--agent`: the role, the tool restriction and the contaminated-session refusal all hold on the default path. The VS Code extension UI itself remains undriven and is named as a scope limit |
| 2026-09-07 | Governed dispatch topology | **Added:** the guard asserts which roles `agent-router` and `consolidator` may spawn, and refuses an out-of-domain substitute before the child starts. Added because the effort table structurally cannot see that substitution — the generic child resolves `out-of-domain`, which allows. Record: [`owner-amendment-dispatch-topology.md`](../../.plan/reviews/harness-guard-1/owner-amendment-dispatch-topology.md) |
| 2026-09-07 | Loaded as an installed plugin | **Added:** the dispatch-selection acceptance set, taken from fresh processes — router → `architect` and router → `consolidator` → `cleanup`, each with `dispatch_target` on the deciding verdict and no `general-purpose` record in the run |
| 2026-09-07 | — | **Corrected:** the header claimed observe mode while the tracked settings had carried `enforce` since the flip, and pointed at a `Before enforcement` section that no longer existed. It names the enforcing status and links §Enforcement is on |
| 2026-09-07 | The launcher is a diagnostic | **Replaced by §Starting a role session.** `agent-router` is retired and no model-based layer sits between the owner's prompt and the role, so direct role sessions are the normal path again and the launcher is on it rather than beside it. Its two selections — the role and the level — are the whole procedure |
| 2026-09-07 | Direct role sessions | **Added:** the acceptance set for the direct-session topology on 2.1.263 — `--agent` alone runs at the ambient level and is denied `mismatch` at the first tool call, `--effort` matching the declaration allows, and a live `implementer` session is seen and matched on every tool-bearing event |
| 2026-09-07 | Measurements | **Withdrawn:** _the `--agent` effort defect does not reproduce in print mode._ Measured on 2.1.260; on 2.1.263 `-p --agent architect` runs at the ambient level. The defect belongs to `--agent` rather than to the entrypoint |
| 2026-09-07 | A contaminated environment is a session-level refusal | **Restated:** the exemption is read after the environment check because a contaminated session must not be able to act through whichever role carries no level — not because the exempt role was the only actor that could dispatch |
| 2026-09-07 | Governed dispatch topology | **Narrowed:** the map constrained `agent-router` and `consolidator`; with the router retired it constrains `consolidator` alone. The consolidator boundary is unchanged, and every case that asserted a generic property through the router now asserts it through the consolidator |
| 2026-09-07 | Loaded as an installed plugin | **Marked:** four rows were taken under the retired router topology and say so. What they establish about the plugin — settings loading, the tracked `env` block reaching the hook, a contaminated session refused at its first tool call, a `tools:` allowlist being real — does not depend on who was acting |
| 2026-09-08 | The role-contract trust boundary | **Added:** the harness asserts governed identity and model as well as effort. A child's role is read from Claude Code's undocumented per-agent record because hooks lose the selected role on the named teammate path; the dependency is fail-closed, main-thread roles are unchanged, and a documented carrier should supersede it. Evidence: [`architect-recommendation-worker-identity.md`](../../.plan/harness-guard-2/architect-recommendation-worker-identity.md) |
| 2026-09-08 | Governed worker identity | **Added:** the acceptance set for the repair — a named child resolved from its record, deferred `SubagentStart` identity, an unnamed lens checked on the subagent path, a wrong model override refused before the child starts, and a named lens reproducing the `high`-declared-at-`medium` failure and denying |
| 2026-09-08 | Governed worker identity | **Corrected against the architect artifact:** `name` alone does not select the teammate spawn path — a named print-mode spawn took the subagent path. The design keys on `agent_id` and the record's own shape, so it is unaffected; the trigger is recorded as measured rather than as described |
| 2026-09-08 | Known limits of the exception | **Narrowed:** _an invocation that overrides a role's model is invisible._ It is refused at dispatch when explicit, and checked at the child's events wherever the per-agent record exposes an effective model. What remains invisible is a main-thread session's model and the subagent record shape, which carries none |
| 2026-09-06 | Before enforcement | **Withdrawn:** _every project-defined role must declare `effort:`, and `explore.md` cannot satisfy the invariant — either it moves to a model with effort support or it is retired in favour of the built-in `Explore`._ Both branches treated a missing declaration as a configuration mistake. Haiku falsifies the premise: it does not participate in the effort mechanism, so an effort contract there is one the runtime cannot satisfy, and the role needed no change. Replaced by a model-level exception — `model: haiku` roles are governed but outside the effort invariant |