# Material Design token source — survey and plan

**Status: accepted by the owner on 2026-11-20.** He approved step 1, answered yes to `Q1` and `Q3`, and chose (a) for `Q4` ([his answers](#the-owners-answers-to-q1-q3-and-q4)). Earlier the same day he chose a store of tproc's own in place of the stored tables, and a history rewrite for `Q2`. He has since deferred the rewrite, and step 1 doesn't depend on it. The [amendment](#amendment-tprocs-own-token-store) supersedes points 3 and 4 of the [recommendation](#recommendation), point 5's checks and the three steps of the [plan](#plan). The history rewrite is planned in [`history-rewrite-plan.md`](history-rewrite-plan.md) and proposed as `repo:RD-29`. Until these answers, this line began _"amended on 2026-11-20 with the owner's answers, and the owner accepts it or chooses otherwise"_ and said that `Q1` and `Q3` were still open. Before the amendment it said: _"proposed, and the owner accepts it or chooses otherwise."_

Written by the architect on 2026-11-20, on the coordinator's task for issue #82, on `tproc/tokens-source-1` from `origin/main` at `d69e3ddbc`. It registers `repo:RF-67` and proposes `repo:RD-28` ([`00-index.md`](../00-index.md)). `RD-27` is the highest decision number on any branch on `origin` and in any slot (`repo/release-workflow-1`), and `RF-66` the highest finding number, so these are the next free numbers. No production code or test is changed.

Canonical entries: `RD-28` — tproc keeps reading Material's own token database, from a committed, pruned snapshot of one dated site release that only an update script writes; `RF-67` — tproc's token snapshot has no recorded provenance, mixes two database versions, carries personal data, and a missing file is fetched from `latest` while tests run.

## Question

The owner, relayed by the coordinator (translated): _"today I just download the JSON tokens from the main site (m3.material.io), and I can't say it inspires me. It's essentially scraping the site; I'd like something more durable."_ Issue #82 asks for a more durable source for the Material Design specification and its tokens, or a way to read the current one that survives the site's changes.

## What tproc uses

`DB.load()` (`packages/tproc/src/DB/DB.ts:99`) loads 14 tables from `https://m3.material.io/_dsm/data/dsdb-m3/latest/`. Each one is an export of Google's design-system database, named DSDB in the data (`system.dsdbVersion`, names like `designSystems/20543ce18892f7d9/tokenSets/…/tokens/…/values/…`). The file names don't carry content hashes: `20543ce18892f7d9` is the design system's id and `TOKEN_TABLE.<id>` is the component's id (`system.components[0].name` is `designSystems/20543ce18892f7d9/components/31f16b44fe03b0c0` for the checkbox). The site builds the address from the same component id (`main.js`: `TOKEN_TABLE.${resourceName.split("components/")[1]}`).

What tproc and material-x read from the tables, and so what a replacement must keep:

1. **Every component token** material-x styles: buttons in all sizes, icon buttons, FABs, extended FABs, button groups, split buttons, checkbox, radio, list and text fields. Also the `md.sys.*` and `md.ref.*` tokens for type, elevation, shape, motion, state and measurement that they reference. `md.sys.color.*` values come from `default-theme.json`, a Material Theme Builder export, not from the tables (`resolve.ts:131`).
2. **Contextual values.** Each token has one value per combination of context tags: platform, motion scheme, theme, contrast, audience, font and iOS elevation. `DB.getValue` picks `expressive` and `web`. tproc renders the chosen value's **one-hop reference** (`value.tokenName`, which becomes a CSS `var()` chain) or its literal (`processToken.ts:21`).
3. **Reference trees** and resolved values (`getReferenceTreeAndResolvedValue`), which the `use-tokens-db` skill exposes to authors of visual-contract tests.
4. **Token sets:** names, display names and membership. Membership is a prefix test on the internal id (`DB.getSetTokens`), and `tokenNameSuffix` keys the processed set (`processTokenSet.ts:21`).
5. **Deprecation:** `deprecationMessage` with an optional replacement token, and a `[Deprecated]` prefix on a set's display name.
6. **M3 Expressive tokens,** which Material added in 2025.

## Survey

Checked on 2026-11-20. Rows marked _verified_ were fetched by the architect. The other rows come from two survey agents and cite their sources.

| Candidate | Authority | Coverage of 1–6 | Stability | Licence | Cadence | Automation |
| --- | --- | --- | --- | --- | --- | --- |
| **DSDB tables behind m3.material.io** (today's source) | The database itself, at the version the site publishes | All six | Undocumented internal addresses. Component ids have stayed the same. `latest` changes with no signal | Google Terms of Service only. No open licence is stated | Each site release, about weekly | One HTTP GET per table |
| **material-web** `tokens/versions/latest/sass` (also in `@material/web` 2.5.0) | Generated from the same database (`// Version: 34.0.21`, _verified_) | 1, 4, 5 and 6, for one context (`platform: web`, `audience: 3p`, `font: static`, _verified_). No motion-scheme tag, so no `expressive` values. Theme and contrast are split into files. One-hop references are kept. Deprecation is free text only. `custom_composite` is emitted as `null` | Repository paths are stable. The project has been in maintenance mode since 2024 (owner) | Apache-2.0 | Last token update `763a97326f`, 2026-04-06 (_verified_) | Regex over Sass |
| **Flutter `material_ui`** `packages/material_ui/tool/gen_defaults/data/*.dart` | Generated from the same database (`// Version: 38.2.83` in 159 files, _verified_) | 1 and 6. Colour and typescale references only; shapes and opacities are resolved; colour is hex. No deprecation. Platform context not stated | New since 2026-08 | BSD-3-Clause | `37bc5d65fb` 2026-08-19, `8dd3f9563f` 2026-10-01 (_verified_) | Regex over Dart |
| **Jetpack Compose Material3** `compose/material3/.../tokens/*.kt` | Generated, one version per file, from `v0_103` to `37.2.1` (`// VERSION: v0_11_0` on `ButtonSmallTokens.kt`, _verified_) | 1 and 6, under PascalCase names with no `md.` path. Android, light and dark only. No deprecation | Stable paths | Apache-2.0 | Each component is regenerated on its own schedule | Poor: names don't map back |
| **material-components-android** `res/values/*tokens.xml` | Generated (`Version: 34.0.0`) | 1 and 6 for `platform=android`. References become Android theme attributes | Stable paths | Apache-2.0 | 2026-03-06, last | Poor |
| **Material 3 Design Kit** on Figma Community, file `1035203688168086460` | Google's design kit, V1.25 (2026-05-19) | Colour, type, shape and state-layer variables under Figma names (`M3/sys/light/primary`, `Corner/Extra-large`), from third-party dumps ([1](https://github.com/humanbird/brand-playground-example-material3/blob/main/design/ingest/raw-figma.json)). No `md.comp.*` variables observed, no platform or motion contexts, no deprecation | The file id is stable. Each duplicate is a new file | Google Terms of Service, and CC BY 4.0 by Figma's default; unclear which applies | 3–6 releases a year | REST Variables API needs a Full seat in an Enterprise org (_verified_ on [developers.figma.com](https://developers.figma.com/docs/rest-api/variables/)). Otherwise a manual export or a plugin run inside Figma |
| **material-color-utilities** | Google's colour algorithms | Colour schemes only | Active | Apache-2.0 | Active | Library |
| **material-foundation `material-tokens`**, **`@material/tokens`** | Old exports | No `md.comp.*`, or pre-Expressive | Archived 2022 / published 2022 | Apache-2.0 | None | — |
| **Community mirrors** | None found that republishes the database | — | — | — | — | — |

**Every public source except the DSDB tables is a projection of the same database to one context, exported by hand and months behind.** None keeps contextual values, so none can give tproc the `expressive` + `web` values it renders today. material-web comes closest and has no motion scheme. The Figma kit has no component tokens, and it can't be read without an Enterprise plan or a manual step.

## What the site's data does

Read on 2026-11-20 ([addresses](checks/site-addresses.txt), [snapshot against `latest`](checks/snapshot-vs-latest.txt)):

- **`latest` is the data the site shows now,** and it has moved since the snapshot was committed. Today every table reports database version `41.1.12`, published 2026-11-12. The committed tables report `35.0.28` for the 10 component tables and `37.0.32` for the 4 system tables. In 8 of the 14 tables, tokens were added or a token's contextual values changed: 52 tokens added, 333 tokens with changed values or reference trees, and none removed. The added tokens are mostly `md.sys.measurement.space*`, which the button group, icon button, button and split button spacing tokens now reference. The changed values include label-text type and weight tokens in buttons, extended FABs, lists and text fields. The responses send `no-store` and no `ETag` or `Last-Modified`.
- **Each site release has its own dated address,** and an old one keeps working. The site reads the path segment from `environment.carbonVersion` (`"2026-11-19_06-20-01"` today), and `latest` is only the default. `_dsm/data/dsdb-m3/2026-11-19_06-20-01/…` returns the same data as `latest`, apart from `system.version`'s fields. `_dsm/data/dsdb-m3/2026-10-13_06-10-19/…`, the release in the bundle Wayback archived on 2026-10-29, still returns its own data 38 days later. A path named by the database version (`41.1.12`) or by the version id returns 404. How long the site keeps an old release isn't known.
- **The tables carry personal data.** `system.settings.updateEmailSettings` lists Google employees' email addresses (38 distinct ones in the committed `COLOR` table), and `revisionAuthor` carries account ids (`gaiaId`). tproc reads neither.
- **Size.** The committed snapshot is 147 MB, pretty-printed. Today's 14 tables are 105.5 MB minified, and 98.0 MB with only the fields `TokenTable.ts` declares and without revision, author and time fields. `contextualReferenceTrees` is 93.9 MB of that. The pruned tables gzip to 2.5 MB.

## Recommendation

_Points 3 and 4 and point 5's checks are superseded by the [amendment](#amendment-tprocs-own-token-store). The rest stands._

**Keep the DSDB tables as the source, and make reading them safe** (`RD-28`). No other public source has the data tproc renders: every alternative loses the contextual values, and most lose references or deprecation. Material's database is the authority, and the site's export is the only public form of it with every property tproc uses. So a different source would trade correctness for an address that looks more official.

What makes today's reading fragile isn't the address. tproc follows `latest`, keeps no record of what it took, fetches while tests run, and compares nothing when the data changes. Each of those can be fixed without leaving the source:

1. **tproc reads only the committed snapshot.** `DB.load()` has no network path. A missing or invalid table fails the load and names the file. Today a missing file downloads `latest` in the middle of a test or build run (`DB.ts:54`).
2. **One update script writes the snapshot, from one dated release.** The script takes a release id such as `2026-11-19_06-20-01`, or reads the current one from the site. It fetches every table from that release's address, so the set is consistent even if the site publishes during the download. It refuses the set unless every table reports the same `system.version.versionName`.
3. **The snapshot records its provenance** in a manifest: the release id, the database's `versionName`, version id and publish time, the fetch date, each table's kind, component id and name, and each stored file's SHA-256.
4. **The stored tables are pruned and deterministic.** Only the fields `TokenTable.ts` declares are kept, in upstream array order. Revision, author, time and settings fields are dropped, which removes the personal data. Serialization is fixed, so storing the same release twice gives byte-identical files. The files are minified and marked `-diff` in `.gitattributes`: a line diff of 98 MB of JSON can't be reviewed, and the update report below is the instrument.
5. **The update script checks the shape** before it writes, against what tproc reads: the fields and types in `TokenTable.ts`, and that every one-hop reference, reference-tree node and set prefix names something present in the loaded tables. A violation refuses the update and names the table, the token and the field.
6. **An update is a pull request with a report.** The script writes a Markdown report: tokens added and removed, deprecations added, and for the selected tags (`expressive`, `web`) each changed one-hop reference and literal, grouped by token set. material-x's generated CSS before and after is compared and the difference attached. The visual and spec-contract suites run as for any change. The report is saved in the pull request's record, so a data change is reviewed like a code change.
7. **The component list stays explicit.** Adding a component is one manifest row with its component id. The site names the id in the page content it loads (`_dsm/content/m3/<release>/…`, `resourceName: components/<id>`).

**If the site goes away or its addresses change,** the snapshot still builds and tests everything, and nothing breaks until an update is wanted. The update script fails loudly on a 404 or on a shape it doesn't know, and that is the signal to look again. material-web's Sass is the fallback for a web-context reading then, at a cost the survey states.

**Not recommended:**

- **A second source as a cross-check,** such as material-web's or Flutter's export. Their versions lag the site's by 3 to 7 database versions, and their contexts differ, so the comparison would report mostly noise.
- **Following `latest` on a schedule and committing automatically.** A data change alters what material-x renders, so a person reviews it (point 6).

## Plan

_Superseded by the amendment's [steps](#steps-revised). This section is kept as it was proposed._

The steps are for the implementer, on a branch of their own, in this order. Each step lists its proofs.

### Step 1 — mechanism, with today's data

Change how the snapshot is stored and loaded, and leave the data where it is.

- `DB.load()` reads tables through the manifest from `packages/tproc/.data/tokens/`, and the module has no `fetch` (point 1).
- The update script exists, with points 2–5 and 7, and a mode that normalizes the committed tables without fetching. This mode is used once here, because the committed versions `35.0.28` and `37.0.32` can't be fetched again. The manifest records their provenance as _committed before `RD-28`, release unknown_, with both versions.
- The `use-tokens-db` skill and tproc's documentation describe the snapshot, the manifest and the update script, and no longer mention download on first load.

Proofs:

- **P1.** With one table file removed, `DB.load()` rejects with an error that names the file, and makes no network request. Witness: a test with `fetch` replaced by a function that fails the test.
- **P2.** Normalizing twice gives a tree with no `git diff`.
- **P3.** `git grep -c -e emailAddress -e gaiaId -- packages/tproc/.data/tokens` finds nothing.
- **P4.** material-x's generated CSS is byte-identical before and after the step, and tproc's and material-x's suites pass as on `main`. This shows that pruning dropped nothing tproc reads.
- **P5.** Each check in point 5 refuses a mutated table: a removed `contextualReferenceTrees`, a renamed `resolvedValue`, a one-hop reference to a missing token, and two tables with different versions. Each refusal names the table, the token and the field. Recorded as mutation witnesses.

### Step 2 — the first update, to a dated release

Run the update script against the current release, in a separate pull request.

- The report (point 6) and the CSS difference go into that pull request's record.
- Each changed rendering is reviewed. Where material-x's styles or tests relied on a token that changed, the change follows `RF-29`'s and `RD-8`'s rules for a failing row.

Proofs:

- **P6.** The manifest names one release, and every table reports its `versionName`.
- **P7.** The report lists, for a known token with a different value in today's data, its old and new value. One example is `md.comp.button-group.connected.xsmall.between-space`, whose tree changed between `35.0.28` and `41.1.12` ([snapshot against `latest`](checks/snapshot-vs-latest.txt)).
- **P8.** The visual and spec-contract suites run in the gate's three engines, and each failure is read against the report.

### Step 3 — change notification (only if the owner wants it, `Q1`)

A scheduled workflow reads the site's current release and database version and compares them with the manifest. When they differ, it opens one issue, or comments on the open one, naming both versions. It never fails a build, commits or opens a pull request, as `RD-7` treats size. Proof **P9**: a run with the manifest's version edited opens or updates exactly one issue.

## Owner questions

- **Q1 — A scheduled check that opens an issue when Material publishes a new database version?** (a) Yes, weekly, as Step 3. (b) No: updates happen when someone runs the script. **Recommended: (a).** A new database version is otherwise noticed only by chance, and a pinned snapshot that is never compared becomes the silent drift #82 is about.
- **Q2 — The committed history keeps the personal data.** Step 1 removes it from the tree. Removing it from history needs a history rewrite, which `AGENTS.md` reserves to the owner. **Recommended: no rewrite.** The same data is served publicly by the site, and a rewrite would change every commit since the snapshot was added.
- **Q3 — The database export is published under Google's Terms of Service with no open licence,** and the repository republishes it. material-x ships only values derived from it, as CSS, and tproc is private. Is a public, committed snapshot acceptable to the owner? If not, the snapshot moves out of git into a cache that CI restores, and the manifest's hashes stay committed. **Recommended: keep it committed.** Material publishes the same tokens under Apache-2.0 in material-web, and tproc's use matches theirs.
- **No hands-on Figma check is needed.** Even with component variables, the kit has no contextual values and no headless read without Enterprise. If the owner wants the coverage confirmed, one look at the kit's variable collections settles it.

## What stays open

- How long the site keeps an old release's address isn't known. The plan doesn't depend on it: the committed snapshot is the durable copy, and the dated address makes a release consistent and repeatable while it lasts.
- `default-theme.json` comes from Material Theme Builder, whose repository is archived. Colour generation could move to `material-color-utilities`. That's outside #82.

## Amendment: tproc's own token store

**Amended on 2026-11-20 by the architect,** on the owner's answers relayed by the coordinator. On the personal data in the committed tables: _"ВАТАФАК 😱 Вот это жесть, конечно... Да, конечно, всё переписываем, не хватало мне ещё претензий от гугла, хотя они сами виноваты..."_ ("WTF 😱 That's really bad... Yes, of course, we rewrite everything; claims from Google are the last thing I need, though it's their own fault..."). That answers `Q2` with a history rewrite, which [`history-rewrite-plan.md`](history-rewrite-plan.md) plans. On the design: _"Кстати, можно tproc заставить не просто парсить таблицы тогда, а прям на лету их конвертировать в удобочитаемый json, и уже на его основе делать интерфейс для генерации. То есть: — Скрипт скачивания и конвертации - сохраняем уже наш родной, safe-json, а не таблицу с персональными данными гуглеров. Поля и данные остаются ещё оригинальными, не адаптированными под CSS. — Удобный API уже для конвертации JSON -> CSS."_ ("By the way, tproc could convert the tables on the fly into readable JSON instead of only parsing them, and build the generation interface on that. That is: a download and conversion script, which stores our own safe JSON rather than a table with Google employees' personal data, with fields and data still original, not adapted to CSS; and a convenient API for converting JSON to CSS.")

`Q1` and `Q3` are still open. The source doesn't change: the update script still reads the database tables of one dated release.

### Four layers

1. **The update script downloads and converts.** It fetches the tables of one release, converts them in memory, and writes only the store. A raw table is never written into the repository. `packages/tproc/.data/` is git-ignored, so a table kept for debugging can't be committed by accident.
2. **The store** is committed. It is tproc's own JSON, with upstream's field names and values for everything it keeps.
3. **The reader** is a typed query API over the store. It replaces `DB`.
4. **The CSS layer** turns stored values into CSS. It is today's `processToken`, `processTokenSet`, `TokenPackage`, `resolve`, `variable` and `selector`, which read the reader instead of `DB`.

### The store

**Location: `packages/tproc/tokens/`.** It isn't under `.data/`, because the history rewrite removes every `.data/tokens/` path from every commit.

- **`manifest.json`:**
  - `storeVersion`, an integer that changes when the store's shape changes;
  - the source: the site's base address, the release id, and the database's `versionName`, version id and publish time;
  - the fetch date;
  - each converted table's kind, component id and component name;
  - each store file's SHA-256.

  For the snapshot that step 1 converts, the source reads _committed before `RD-28`, release unknown_, with both database versions.

- **`context.json`:** each context tag group's name (`contextTagGroupName`), `displayName`, `specificity` and default tag. For each tag of the group, its `tagName`, `displayName` and `tagOrder`.
- **`sets/<tokenSetName>.json`,** one file per token set, such as `sets/md.comp.checkbox.json`:
  - the set's `tokenSetName`, `displayName`, `description`, `tokenType`, `custom.token_class` and `order`, when a table carries the set, and only its name when none does;
  - its tokens, in upstream order.
- **Each token keeps:**
  - `tokenName`, `displayName` and `tokenValueType`;
  - `displayGroup`, as the display group's `displayName` instead of its id, and `orderInDisplayGroup`;
  - `deprecationMessage`, with `message` and `replacementTokenName`, when present.
  - **`values`:** the token's own value entries, in upstream order. Each has `contextTags`, `specificityScore`, and either `tokenName` (the one-hop reference) or upstream's literal fields: `color`, `length`, `shape`, `type`, `opacity`, `numeric`, `durationMs`, `cubicBezier`, `motionPath`, `customComposite`, `axisValue`, `textTransform`, `fontNames`, `fontWeight`, `fontSize`, `fontTracking` and `lineHeight`.
  - **`contextualReferenceTree`:** upstream's entries, in upstream order. Each has `contextTags`, `value` (the index of the `values` entry its tree starts from), `referenceTree` and `resolvedValue`.
    - `referenceTree` keeps the tree's shape: `tokenName` and `childNodes`. A composite has several children: 1,488 nodes in today's tables have more than one.
    - Every root in today's tables is the token's own value, so an index identifies it once ids are gone.
- **`contextTags` is an object** from tag group name to tag name, such as `{ "motion.scheme": "expressive", "platform": "web" }`, with keys sorted. It replaces lists of internal ids.
- **What the store drops:**
  - every internal id (`name`, a value's `version` and `revisionId` in trees, the tags' ids);
  - revision ids and times, `createTime`, and `state`, which is `ACTIVE` on every token, set and value in today's tables;
  - `revisionAuthor`, `author` and `settings`;
  - every system field that isn't named above.

  `tokenNameSuffix` and set membership aren't stored either, because both follow from the token's file and name.

- **Determinism and reading.**
  - Keys come in the order the schema lists them, arrays in upstream order, two-space indentation and a final newline. Converting the same tables twice gives byte-identical files.
  - The store is generated, so the converter is its only writer. It goes into `.oxfmtrc.json`'s `ignorePatterns`, which today names the stale `packages/material-x/.data`. It is also marked `linguist-generated` in `.gitattributes`, so GitHub folds its diffs.
  - Line diffs stay readable per set file, and the update report stays the review instrument.
- **Size, estimated** from today's tables with a scratch conversion: 3,950 tokens and 73,666 contextual entries, 45.3 MB pretty-printed in about 1.9 million lines, and about 0.85 MB gzipped. Step 1 measures and reports the real figure, and no budget is set.

### The converter's checks

They replace point 5. A refusal names the table, the token and the field.

- **Input:** each field the converter reads is present, with its type. Each tag id resolves to a tag and a group of the same table. Each tree's root is the token's own value.
- **References:** each `tokenName` in a value, and each node of a tree, names a token in the converted store.
- **Duplicates:** a token that more than one table carries converts to identical content.
  - In step 1, today's mixed snapshot breaks this for about 223 tokens: the component tables are `35.0.28` and the system tables `37.0.32`. There the converter keeps the table that `DB.load()` reads first, which is `DB`'s behaviour today. It lists each conflict in step 1's report.
  - From step 2 on, a conflict refuses the update.
- **One release:** every table reports the same `versionName`. Step 1's legacy conversion is exempt and records both versions.
- **Allow list:** the writer emits only the fields this section names, so a field upstream adds can't pass unseen. A final scan refuses a store that holds an email address or a `gaiaId` key.

### The reader and the CSS layer

- **The reader** is `@ydinjs/tproc/store/index.js`, a singleton loaded from the store as `DB/index.ts` is today, with no network path. It offers:
  - the sets, the tokens of a set, a token by `tokenName`, a token's set;
  - whether a token is deprecated: it has a `deprecationMessage`, or its set's `displayName` starts with `[Deprecated]`;
  - the context tag groups;
  - `select(token, tags)`: the chosen contextual entry, with its value entry, its reference tree and its resolved value.
- **The selection rule in step 1 is today's:** the first entry whose `contextTags` include any of the given tag names, otherwise the first entry. The default tags are `expressive` and `web`. A stricter rule, such as requiring every group to match, is a separate decision. It would change rendering, and step 2's report can show which tokens it affects.
- **`DB`, `DB/index.ts` and `TokenTable.ts` are deleted,** with their `package.json` exports. tproc is private, and material-x imports none of them. It imports `index.js`, `TokenPackage.js`, `TokenPackageProcessor.js`, `processTokenSet.js`, `resolve.js`, `selector.js`, `utils.js`, `variable.js` and `default/motion-effects.js`, and `visual-contracts.node.ts` uses `TokenPackage`'s type.
- **The CSS layer keeps its surface,** so material-x and the visual-contract tests change nothing in step 1.
  - Its value mapping becomes one exported pure function from a stored value to a CSS value, which is `processToken`'s mapping today. Each kind can then be tested without a store.
  - A redesign of the generation interface beyond that is a later unit, if the owner wants one (`Q4`).
- **The `use-tokens-db` skill** and tproc's tests move to the reader and the store's shape. The test fixture in `tests/helpers.ts` is built in the store's shape.

### Steps, revised

**Step 1 — the store, from today's tables.** It merges before the history rewrite (`RD-29`), because the rewrite removes the tables from every commit, the tip included.

- The converter and the update script, with a legacy mode that converts the committed tables without fetching. The store is written once in that mode.
- The reader, the CSS layer on the reader, and the deletions above. The 14 tables are deleted from the tree, and `packages/tproc/.data/` is git-ignored.
- The skill and tproc's documentation describe the store, the manifest and the update script.

Proofs:

- **P1.** The reader has no network path. A test with `fetch` replaced by a function that fails the test loads the store. With one set file removed, loading fails and names the file.
- **P2.** Converting the committed tables twice gives byte-identical stores.
- **P3.** The store holds no email address and no `gaiaId` key. A raw token with an extra field converts without it.
- **P4.** material-x's generated CSS is byte-identical before and after the step, and tproc's and material-x's suites pass as on `main`.
- **P5.** Each input and reference check refuses a mutated table, and names the table, the token and the field. Recorded as mutation witnesses.
- **P10.** Parity with `DB`, read once before `DB` is deleted. For every token and the default tags, `select` gives the same one-hop reference or literal, reference tree token names and resolved value as `DB.getValue` and `getReferenceTreeAndResolvedValue`. This covers the tokens material-x doesn't render, which P4 can't see.
- **P11.** The duplicate conflicts are listed with their tables, and the kept table is the one `DB.load()` reads first.

**Step 2 — the first update, to a dated release,** after step 1: P6–P8 as planned, and no duplicate conflict. It doesn't wait for the history rewrite, which the owner has deferred: the update writes only the store, and a rewrite run later rewrites any branch open then with the rest. Until the owner deferred the rewrite, this step read: _"after the history rewrite"_.

**Step 3 — change notification,** weekly, because the owner answered yes to `Q1`: P9 as planned, after step 1, whose manifest it compares. Until his answer, this step read: _"only if the owner answers yes to `Q1`"_.

### Owner questions, amended

- **Q2 is answered:** rewrite the history. [`history-rewrite-plan.md`](history-rewrite-plan.md) has the procedure and its own questions.
- **Q3 still applies to the store.** The store republishes Google's token data without the personal data, as material-web's Apache-2.0 tokens do.
- **Q4 — the generation interface.** (a) Step 1 keeps the CSS layer's surface and adds the pure value-to-CSS function. (b) A new generation interface as well. **Recommended: (a) now.** P4's byte-identical proof needs an unchanged surface, and a redesign is easier to judge on the store, once it exists.

### The owner's answers to Q1, Q3 and Q4

**Recorded on 2026-11-20 by the architect,** on the owner's answers relayed by the coordinator.

- **Step 1 is approved:** _"Шаг 1 - го."_ ("Step 1, go.")
- **`Q1` — yes:** _"Q1 - да"_. Step 3 is a weekly scheduled check.
- **`Q3` — yes:** _"Q3 - да"_. The converted store is committed, in the public repository.
- **`Q4` — (a):** step 1 keeps the CSS layer's surface and adds the pure value-to-CSS function, with no new generation interface.
  - **He first answered the other way** (translated): _"Q4: ой, сорри. Наоборот, лучше сделаем: там же CSS читается прям из таблиц, если не сделаем и удалим старые таблицы, билд сломается"_ ("Q4: oh, sorry. The other way round, let's do it: the CSS is read straight from the tables, so if we don't do it and delete the old tables, the build breaks").
  - **His concern is covered by step 1 under either option.** Today `resolve.ts`, `processToken.ts` and `processTokenSet.ts` import `DB/index.ts`, which reads the tables. Step 1 moves these modules onto the reader, deletes `DB` and the tables in the same change, and keeps the modules' exports, so the build never reads a deleted table ([the reader and the CSS layer](#the-reader-and-the-css-layer), `RD-28` property 8). P4 proves it with byte-identical CSS. `Q4` decided only whether step 1 also adds a new generation interface, option (b).
  - **Once the coordinator explained this,** he chose (a) (translated): _"🤔 А, ну если так, то окей. Я просто не подумал, что мы прям *совсем* новый API делать будем 🤔"_ ("Ah, if that's how it is, then okay. I just didn't think we'd be building an entirely new API").
- **The history rewrite is deferred** (`RD-29`, [its plan](history-rewrite-plan.md#the-owners-answer-2026-11-20)). Step 1's precondition logic is unchanged: step 1 doesn't depend on the rewrite, and the rewrite still needs step 1 on `main` first.