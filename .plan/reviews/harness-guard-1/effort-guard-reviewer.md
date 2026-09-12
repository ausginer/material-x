# Effort guard and B′ dispatch — feature proof

**Commit files were read at:** `dd3fc825ad6fc03a795334ae0ee6b44ff31f6d4c` (branch `drag2/fin-review`, tree clean at read time). Scope reviewed: `2b679844` (exclusive) → `dd3fc825` (inclusive).

**Lens:** does the implementation prove the settled contract, and are its live acceptance claims true?

## Scope

**Covered.** All 24 files in the change. The four guard scripts read line by line. The five test files read and executed (`node --test 'tests/*.test.ts'` from the plugin directory on Node v26.7.0 — **72 pass, 0 fail**). The guard driven with synthetic hook input across 14 states: enforce/observe × PreToolUse/Stop/SubagentStop/SessionStart/SubagentStart/PostToolUse, mismatch, poisoned env, undeclared role, exempt role, haiku+effort defect, unreadable domain, unparseable and empty stdin. `.claude/agents/*.md` frontmatter enumerated. Both live observation logs (`~/.claude/plugins/data/harness-effort-guard-{inline,material-x}/observations.jsonl`, 249 records total) parsed and cross-checked against every measurement claim in `.agents/docs/harness-effort-guard.md`. Installed marketplace and plugin state inspected (`known_marketplaces.json`, `installed_plugins.json`, user and project `settings.json`).

**Not covered — silent, not clean.**

- **The two-start bootstrap mechanism could not be reproduced.** A probe with an isolated `CLAUDE_CONFIG_DIR` and a minimal checkout copy could not authenticate (`Not logged in`), and `claude plugin list` performs no session-start marketplace reconciliation. Reproducing it would require either copying credentials or mutating the owner's real config, both out of bounds for this pass. See `reviewer-10`.
- **Subdirectory-session loading** (`harness-effort-guard.md` §How it loads, "Loading is scoped to the repository root") — an absence claim, unfalsifiable from artifacts, not reproduced for the same reason.
- **Whether a coordinator's `SessionStart` `additionalContext` is actually rendered into the coordinator's context.** I confirmed from inside this session that `SubagentStart` context is delivered (this subagent received `Effort guard active. Role reviewer declares effort high.`), and that the hook emits the coordinator string correctly, but I cannot observe a main-thread session's context from a subagent.
- `/effort` mid-session, `/compact` and resume — the doc already states these are unobserved; I did not observe them either.
- Not reviewed: whether the workflow prose is the _right_ design (that is the architect's call), and the non-guard content of `harness-orchestration.md` (read for cross-references only).

**Null areas that are genuinely clean.** The four contract items below were verified and hold, with no finding: the guard never repairs, retries, reruns or rewrites anything (the only write outside stdout is the append-only log in `observe.ts`, wrapped so it cannot throw); a roleless session resolves `no-role` and allows (verified in code, in tests, and in 20 live records); literal `haiku` is exempt while `claude-haiku-4` is not (tested and probed); `.claude/agents/*.md` is the only effort source and the resolver reads no environment; `.scripts/claude-role.sh` is referenced by no hook and `installation.test.ts` pins that.

## Findings

### reviewer-1 — Tier B — Two of the six acceptance claims for the shipped loading configuration have no supporting record in any observation log, including the only claimed demonstration that enforcement blocks anything

**Current behavior / contract.** `.agents/docs/harness-effort-guard.md` §Measurements → "Loaded as an installed plugin" (lines 137–175) is headed "the acceptance set for the dispatch model in `agent-workflow.md` §Dispatch", taken "with the plugin loaded from project settings and **no `--plugin-dir` anywhere**". §Before enforcement (lines 204–209) concludes from it: "Enforcement is still a deliberate flip, and it now has both results. One enforcing session ran clean, and one denied exactly what it should: a contaminated environment stopped a governed worker's tool call while leaving the coordinator alone."

**Why it is a problem.** §Before enforcement is the document that decides whether to turn enforcement on, and it states "Nothing outstanding blocks it" on the strength of these results. Two of them are not in the log the document itself names as the instrument ("A run is trusted only when every governed role that acted appears… an absent role was not checked").

**Evidence / reproduction.** Both live logs parsed (249 records; the two are byte-identical across `/agents/claude`, `/home/dev` and `/home/node`, which are the same store; a filesystem-wide `find / -name observations.jsonl` located no others).

| Doc claim | Log evidence |
| --- | --- |
| "An ordinary session loads it, and the coordinator is not governed" | **Backed.** `material-x` sessions `219b200c` and `92445abf`, 2026-09-06T20:35, each `SessionStart` + `Stop`, no `agent_type`, `resolution: no-role`, `allow` |
| "A governed worker is checked, and a resumed one is checked again… under one `agent_id` across the resume" | **Backed, but in the `inline` data dir** — session `1b988843`, `cleanup` `agent_id a21d0b61fd6cdc77b`, `SubagentStop` at 18:51:15 and 18:52:57, both `declared=medium actual=medium match`. Not the directory-marketplace install this change ships |
| "The haiku exemption holds through the normal path. An `Explore` worker resolved `exempt` and allowed at **both its `PreToolUse` events** and its `SubagentStop`" | **No record.** All three `exempt` records anywhere are `inline` session `e0e45dcc` at 17:41 — one `SubagentStart`, **one** `PreToolUse`, one `SubagentStop` — under a `--agent architect` **main-thread** parent, i.e. the launcher path, not the coordinator dispatch model |
| "A contaminated environment stops a governed worker acting. With `CLAUDE_CODE_EFFORT_LEVEL=low` and enforcement on, `cleanup` … denied with `poisoned-env` and **the tool never ran**… The coordinator's own turns were allowed as `no-role` throughout" | **No record.** `poisoned && enforced` = **0 records anywhere**. `cleanup` with `poisoned` = 0. `actual: "low"` appears twice, both `integrity`/`Stop`/`mismatch`. The only poisoned session is `inline` `cc91208a` at 15:54 — `enforced: false` (observe mode), roles `consolidator` (main thread) and `reviewer`, not a `no-role` coordinator and not `cleanup` |
| "Subdirectory sessions load nothing" | Absence claim; not falsifiable from artifacts |
| "Lifecycle events produce no verdicts" | **Backed.** 0 verdict records for `SessionStart`/`SubagentStart` across all 249 |

Every `enforced: true` record in existence (5) is from the single 17:41 `inline` session, and all five are `allow`. **No enforcing session has ever produced a denial**, and no session at all has run under the shipped directory-marketplace install with a governed worker before 2026-09-07 — the `material-x` log's 09-06 content is four `no-role` records and nothing else.

Caveat stated deliberately: a log could have been pruned, or a run taken under a config dir I did not find. The `material-x` file is contiguous from its first record (20:35:40.122Z) which is 0.66 s after the marketplace registration timestamp in `known_marketplaces.json` (20:35:39.459Z), so nothing was truncated from its head.

**Required property.** A measurement section that the enforcement decision rests on must correspond to records the named instrument actually holds, or must say which claims are recollected rather than logged, and under which install identity each was taken.

### reviewer-2 — Tier B — "No event names the acting model, at the decision point or anywhere else" is false; `SessionStart` names it

**Current behavior / contract.** `harness-effort-guard.md` §Measurements (lines 112–122): "**No event reports the acting model, the decision point included.** … Across a `SessionStart`, four `PreToolUse`, a `SubagentStart`, a `SubagentStop` and a `Stop`… **no record carries a model**. The negative stands". §Known limits of the exception (lines 218–224) then reasons from it: "no event names the acting model, at the decision point or anywhere else, so there is nothing to hold a declaration against."

**Why it is a problem.** §Known limits presents the absolute negative as the reason the exemption can only be keyed to a declaration. The narrow claim (no _effort-bearing_ event names it) is true and is what the argument needs; the absolute one as written is contradicted by the repository's own log, including by a record written at the reviewed commit.

**Evidence / reproduction.** Model-field presence per event across both logs:

```
event           total   with model
SessionStart       20            2
PreToolUse        165            0
SubagentStart       9            0
SubagentStop        9            0
Stop               22            0
```

The two positives:

```
{"kind":"announcement","at":"2026-09-07T07:45:45.903Z","event":"SessionStart",
 "session_id":"4e2cb2f6-…","agent_type":"consolidator","model":"claude-opus-5",
 "declared":"medium","resolution":"declared",…}
{"kind":"announcement","at":"2026-09-06T18:51:42.632Z","event":"SessionStart",
 "session_id":"1b988843-…","model":"claude-opus-5[1m]","resolution":"no-role",…}
```

The first is from the current session at `dd3fc825`, and it names a model _for an acting role_ (`consolidator`, declared `model: opus`). The field is intermittent (2 of 20), so "cannot be relied upon" is sound; "no event names it anywhere" is not.

**Required property.** A documented runtime negative must be stated at the scope it was observed at. Where a design rationale rests on it, the scope the rationale needs must be the scope stated.

### reviewer-3 — Tier B — In the shipped default (observe) mode, and on `Stop`/`SubagentStop` in any mode, the guard reports "The tool call was blocked" when nothing was blocked

**Current behavior / contract.** `verdict.ts:45–58` builds one `violationMessage` used for every deny, whose closing line is `The tool call was blocked because this role is running at the wrong effort.`. `guard.ts:186–188` writes that message to stderr for any deny that is not an enforcing `PreToolUse`. The plugin README §Modes says of any non-`enforce` mode "nothing is blocked", and §What it can and cannot prevent says of `Stop`/`SubagentStop` "Those events report and never block".

**Why it is a problem.** Enforcement is off by default and this change is the gate before turning it on, so observe mode is the mode the repository is currently running in. Every denial it emits asserts an action it did not take. On `Stop`/`SubagentStop` the statement is doubly wrong: those events are not tool calls at all. An operator reading stderr or a transcript cannot distinguish a real block from a reported one without also reading `enforced` in the log.

**Evidence / reproduction.** Probe against a fixture project declaring `architect` at `effort: high`:

```
$ echo '{"hook_event_name":"PreToolUse","session_id":"s","cwd":"/","agent_type":"architect","effort":{"level":"medium"}}' \
  | env -u CLAUDE_CODE_EFFORT_LEVEL -u HARNESS_EFFORT_GUARD_MODE CLAUDE_PROJECT_DIR=$P node guard.ts --data-dir $P/data
Harness effort invariant violated.
…
The tool call was blocked because this role is running at the wrong effort.
[exit=0, no permissionDecision emitted — the call proceeds]
```

Same message on `hook_event_name: "Stop"` with `HARNESS_EFFORT_GUARD_MODE=enforce`, again with no `permissionDecision`. The recorded log line is correct (`enforced: false`); only the human-facing message is not.

**Required property.** What the guard reports about its own action must match what it did. A verdict that was computed but not applied must not be described as applied, and a message emitted for a non-tool event must not claim a tool call.

### reviewer-4 — Tier B — Enforcement has no wired or documented place to be switched on under the shipped no-flags dispatch model

**Current behavior / contract.** `guard.ts:91` reads `process.env.HARNESS_EFFORT_GUARD_MODE`. `harness-effort-guard.md:5–8` says "what remains is the mode flip itself"; :183 says "Setting `HARNESS_EFFORT_GUARD_MODE=enforce` starts denying. Nothing outstanding blocks it."

**Why it is a problem.** The change removes the launcher from the normal path — `harness-effort-guard.md` §The launcher is a diagnostic, `CLAUDE.md` §Dispatching roles — and the launcher was the only artifact that could have carried session environment. The coordinator is now "the VS Code window, started with no `--agent`" (`agent-workflow.md` §Dispatch), which inherits whatever environment VS Code was started with. Nothing in the change says where the flip lands, and the file that carries every other piece of the loading configuration has no place for it.

**Evidence / reproduction.** `HARNESS_EFFORT_GUARD_MODE` occurs in exactly eight places in the tree, all of them documentation, the guard source, or test fixtures:

```
$ grep -rn HARNESS_EFFORT_GUARD_MODE . --exclude-dir=node_modules --exclude-dir=.git
.agents/docs/harness-effort-guard.md:130,183
.claude/plugins/harness-effort-guard/README.md:50
.claude/plugins/harness-effort-guard/scripts/guard.ts:91
.claude/plugins/harness-effort-guard/tests/guard.test.ts:44,159,222,231
```

`.claude/settings.json` at this commit carries only `extraKnownMarketplaces` and `enabledPlugins` — no `env` block. `.scripts/claude-role.sh` sets it nowhere. `hooks/hooks.json` passes only `--data-dir`.

**Required property.** A prerequisite document that declares a change "one flip away" must name the artifact the flip is made in, and that artifact must be reachable on the dispatch path the change establishes.

### reviewer-5 — Tier B — The tests do not pin the enforcement default, the non-blocking guarantee for `Stop`/`SubagentStop`, or the presence of the `PreToolUse` hook

**Current behavior / contract.** `guard.test.ts` proves enforcement _emits_ a denial (one case, on the guard-error path) and that an exempt role emits nothing while enforcing. `installation.test.ts` §hook wiring asserts two substrings of `hooks.json`: that `${CLAUDE_PLUGIN_ROOT}/scripts/guard.ts` appears, and that `claude-role` does not.

**Why it is a problem.** `installation.test.ts`'s own stated rationale is that a disagreement "does not fail loudly — the session simply starts without the guard… These cases are the loud failure." The three regressions that would be quietest are exactly the three nothing covers:

1. **Enforce-by-default.** No case asserts that a _denied_ verdict in the unset mode emits no `permissionDecision`. Deleting `enforcing &&` from `guard.ts:169` turns the repository's current, deliberate observe posture into silent enforcement, and all 72 cases still pass.
2. **`Stop` blocking.** No case asserts that `Stop`/`SubagentStop` never emit a block. Deleting `input.hook_event_name === 'PreToolUse'` from `guard.ts:170` makes a `Stop` emit a `PreToolUse`-shaped denial — which the README promises never happens ("a `Stop`-triggered retry would re-run at the same wrong effort and loop") — and all 72 cases still pass.
3. **The enforcement point existing at all.** No case asserts `hooks.json` registers `PreToolUse`. Deleting the whole `PreToolUse` block leaves the guard loaded, announcing, and logging `Stop` verdicts, while enforcing nothing — and all 72 cases still pass.

**Evidence / reproduction.** The suite passes at this commit (72/72). Each of the three properties above was confirmed present by probe rather than by test — `reviewer-3`'s transcript for (1) and (2), and my reading of `hooks/hooks.json` for (3). The absent-coverage claim is from reading all five test files: no `strictEqual` anywhere reads `permissionDecision` for a deny under an unset mode, none drives `Stop` with `HARNESS_EFFORT_GUARD_MODE=enforce`, and no assertion in `installation.test.ts` names an event.

Separately absent, lower consequence: no case covers unparseable or empty stdin (see `reviewer-7`), and none asserts that lifecycle events write `kind: "announcement"` rather than a verdict — a property the doc claims as measured (`harness-effort-guard.md:173–175`).

**Required property.** A test set whose purpose is to make a silent misconfiguration loud must cover the failure whose silence is most costly — an enforcement point that is absent, disabled, or firing where it was promised not to.

### reviewer-6 — Tier B — `consolidator` is a governed, actively dispatched role that the new dispatch contract does not place

**Current behavior / contract.** `.claude/agents/consolidator.md` declares `model: opus, effort: medium` and is therefore governed by the guard. `AGENTS.md` §Before dispatching a governed worker: "This binds the dispatch of `architect`, `implementer`, `reviewer`, `integrity`, `cleanup` and `der`." `CLAUDE.md` §Dispatching roles classifies `architect`/`implementer` as named-resumable and `reviewer`/`integrity`/`cleanup`/`der` as fresh one-shot. `agent-workflow.md` §Dispatch mentions the consolidator only as the thing that launches review passes, and its retirement table has rows for `implementer`, `architect`, "review passes" and "the coordinator" — none for `consolidator`.

**Why it is a problem.** The bootstrap precondition is written as an enumeration, so a role omitted from the enumeration is a role a compliant reader may dispatch in an unguarded first session. `consolidator` is not a hypothetical: it is the role that runs review rounds, and it is running one now.

**Evidence / reproduction.** Live log, current session `4e2cb2f6` at `dd3fc825`:

```
{"kind":"announcement","event":"SessionStart","agent_type":"consolidator",
 "model":"claude-opus-5","declared":"medium","resolution":"declared",…}
{"kind":"verdict","event":"Stop","agent_type":"consolidator",
 "declared":"medium","actual":"medium","resolution":"declared","decision":"allow","cause":"match",…}
```

Frontmatter confirmed by reading `.claude/agents/consolidator.md` at this commit. Grep of `AGENTS.md`, `CLAUDE.md` and `agent-workflow.md`: `consolidator` appears in the §Roles table and in one §Dispatch sentence, and in neither dispatch enumeration nor the retirement table.

**Required property.** Every role definition the guard governs is placed by the dispatch contract — bound by the bootstrap precondition, and assigned a lifetime (named-resumable or one-shot) and a retirement event. This needs a contract decision rather than an edit, so it is routed to the architect rather than answered here.

### reviewer-7 — Tier C — Unparseable hook input crashes the guard, producing no verdict and no log record

**Current behavior / contract.** `guard.ts:88` — `const input: HookInput = JSON.parse(await readStdin());` — is outside the `try` at :103. A parse failure escapes `main()`, the top-level `await main()` at :191 rejects, and the process dies with a stack trace and exit 1. A `PreToolUse` hook that exits non-zero without emitting a `permissionDecision` is not a denial, so the tool call proceeds; nothing is appended to `observations.jsonl`, so §The log's trust rule ("an absent role was not checked") cannot distinguish it from a role that never acted.

**Why it is a problem.** It is the one fail-open path in a design whose comments are otherwise explicit about failing closed (`guard.ts:99–102`: "an escaping rejection would end the hook process without a verdict — which a `PreToolUse` cannot turn into a denial, so the call would proceed unchecked" — the exact hazard, guarded against for resolution but not for parsing). Tier C rather than B because the input is produced by the runtime and is not attacker- or user-influenced, so reachability is low.

**Evidence / reproduction.**

```
$ echo 'not json' | env CLAUDE_PROJECT_DIR=$P HARNESS_EFFORT_GUARD_MODE=enforce node guard.ts --data-dir $P/data
SyntaxError: Unexpected token 'o', "not json\n" is not valid JSON
    at main (…/scripts/guard.ts:88:33)
exit=1        # no stdout, no log line appended
$ printf '' | …same…
SyntaxError: Unexpected end of JSON input
exit=1
```

**Required property.** Every path that ends the hook process without a verdict is either unreachable or recorded. An unchecked tool call must not be indistinguishable from one that did not happen.

### reviewer-8 — Tier C — A loaded-but-erroring guard omits the exact string the dispatch gate keys on, and the documented remedy is wrong for that state

**Current behavior / contract.** `AGENTS.md` §Before dispatching a governed worker: "`Effort guard active` arrives as startup context in every session the guard is loaded into… **Not seen it — run `claude plugin marketplace add ./` and start a new session before spawning any role worker.**" `guard.ts:38–50` emits the error branch instead when resolution failed, and that branch does not contain the string `Effort guard active`.

**Why it is a problem.** The gate is defined by the presence of a literal string, so any loaded state that omits it reads as "not loaded", and the documented remedy — reinstall the marketplace, restart — cannot fix a broken `.claude/agents/` tree or a defective definition. Tier C rather than B because the coordinator path is narrow: with `CLAUDE_PROJECT_DIR` set (as it is in a real session) and no acting role, `resolveRole` is never called, so a coordinator's `SessionStart` reaches the error branch only if `CLAUDE_PROJECT_DIR` is unset. The reachable cases are subagent starts, and the substitute message does explain itself.

**Evidence / reproduction.**

```
# coordinator, healthy or broken tree — always the gate string
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Effort guard active."}}

# SubagentStart, role present, .claude/agents unreadable (self-symlink)
{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":
 "Effort guard could not resolve the role definitions: ELOOP: too many symbolic links encountered, scandir '…/.claude/agents'"}}

# SubagentStart, definition declaring both model: haiku and effort: high
{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":
 "Effort guard could not resolve the role definitions: Role \"Explore\" declares both model: haiku and effort: high in …"}}

# SessionStart, CLAUDE_PROJECT_DIR unset, cwd unreadable
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":
 "Effort guard could not resolve the role definitions: ELOOP: …, stat '…/.claude/agents'"}}
```

**Required property.** A signal a documented decision procedure keys on is present whenever the condition it stands for is true — a loaded guard says it is loaded, whatever else it also has to report — or the procedure distinguishes "silent" from "loaded and complaining".

### reviewer-9 — Tier C — The plugin README says `--plugin-dir` "is what the tests use"; no test uses it

**Current behavior / contract.** `.claude/plugins/harness-effort-guard/README.md` §Installation: "`--plugin-dir` still works and is what the tests use, but nothing about the plugin depends on it."

**Why it is a problem.** It misdescribes the suite to anyone deciding whether `--plugin-dir` is still exercised, at the same moment `harness-effort-guard.md` is demoting it and `installation.test.ts` is asserting nothing depends on it.

**Evidence / reproduction.** `guard.test.ts` and `resolve-role.test.ts` spawn `node <script>` directly (`support.ts:89` `run`), never `claude`. The only occurrence of the flag in any test is `launcher.test.ts:84`, asserting that `claude-role.sh`'s own printed argv contains it. `grep -rn 'plugin-dir' tests/` returns that one line.

**Required property.** A statement about what the tests exercise matches what they exercise.

### reviewer-10 — Tier C — The two-start bootstrap mechanism and the relative project-scope registration are asserted as runtime facts that the machine state does not distinguish from a simpler explanation

**Current behavior / contract.** `harness-effort-guard.md` §How it loads: "Registering the marketplace and loading its plugins happen in that order across two starts: the first session records the marketplace, and the next one loads the guard"; and "A relative path is what makes the file portable". `installation.test.ts` asserts the project-settings path is relative and resolves it against `REPO_ROOT` — which is the test's own resolution rule, not an observation of the host's.

**Why it is a problem.** The observable state is equally consistent with the project-scope relative entry never having registered anything, and the guard loading solely because `claude plugin marketplace add ./` wrote an absolute user-scope entry. Under that reading the command is not a one-time gap-closer but a permanent per-machine requirement, and a clone at a different path is unguarded until it is run again. The consequence is bounded — `AGENTS.md` §Before dispatching a governed worker requires the command and a restart whenever the gate string is absent, which is conservative under either reading — so this is a doc-accuracy finding, not an unguarded-dispatch one.

**Evidence / reproduction.** `~/.claude/plugins/known_marketplaces.json` holds one `material-x` entry, `source.path` and `installLocation` both the **absolute** `/workspaces/material-x`, `lastUpdated 2026-09-06T20:35:39.459Z`. User `settings.json` holds the same absolute path under `extraKnownMarketplaces`; project `.claude/settings.json` holds `"path": "."`. The first record in the marketplace-scoped log is `2026-09-06T20:35:40.122Z` — 663 ms later. The project-settings entry was committed at `ab233179`, 20:16:22, and no record exists in either log between 18:53:07 and 20:35:40, so no session in that 19-minute window registered anything from project scope alone. `installed_plugins.json` carries no `harness-effort-guard@material-x` entry at all. My isolated-config probe could not settle it (see §Scope).

**Required property.** A documented runtime mechanism is either reproducible from the repository's own artifacts, or is marked as a recollected observation with the configuration it was taken under.

## Summary

| id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | B | Two of six acceptance claims for the shipped install — including the only enforcement-denies-something result — have no record in the log the doc names as its instrument |
| reviewer-2 | B | "No event names the acting model… anywhere else" is falsified by `SessionStart` records, including one written at this commit |
| reviewer-3 | B | Observe-mode and `Stop`/`SubagentStop` denials report "The tool call was blocked" when nothing was blocked |
| reviewer-4 | B | `HARNESS_EFFORT_GUARD_MODE=enforce` has no wired or documented location under the no-flags dispatch model |
| reviewer-5 | B | Tests pin neither the observe default, nor the `Stop` non-blocking guarantee, nor the existence of the `PreToolUse` hook |
| reviewer-6 | B | `consolidator` is governed and actively dispatched but placed by no dispatch enumeration or retirement rule |
| reviewer-7 | C | Unparseable hook input crashes before the `try`, yielding no verdict and no log record |
| reviewer-8 | C | The guard-error announcement drops the literal gate string, and the documented remedy does not apply to that state |
| reviewer-9 | C | Plugin README misstates that the tests use `--plugin-dir` |
| reviewer-10 | C | The two-start bootstrap and relative-path registration are asserted but not distinguishable from the user-scope absolute entry alone |

This is not a null result: ten findings, six tier B, four tier C, none tier A. No runtime behaviour of the guard was found to contradict the settled contract — every deny and allow path I probed decided as the contract and the decision table say. The findings are concentrated in what the change _claims_ about itself, and in what its tests decline to pin, both of which matter because this commit is the gate before enforcement.