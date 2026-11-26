# tproc's token store, step 1 — feature proof

**Files were read at:** `e9f1f30ac`, then `4b8f62d5d` for the [re-review](#re-review-after-the-second-field-rulings), (`tproc/tokens-source-1`, PR #84), in scratch worktrees of my own. **Diff reviewed:** `a182ba6aa`, the branch's merge base with `main`, to `e9f1f30ac`.

**Governing records:**

- `repo:RD-28` in [`00-index.md`](../../decisions/RD-28.md), with its dated step-1 block;
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

## Re-review, after the second field rulings

**Files were read at:** `4b8f62d5d` (`tproc/tokens-source-1`, PR #84), in scratch worktrees of my own. **Delta reviewed:** `0baec18f3` to `4b8f62d5d`. P4 and P10 compare against `3457e3463`, the branch's merge base with `main` now. **Governing records:** the plan's [_Field rulings, from the feature proof_](../../tokens-source-1/tokens-source-plan.md#field-rulings-from-the-feature-proof) and the sections they update (`41815ef11`, merged at `047295328`); `RD-28` property 4 with its dated amendment; and the architect's confirmation of three `schema.ts` changes (`4b8f62d5d`). The transcript is [`checks/rerun-second-rulings.txt`](checks/rerun-second-rulings.txt). The tables were read from `a182ba6aa` into a scratch directory outside the repository, by key name, count and id resolution only, and every scratch copy is deleted.

**Verdict: nothing blocks, and no finding remains.** `reviewer-1`, `reviewer-2` and `reviewer-3` are resolved. `verify` passes on `4b8f62d5d`, and PR #84 is mergeable.

### The delta

- **`28f630922` merges `main` (`3457e3463`).**
  - Every line of `main`'s `.plan/00-index.md` is in the head's.
  - `AGENTS.md` keeps `main`'s `releasing.md` line and the branch's skills path.
  - No conflict marker is left.
- **`a1f81cf50`:** `test-architecture.md` names the store (`reviewer-3`).
- **`41815ef11`:** the architect's second rulings.
- **`96208a0c0`:** the implementation.
- **`4b8f62d5d`:** the architect's confirmation, two lines in `00-index.md`.

### Checked

- **P2.** A legacy conversion leaves `git status` clean. Its report equals `step-1-conflicts.md`, except for the header line that now names the value kind, as `step-1.txt` records.
- **Every key at every depth, `reviewer-1`** ([`unknown-keys.ts`](checks/unknown-keys.ts)). I injected an unknown key into the first object at each of the raw tables' 109 distinct object paths.
  - **91 refuse,** each naming the key.
  - **The 18 that convert** lie in subtrees that the drop list drops whole, which the converter never reads: authors, `settings`, `carbonProject`, `custom`, `parentVersionsMapping` and the component catalogue.
  - **The one exception is `contextualReferenceTrees`,** a map that the converter reads by token id, so an extra entry is never read. The tables have no tree keyed by a token outside its table: 0 of 4,152.
- **P5.** My earlier mutations ([`mutate.ts`](checks/mutate.ts), [`mutate-two.ts`](checks/mutate-two.ts)) now all refuse, and each names the table, the token and the key's path:
  - an extra key on a value, inside a `color` literal, and in a `resolvedCustomCompositeValue`;
  - a composite property's `resolvedValue` with two literal fields, with none, or as a non-object.
- **`reviewer-2`.** P12 ran with the implementer's read-back script, which reads the tables directly. It finds no difference:
  - 3,950 tokens, 66,153 roots and 129,895 child-node indexes give the tables' value ids;
  - 982 groups in 101 sets give their ids and `parentGroup` ids by path, in upstream order, with their descriptions and orders;
  - `fieldNames` and `tokenName` are equal on all 196,048 nodes.

  `storeVersion` stays `1`, and the component catalogue stays out, as ruled.

- **`schema.ts` (a), (b) and (c), against the tables.** All three are correct:
  - **(a)** 75 of 181 `type` values and 988 of 1,440 resolved types have no `variationAxes`. `FILL` and `HEXP` are missing on 30 and on 300, and no other axis is ever missing or unknown.
  - **(b)** Every resolved `type` holds literals: `fontNames`, `fontSize`, `fontTracking` and `lineHeight` as objects, and `fontWeight` as a number. On 452 of them, `variationAxes` entries are `{ axisValue: number }`. That differs from a value's `type`, which holds token names, so a separate `ResolvedTokenType` is what the data needs.
  - **(c)** All 12 `customComposite` properties have exactly one value field, a `tokenName`.
- **P4.** All 214 outputs are byte-identical: material-x's 213 build files and `.storybook/theme.css`.
  - tproc passes 111 of 111 and material-x 427 of 427.
  - Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations` exit 0.
- **P10.** With the implementer's scripts, `DB` at `3457e3463` against the store at `4b8f62d5d`: all 3,950 tokens are the same.
- **P1 and P3.**
  - The manifest's 102 digests match their files.
  - No tracked file at `4b8f62d5d` contains any of the tables' personal values: 38 email addresses, 3 `gaiaId`s, 4 image URLs and 1 display name.
- **Size:** 103 files, 58,902,825 bytes, 2,134,917 lines, and 1,417,011 bytes gzipped. As before, nothing bounds it.
- **The CSS layer** keeps its exports, as at `0baec18f3`. `processToken.ts`'s change is a type annotation for the now optional `variationAxes`.
- **CI:** `verify`, `static`, `docs`, `chromium`, `firefox`, `webkit` and `measurements` pass on `4b8f62d5d`. PR #84 is `MERGEABLE` and `CLEAN`.

### Not findings

- **An extra entry in `contextualReferenceTrees`** that names no token isn't read, so it isn't refused either. Its key is an id, not a field name, and the tables have none.
- **`step-1-conflicts.md` is the first run's report.** The rerun changes only its header line, which `step-1.txt` states.