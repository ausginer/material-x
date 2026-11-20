# tproc's token store, step 1 — feature proof

**Files were read at:** `e9f1f30ac` (`tproc/tokens-source-1`, PR #84), in scratch worktrees of my own. **Diff reviewed:** `a182ba6aa`, the branch's merge base with `main`, to `e9f1f30ac`.

**Governing records:**

- `repo:RD-28` in [`00-index.md`](../../00-index.md), with its dated step-1 block;
- the [plan](../../tokens-source-1/tokens-source-plan.md): _Steps, revised_, step 1, proofs P1 to P5, P10 and P11, _The store_ and its _Field rulings_ (`82f88726f`), _The converter's checks_, and _The reader and the CSS layer_;
- the owner's answers to Q1, Q3 and Q4.

**Lens:** feature proof. Each claim below is my own reading or my own run ([transcript](checks/step-1-proof.txt)). Nothing is repaired, and no record is amended.

**Personal data:** I read the 14 tables from `a182ba6aa` into a scratch directory outside the repository, by field name and count only. Nothing here quotes a value of an author, revision or settings field. The directory, the base worktree that held the tables, and every derived file are deleted.

**Verdict: step 1 meets the plan, and no finding in it blocks.** Every proof I reran holds: P1, P3, P4, P10, P11, P2 by reproduction, and P5 by spot mutation. Three Tier C findings are for the architect, and they matter before step 2's first fetch.

**PR #84 can't merge as it stands.** It conflicts with `main` in `.plan/00-index.md` and `AGENTS.md`, and `verify` hasn't run on `e9f1f30ac`. That is the implementer's merge to make. It isn't a defect of the step.

## Scope

**Covered.**

- **The legacy conversion reproduces the committed store.**
  - `node scripts/update-tokens.ts --legacy <the 14 tables>` leaves `git status` clean, so it writes the 103 committed files byte for byte.
  - Its conflict report equals `step-1-conflicts.md`, apart from the final newline that oxfmt removes. That also witnesses P2 and P11: 704 conflicts for 217 tokens, each kept from the first table in `DB.load()`'s order.
- **P1.** The reader and the CSS layer import only `node:fs/promises`, `node:crypto` and modules of the package, and nothing in `src/` fetches. The manifest's 102 digests each match their file, and no file is unlisted or missing.
- **P3.**
  - No tracked file at `e9f1f30ac` contains any personal value from the tables: 38 email addresses, 3 `gaiaId`s, 4 image URLs and 1 person's display name.
  - The store matches no email pattern, and has no `gaiaId`, `emailAddress`, `revisionAuthor` or Google image host.
  - The final scan reads each file's serialized text, so it covers every depth.
  - `.data/` is ignored, the store is `linguist-generated`, and oxfmt ignores it.
- **P4.** I built `a182ba6aa` and `e9f1f30ac` and regenerated the Storybook theme in each.
  - All 214 outputs are byte-identical: material-x's 213 build files and `.storybook/theme.css`.
  - tproc passes 97 of 97 and material-x 427 of 427.
  - Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations` exit 0.
- **P5, spot mutations** through `convert()`: a token without `tokenValueType`, and a value with two value fields. Each is refused with the table, the token and the field. An extra top-level field on a value converts without it. The mutations that pass are in [`reviewer-1`](#reviewer-1).
- **P10.** I reran the implementer's committed scripts: the dump at `a182ba6aa`, where `DB` exists, and the check at `e9f1f30ac`. All 3,950 tokens are the same in set, deprecation, value, tree and resolved value.
- **The field rulings,** against the store's keys at every depth and the raw tables' keys by name:
  - **Kept as ruled:**
    - `elevation` (6 values, 238 resolved values), including the unit-only ones;
    - `undefined: true` (284 and 8,282);
    - `svgPath` (1 and 1);
    - `resolvedCustomCompositeValue` on the 48 entries with no `resolvedValue`, and never both;
    - a token's `description` (44 tokens).
  - **Dropped as ruled:**
    - no id, revision, time, state, author or settings key remains at any depth;
    - `tokenNameSuffix` and set membership aren't stored;
    - `contextTags` are group-to-tag-name objects.
  - **Counts.** The rulings counted across the 14 tables: 73,666 entries, against 66,153 in each token's first copy, which is the store's count.
  - **Unruled.** The data fields that neither list names are in [`reviewer-2`](#reviewer-2).
- **Size, coordinator question 3.** I measured 103 files, 53,822,080 bytes and 1,956,718 lines. A gzipped tar is about 1.27 MB. **Nothing in the plan or `RD-28` bounds it:** the plan says that step 1 _"measures and reports the real figure, and no budget is set"_. The estimate came from a scratch conversion before the field rulings, which added `undefined: true` and the other kept fields.
- **The CSS layer, Q4 (a).**
  - `index`, `processTokenSet`, `TokenPackage`, `TokenPackageProcessor`, `resolve`, `selector`, `variable` and `default/motion-effects` export what they exported.
  - `processToken` adds `toCSSValue`.
  - `utils` loses `getSetName` and `distinct`, `DB`'s helpers, which nothing outside tproc imports.
  - The package's exports lose `DB` and `TokenTable`, and gain `store/*` and `theme`.
- **The rest of the plan.**
  - `manifest.json`'s `source` names the snapshot as converted before `RD-28`, with an unknown release and both database versions, and its 14 table rows give kind, component id and name.
  - `context.json` has the plan's shape, with default tags as tag names.
  - `just update-tokens` runs the script. The skill describes the reader as built.

**Not covered.**

- `--release` and `--current`, and step 2's report: out of scope.
- P5's other mutations, which I didn't rerun one by one.
- CI, which hasn't run on this head.

## Findings

### reviewer-1

**Tier C, for the architect. The converter's allow list and its one-literal check stop at the literal field's name. What a literal object and a `resolvedCustomCompositeValue` hold is copied as upstream gives it, unchecked.**

- **Observed** (`convert.ts`, `valueField` and `entry`: `structuredClone(value)`). Each converted in memory, through `convert()` in legacy mode:
  - an extra field inside a `color` literal reaches the store;
  - so does an extra field in a `resolvedCustomCompositeValue`;
  - so does a composite property's `resolvedValue` with two literal fields;
  - so does one that isn't an object at all.

  The committed store has no such field: every leaf key at every depth is a data field.

- **Why it matters.**
  - The plan's _Allow list_ says that _"a field upstream adds can't pass unseen"_.
  - Its input checks require _"a resolved value exactly one literal field"_.
  - `src/store/schema.ts` types every nested key.

  Below the first level, only the final scan for an email address or a `gaiaId` key stands between upstream and the public store. Step 2 is the first conversion of tables that nobody has read field by field.

- **Required property.** Before step 2's first fetch, the record states how deep the allow list and the one-literal check go, so that a field upstream adds inside a value either is refused or is shown to pass by design.

### reviewer-2

**Tier C, for the architect. The store drops data fields that neither the schema's drop list nor the field rulings name.** `RD-28` property 4 says that the store _"keeps every field that carries a token's data, whether tproc reads it or not"_. The plan's schema keeps a tree as `tokenName` and `childNodes`, and a display group as its `displayName`. For these fields the two statements disagree:

- **`fieldNames` on 10,764 reference-tree child nodes.** It labels which property of a composite each child feeds: `font_names`, `font_weight`, `font_size`, `line_height` and `font_tracking` (1,440 each), `variation_axis.<axis>` (152 to 452 each), and `damping` and `stiffness` (48 each).
- **The display groups' hierarchy and order:**
  - `parentGroup` on 664 of 1,002 groups;
  - `orderInParentDisplayGroup` on 623, and `orderInParentTokenSet` on 395;
  - a description on 15.

  The store keeps each token's group name and its order in the group, so a nested group's place is lost.

Per-component data (`definition` on 174 of 178 components, `alternativeNames`, the component display groups' descriptions) isn't token data, and the manifest keeps each component's id and name, as the plan says.

- **Why it matters.** The owner asked that fields and data stay original. `storeVersion` and the schema fix the store's shape. The step 1 snapshot's data comes back with step 2's fetch, whatever the rulings say.
- **Required property.** The record rules on each of these fields before step 2 sets the store's content from a release.

### reviewer-3

**Tier C. `.agents/docs/test-architecture.md` line 71 still names the deleted `DB`:** _"(`DB.load()` uses tags `expressive` and `web`)"_. This unit rewrote that same sentence's subject to _"tproc's token store"_.

- **Why it matters.** The documents describe the store, and that one clause points a reader at an API that is gone. The default tags now belong to the reader's `select`.
- **Required property.** The sentence names the reader.

## Not findings

- **The plan's 73,666 entries** are the tables' count with duplicates. The store's 66,153 is the count of each token's first copy, and P10 shows that nothing is missing.
- **The two lint disables,** `class-methods-use-this` on `Store.select` and `no-console` in the update script, carry their reasons.
- **P10 compares `resolvedValue`.** The 48 composite entries read `null` on both sides, so P10 doesn't witness their `resolvedCustomCompositeValue`. That is as the plan defines P10, through `DB.getReferenceTreeAndResolvedValue`.

## Merge state

- `gh pr view 84`: `CONFLICTING` / `DIRTY`. `git merge-tree` against `origin/main` at `2c731045b` gives conflicts in `.plan/00-index.md` and `AGENTS.md`. `AGENTS.md`'s skills line is changed on both sides.
- No `verify` run exists for `e9f1f30ac`, because GitHub runs no `pull_request` workflow for a pull request with a merge conflict. The branch's last runs are for `cdf53b52c` and earlier.
- The implementer merges `main`, and `verify` runs on the merged head, before PR #84 can merge.