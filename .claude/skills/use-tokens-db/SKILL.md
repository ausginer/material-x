---
name: use-tokens-db
description: Query Material Design upstream design tokens through @ydinjs/tproc (colors, typography, elevation, shapes, motion) for buttons, FABs, text fields, checkboxes, lists, etc. Use when you need a token's resolved value, its reference tree, its token set, deprecation status, or need to enumerate tokens/sets/tags from the cached M3 token tables in packages/tproc/.data/tokens.
---

# Using the tokens DB

`DB` is the `@ydinjs/tproc` in-memory query layer over Material Design's upstream M3 token tables. Its source lives in `packages/tproc/src/DB/`; on first load it downloads each table from `m3.material.io` and caches it under `packages/tproc/.data/tokens/`; later loads read the cache, so you can work offline after the first run.

## Loading

The singleton in `index.ts` is the entrypoint — it already calls `DB.load()`:

```ts
import db from '@ydinjs/tproc/DB/index.js';
```

Run any script with plain `node` (this repo runs `.ts` directly):

```sh
node my-scratch.ts
```

Notes:

- `index.ts` uses top-level `await DB.load()`, so importing it is enough — no extra `await`.
- The first run prints `Caching tokens from <url>` lines while it populates `.data/tokens/`. This is expected.
- To build a DB with a different theme/systems/tags, call `DB.load()` semantics manually via the `DB` constructor `(theme, systems, allowedTags)`. The default uses tags `['expressive', 'web']`.

## Mental model

- **Token** — an entry like `md.comp.button.container.color`. Has `name` (the long internal id), `tokenName` (the dotted human name), `displayName`, `displayGroup`, optional `deprecationMessage`. Carries no value itself.
- **Value** — a concrete value (`color`, `length`, `shape`, `type`, `elevation`, `opacity`, `durationMs`, `cubicBezier`, …) keyed by `name`.
- **TokenSet** — a named group of tokens (a token's name starts with its set's name). `displayName` starting with `[Deprecated]` marks the set deprecated.
- **ContextTag / ContextTagGroup** — variant selectors (e.g. `expressive`, `web`). Value resolution is filtered by the DB's `allowedTags`.
- **ReferenceTree** — the alias chain a token resolves through; `ResolvedValue` is the final concrete value after resolving references for the active tags.

Full type definitions live in `packages/tproc/src/TokenTable.ts`.

## Collections (getters)

Each returns an `IteratorObject` (lazy, de-duplicated across systems). Call `.toArray()` to materialize, or chain `.filter`/`.map`/`.find`.

| Getter         | Yields                  |
| -------------- | ----------------------- |
| `db.tokens`    | every `Token`           |
| `db.values`    | every `Value`           |
| `db.tokenSets` | every `TokenSet`        |
| `db.tags`      | every `ContextTag`      |
| `db.tagGroups` | every `ContextTagGroup` |
| `db.theme`     | the `MaterialTheme`     |

```ts
// All button tokens
const buttonTokens = db.tokens
  .filter((t) => t.tokenName.startsWith('md.comp.button'))
  .toArray();
```

## Lookups (methods)

- `db.getToken(name)` → `Token | undefined`. **`name` is the internal `token.name`, not the dotted `tokenName`.** To find by dotted name, filter `db.tokens` on `tokenName`.
- `db.getValue(token)` → `{ value, resolvedValue? } | undefined`. Resolves the token's value for the active tags, memoized per token.
- `db.getSet(token)` → `MaybeOrphanTokenSet`. Returns the owning `TokenSet`, or a synthetic `{ tokenSetName }` when none matches.
- `db.getSetTokens(set)` → `readonly Token[]` belonging to that set.
- `db.isTokenDeprecated(token)` → `boolean` (true if the token has a `deprecationMessage` or its set is `[Deprecated]`).
- `db.getReferenceTreeAndResolvedValue(name, tags)` → `[ReferenceTree, ResolvedValue] | undefined`. Lower-level; `getValue` builds on it using `allowedTags`.

## Recipes

Resolve a token's value by its dotted name:

```ts
import db from '@ydinjs/tproc/DB/index.js';

const token = db.tokens.find(
  (t) => t.tokenName === 'md.comp.button.container.color',
);
if (token) {
  const resolved = db.getValue(token);
  console.log(resolved?.resolvedValue?.color);
}
```

List a set's non-deprecated tokens:

```ts
const set = db.tokenSets.find((s) => s.displayName === 'Filled button');
const tokens = set
  ? db.getSetTokens(set).filter((t) => !db.isTokenDeprecated(t))
  : [];
```

Inspect available variant tags:

```ts
console.log(db.tags.map((t) => t.tagName).toArray());
```

## Gotchas

- Iterators are single-pass. Re-read the getter (e.g. `db.tokens`) for each traversal rather than reusing a consumed iterator.
- `getValue` filters by the DB's `allowedTags` (`expressive`, `web`). A token may have other contextual values you won't see unless you call `getReferenceTreeAndResolvedValue` with different tags.
- Adding a new component's tokens means adding its `TOKEN_TABLE.*.json` URL to the list in `DB.load()`.
- The cache lives in `packages/tproc/.data/tokens/`. Delete a file there to force a fresh download of that table.
