# Cleanup review — harness effort guard and B′ dispatch (round harness-guard-1)

**Commit range read:** files read at `dd3fc825ad6fc03a795334ae0ee6b44ff31f6d4c` (current `drag2/fin-review` HEAD). Diff scoped against `2b679844f4a166965be29cff65d8d3c8f839cc30` (exclusive).

**Lens:** machinery the code's actual responsibility does not require, measured against `CONTRIBUTING.md` Parts I and II and `.agents/docs/documentation.md` §5.

## Scope

Covered, read in full at the target commit:

- `.claude/plugins/harness-effort-guard/scripts/{guard,observe,resolve-role,verdict}.ts` and all four `tests/*.test.ts` files plus `tests/support.ts`
- `.claude/plugins/harness-effort-guard/README.md`, `hooks/hooks.json`, `.claude-plugin/plugin.json`, `tsconfig.json`
- `.claude-plugin/marketplace.json`, `.claude/settings.json`, `.oxlintrc.json` (diff only)
- `.scripts/claude-role.sh`
- `AGENTS.md`, `CLAUDE.md`, `README.md` (diff), `.agents/docs/agent-workflow.md`, `.agents/docs/harness-effort-guard.md`, `.agents/docs/harness-orchestration.md`

Ran the plugin's own suite (`node --test 'tests/*.test.ts'` from the plugin directory): 72/72 pass, 12 suites, 0 failures — used as evidence for reachability/brittleness claims below, not as a correctness review.

Not covered: I did not review `.claude/agents/*.md` role definitions themselves, did not review runtime behavior of Claude Code's plugin loader, and did not attempt to reproduce the harness-orchestration.md measurements against a live session — those are outside a static-cleanup lens and I have no reason to doubt them here. Tier-A/B correctness and integrity concerns are explicitly not my lens; I did not go looking for them and their absence from this report says nothing about whether they exist.

## Findings

### cleanup-1 — Tier C: duplicated policy between a maintainer comment and the shipped README

**Finding.** The rationale for matching `model: haiku` literally (no prefix/alias/family/capability inference) is written out in full, independently, in two places that will drift if one is edited without the other.

**Current behavior.** `scripts/resolve-role.ts`:

```
/**
 * The one `model:` value outside the effort invariant, matched literally.
 *
 * Not a prefix, an alias, a family or a capability lookup: deciding which
 * models bear effort would mean keeping a second, silently drifting copy of the
 * runtime's capability matrix, and the runtime exposes no basis for one. A
 * model gaining or losing effort support is an edit to this line.
 */
const EFFORTLESS_MODEL = 'haiku';
```

`README.md` (published, consumer-facing):

> The test is the literal `model:` field of the definition, matched exactly against `haiku`. Not a prefix, not an alias, not a family, and not a capability lookup: the guard would have to infer which models carry effort, and it has no reliable source for that. A model that later gains or loses effort support changes one word in one file.

**Why it is a problem.** The two statements carry the identical argument in near-identical wording. `.agents/docs/documentation.md` §"One copy" is written about `AGENTS.md`/`CLAUDE.md`/`.agents/docs` specifically, but the review brief for this round names "the code itself" as one of the places to check for the same rule stated twice, and this is exactly that case: a future change to the exemption rule (e.g. adding a second effortless model, or changing the matching strategy) has two independent proses to update, and nothing ties them together. One is a maintainer note (internal, per `documentation.md` §5.2's mechanical split — `EFFORTLESS_MODEL` does not appear in any shipped `.d.ts`), the other is the shipped operator-facing explanation; they answer to different readers, but they assert the same fact for the same reason in the same words, which is the drift risk `documentation.md`'s "one copy" principle is written to avoid.

**Evidence.** `grep -n "Not a prefix" .claude/plugins/harness-effort-guard/scripts/resolve-role.ts .claude/plugins/harness-effort-guard/README.md` returns one hit in each file, wording near-identical.

**Required property.** The rationale for the literal-match rule should have one home; the other reference should point at it rather than restate it, or the two should be reduced to what each reader actually needs (the code comment could state only the invariant — "matched literally, see README" — while the README keeps the full argument for the external reader documentation.md §5.2 is written for).

---

### cleanup-2 — Tier C: an unreachable CLI default in `guard.ts`

**Finding.** `guard.ts`'s `main()` falls back to a synthesized data directory when `--data-dir` is absent, but every actual caller of `guard.ts` always supplies `--data-dir`.

**Current behavior.**

```ts
const dataDir =
  argument('--data-dir') ?? join(tmpdir(), 'harness-effort-guard');
```

The plugin's only production entrypoint is `hooks/hooks.json`, which invokes `guard.ts` for all five wired events (`PreToolUse`, `Stop`, `SubagentStop`, `SessionStart`, `SubagentStart`) and always passes `--data-dir "${CLAUDE_PLUGIN_DATA}"` (verified: `grep -c data-dir hooks/hooks.json` = 5, one per hook, none omitting the flag). Every test in `tests/guard.test.ts` also calls the script through `support.ts`'s `run()` with `--data-dir` explicit. No test exercises the `?? join(tmpdir(), …)` branch, and no documentation (the plugin's own README, or `harness-effort-guard.md`) describes a supported manual invocation of `guard.ts` without the flag — contrast `resolve-role.ts`, whose CLI mode is documented in its own JSDoc block as an explicit, intentional second interface ("CLI for callers that cannot import").

**Why it is a problem.** `CONTRIBUTING.md` §1.1's litmus test asks "is this state reachable through correct use of the public contract?" For `guard.ts`, the only contract that exists is "invoked by the hook wiring, or by the test harness" — both always pass `--data-dir`. The fallback is a default for an input nothing that runs it ever omits: untested, undocumented, and not load-bearing for the guard's stated job of asserting and denying. It is exactly the class of unreachable defensive code Part II asks to be removed rather than the class of legitimate contract term (there is no documented case where an integrator is expected to invoke `guard.ts` bare).

**Evidence.** `grep -n data-dir` across the plugin tree (see command above) shows every call site — hook wiring and tests — supplying the flag; `argument()` and the fallback expression are the only place it can be omitted, and nothing does.

**Required property.** Either the fallback should be justified by a documented, tested manual-invocation contract (as `resolve-role.ts` has), or the argument should be required and the guard should fail loudly if the one caller that matters ever omits it, rather than silently writing an observation log to a location nothing reads.

## Findings not made (explicit no-defect)

- **`guard.ts`'s combined try/catch around root discovery and role resolution** (the comment explaining why both live in one catch) is a real boundary: a `PreToolUse` hook that throws instead of emitting a verdict lets the tool call proceed unchecked, so collapsing the two fallible filesystem reads into one guarded path is a correctness requirement of the assert-and-deny contract, not incidental convenience. No finding.
- **`resolveRole`'s two `throw` cases** (duplicate role names; `model: haiku` paired with `effort:`) are real defects in the one namespace the guard owns (role definitions), matching Part I's nullish/exactness discipline and Part II §1.1's ownership clause (b) — the guard would otherwise silently pick a declaration nobody made or discard one an author wrote on purpose. No finding.
- **`verdict.ts`'s single `Verdict` union with one message-producing path per deny cause** is a plain discriminated union sized to the seven-row decision table in the plugin README; it is not a generic dispatcher or registry (Part II §2.2), and I found no framework-for-two-cases pattern here. No finding.
- **`.scripts/claude-role.sh` and its `tests/launcher.test.ts`.** Both `AGENTS.md`/`CLAUDE.md` and `harness-effort-guard.md` state plainly that the launcher is now a diagnostic only, not the loading path, and the test file exercises exactly that reduced diagnostic surface (pinning effort, refusing on a poisoned environment) rather than testing removed topology-A concepts. I looked for UUID/locking/`-p`-router residue specifically (per this round's brief) across the plugin's tests, scripts, `hooks.json`, and `.claude/settings.json`, and found none — `harness-orchestration.md` (the record of the rejected/superseded topologies) is the only place that vocabulary survives, and it is explicitly framed there as a historical record of a measurement, not as instructions or live configuration. No finding.
- **The near-identical one-line descriptions in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `README.md`'s opening sentence.** This is ordinary manifest-metadata duplication (each manifest format requires its own `description` field); it is not a rule restated across normative documents in the sense the round's brief is aimed at, and I do not think it rises to a finding.
- **`harness-orchestration.md`'s size (578 lines) as a repository-level "record" with no `packages/*/.plan/` home.** `documentation.md`'s four-way model assigns records to `packages/*/.plan/`, and this is repository tooling with no package to hold one. Whether repo-level tooling needs its own record location is a real question, but it is a documentation-architecture decision for the architect under `CONTRIBUTING.md` §13-style boundary reasoning, not a discipline defect I can resolve by pointing at a rule this document violates — the document plainly declares its own status and scope at the top and does not read as prose masquerading as a current-state convention. I report it as a boundary observation rather than a finding.

## Summary

Two Tier-C findings: a duplicated rationale between an internal comment and the shipped plugin README (`cleanup-1`), and an untested, undocumented default argument path in `guard.ts` that nothing which actually invokes it ever exercises (`cleanup-2`). No Tier A or Tier B findings from this lens. The topology-A residue this round was specifically watching for (UUID/locking/`-p`-router machinery leaking into the normal path) was not found; the vocabulary survives only in the explicitly-historical `harness-orchestration.md` record.