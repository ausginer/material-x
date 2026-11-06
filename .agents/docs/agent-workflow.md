# Agent workflow

The owner coordinates material-x through a local Codex session and manually relayed standalone Claude role sessions. This is coordinator and human documentation. Each role's definition under [.claude/agents/](../../.claude/agents/) is the executable truth for its authority and the documents it reads; this file is not automatically loaded into those sessions. Include a needed shared section in a handoff by reference rather than assuming the role has read it.

## Roles

| Role | Owns |
| --- | --- |
| Owner | Goals, scope, priorities and product tradeoffs; relays prompts and returns |
| Local Codex coordinator | Recovers state, prepares bounded prompts, checks evidence and routes work; see [coordinator.md](coordinator.md) |
| `architect` | Architecture, contracts, parity and public-surface decisions |
| `implementer` | Implementation within settled constraints, with its tests, docs and measurements |
| `reviewer` | Feature proof against plans, contracts, tests and parity requirements |
| `integrity` | Package coherence, neighbouring flows, public surface and integration drift |
| `cleanup` | Machinery not justified by current responsibilities or coding rules |
| `der` | Machinery or constraints whose historical justification may have expired |
| `consolidator` | Independent review passes, evidence validation, synthesis and routing |
| `Explore` | Bounded read-only discovery when a targeted search is insufficient |

Reviewers find and document; they do not fix or decide. Only the architect creates, amends, supersedes or renumbers architectural decisions. Other roles may report one as expired, contradicted or unimplemented. The coordinator does not absorb any of these roles' authority.

## Normal handoff

`decision when needed → implementation → independent review → remediation or routed decision`

Straightforward defects go to the implementer. A change to architecture, contract, lifecycle, ownership, parity or public surface goes to the architect. An owner answer that changes a contract is recorded by the architect before dependent implementation resumes.

The owner transfers top-level prompts and closing messages, following [coordinator-setup.md](coordinator-setup.md). The coordinator does not launch or automatically resume those sessions. No tracked main-thread router is in use. The consolidator's review-local dispatch is governed by its own definition and the [effort guard](harness-effort-guard.md).

## Phase coordination

### Authority and stopping boundary

Recover the authorized phase or unit, goal, governing plan, constraints and completion boundary from the owner's instruction and existing records. Do not require another brief when the plan is sufficient. A branch name alone does not authorize starting or skipping a phase.

Within that boundary, prepare the next settled task through architectural work when needed, implementation, review and remediation. Ask the owner about changes to goals, scope, priorities and product tradeoffs; route technical architectural questions to the architect. Ordinary implementation choices stay with the implementer. Do not waive checks or lower acceptance criteria to finish.

Stop at the authorized boundary and report behavior, reviewed revision, verification and its limits, pending findings and obligations. A completed agent run is not phase acceptance. Starting the next phase, merging or releasing requires authorization. Finalization follows [handoff.md](handoff.md).

### Recovering state

After each return, compare its records with the delegated task and phase goal. Inspect git and the changed sources; distinguish committed work, local edits, verification results and pending acceptance. Do not ask the owner to reconstruct information already in the repository, and do not carry old verification over new edits without checking its scope.

Keep a short working summary: current unit, latest revision, active or blocked sessions and next dependency. Durable decisions and results stay in the owning `packages/<package>/.plan/` or repository [.plan/](../../.plan/) record. Use an existing record rather than creating another ledger or a transcript of messages.

Before a deliberate coordinator reset, a concise local resumption note may live in `.agents/codex/`, which root `.gitignore` excludes. It is a convenience, not the only copy of a finalized result. Do not require session IDs to reconstruct the work.

### Blocking questions and lack of progress

A blocked return states the question, what it prevents, the relevant source, partial work and unfinished checks. Return an existing explicit answer with its source; route contradictory contract meanings to the architect and product choices to the owner. Keep dependent work pending until the answer exists. Silence or a tool timeout is not an answer or approval.

Notice repeated failure and unexpected growth: the same blocker without new evidence, repeated fixes that leave the same property broken, circular argument or substantial unplanned work calls for an owner checkpoint. State the intended outcome, what was tried, what remains and the intervention needed. More messages or documents alone do not establish progress; changing roles does not reset the history. Honor an owner-specified budget without inventing one.

### Context reuse and usage

Reuse a related architect or implementer session when available. The owner relays the follow-up; it names the current revision and changed sources. Recover an unavailable session from the repository handoff rather than its transcript.

Use fresh contexts for independent review. A targeted recheck may return to its original reviewer, but is identified as a recheck. Do not poll sessions or send keep-alives merely to preserve a cache. Report available usage honestly; do not invent token counts, cache savings or subscription costs.

## Records and concise returns

The repository carries the substance; messages route the work. A finalized handoff identifies:

- the input or reviewed revision and governing records;
- the outcome and scope, with paths to the substantive result;
- verification, discriminating witnesses or mutations when owed, and limits;
- unresolved findings, obligations and pending acceptance;
- one bounded next task and its recipient, or the stopping boundary.

Record owner constraints that govern subsequent work in the owning document. Follow [documentation.md](documentation.md) for record placement and [review-findings.md](review-findings.md) for report schema, tiers and identifiers.

The closing message is normally three to five short lines: status, resulting commit or reviewed revision, record path and next action or blocker. State missing verification plainly. Read-only discovery needs no artifact for every search; the agent citing its result verifies cheap mechanical claims itself.

### Durable references and revision metadata

Use the repository's qualified addresses, such as `drag2:D-199` and `repo:RD-1`. The [record rules](../../CONTRIBUTING.md#reading-one-entry-of-a-record) require one canonical definition per identifier, claimed at `####`; headings that merely discuss an entry do not claim its ID. Link the owning document rather than inventing a heading fragment for a retitled entry.

Drag2's [contract index](../../packages/drag2/.plan/contract/00-index.md) owns its `D-`/`F-`/`Q-`/`I-` series. The [repository index](../../.plan/00-index.md) owns `RD-`/`RF-`/`RQ-`/`RI-`. Other packages retain their own registered vocabulary. Do not import a global D/F/H/Q sequence or add an H register for coordination. Allocation and local-to-canonical proposals follow `review-findings.md`.

Use SHAs and ranges to pin prompts and reviewed trees. Review artifacts record the commit actually read, as the review convention requires; an ID identifies an entry and does not replace that provenance. Preserve published evidence. Before authorized integration, ensure active handoffs remain understandable without relying solely on transient history. This grants no history-rewriting authority.

### Writes and temporary work

Respect role write boundaries. In a shared checkout, serialize source and contract changes and keep a round's reviewed tree fixed. If another writer changes it, state which review claims need rechecking. Stage only the unit's own files; preserve unrelated changes.

Save cited evidence in the owning record. The agent creating a scratch probe, build or worktree owns its cleanup after its processes finish and evidence is saved. Preserve another session's work and shared build caches. A worktree-rooted worker dispatches nothing, as [AGENTS.md](../../AGENTS.md) requires.

## Prompt format

Name the recipient outside the prompt. Use an editable writing block when the UI offers one; otherwise use a fenced text block. Keep the prompt compact: task and purpose, input revision, canonical records, new owner constraints and completion boundary. Let the role determine the solution within its authority. Do not reproduce rules and reasoning already in its inputs. Let the client wrap the prompt's prose rather than inserting line breaks inside sentences.

Every task prompt ends with its recipient stamp on the final line:

```text
— ARCHITECT
— IMPLEMENTER
— REVIEWER
— INTEGRITY
— CLEANUP
— DER
— CONSOLIDATOR
```

For an architect prompt, put `Bread rating: N/10` immediately before the stamp. It measures how much architectural reasoning the coordinator has preselected: 1/10 supplies the problem, evidence and constraints; 10/10 leaves only transcription. Aim low. Preserve an owner's concrete hypothesis as a hypothesis the architect can challenge, not a design silently chosen by the coordinator.

An implementation prompt names settled decisions and the implementation boundary. If their expression reveals a contradiction, ask for escalation rather than prescribing an improvised architecture. A review prompt asks what must hold, without prescribing a repair.

## Architecture challenges

Use a challenge sparingly, mainly for initial architecture, a new feature or a material contract change with a specific unresolved risk. It is a fresh, separate `architect` session given a bounded critical examination of named records, rather than another mandatory acceptance round.

Explicitly limit the task to counterexamples, contradictory obligations, unjustified bounds and missing discriminating evidence. Isolated probes are allowed; production code, feature tests, existing contracts and decision registers stay unchanged. The report uses the artifact path and schema from [review-findings.md](review-findings.md), with local concern labels. The authoring architect adjudicates it; the challenger does not settle its own concerns.

There is no challenger role definition or launcher profile. Start a fresh architect using [coordinator-setup.md](coordinator-setup.md), end its prompt with `— ARCHITECT`, and state these narrower task boundaries explicitly. A related recheck may reuse it; another independent opinion needs a fresh context.

## Review round

A Review Swarm is rooted at `consolidator`. Its [role definition](../../.claude/agents/consolidator.md) owns cadence and dispatch: `reviewer` on implementation handoffs, `integrity` at checkpoints and round boundaries, `cleanup` and `der` on demand. A direct feature-review session does not require a full swarm. Important checkpoints may use an independent model instead of the Claude reviewer when explicitly selected.

The consolidator launches the requested lenses in parallel, isolated from one another. Each launch selects its governed `subagent_type`, with no `name` and no model override. No pass receives a sibling's report, findings or artifact path. Do not substitute a general-purpose worker for a missing governed lens; report the missing coverage.

Keep shared context to the revision, scope and canonical inputs. Feature-proof targets go only to the reviewer; a hypothesis goes only to the lens it concerns. The other lenses must form independent questions. New rounds use fresh lenses; targeted rechecks are labelled and do not count as new independent opinions.

The consolidator validates evidence, merges supported overlaps, preserves materially different claims and proposes IDs through the owning register. It does not become a fifth general reviewer or second architect. Rejections need falsifying evidence, tiers follow consequence rather than votes, and unresolved semantics are routed. Follow [review-findings.md](review-findings.md) for report paths and schema and [handoff.md](handoff.md) for publication.

## Agent configuration

Model and effort are declared in `.claude/agents/*.md`; do not override or silently downgrade them. Use the launch and bootstrap procedure in [coordinator-setup.md](coordinator-setup.md). The guard governs Claude roles; it does not attest the owner-side Codex coordinator's work.

A changed role or resident instruction may remain stale in an existing session. Use a fresh process when verifying such a change. Role write restrictions are not proof of an unchanged production tree; establish that from the diff against the reviewed baseline. A bare `@path` in a role file is not a resident import: dependencies must be explicit read instructions.