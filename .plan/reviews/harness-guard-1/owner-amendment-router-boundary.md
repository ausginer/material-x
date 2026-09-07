# Owner amendment — the agent-router boundary

**2026-09-07.** An owner-level topology correction taken after `harness-guard-1`
consolidated, and before its findings are settled. It changes one boundary: the
Claude Code main session stops being roleless and becomes a dedicated
`agent-router` project role declaring literal `model: haiku`, and therefore
carrying no effort invariant under the existing exemption.

It is a correction to the boundary, not to the worker hierarchy, which is
unchanged.

## The three layers

The word _coordinator_ was carrying two jobs. It is retired in favour of naming
each layer:

| Layer                  | What it is                                                    | Governed                                         |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Owner-side coordinator | the person, and whatever they think with                      | outside the system                               |
| `agent-router`         | the Claude Code main session                                  | a project role; exempt from the effort invariant |
| Workers                | `architect`, `implementer`, `consolidator`, the review lenses | governed, effort-bearing                         |

## Q-23 — resolved: both, at different layers

The question asked whether the coordinator is the person or the Claude session,
and recorded that the two documents were each internally coherent while the
evidence did not separate them. It did not separate them because the term was
overloaded: `harness-orchestration.md` was describing the owner-side layer, and
`agent-workflow.md` and `CLAUDE.md` the session layer. Both were right about the
layer they meant.

The finding's live consequence dissolves with the ambiguity. The dispatch gate is
delivered as `hookSpecificOutput.additionalContext` — model context, readable by a
session and not by a person — and it binds `agent-router`, which is a model actor.
**The precondition is now observable by the party it binds.** The gate mechanism
built at `dd3fc825` is validated by this amendment rather than changed by it, and
root `README.md`'s unconditional bootstrap instruction stops being the only thing
bounding the consequence.

## Q-24 — resolved: `consolidator` is a one-shot worker

The owner places `consolidator` with the workers. It is dispatched by the router,
fresh per round, and not a resumable named worker: a round is the unit, and the
next round wants a clean lens rather than the previous round's conclusions.

**A consolidator worker must spawn the four passes, which is depth 2, and that
was measured rather than assumed.** A worker spawned a child successfully with no
refusal, and the child is recorded on disk as `spawnDepth: 2` in the same parent
session's `subagents/` directory — so the guard observes grandchildren on the same
terms as children. The round's own topology therefore survives the correction
intact.

F-362 stands as filed: the gate enumeration must name the set the guard governs,
and that set includes `consolidator`.

## F-363 — required property met, by mechanization

The finding required that either the coordinator's constraint be mechanized or
the trust claim be restated. The correction takes the first branch, and does so
twice over.

**The main session is no longer an ungoverned actor.** It is a project role: in
domain, resolved, and logged with `agent_type: agent-router` and
`resolution: exempt`. The README's trust claim — that a run is trusted only when
every governed role that acted appears, and appears at all — recovers its original
scope, because the main thread is now one of the roles that must appear. Exempt is
not ungoverned; it is governed and carrying no effort obligation, which is the
distinction the exemption was minted to draw.

**The "no repository work" constraint gets a real mechanism: the role's `tools:`
allowlist.** This is stronger than the precedent `agent-workflow.md` warns about.
A reviewer's `disallowedTools` "guarantees nothing" because `Write` and `Bash`
remain; an allowlist that never names them removes the vector rather than the
obvious path to it.

**Residual, and it should be recorded rather than closed silently.** An exempt
role allows unconditionally, so the guard checks that the router _acted_, never
what it did; the allowlist is what bounds that, and the allowlist is only as good
as the host honouring it. That the host honours a `tools:` allowlist for these
specific tool names is the one thing this amendment asserts without having
measured it.

## F-367 — stands; the remedy is the justification, not the wiring

The finding is unchanged in substance and sharper in consequence. Under the
correction `Stop` yields `exempt, allow` where it previously yielded
`no-role, allow` — still never a denial, and now permanently so by design rather
than by the accident of a roleless main thread. `Stop`'s documented enforcement
reason is dead and cannot be revived by any future topology that keeps this
boundary.

But the hook has a live reason that is not enforcement. The trust claim requires
the router to _appear_ in the log, and a router turn that dispatches without
calling a tool reaches no other effort-bearing event. `Stop` is what makes such a
turn observable. **Retain the wiring; rewrite the reason from enforcement to
observation.** The required property — each wired event has a reason that holds on
the settled topology — is then met by restating it.

## F-366 — unchanged

The launcher and the `resolve-role.ts` CLI still serve only a diagnostic. The
correction does not revive them: `agent-router` is selected by the `agent`
setting or `--agent`, and being haiku it declares no effort, so there is nothing
for a launcher to pin. The main-thread `--agent` effort defect is irrelevant for
the same reason — the role that now runs on the main thread carries no effort
invariant. This is why the correction is safe, and it is worth stating in the
finding's disposition rather than left implicit.

## The router's surface

Smallest surface that supports dispatch, resume and relay, and nothing else.

```yaml
name: agent-router
model: haiku
tools: Agent, SendMessage, ListAgents
```

No `effort:` — declaring one on a literal-haiku role is a configuration defect the
resolver already raises.

**No `Bash`, `Read`, `Write`, `Edit`, `Grep` or `Glob`.** Read access is excluded
deliberately and not merely as tidiness: a router that reads the repository grows
context, starts forming opinions about the work, and becomes the developer role
this amendment exists to prevent. When a task concerns a file, the router names
the path in the worker's prompt and the worker opens it.

**It relays; it does not author.** The owner's prompt is passed through rather
than rewritten. This is what keeps output quality independent of the router's
model — haiku is sufficient to address an envelope, and never asked to compose the
letter.

## What the effort contract gains

Managed effort-bearing roles no longer run interactively. They exist only as
subagents, which means their frontmatter is the whole runtime contract: there is
no interactive surface on which to change a worker's model or effort with a slash
command, and no worker compaction to move it. The interactive surface that remains
is the router's own session, and every command available there acts on a role that
is exempt by declaration.

Parent effort does not reach a worker — a `medium` parent has been observed
spawning a role that ran at its declared `high` — so even changing the router's
effort leaves the workers' contract untouched.

The guard therefore stops being protection against ordinary interactive
manipulation, which the topology has removed, and becomes **defense-in-depth
against host and environment drift**: a host that stops honouring frontmatter, a
`CLAUDE_CODE_EFFORT_LEVEL` in the environment, a model whose effort support
changes. That is a narrower claim than the one it shipped with, and it is the one
the settled topology supports.
