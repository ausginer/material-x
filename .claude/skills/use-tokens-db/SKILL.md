---
name: use-tokens-db
description: Query Material Design upstream design tokens through @ydinjs/tproc (colors, typography, elevation, shapes, motion) for buttons, FABs, text fields, checkboxes, lists, etc. Use when you need a token's resolved value, its reference tree, its token set, deprecation status, or need to enumerate tokens/sets/tags from tproc's committed token store in packages/tproc/tokens, or when you update that store.
---

# Using the token store

`@ydinjs/tproc` reads Material Design's tokens from its own committed store, `packages/tproc/tokens/`. The store is converted from the design-system database tables that m3.material.io serves. It keeps upstream's field names and values, and holds no internal ids, revisions, authors or settings. The reader, `packages/tproc/src/store/`, is a typed query API over it with no network path.

## Loading

The singleton in `store/index.ts` loads the store with top-level `await`, so importing it is enough:

```ts
import store from '@ydinjs/tproc/store/index.js';
```

Run any script with plain `node` (this repo runs `.ts` directly):

```sh
node my-scratch.ts
```

A missing store file, or one that doesn't match the manifest's SHA-256, fails the load and names the file. Nothing is downloaded.

## The store

- **`manifest.json`:** `storeVersion`; the source (the site's base address, the release id, and each database version's `versionName`, version id and publish time); the fetch date; one row per converted table (`kind`, `componentId`, `componentName`); and each store file's SHA-256.
- **`context.json`:** the context tag groups (`contextTagGroupName`, `displayName`, `specificity`, `defaultTag`) with their tags (`tagName`, `displayName`, `tagOrder`).
- **`sets/<tokenSetName>.json`:** one token set and its tokens, in upstream order. A set that no table carries, named from its tokens, has only `tokenSetName`.

Each token has `tokenName`, `displayName` and `tokenValueType`. It has `description`, `displayGroup`, `orderInDisplayGroup` and `deprecationMessage` when upstream gives them. Then:

- **`values`:** the token's value entries. Each has `contextTags` and `specificityScore` when upstream gives them. `contextTags` is a group-to-tag-name object, such as `{ "motion.scheme": "expressive", "platform": "web" }`. Each entry has exactly one value field: `tokenName` (the one-hop reference) or one literal, such as `color`, `length`, `shape`, `type`, `elevation`, `opacity`, `durationMs`, `cubicBezier` or `undefined`.
- **`contextualReferenceTree`:** one entry per context. Each has its `contextTags`, `value` (the index of the `values` entry its tree starts from), `referenceTree` (`tokenName` and `childNodes`), and exactly one of `resolvedValue` and `resolvedCustomCompositeValue`.

The types are in `packages/tproc/src/store/schema.ts`.

## The reader

| Member | Gives |
| --- | --- |
| `store.sets` | every `StoredSet`, in the store's order |
| `store.tokens` | every `StoredToken`, set by set, as a new iterator on each read |
| `store.tagGroups` | the context tag groups |
| `store.getSet(tokenSetName)` | a `StoredSet`, or `undefined` |
| `store.getToken(tokenName)` | a `StoredToken` by its dotted name, or `undefined` |
| `store.getTokenSet(token)` | the set that holds the token |
| `store.isTokenDeprecated(token)` | `true` if the token has a `deprecationMessage` or its set's `displayName` starts with `[Deprecated]` |
| `store.select(token, tags?)` | `{ value, entry? }`: the first contextual entry whose tags include any of `tags`, otherwise the first entry, with the value it starts from. `tags` defaults to `expressive` and `web`. A token with no tree selects its first value |

The CSS layer (`processToken`, `processTokenSet`, `resolve`) reads the default selection. `toCSSValue(value)`, from `processToken.ts`, maps one stored value to its CSS value without a store.

## Recipes

Resolve a token by its dotted name:

```ts
import store from '@ydinjs/tproc/store/index.js';

const token = store.getToken('md.comp.button.container.color');
const selection = token && store.select(token);
console.log(selection?.value, selection?.entry?.resolvedValue);
```

List a set's non-deprecated tokens:

```ts
const set = store.sets.find((s) => s.displayName === 'Filled button');
const tokens = set?.tokens.filter((t) => !store.isTokenDeprecated(t)) ?? [];
```

Read a token's value for other tags:

```ts
const dark = store.select(token, ['dark']);
```

## Updating the store

Only `packages/tproc/scripts/update-tokens.ts` writes the store. Run it from `packages/tproc`:

```sh
aube exec just update-tokens --release 2026-11-19_06-20-01 --report <file>
aube exec just update-tokens --current --report <file>
```

- It fetches every table that the manifest lists from one dated release address, `_dsm/data/dsdb-m3/<release>/<KIND>.<componentId>.json`, and never from `latest`. `--current` first reads the release id from the site's bundle.
- It converts the tables in memory. It refuses tables from different database versions, and a table that the converter can't read, and names the table, the token and the field. A raw table is never written.
- **Never commit a raw table.** The tables carry Google employees' personal data. `packages/tproc/.data/` is git-ignored, for a table that you keep by hand while debugging.
- To add a component, add a row to `manifest.json`'s `tables` with its `kind` and `componentId`, then run an update. The site names a component's id in the page content it loads (`resourceName: components/<id>`).
- `--legacy <directory>` converted the tables committed before the store, once. Those tables mixed two database versions. So this mode lists each token that two tables convert differently, and keeps the first table's copy.
- An update is a pull request that carries the report and the difference in material-x's generated CSS.

## Gotchas

- `store.tokens` is a single-pass iterator. Read the getter again for each traversal.
- The CSS layer renders only the `expressive` and `web` selection. Other contextual values are in the token's `contextualReferenceTree`: pass other tags to `select`.
- `md.sys.color.*` values come from `default-theme.json`, a Material Theme Builder export (`@ydinjs/tproc/theme.js`), and not from the store.
- The store is generated: oxfmt ignores it, and GitHub folds its diffs. Don't edit it by hand, except to add a `tables` row before an update.