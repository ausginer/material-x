# Decision elimination review — effort guard and the B′ dispatch workflow

**Read at commit** `dd3fc825ad6fc03a795334ae0ee6b44ff31f6d4c` (branch `drag2/fin-review`), covering the range `2b679844..dd3fc825`.

**Lens.** Machinery, constraints and documented rules whose original justification was dissolved by a later phase of this change — launcher / main-thread roles → persistent `-p` print-mode sessions (topology A) → B′ interactive resumable subagents — plus the inverse: constraints B′ needs that stand on an earlier phase's reasoning.

## Scope

**Covered.** All eleven commits, by `git show`/`git diff` against their introducing commits. The plugin source (`scripts/guard.ts`, `resolve-role.ts`, `verdict.ts`, `observe.ts`), `hooks/hooks.json`, the plugin `README.md`, all six test files, `.scripts/claude-role.sh`, `.claude/settings.json`, `.claude-plugin/marketplace.json`, `.oxlintrc.json`, and the prose in `harness-orchestration.md`, `harness-effort-guard.md`, `agent-workflow.md`, `AGENTS.md`, `CLAUDE.md` and root `README.md`. The forward pass (retired justification → surviving machinery) and the backward pass (surviving machinery → its justification) were both run. The plugin suite was executed once (`node --test 'tests/*.test.ts'`, 72 pass, 0 fail) to confirm the assertions cited below are live.

**Not covered.** No Claude Code session was started, so nothing here is a runtime measurement — in particular der-1's runtime consequence is reasoned from the two loading paths and is stated as unverified. `.claude/agents/*.md` role definitions themselves were not audited beyond the `model:`/`effort:` fields the guard reads. Packages under `packages/` are outside the change and were not read. Allowance/accounting claims in `harness-orchestration.md` §Accounting were not re-measured; they are explicitly a watch item there and I take that at face value.

**The forward pass found surviving machinery.** Nine findings follow.

---

## der-1 — The launcher still loads the plugin through `--plugin-dir`, and a test pins that it must

**Tier: B**

**Finding.** `.scripts/claude-role.sh:56` builds `set -- --plugin-dir "$plugin" --agent "$role" "$@"`, and `tests/launcher.test.ts:84` asserts `stdout.includes('--plugin-dir') === true`. Both rest on the launcher being the guard's loading path.

**Current behavior / contract.** `--plugin-dir` was introduced in `ed0fbe5c` as the _only_ way the guard loaded: nothing else registered it. `ab233179` moved loading to `.claude-plugin/marketplace.json` + `extraKnownMarketplaces` in `.claude/settings.json`, and the same commit's prose states the new rule explicitly — `harness-effort-guard.md:81-83`: "It is no longer how the guard is loaded, and **nothing about loading may depend on it**." `installation.test.ts:146-153` enforces exactly that rule for the hook wiring ("should not reference the launcher from any hook").

**Why it is a problem.** The launcher `cd`s to the resolved project root before exec'ing `claude` (`claude-role.sh:52`), which is the checkout root — the directory whose project settings now already enable `harness-effort-guard@material-x`. The diagnostic path therefore names the same plugin twice by two independent mechanisms. Whether the runtime deduplicates or registers two copies of the five hooks was not measured; if it does not, every diagnostic run writes each observation to `observations.jsonl` twice, and the log is the repository's sole instrument for "was this role checked". The rule the same commit wrote is also directly contradicted by a passing test that requires the dependency.

**Evidence.** Introduced `ed0fbe5c` (`.scripts/claude-role.sh`, `CLAUDE.md` §Starting a managed role: "loads the guard that checks it"). Dissolved by `ab233179` (`.claude/settings.json`, `.claude-plugin/marketplace.json`, and `harness-effort-guard.md` change-record row 2026-09-06 "How it loads — **Replaced**"). The flag and its test assertion survive unchanged at `dd3fc825`.

**Required property.** The diagnostic launcher must not be a second registration path for a plugin the checkout already installs, and no test may require it to be one.

---

## der-2 — The plugin README states the tests load it via `--plugin-dir`; they do not

**Tier: B**

**Finding.** `.claude/plugins/harness-effort-guard/README.md` §Installation: "`--plugin-dir` still works and **is what the tests use**, but nothing about the plugin depends on it."

**Current behavior / contract.** No test loads the plugin. `guard.test.ts:39` spawns `node <scripts>/guard.ts --data-dir <tmp>` directly and feeds the hook payload on stdin; `resolve-role.test.ts` and `verdict.test.ts` likewise address the scripts or the exported functions. The single occurrence of `--plugin-dir` in the whole test tree is `launcher.test.ts:84`, which asserts about the launcher's _printed argv_ under `CLAUDE_ROLE_PRINT_ARGV=1` — the launcher never execs, so the flag is never passed to anything.

**Why it is a problem.** The sentence was written in `ab233179`, the commit that demoted the flag, and it is the reader's only account of how the guard is exercised in test. It states that a path the suite does not take is the path the suite takes, which makes the flag look load-bearing at exactly the moment it was retired — and it is the sentence that would otherwise justify der-1.

**Evidence.** `git show ab233179 -- .claude/plugins/harness-effort-guard/README.md` adds the §Installation block. `grep -rn 'plugin-dir' .claude/plugins/harness-effort-guard/tests/` returns `launcher.test.ts:84` only.

**Required property.** The plugin's own reference must describe the loading path the suite actually takes.

---

## der-3 — "Resume remains unobserved" survives the commit that observed it

**Tier: B**

**Finding.** `harness-effort-guard.md:177` — "Not yet measured: `/effort` mid-session, manual and auto `/compact`, and **resume**." — and §Before enforcement — "`/effort` mid-session, `/compact` and **resume** remain unobserved."

**Current behavior / contract.** The same document, ninety lines earlier (`:148-153`), records the opposite: "**A governed worker is checked, and a resumed one is checked again.** … the guard recorded `declared=medium, actual=medium, match` at the worker's `PreToolUse` and at both its `SubagentStop` events — **under one `agent_id` across the resume**."

**Why it is a problem.** The two "not yet measured" sentences are verbatim from `ed0fbe5c` (`git show ed0fbe5c:.agents/docs/harness-effort-guard.md` line 67), where "resume" meant an A-style `-p --resume` of a whole role session — a thing B′ never does. `ab233179` measured the B′ meaning of resume (a `SendMessage` to a named worker) and added it to the acceptance set without retiring the older claim. §Before enforcement is the document a reader consults to decide whether to flip enforcement on; it currently tells that reader an outstanding unknown exists which the same document has already closed. That makes the pre-enforcement checklist unsound as an instrument, which is the whole of its job.

**Evidence.** `ed0fbe5c` introduced the sentence; `ab233179` added §Measurements §Loaded as an installed plugin, which contains the resume acceptance case. Both survive at `dd3fc825`.

**Required property.** The list of unobserved behaviours must not name a behaviour the document's own measurements record, and where two senses of "resume" exist the surviving claim must say which one it means.

---

## der-4 — Enforcement is switched by an environment variable with no setting point on the settled path

**Tier: B**

**Finding.** `guard.ts:91` reads `process.env.HARNESS_EFFORT_GUARD_MODE === 'enforce'`. Nothing checked into the repository sets it: `.claude/settings.json` carries no `env` block, there is no `.envrc`, and `.devcontainer` does not mention it. `harness-effort-guard.md` §Before enforcement says only "what remains is the mode flip itself" and names no location; the plugin README says only that setting it "applies denials".

**Current behavior / contract.** Under `ed0fbe5c` every governed session started through `.scripts/claude-role.sh`, a shell wrapper — so `HARNESS_EFFORT_GUARD_MODE=enforce .scripts/claude-role.sh <role>` was a per-dispatch, reviewable, shell-visible flip, and the variable needed no home in the repository. `39d2824d` and `ab233179` removed the wrapper from the normal path: the coordinator is a VS Code session started with no flags, and workers are its subagents, inheriting its environment.

**Why it is a problem.** The change's stated remaining step ("enforcement is still a deliberate flip") has no repository-visible action behind it. On the settled path the flip is a property of whichever terminal or editor process happened to launch the coordinator — per-machine, not per-checkout — so a fresh clone cannot be brought into enforcement by anything in the tree, and two coordinators on the same commit can disagree about whether the invariant is enforced. Mitigating, and worth stating: `observe.ts` records `enforced` on every verdict, so the mode a given run was in is recoverable after the fact even though it is not declarable in advance.

**Evidence.** `guard.ts:91` (unchanged since `ed0fbe5c`); `.claude/settings.json` at `dd3fc825` has keys `extraKnownMarketplaces` and `enabledPlugins` only; `harness-orchestration.md` §What this removes or demotes records the launcher leaving the normal path.

**Required property.** The mode that decides whether the invariant is enforced must be settable from the checkout, or the documentation must state where the person is expected to set it and that it is not a repository property.

---

## der-5 — The coordinator is an ungoverned actor by design, and "does no repository work" has no mechanism

**Tier: B** _(the inverse case: a constraint B′ needs, resting on reasoning from an earlier phase)_

**Finding.** `agent-workflow.md` §Dispatch and `CLAUDE.md` §Dispatching roles both state that the coordinator "holds no role, does no repository work itself, and exists to dispatch and relay". Nothing enforces it: `verdict.ts:82-84` allows unconditionally when `check.role == null`, and the acceptance measurement confirms the coordinator's own `SessionStart` and `Stop` records carry `resolution: no-role, allow`.

**Current behavior / contract.** The plugin README's trust claim — "A run is trusted only when every governed role that acted appears with `declared == actual`, **and appears at all**" — was written in `ed0fbe5c`, when every actor was a role: a main thread started with `--agent`, checked, or nothing. Topology A preserved that property (each role owned a whole session). `39d2824d` introduced, for the first time, a permanent ungoverned actor that is also the one session a person types into, and `ab233179` wrote its ungoverned status into the design as a feature ("outside the invariant and allowed as `no-role`").

**Why it is a problem.** The `no-role` allow is correct and necessary; what expired is the premise that made the log a complete account of a run. A coordinator turn that edits a file, runs a build, or writes a plan is indistinguishable in `observations.jsonl` from one that only dispatched — both are `no-role, allow` — so the log can no longer answer "did all repository work happen at a declared effort", only "did all _role_ work". The constraint that closes the gap is prose in two documents with no runtime, test or hook behind it, and it is stated as an architectural property rather than as an unchecked convention.

**Evidence.** `ed0fbe5c` plugin README §The log (trust claim, unchanged at `dd3fc825`); `39d2824d` `harness-orchestration.md` §The workflow ("The coordinator is a plain interactive session… It does no repository work itself"); `ab233179` `agent-workflow.md` §Dispatch and `CLAUDE.md`; `verdict.ts:82-84`.

**Required property.** Either the coordinator's abstention is enforced or observable, or the trust claim must say what the log does not cover — that an unrecorded actor exists by design and its work is out of scope.

---

## der-6 — The `resolve-role.ts` CLI and its hardening now serve only a diagnostic

**Tier: C**

**Finding.** A self-contained sub-system exists whose sole consumer is `.scripts/claude-role.sh`: the `import.meta.main` CLI block in `resolve-role.ts:242-276` with its four distinct exit codes (64, 66, 67, 68) and its tab-separated `<root>\t<effort>` output contract; the launcher's `separator=$(printf '\t')` last-tab split (`claude-role.sh:44-46`); the `CLAUDE_ROLE_PRINT_ARGV` test seam; and the nine cases of `launcher.test.ts`, three of which exist only to pin the separator boundary.

**Current behavior / contract.** All of it serves one job — deciding, _before a session exists_, whether to pass `--effort` on a main thread. `4896a35f` deliberately hardened the split ("Both expansions cut at the _last_ tab, so a project path containing one cannot make the two halves disagree"), and `resolve-role.ts:151-160` still justifies the shared root-finder as keeping "the launcher's pre-session answer and the hook's in-session answer" from diverging.

**Why it is a problem.** `39d2824d` chose a topology in which no role runs on a main thread, and `ab233179`/`harness-effort-guard.md` §The launcher is a diagnostic demote the launcher accordingly. The pre-session answer therefore no longer exists on any path the repository uses; the divergence the shared resolver was built to prevent is now a divergence between a hook and a diagnostic. No consumer observes any of this, hence tier C — but it is the largest concentration of machinery in the change whose reason is gone, and it is still maintained (it was edited as recently as `ab233179`).

**Evidence.** Introduced `ed0fbe5c`; hardened `4896a35f`; demoted `39d2824d` (§What this removes or demotes) and `ab233179` (`harness-effort-guard.md` §The launcher is a diagnostic). No caller besides `claude-role.sh` exists: `grep -rn 'resolve-role' --include=*.ts --include=*.sh .` returns the plugin's own imports, `claude-role.sh:34`, and the tests.

---

## der-7 — The `Stop` hook's enforcement justification cannot apply to any governed role

**Tier: C**

**Finding.** `hooks.json` registers `Stop`, and `guard.ts:17` includes it in `EFFORT_BEARING`. Its documented reason (plugin README §What it can and cannot prevent; `harness-effort-guard.md` §Measurements, "A text-only turn is caught, but only afterwards") is retrospective invalidation of a _governed_ role's tool-less turn.

**Current behavior / contract.** `Stop` fires for a session's main thread. Under `ed0fbe5c` that thread was a governed role (`--agent` via the launcher), and the measurement behind that sentence was taken on 2.1.260 in exactly that shape. Under B′ every governed role is a subagent, whose tool-less turns are covered by the separately registered `SubagentStop`; the main thread is the roleless coordinator, so `Stop` can only ever produce `no-role, allow` — which the acceptance measurement in `ab233179` confirms it does.

**Why it is a problem.** `hooks.json` has not been touched since `ed0fbe5c` (`git log 2b679844..dd3fc825 -- .../hooks/hooks.json` shows one commit), so the event set was fixed under the first topology and never revisited across two topology changes. What survives on the settled path is announcement-grade recording of coordinator turns, not enforcement, and the README sentence claims otherwise. The suite does not distinguish the two: `guard.test.ts` exercises `PreToolUse`, `SessionStart` and `SubagentStart` and contains no `Stop` or `SubagentStop` case at all.

**Evidence.** `ed0fbe5c` `hooks.json` and `guard.ts:17`; `39d2824d`/`ab233179` §Dispatch (roles are subagents, coordinator is roleless); `harness-effort-guard.md:143-147` (coordinator `Stop` = `no-role`).

---

## der-8 — Open questions dissolved by the choice of B′ are still carried as open

**Tier: C**

**Finding.** `harness-orchestration.md` §Open questions lists five items. Three were made unaskable by the same document's own choice: "whether the unexplained haiku cache miss in finding 5 has a cause that also applies to warm role sessions" (finding 5 is about re-supplying `--effort` on `-p --resume`, which B′ never does), "what a role session's practical lifetime is before compaction dominates" and "whether a compacted worker session in A keeps its role and effort" (B′ has no role sessions, and finding 23 establishes that subagents neither auto-compact nor accept the command). A fourth — "whether a compacted session still reports its role and effort" — survives only for the roleless coordinator, for which the answer cannot matter.

**Current behavior / contract.** The list was written across `6248b38e` and `c5ce2060`, when A was the live proposal; `39d2824d` chose B′ and rewrote the surrounding document but left the list intact.

**Why it is a problem.** The document's own header says it is "the record of what was measured and why the choice went the way it did", and the A-scoped sections carry explicit "read this as the analysis of A" caveats. The open-questions list carries no such caveat, so it reads as outstanding work on the settled path. Related and same cause: the document's title is still "**Harness orchestration — persistent role sessions**", which names topology A, the one that was not chosen.

**Evidence.** `git show 6248b38e`/`c5ce2060` add the questions; `git show 39d2824d` adds §Generational lifetime, §Choosing and §The workflow and leaves §Open questions and the H1 unchanged.

---

## der-9 — Two documents disagree about who the coordinator is, and the dispatch precondition only works under one of them

**Tier: C**

**Finding.** `harness-orchestration.md` §Choosing makes the choice of B′ turn on a person: "**B′ is the choice, because the coordinator is a person.** … there is no program. The owner sits in an interactive VS Code session and says _send this to architect_." `agent-workflow.md` §Dispatch and `CLAUDE.md` §Dispatching roles instead identify the coordinator as the Claude session itself ("This session is the coordinator: a plain session with no `--agent`").

**Current behavior / contract.** `dd3fc825` built the dispatch precondition on that identity: `guard.ts:44-50` emits `Effort guard active` as `hookSpecificOutput.additionalContext`, and `AGENTS.md` §Before dispatching a governed worker makes seeing that line the gate — "Seen it — dispatch normally. Not seen it — run `claude plugin marketplace add ./`". `additionalContext` is model context. It is readable by the Claude session and not by the person.

**Why it is a problem.** The signal is sound under the `ab233179`/`dd3fc825` reading (the dispatching Claude session reads its own startup context) and unreadable under the `39d2824d` reading (a human gate with no visible signal). Both readings are current text. Root `README.md` closes the practical risk by telling a human to run the bootstrap command unconditionally, which is why this is tier C rather than higher — but the premise that carried the topology choice and the premise the built mechanism relies on are not the same premise, and nothing in the tree says which one is now in force.

**Evidence.** `39d2824d` §Choosing; `ab233179` `agent-workflow.md` §Dispatch and `CLAUDE.md`; `dd3fc825` `guard.ts` announcement change and `AGENTS.md` §Before dispatching a governed worker.

---

## Areas examined and found clean

Stated so a silent area is not read as an unexamined one.

- **The haiku exemption** (`5f5dc3d9`, `5549ce36`). Its justification — haiku does not participate in the effort mechanism — is a property of the runtime, not of any topology, and survives all three phases intact. The `EFFORTLESS_MODEL` literal, the deny-on-`haiku`+`effort` raise, and the `exempt` resolution kind all still rest on it.
- **Fail-closed on an unreadable domain** (`4896a35f`, `isAbsence` in `resolve-role.ts:56-60`). Justified by the difference between an empty domain and an unchecked one, which is topology-independent.
- **`CLAUDE_CODE_EFFORT_LEVEL` denying for governed roles.** `39d2824d` §What this removes or demotes explicitly re-derived this rule under B′ and found it _more_ important, not less, because a subagent-flattening override now hits every role at once. The launcher's lost pre-flight refusal is consciously replaced by the runtime denial plus the `dd3fc825` announcement line. Nothing expired.
- **`PostToolUse` excluded from `EFFORT_BEARING`** (`guard.ts:14-16`). The reason given — the tool has already run — holds under every topology.
- **The `.oxlintrc.json` override** added in `5549ce36`. It exists because the plugin suite is `node:test` rather than vitest, which is still true.
- **`installation.test.ts`** (`ab233179`). Written for the settled path and tests only files that exist on it.