# D-170 step 0 — bounded re-review of the repaired gate

**Files read at `89844a1b`** ("tooling: make the unbound-method gate effective from every lint path and correct its record"), against the canonical consolidation [`d170-step0-summary.md`](./d170-step0-summary.md) at `3eb605be` and the findings it assigned, F-291 … F-295.

## Scope

**Covered.** The eight properties the remediation claims — effective severity and inherited options from both working directories; the root `lint` / `lint:fix` selectors; the ten-report / ten-suppression matching; the completeness of the F-293 and F-294 record corrections; the `ignoreStatic` disclosure and its consequence for the bounded migration; the intended `KernelHost` class shape; and the real, unconverted `RectIndex`. Plus the execution-path question: which command path the class migration is actually required to pass, exercised with a deliberate detached method read.

**Not covered, deliberately.** The four pre-existing Oxlint errors and the root lint debt; the analogous `typecheck` / `fmt` / `fmt-check` selector omissions, which the remediation names and explicitly does not repair; Q-17 and the `no-shadow` half of F-280; and D-170 steps 1–6, which have not begun. None was assessed, and nothing here is remediated.

## Result

**All five consolidated findings are satisfied, the repaired gate is exercised by the required migration handoff, and D-170 step 0's implementation review is recorded complete.** One new record-keeping finding is reported, non-blocking, and one characterization is offered so a later reader does not over-read the selector repair.

## The eight properties, verified

**1 and 2 — effective severity and inherited options, from both directories.** The same recipe the repository lints with, run twice:

| cwd              | `--print-config` → `@typescript-eslint/unbound-method` |
| ---------------- | ------------------------------------------------------ |
| repository root  | `[2, {"ignoreStatic": true}]`                          |
| `packages/drag2` | `[2, {"ignoreStatic": true}]`                          |

Identical severity **and** identical options. The mechanism is worth stating because it is what makes the repair correct rather than lucky: the final block sets the rule with a bare `'error'`, and ESLint flat config preserves previously configured options when only a severity is given. So the preset's `ignoreStatic: true` survives rather than being silently reset to the rule default — visible in the printed options above, not merely intended.

**3 — the selectors.** `lint` and `lint:fix` both resolve to nine projects including `@ydinjs/drag2`. A word-level diff of the root `Justfile` over `3eb605be..89844a1b` shows `drag2,` inserted after `drag,` on exactly those two lines and **nothing else changed** — two lines, `2 2` in `--numstat`.

**4 — ten reports, ten suppressions, one-to-one.** From the root with `--no-inline-config` and `.claude/**` excluded: **10** reports, distributed exactly as the record states (`.scripts/ce-hmr.ts` 2, `kernel/kernel.ts` 1, `presentation` 1, `q7` 1, `displacement` 3, `features` 1, `placement` 1). The tracked tree carries **10** `eslint-disable-next-line @typescript-eslint/unbound-method` directives and no blanket or file-level disable of the rule. With directives active: **0 unsuppressed, 10 suppressed** — the matching is exact in both directions, not merely equal in total. Re-run from `packages/drag2` the package's own share is 8 reports against 8 directives, which is the same result seen through the directory that used to report zero.

**5 — F-293 and F-294 are corrected completely.** The authoritative current-state record, `00-index.md`'s D-170 step-0 note, now states ten sites with the `8 + 1 + 1` sub-counts, and withdraws the `createRectIndex` claim explicitly. No stale "thirteen sites" survives anywhere in `00-index.md` — the two `thirteen` hits in that file are D-153/D-117's thirteen re-entry assertions, unrelated. The superseded wording survives in exactly two places, both correct: the dated `plan.md` entry of 2026-09-03, which is provenance rather than current state under D-171's own boundary and is **immediately followed** by the 2026-09-04 entry that withdraws it (lines 2335 and 2347, adjacent); and the review artifacts, which quote it in order to reject it. Nothing stale is authoritative.

**6 — `ignoreStatic` is disclosed as inherited, and the consequence is consistent with the bounded migration.** The configuration comment says it is "inherited from the preset rather than chosen here", says what falls outside the gate because of it, and says why only the severity is set. That matches the measured options. The consequence is consistent with D-170's scope: the decision converts `createRectIndex`, `createLinearShift`, `createSeamDriver` and `createKernel` and extracts the two behavior specs — entities holding per-instance mutable state, whose members are instance members with a receiver to lose. A `static` member is the one shape the migration does not produce, so the inherited option narrows the gate where the migration does not reach.

**7 — the intended `KernelHost` shape reports all four.** Probed with `KernelHost` as the class itself and the read sites receiving its instance type, reproducing `sortable/controller.ts:59,64` and `free-drag/controller.ts:89,90`: **4 reports**, two per call site, one per member. The consolidation's rejection of the pass's post-migration-blindness claim is confirmed against the intended shape.

**8 — the real, unconverted `RectIndex` reports both.** Probed against the type imported from the package rather than a stand-in — `import type { RectIndex }`, then `[index.invalidate, index.retire]`: **2 reports**, today, with no conversion. F-294's correction is right, and right for the reason it gives.

## The execution-path question

**The path the class migration is required to pass is the targeted, changed-file one, and it reaches ESLint.**

[`handoff.md`](../../../../.agents/docs/handoff.md) is explicit and file-scoped: for every edited `.ts` file, "lint and autofix with `npx just lint-fix <changed files>`", run from the package directory. That is the mandatory verification, and it takes file arguments. The package recipe is `oxlint --fix <files>` then `eslint --fix <files>`, so Oxlint sees only the changed files.

Exercised with a deliberate detached class-method read, in an isolated worktree, from `packages/drag2`:

```
$ npx just lint-fix src/zz-probe.ts
oxlint --fix src/zz-probe.ts
eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --fix src/zz-probe.ts

  18:20  error  A method that is not declared with `this: void` may cause unintentional
                scoping of `this` …  @typescript-eslint/unbound-method
  18:42  error  …  @typescript-eslint/unbound-method

✖ 3 problems (3 errors, 0 warnings)
error: recipe `lint-fix` failed on line 53 with exit code 1
```

Oxlint passes on the changed file, **ESLint runs**, and the gate reports both detached reads and fails the recipe. `npx just lint <file>` behaves identically. This is a positive demonstration that ESLint executed and that this rule produced the failure — not an inference from a red exit code.

**The package-wide abort is real and is pre-existing context.** `npx just lint` with no arguments runs `oxlint .` first and exits before ESLint; drag2 carries four pre-existing Oxlint errors, in `tests/sortable/g3-conformance.browser.test.ts:157`, `tests/packaging.node.test.ts:321` and `bench/size/noncomposed.js:86,118`. **None is in `src/`**, which is where D-170's conversions land, so the mandated targeted path is unobstructed for the migration's own changed files. The bounded caveat, stated rather than glossed: the gate is reachable for any changed file that is itself Oxlint-clean, so a migration commit that also edited one of those three debt files would abort before ESLint — loudly, with the offending rule named, which is the difference between this and F-291.

## Findings

### rr-1 — Tier C — Five canonical finding ids and one question id are cited by the authoritative record and registered nowhere

**Current behavior.** The consolidation allocated `F-291`…`F-295` from the canonical sequence (continuing the `F-290` high-water mark) and `Q-17`, and `00-index.md`'s D-170 step-0 note cites five of them inline as the reasons for its own corrections. None was minted as a `#### F-29x` entry; `F-290` remains the highest entry in the ledger. The repository's documented reader answers accordingly:

```
$ node .scripts/entry.ts drag2:F-290   →  #### F-290 — Whether a review-scope identifier is citable …
$ node .scripts/entry.ts drag2:F-293   →  unknown local id in drag2: F-293
$ node .scripts/entry.ts drag2:F-295   →  unknown local id in drag2: F-295
$ node .scripts/entry.ts drag2:Q-17    →  unknown local id in drag2: Q-17
```

**Why it is a problem.** A current-state entry cites identifiers a reader cannot resolve through the reader built for exactly that. The corrections themselves are complete and accurate in substance — this is about where the findings live, not whether they were addressed — but the D-170 note is now the only account of F-291 … F-295 outside a dated review artifact, and `.plan/reviews/` is provenance a later record supersedes rather than the register.

**Why the instrument did not catch it.** `references.node.test.ts` extracts identifiers from **headings** (`/^([A-Z]{1,3}\d?-\d+)/` against a heading title, line 667), not from inline prose. An unresolvable `(F-291, F-292)` in an entry body is invisible to it, and the three record instruments pass — 80 tests, green.

**Distinct from F-290**, which asks whether _review-scope_ identifiers such as `P18A-04` should be citable at all, given they have no canonical entry by construction. These are _canonical_ ids, allocated from the canonical sequence, which are supposed to have one.

**Required property.** An identifier cited by a current-state entry resolves through the repository's own reader, or is not written in a form that claims it will.

### rr-2 — not a finding, an observation — F-292's repair is correct and currently inert for the gate

Adding `drag2` to the root `lint` selector is necessary and right, and it is what makes the aggregate path _able_ to reach the package. It does not yet make the aggregate path _exercise_ the gate: `nx run-many -t lint` invokes each package's argument-less `lint`, which for drag2 aborts in Oxlint before ESLint on the four pre-existing errors. Recorded so a green selector is not later read as evidence that the repository-wide path runs the rule. It changes nothing about step 0's status, because the mandated migration path is the targeted one and that path does run it.

## Closure

**D-170 step 0's implementation review is recorded complete, and the class migration's gate is armed on the path the migration must pass.** F-291 and F-292 are repaired and verified from both directories; F-293, F-294 and F-295 are corrected in the authoritative record and the corrections check out against the real types rather than stand-ins. rr-1 is routed as a record-keeping matter and blocks nothing; Q-17 remains the architect's, non-blocking, untouched here.

## Method

Read at `89844a1b`. Effective configuration taken from `eslint --print-config` under **both** working directories, per the consolidation's standing methodological requirement — the directory was the defect, so every configuration claim here states which one it came from. The census was run with `--no-inline-config` from the root and again from `packages/drag2`, and the suppression matching checked in both directions (unsuppressed and suppressed counts), not by comparing totals. The type probes used the package's own `RectIndex` import rather than a hand-written stand-in, which is the specific error F-294 records. The `lint-fix` exercise and every probe ran in a detached worktree at `/tmp/d170-rr`, since removed; the tracked tree was never modified and `git status --porcelain` is empty. The four Oxlint errors were located but not touched.

**LSP plugin — available; not used:** every question was configuration resolution, rule behaviour and recipe execution, settled by running ESLint, Oxlint, `just` and `nx` under two working directories. Symbol navigation establishes what a type is; only the rule establishes what the rule sees, and only the recipe establishes what the recipe runs.