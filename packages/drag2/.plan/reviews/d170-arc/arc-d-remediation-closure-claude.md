# Arc D's remediation — closure review

**Range:** `9e74f52fa..1a0e90487`, three commits. Base settles the remediation boundary (D-193, D-194, D-195); `34aedf520` is the implementation; `8e47d7ab5` is the independent architecture challenge that amends all three (D-196, D-197, D-198; F-421…F-425); `1a0e90487` is the repository-level reconciliation.

**Files read at** `1a0e90487`, which is `HEAD` with `git status --porcelain` empty; `HEAD:packages/drag2/src` resolves to tree `54fd4d821dc8a3bf33aa1e54d588d3454f6bb6c9`. Every mutation and every build ran in a detached `git worktree` linked to the checkout's `node_modules` and removed afterwards; the shared checkout was never written to except by this artifact.

**Bounded by instruction.** This asks whether the post-Arc-D remediation is ready to close against live **D-192**, **D-196**, **D-197** and **D-198**, with D-191 supplying the Arc D context. It is not a second Arc D review, it does not re-derive D-191's architecture, and it does not reopen F-412/M-5 — it only establishes that F-412 was not absorbed. Live registers were taken as authority over earlier reports throughout: `00-index.md` §Findings, `obligations.md`, `CONTRIBUTING.md` §18, `.agents/docs/handoff.md`, `.agents/docs/review-findings.md` and `.claude/agents/consolidator.md`.

**Finding ids here are local** (`closure-1`…`closure-6`) and are a proposal only. Per D-196 and `review-findings.md` §Artifacts, the register that owns the family assigns canonical ids; this pass mints none.

## Method

**Ten detached worktrees**, at `91a215001`, `0b45c0088`, `5a438352c`, `06ad3ff87`, `0c62b02c6`, `5c2245884`, `c553ff8da`, `9e74f52fa`, `34aedf520` and `1a0e90487`. Everything below was executed rather than read out of a prior report, including the figures the implementation and challenge records agree on.

**The measurements were rebuilt, not transcribed.** `declarationWeight()` and `measureAll()` both read built output, so each worktree was built with `tsdown` before either ran.

**Attribution of the reported external failures was established from source**, not from the implementation report: each was re-run at a pre-remediation commit with that commit's own root configuration.

## What reproduces

### D-192 — the suspension/restoration reconciliation, re-measured end to end

**Every endpoint of the interval was re-measured from source through `measureAll()`, and all five rows reproduce at every seam.**

| Row | suspension `0b45c0088` | F-394 `5a438352c` | Arc C base `06ad3ff87` | Arc C landed `0c62b02c6` | Arc D `c553ff8da` |
| --- | --: | --: | --: | --: | --: |
| free drag minimal | **8,136** | 8,132 | 8,132 | **8,116** | 8,116 |
| free drag + bounds | **8,298** | 8,295 | 8,295 | **8,274** | 8,274 |
| free drag + landing | **8,295** | 8,306 | 8,306 | **8,276** | 8,276 |
| free drag complete | **8,447** | 8,459 | 8,459 | **8,426** | 8,426 |
| kernel root — `kernel.js` | **6,210** | 6,208 | 6,208 | **6,185** | 6,185 |

- **The write limb is real.** The five figures F-409's repair wrote into `arc-b-remediation.md` §The controls and `budget-rebases.md` — 8,136 / 8,298 / 8,295 / 8,447 / 6,210 — are the measured Brotli values at `0b45c0088`, the commit that removed the five `control:` literals. They are the tree's, not an arithmetic recovery from a delta.
- **The read limb reconciles to the byte.** Interval **−20, −24, −19, −21, −25 B**, exactly as `arc-d.md` §The controls, O-13's disposition and `budget-rebases.md:774` state it. The per-column attribution reproduces: F-394's deletion at −4, −3, +11, +12, −2 and Arc C at −16, −21, −30, −33, −23, with Arc D at 0 on all five.
- **Both seams are exact.** `arc-b-remediation.md`'s second landed column equals `arc-c.md`'s baseline column and `arc-c.md`'s landed column equals `arc-d.md`'s baseline column, row for row, verified against re-measured trees rather than against the tables.
- **D-192's own longer interval also reconciles** — from the `control:` values declared at Arc B (8,159 / 8,293 / 8,293 / 8,448 / 6,210) to the restored figures: −43, −19, −17, −22, −25.
- **The restored equalities are live and assertive.** `npx just size` at the tip is green on all seven `control:` rows; `controlViolations()` compares `brotli !== composition.control` in both directions at `measure.ts:750`, and the suspension paragraph is gone from the `control?` docblock, which is what D-191's deferred witness turned on.
- **The amended withdrawal rule is satisfied.** O-13's disposition is restated against what `controlViolations()` asserts rather than against the `control?` docblock's motivating case, and `arc-b-remediation.md` now reports the **+11 B** on `free drag + landing` and **+12 B** on `free drag complete` at `5a438352c` as two readings a live control would have made. Both reproduce in the table above.
- **`CONTRIBUTING.md` §18 carries all three repairs**: the restoration is its own bullet stating the read, the attribution predicate and _an unattributable interval is a finding before the restoration is a declaration_; the suspension clause says _the figure itself, not a delta against a baseline held in another table_; the boundary test carries two limbs; the withdrawal clause is guarded in both directions with _the assertion is the authority_.

**The rule now has a consumer.** Its consumer is the restoring pass, and at O-13's only discharge that pass performed it. There is no instrument behind it and F-409 did not ask for one — this stays a procedural obligation, which is worth stating plainly rather than reading the repair as more than it is.

### D-197 — axis-local narrowing is rejected at the contribution assignment

Executed in a detached worktree at `1a0e90487`.

- **The rejection fires.** `snapshot: unknown` added to `y.ts`'s **local** `InsertionRuntimeView` — a member the published view does not carry — leaves `npx tsc -p tsconfig.json --noEmit` at **exit 1**, at `y.ts(188,3)`, with the sentence the decision quotes: _Types of parameters `runtime` and `runtime` are incompatible. Property `snapshot` is missing in …_. `feature.ts` declares `resolve: ResolveInsertion` and `moved: MovedInsertion` as named aliases at `:153` and `:159`.
- **`toExtend` is credited only with its upper bound, and the negative controls confirm the split.** Emptying the published `InsertionRuntimeView` to `Readonly<{}>` leaves the declaration project at **9 files, 89 tests, no type errors** — the owner's rows do not see it — while `just typecheck` reports **six errors, including `xy.ts(164,3)` and `y.ts(187,3)`**. Both figures are exactly as recorded. The corrected prose is in place at `feature.declaration.test.ts` (_the owner's rows below are the **upper** bound … The lower bound is the axis assignment itself_), at [`03` §Consumer-declared views, not producer projections (D-13)](../../contract/03-feature-composition.md) (_an **upper** bound, capping each view at what the behavior guarantees_), at `plan.md`'s Arc D entry and in the register's own F-404 entry, whose struck _so a view narrowed to nothing cannot pass every refusal_ names F-418.
- **F-404's disjointness row is independently protective.** Re-declaring `snapshot` on the published runtime view reddens _should declare no member on both_ with `TS2554` (_Expected 1 arguments, but got 0_) — the falsifier D-191 predicted, still firing on its own. The owner's row reddens too, on the upper bound, which is the property it does hold.
- **The repair survives the repo's own autofix.** `npx just lint-fix src/sortable/feature.ts` at the tip leaves both alias references standing with an empty diff, so the `@typescript-eslint/method-signature-style` reversal [`03` §The schema](../../contract/03-feature-composition.md) names under F-51 does not reach a type reference.
- **No composition measurement is owed and the fifteen rows were checked anyway.** Declaration weight at `34aedf520` and at `1a0e90487` is identical, and `just size` at the tip is green.

### F-414 and F-419 — both instruments do what their rows say

- **The recogniser refuses what it used to skip.** Planting a one-cell narrative row inside the live `00-index.md` deferred table — the exact shape that fell through — makes `decisions.node.test.ts` report `unparseable row: | **The twenty-seventh cycle**, …` and fail. `ROW_SHAPED` is gone; `structural` at `ledger.ts:215` recognises the delimiter and the header positionally.
- **Header recognition is positional, not textual.** Renaming a column to `| Decision | Destination | What is missing | Witness |` leaves the suite at **75 passed** — no false positive.
- **The table is emptied and the twenty-sixth cycle's narrative is prose below it**, where the twenty-five before it are, and D-194's `Unimplemented (Remediation)` marker is gone with the row.
- **F-419's false attribution is removed, not re-pointed.** `COVERAGE.md:967` now states only what _should classify a throwing move hook_ asserts. The invalidation-discipline clause appears nowhere in `tests/` or `src/` as a coverage claim; the discipline itself is described in the bracket's own comment at `spec.ts:1257`, which describes code rather than claiming a row.
- The whole `node` project is **24 files, 366 tests, all passing** at the tip.

### D-196 — the allocation site matches the actual registers

Counted at the tip by `####`/`###` identifier claims per document:

| Register                                  | Families claimed         |
| ----------------------------------------- | ------------------------ |
| `contract/00-index.md`                    | 198 `D-`, 388 `F-`       |
| `contract/05-lifecycle-invariants.md`     | 37 `I-`, 21 `Q-`, 4 `M-` |
| `contract/07-free-drag-contract.md`       | 9 `B-`, 6 `K-`, 5 `L-`   |
| `contract/02-kernel-behavior-contract.md` | 6 `P-`                   |
| `obligations.md`                          | 13 `O-`, 7 `SC-`         |

D-196's map is right in every entry, and `contract/README.md` now states the site as _the register that owns the family_ (D-174) with the same map.

**Both mandating instruments are amended.** `review-findings.md` §Artifacts reads _A summary proposes canonical ids; the register that owns the family assigns them_ and _the owning register — `00-index.md` for `D-`/`F-`, the document holding the family for the rest — **in the same commit that first uses it**_. `consolidator.md` reads _The proposal becomes canonical when the register carries the rows, and the registered id wins a collision_. The per-prefix high-water-mark paragraph the swarm executed is retained beside it.

**No redundant D-193 machinery survives.** No second uniqueness reader was written; `ledger.ts`'s `violations()` is unchanged as the single claim reader. The one test row that was added — _should report one identifier claimed twice in the same document_ — carries a comment stating its own property (`owners` is keyed across documents, so scoping it per document would leave the cross-document row green and lose the single-file case), and both it and its `COVERAGE.md` row cite **D-196** and **D-174** rather than the superseded D-193. F-418's closure paragraph carries the correction where it had booked the row as the obligation's carrier.

### D-198 — the second formatter is gone at both sites, the Markdown path is not

- Root `.oxlintrc.json` carries no `prettier/prettier` rule and no `jsPlugins: ["eslint-plugin-prettier"]`.
- Root `eslint.config.ts` imports `eslint-config-prettier` directly as `prettierDisables` and no longer spreads `eslint-config-vaadin/prettier`; `eslint-config-prettier` is a declared dependency at `package.json:50`.
- **Removed rather than overridden**: `grep` over every package and root config finds no `prettier/prettier` at any severity, including `'off'`, and `eslint-plugin-prettier` survives only as a transitive lockfile entry registered by nothing.
- **The root-Markdown formatter is preserved.** `.prettierrc.json` and `.prettierignore` remain, and `handoff.md` §Verify what you changed still directs root-level Markdown to `npx prettier --write`, now named as _the one exception_ to the scoped single-authority clause rather than left to be discovered.
- **`npx just lint` from `packages/drag2` reports no formatting diagnostic**, and `@ydinjs/drag` — the second package the contradiction was reddening — is green. Root `just lint` runs nine projects and **eight pass**.

### F-425 — the byte figures reproduce exactly

Re-measured through `declarationWeight()` on freshly built trees:

| Commit | files | bytes | comment |
| --- | --: | --: | --: |
| `0c62b02c6` — Arc D baseline | 33 | **116,389** | **85,276** |
| `5c2245884` / `c553ff8da` — Arc D landed | 33 | **116,432** | **85,343** |
| `9e74f52fa` — remediation baseline | 33 | 116,432 | 85,343 |
| `34aedf520` / `1a0e90487` — remediation landed | 33 | **116,295** | **85,086** |

`arc-d.md`'s +43 B across 33 files with comment at +67 B reproduces to the byte, as does `arc-d-remediation.md`'s 116,432 → 116,295 with comment 85,343 → 85,086. The remediation's delta is booked in `arc-d-remediation.md` and Arc D's sentence stays scoped to Arc D, which is what F-425's required property asks.

### Root verification, and the reported external failures

- **The three selectors `handoff.md` names all run nine projects**, executed: root `typecheck` **succeeds for 9 projects**; root `fmt-check` runs 9 with `drag2` green over all 462 files; root `lint` runs 9 with `drag2` the only failure. `drag2` was already in `lint`/`lint:fix` before this change (F-292's 2026-09-04 repair).
- **The five `drag2` lint errors are pre-existing and are not the config change's doing.** Re-run at `91a215001` with that commit's own root `eslint.config.ts` — the one that still spread `eslint-config-vaadin/prettier` — the identical five reproduce: `tests/kernel/lifetimes.node.test.ts` at `164:18`, `198:32`, `199:32` (`@typescript-eslint/strict-void-return`) and `tests/probes/13b-settlement.ts` at `34:1` (`import-x/order`) and `248:3` (`@typescript-eslint/method-signature-style`). Neither file was touched by any of `9e74f52fa`, `34aedf520`, `8e47d7ab5` or `1a0e90487`; their last edits are `9e7cbfc6b` (2026-08-26) and `37ae30e61` (2026-09-01). **External, and the register's account of them is accurate.**
- **The root `fmt-check` failure is pre-existing and outside this package.** `packages/drag/.plan/contract-attempt-1/08-public-surface.md` fails `oxfmt --check` at `91a215001` as well as at the tip, and no commit in the range touched a single file under `packages/drag/`. Last touched by `791a340be repo: format`. **External.**
- **F-412/M-5 was not absorbed.** Its register entry is still `Open, tier B`; `m5.browser.test.ts:641` still reads `expect(small.difference).toBeGreaterThan(0.02)`; no commit in the range touched `tests/perf/`. Not investigated further, per instruction.

## Findings

### closure-1 — `plan.md`'s Arc D entry still asserts both claims F-409 and F-425 exist to remove, in an entry this round amended one paragraph above · tier B

**Current record.** `plan.md:2389` reads _O-13's five suspended `control:` equalities are restored at 8,116 / 8,274 / 8,276 / 8,426 / 6,185 — **figures the arc did not move, which is the condition a returning equality wants** —_. `plan.md:2427` reads _the five controls come back at **figures this arc did not move**_. `plan.md:2387` reads _Published declarations went the other way by **about 40 B** raw_.

**Why it is a problem.** The first is the exact formulation F-409 identifies as _a sentence standing where a check was not performed_, struck at `arc-d.md`, O-13 and `budget-rebases.md:774` and now contradicted by `CONTRIBUTING.md` §18's own restoration bullet, which names arc-local inertness as the substitute it refuses. The third is the two-decimal-derived precision F-425 struck from `arc-d.md` for being unfalsifiable. F-409's repair note states **_The arc-local substitute is struck at all four sites it stood at_** — a census claim the tree does not carry.

**Evidence.** `git log -L 2385,2385` on `plan.md` resolves to `34aedf520`: the remediation rewrote the paragraph immediately above (F-418's upper-bound correction, _corrected by F-418_ … _once `InsertionGeometry`'s slots are named aliases (D-194)_) while leaving `:2387` and `:2389` as authored at `c553ff8da`. So the round did amend this entry in place, and stopped one paragraph short. `plan.md` carries 24 in-place strikethrough corrections — `:941`, `:969`, `:1117` among them — so leaving a falsified claim standing is not this document's convention. `plan.md` is outside `ledger.ts`'s `CURRENT_STATE`, so no instrument sees it.

**Required property.** Where a round strikes a claim as false, every live statement of that claim the round is amending anyway carries the strike, and a repair note's census of the sites is true of the tree.

### closure-2 — `src/sortable/feature.ts` states the export ground D-197 struck as false · tier B

**Current behaviour.** `feature.ts:95–97` reads _A named alias is checked contravariantly in the parameter and refuses it. **The two names are exported because declaration emit reaches them**; `sortable/config.ts` and `free-drag/config.ts` state the same rule for their own callback slots._

**Why it is a problem.** D-197 strikes exactly that ground — ~~`ResolveInsertion` and `MovedInsertion` must be exported for declaration emit~~ — and replaces it with two others: `sortable.ts`'s hoisting ground and `03`'s closure rule. Its Touches records the replacement. The register carries it; the source does not, and the source is what a fellow developer reads before deciding whether the `export` may be dropped. A comment that gives a false mechanical reason is worse than none, because it is checkable and will be believed.

**Evidence.** The comment landed at `34aedf520`, written from D-194; `8e47d7ab5` amended the register and `1a0e90487` touched no `src/`. Reproduced at `1a0e90487` in a detached worktree: with `export` removed from both aliases, `npx tsc -p tsconfig.json --noEmit` is **exit 0**, `just build` emits both into `sortable/feature.d.ts` at `:28` and `:54` as un-exported types referenced by `InsertionGeometry` at `:70` and `:76`, and `tsc --declaration --emitDeclarationOnly` reports **zero** `TS4081`. The stated reason is false as a matter of fact, not merely superseded.

**Required property.** Where a decision replaces the stated ground for a source-level choice, the comment carrying that ground states the ground that holds. (The comment is `//`-form and does not reach a consumer's `.d.ts`, which is why this is tier B on the internal reader rather than tier A.)

### closure-3 — §Decision status's `inactive` paragraph is F-406's defect again, and this round introduced it · tier C

**Current record.** The paragraph at `00-index.md:2405` opens _The **fifteen** `inactive` rows are the ones whose live residue is empty_ and names fifteen: D-7, D-33, D-73, D-88, D-150, D-162, D-164, D-167, D-169, D-182, D-183, D-185, D-188, D-190, D-187. The table three lines below carries **eighteen**: those fifteen plus **D-193**, **D-194** and **D-195**.

**Why it is a problem.** It violates F-406's own required property verbatim — _Where a register paragraph enumerates rows of the table below it, the enumeration is the whole table or it says which subset it is_ — three lines above the table that falsifies it, in the same paragraph that carries F-406's correction note. A reader asking why D-193 is `inactive` finds three rows the paragraph that exists to explain the value does not account for.

**Evidence.** `grep -cE '^\| D-[0-9]+ +\| inactive +\|'` answers **18**. `git log -L` puts all three new rows at `8e47d7ab5` — a commit in this range — and the paragraph at `7b8961341`, before it. `decisions.node.test.ts` parses neither the count nor the enumeration, so nothing reports it; this is F-406's stated reason for tier C, and it applies unchanged. Systematic rather than isolated, which raises its priority within the tier rather than its tier.

### closure-4 — F-292's closure sentence claims more of the tree than the owner's call delivered · tier B

**Current record.** F-292 reads _All three now name it, so **nine projects run every verification target for which the package declares a script**_.

**Why it is a problem.** `@ydinjs/drag2` declares both a `test` and a `size` recipe. Root `test` runs `box-quad,core,tproc,material-x` — four of nine — and root `size` runs `core,drag` — two of nine. Neither names `drag2`. The sentence is the register's only current-state account of what the owner settled, and it is falsifiable by reading the `Justfile` beside it. `plan.md:2303` states the same change **precisely** — _All three selectors now name it, nine projects each, and `handoff.md`'s this checks all packages is true of `typecheck` in practice_ — so the overreach is in the register alone.

**Evidence.** Root `Justfile` `test:` and `size:` selectors, read at the tip. Recipes declared per package: `test` in box-quad, core, drag, drag2, material-x, tproc, vite-traits-plugin (7); `size` in box-quad, core, drag, drag2 (4). The three selectors `1a0e90487` edited are `typecheck`, `fmt` and `fmt-check`, verified by the diff.

**Scope, stated rather than decided.** `drag` and `vite-traits-plugin` are also absent from root `test` and `box-quad` from root `size`, so this is a repository-wide pattern rather than a `drag2` gap, and `handoff.md`'s verification sequence is `fmt` / `lint-fix` / `typecheck` only — which the change does satisfy in full. **Whether `test` and `size` are part of _root verification_ is the owner's call and is not answered here.** What is reportable is that the register asserts an answer the tree does not carry.

### closure-5 — the corrected allocation sentence names a prefix its own ownership map does not assign · tier C

**Current record.** `contract/README.md:28` reads _Decision, finding and invariant ids — `D-`, `F-`, `I-`, **`E-`**, `Q-` — are declared in the register that owns the family (D-174) …_ and then maps `D-`, `F-`, `I-`, `Q-`, `M-`, `P-`, `B-`, `K-`, `L-`, `O-`, `SC-`. `E-` is named in the list and assigned to nothing.

**Why it is a problem.** D-196's whole holding is that the allocation site must be the register that actually owns the family; a corrected sentence that names a family with no register reintroduces the class in miniature, and an allocator following it has nowhere to scan. There is no canonical `E-` family: `grep` finds `E-01`/`E-02`/`E-05` only as review-local ids inside `reviews/checkpoint-e/review-checkpoint-e-2-codex.md`.

**Evidence.** F-421's repair rewrote this sentence and carried the stale prefix list through unchanged; the pre-repair text it quotes carries the same `E-`.

### closure-6 — the instrument still emits the precision F-425 struck · tier C

**Current behaviour.** `measureAll()`'s report at `measure.ts:1016` prints `published declarations: ${declarations.files} files, ${kb(declarations.bytes)}, of which ${kb(declarations.comment)} is comment`. At the tip `just size` prints _33 files, 116.30 kB, of which 85.09 kB is comment_.

**Why it is a problem.** F-425's diagnosis is that at two-decimal kB _an obligation to record the new figure there can be discharged by writing the same number_. The two records now carry bytes, so the required property is met — but the instrument the next recorder reads still emits only the form that made the obligation unfalsifiable, and the byte figures are reachable only by calling `declarationWeight()` directly, which no recipe does. This is beyond what F-425 or D-197 asked for and is reported as a residual rather than as an unmet obligation.

**Required property.** Not stated by any live entry; naming one is a decision, not a defect.

## What was not covered

- **The `browser`, `spec` and `visual` projects were not run.** The `node` (366) and `declaration` (89) projects were, in full, and every mutation probe was executed against `declaration` or `tsc` directly. A behavioural regression reachable only from a browser suite is outside this pass.
- **D-191's architecture was not re-derived**, and neither was Arc D's fifteen-row composition table beyond the five control rows and the declaration weight. The swarm and integrity passes reproduced all thirty figures; this pass did not repeat that.
- **F-412/M-5 was checked for absorption only.** Its threshold, its flake and its repair are untouched here.
- **`packages/drag`'s `fmt-check` failure was attributed, not diagnosed.** Why a file survives a `repo: format` commit unformatted is outside this range.
- **`eslint-config-prettier`'s disable set was not diffed against `eslint-config-vaadin/prettier`'s** beyond confirming the latter is that config plus the one rule. If the vaadin wrapper carried anything else, this pass would not have seen it.

## Verdict

**The evidence supports closure.** Every claim this review was asked to challenge holds against the live tree, and each was executed rather than read:

- D-192's suspension and restoration records have a consumer, state the figures rather than deltas, and the interval reconciles to the byte at every seam from source;
- D-197 rejects axis-local narrowing at the contribution assignment, `toExtend` is credited only with the upper bound it holds, and F-404's disjointness row remains an independent falsifier;
- F-414's recogniser refuses the shape that fell through and does not false-positive on a renamed header; F-419's clause is deleted rather than re-pointed;
- D-196 agrees with the actual family registers, both mandating instruments are amended, and no redundant D-193 machinery survives;
- D-198 removes the second formatter at both root sites, removed rather than overridden, with the root-Markdown path intact;
- F-425's byte figures reproduce exactly.

**The two reported failures are external and are not closure blockers.** The five `drag2` lint errors reproduce at `91a215001` under the pre-change configuration in two files no commit in the range touched; the root `fmt-check` failure is in `packages/drag`, reproduces at `91a215001`, and no commit in the range touched that package. Both are correctly reported and not swept in, per `handoff.md`.

**Six findings, none of which reverses a landed claim or reaches a consumer at runtime.** `closure-1` and `closure-3` are the ones a closing owner should weigh, because both are claims this round itself made false: a repair note whose census of struck sites the tree contradicts, and a recurrence of F-406 inside the paragraph carrying F-406's own correction. `closure-2` puts a false mechanical fact in front of the next developer to read `feature.ts`. `closure-4` is a register overreach whose underlying scope question — whether `test` and `size` are root verification — belongs to the owner. `closure-5` and `closure-6` are minor residues. **Whether any of them holds the round open is the consolidator's and the owner's call, not this pass's.**