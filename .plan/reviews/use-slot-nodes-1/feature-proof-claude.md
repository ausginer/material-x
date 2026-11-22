# Feature proof: RF-75, core's `useSlot` loses its type parameter (PR #125)

**Read at** `65152f4f0` on `core/use-slot-nodes-1`, against `RF-75` and its decision in the [register](../../00-index.md) and the implementer's dated paragraph. The base is the branch's parent `24c2a07b2`, the head of #123. #123 has since been squash-merged to `main` as `c08dbd7fc`. `main` also gained `RF-73` (#116), which changes only the text field and its records. `git merge-tree` merges this branch onto `origin/main` cleanly. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-22.

Everything ran in scratch exports of the two commits (`git archive`, then a local `git init` so the build's `git` calls work; no worktree or slot). Each export was installed with `aube install` and built by the recipes that the commands below call. The browsers were Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1. Slot `e` was only read.

**Scope:**

- **Covered:** the decision's four points, the new declaration rows and whether they discriminate, every caller in the workspace, the root and declaration typechecks, core's suite, the built output, core's API docs, and the size rows, which the coordinator asked to have measured.
- **Run on both exports:**
  - the declaration rows, with the new file copied onto the base ([reading](checks/declaration-rows.txt));
  - the root `just typecheck-declarations` and `just typecheck` ([reading](checks/typecheck.txt));
  - `just size-reading` ([reading](checks/sizes.txt));
  - core's `just docs-api-build` ([reading](checks/api-docs.txt)).
- **Run on the head:**
  - core's whole suite in the three engines ([summary](checks/core-suite-head.txt));
  - `just lint` and `oxfmt --check` on the three changed files ([reading](checks/lint-fmt.txt)).
- **Probes of this pass:** five type mutations of `useSlot.ts` against the rows, and the errors that the two `@ts-expect-error` directives absorb ([reading](checks/mutations.txt)). [`size-compare.mjs`](probes/size-compare.mjs) compares the size readings, and `diff -rq` compares the builds ([reading](checks/built-output.txt)).
- **Not run:** material-x's browser suite, because no material-x built file changes. Safari.

**Verdict:** the unit implements the decision as stated. `useSlot` and `SlotControllerUpdateCallback` take no type parameter, the callback's `nodes` is `readonly Node[]`, the assertion and its lint suppression are gone, and no alias is kept. Every caller in the workspace compiles, and the size rows don't move, now measured. The declaration rows discriminate the change and the plausible regressions. One Tier C finding goes to the implementer: the type-argument row also passes when `useSlot` takes a type parameter that `HTMLElement` doesn't satisfy (`reviewer-1`).

## The decision

| Point | Holds | Evidence |
| --- | --- | --- |
| `useSlot` and `SlotControllerUpdateCallback` lose their type parameter | Yes | `useSlot.ts:13` and `:34`, and the built `useSlot.d.ts` |
| `nodes` is `readonly Node[]`, what `assignedNodes()` returns, with no assertion and no lint suppression | Yes | `useSlot.ts:15` and `:48`. `just lint` on the file is clean, oxlint and ESLint both |
| The doc comments drop `@typeParam` and still say that the nodes include text and other non-element nodes | Yes | `useSlot.ts:7-8`. TypeDoc's pages for both symbols lose their _Type Parameters_ heading, and its 13 warnings are the same on both builds, none about `useSlot` |
| No alias, under CONTRIBUTING §8 | Yes | No other export or subpath. Core is 0.1.0, and neither the local tags nor `origin`'s tags hold a core release |
| Core's test writes `SlotControllerUpdateCallback` | Yes | `useSlot.browser.test.ts`, five mocks, type-only |
| The README doesn't change | Yes | `packages/core/README.md:124` names the module and shows no signature |

## Every caller compiles

The callers in the workspace are core's `useRovingTabindex`, and in material-x `button-group.ts`, `connected-button-group.ts`, `core/utils/polyfills.ts`, `ListItemCore.ts` (twice), `sortable-list.ts` and `TextFieldCore.ts`. `git grep` finds no other use outside `.plan/`, and none of them passes a type argument.

- **Each one is in a typecheck that ran clean.** Core's `tsconfig.json` lists `useSlot.ts`, `useRovingTabindex.ts` and both `useSlot` test files. Material-x's lists all seven of its callers, and reads `@ydinjs/core/controllers/useSlot.d.ts` from core's build of the head, whose signature is the new one.
- **The root `just typecheck`** runs 15 nx tasks, which all succeed with no TS error. **`just typecheck-declarations`**, which builds every declaration package and then runs `tsc -p tsconfig.declarations.json`, is also clean. Both are clean on the base too.
- **Core's suite** passes in the three engines: 68 files, 683 rows, no type error. That is the record's 683.

## Do the declaration rows discriminate?

**The witness reproduces.** On the base with the new file copied in, 3 of 4 rows fail, with the three errors that the record shows. On the head, 4 of 4 pass with no type error.

| Mutation of `useSlot.ts`, alone | Rows that fail |
| --- | --- |
| `d1`: `nodes: Node[]` (not `readonly`) | the callback-type row and the inline-callback row |
| `d2`: `nodes: readonly Element[]` | the same two |
| `d3`: `useSlot<T extends Node = Node>` again | _should reject a type argument_ |
| `d4`: `SlotControllerUpdateCallback<T extends Node = Node>` again | _should reject a type argument on the callback type_ |
| `d5`: `useSlot<T extends Text = Text>` | **none** (see `reviewer-1`) |

- **The inline-callback row** passes on the base, because the old default was `Node`, and the record says so. It isn't idle, though: `d1` and `d2` fail it. So it holds the inferred type that a caller without a type argument sees.
- **On the head, each directive absorbs the error that its comment names.** With both directive lines deleted, the rows report _"Expected 0 type arguments, but got 1"_ (TS2558) and _"Type 'SlotControllerUpdateCallback' is not generic"_ (TS2315). The second line also reports a follow-on _"not callable"_ error, which the same directive covers.

## The size rows: measured, and none moves

`just size-reading` on both exports reads 33 rows: `box-quad`, `core`, `drag` and `material-x`. All 33 have the same Brotli and gzip bytes, `complete` included. The decision's _no size row moves_ now has a measurement behind it.

**The built output agrees.**

- **In core,** `diff -rq` finds three differing files: `controllers/useSlot.js`, `useSlot.d.ts` and `useSlot.js.map`. `useSlot.js` differs only by the deleted `@typeParam` comment line, as the record's diff shows.
- **In material-x,** none of the 224 built `.js`, `.d.ts` and `.js.map` files differs.

## Findings

### reviewer-1 — The row _should reject a type argument_ passes when `useSlot` takes a type parameter that `HTMLElement` doesn't satisfy

**Tier C. To the implementer.**

- **Current behaviour:** the row writes `useSlot<HTMLElement>(host, 'slot', () => {})` under ``// @ts-expect-error: TS2558, `useSlot` takes no type argument``. TypeScript satisfies the directive with any error on the next line, and doesn't read the code in the comment. With mutation `d5`, `useSlot<T extends Text = Text>(…)`, the line's error becomes a constraint error (_"Type 'HTMLElement' is missing the following properties from type 'Text'…"_, TS2344). So all four rows pass, while `useSlot` takes a type parameter again.
- **Why it is a problem:** the row's name and its comment state that a type argument is rejected. Under `d5`, a type argument is accepted again, and the row still passes. The regression `d3` tests (a type parameter that `HTMLElement` satisfies) does fail the row. So the gap is one kind of regression, and that kind is unlikely. This is why I give it Tier C and not Tier B.
- **Evidence:** [`mutations.txt`](checks/mutations.txt), `d5` and the absorbed errors.
- **Required property:** the row fails whenever `useSlot` declares a type parameter, whatever its constraint.

The callback-type row has the same form. `d4` fails it, and I didn't look for a mutation that passes it.

## Not found

No defect in the signature, the doc comments, the callers or the test's types. The new file is in core's `tests/controllers/`, carries the `declaration` suffix the project includes, and has a `describe` and `should` names. The three changed files are formatted and lint clean.

## Scratch work

The exports, their builds and the raw outputs are in this session's scratchpad. They are removed after this report is committed, apart from what this directory now holds.