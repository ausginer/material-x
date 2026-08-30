# Instruction residency: what every agent pays before it starts

**Decided 2026-08-30 against `771ee944`** on `drag2/fin-review`, on an owner request to reduce what the review lenses consume. The repository-scope answer is [`.agents/docs/documentation.md`](../../../../../.agents/docs/documentation.md) §3, which states the model and carries no numbers. This record carries the numbers.

**Nothing in production was changed.** The change is markdown: the resident set, the role definitions, three new routed chunks, and the documentation model that governs them.

## 0. Verdict

**Residency is charged to every role the harness starts, so a rulebook prepended for the roles that apply it is also prepended for the roles that never open it.** Four of the five review lenses need `CONTRIBUTING.md` neither resident nor entire, and all seven roles were additionally loading `agent-workflow.md` whole to extract the two or three sentences that were their own.

The replacement is a **manually-routed knowledge base**: a small always-prepended bootstrap, self-contained role definitions that act as the router, and chunks retrieved at a named trigger. Its one advantage over learned retrieval is that reachability is deterministic and auditable — which is also its one new failure mode, since a chunk no role names is unreachable in a way no fallback recovers.

## 1. What a role paid before

| File                | chars       | How it arrived                                               |
| ------------------- | ----------- | ------------------------------------------------------------ |
| `CLAUDE.md`         | 1,739       | resident                                                     |
| `AGENTS.md`         | 6,243       | resident, via `@AGENTS.md`                                   |
| `CONTRIBUTING.md`   | 38,094      | resident, via `@CONTRIBUTING.md` from `AGENTS.md`            |
| `agent-workflow.md` | 6,611       | read by all seven roles on the first line of every role body |
| role body           | ~300        | the role definition itself                                   |
| **per role**        | **~52,990** | ≈ 13,250 tokens                                              |

A five-lens round paid it five times, as a fresh cache write each time: **~66,000 tokens before any pass read a line of code.**

## 2. What a role pays now

Resident: **3,988 chars** for `CLAUDE.md` + `AGENTS.md`, against 46,076 — a **91% reduction in residency**.

| Chunk                                            | chars |
| ------------------------------------------------ | ----- |
| `review-findings.md`                             | 2,686 |
| `handoff.md`                                     | 2,830 |
| `agent-workflow.md` (no longer read by any role) | 4,634 |

| Role           | resident | body  | retrieved                                        | total chars | ≈ tokens |
| -------------- | -------- | ----- | ------------------------------------------------ | ----------- | -------- |
| `reviewer`     | 3,988    | 1,413 | findings 2,686 + handoff 2,830 (+ a §, ~1,000)   | ~11,917     | ~2,980   |
| `integrity`    | 3,988    | 1,548 | 2,686 + 2,830                                    | 11,052      | ~2,765   |
| `der`          | 3,988    | 2,365 | 2,686 + 2,830                                    | 11,869      | ~2,965   |
| `consolidator` | 3,988    | 2,660 | 2,686 + 2,830 (+ a §, ~1,000)                    | ~13,164     | ~3,290   |
| `cleanup`      | 3,988    | 1,592 | 38,000 + documentation §5 ~2,000 + 2,686 + 2,830 | ~51,096     | ~12,775  |

**Five-lens round: ~66,000 → ~24,800 tokens (−62%). Without `cleanup`: ~53,000 → ~12,000 (−77%).** `cleanup` is 52% of what remains, and that share is irreducible — it is the one lens whose job is applying the whole rulebook.

**The estimates in the approved plan were optimistic and the measured figures are lower-value.** The plan projected −72% and −87%; the chunks came in larger than estimated, `handoff.md` by 2.4× (2,830 chars against a projected ~1,200). The design is unchanged; the arithmetic is corrected here rather than in the rulebook, which carries no numbers.

## 3. Two facts that were verified rather than assumed

**A bare `@path` inside a role definition is not expanded.** It stays literal text. There is therefore no per-role import and no way to give one role residency another does not have; a role states its dependencies as read instructions. This is why the resident set is a single global set and why shrinking it is the only lever available.

**Section-addressable retrieval works, and it must not depend on adjacency.** _Consult §13_ degrades into a whole-file read unless the role says how. `CONTRIBUTING.md`'s headings are uniform and its numbering permanent, so a section has a stable address — but terminating at a named successor would make permanent numbering require permanent adjacency. Terminating at the next heading of the same or higher level does not:

```
awk '/^## 13\. /{f=1;print;next} f && /^#{1,2} /{exit} f' CONTRIBUTING.md
awk '/^### 1\.1 /{f=1;print;next} f && /^#{1,3} /{exit} f' CONTRIBUTING.md
```

Verified on three shapes: `§13` → 992 chars, `§1.1` → 6,135 (stopping correctly at `### 1.2`), `§18` → 1,171 (adjacent to a level-1 heading and terminating on it). **Savings vary by an order of magnitude** — §13 is a 38× reduction against the file, §1.1 only 6× — so _retrieve the section_ is worth much more for some sections than others, and is never worth less than the file.

## 4. The retrieval floor is an estimate, not a measurement

The rule that content too small to pay for its own retrieval goes inline in the role is durable. **The threshold behind it is not measured.** The working figure used while sizing this change was ~150 tokens, derived from the framing cost of a tool call and its result, not from an experiment. It is recorded here and deliberately kept out of `documentation.md` so that a later pass measures it rather than inheriting it as a rule.

The Material X component rules — the `src/button` reference layout, `just debug`, and the obligation to keep `packages/material-x/files.json` matching the runtime entrypoints — were written as a 567-char chunk and are inline in `implementer` and `integrity` instead. That is the threshold case resolving the way the rule says it should.

**The `files.json` rule is stated twice on purpose, and the duplication is not the kind the floor rule warns about.** `implementer` carries it as an obligation; `integrity` carries it as a thing to verify. A shared chunk would have handed both roles the _same sentence_, which makes the check a re-reading of the source of truth rather than an independent one. Two separately worded statements are what independent verification means here, and the cost is two sentences.

## 5. The condition that would split `handoff.md`

Hygiene (format, lint, typecheck) and commit mechanics have different triggers, and the implication runs one way: committing implies hygiene, hygiene does not imply committing. They are one chunk because under this repository's stated policy **every role commits its own finalized unit**, which empties the hygiene-only case; splitting would create a commit chunk never fetched alone and charge every committing role a second retrieval.

**If practice settles on the lenses handing findings back for the consolidator to commit, hygiene-only becomes the common case and the file splits.** At 2,830 chars it is the largest non-rulebook chunk and the four lenses retrieve it whole, so the split is worth re-examining against what a round actually does rather than what the policy says it does.

## 6. What was rejected

- **Splitting Part I back out to `.agents/docs/code-style.md` and keeping it resident.** It would have preserved the _code style is applied without being consulted_ property for the root session at ~1,400 tokens. Rejected: it reverses a merge made four days earlier, and the citation surface is Part II's, so the split buys residency for the one part nothing cites.
- **A catch-all `workspace.md` / `running.md`.** Its contents had three consumer sets and three load times, which is the definition of a bucket rather than a chunk. Dissolved: the hygiene loop into `handoff.md`, the component rules into their own chunk, `npm i` inline in `implementer`.
- **A resident routing table with one row per document.** Residency creep: a specialized role names its own chunks, so the only reader who needs a map is the role-less root session, and it needs subjects rather than paths.
- **Inlining the tier vocabulary into each lens.** Five copies of the one vocabulary whose entire job is being consistent across five passes.
- **Chunk headers enumerating their reader roles.** A second store of the `role → chunk` graph, and therefore a consistency problem rather than a witness. The edges live only in the role definitions; _who reads this_ is derived.

## 7. What this costs

**The root session loses code style as resident context.** `CLAUDE.md` + `AGENTS.md` is the root session's role definition, and it makes ad-hoc edits without spawning `implementer`. Part I was previously impossible to miss; it is now a read instruction, weaker by exactly the amount the withdrawn §3 wording said it was. Accepted because the obvious mitigation — a short resident style checklist — recreates the two-drifted-copies failure the documentation model exists to prevent, and a drifted copy fails silently where a missed read does not.

**A chunk can no longer be audited from its own side.** Reading `handoff.md` does not reveal who depends on it, so deleting a role can orphan a chunk with nothing on the page to show it. The routing-graph check in `documentation.md` §7 replaces that safeguard, and it is a check someone runs rather than a property someone sees. No instrument implements it yet.

## 8. The behavioural check cannot be run in the session that makes the change

The static properties — no bare `@CONTRIBUTING.md` in the chain, no role naming `agent-workflow.md`, every chunk reached by at least one role, every named path resolving, each moved rule with exactly one home — are all checkable in place and hold.

**The end-to-end check is not.** Spawning `der` and `cleanup` immediately after the change returned the pre-change state: both reported `CONTRIBUTING.md` inlined in their system prompt, and `cleanup` read `agent-workflow.md`, which is the instruction its previous definition carried. A session caches the resident instruction set and the role definitions at start, and the stale version persists for minutes rather than resolving on a useful timescale; a freshly started process picks the change up immediately.

So _which chunks a role actually loads_ is verifiable only from a session started after the change. A pass that reports the behavioural check as passing from inside the session that made it has measured the old arrangement.
