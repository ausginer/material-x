# #340, token tables for 20 Material components, and `repo:RD-69`'s references into another design system: feature proof

**Files were read at:** `f5e5ba894`, the head of #340 (`tproc/component-tables-1`), in slot `h`, against `origin/main` at `2ed4b96ab`, which the branch merged at `69cd38e03`. This record adds only files under `.plan/reviews/component-tables-1/`.

**Subject:** `repo:RD-69` and its implementation in `156e4dce8`, the converter's description fix `570e73e1e`, the update of `f73dfffa4` and `ccca725c5` against the `use-tokens-db` skill's rules and `RD-28`, the claims of [`token-tables.txt`](../../component-tables-1/checks/token-tables.txt) and the two reports, `RD-69`'s status sentence under `RD-68`, and #340's description. Requested by the coordinator.

**Verdict: the converter meets `RD-69`, and the store and CSS claims are true.** The update rerun from the dated release writes a store byte-identical to the head's. Run from `main`'s store, it writes the same store and reports 2062 tokens added, 0 removed, 241 deprecations and 0 selected values changed. The 44 stylesheets are byte-identical. In the real table, the converter skips no reference into Material 3's own system. **Four findings:** `fp-1`, tier B, and `fp-2` to `fp-4`, tier C. `fp-1` and `fp-2` are the implementer's, and `fp-4` is too. `fp-3` is routed to the architect. **`verify` passed on the head:** run [46061614947](https://github.com/ausginer/material-x/actions/runs/46061614947), in full despite the `[noci]` subject, with `chromium`, `firefox` and `webkit` green.

## Scope

**Covered:**

- **The diff** `origin/main...f5e5ba894` outside the store: `scripts/convert.ts`, the converter's rows, `RD-28`'s amendment, `RD-69`, the plan's new section, and the unit's `checks/`.
- **The update, twice** ([transcript](checks/update-and-css.txt)). First on the committed store. Then from `main`'s store with the 20 rows added to its manifest, which gives the [report](checks/update-from-main-report.md) of the whole unit in one run.
- **The store's files against `main`'s,** by blob. **material-x's 44 tracked `css.ts`,** generated with each store.
- **Probes:**
  - the store through tproc's reader ([probe](probes/store-probe.ts.txt), [output](checks/store-probe.txt));
  - the raw Progress indicators table, read in memory, printing only names, counts and keys, and both stores' child nodes ([probe](probes/raw-probe.ts.txt), [output](checks/raw-probe.txt));
  - three probe rows, run unmutated and under R1 to R3 ([rows](probes/probe-rows.ts.txt), [runner](probes/probe.mjs.txt), [output](checks/probe.txt)).
- **Mutations:** five of this review's ([runner](probes/mutate.mjs.txt), [output](checks/mutations.txt)). The implementer's M1 and M2 were repeated ([output](checks/implementer-m1-m2.txt)). M3 and M4 are read from the implementer's [record](../../component-tables-1/checks/foreign-references-witness.txt).
- **Suites:** tproc, 14 files and 356 rows, unmutated. **CI:** the head's `verify` run, read for its jobs' conclusions.

**Not covered:** material-x's suites locally. Its CSS is byte-identical, and CI's three engines pass on the head. Also not covered: the weekly check, and a raw table of another release.

**The engines.** The affected rows are node rows (`convert.node.test.ts`), and no browser reads the converter. The store reaches material-x only through its CSS, which doesn't change. So the mutations ran once, in Node, with no engine to choose. That matches the coordinator's _"in Chromium per RD-62 where a browser matters"_, and here none does. The head's `firefox` and `webkit` jobs passed. They run material-x's browser projects, which read the unchanged CSS.

**Interim mutation runner.** `@ydinjs/mutator` isn't on `main`, so `RD-62` Q1's interim answer (a) holds. The mutations were applied in slot `h`'s tree, one at a time, and `scripts/convert.ts` and the test file were restored from git after each. `git status` was empty after every run.

## The decision against the code

| `RD-69` | Reading |
| --- | --- |
| **Property 1,** which reference is another system's | **Met, with `fp-3`'s reading of "Material 3's".** `TableReader` takes `designSystems/<id>/` from `system.version.name`. A child node whose value id doesn't start with it is foreign, and so is every node below it (`belowForeign`). A node with no id is Material 3's. `checkReferences` collects the names of the token's foreign nodes and their descendants, and admits a `values.tokenName` only if it is among them. `customComposite` references are still checked. **In the real table:** 1413 tree nodes, of which 1301 have Material 3's ids and 112 have `1b063509fc205e38`'s, 56 at depth 1 and 56 at depth 2. All are in the 8 tokens' trees. No Material 3 node and no node without an id is below a foreign one, and every child node has an id. The 8 `values` entries that name `goog.ref.brand-color.*` have Material 3's own id, so they are recognised only through the tree, as the property says. |
| **Property 2,** stored as upstream gives it | **Met.** In the store, the only names that reach no stored token are the 4 `goog.ref.brand-color.*` and the 4 `goog.ref.brand-palette.*-500`. They appear in 8 `values` entries and 112 tree nodes, all in the 8 tokens. None of these nodes has a `value` index, none is a root, and no stored token is below one. `storeVersion` is 2, and no key is added. |
| **Property 3,** not checked, and every other check holds | **Met.** Foreign nodes are left out of `unresolved` and out of the walk of `checkReferences`. The other checks run on their tokens and entries. Every child node that names a stored token has its `value` index: 260427 in the head's store and 157540 in `main`'s. |
| **Property 4,** Material 3's own references still checked | **Met in the code; the rows don't show all of it** (`fp-1`, `fp-2`). Unmutated, a missing reference with Material 3's id is refused, as is one with no id. So is a `values` reference that only another token's foreign node names. The latter two are shown by this review's probe rows, not by a row of the branch. |
| **Property 5,** selection | **Met.** Each of the 8 tokens selects its `audience: 3p` entry, which references `md.sys.color.{primary,primary-container,tertiary,tertiary-container}`. Each has 28 tree entries, tagged `3p` or `1p.baseline`. |
| **The implementer's list** | **Met.** The two checks are narrowed, there are four rows, and the 20th row is appended so that the 19 stay a prefix. The update was rerun, the report lists its 5 sets, the CSS is identical, and the transcript shows the 8 tokens' selected entries. |

**The description fix** (`570e73e1e`): `description` is read with `optionalString` and written only when present, which matches `schema.ts` and `tokens-source-plan.md`. Its row fails when the field is required again (R7).

## The update against the skill and `RD-28`

- **A dated release:** every table comes from `2026-11-19_06-20-01`, database `41.1.12`, version `4ae102170fee99b1`, and never from `latest`.
- **Every key ruled:** `RECORD_KEYS` and the value specs are unchanged except for the optional description. The 20 new tables convert without refusal, so every key in them is ruled.
- **One entry per token:** the update ran without refusal, so the rendered context has exactly one entry for each token with a tree.
- **Covered copies:** 2162 copies of 335 tokens, and 0 conflicts.
- **No raw table:** outside the store, the paths changed against `main` are only `.plan/` and tproc's `scripts/` and `tests/`. The store has no `emailAddress` or `gaiaId` key and no email address.
- **The claims:**
  - 2062 tokens added (2006 + 56), 0 removed, 241 deprecations (208 + 33), and 0 selected values changed.
  - 122 of the 123 earlier store files are byte-identical. `md.sys.measurement` only gains `md.sys.measurement.space500`.
  - 6366 tokens and 180 sets.
  - A second run gives an identical store.
  - The 44 stylesheets are identical, and none is empty.
  - The 8 tokens select `audience: 3p`.

  Each was reproduced.

## Mutations

**This review's**, predicted before running:

| Mutation | Removes | Predicted | Outcome |
| --- | --- | --- | --- |
| R1 | `belowForeign`: a node below a foreign node is classified by its own id | survives | survived: `fp-2` |
| R2 | a child node with no value id is read as another system's | doubted | survived: `fp-1` |
| R3 | `foreignNames` shared across tokens, so another token's foreign node admits a `values` reference | survives | survived: `fp-1` |
| R4 | a foreign node goes through the child-value check | fails the two admitted rows | as predicted |
| R7 | `description` required again | fails the description row | as predicted |

**The implementer's:** M1, the converter at `64bdc23e5`, fails the two admitted rows, and M2, `checkReferences` removed, fails the two refused rows. Both are as the record says. M3 and M4 are read from the record, each failing one refused row.

**The probe rows,** appended to the converter's test file for the probe only. All three pass unmutated. Each fails under exactly one of the three survivors:

- _probe: should refuse a missing reference whose child node has no value id_ fails under R2;
- _probe: should refuse a values reference that only another token's foreign node names_ fails under R3;
- _probe: should refuse a node with Material 3's id below another system's node_ fails under R1. Its name is misleading: it asserts that the table converts, which is property 1's reading.

## Records and the pull request

- **`RD-69`'s status:** _"**Unimplemented.** The implementer of #335 implements it on this branch, with the 20th table. **Implemented** by #340."_ This is `RD-68` property 2's form: the earlier sentence keeps its words, and _"Implemented by #N"_ follows it. It names no merge. It names no branch as the status either: _"on this branch"_ is the architect's instruction, written when the decision was made.
- **`RD-28`'s note** names the part superseded, and property 5 says _"in Material 3's own system since `RD-69`"_.
- **#340's description,** at head `f5e5ba894`: it has no session link and no bare `@name`, and it closes #335. Its numbers, the converter changes and the checks match the branch. It says _"a design system other than the table's own"_, where `RD-69` says Material 3's (`fp-3`). Its four record links don't resolve on GitHub (`fp-4`).

## Findings

### `fp-1` — tier B: no row fails a converter that admits a missing reference into Material 3 without an id, or through another token's node

- **Finding:** two of `RD-69` property 1's boundaries have no row, and both fail in the direction of admitting a reference into Material 3's own system. Under R2, a child node with no value id is read as another system's. Under R3, a `values` reference is admitted when a foreign node of any token names it. Under each, the converter stores a missing reference unchecked. The 53 rows pass under both, and so does the real update, because this release has no child node without an id and no such `values` reference.
- **Current behaviour / contract:** the code is right. Unmutated, both cases are refused (probe rows 1 and 2). `RD-69` property 1 says that any other reference is Material 3's, _"including one that has no id to read"_, and that a `values` entry is another system's only when a node _"of the same token's trees"_ names it. Property 4 says every reference into Material 3's own system is still checked. The decision asks that _"each witness fails a converter that classifies by the wrong rule"_.
- **Why it is a problem:** the four rows are the record's proof that no reference into Material 3 is admitted (#340: _"Each fails under a mutation that classifies by the wrong rule"_). They pass two converters that classify by a wrong rule and admit such references. A later edit of the classification could make either change, and no row or update would refuse it.
- **Evidence:** [mutations](checks/mutations.txt) R2 and R3: 53 passed each. [Probe rows](checks/probe.txt): rows 1 and 2 pass unmutated and fail under R2 and R3. [Raw table](checks/raw-probe.txt): _"child nodes with no id 0"_.
- **Required property:** a row fails a converter that admits a missing child-node reference with no value id. A row fails one that admits a `values` reference that only another token's foreign node names.

### `fp-2` — tier C: no row fails a converter that classifies a node below a foreign node by its own id

- **Finding:** `RD-69` property 1's _"and every node below it"_ has no row. Under R1, each node is classified by its own id alone, and the 53 rows pass. The admitted row's depth-2 node has a foreign id of its own, and so does every depth-2 node in the real table.
- **Current behaviour / contract:** the code propagates `belowForeign`, as property 1 says. Probe row 3 converts a table whose foreign node has a child with Material 3's id that names a missing token. It fails under R1, with the child refused.
- **Why it is a problem:** a required clause isn't shown. The harm is limited: without the clause, the converter refuses more than the decision does and admits nothing it shouldn't.
- **Evidence:** [mutations](checks/mutations.txt) R1. [Probe rows](checks/probe.txt), row 3. [Raw table](checks/raw-probe.txt): _"own-id nodes below a foreign node 0"_, _"no-id nodes below a foreign node 0"_.
- **Required property:** a row fails a converter that checks a node below another system's node by its own id.

### `fp-3` — tier C, routed to the architect: the converter reads "another design system" against the table's own system, where `RD-69` names Material 3's

- **Finding:** property 1 defines a foreign reference as a node _"whose value id names a design system other than Material 3's, `designSystems/20543ce18892f7d9/`"_. The converter compares against `this.designSystem`, read from each table's `system.version.name`. The plan's section, the PR's description and the rows use the table's own system: the fixture's system is `designSystems/ds`.
- **Current behaviour / contract:** the two rules are the same while every converted table is Material 3's. All 38 rows of the manifest are, and the Progress indicators table's own system is `designSystems/20543ce18892f7d9/`. The only check that tables agree is `versionName` (`convert.ts`, the one-release refusal), not the design system or its version id. A manifest row for another system's table would invert the classification for that table, if its `versionName` were the same.
- **Why it is a problem:** the decision's text and the code's rule differ, and nothing at this release distinguishes them. Which rule stands is a reading of the decision, so it is the architect's call and not a defect in the code.
- **Evidence:** `scripts/convert.ts`, `this.designSystem = …parentId(this.string('-', version, 'name'), 'versions')…` and `foreign ||= id != null && !id.startsWith(this.designSystem)`. The fixture's `const DS = 'designSystems/ds'`. [Raw table](checks/raw-probe.txt): _"own system designSystems/20543ce18892f7d9/"_.
- **Required property:** `RD-69` property 1 and the converter state the same rule.

### `fp-4` — tier C: #340's description links its record with paths that don't resolve on GitHub

- **Finding:** the description's four record links are relative (`.plan/component-tables-1/checks/…`). GitHub renders them as `href=".plan/…"`, which on the pull request's page resolves under `/pull/` and reaches no file.
- **Current behaviour / contract:** `body_html` from `gh api repos/ausginer/material-x/pulls/340` has `href=".plan/component-tables-1/checks/foreign-references-witness.txt"` and three more links of the same form.
- **Why it is a problem:** a reader of the pull request can't open the witnesses and reports from it.
- **Required property:** the description's links reach the files they name.