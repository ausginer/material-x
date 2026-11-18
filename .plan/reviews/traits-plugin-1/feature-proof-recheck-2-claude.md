# The trait flattener's item 2c: second feature-proof recheck, `recheck-1` and `recheck-2`

**Files were read at:** `fbe60bd53` (`repo/traits-plugin-1`, slot `d`, clean, equal to `origin`). **Diff reviewed:** `008d7a422` to `fbe60bd53`, outside `.plan/`. **Records read at the same commit.**

**Governing records:**

- `repo:RF-44`'s note dated 2026-11-18 about the item 2b recheck, in [`00-index.md`](../../00-index.md);
- the [handoff](../../traits-plugin-1/traits-plugin-handoff.md)'s item 2c, ruled at `008d7a422`;
- [`trait-flattener-plugin.md`](../../../.agents/docs/trait-flattener-plugin.md) §Eligibility, its reason-code table, §Verification and its change record of 2026-11-18 for item 2c;
- my [item 2b recheck](feature-proof-recheck-claude.md) at `b72ee0b8b`;
- the implementer's witness [`item2c-witness.txt`](../../traits-plugin-1/checks/item2c-witness.txt).

**Lens:** a targeted feature proof. Each claim below is my own reading of the tree or a probe, unless it says otherwise. The probes are in [`checks/recheck-2-probes.txt`](checks/recheck-2-probes.txt). Nothing is repaired, and no record is amended.

**Verdict: item 2c holds. `recheck-1` and `recheck-2` are resolved as the ruling requires.** The recheck has one new Tier C finding, `recheck-3`: the JSDoc of the reason code `TRAIT_SOURCE_LANGUAGE` still states item 2b's rule. It goes to the implementer. It affects no output and no public declaration.

## Scope

**Covered.**

- **The whole non-record diff:**
  - `analyze.ts`: `SOURCE_LANGUAGE` and `sourceLanguage` are replaced by `EXTENSION`, and `canCopySource` compares the two extensions;
  - the new `describe` in `analyze-method.node.test.ts`, with its in-memory origins `assertion-trait.ts` and `chevron-trait.js`;
  - the new fixture `method-package-consumer.mjs`, and the two package `describe`s in `flatten-method.node.test.ts`;
  - the side change in `helpers.ts`: `flattenToDir` names `foo-flat` and `foo-composed` with the consumer's extension.
- **What `canCopySource` receives.** It is called only for a method trait (`analyze.ts:861`). The consumer id is query-stripped at `plugin.ts:55`. The origin id comes from the loader, which strips the query at `plugin.ts:70` or resolves an `@ydinjs/` specifier to a file path. `parseModule` passes the id to `parseSync`, so the plugin's parser takes its language from the same extension that the rule compares.
- **The rows before and after,** repeated from a scratch export (`rows.ts`). The "before" side is `src/` at `008d7a422`.
  - Before, `.ts` flattens into `.mts` and into `.cts`, and `a < b > (c)` from `.js` and from `.mjs` flattens into `.ts`. Those are `recheck-1` and `recheck-2`.
  - After, all four pairs are retained with `trait-source-language`. Every other pair whose extensions differ is retained as well: `.mjs`/`.js`, `.cjs`/`.js` and `.mts`/`.ts`, in both directions where I tried them.
  - Same-extension pairs still flatten: `.ts`, `.mts`, `.js`, `.mjs`, `.tsx` and `.jsx`.
  - An id with no extension is retained, and so is an id whose only dot is in a directory name (`/v.ts/t`). This was already true before the change.
- **Mutations on a scratch export of the whole tree at `fbe60bd53`.** Each mutation ran the plugin's suite and was restored before the next.
  - _B, item 2b's `analyze.ts` restored:_ 4 rows fail, the handoff's three and the negative package row. This repeats the implementer's M13.
  - _M8, the origin scan's rebase returns `null` for a relative import:_ the `.mjs` package row's two runtime tests fail. So the handoff's requirement holds: item 2's repair keeps a row that fails without it, and that row is now a same-extension fixture. This repeats the implementer's M8.
  - _M14, `canCopySource` ignores a leading `c` or `m`:_ the `.mts` and `.cts` rows fail. The `.mjs` and `.cjs` pairs against `.js` have no row of their own. The handoff doesn't ask for one, the code retains both pairs, and no shipped trait crosses either.
- **The side change in `helpers.ts`.** Every other caller of `flattenToDir` passes a `.ts` consumer and imports `foo-*.ts`. So the generated names are unchanged for them, and only the `.mjs` row writes `.mjs` files.
- **No shipped trait is retained.** `mx.ts` runs `analyzeModule` at the head over each material-x source that calls `impl(`, with the plugin loader's shape. All 16 compositions flatten with no bailout. Eight of them carry a method trait, matching item 3's eight `FocusForwarding` hosts. Every file under `packages/material-x/src` and `packages/core/src` that calls `impl(` is `.ts`. The `.tsx` files under `packages/*/src` are stories, and none of them calls `impl(`.
- **The plugin's gates at the head:**
  - `aube exec just test`: 8 files, 147 tests, all pass;
  - `typecheck` exits 0;
  - `lint` on the five changed files: 0 errors. ESLint warns that it ignores the `.mjs` fixture by its ignore pattern;
  - `fmt-check` is clean.
- **The document against the code:** §Eligibility's _"copied only when the origin and the consumer have the same file extension"_, the reason table's _"a method trait's file extension differs from the consumer's"_, and §Verification's negative fixture for built JavaScript consumed by TypeScript. All three describe the code accurately.

**Not covered.**

- **Byte identity of the build.** I didn't rebuild `@ydinjs/core` or `@ydinjs/material-x`. The identity with `17065ddf0` (93 and 27 files) and the absence of any warning in the log are the implementer's reading. My reading agrees: `canCopySource` only decides whether a site is retained, and `mx.ts` shows every material-x site still flattening.
- **Parse options beyond the extension.** The ruling assumes that the extension fixes the parser's language and options. I checked that for the plugin's own `parseSync` only. I didn't check whether a downstream transform reads another option, such as a `tsconfig` setting, differently for two files of one extension in different packages.
- **Item 3.** It is out of scope.
- **CI.**

## Findings

### Tier C: the JSDoc of `TRAIT_SOURCE_LANGUAGE` still states item 2b's rule (`recheck-3`)

- **Observed:** `src/diagnostics.ts:40–43` says the reason applies to a method trait's source that _"would be copied between languages other than one language to itself or JavaScript to TypeScript"_. At `fbe60bd53`, `canCopySource` retains every pair whose extensions differ, JavaScript into TypeScript and `.ts` into `.mts` among them. `diagnostics.ts` was last changed at `a93110bf3` (item 2b), and item 2c didn't touch it.
- **The requirement:** the reason table in the document says _"a method trait's file extension differs from the consumer's"_. The handoff's item 2c says _"Every other pair is retained with `trait-source-language`"_. `canCopySource`'s own JSDoc agrees with both, so the only contradiction is the reason's comment.
- **Consequence:** a maintainer who reads the reason code is told that JavaScript into TypeScript is copied, and it isn't. `REASON` is not exported from `src/index.ts`, and `index.d.ts` doesn't carry it. So no integrator sees the comment, and the tier is C.
- **Required property:** the reason's JSDoc describes the pairs that the code retains.
- **Routed** to the implementer. The rule is settled, and only the comment lags behind it.

## What holds

- **`recheck-1` is resolved.** A `.ts` trait in an `.mts` or `.cts` consumer is retained with `trait-source-language`. Its rows fail before the change and pass after it.
- **`recheck-2` is resolved.** A `.js` trait in a `.ts` consumer is retained, and so is an `.mjs` one, which no committed row covers. The `.js` row fails before the change and passes after it.
- **The built-package row is now negative,** as the handoff requires: `method-package-consumer.ts` over `forwarding.mjs` is retained, and its output still contains `impl(`. The new `method-package-consumer.mjs` flattens, and it still witnesses item 2's origin-scan repair (M8).
- **`.ts` into `.ts` still flattens:** in the consumer module, in another module, and in the new describe's positive row.
- **No material-x or core trait is retained,** so the handoff's stop doesn't apply.

## Proposed canonical ids

None. `recheck-3` is Tier C and concerns `RF-44`'s own subject, so the architect or the implementer can date it under `RF-44`. That is a proposal, not an allocation.