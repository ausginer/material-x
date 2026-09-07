# harness-guard-1 — review round summary

**Consolidated 2026-09-07.** Four independent passes — `reviewer`, `integrity`, `cleanup`, `der` — over the effort guard and the B′ interactive dispatch workflow, run in parallel and blind to one another.

**Range reviewed:** `2b679844f4a166965be29cff65d8d3c8f839cc30`..`dd3fc825ad6fc03a795334ae0ee6b44ff31f6d4c`, branch `drag2/fin-review`. All four passes read files at `dd3fc825`, so the reports are mergeable.

**Question the round was called to answer:** may enforcement be enabled by default?

**Answer: not yet.** No pass found a tier A defect — nothing a correctly integrated consumer observes at runtime — but that is partly a consequence of the guard shipping in observe mode. Four findings bear directly on the flip: enforcement has no repository-visible setting point (F-356), the message the guard emits in the mode it currently runs in states something untrue (F-354), the suite does not detect the enforcement toggle being removed (F-355), and two of the six acceptance claims made for the shipped install are not supported by the log the document names as its instrument (F-353).

## Id allocation

High-water marks were read independently per prefix: `F-352`, `Q-22`, `I-37`. This round mints `F-353`..`F-372` and `Q-23`..`Q-24`. No `I-` is minted — the round established no new invariant.

## Local → canonical mapping

| Local                                         | Canonical | Tier |
| --------------------------------------------- | --------- | ---- |
| reviewer-1                                    | F-353     | B    |
| reviewer-3                                    | F-354     | B    |
| reviewer-5                                    | F-355     | B    |
| der-4 + reviewer-4                            | F-356     | B    |
| der-1                                         | F-357     | B    |
| der-2 + reviewer-9                            | F-358     | B    |
| der-3                                         | F-359     | B    |
| reviewer-2                                    | F-360     | B    |
| integrity-2                                   | F-361     | B    |
| integrity-1 + reviewer-6 (documentation limb) | F-362     | B    |
| der-5                                         | F-363     | B    |
| reviewer-7                                    | F-364     | C    |
| reviewer-8                                    | F-365     | C    |
| der-6                                         | F-366     | C    |
| der-7                                         | F-367     | C    |
| der-8                                         | F-368     | C    |
| cleanup-1                                     | F-369     | C    |
| cleanup-2                                     | F-370     | C    |
| reviewer-10                                   | F-371     | C    |
| (consolidator-derived)                        | F-372     | C    |
| der-9                                         | Q-23      | —    |
| reviewer-6 (contract limb)                    | Q-24      | —    |

Twenty-three local findings consolidated to twenty findings and two routed questions. Three merges; no finding was rejected.

## Verification status

Each finding is marked with how far consolidation independently confirmed it. **Verified** means the consolidator reproduced the mechanical witness; **reviewer-attested** means the evidence is the pass's own and was not re-derived here.

---

## Tier B

### F-353 — two acceptance claims for the shipped install have no record in the log the document names as its instrument

**Current behavior.** `harness-effort-guard.md` §"Loaded as an installed plugin" is headed as the acceptance set, and §Before enforcement concludes that enforcement "now has both results… one denied exactly what it should: a contaminated environment stopped a governed worker's tool call".

**Why it is a problem.** The document names the observation log as the instrument that establishes these claims. Two of the six do not appear in it. A pre-enforcement checklist that reports a result the instrument does not carry cannot be used to decide the flip.

**Evidence.** `poisoned && enforced` = 0 records anywhere; `cleanup` + `poisoned` = 0; the single poisoned session is `enforced:false` and carries `consolidator`+`reviewer`, not a `no-role` coordinator. All five `enforced:true` records ever are one session, all allows. **Reviewer-attested** — the log parse was not re-derived at consolidation.

**Required property.** Every claim in the acceptance set is supported by a record in the named instrument, or is marked as not yet observed.

### F-354 — the guard reports that a tool call was blocked when nothing was blocked

**Current behavior.** `verdict.ts:45-58` builds one violation message containing "The tool call was blocked because this role is running at the wrong effort." `guard.ts:186-188` writes it to stderr for every non-enforcing deny, and for every `Stop`/`SubagentStop` deny even while enforcing.

**Why it is a problem.** Observe mode is the mode the repository currently runs in, and the README promises "nothing is blocked" there. At `Stop`/`SubagentStop` there is no tool call in existence to block. The guard asserts and denies only; a denial notice that misdescribes what the runtime did is the instrument misreporting itself.

**Evidence. Verified at consolidation.** Probe with mode unset, `implementer` declaring `medium`, runtime reporting `high`: stderr carries the "tool call was blocked" text, exit 0, no `permissionDecision` emitted. Second probe with `HARNESS_EFFORT_GUARD_MODE=enforce` on a `Stop` event: same text, exit 0.

**Required property.** The message states what the guard actually did on this event and in this mode.

### F-355 — the suite does not pin the enforcement toggle, the event gate, or the hook wiring

**Current behavior.** Three single-token deletions change what the guard enforces and are invisible to the test suite.

**Why it is a problem.** These are the quietest possible regressions: each leaves the guard loaded, announcing and logging, while changing whether it blocks. `installation.test.ts`'s own stated rationale is that misconfiguration "does not fail loudly" — yet no assertion in it names a hook event.

**Evidence. Verified at consolidation by mutation testing** against a copy of the plugin (`guard`, `verdict`, `resolve-role`, `installation` suites; the launcher suite was excluded because it is path-coupled — see F-372). Removing `enforcing &&` (`guard.ts:169`), removing `input.hook_event_name === 'PreToolUse'` (`:170`), and deleting the entire `PreToolUse` block from `hooks.json` each left the suite result byte-identical to baseline. The `hook wiring` suite passes with `PreToolUse` deleted outright: its two assertions are substring checks for `${CLAUDE_PLUGIN_ROOT}/scripts/guard.ts` and for the absence of `claude-role`, neither of which names an event.

**Required property.** A change to which events the guard is wired to, or to whether a deny is applied, fails a test.

### F-356 — enforcement is env-switched with no setting point on the settled path

**Current behavior.** `guard.ts:91` reads `HARNESS_EFFORT_GUARD_MODE`. Nothing checked into the repository sets it: `.claude/settings.json` carries no `env` block, there is no `.envrc`, `.devcontainer` does not mention it, and the hooks pass only `--data-dir`.

**Why it is a problem.** Under the launcher topology the variable needed no home — the wrapper was the process boundary and the flip was a reviewable shell prefix. `39d2824d`/`ab233179` removed the wrapper: the coordinator is a flagless VS Code session and workers inherit its environment. "What remains is the mode flip itself" therefore names no artifact, and two coordinators on the same commit can disagree about whether the invariant is enforced.

**Evidence. Verified at consolidation.** The identifier occurs only in `guard.ts:91`, in documentation, and in test fixtures.

**Required property.** Whether the invariant is enforced is a property of the checkout, not of an operator's shell.

**Reported independently by `der` and `reviewer`** — convergence noted, tier unchanged by it.

### F-357 — the launcher still loads the plugin, and a test pins that it must

**Current behavior.** `.scripts/claude-role.sh:56` passes `--plugin-dir`; `tests/launcher.test.ts:84` asserts its presence.

**Why it is a problem.** `harness-effort-guard.md:81-83` states that the launcher "is no longer how the guard is loaded, and nothing about loading may depend on it" — a rule `installation.test.ts:146-153` enforces for hooks but not here. The launcher `cd`s to the checkout root, whose project settings already enable the plugin, so the diagnostic path names the plugin twice by two mechanisms.

**Evidence. Verified at consolidation** (both lines present as cited). **Gap preserved:** whether the double naming duplicates the five hooks, and so every `observations.jsonl` line, was not measured by the reporting pass and was not measured here. The log is the repository's only instrument for "was this role checked", so the consequence is bounded but unestablished.

**Required property.** The diagnostic does not participate in loading, or the stated rule is amended to admit that it does.

### F-358 — the plugin README claims the tests load it via `--plugin-dir`; none does

**Current behavior.** README §Installation, line 70: "`--plugin-dir` still works and is what the tests use."

**Why it is a problem.** A maintainer reading the README to learn how the guard is exercised is told the wrong thing about the only mechanism the document offers for reproducing a load.

**Evidence. Verified at consolidation.** `guard.test.ts:39` spawns `node <scripts>/guard.ts` directly with stdin payloads. The sole `--plugin-dir` in the entire test tree is `launcher.test.ts:84`, an assertion about the launcher's own printed argv under `CLAUDE_ROLE_PRINT_ARGV=1`, where the launcher never execs.

**Required property.** The README describes how the tests actually load the plugin.

**Tier disagreement resolved.** `der` filed this B, `reviewer` filed it C. Assigned **B by consequence**, not by vote: the tier table places a false statement that can mislead a correct integrator at B, and this one misdescribes the loading mechanism. The disagreement is recorded so it can be argued with.

### F-359 — "resume remains unobserved" survives the commit that observed it

**Current behavior.** `harness-effort-guard.md:177` and §Before enforcement both state that resume is unmeasured. That wording is verbatim from `ed0fbe5c`, where "resume" meant topology A's `-p --resume`. Lines 148-153 of the same file record `ab233179`'s B′ measurement: a resumed worker checked at `PreToolUse` and at both `SubagentStop`s under one `agent_id`.

**Why it is a problem.** §Before enforcement is the pre-flip checklist. It currently carries an unknown the same document has closed, which either blocks the flip for no reason or teaches the reader to discount the checklist.

**Evidence.** Reviewer-attested, with the document's own two passages as the witness.

**Required property.** The checklist's open items are the items that are actually open.

### F-360 — the claim that no event names the acting model is false

**Current behavior.** §Known limits reasons from an absolute negative: no event names the acting model, at the decision point or anywhere else.

**Why it is a problem.** The narrow negative — no _effort-bearing_ event names it — does hold, and is enough to support the design. The absolute one is false, and it is the premise the document uses to argue the invariant cannot key on anything but a declaration.

**Evidence. Partially verified at consolidation.** This session's own `SessionStart` context read `Effort guard active. Role consolidator declares effort medium.`, and `.claude/agents/consolidator.md` declares `model: opus`, `effort: medium`. The per-event counts — `SessionStart` 2/20, `PreToolUse` 0/165, `SubagentStart` 0/9, `SubagentStop` 0/9, `Stop` 0/22 — are reviewer-attested and were not re-derived.

**Required property.** The limit is stated at the scope the evidence supports.

### F-361 — worktree checkouts are unguarded, and the bootstrap contract does not reach them

**Current behavior.** `harness-effort-guard.md` says `claude plugin marketplace add ./` is run "once per machine" and frames loading as checkout root (guarded) versus subdirectory (unguarded). Worktrees are never mentioned.

**Why it is a problem.** A worktree is a distinct checkout root with its own settings, not a subdirectory, so "per machine" does not reach it. A session started in one is ungoverned, and an unchecked session is indistinguishable from a clean one — precisely the hazard `AGENTS.md` §"Before dispatching a governed worker" exists to close.

**Evidence. Verified and broadened at consolidation.** `.claude/worktrees/agent-a4d0ec4ad722d3a16` has `.claude/settings.json` enabling only `typescript-lsp@claude-plugins-official`, no `.claude-plugin/` directory at all, and holds three of the eight current role definitions. **Two corrections to the reporting pass's evidence:** it stated four of eight role files were missing; five are. And `git worktree list` shows four further worktrees — `/tmp/ql1-A`, `/tmp/ql1-B`, `/tmp/ql1-C`, `/tmp/ql1-base`, plus `/tmp/wt-31ac5204` — outside the checkout root entirely, which the "subdirectory" framing does not describe either. The claim stands; the count did not.

**Required property.** The bootstrap contract states what a worktree-rooted session must do, or dispatch from one is refused.

### F-362 — the dispatch gate omits a governed role it governs

**Current behavior.** `AGENTS.md` states its pre-dispatch gate "binds the dispatch of `architect`, `implementer`, `reviewer`, `integrity`, `cleanup` and `der`" — six roles. `harness-effort-guard.md:197-199` lists the governed set as seven, explicitly including `consolidator`.

**Why it is a problem.** `consolidator` is structurally identical to the six that are gated (`model: opus`, `effort: medium`) and is actively dispatched — this round's consolidation is such a dispatch. `AGENTS.md`'s checklist gives no textual instruction to verify the guard is loaded before dispatching it.

**Evidence. Verified at consolidation.** The string `consolidator` occurs zero times in `AGENTS.md`; `.claude/agents/consolidator.md` declares `model: opus`, `effort: medium`.

**Required property.** The set the gate binds is the set the guard governs. Which dispatch class `consolidator` belongs to is a separate question — Q-24.

### F-363 — the coordinator is a permanently ungoverned actor and its constraint has no mechanism

**Current behavior.** `verdict.ts:82-84` allows unconditionally when no role is acting. The rule that the coordinator does no repository implementation is prose in two documents, with no runtime, test or hook behind it.

**Why it is a problem.** The README's trust claim — a run is trusted only when every governed role that acted appears, and appears at all — was written when every actor was a role. `39d2824d` introduced a permanent ungoverned actor that is also the session a person types into. A coordinator turn that edits files is indistinguishable in the log from one that only dispatched, so the log now answers "did all _role_ work happen at declared effort", not "did all repository work".

**Evidence.** Reviewer-attested, with the cited `verdict.ts` branch verified at consolidation.

**Required property.** Either the constraint is mechanized, or the trust claim is restated at the scope the log can support.

---

## Tier C

### F-364 — unparseable stdin crashes before the guard's own error handling

`guard.ts:88` parses stdin outside the `try` that begins at `:103`. **Verified at consolidation:** feeding `not json` produced an unhandled rejection, a stack trace, and no log line — so an unchecked call is indistinguishable from one that never happened, which is exactly the hazard the `:99-102` comment guards against for resolution. **Required property:** every invocation either produces a verdict or leaves a record that it could not.

### F-365 — the guard-error announcement drops the literal gate string

`AGENTS.md` keys dispatch on seeing `Effort guard active`. The error branch of `announcement()` omits that string, and the documented remedy — marketplace add, then restart — cannot fix a broken definitions tree. The coordinator path is narrow (requires `CLAUDE_PROJECT_DIR` unset) but the branch is reachable at `SubagentStart`. Reviewer-attested. **Required property:** the string the gate is keyed on is present whenever the guard is loaded, or the gate is keyed on something the guard always emits.

### F-366 — the `resolve-role.ts` CLI and its hardening now serve only a diagnostic

The `import.meta.main` block (`:242-276`) with exit codes 64/66/67/68, the `<root>\t<effort>` separator contract, the last-tab split hardened in `4896a35f`, `CLAUDE_ROLE_PRINT_ARGV`, and nine `launcher.test.ts` cases — three pinning the separator alone — all exist to decide, before a session exists, whether to pass `--effort` on a main thread. `39d2824d` chose a topology in which no role runs on a main thread. `resolve-role.ts:151-160` still justifies the shared root-finder by keeping "the launcher's pre-session answer and the hook's in-session answer" from diverging — now a divergence between a hook and a diagnostic. The largest concentration of machinery in the change whose reason is gone. Reviewer-attested with commit citations. **Required property:** machinery retained after its justification expires is retained for a stated current reason.

### F-367 — the `Stop` hook's enforcement justification cannot apply to any governed role

`hooks.json` is untouched since `ed0fbe5c` (**verified at consolidation** by `git log` on the path), so the event set was fixed under the first topology and never revisited across two topology changes. Its documented reason — retrospective invalidation of a governed role's tool-less turn, measured with a main-thread `--agent` — cannot arise under B′: governed roles are subagents covered by `SubagentStop`, and the main thread is the roleless coordinator, so `Stop` yields only `no-role, allow`. **Verified at consolidation:** `guard.test.ts` contains no `Stop` or `SubagentStop` case at all. Converges with F-355 on the same untested surface. **Required property:** each wired event has a reason that holds on the settled topology.

### F-368 — dissolved open questions are still carried as open, under a heading naming the losing topology

Three of five §Open questions items are unaskable on the settled path: the finding-5 haiku cache miss (about re-supplying `--effort` on `-p --resume`), role-session lifetime before compaction, and compacted A worker sessions — while finding 23 establishes that subagents neither auto-compact nor accept the command. `39d2824d` rewrote the surrounding document and left the list; the H1 of `harness-orchestration.md` still reads "Harness orchestration — persistent role sessions". Reviewer-attested. **Required property:** a current-state document states the current state (`documentation.md` §1).

### F-369 — the haiku exemption rationale is stated twice in near-verbatim prose

The `EFFORTLESS_MODEL` JSDoc in `resolve-role.ts:36-39` and `README.md:15` both argue that the match is literal — not a prefix, alias, family or capability lookup — in independent prose with no cross-reference. **Verified at consolidation.** `documentation.md` §3 is one copy. **Required property:** the rule has one home.

### F-370 — the `--data-dir` fallback is unreachable from every real caller

`guard.ts:90` falls back to `join(tmpdir(), 'harness-effort-guard')`. **Verified at consolidation:** `hooks.json` passes `--data-dir` on all five wired events (five occurrences), and every `guard.test.ts` case passes it explicitly. The branch is untested and undocumented, unlike `resolve-role.ts`, which documents its bare-CLI mode as a second supported interface. **Required property:** a branch no caller reaches is removed, or a caller that reaches it is documented.

### F-371 — the two-start bootstrap is asserted but not distinguishable from the user-scope entry alone

`known_marketplaces.json` holds only the absolute `/workspaces/material-x` entry, timestamped 663 ms before the first marketplace-scoped record; no record exists in either log between 18:53 and 20:35 despite the project-settings entry landing at 20:16. The pass could not reproduce the two-start sequence — an isolated-`CLAUDE_CONFIG_DIR` probe cannot authenticate, and `claude plugin list` performs no session-start reconciliation. **This is an evidence gap, not a defect claim.** Consequence is bounded: the `AGENTS.md` rule is conservative under either reading, so the stated bootstrap prerequisite is safe whether or not the two-start mechanism is what makes it necessary. **Required property:** the runtime behaviour the bootstrap contract rests on is either demonstrated or stated as inferred.

### F-372 — the installation suite's checkout assertions are path-coupled (consolidator-derived)

**Raised at consolidation, not by any pass.** Six of the nine `installation.test.ts` cases fail when the plugin directory is copied elsewhere — `should enable the guard against the repository marketplace`, `should declare the marketplace as a local directory`, `should locate the marketplace by a relative path`, `should point at a directory that holds the marketplace manifest`, `should list the guard`, `should source the guard from the plugin directory in this checkout` — because they read `.claude/settings.json` and `.claude-plugin/marketplace.json` by a path relative to the plugin's grandparent. `launcher.test.ts` fails the same way, spawning `.scripts/claude-role.sh` resolved against the relocated root. All nine pass in the real checkout.

This is recorded because it converges with F-361: the same relative-path assumption that makes the suite unrunnable outside the checkout is the assumption that leaves worktree roots unguarded. It is tier C on its own — the suite is correct where it runs, and nothing consumer-observable depends on it. **Required property:** whether the suite is intended to be checkout-bound is stated, so a worktree or relocated run is a known result rather than a surprise.

---

## Routed to the architect

The consolidator settles no design question and mints no `D-*`. Both items below were raised by a pass that declined to answer them, and consolidation agrees they are not answerable on evidence.

### Q-23 — Is the coordinator the person, or the Claude session?

`harness-orchestration.md` §Choosing turns the entire B′ decision on a person: "B′ is the choice, because the coordinator is a person." `agent-workflow.md` and `CLAUDE.md` identify the coordinator as the Claude session. `dd3fc825` built the dispatch gate on the second reading — `guard.ts:44-50` emits `Effort guard active` as `hookSpecificOutput.additionalContext`, which is model context, readable by the session and not by the person — and `AGENTS.md` makes seeing it the precondition for dispatch.

Under the first reading the precondition is unobservable by the party it binds. Root `README.md` telling a human to run the bootstrap unconditionally is what currently keeps the consequence bounded. **This is a contract question, not a factual one:** the two documents are each internally coherent, and the evidence does not separate them — it establishes only that the gate mechanism matches one of the two. Raised by `der` as der-9.

### Q-24 — Which dispatch class does `consolidator` belong to?

`consolidator` is governed (`effort: medium`), actively dispatched, and absent from the `AGENTS.md` enumeration that binds the bootstrap precondition, from `CLAUDE.md`'s named-generational-versus-one-shot split, and from the `agent-workflow.md` retirement table. F-362 records the gate omission as a defect because that limb is factual. Whether `consolidator` is a resumable named worker or a fresh one-shot — and therefore what the retirement table should say — is a design choice about the round's own topology. Raised by `reviewer` as reviewer-6, which explicitly declined to answer it.

---

## Coverage and silence

Recorded from each pass's own lens and boundaries, never from what another pass happened to cover.

**`reviewer`** covered all 24 files, all four guard scripts line by line, the suite (72 pass, 0 fail on Node v26.7.0), the guard driven across 14 synthetic hook states, and both observation logs (249 records) cross-checked against every measurement claim. Its own question — does the implementation prove the contract, and are the live acceptance claims true — left three areas silent: the two-start bootstrap could not be reproduced because an isolated-config probe cannot authenticate; whether a _coordinator's_ `SessionStart` context is rendered was not established (only `SubagentStart` delivery, from inside its own session); and `/effort`, `/compact` and resume were not exercised. It verified clean, with no finding: that the guard never repairs, retries or rewrites (its only write is the append-only log, wrapped so it cannot throw); roleless resolves to `no-role` and allows; literal `haiku` is exempt while `claude-haiku-4` is not; `.claude/agents/*.md` is the only effort source and the resolver reads no environment; no hook references the launcher.

**`integrity`** covered role frontmatter consistency across all eight definitions, the three-file plugin-loading chain, `.oxlintrc.json` scoping, README and launcher framing, and the worktree state. Its question — does the repository remain coherent outside the change — was answered with two findings and an explicit null result for the rest of that surface. It did not start a live session, so no hook output was reproduced, and nested two-or-more-level subagent chains and VS Code-specific behaviour beyond the documents' own claims were not tested.

**`cleanup`** covered the plugin scripts, hooks, README, the six test files, `.scripts/claude-role.sh`, `.oxlintrc.json` and `tsconfig.json`, against `CONTRIBUTING.md`. Its question — machinery the responsibility does not require — returned two tier C findings and, importantly, a set of explicit no-defect results, so that silence in those places is a reading rather than an omission: the combined try/catch in `guard.ts` is a real correctness boundary for a `PreToolUse` hook; both `throw` cases in `resolveRole` are real defects in the one namespace the guard owns; `verdict.ts`'s union is sized to the actual seven-row decision table rather than being a generic dispatcher; and it found **no topology-A residue** — no UUID, locking or `-p` router machinery — anywhere in the plugin, hooks or settings, the retired vocabulary surviving only in the explicitly historical record. It did not review the role definitions themselves, the plugin loader's runtime behaviour, or reproduce the orchestration measurements.

**`der`** covered all eleven commits individually, both directions of the forward and inverse passes, the whole plugin, the launcher, the manifests and the prose across six documents. Its question — what justification expired as the architecture moved — returned nine findings; the forward pass did **not** find nothing. It examined and cleared the haiku exemption and its literal keying, `isAbsence` fail-closed behaviour, the `CLAUDE_CODE_EFFORT_LEVEL` deny (which `39d2824d` consciously re-derived under B′ and found _more_ important, not less), the `PostToolUse` exclusion from `EFFORT_BEARING`, the `.oxlintrc.json` `node:test` override, and `installation.test.ts`. It started no Claude Code session, so nothing it reports is a runtime measurement — F-357's consequence is explicitly unverified — and it did not cover `.claude/agents/*.md` beyond the `model:`/`effort:` fields, `packages/`, or the accounting measurements.

## Consolidation notes

**No finding was rejected.** Every claim submitted was either verified, merged, or preserved with its evidence gap stated. Nothing was falsified by evidence, and nothing was dropped for weakness — the rejection bar is falsification, not doubt.

**Three merges.** F-356 (`der`+`reviewer`), F-358 (`der`+`reviewer`), F-362 (`integrity`+`reviewer`). In each case both passes described the same defect with the same witness; the broader statement of scope was preserved. Convergence did not raise any tier: F-356 and F-358 are tiered by consequence alone, and the fact that two lenses reached them is recorded as corroboration, not as severity.

**One tier disagreement resolved on the tier table, and stated** — F-358, filed B by `der` and C by `reviewer`. No disagreement was resolved by preference. Where the passes' evidence did not separate a question, it was routed rather than settled: Q-23 and Q-24.

**Two evidence corrections** were made to reporting passes and are recorded in the findings themselves rather than silently applied: the worktree role-file count in F-361 (five missing, not four), and the broadening of the same finding to the five worktrees outside the checkout root.

**One finding is consolidator-derived** and marked as such — F-372 — arising from a mechanical result obtained while validating F-355. It is recorded rather than absorbed because it converges with F-361 on a shared cause: a relative-path assumption about where the checkout root is.
