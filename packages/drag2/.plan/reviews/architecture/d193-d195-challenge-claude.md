# Architecture challenge — D-193, D-194 and D-195

**Read at `9e74f52faa434cae373ce6f191d54b81f25deddf`**, in a detached worktree, and evaluated as candidate decisions at that commit. **The implementation at `34aedf520` was not read as evidence** and is not reviewed here; that is the independent implementation Reviewer's pass. This challenge is late — the decisions were recorded and then implemented before the gate ran — and the ordering defect is the reason every load-bearing claim below was re-derived from the tree rather than confirmed against what landed.

**Outcome: AMEND.** All three central decisions stand. Nine grounds do not, and each correction is forced by an executed probe or a standing instrument the entries do not cite. The corrections are recorded as **D-196**, **D-197** and **D-198**, superseding D-193, D-194 and D-195 respectively and carrying every surviving claim forward.

## Scope and method

Four question sets were pushed to falsification: the allocation authority and its instrument; the variance claim, its assignment edge and its published-surface cost; the upper/lower-bound split around F-404 and D-191's ground; and formatting authority as distinct from ordinary linting. Every mechanical claim cited below was executed in the detached worktree or read out of a current-state document at `9e74f52fa`.

Ten TypeScript probes were run against `packages/drag2/tsconfig.json` (`strict: true`), plus one declaration-emit probe, one `lint-fix` probe and three gate probes. `oxlint`/`eslint`/`oxfmt` probes were run in the main checkout after confirming `.oxlintrc.json`, `eslint.config.ts`, both `Justfile`s, `tsconfig.json` and `tests/packaging.node.test.ts` byte-identical between the two commits, and `package-lock.json` unchanged.

---

## D-193 — ratified in part

**Ratified.** The register is the allocation authority and **the registered id wins a collision**; a pass that mints an id writes its entry in the same commit that first uses it; a review artifact's `Local → canonical` table is a proposal until the register carries the rows. The disposition is correct: D-192's F-409, F-410 and F-411 stand, F-412…F-417 are confirmed, the three colliding ids are re-minted F-418, F-419 and F-420, and the swarm summary keeps its wording. Verified at `9e74f52fa`: `#### F-409`…`#### F-420` each occur exactly once in §Findings, so the same-commit rule was self-applied.

**The verbatim quotation of the swarm summary's procedure is accurate**, and F-63's shape — a documented claim with no instrument over its counterpart — transfers.

### A1 — the rule names one document where the families have four owners

D-193 states that a canonical `D-`, `F-`, `Q-`, `I-` or `O-` id is allocated in `00-index.md` **and nowhere else**, "so the register is both the allocation authority and the place an allocator scans". Counted at `9e74f52fa`, `00-index.md` carries `####` claims for exactly two prefixes — 195 `D-` and 383 `F-`. The other three families are owned elsewhere:

| Document                                  | Families claimed |
| ----------------------------------------- | ---------------- |
| `contract/00-index.md`                    | `D-`, `F-`       |
| `contract/02-kernel-behavior-contract.md` | `P-`             |
| `contract/05-lifecycle-invariants.md`     | `I-`, `M-`, `Q-` |
| `contract/07-free-drag-contract.md`       | `B-`, `K-`, `L-` |
| `obligations.md`                          | `O-`, `SC-`      |

So the rule is false for three of its own five prefixes, and it contradicts a standing entry it does not cite. **D-174** already states the correct form: _"Canonical ownership is the register that holds the family — this file for `F-*`, 05 for `I-*` — which is where each family's complete ordered set already lives."_ D-193's contribution is not the site; it is the _timing_ and the _precedence_, which D-174 does not carry.

`contract/README.md` repeats the same error independently — _"Decision, finding and invariant ids — `D-`, `F-`, `I-`, `E-`, `Q-` — are declared in `00-index.md`"_ — and is corrected in the same change. **F-421.**

### A2 — the owed instrument is already shipped, and broader

D-193 requires _"one regex over a file the ledger already parses — no two `####` headings in §Findings share an identifier"_, on the ground that _"a rule whose only enforcement is that allocators read it is the rule that just failed"_.

That enforcement is not owed. `tests/ledger.ts` `violations()` accumulates every heading whose first token is an identifier, **at any depth and with no prefix filter**, and reports `duplicate claim: <id> — <site>, <site>` whenever one is claimed twice. It runs over `CURRENT_STATE` — all of `.plan/contract` plus `obligations.md` — and is wired into `tests/decisions.node.test.ts`:

```ts
it('should hold the invariant across every current-state document', async () => {
  expect(violations(await tree())).toEqual([]);
});
```

The rule is also already normative, in `CONTRIBUTING.md` §Reading one entry: _"A heading **opening** with an identifier claims it… It sits at `####`, and no identifier is claimed twice anywhere in the tree."_ D-174 records the same invariant as the reason the claim reader exists at all.

D-193's check is a **strict subset** on three axes — one section against the whole current-state tree, `####` against every depth, `F-` against every prefix. Specifying it is at best a duplicate and at worst a regression, since a narrower check written to the entry's words would not see a duplicate `#### D-` or a `###` restatement, which is the blind spot F-287 exists for. The obligation is withdrawn. **F-422.**

### A3 — the second allocation surface is mandated, not unmaintained

D-193's stated cause is that _"the package has two allocation surfaces and one of them is unmaintained"_, and that _"a consolidator may mint canonical ids into a review artifact; nothing then carries them into the register, and nothing notices"_.

The second surface is not an omission. It is required, by two instruments the acting role is instructed to retrieve:

- `.agents/docs/review-findings.md` §Artifacts — _"**Canonical ids are assigned at consolidation.** There is no collision-free allocator for `F-`/`Q-`/`I-` — they are hand-numbered — so parallel passes would race. Each pass numbers within itself; **the summary assigns canonical ids and carries the local→canonical mapping.**"_
- `.claude/agents/consolidator.md` — _"assign canonical `F-`/`Q-`/`I-` ids with the local→canonical mapping"_, and _"**Allocate each canonical prefix independently** — a separate high-water mark for `F-`, `Q-` and `I-`."_

The Arc D swarm summary's stated procedure is a verbatim execution of the second. **The consolidator complied with the rule in force.** D-193 names neither instrument and amends neither, so after it the repository holds two contradictory normative statements — and the one the acting role is told to read says the opposite, while living outside the package a drag2 decision can reach. The failure recurs on the next round, and A2's instrument cannot see it, because ids that never reach the register produce no duplicate claim.

**The substance is a strict refinement, not a reversal.** The race `review-findings.md` guards is between parallel lens passes, and D-193 leaves that untouched — lenses still number within themselves. The race D-193 addresses is between _rounds_, which `review-findings.md` never considered, and the register is a better serialization point than the summary precisely because it is single. Both instruments are amended to say that the summary **proposes** canonical ids and the register **assigns** them. **F-423.**

---

## D-194 — ratified in substance

**Every mechanical claim reproduced.** Executed at `9e74f52fa`, baseline `tsc -p tsconfig.json --noEmit` exit 0:

| Probe | Result |
| --- | --- |
| Add `snapshot: CollectionSnapshot \| null` to `y.ts`'s **local** `InsertionRuntimeView`, method shorthand | **exit 0** — silent |
| Same mutation, `resolve`/`moved` as named aliases | **exit 1** at `y.ts(188,3)`, _"Types of parameters `runtime` and `runtime` are incompatible. Property `snapshot` is missing in [published] but required in [local]"_ |
| Conversion alone | **exit 0** |
| Convert `SortableSlots.resolveInsertion` instead, same mutation | **exit 0** — the wrong site, as stated |
| `npx just lint-fix src/sortable/feature.ts` over the converted file | exit 0, `resolve: ResolveInsertion;` and `moved: MovedInsertion;` standing |
| Empty published `InsertionRuntimeView`, named aliases | **6 errors**, including `src/sortable/y.ts` and `src/sortable/xy.ts` |
| Empty published `InsertionRuntimeView`, method shorthand | **4 errors**, all in one test fixture; **both shipped axes green** |

So the variance claim is genuinely caused by method-shorthand bivariance, the repaired assignment edge is `AxisContribution.insertion` and not the flattened record, and the lower bound on the published view arrives from the axis assignment exactly as claimed. The rule is authored twice in the two `config.ts` files as described — and a third time, in `03-feature-composition.md` §The export topology this requires under F-51, which D-194 does not cite and which strengthens the D-177 analogy rather than weakening it.

**The F-404 split is sound.** `feature.declaration.test.ts` carries three rows. The disjointness row — `keyof InsertionFrameView & keyof InsertionRuntimeView` is `never` — is a genuine and separate falsifier. The two owner's rows are `expectTypeOf<Owner>().toExtend<View>()`, which gets monotonically easier as the view narrows and is vacuous at `Readonly<{}>`; the probe above confirms emptying either leaves them green. They bound each view **from above**, and the widening probe fired the runtime owner's row at `:120`, which is the property they actually hold. Three live documents credit them with a lower bound and are wrong to; **two more do** — F-404's own repaired paragraph and its Required-property clause, both in `00-index.md`, which D-194's count of three omits.

### A4 — the export is a choice, and its stated ground is false

D-194: _"`ResolveInsertion` and `MovedInsertion` **must be exported for declaration emit**."_

Executed: with both aliases declared **without** `export`, the project typechecks at exit 0 and `tsc --declaration --emitDeclarationOnly` emits `sortable/feature.d.ts` carrying both, un-exported, referenced by `InsertionGeometry`. No `TS4081`. The export is not compelled.

The cited precedent is also at the wrong tier. `SortableOnEnd`, `ResolveHandle` and `ResolveElement` are **ordinary-tier** config aliases, listed in `03`'s `sortable.js` row for consumer-filled config slots — not middle-tier names, and not slots whose parameter is a published view. And `03` has no §Published rows at the middle tier: the destination is a prose list and the name cell of one table row.

**Two grounds do hold, and they are the ones to record.** `sortable.ts` publishes the three installer aliases so _"a consumer who writes one can hoist it into a typed `const` rather than only fill the slot inline"_ — a third-party axis author filling `InsertionGeometry` has exactly that need. And `03`'s closure rule means `InsertionGeometry` already structurally names both signatures, so the export adds two visible names and no structural surface. `CONTRIBUTING.md` §8 is not reached — nothing is being replaced, and the shorthand members had no alias to deprecate; the sections that price an added public name are §4 and §12.

**The conversion and the export both stand.** Only the reason changes.

### A5 — the rule's antecedent is wider than its scope

As written — _"A declared slot whose parameter is a published view is written as a named function alias, never as method shorthand"_ — the rule also covers two sites D-194 leaves in shorthand without saying why:

- `MotionConstraint.apply(motion: MotionDraft, view: ConstraintView)` in `free-drag/feature.ts`, the structurally identical slot on the sibling middle-tier contribution type a third-party bounds author fills. Neither `config.ts` block governs it, so D-194's _"the two `config.ts` blocks already govern their own files"_ does not cover this one.
- `SortableSlots.resolveInsertion` and `.movedInsertion`, whose parameters are the same two published views.

Both are correctly **out of scope**, and the reasons are recordable rather than assumed. `SortableSlots` is internal — `consumer.node.test.ts` asserts it unimportable from the entry — and has one library-owned fill site, `assemble.ts` assigning straight from `axis.insertion.resolve`/`.moved`, so its bivariance has no third-party edge to exploit. `free-drag` has no local narrower view today: `bounds.ts` imports `ConstraintView` directly. The free-drag hole is therefore **latent, not open** — and `slots.ts` documents the local-narrower-view pattern as the intended one, so the first free-drag constraint author to follow it reopens the same defect with no instrument. Naming both sites is what stops the rule reading as either over-broad or under-applied.

### A6 — D-194 adds a protection rather than restoring a lapsed ground

D-194: _"F-413 establishes that the citation reproduced at the **baseline** and stopped holding at the **landed tree** … this decision is what makes its stated ground true again instead of leaving it standing while false."_

D-191's ground is _"both memberships are pinned, in both directions, and every mutation this arc makes is already red"_, and its four mutations are all to the **published** views. Executed at `9e74f52fa`, method shorthand:

- **widening** the published runtime view — 9 errors, at `spec.ts` ×3, the owner's row in `feature.declaration.test.ts`, and both browser fixtures ×5;
- **narrowing** it to nothing — 4 errors, in `sortable.browser.test.ts`.

`just typecheck` is red in both directions. **D-191's ground was not false at `9e74f52fa`.** What lapsed is its _citation_ of `xy.ts:158` and `y.ts:181`, and only for the narrowing direction, because F-325's deletion of `insertion` restored one bivariant direction. F-413's own probe mutates a **local** view — a class D-191 never claimed to cover, and one no instrument in the tree pinned.

The correction is to the characterisation, and it makes the decision stronger rather than weaker: D-194 closes a hole nobody had booked, instead of repairing a claim that had gone false. **D-191's conclusion is not reopened**, and its judgment that key-set rows were not owed is ratified here on re-executed evidence.

**One residual is worth stating.** The lower bound the conversion supplies is _what a shipped axis demands_, not _what the behavior supplies_. Narrowing the published view and every local view in lockstep stays green. That is a real limit of the mechanism, it is smaller than the hole it closes, and D-194 does not overclaim past it.

### A7 — the declaration-weight obligation is mis-targeted

D-194 books _"the published declaration weight, which Arc D already priced at 116,389 → 116,432 B, and the repair records the new figure there."_

`arc-d.md` records **116.39 kB to 116.43 kB**, to two decimals; the byte figures appear only in the round's review artifacts. Two consequences: at that precision a two-alias conversion may not move the recorded figure at all, which makes the obligation as written unfalsifiable; and the sentence holding it is a narrative about **Arc D's own** cost, attributed to `snapshot`'s docblock arriving on `InsertionFrameView` — a different change. **Required property:** the figure is recorded at a precision that can falsify it, in the measurement that owns the change producing it. **F-425.**

---

## D-195 — ratified in substance

**The authority follows from the workflow, not from picking a winner between disagreeing tools.** `handoff.md` §Verify what you changed already names `just fmt` as the step that _formats_ and `lint-fix` as the step that _lints_, and the package `Justfile` binds `fmt`/`fmt-check` to `oxfmt`. Making the writer authoritative reads the existing division of labour rather than adjudicating a tie. The distinction from ordinary linting is drawn correctly: a rule that reports a _property of the text a formatter owns_ is a second formatter; every other rule is not.

**The contradiction reproduces.** `npx oxfmt --check tests/packaging.node.test.ts` answers _All matched files use the correct format_; `npx oxlint tests/packaging.node.test.ts` answers `321:10: error prettier(prettier)`. The reasoning that a permanently red gate stops reporting the next error, and that a version bump is not the repair, both stand. Booking the repository-level edit outside a drag2 round is the right boundary and is consistent with how D-193's own scope was drawn.

### A8 — `prettier/prettier` is set at two sites, not one

D-195 names one: _"The root `.oxlintrc.json` loads `eslint-plugin-prettier` as a JS plugin and sets `prettier/prettier` to `error`."_ That is true and incomplete. Executed on the same file:

```
$ npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts tests/packaging.node.test.ts
  321:10  error  Replace `⏎··········await·sources(SRC)⏎········` with `await·sources(SRC)`  prettier/prettier
```

Root `eslint.config.ts` spreads `eslint-config-vaadin/prettier`, which is `defineConfig(prettierConfig, { plugins: { prettier }, rules: { 'prettier/prettier': 'error' } })`. The package `lint` recipe runs `oxlint` then `eslint` under `set -euo pipefail`, so **the first failure masks the second** — which is why one site was visible and one was not. A repair confined to `.oxlintrc.json` leaves `just lint` red on the identical file at the identical position.

The booked repository-level repair covers **both** rule sites. `eslint-config-prettier` — the half that _disables_ stylistic rules — is not the defect and stays; the root `.prettierrc.json` and `.prettierignore` are then configuration for a formatter no gate consults, and their disposition belongs with the same edit. **F-424.**

### A9 — the clause is contradicted inside the section it amends

The amendment states _"One tool decides formatting, and a lint rule may not re-decide it. `just fmt` is the authority."_ Three bullets below, the same section still says: _"Root-level Markdown is not in any package, so format it with `npx prettier --write <files>`."_

A reader applying the new sentence literally reports the standing instruction as a gate defect. The clause is scoped to the files a package's `fmt` owns, which is the domain the evidence covers and the domain the contradiction lives in; root-level Markdown, which no `oxfmt` invocation reaches, keeps its own writer and is named as the exception rather than left to be discovered.

---

## Standing instruments, contracts and boundaries

| Checked | Result |
| --- | --- |
| D-174 — canonical ownership per family | **Conflict with D-193** (A1); D-196 restates the rule as D-174 already has it |
| `contract/README.md` — where ids are declared | **Conflict** (A1), corrected in this change |
| `CONTRIBUTING.md` §Reading one entry, `ledger.ts` `violations()` | **Duplication** (A2); the obligation is withdrawn |
| `review-findings.md`, `consolidator.md` | **Conflict with D-193** (A3), both amended |
| D-177 | Analogy holds; D-194's is the weaker instance — two authorings in one file category, one argument |
| D-12 / D-61 | No conflict. D-12's text carries no tier rule; the middle tier is D-61 with D-146, and "under D-12" follows established loose usage in the register |
| `CONTRIBUTING.md` §8 | **Not reached** (A4) — a deletion permission, and nothing is being replaced |
| `CONTRIBUTING.md` §4, §12 | Uncited by D-194 and the sections that actually price an added public name (A4) |
| D-191 | Conclusion untouched and ratified; its ground stands on re-executed evidence (A6) |
| Publication tiers, `sortable.ts` entry surface | No conflict. `InsertionGeometry` is middle tier; the two aliases add no structural surface |
| `CONTRIBUTING.md` for D-195 | Correctly unaffected — formatting authority is a gate rule and `handoff.md` is its home |

## Observation, routed and not amended here

The root `Justfile`'s `fmt`, `fmt-check` and `typecheck` project lists omit `drag2` where `lint` and `lint-fix` include it, while `handoff.md` says `just typecheck` _"checks all packages"_. Outside all three decisions; noted for a later round.

## What this pass did not do

The implementation at `34aedf520` was not read, cited or verified. Where an amendment withdraws an obligation or widens a booked repair, whether the tree already reflects it is the implementation Reviewer's question, not this gate's.