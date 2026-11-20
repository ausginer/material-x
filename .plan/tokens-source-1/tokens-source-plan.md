# Material Design token source — survey and plan

**Status: proposed, and the owner accepts it or chooses otherwise.** Written by the architect on 2026-11-20, on the coordinator's task for issue #82, on `tproc/tokens-source-1` from `origin/main` at `d69e3ddbc`. It registers `repo:RF-67` and proposes `repo:RD-28` ([`00-index.md`](../00-index.md)). `RD-27` is the highest decision number on any branch on `origin` and in any slot (`repo/release-workflow-1`), and `RF-66` the highest finding number, so these are the next free numbers. No production code or test is changed.

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