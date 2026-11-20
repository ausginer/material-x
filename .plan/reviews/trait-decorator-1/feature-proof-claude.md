# `@trait` and `@attributes(TABLE)`, "move to decorators" — feature proof

**Files were read at:** `b1579efd6`, then `f8acb005b` for the [re-review](#re-review-at-f8acb005b), (`repo/trait-decorator-1`, PR #85), in two scratch worktrees of my own. **Diff reviewed:** `d69e3ddbc` to `b1579efd6`.

**Governing records:** `repo:RD-26` and its three amendments of 2026-11-20 in [`00-index.md`](../../00-index.md); the [`@trait` plan](../../trait-decorator-1/trait-decorator-plan.md) with its proofs 1 to 12 and the load-stage section; the [`@attributes` plan](../../attributes-decorator-1/attributes-decorator-plan.md); P45 to P48; and the implementer's [report](../../trait-decorator-1/trait-decorator-report.md). Fix 2 is out of scope, because the owner dropped it.

**Lens:** feature proof. Each claim below is my own reading or my own run ([transcript](checks/feature-proof.txt)). Nothing is repaired, and no record is amended.

**Verdict at `b1579efd6`: two findings blocked the merge.** `verify` failed on that head in `static` and in `docs`, and I reproduced both locally. The compile itself meets the plans: proofs 1 and 11 reproduce byte for byte, and the tests and gates pass. Three Tier C findings for the architect don't block.

**Verdict at `f8acb005b`, after the [re-review](#re-review-at-f8acb005b): nothing blocks.** `reviewer-1` and `reviewer-2` are resolved. `reviewer-3` to `reviewer-5` stand, non-blocking, for the architect.

## Scope

**Covered.**

- **The files changed.** The 104 files are the plans' lists, plus `src/declaration-doc.ts`, `src/syntax.ts`, `tests/declarations.node.test.ts`, `packages/core/tests/traits/named.ts`, and the `.plan/` records, probes and checks. The report names the additions, `syntax.ts` among them. `list-item.ts`, `ListItemCore.ts` and `ListInteractiveItemCore.ts` are unchanged, because fix 2 isn't done.
- **Proofs 1 and 11.** I built `@ydinjs/core` and `@ydinjs/material-x` at `d69e3ddbc`, `6211e435f`, `eda3b1bfc` and `b1579efd6`. Each build gives 293 `.js`, `.d.ts` and map files.
  - **Against `eda3b1bfc`:** only the 10 trait `.d.ts` files differ. Each differs only by added comment lines, and each equals `6211e435f`'s.
  - **Against `d69e3ddbc`:** without the `sourceMappingURL` comment, the `.js` files that differ are `list/list-item.js`, `traits/composition.js` and `traits/attribute-traits.js`. The `.d.ts` files that differ are `composition` and `attribute-traits`. Every trait `.d.ts` is identical, so the class docs are kept.
- **Gates.** `just build` exits 0 with no `trait-member-conflict`. Root `just typecheck` and `just typecheck-declarations` exit 0, and `just lint` exits 0.
  - The plugin passes 153 of 153, and core 307 of 307.
  - Root `just test` passes 2211 of 2211 in my run, `drag:DRF-48`'s row included. drag's sources are unchanged in the diff, so that row's earlier failure isn't this unit's.
  - That run includes `traits-baseline` in Chromium, Firefox and WebKit.
- **The load stage, as built** (`plugin.ts`, `declaration-doc.ts`).
  - It returns `null` after a `serve` `configResolved`, for an id with a query, for one that isn't absolute, and for a file it can't read. Its parse guard is `/^\s*@/mu`.
  - It calls `this.addWatchFile(id)` for each file it rewrites. The record for each id is replaced at each load and dropped in `watchChange`.
  - **Three mutations,** each caught by the tests:
    - removing `addWatchFile` fails 1 test (_"should ask the host to watch the file it loaded"_);
    - removing the reporter's translation fails the 3 load-stage position rows;
    - making `load` return `null` fails 5 of the 6 declaration tests.
  - **Legacy decorators.** With `experimentalDecorators`, tsc and oxc-transform read `/** doc */ export @dec class` as they read `@dec export class`. So rewriting a non-trait module that uses legacy decorators changes nothing.
- **Diagnostics.**
  - The `trait-decorator` and `attributes-decorator` tests cover each row of the plans' tables, with its position.
  - The checks fail closed for forms I added. A parenthesized `@(trait)` fails with `trait-decorator` (_"trait is used only as @trait above a class"_), so nothing is left unbranded silently.
  - The report's third-decorator position, an offset in layer (b)'s output, is as recorded.
- **Size.** PR #85's measurements comment reads `list/list-item` 2567 and `complete` 16929, which equals the report's _After_ column.
- **Documents.** `trait-flattener-plugin.md`, `architecture.md` and core's README describe the decorators, fix 1 and the load stage as the code does.
- **Handoff.**
  - The PR is open, with no auto-merge, and says _"Closes nothing"_.
  - The `@trait` lines at line starts in its body are inside a code fence, so they don't notify anyone.
  - No commit message has a session link.

**Not covered.** Proofs 2 to 7 were reread, not rerun one by one against the old sources: the mutations above were the spot checks. The `tsdown --watch` reading and the build-time reading. The verify jobs that were still pending: `chromium` and `firefox`.

## Findings

### reviewer-1 — blocking

**Tier B, for the architect. The written source form, decorators above `export`, doesn't parse in Storybook's `react-docgen` plugin. So `docs-build` fails, and on the dev server every material-x trait module fails to load.**

- **Observed.**
  - In CI (verify run `44709255268`, job `docs`) and locally, `just docs-build` fails with 7 errors. Each is `[plugin storybook:react-docgen-plugin] SyntaxError: … Decorators must be placed *after* the 'export' keyword`, The log prints 5 of the 7: `split-button.ts`, `fab.ts`, `TextFieldCore.ts` twice, and `checkbox.ts`. All of them are undocumented traits.
  - On `just docs-dev`, the stories of `button-split` and `checkbox` don't render, and their trait modules answer 404. So does `IconButtonCore.ts`. A story without traits, `icon`, renders.
- **Cause.**
  - `react-docgen`'s parser sets `['decorators', { decoratorsBeforeExport: false }]` (`react-docgen/dist/babelParser.js:12`).
  - Storybook's plugin is an `enforce: 'pre'` transform over `.ts` files outside `node_modules`. It runs on the dev server and in builds, and it rethrows a parse error.
  - In a build, the load stage moves `export` for the 10 documented traits, so those parse. The undocumented ones keep the written form and fail.
  - On the dev server the stage doesn't run, so every trait module fails. A request with a query, which the plugin's filter skips, transforms normally (`split-button.ts?t=1`: 200, flattened).
- **Why it matters.** `verify`'s `docs` job fails, so the branch can't merge, and the docs site can't be built or deployed. Proof 9 doesn't list `docs-build`, so the plans' proofs couldn't catch it. The form that `react-docgen` accepts, `export @trait class`, is P47's recommendation, which the owner declined.
- **Required property.** `just docs-build`, `just docs-dev` and `docs-smoke` pass with the trait sources in the form that the plans and the owner settled. This is a decision about the source form and the tools that read it, so it is routed to the architect.

### reviewer-2 — blocking

**Tier C. `fmt-check` fails on three files that the implementer wrote.**

- **Observed.** In CI (job `static`) and locally, `just fmt-check` exits 1 on `.plan/trait-decorator-1/checks/size-reading.md`, `.plan/trait-decorator-1/probes/jsdoc-placement.ts` and `.plan/trait-decorator-1/trait-decorator-report.md`.
- **Why it matters.** `verify` fails. The report says that format ran on every changed file.
- **Required property.** `just fmt-check` passes.

### reviewer-3

**Tier C, for the architect. The load stage silently leaves a class doc out of the declarations for three forms that the plugin accepts as traits.** None of them is in the tree today. Probe: [`edge-cases.ts`](checks/edge-cases.ts), a tsdown build with declarations. In each case the brand is installed, and the build reports nothing:

- **A line comment between the doc and the decorators** (`/** doc */`, `// note`, `@trait`, `export class`): the doc is lost. The stage requires only whitespace between the doc and the first decorator.
- **`@trait export default class`**: the doc is lost. The stage skips `export default` by design, but the trait transform accepts the class.
- **`@trait export abstract class`**: the doc is lost **even though the stage moves `export`**. The stage writes `export @trait abstract class`, and the emitter drops the doc of that form.

`@trait class X` followed by `export { X }` keeps its doc.

- **Why it matters.** The stage exists so that a published trait keeps its doc. A trait written in one of these forms loses the doc with no warning, and nothing reports it.
- **Required property.** Each form the plugin accepts as a trait either keeps its doc in the declarations or is reported.

### reviewer-4

**Tier C, for the architect. Fix 1 leaves `list-item.js` with a bare `import "@ydinjs/core/traits/composition.js";`.**

- **Observed.**
  - The source's `compose` import loses its last use, and rolldown keeps the specifier as a side-effect import.
  - `@ydinjs/core` declares no `sideEffects`, so a consumer's bundler keeps and evaluates `composition.js` for the list item too.
  - The report records this, and it is why the row shrinks by 32 B and not by about 44 B.
- **Why it matters.** The amendment says that an empty list gets _"neither the block nor the import"_. The `impl` import is gone, but an import of the same module remains.
- **Required property.** The record says whether an empty composition may leave an import of `composition.js`.

### reviewer-5

**Tier C, for the architect. The load stage runs in every non-`serve` build, application builds included, and on every candidate module, dependencies and non-trait modules included.**

- **Observed.**
  - `kind !== 'serve'` admits application builds, which emit no declarations. The plan's own reason for skipping the dev server applies to them too.
  - `isCandidate` excludes only `node_modules/.vite/`, and the stage doesn't check that the module names `trait`.
  - So each candidate JavaScript or TypeScript module is read once by the stage and again by the host when the stage returns `null`. A documented, exported, decorated class in any module is rewritten, which is harmless (see _Scope_).
- **Why it matters.** It is cost in consumers' builds, and the stage edits modules that aren't traits. It affects no output that I measured.
- **Required property.** The record states the stage's scope as intended, or narrows it.

## Not findings

- **RD-26's three amendments still say _Unimplemented_.** In this register, the architect dates an implementation after its proof (RD-26's 2026-11-19 entry), so the implementer leaving them is the convention.
- **The `trait-decorator` position for a third decorator** is an offset in layer (b)'s output. The report records it.

## How this touched the fix

- `reviewer-1` and `reviewer-2` were what the implementer fixed.
- The fix doesn't move `export`, in source or in the load stage, so `reviewer-3`'s forms and `reviewer-5`'s scope are unchanged.

## Re-review at `f8acb005b`

**Files were read at:** `f8acb005b` (`repo/trait-decorator-1`, PR #85), in scratch worktrees of my own: the branch's head, and `origin/main` at `2c731045b` for comparison. **Delta reviewed:** `b1579efd6` to `f8acb005b`. The transcript is [`checks/delta-f8acb005b.txt`](checks/delta-f8acb005b.txt).

**Verdict: nothing blocks.** `reviewer-1` and `reviewer-2` are resolved. `reviewer-3`, `reviewer-4` and `reviewer-5` stand, non-blocking, for the architect.

### The delta

- **`8e795a6bd`:**
  - `.storybook/main.ts` sets `typescript: { reactDocgen: false }`, with a comment;
  - `oxfmt` formatted the three files of `reviewer-2`.

  Nothing else changed.

- **`f8acb005b`** merges `origin/main` at `2c731045b` (#81).
  - `git show --remerge-diff` differs from an automatic merge only in `.plan/00-index.md`: RD-26's three amendments, then main's RD-27 entry, with no conflict marker left.
  - Of `packages/core`, `packages/material-x` and `packages/vite-traits-plugin`, the merge changes only `api.mdx`, #79's box-quad link. So proofs 1 and 11's built output stands.

### Checked

- **`reviewer-2`.** `just fmt-check` exits 0, as do `just lint`, `just typecheck` and `just typecheck-declarations`.
- **`reviewer-1`.**
  - `just docs-build` exits 0, and `docs-smoke` passes 105 of 105.
  - On `just docs-dev`, all 83 stories render with no page error, console error or 4xx response. The five trait modules that answered 404 on `b1579efd6` answer 200.
  - The plan settled the source form and the tools that read it, and this resolves the finding by turning off the one tool that couldn't parse that form. So the question was whether turning it off loses anything.
- **Turning react-docgen off loses nothing that the site shows** ([`docs-read.mjs`](checks/docs-read.mjs)). I built three sites:
  - main at `2c731045b` as it builds, with docgen on;
  - the same with only `typescript: { reactDocgen: false }` added;
  - the branch.

  In each I read the rendered text of all 17 docs pages and the `argTypes` that the preview resolves for all 83 stories, 97 entries.
  - Main with docgen on and main with docgen off are identical in every page and every story. So is the branch.
  - The docgen-on build attaches `__docgenInfo` in 19 asset files, against 1 with docgen off, and nothing displays it. The MDX pages use only `Canvas`, `Source` and `Meta`, every story declares its own `argTypes`, and no story names a `component` or uses autodocs.

- **CI** on `f8acb005b` (run `44713276234`), as I read it: `static`, `docs`, `chromium`, `webkit` and `measurements` pass. `firefox` was still pending.

### Not findings

- **The new comment in `.storybook/main.ts`** says that the parser rejects decorators before `export`, _"the form a documented trait is written in"_. Every trait is written in that form, and the documented ones are those that the load stage rewrites in a build. The statement is true and narrower than the case.
- **A later story that names a React `component`** would get no inferred prop table. The comment states why docgen is off, so that change would meet it.