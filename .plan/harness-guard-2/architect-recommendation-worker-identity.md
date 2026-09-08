# Architect recommendation — governed worker identity across the spawn boundary

**2026-09-08.** A design recommendation, not a settled decision. It is recorded
for comparison with an independent owner-side analysis of the same failure;
nothing here is in force, no `D-` is minted, and no current-state document has
been amended. The Review Swarm filesystem-isolation question is untouched.

Every runtime claim below was established in this session by capturing raw hook
payloads and by reading the runtime's own per-agent records, not inferred from
the guard's source or from the failure report. Claude Code `2.1.263`.

## The observed failure

A governed `consolidator` spawned its four lenses with explicit `subagent_type`
and a descriptive `name`. The dispatch was correct and the guard saw it
correctly:

    agent_type: consolidator   dispatch_target: reviewer   decision: allow   cause: match

The child then reported itself as the _name_:

    agent_id: aarcb-rem-reviewer-a649572ecba89ff0
    agent_type: arcb-rem-reviewer     resolution: out-of-domain     decision: allow

`reviewer` declares `high` and `integrity` declares `high`; both ran at the
parent's ambient `medium`, allowed, because an out-of-domain resolution is an
allow. `cleanup` and `der` declare `medium` and coincidentally matched, but were
equally ungoverned. Four lenses, no invariant applied to any of them.

## Root cause

**`name` does not rename the worker. It changes how the worker is spawned.**

The `Agent` tool has two spawn paths, and the repository's own history contains
both. They are distinguishable by the runtime's per-agent record and by the
shape of `agent_id`:

|                   | subagent path                                       | in-process teammate path                                                                 |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| selected by       | no `name`                                           | `name` present                                                                           |
| `agent_id`        | `a` + 16 hex                                        | `a` + assigned name + `-` + 16 hex                                                       |
| record fields     | `agentType`, `name?`, `toolUseId`, `spawnDepth ≥ 1` | `agentType`, `name`, `customAgentType?`, `model`, `taskKind`, `teamName`, `spawnDepth 0` |
| `agentType` holds | **the `subagent_type`**                             | **the assigned name**                                                                    |
| hook `agent_type` | the role — guard works                              | the name — guard fails                                                                   |

Census over this machine's transcripts: 261 subagent-path records, 13
teammate-path records. The teammate path is the newer one and is what the arcb
round used.

Verified directly: an `Explore` spawn **with** a name resolved `out-of-domain`;
the same spawn **without** a name resolved `exempt` on `agent_type: "Explore"`.
The historical rounds of 2026-09-07 that passed names — `reviewer-final-arc`,
`integrity-final-arc` — took the subagent path and were governed correctly.

So this is not a guard bug in the sense of a wrong rule. It is the guard reading
a field whose meaning is conditional on a spawn mechanism the guard cannot see,
and which changed under it.

## The identity model the guard should trust

Three things are currently collapsed into one field. They must be separated.

1. **Address** — the `name` a dispatcher requests. Arbitrary, caller-owned,
   and **not authoritative even as an address**: the runtime silently rewrites a
   requested name that is already used in the session. Verified — a second spawn
   requesting `probe-worker-alpha` produced a worker reporting
   `probe-worker-alpha-2`. Useful in the UI; never an input to a verdict.
2. **Runtime-reported actor** — the payload's `agent_type`. Equal to the role on
   the subagent path and to the assigned address on the teammate path. It is
   _evidence about what the runtime called this worker_, and nothing more.
3. **Governed role** — the `subagent_type` the dispatcher selected. The only
   thing the effort invariant and the dispatch topology may key on.

The guard today treats (2) as (3). The recommendation is that it stop, for every
actor that carries an `agent_id`.

**The discriminator between a child and a main-thread role is `agent_id`.** It
is present on every subagent/teammate event and absent on every main-thread
event, across all 2 125 logged records and every payload captured here. A
main-thread role's `agent_type` comes from `--agent` and remains authoritative;
it needs no change and must not get one.

## Where the governed role comes from

**The runtime reports it to no hook.** Captured payloads, complete:

- `SubagentStart` — `session_id`, `transcript_path`, `cwd`, `scratchpad_dir`,
  `prompt_id`, `agent_id`, `agent_type`, `hook_event_name`.
- child `PreToolUse` — the above plus `permission_mode`, `effort`, `tool_name`,
  `tool_input`, `tool_use_id`.
- `SubagentStop` — plus `agent_transcript_path`, `stop_hook_active`,
  `background_tasks`.

No `subagent_type`, no `customAgentType`, no parent agent id, no model, and no
identifier shared with the dispatching call. Two carriers therefore exist, and
only two.

### Carrier A — a guard-owned ledger written at the dispatching `PreToolUse`

Trustworthy provenance: the guard writes it itself, at an event it already
enforces at. **Rejected as the primary carrier, because it cannot be joined to
the child.**

- `tool_input.name` is a _request_, not the assigned address. The runtime's
  de-duplication breaks the join precisely when a name recurs — which is the
  normal case for a repeated review round in one session.
- `tool_use_id` is on the dispatching `PreToolUse` and absent from
  `SubagentStart`. The subagent-path record carries `toolUseId`; the
  teammate-path record does not, so the join is unavailable on exactly the path
  that needs it.
- `prompt_id` is shared by the whole parent turn. All four lenses of one round
  carry the same value; it identifies the turn, not the worker.
- Positional matching against the ledger is unsound. The arcb round happened to
  alternate dispatch/start strictly, but the consolidator spawns in parallel by
  contract, and a design that is correct only because tool calls serialised is a
  design waiting for the runtime to overlap them.

Restoring the join would mean the guard refusing any `name` already used in the
session, so that the runtime never renames. That is a real option, but it
constrains caller vocabulary, still leaves spawns the guard never saw
unjoinable, and buys a weaker result than Carrier B.

### Carrier B — the runtime's per-agent record, keyed by `agent_id` (recommended)

The runtime writes one record per worker at
`<dirname(transcript_path)>/<session_id>/subagents/agent-<agent_id>.meta.json`,
and `SubagentStop` names the sibling path directly in `agent_transcript_path`.

**The governed role is `customAgentType ?? agentType`.** That single expression
is correct on both observed shapes: the teammate path puts the selected role in
`customAgentType` and the address in `agentType`; the subagent path omits
`customAgentType` and puts the selected role in `agentType`.

Required properties, in preference to any particular code:

- **The key is `agent_id`.** Exact, unique, carries no meaning to parse, and
  immune to name collision, renaming, concurrency and ordering.
- **The location is derived from a path the payload supplies** —
  `transcript_path` or `agent_transcript_path` — never from a home directory or
  an assumed projects root.
- **No naming convention is parsed.** `agent_id` embeds the address on one path,
  and that embedding must not be read.
- **The resolved role is fed to the existing resolver unchanged.** Everything
  downstream — `out-of-domain` allows, `exempt` allows, `undeclared` denies,
  mismatch denies — keeps its present meaning. This is a change of _input_, not
  of the decision table.

Timing, verified: the record does **not** exist at `SubagentStart` (ENOENT), and
**does** exist at the child's first `PreToolUse`. This costs nothing, because
`SubagentStart` is not effort-bearing and cannot deny. The record is present at
every point where a verdict is actually reached.

## Lifecycle

**None to manage.** This is the strongest argument for Carrier B and the reason
it is preferred over any ledger: each question the brief raises about lifecycle
dissolves rather than being answered.

- **Concurrency** — the record is per-worker and written by the runtime before
  the worker's first tool call. Parallel lenses never contend; the guard only
  ever reads.
- **Failed spawn** — no worker, no record, nothing to resolve. A topology
  violation is still refused at the dispatching `PreToolUse`, before the child
  exists.
- **Worker completion** — the record persists. Nothing is consumed, so nothing
  can be consumed twice or too early.
- **Resume** — verified stable: the arcb `reviewer` resumed via `SendMessage`
  kept `agent_id` `aarcb-rem-reviewer-a649572ecba89ff0` and re-fired
  `SubagentStart`. Resumed and newly created workers need no separate treatment,
  because `agent_id` is the key in both cases and a resume selects no role.
- **Name reuse** — irrelevant. Two workers that requested the same name have
  different `agent_id`s and different records.
- **Session boundary** — the record lives under the session's own directory, so
  scoping is the runtime's and there is nothing to prune.
- **Missing lifecycle hooks** — `SubagentStart` is not required for resolution.
  Only the child's own effort-bearing event is, and that event is the one being
  judged.

## Failure and ambiguity behaviour

**Fail closed, at the child's own `PreToolUse`.**

- `agent_id` present and the record is absent, unreadable, malformed, or yields
  no role name → **deny**, with a new cause (`unresolved-identity` or similar).
  The guard cannot establish the governed identity, so it cannot assert the
  declared effort, so it must not allow the call.
- `agent_id` absent → main-thread role, resolved from `agent_type` as today.
- At `SubagentStart`, resolution is genuinely not yet establishable. Record it as
  `deferred` rather than `out-of-domain`. The present log asserts
  `out-of-domain` about workers that were in fact governed, which is the
  instrument stating a falsehood about the very thing it exists to witness.

Denying on an unreadable record is what converts this design's one real
weakness — dependence on a private artifact — into a loud, immediate, uniform
failure instead of a silent return to the state being fixed. A runtime change
that moves or renames the record denies every subagent, which is diagnosable in
one grep of the log. It is the right direction of failure, and the blast radius
should be stated plainly rather than softened.

**This preserves legitimate out-of-domain delegation.** An architect delegating
to `general-purpose`, an implementer spawning `Explore`: the record resolves the
true selected role, the resolver answers `out-of-domain` or `exempt`, and the
call is allowed exactly as now. The fix narrows nothing that the topology does
not already constrain.

## What state must exist

**None.** No ledger, no correlation table, no pruning, no session-scoped store,
no atomic-append discipline, no staleness policy. The guard remains a pure
function of the payload and of files it does not write.

If the owner-side analysis proposes a ledger, the question to settle between the
two designs is narrow and answerable: _what joins the ledger entry to the
child?_ The evidence above says nothing does, on the path where the failure
occurs.

## Second defect, found while investigating and not in the report

**A named dispatcher escapes the topology assertion entirely.** The topology is
keyed on the dispatcher's `agent_type`. A `consolidator` that is itself a named
teammate reports its address there, `DISPATCH_TOPOLOGY.get(address)` is
undefined, and the dispatcher becomes unconstrained — free to spawn
`general-purpose` in place of a lens, which is the exact failure the topology
assertion was built to refuse. Precedent that this is reachable: a consolidator
child dispatched with its own `agent_id` present in the log on 2026-09-07.

The same resolution closes it: the dispatcher's role for the topology check must
be the **resolved** governed role, not the reported `agent_type`. Both the
dispatcher's identity and the child's identity come from the same rule.

**Consequently, `topology-identity` should be widened rather than retired.**
Under this design the `name` is no longer the join key, so that rule's original
justification — a worker answering to one identity and reasoning as another —
weakens. But a new and stronger one replaces it: on the subagent path a worker
spawned with `name: reviewer` and no `subagent_type` yields a record whose
`agentType` is `reviewer`, which would resolve a general-purpose worker as a
governed lens. Refusing any spawn whose `name` equals a governed role name while
its `subagent_type` differs — **for every dispatcher, not only `consolidator`** —
removes that case. That widening is load-bearing for the resolution rule and
should land with it, not after it.

## Interim containment, available before any code changes

**Stop passing `name` on governed dispatches.** Verified above: an unnamed spawn
takes the subagent path, reports its `subagent_type` as `agent_type`, and is
governed correctly today. The guard could enforce this by refusing a spawn from
a dispatcher in the topology table that carries a `name` at all.

This is a containment, not the fix. It trades away descriptive names in the UI,
which the brief rightly values, and it depends on the same undocumented path
distinction the real fix reads explicitly. It is worth having only if a review
round must run before the fix lands.

## What should be tested

The suite feeds `guard.ts` synthetic payloads and reads its stdout and log, so
all of this is expressible there with a fixture record on disk.

- Child `PreToolUse`, record names a governed role, effort disagrees → deny
  `mismatch`, reporting the **resolved** role, not the address.
- Same, effort agrees → allow `match`.
- Record's `agentType` is the address and `customAgentType` the role → resolves
  to the role. The teammate shape, and the regression case itself.
- Record has `agentType` only and no `customAgentType` → resolves to
  `agentType`. The subagent shape, pinning that the old path keeps working.
- Record names an out-of-domain role → allow `out-of-domain`. Legitimate
  delegation is not narrowed.
- Record names a `model: haiku` role → allow `exempt`.
- `agent_id` present, record absent / malformed / no role field / no
  `transcript_path` → deny, each on the new cause.
- `agent_id` absent → resolves `agent_type` directly; every existing main-thread
  case unchanged.
- `SubagentStart` with `agent_id` → announcement, `deferred`, never a deny.
- A dispatcher whose record resolves `consolidator` but whose `agent_type` is an
  address, spawning `general-purpose` → deny `topology-escape`. The second
  defect.
- A spawn whose `name` is a governed role and whose `subagent_type` differs →
  deny, from a dispatcher **not** in the topology table. The widening.
- A log record for a governed child carries the runtime's `agent_type` and the
  resolved role in **separate fields**, so both remain readable.

**No unit test can detect the runtime changing the record's shape.** That is
honest and should be stated rather than papered over with a fixture that only
pins the guard's own reading. Detection is the fail-closed denial plus the log.
A live verification step belongs in the harness document alongside the existing
plugin-load verification: spawn one named worker, confirm the log shows the
resolved role and the address as distinct values.

## Evidence to preserve in the log

Both identities matter diagnostically and must stay distinguishable:

- `agent_type` — keep as-is. It is what the runtime said, and the whole failure
  was invisible because nothing recorded a second opinion beside it.
- the resolved governed role — a new field.
- how it was resolved — direct `agent_type` for a main-thread role, or the
  per-agent record for a child. Without this the log cannot answer whether a
  given run was governed by the new path or the old one, which is the first
  question anyone will ask after a runtime upgrade.
- `dispatch_target` on the dispatching call — keep. It is the independent
  parent-side witness, and it is what made this failure legible at all.

The observation log must **not** become the mechanism's state. `observe()` is
explicitly allowed to fail silently because recording is evidence and
enforcement stands without it. Anything a verdict depends on must not share that
property.

## Open questions for the owner

1. **The per-agent record is undocumented.** Its layout was established
   empirically here, and it has already changed shape once within this
   repository's own history — the subagent form carries `toolUseId` and no
   `customAgentType`, the teammate form the reverse. Depending on it is a
   deliberate acceptance of an unstable interface in exchange for the only exact
   join available. The durable fix is upstream: a first-class `subagent_type` on
   `SubagentStart` and on child `PreToolUse`. Worth requesting regardless of
   what is built here.
2. **Whether a worker spawned outside a model tool call** — a UI-initiated
   teammate, for instance — produces the same record. Unprobed. If it does not,
   such workers deny under this design. That is the correct direction, but the
   owner should decide whether it is an acceptable cost.
3. **Where this artifact belongs.** It is placed in a new `.plan/harness-guard-2/`
   alongside the existing `.plan/reviews/harness-guard-1/`, on the grounds that
   it is a record of a second harness episode rather than a review round or an
   owner amendment. Cheap to move.

## Observed and deliberately not addressed

The arcb dispatches also carried `model: opus` on all four lenses, overriding
the `sonnet` declared by `cleanup` and `integrity`. The guard asserts effort and
not model, so this is outside the invariant as written, and outside this task.
It is recorded because the per-agent record exposes the effective `model` at the
same moment it exposes the role, so whether a second invariant is wanted is a
question this design makes cheap to answer — and it is a second silent departure
from a role definition, which is the class of failure the guard exists for.
