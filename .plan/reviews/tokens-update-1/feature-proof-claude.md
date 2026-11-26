# tproc's token store, steps 2 and 3: feature proof

**Files were read at:** `7d632a931` (`tproc/tokens-update-1`, PR #87), in a scratch worktree of my own. **Diff reviewed:** `645410c12`, the branch's merge base with `main`, to `7d632a931`: the converter and its tests (`303f01eac`), and the store, the report, the workflow and the record (`7d632a931`).

**Governing records:**

- `repo:RD-28` in [`00-index.md`](../../decisions/RD-28.md), with its dated block for steps 2 and 3, ruled at `a5c9be8a3`;
- the [plan](../../tokens-source-1/tokens-source-plan.md): _Steps, revised_, steps 2 and 3, proofs P6 to P9, _The converter's checks_ as amended, and _Rulings for steps 2 and 3_;
- the owner's rule for CSS changes, relayed by the coordinator: _"the spec matters most; components must not break"_.

**Lens:** feature proof. Each claim below comes from my own reading or my own run ([transcript](checks/proof.txt), with the probe scripts beside it). Nothing is repaired, and no record is amended.

**Personal data:** I fetched the release's 14 tables into a scratch directory outside the repository, and read them by key, count and token name only. This report and its transcript quote no value of an author, revision or settings field. The directory is deleted.

**Verdict: steps 2 and 3 meet the plan and the rulings, and no finding blocks.** A fresh fetch of the release reconverts to the committed store byte for byte. The covering rule is implemented as ruled, and a copy that the rule doesn't cover is refused with both tables named. The one CSS change is the `xsmall` icon-to-label gap. No token or set was removed or renamed. The gate passed at `7d632a931`, and no visual baseline changed. Four Tier C findings follow. Two are for the architect, and two are for whoever takes the next update unit.

## Scope

**Covered.**

- **The update, rerun.** I fetched release `2026-11-19_06-20-01` from the manifest's 14 rows and ran `convert()` with the manifest's release and fetch date. All 104 files are byte-identical to the committed store, with no conflict, and the count of covered copies is 704 for 217 tokens.
- **P6.** `manifest.json` names one release and one database, `41.1.12`, version `4ae102170fee99b1`, at `storeVersion` 2. The converter's one-release check passed outside legacy mode on the fresh tables.
- **P12, rerun** with the implementer's script on the fresh tables. 3,980 tokens, 983 groups and 143,717 child nodes read back to the tables' own ids and values, and no row differs.
- **The covering rule, against the ruling's text.** `covers()` in `scripts/convert.ts` returns true when two copies are deep-equal. Otherwise it requires that the covered copy has no `contextualReferenceTree`, equals the covering copy in every other field but `values`, and has `values` entries that each match a different, unused entry of the covering copy's. The match is greedy over an equivalence relation, so it is an exact multiset inclusion. The kept copy is the first, in manifest order, that covers every other copy. If no copy covers every other copy, the converter refuses and names the copy with a tree, or the first copy, and a copy it doesn't cover.
- **The ruling's readings of this release, from the raw tables and without the converter.** Of 433 tokens with several copies, 704 copies differ from the copy with the tree. None of the 704 has a tree, none differs in another token field, and each has values that form a sub-multiset of the tree copy's. 98 of them have fewer values, and 27 have their values in another order. 7 pairs are of two system tables. The copy with the tree is always the first copy in manifest order.
- **Refusals of my own, on the real tables:**
  - a partial copy with one entry repeated in place of another, read after COLOR and read before it;
  - a partial copy with another display group;
  - a partial copy given a tree that differs;
  - a partial copy given COLOR's tree with its own values in another order.

  Each is refused as `TOKEN_TABLE.1c4257f8804f9478: md.sys.color.primary: token: no copy covers both this one and the one in COLOR.20543ce18892f7d9`. An in-order partial copy given the identical tree is accepted, and the store is unchanged.

- **The reorder check.** With the system tables read last, and with all tables in reverse order, all 3,980 tokens convert to the same content, and `context.json`, the set fields and the display groups are unchanged ([`reviewer-3`](#reviewer-3)).
- **The step 2 key rulings.** All 14 tables carry `system.navigation`, and the store has no `navigation` or `guidelinesNodes` key. `context.json` holds the description of each of the 140 group records and 392 tag records, equal to every table's.
- **P3.** No email address and no `gaiaId` key in the store. The only hit for `navigation` is in a token's description text.
- **material-x's CSS.** I built tproc at `645410c12` and at `7d632a931` and compiled the 34 tracked `src/**/*.css.ts` at each. Only `button/styles/size/main.css.ts` differs, by `--_icon-label-space: 4px;` in `:host(:state(xsmall))`. `.storybook/theme.css`, regenerated at each revision, is identical.
- **No token material-x uses was removed or renamed.** The store's token and set names: 0 removed, and 31 added, which are 30 tokens and the set `md.sys.measurement`. Of the 27 `md.*` literals in material-x, `.storybook` and `.scripts`, 23 name a token or a set in the new store. The other 4 are set-name prefixes, or `md.comp.radio-button.container.size`, which `radio/spec-consistency.md` already records as missing upstream. All 4 were absent before the update too.
- **The gate,** [run 44731705050](https://github.com/ausginer/material-x/actions/runs/44731705050) on `7d632a931`. Every job passed except `records` and `deploy`, which were skipped. In chromium, the visual project ran its four files and passed: `button-group`, `button`, `checkbox` and `radio`. No baseline image changed in the diff. **The visual baselines don't render this change:** the button matrix has `xsmall` only without an icon, and an icon only at the default size. The spec contract does observe it: _"should render the tokenized icon-to-label gap"_ compares `columnGap` with `icon-label-space` for each size, `xsmall` included, and passed in all three engines.
- **`.github/workflows/tokens.yml`:**
  - both actions are pinned by SHA, the same ones as in `safari.yml`, `baselines.yml` and `release.yml`;
  - the top level and the check job have `contents: read`, and the issue job has only `issues: write` and no checkout;
  - it uses no secret other than `github.token`, and each value reaches the shell through `env`;
  - the label is `tokens-release`, and `work-queue.md` names it as a non-queue label;
  - the issue step comments only when neither the issue body nor a comment contains `database <current database>`, which matches the ruling.

  `check-release.ts` imports only Node's built-in modules and type-only or built-in-only modules, as the workflow's comment says. Against the site today it reports that the store has this database.

- **The update report** ([`reviewer-2`](#reviewer-2)).

**Not covered.**

- P5's 21 mutations and P9's stub `gh` cases. I read both scripts and ran my own refusal witnesses instead. I didn't rerun the stub cases.
- P8's local runs in three engines. I read the gate's result instead.
- P9 after merge is still owed, as the plan states.

## Findings

### `reviewer-1`

**Tier C. Two overlapping runs of `tokens.yml` can open two issues.**

- **Current behaviour.** `tokens.yml` has no `concurrency` key. The issue step first lists the open `tokens-release` issues and then creates one. Two runs that overlap, such as the schedule and a `workflow_dispatch`, or two dispatches, can both find no open issue and both create one.
- **Why it is a problem.** The ruling says the workflow opens the issue only when no issue with the label is open, and P9 after merge expects exactly one issue. `safari.yml`, `baselines.yml`, `release.yml` and `verify.yml` each have a `concurrency` group. `safari.yml` uses one for the same list-then-create pattern.
- **Evidence.** `.github/workflows/tokens.yml` has no `concurrency` key. Compare `safari.yml`, lines 18–23.
- **Required property.** At most one open `tokens-release` issue results from any set of runs.

### `reviewer-2`

**Tier C, for the architect. The script's report can't separate a reference that renders the same from one that changes rendering.**

- **Current behaviour.** `diffStores` lists each selected one-hop reference or literal that changed, as plan point 6 requires. At this release, 104 rows change, and 94 of them are a length literal replaced by an `md.sys.measurement.space*` reference. The report doesn't give the resolved value, so `8dp → space100` (still 8dp) reads the same as `8dp → space50` (now 4dp). The 10 typescale rows are each two JSON objects of about 800 characters, and the only difference is an added `variationAxes`. The owner can judge this release only through the CSS section, which the implementer added by hand.
- **Why it is a problem.** Point 6 makes the report the review instrument for an update. The plan requires the CSS difference in the report, but the script doesn't produce it, and no script or skill step names how to make it. The skill says only that the pull request carries the difference. The next update's report depends on someone repeating this release's manual step.
- **Evidence.** `scripts/report.ts`, `selectedValue` and `diffStores`. In [`step-2-report.md`](../../tokens-source-1/checks/step-2-report.md), the opening line says _"The CSS section at the end was added by hand"_.
- **Required property.** This one is the architect's call, because point 6 sets the report's content. It stays inside point 6 as written. My reading: an owner can tell from the update report alone which changes alter what material-x renders.

### `reviewer-3`

**Tier C. The store's token order inside a set depends on the order the tables are read in.**

- **Current behaviour.** With the system tables read last, the token order changes in 8 set files. With all tables reversed, it changes in 10. Each token's content is unchanged, and so are the set fields, the display groups and `context.json`. The ruling's proof is about token content, and it holds.
- **Why it is a problem.** The plan stores _"its tokens, in upstream order"_. Upstream order depends on which table's order lists the set's tokens first. Today the manifest lists the system tables first, so the order is each token's own table's. Nothing renders differently, because the reader's first-match rule reads the order of values, not the order of tokens. A manifest that lists a component table first would still rewrite those set files. P2's determinism holds only for a fixed manifest order.
- **Evidence.** `checks/reorder.ts.txt` and `checks/compare.ts.txt`, in the [transcript](checks/proof.txt).
- **Required property.** The store's bytes depend only on the release's data, or the record names the manifest's table order as an input of the store.

### `reviewer-4`

**Tier C, for the architect. The ruling's _"Where several copies cover every other, they are identical"_ isn't true in general, and no test covers the repeated-entry case.**

- **Current behaviour.** Take two copies with no tree, equal in every other field, holding the same entries in another order. Each covers the other, and they aren't identical. The implementation keeps the first one in manifest order, which matches the ruling's tie-break. At this release, 11 tokens have several copies and no copy with a tree, and their copies list their values in the same order. So the case doesn't occur yet.
  - Separately, `convert.node.test.ts` has no case for a partial copy that repeats one of the covering copy's entries in place of another. That case is the _"a different entry"_ clause. My witness on the real tables shows that it refuses.
- **Why it is a problem.** The record justifies a choice with a property that doesn't hold. If a later release has tree-less tokens whose copies order their values differently, which order is stored depends on the manifest's table order, as in [`reviewer-3`](#reviewer-3). Nothing in the record says so. The unit tests would pass with an inclusion check that ignores the count of each entry.
- **Evidence.** `covers()` in `scripts/convert.ts`. `checks/cover.ts.txt` gives _"11 with none"_ and no tree-less token ordered differently. The first case in `checks/refuse.ts.txt` is the repeated-entry witness.
- **Required property.** The record's statement about mutually covering copies is true. The _"different entry"_ clause has a witness in tproc's suite.

## Not findings

- **The P12 script reads _"first table wins"_, not the covering copy.** That is valid at this release, because each covering copy comes first in manifest order. If that changed, P12 would report a `DIFF`. It would not miss a defect.
- **`check-release.ts` treats a database as unchanged only when both `versionName` and the version id match a recorded one.** That is one reading of the ruling's _"by `versionName` or version id"_, and it is the stricter one.

## Handoff

- **Outcome:** steps 2 and 3 meet `RD-28`'s plan and rulings at `7d632a931`. The gate result, with no changed baseline, is now recorded here on the branch.
- **Open:** `reviewer-1` and `reviewer-3` are for whoever takes the next update unit. `reviewer-2` and `reviewer-4` are for the architect. P9's `workflow_dispatch` run is owed after merge, on the owner's go.
- **Next:** the coordinator routes the four findings. None of them blocks PR #87.