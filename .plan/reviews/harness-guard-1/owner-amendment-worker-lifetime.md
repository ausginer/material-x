# Owner amendment — the worker generation boundary

**2026-09-07.** Adds an approximate 500 000-token retirement boundary for the two resumable named workers, `architect` and `implementer`. `consolidator` and the review lenses are one-shot and never accumulate, so they are out of scope. The router boundary from `d0dd0d44` and the session gate from `0598cab5` are unchanged.

## The capability was verified before it was designed around

**The router can observe worker context pressure through its existing surface.** `subagent_tokens`, reported in the `Agent` tool's result and again in each completion notice, is the worker's **current context size** — not cumulative spend, which is how the earlier orchestration research read it.

Measured against the same worker's transcript, twice:

| Turn | Reported `subagent_tokens` | Transcript context + output | Difference |
| --- | --: | --: | --: |
| spawn | 47 051 | 47 049 | 2 |
| after a `SendMessage` resume | 59 755 | 59 738 | 17 |

The figure tracks the live context to within about twenty tokens, and it arrives in the router's own context automatically. **No file access, no transcript parsing, and no new tool.** The envelope-only capability boundary stands as it is; `harness-orchestration.md` finding 19's claim that pressure requires reading the subagent transcript is corrected by this measurement.

**One shape detail matters for the design.** `SendMessage` returns immediately with no usage; the figure arrives when the worker's turn _completes_. That is also exactly when the router needs it — after a turn ends and before it decides where the next task goes — so the boundary is evaluated at dispatch time. Nothing polls, and nothing needs a timer.

**`ListAgents` does not carry it.** It lists identity and liveness only, so it is not an alternative source and must not be relied on as one.

## The boundary

A named worker that reports `subagent_tokens` at or above roughly **500 000** is **spent**: it receives no further work. The number is deliberately coarse, and deliberately far below the window rather than near it — see the margin below.

**This is not a case for reviving worker compaction.** Nothing compacts; the generation ends and a fresh one begins, which is the settled model.

**The window is 1 000 000, and the margin is half of it.** Opus reports a 1 000 000-token context window in the harness's own model indicator, matching sonnet-5; haiku reports 200 000. Both named workers run on opus, so a boundary at ~500 000 retires a generation at half its window and leaves the landing turn roughly 500 000 tokens of headroom — far more than any worker turn observed here, the largest of which was 310 252 in total. The required property, that the boundary leave room for at least one more full turn, is met with a wide margin.

## Reaching the boundary mid-phase

The threshold will land in the middle of an architectural phase or an implementation unit, because nothing arranges for it not to. The contract has to make that safe without the router knowing anything about the work.

**Retirement is never immediate.** Observing the threshold does not end the generation. It changes what the worker's _next_ dispatch is: instead of the owner's new task, the worker receives one final instruction to land its state — to leave the repository in a condition from which a successor can continue — and to report the paths it wrote.

**Only then is the name retired** and a successor spawned under it, whose first prompt carries the owner's pending request together with the paths the retiring generation reported, passed through verbatim.

**What "land your state" means is the worker's judgment, not the router's.** The existing handoff rules already define a finalized state, and a worker mid-unit knows what is done and what remains. The router cannot inspect the result and must not try: it has no repository access by design, and acquiring some to audit a handoff would defeat the boundary it is protecting.

**The instruction is a constant, not a composition.** It is fixed text carried in the role definition and relayed unchanged. A router that phrased the landing request itself would be authoring content about work it cannot see, which is the line the whole role exists to hold.

**The margin is what makes this work**, and it is the real justification for a threshold well below the window rather than at it. The landing turn is itself a turn, and it may write several files; it needs headroom to complete. A boundary at the ceiling would be reached precisely when there is no room left to hand anything over.

**The owner is told.** A generation boundary changes what "the architect" is, so the router reports that it happened and names the successor's starting artifacts. It does not summarise the retired generation's reasoning — that reasoning either reached the repository or is gone, which is the rule that makes retirement safe in the first place.

## What this does not change

Continuity remains repository state — commits, contracts, `D-*` records, plans, review artifacts and handoffs. The boundary adds a scheduled moment at which that rule is exercised deliberately rather than only at natural task ends, and it adds nothing to the router's capability surface.