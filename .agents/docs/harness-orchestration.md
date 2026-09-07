# Harness orchestration — persistent role sessions

> Retrieved when changing how roles are dispatched, or before extending the effort guard.

**Status: B′ is chosen and built.** The workflow it describes is now the normal
one, written up for use in [`agent-workflow.md`](agent-workflow.md) §Dispatch;
this document stays the record of what was measured and why the choice went the
way it did. The one thing B′ required building — loading the effort guard
without the launcher — is done and documented in
[`harness-effort-guard.md`](harness-effort-guard.md) §How it loads.

Two topologies were measured against the live runtime: **A**, persistent
standalone role sessions driven by `claude -p --resume`, and **B**, persistent
resumable named subagents under a coordinator session. **B is recommended**, in
the generational form B′, because the coordinator is a person in an interactive
session rather than a program — see [The workflow](#the-workflow). A stays
measured and documented; it is the answer if unattended operation is ever wanted,
and nothing else.

The findings below are recorded in the order they were established, so the
sections on A precede the choice that did not go its way.

## The proposal

A tiny coordinator routes work to long-lived role sessions instead of making
each role a main-thread persona or a disposable subagent. Each role owns one
session; the coordinator resumes it with the next prompt, waits, and returns
only that output to the owner. The role keeps its full history; the coordinator
never ingests it.

**The topology holds.** Every mechanism it needs exists, and the two premises
that fail both fail in the direction that makes it cheaper and smaller.

## Method

Claude Code 2.1.263, `authMethod: claude.ai`, `subscriptionType: max`, no
`ANTHROPIC_API_KEY` in the environment. Every claim below was produced by
running the CLI from inside a Claude Code session and reading back the
`--output-format json` result, the session transcript, or the effort guard's own
observation log. The guard is the instrument for anything about role identity:
it already records `agent_type`, the declared effort and the effort the runtime
reported, per turn.

## Findings

**1. Nested invocation is unguarded and works.** `claude -p` spawned from a Bash
tool inside a session that has `CLAUDECODE=1`, `CLAUDE_CODE_ENTRYPOINT` and
`CLAUDE_CODE_CHILD_SESSION=1` runs normally — no refusal, no warning, ~4 s for a
trivial turn. There is no nested-session protection to design around. The one
operational catch is stdin: a spawned `claude` waits 3 s for it and warns, so
every invocation needs `< /dev/null`.

**2. Session identity can be assigned, not merely captured.** `--session-id
<uuid>` sets the id, and the result's `session_id` comes back equal to it. The
coordinator can derive a stable uuid per role and address it forever; it never
has to parse an id out of a first run and store it.

**3. Resume is same-id and history-preserving.** `-p --resume <id>` appends to
the same session — the returned id is unchanged, and the session correctly
recalled a word from an earlier invocation. `--fork-session` is what creates a
new id; without it there is no fork.

**4. Role identity, model and effort all survive resume.** A session created
with `--agent integrity` and resumed with _no_ flags still reported
`agent_type: integrity`, still ran `claude-sonnet-5`, and still ran at `high` —
integrity's declared level — while the ambient `CLAUDE_EFFORT` was `medium`.
Effort is session state, not a per-invocation argument.

This contradicts the documentation, which says effort is not a session property.
The measurement stands: the guard observed `declared=high, actual=high,
cause=match` on a resume that passed no `--effort`.

**5. Re-supplying `--effort` on every call costs about 19×.** Passing the flag
invalidates the prompt cache; omitting it hits the cache. Four omissions and
three passes, alternating, with no other change:

| Invocation                         | cache read | cache created |    cost |
| ---------------------------------- | ---------: | ------------: | ------: |
| cold start, new session            |          0 |        49 515 | $0.1981 |
| resume, no `--effort`              |     49 515 |            76 | $0.0103 |
| resume, no `--effort`              |     49 591 |            60 | $0.0102 |
| resume, `--effort low` (a change)  |          0 |        49 711 | $0.1989 |
| resume, `--effort low` (unchanged) |          0 |        48 303 | $0.1933 |
| resume, no `--effort`              |     49 651 |           589 | $0.0124 |
| resume, no `--effort`              |     50 240 |            61 | $0.0104 |

Passing the flag misses even when the value is identical to the one already in
force, so this is the flag's presence and not a change of level. One earlier
haiku resume also missed with no flag; it followed a malformed invocation and is
unexplained, but the correlation is otherwise clean at 7/7.

**6. The `--agent` effort bug does not reproduce in print mode.** A fresh
`-p --agent integrity` with no `--effort`, under an ambient `medium`, ran at
`high`. The interactive main-thread defect that `.scripts/claude-role.sh` exists
to work around does not apply to the interface this topology would use.

**7. Concurrent resume of one session silently forks it.** Two simultaneous
resumes of the same id both succeeded, both returned that id, and both reported
no error — and left the transcript with one parent holding two children and two
leaf tips. A later resume follows one tip; the other turn's work is still on
disk and no longer in the conversation. Nothing locks, and nothing complains.

**8. Context usage is observable per invocation.** The result's `modelUsage`
carries `contextWindow` (200 000 for haiku, 1 000 000 for sonnet-5 here), and
`usage` carries the input, cache-read and cache-creation counts whose sum is the
context actually sent. No transcript parsing, no inference from cost.

**9. `/compact` works as a print-mode prompt.** Sent as the prompt on a resume it
returned `subtype: success` with an empty `result`, and the transcript grew by
compaction records. It is usable; it returns no output, so a caller must not
expect any.

**10. Print-mode traffic draws on the ordinary subscription allowance.** The
authentication path is not by itself proof of this, so it was measured against a
product-visible counter rather than inferred from `authMethod`, `subscriptionType`
or `total_cost_usd` — see [Accounting](#accounting). An Agent SDK boundary is a
different matter: its documentation states that third-party developers are not
permitted to use claude.ai login or subscription rate limits, so it wants
`ANTHROPIC_API_KEY` and bills pay-as-you-go. `--bare` likewise never reads OAuth.

## What this changes

Everything in this section is about topology A, and was written before the choice
went to B′. It stands as the analysis of A — read it for the reasoning, not as
instructions to follow.

**Effort must not be supplied per invocation.** The owner's intent was that
effort be _supplied and checkable_ on every worker call. Finding 5 prices the
supplying at roughly 19× per call, and findings 4 and 6 remove the reason for
it: the frontmatter level is honoured at session creation and persists across
every resume. The requirement worth keeping is the second half. **Checkable is
not supplied** — and checking is what the effort guard already does, for free,
on every turn, from inside the session.

**One in-flight call per role session.** Finding 7 makes serialization a
correctness requirement rather than an efficiency one, because the failure is
silent. The coordinator's own shape — send, wait, return — satisfies it for a
single caller; what it must add is a lock per role, so that two tasks routed to
one role queue instead of forking it.

**The coordinator does not need to be a Claude session.** Nothing in findings 1
to 3 requires the router to reason. Deriving a uuid, spawning a process, waiting,
and reading one JSON field is a shell or Node program. A Haiku session could do
it, but then the router is itself an agent with a context that grows, which is
the hierarchy the proposal set out to remove.

**Direct CLI invocation, not the SDK.** Finding 10 is decisive: adopting the SDK
as the boundary would move all worker traffic from the subscription onto
pay-as-you-go API billing. That is the accounting trap, and it argues for the
plainer interface rather than against it.

**`--bg` is not the primitive it looks like.** Background sessions are real and
addressable — `claude --bg`, `agents`, `attach`, `logs`, `stop`, `respawn`, and
`claude agents --json` lists them without a TTY — but output comes back through
`logs`, described as recent terminal output rather than a structured result.
`-p --resume` returns a parsed result with usage and identity in one call, and
holds no process open between calls. The same is true of the session-messaging
surface: it addresses live sessions conversationally, which is a chat channel
between agents, not a request/response with captured output.

## The arrangement the measurements support

Topology A's arrangement, kept as the record of what A would take. B′ was chosen;
[The workflow](#the-workflow) is the one to build.

- A stable uuid per role, derived from the role name.
- First call per role: `-p --session-id <uuid> --agent <role>`, no `--effort`,
  no `--model`; `.claude/agents/*.md` stays the only source of truth and is
  honoured.
- Every later call: `-p --resume <uuid>`, prompt, `< /dev/null`,
  `--output-format json`. No identity flags — they are already session state, and
  `--effort` in particular would cost the cache.
- A per-role lock the coordinator holds for the duration of a call.
- Read `result` for the output; `usage` and `modelUsage.contextWindow` for
  pressure. Compact by sending `/compact` when pressure warrants, as an
  optimisation.

## What the effort guard becomes

Written against topology A. The conclusion that the guard grows more important
survives the change of topology; what happens to the launcher under B′ is in
[What this removes or demotes](#what-this-removes-or-demotes).

Smaller in one part and load-bearing in another.

The launcher's reason to exist is the interactive `--agent` bug (finding 6),
which this topology does not touch; a coordinator that never starts an
interactive session does not need `.scripts/claude-role.sh`. What survives is the
guard itself, and it survives _because_ effort is no longer passed per call: the
whole saving in finding 5 rests on trusting that frontmatter was honoured, and
the guard is the only thing that observes whether it was. It is what makes not
supplying effort safe rather than merely cheap.

Two of its rules also need re-examining against this topology before enforcement,
and neither is answered here: whether a coordinator-spawned session is a context
in which `CLAUDE_CODE_EFFORT_LEVEL` should still deny outright, and what the log
should say when one role's session is resumed hundreds of times — the trust
question becomes per-turn rather than per-run.

## Accounting

Topology A routes every role turn through `claude -p`, so a separate
programmatic allowance would sink it even though the calls authenticate through
Max. Authenticating as `claude.ai` proves the credential, not the bucket, and the
two were measured apart.

**The counter.** `/usage` works as a print-mode prompt and reports the
subscription counters — a five-hour session window, a weekly all-models window,
and a weekly model-specific one. Two consecutive readings agreed, so the reading
itself is stable.

It is a server reading, not a local tally, which is what makes it usable as
evidence here: the binary carries an `/api/oauth/usage` endpoint and a family of
`anthropic-ratelimit-unified-*` response headers. The window figures come back
from the service. Only the _contributing factors_ the command also prints are
local, and the command says so itself.

**The buckets.** The installed binary contains exactly six rate-limit
identifiers: `five_hour`, `seven_day`, `seven_day_opus`, `seven_day_sonnet`,
`seven_day_overage_included` and `seven_day_oauth_apps`. They are scoped by time,
by model, and in one case by caller class. **None is scoped by entrypoint**: there
is no print, headless, programmatic or SDK bucket for print-mode traffic to fall
into. A search for one returned nothing.

**The burn.** Two controlled burns through `-p` alone, with the counter read
before and after each:

|                      | tokens via `-p` | session window |
| -------------------- | --------------: | -------------: |
| baseline, read twice |               — |            20% |
| after burn 1         |         444 373 |            21% |
| after burn 2         |         859 328 |            22% |

The five-hour window moved on print-mode traffic, and moved again on more of it.
Request and session counts rose by exactly the number of calls made.

**The control.** The readings above were taken through `-p`, so a separate
print-mode bucket would have looked the same — the counter would move, and the
reading would report the bucket it moved. So the converse was measured: an
interval of interactive work only, with no print-mode burn in it. The session
window went 22% to 23% while the session count did not move at all. Interactive
and print-mode traffic move the same counter, in both directions.

**`seven_day_oauth_apps` is the bucket to know about.** It is the one caller-class
allowance in the enum, and it is what a separate programmatic quota would look
like. It did not appear in the counter this account reports, and no print-mode
burn moved anything but the ordinary windows. It is also undocumented: nothing
published says who falls into it.

**What the documentation says, and does not.** The subscription allowance for
Claude Code is documented as a rolling five-hour window plus a weekly window,
with per-model weekly limits, and **no distinction is drawn anywhere between
interactive and print-mode usage** — print mode is documented as a supported way
to run Claude Code, not as a separately metered one. No published terms restrict
driving it programmatically on a subscription. So the documentation is consistent
with the measurement, by saying nothing that contradicts it.

**This is a current-behaviour result, not a permanent property.** A change giving
subscriptions a separate budget for programmatic use, billed at API prices, was
announced and then paused. That report is press rather than Anthropic
documentation and is not treated as fact here, but it names precisely the risk
this section set out to test, which means the answer is one policy decision away
from reversing. The measurement settles today's behaviour and cannot settle
tomorrow's.

**Standing on this.** Print-mode accounting is resolved for the purposes of
choosing a topology: it is the ordinary subscription allowance, established by a
server-side counter, a dose-response, and a converse control, not by the
credential. It stays a **watch item rather than a closed question** — the counter
is a one-line check, so re-run it before deployment and after any billing
announcement, and treat a print-mode burn that stops moving the five-hour window
as the signal that the topology's economics have changed.

## Topology B — resumable named subagents

One coordinator session spawns each role as a named subagent and resumes it with
`SendMessage`. Measured the same way: the guard's log, the subagent transcripts
under `projects/<cwd>/<parent-session-id>/subagents/agent-<id>.jsonl`, and the
coordinator's own `--output-format json`.

**11. Workers are resumable and keep their full context.** A named worker
answered, after finishing, both what codeword it had been given and which
command it had run. `SendMessage` reports `Resuming agent <name>`, and the name
keeps resolving after completion.

**12. Role identity, model and effort hold.** Every assistant row in a worker's
transcript carries `effort: medium` — the level `cleanup` declares — including
rows written by resumed turns, and the model stayed `claude-sonnet-5`.

**13. The guard sees workers at finer granularity than in A.** A coordinator
with the plugin loaded produced `SubagentStart`, `PreToolUse` and `SubagentStop`
records carrying `agent_type: cleanup`, a distinct `agent_id`, and
`declared=medium, actual=medium, match`. In A a worker is a whole session; in B
it is separately identified inside one.

**14. Concurrent messages to one worker serialize.** Two `SendMessage` calls
issued together both returned their own correct answer, and the worker's
transcript held **zero branch points and one leaf tip**. This is exactly the
case that silently forks in A (finding 7).

**15. Workers survive coordinator restart and coordinator `/compact`.** The
coordinator was a `-p` session, so its process exited between every turn, and one
of those turns was a `/compact`. The worker stayed resumable across all of it,
with one transcript file and a cache that kept reading forward. Persistence is
tied to the parent **session id**, not to the parent process.

**16. Workers are invisible outside that session id.** A different session
called `ListAgents` and found neither worker: _"NOT LISTED. In-process subagents
I own: 0."_ Nothing addresses another session's workers, and the transcripts are
stored under the parent session's own directory.

**17. A worker cannot be compacted, and its context only grows.** Sending
`/compact` to a worker delivers the text, not the command; the worker replied
that no compact action is available to it. Its context climbed monotonically
across seven turns — 34 906, 34 101, 52 054, 59 714, 64 982, 66 158, 67 777
tokens sent — with nothing able to reduce it. Whether that is a defect depends
on the lifetime model; see [Generational lifetime](#generational-lifetime).

**18. The coordinator burns context and money per routing turn.** The
coordinator's own turns sent 76 495, then 44 831 after its compaction, then
47 739 tokens, at $0.25, $0.53 and $0.14. It is a reasoning session with a
growing context that needs its own compaction, not a router.

**19. Worker output is relayed by a model, and worker pressure needs transcript
parsing.** What reaches the coordinator is the worker's final report, restated in
the coordinator's words — in one probe the coordinator's account of a reply was
its own interpretation of it. Worker context is available only from the internal
subagent JSONL, whose format the documentation warns changes between releases;
the `subagent_tokens` figure in a completion notice is cumulative spend, not
context pressure.

**21. Generational replacement is native and clean.** Spawning a new worker
under a name already in use rebinds the name — the fresh worker reported no
memory of the previous generation's codeword, took a new `agentId`, and the
older generation stayed on disk under the same name. Retire-and-replace is one
tool call, and both generations remain readable.

**22. Generations spend a shared, capped budget.** A session carries
`CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` and
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` limits — raisable by environment variable,
but per coordinator session and shared across every role in it. Deliberate
churn spends that budget faster than long-lived workers would.

**23. Workers do not compact, and in practice do not need to.** Across 217
subagent transcripts on this machine — including 1.2 MB ones from real review
rounds — not one carries a compaction boundary, while 18 main-session transcripts
do. Subagents neither auto-compact nor accept the command. But real workers have
run to 255 k, 251 k and 310 k tokens of context across 264, 184 and 152 turns
without incident, against windows measured at 200 000 for haiku and 1 000 000 for
sonnet-5. The ceiling is the model's window, and it is far away.

**20. A role worker reasserts its role.** `cleanup` refused an off-role question
twice and spent tokens on its own startup reading instead. Correct behaviour, and
a reminder that a worker is a role rather than a callable function.

## Generational lifetime

Finding 17 read the absence of worker compaction as fatal. That was wrong, and
the argument against it is sound: compaction is itself lossy, and it preserves
assumptions and intermediate state that have since stopped being true. A worker
that is retired and replaced at a sensible boundary — with the repository,
commits, plans, decisions and handoffs carrying continuity, and conversation
treated as disposable working memory — is often in cleaner state than one
compacted repeatedly. Finding 17 is withdrawn as a reason to prefer A.

**It does not, however, separate the two topologies, because replacement is
equally available to both.** Retiring an A worker is deriving the next uuid and
omitting `--resume`; retiring a B worker is spawning the same name again
(finding 21). Both are one step, and both cost one cold start. What the
generational model actually does is remove one of B's disadvantages, not create
an advantage — and then three differences remain, all of them about lifetime.

**A keeps both instruments; B has only one.** A can retire a session _or_ extend
it by compacting, and choose per role. B can only retire. That matters exactly
where continuity is worth most: an architect whose accumulated reasoning is the
asset can be carried past a context boundary in A and cannot in B.

**A's generation boundaries are independent; B's are coupled.** Each A session
has its own lifetime, and retiring the implementer does not touch the architect.
Every B worker lives inside one coordinator session id and draws on one shared
spawn budget (finding 22), so the coordinator's lifetime is a ceiling on every
role's at once, and deliberate churn brings that ceiling closer.

**A's retired generations stay addressable.** A superseded A session keeps its
uuid and can be resumed later to ask what that generation concluded. A retired B
worker's transcript is on disk but reachable only through a living parent session
(finding 16) — which is precisely the archive the generational model relies on
for anything the repository did not capture.

### Roles have different lifetimes, and that shrinks the problem

Taking the role differences seriously changes the size of the system more than it
changes the choice.

- **`reviewer`, `integrity`, `cleanup`, `der`** benefit from a fresh context —
  independence is the point of a second opinion, and finding 20 shows a role
  worker reasserting its role rather than drifting. These roles want maximum
  freshness, which is a **one-shot subagent**: what the repository already does.
  They need no persistent worker in either topology.
- **`implementer`** wants frequent retirement, and either topology serves it. A
  adds durable, addressable archives of superseded generations.
- **`architect`** wants the longest continuity, and is the one role where A's
  second instrument is decisive.

So the persistent-worker apparatus is worth building for about two roles, not
seven. That is the most useful consequence of the generational argument, and it
argues for a smaller system than either topology as originally framed.

### What decides it now

Not compaction. The coordinator does. An automated B has to drive its coordinator
session non-interactively, and the only measured way to do that is
`-p --resume` — so an automated B is A's machinery **plus** a reasoning hop that
restates worker output as prose (finding 19) and bills 45–76 k context per route
(finding 18).

B′ is genuinely attractive in one shape: when the coordinator is a **person in an
interactive session**, dispatching to long-lived named role workers. That needs no
orchestration code at all. **That shape is the actual operating model**, which is
what settles the choice — see [Choosing](#choosing).

**B′'s minimum**, which is what gets built: one name
per role; a task counter per role; retirement at a coarse boundary — N tasks, or
a phase ending — rather than a token threshold; and respawn by the same name. No
uuids, no locks, no process management. Worker pressure would come from the
subagent transcript if it were ever wanted, and finding 22 would need the
per-session cap raised.

## Choosing

|                               | A — `-p --resume` sessions                                           | B — named subagents                                                                                        |
| ----------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Worker persistence            | own session file; addressable by uuid from any process, indefinitely | tied to parent **session id**; survives coordinator restart and compaction; invisible to any other session |
| Coordinator                   | a script; no context, no tokens                                      | must be a reasoning session; 45–76 k context per turn, $0.14–0.53                                          |
| Worker context in coordinator | none                                                                 | final report only                                                                                          |
| Prompt cache on resume        | warm when `--effort` is omitted ($0.010 vs $0.195)                   | warm (37 481 → 96 read/create)                                                                             |
| Effort correctness            | persists; guard confirms `match`                                     | persists; guard confirms `match`                                                                           |
| Guard observability           | per session                                                          | per worker, with `agent_id` — finer                                                                        |
| Concurrency                   | **silently forks**; needs a lock                                     | **serializes**; nothing to build                                                                           |
| Worker lifetime               | retire, or extend by compacting                                      | retire only                                                                                                |
| Generation boundaries         | independent per role; superseded sessions stay addressable           | coupled to one coordinator session and one spawn budget                                                    |
| Context pressure              | supported `--output-format json`                                     | internal transcript parsing                                                                                |
| Output                        | structured result plus usage                                         | model-relayed prose                                                                                        |
| Quota                         | subscription                                                         | subscription                                                                                               |
| Build cost                    | uuid, spawn, lock, stdin redirect                                    | almost nothing                                                                                             |

**B′ is the choice**, because the coordinator is a person.

Every argument that carried A rested on the coordinator being a program. An
automated B needs `-p --resume` to drive its coordinator, making it A's machinery
plus a reasoning hop (findings 18 and 19) — but there is no program. The owner
sits in an interactive VS Code session and says _send this to architect_. That
session is the coordinator, its context is the ordinary cost of working
interactively, and its "relay as prose" is the conversation itself rather than a
lossy hop between machines.

With that premise corrected, what is left favours B′:

- **Concurrency is solved rather than built.** Messages to one worker serialize
  into a linear transcript (finding 14). A's silent fork (finding 7) and the
  per-role lock it demands both disappear, and that lock was A's one piece of
  genuinely load-bearing new code.
- **Retirement is enough, and the wall is far.** Finding 23 removes the last of
  finding 17: workers do not compact, but real ones reach 255-310 k against
  windows up to 1 M, so a coarse retirement policy has enormous headroom.
- **Coupled lifetimes become a feature.** Retiring `agent-router` retires every
  worker at once, which is exactly the coarse global generation boundary wanted.
- **Nothing needs building.** Spawn by name, message by name, respawn by name to
  replace a generation (finding 21). No uuids, no locks, no process management, no
  JSON parsing, no stdin redirection.
- **The guard gets better evidence.** Workers are checked individually with their
  own `agent_id` (finding 13), rather than one verdict per whole session.

**Where A would still be right:** unattended operation — CI, a scheduled run, any
dispatch that happens while nobody is in the session. Everything measured for A
holds and stays recorded for that case. It is not this case.

## The workflow

**Three layers, named separately.** The **owner-side coordinator** is the person
and is outside the system. **`agent-router`** is the Claude Code main session.
**Workers** are `architect`, `implementer`, `consolidator` and the review lenses.

**`agent-router` is a project role, not a roleless session.** It declares literal
`model: haiku` and no `effort:`, so it is governed — resolved and logged like any
role — while carrying no effort invariant, exactly as `Explore` does. The
interactive `--agent` effort defect cannot bite it for that reason: there is no
declared level for the main thread to drop. Its job is to dispatch, resume and
relay, and its `tools:` allowlist is what keeps it to that:

```yaml
name: agent-router
model: haiku
tools: Agent, SendMessage, ListAgents
```

No `Bash`, `Read`, `Write`, `Edit`, `Grep` or `Glob`. Excluding read access is
deliberate: a router that reads the repository grows context and starts forming
opinions about the work. When a task concerns a file, the router names the path in
the worker's prompt and the worker opens it. It relays the owner's prompt rather
than authoring one, which is what keeps output quality independent of the router's
model.

**Two persistent workers, spawned by name.** `architect` and `implementer` are
spawned with a name equal to the role, and afterwards addressed by that name;
a send resumes a finished worker with its context intact (finding 11), keeping
its role, model and declared effort (finding 12).

**Review passes and `consolidator` stay one-shot.** `reviewer`, `integrity`,
`cleanup`, `der` and `consolidator` are spawned fresh each time and never named or
resumed. A `consolidator` worker spawns the four passes itself, at spawn depth 2,
which is measured to work and is recorded in the log on the same terms as depth 1. Independence is the point of
a second opinion, and maximum freshness is exactly a disposable subagent — which
is what the repository already does. This half of the design needs no change at
all.

**Retirement is coarse and event-shaped, not a token threshold.**

| Worker         | Retire when                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `implementer`  | the unit of work is committed and pushed                               |
| `architect`    | the contract, plan or phase it was reasoning about closes              |
| review passes  | always — every invocation is a new worker                              |
| `consolidator` | always — one per round                                                 |
| `agent-router` | the conversation stops being useful; this retires every worker at once |

Replacement is spawning the same name again (finding 21). No pressure reading is
required for any of these, which is the point of choosing event boundaries.

**The rule that makes retirement safe.** A worker's conversation is disposable
working memory; durable state is the repository — commits, contracts, `D-*`
records, plans, review artifacts and handoffs, which
[`AGENTS.md`](../../AGENTS.md), [`review-findings.md`](review-findings.md) and
[`handoff.md`](handoff.md) already define. **Anything a worker knows that is not
in the repository is lost at retirement, by design.** So a worker records or
commits before it is retired, and the retirement boundaries above are the points
at which it already has.

## What this removes or demotes

**[`.scripts/claude-role.sh`](../../.scripts/claude-role.sh) leaves the normal
path.** Its purpose is pinning a role's effort on a main thread started with
`--agent`, and B′ runs no role on a main thread. It stays useful for reproducing
one role in isolation, so it is **demoted to diagnostics** rather than deleted.

**Two things now come from settings rather than a flag.** `agent-router` is
selected by the `agent` setting (or `--agent`), and the guard plugin must be
installed rather than passed with `--plugin-dir`. Both are the same mechanism and
the same prerequisite: a VS Code session is not started from a command line the
repository controls.

**The guard has to be installed rather than launched.** This was the one new
requirement and it was not optional: the launcher was also what loaded the
plugin, via `--plugin-dir`, and a VS Code session gets no such flag — the session
that produced this document was itself unguarded.

**Built.** A repository-local marketplace declared in `.claude/settings.json`
under `extraKnownMarketplaces` loads the plugin into any ordinary session started
at the checkout root, with no flags;
[`harness-effort-guard.md`](harness-effort-guard.md) §How it loads carries the
mechanism and the acceptance measurements. Three properties of it are worth
having here, because they were not obvious and had to be measured:

- **A relative source path is required and sufficient.** It resolves against the
  checkout, which is what lets the file be committed; an absolute path would be
  true of one machine. `${CLAUDE_PROJECT_DIR}` is **not** expanded in that field
  and silently registers nothing.
- **Project scope can vouch for a local marketplace but not a network one.** A
  network source has to be declared in user or managed settings, so the
  repository could not have installed itself from one.
- **Registration and loading happen on successive starts.** The first session in
  a fresh clone registers the marketplace and runs unguarded; the next one loads
  the guard. Declaring the manifest inline in settings does not help — it
  reconciles over the same two starts and normalises back to a directory source.
  `claude plugin marketplace add ./` is therefore a **required one-time
  bootstrap**, not a convenience: a governed worker dispatched from that first
  session runs with no record, which was measured rather than assumed.

**The guard's rules survive intact, and one becomes more important.** Workers are
subagents, so `CLAUDE_CODE_EFFORT_LEVEL` — which flattens subagents to one level —
would now silently flatten _every_ role at once; its deny is the rule that
matters most under B′. The launcher's pre-flight refusal of that variable is lost
with the launcher, and is replaced by a runtime denial at the first tool call:
later, still fail-closed. The `haiku` exemption stays needed for `Explore`, and
the requirement that every other role declare an effort stays as written.

**A's machinery is not built.** Stable uuids per role, the per-role lock, the
`< /dev/null` redirection and result parsing are all unnecessary. The
measurements that produced them stay, because they are why.

## Open questions

- Whether a compacted session still reports its role and effort. Compaction
  starts a `SessionStart(source=compact)`, and finding 4 was measured on an
  uncompacted session.
- Whether the unexplained haiku cache miss in finding 5 has a cause that also
  applies to warm role sessions.
- What a role session's practical lifetime is before compaction dominates, which
  needs a real workload rather than one-word probes.
- Whether a compacted worker session in A keeps its role and effort, which
  finding 15 establishes for B's workers but not for A's sessions.
- Whether B's workers survive a VS Code window reload. They survive the
  coordinator process exiting (finding 15), so this reduces to whether the
  editor resumes the same session id; not measured.
