# #340, token tables for 20 Material components, and `repo:RD-69`: recheck of `fp-1` to `fp-4`

**Files were read at:** `dd2726300`, the head of #340 (`tproc/component-tables-1`). The [feature proof](feature-proof-claude.md) was read at `f5e5ba894` and committed at `c694c71b2`. Since then: `8a8535a5f`, the architect's [ruling](checks/architect-ruling.txt) and `RD-69`'s amendment, and `dd2726300`, the implementer's three rows and their [witnesses](checks/implementer-fp-rows.txt). `scripts/convert.ts` and the store don't change. This record adds only files under `.plan/reviews/component-tables-1/`.

**Subject:** the remediation of `fp-1`, `fp-2` and `fp-4` and `RD-69`'s amendment on `fp-3`, as the architect ruled them, and #340's description. Requested by the coordinator.

**Verdict: `fp-1` to `fp-4` are closed. No new findings.** Each of the review's R1, R2 and R3 fails exactly its own new row and nothing else, and the 56 rows pass unmutated. `RD-69`'s amended property 1 states the converter's rule. The description's links resolve, and its counts match the branch. **`verify` on the head:** see [_CI_](#ci).

## Scope

**Covered:**

- **The diff** `c694c71b2..dd2726300`: `RD-69`, the three rows, and the architect's and the implementer's records.
- **The three rows,** and R1 to R3 run again on the whole of `convert.node.test.ts` ([runner](probes/recheck-mutate.mjs.txt), [output](checks/recheck-mutations.txt)).
- **tproc's suite,** unmutated.
- **#340's description,** read at head `dd2726300`, with its rendered `href`s and each link fetched.

**Not covered:** the update and the CSS again. Neither the converter nor the store changed since the proof.

**The tree.** No slot was free: slot c had an uncommitted change, and slots d, g and h belong to other sessions. So the rows ran in a `git archive` of `dd2726300` in the reviewer's scratchpad: the root's files, `packages/tproc` and `packages/drag/tests/support`, which tproc's Vitest config imports. Slot b's installed `node_modules` were linked in read-only. Slot b is at `dd2726300`, with the same `package.json` files. This record's commit was made from that copy with a temporary index, on `dd2726300`.

## The findings

| Finding | Reading |
| --- | --- |
| `fp-1` | **Closed.** _should refuse a missing reference whose node has no value id_ gives a child node only `tokenName: 'goog.ref.color'`, and expects `TOKEN_TABLE.c1: md.comp.test.a: contextualReferenceTree.referenceTree: names goog.ref.color, not in the store`. _should refuse a values reference that only another token's node of another system names_ gives `md.comp.test.a` a foreign node that names `goog.ref.color`, and `md.comp.test.b` a `values` entry that names it. It expects `TOKEN_TABLE.c1: md.comp.test.b: values.tokenName: names goog.ref.color, not in the store`. Each message names the table, the token and the field, as the ruling asks (`RD-69` property 4). R2 fails the first row only, with _"expected [Function] to throw an error"_, and R3 fails the second only. |
| `fp-2` | **Closed.** _should store unchecked a node with the table's own value id below another system's node_ places, under a foreign `goog.ref.color`, a child with the table's own id (`${SET}/tokens/k9/values/v9`) that names `md.comp.test.missing`. The token's `values` entry references the foreign name. It expects that node to be exactly `{ tokenName: 'md.comp.test.missing' }`: the name is kept and there is no `value` index (`RD-69` properties 1 and 2). R1 fails it alone, with the child-value refusal _"names no value of md.comp.test.missing in the store"_. Its name says that the node is stored unchecked, as the ruling asks, unlike the proof's probe row 3. |
| `fp-3` | **Closed by the amendment.** Property 1 now reads another design system against _"its table's own"_, the one that `system.version.name` names, which is what `TableReader`'s `designSystem` does. It says that for every table of the store this is Material 3's, `designSystems/20543ce18892f7d9/`, which the proof's raw read of Progress indicators shows. The amendment's paragraph has the reasons and the two alternatives not adopted, and keeps the old text at the end. Its status, _"**Implemented** by #340: its converter already reads it … and no code changes"_, is `RD-68` property 2's form for an amendment, in the amendment's own paragraph. The description's _"a design system other than the table's own"_ is now the decision's rule. |
| `fp-4` | **Closed.** The description's record links are absolute: `https://github.com/ausginer/material-x/blob/<commit>/<path>`, at `156e4dce8`, `dd2726300`, `f73dfffa4` and `ccca725c5` twice. Each file exists at its commit and is byte-identical to the head's, and each URL answers 200. The rendered `href`s are those URLs. |

## The rows under the review's mutations

At `dd2726300`, 56 rows, predicted before the run:

| Run | Outcome |
| --- | --- |
| unmutated | 56 passed |
| R1, `let foreign = false` | 1 failed, _should store unchecked a node with the table's own value id below another system's node_; 55 passed |
| R2, a node with no id read as another system's | 1 failed, _should refuse a missing reference whose node has no value id_; 55 passed |
| R3, `foreignNames` shared across tokens | 1 failed, _should refuse a values reference that only another token's node of another system names_; 55 passed |

This agrees with the implementer's [record](checks/implementer-fp-rows.txt), which was run in slot b on `8a8535a5f` with the rows added.

**tproc's suite,** unmutated: 14 files, 359 passed.

## The description

At head `dd2726300`:

- It has no session link and no bare `@name`, and it closes #335.
- _"Seven convert rows witness it"_ lists the four rows of `156e4dce8` and the three of `dd2726300`, each with its transcript.
- _"tproc: 359 tests pass"_ is the suite above.
- The converter changes, the update's numbers and the rule's wording match the branch and the amended `RD-69`.

## CI

`verify` run 46066340063 on `dd2726300` was in progress when this record was written. Runs on `8a8535a5f` (46065998515) and `c694c71b2` (46065307615) passed. Nothing is accepted on this record until `verify` passes on the head.