# A context consumer names its parent (`RF-69`, revision 2) — feature proof

**Files were read at:** `3fc90ba36` (`core/context-late-provider-1`, the head of #100, clean, equal to `origin`). **Diff reviewed:** `fb19feaf7` to `3fc90ba36`. **Before** means `f12db1ced`, and **revision 1** means `13d64e449`, each read in the same tree.

**Governing records:**

- `repo:RF-69` in [`00-index.md`](../../00-index.md), and its re-plan.
- [Revision 2 of the handoff](../../context-late-provider-1/context-late-provider-handoff-r2.md), at `fb19feaf7`: decisions 1 to 6, required properties 1 to 8, proofs 1 to 7.
- The implementer's [report](../../context-late-provider-1/context-late-provider-report.md), section _Revision 2_, whose claims I checked.
- My [feature proof of revision 1](feature-proof-claude.md), at `2f36dd486`: `reviewer-1` and `reviewer-2`.

**Lens:** feature proof. Each claim below is my own reading or a run saved in [`checks/feature-proof-r2-checks.txt`](checks/feature-proof-r2-checks.txt) (§1 to §9). I repaired nothing and amended no record. Every scratch probe and mutation was reverted or removed, and the tree is clean. This record continues the round's local numbering from `reviewer-3`.

**Verdict: the implementation meets revision 2.** Required properties 1 to 8 hold, and proofs 1 to 7 reproduce. The implementer's figures match mine exactly: the mutation rows, the sizes to the byte, and the gate counts. `reviewer-1` is closed: A, B and C each fail exactly their rows in the whole material-x suite, in each engine. `reviewer-2` is closed, because the registry choice no longer exists. One new gap: no row would catch `SwitchCore` losing its parent names ([`reviewer-3`](#reviewer-3), Tier C, to the architect). The re-plan's size line in `RF-69` reads the sketch, not the measurement ([`reviewer-4`](#reviewer-4), Tier C, to the architect). Neither blocks the merge.

## Scope

**Covered:**

- `useContext.ts` against decisions 1 to 5 and properties 2 to 6.
- material-x's wrapper, `BUTTON_GROUP_ELEMENTS`, and both callers, against decision 6 and properties 7 and 8.
- Every changed and added row in core's `useContext.browser.test.ts` and in material-x's `button-group-order`, `button-group`, `SwitchCore` and `button` browser files.
- The unchanged rows in the six group-related material-x test files, checked for whether they read a button's group state before the lookup.
- Five plan mutations, the feature proof's A, B and C, and four mutations of my own: the name list with one name, with the other name, the wrapper passing `[]`, and `SwitchCore` passing `[]`.
- The sizes, with one ablation, the committed probe, the gates, and the coordinator's three questions.

**Not covered:**

- Safari: the owner deferred it.
- The PR body: the implementer is updating it in parallel, and the coordinator excluded it.
- CONTRIBUTING's wording for #96, and `ListItemCore` on #90: out of this unit's scope.

## Property by property

| Property | Reading | Evidence |
| --- | --- | --- |
| 1. Resolves a named parent in any order, for each name | **Holds.** The provider defined first, defined later in the same task or by `import()`, and parsed markup before either is defined: all resolve. The second of two names resolves while the first is never defined (core `:630`). The first resolves while the second is undefined: the `mx-button-group` order row runs before `mx-connected-button-group` is defined. | Core `:555`, `:630`. Both order rows. The probe, every row `true` in the three engines ([§6](checks/feature-proof-r2-checks.txt)) |
| 2. A named parent waits through `whenDefined`, and any other parent, or none, is synchronous | **Holds.** `useContext.ts:133`–`143`: one `includes` on `parentElement?.localName`, then the global `customElements.whenDefined(name)`. Otherwise `resolve()` runs synchronously, under a `<div>` (`:603`) and under a defined custom element that isn't named (`:615`). | With the wait removed, 7 core rows and both order rows fail. With the hyphen test in place of the name, only `:615` fails ([§2](checks/feature-proof-r2-checks.txt)) |
| 3. A stale connection does nothing | **Holds.** The count advances on connect and on disconnect (`:131`, `:146`), and a settlement runs only for its own connection (`:137`). | With the check removed, `:649`, `:669` and `:704` fail in each engine |
| 4. Each cleanup runs exactly once | **Holds.** A disconnect calls the disposer and clears it (`:147`–`148`). | Without the clearing, `:704` fails in each engine |
| 5. The provider and the event are unchanged | **Holds.** The diff in `useContext.ts` starts at the JSDoc on `:86`. `CONTEXT_EVENT_INIT`, `ContextEvent` and `useProvider` are untouched. | The three event rows pass in each engine |
| 6. The JSDoc states the contract | **Holds.** `:86`–`93` and `:106`–`107` state what `parents` names, the wait in the global `customElements`, the asynchronous effect under a named parent even when it is defined, the synchronous lookup otherwise, and no effect while the name is undefined. `ContextEffect`'s JSDoc is unchanged. No text mentions the shadow host or `customElementRegistry`. | Read; `grep` for `shadow` and `registry` finds only `:88` |
| 7. Both groups' buttons follow their group in every load order | **Holds for `mx-button`**, through `ButtonCore`: both order rows, the probe, and one microtask (`contextResolved`) in every awaited group row, so before the next frame. **Holds for switch buttons too**, but no committed row shows it ([`reviewer-3`](#reviewer-3)). | [§3](checks/feature-proof-r2-checks.txt), [§4](checks/feature-proof-r2-checks.txt) |
| 8. Every group row observes the button after its lookup | **Holds.** The four rows gained one `await contextResolved()` each, at the places proof 3 names, and nothing else. Every other awaited group row awaits after the connect and before the change it tests. The rows with no `await` in the six files are not group rows, except two that read the group's own size state. | Read. A, B and C ([§3](checks/feature-proof-r2-checks.txt)) |

**Decision 6, the callers.** `BUTTON_GROUP_ELEMENTS` is one constant beside `BUTTON_GROUP_CTX` (`button-group-context.ts:27`–`31`), and both cores pass it. Each name is witnessed: with only `mx-button-group`, the connected order row fails, and with only `mx-connected-button-group`, the `mx-button-group` order row fails, in each engine and in nothing else in the suite ([§3](checks/feature-proof-r2-checks.txt)).

**The stop conditions.** None is met:

- `useProvider` and the event are unchanged.
- No existing row needed more than an awaited resolution, apart from the new parameter.
- Every material-x consumer's parent is its provider's element, `mx-split-button` included: in its template, `mx-button` and `mx-icon-button` are direct children of `mx-connected-button-group` (`split-button.tpl.html:1`–`8`).

## The proofs

| Proof | Reading | Evidence |
| --- | --- | --- |
| 1. core's rows | **Reproduces.** The dispositions match the handoff's table. The shadow-host row is removed. The `<div>` row passes a name other than `div`. Both new rows are present (`:615`, `:630`). The rows in _"useContext"_ name their provider's element, and the two rows under `<body>` pass `[]`. | 75 rows pass in three engines ([§1](checks/feature-proof-r2-checks.txt)) |
| 2. The connected order row | **Reproduces.** The precondition that the group is undefined is in the single assertion, as in the existing row. The row fails when `ButtonCore` names only `mx-button-group`. The markup's missing whitespace is the coordinator's question 3, below. | [§3](checks/feature-proof-r2-checks.txt) `onlyStd` |
| 3. `reviewer-1`'s rows | **Reproduces.** A fails both re-enable rows, B fails the value-removal row, and C fails the join row, in each engine. In the whole material-x browser suite, no other row fails under any of the three. | [§3](checks/feature-proof-r2-checks.txt) |
| 4. Mutations | **Reproduces.** Each plan mutation fails the rows the report lists, in each engine. As the report says, under _only the first name compared_ the move and cleanup rows also fail, because their consumer's parent is the second name. | [§2](checks/feature-proof-r2-checks.txt) |
| 5. The probe | **Reproduces.** Every row resolves in the three engines. | [§6](checks/feature-proof-r2-checks.txt) |
| 6. The gates | **Reproduce.** core: 786 rows. material-x: 659 rows and 1 expected failure. Root `aube exec just test`: 148 files, 2,356 rows, exit 0. `typecheck` in core and material-x, and `lint` and `oxfmt --check` on the changed `.ts` files: clean. | [§9](checks/feature-proof-r2-checks.txt) |
| 7. Sizes | **Reproduce to the byte** in every row and column, revision 1 included. Every row is under the 200 B stop: the button rows are +83 to +104 B against before, and `complete` is +104 B. | [§5](checks/feature-proof-r2-checks.txt) |

## The coordinator's questions

**1. `complete` is +10 B against revision 1, where the sketch predicted −50 B.** **Not a defect, and explained.** The sketch's reading was one placement of the code, and placement moves `complete` by tens of bytes ([§5](checks/feature-proof-r2-checks.txt)).

- **The code does shrink.** Before Brotli, the minified `complete` is 37 B smaller than revision 1's (88,579 to 88,542), and `button/button` is 41 B smaller. The bundled consumer is the minimal shape, with no `void`.
- **The rest of the bundle is renamed.** In `complete`, the constant is emitted near the top, after the context token. The minifier then gives new short names to the top-level bindings after it, and 266 of the bundle's 1,331 statements differ from revision 1's. Brotli's result depends on those names, so it doesn't follow the 37 B saving.
- **Ablation:** the same declaration moved, unchanged, to the end of `button-group-context.ts`. `complete` reads 17,043 B, 36 B less than at `3fc90ba36` and 26 B less than revision 1. `split-button` reads 7 B less, and the other rows don't move.
- **The limit:** the sketch's source was reverted, so I can't reproduce its 17,019 B. The ablation shows that a difference of this size comes from placement alone. Where the constant should go is not for this review to decide. Any placement keeps every row under the stop.

**2. The `void` on the wait.** **Acceptable.**

- **Lint requires it:** without it, `lint` reports `typescript(no-floating-promises)` at `useContext.ts:136` ([§8](checks/feature-proof-r2-checks.txt)).
- **The repository already does this:** `packages/core/src/utils/runtime.ts:46` and five calls in `ripple.ts` mark a promise with `void`.
- **It costs no bytes:** the bundled consumer has no `void` ([§5](checks/feature-proof-r2-checks.txt)).
- **It hides no handled case.** `whenDefined` rejects only for a name that isn't a valid custom element name. Decision 5 removes the guard against such a name under CONTRIBUTING §1.1, and the JSDoc says `parents` names custom elements.

**3. The connected order row's markup has no whitespace.** **Acceptable for this unit.**

- **The defect is real, and older than this unit.** With whitespace, a scratch copy of the row passes in each engine, but each engine reports an unhandled `TypeError` from `connected-button-group.ts:67` (the `delete element.dataset['first']` inside the `forEach` on `:66`), and that fails the run. `useSlot` passes `assignedNodes()`, text nodes included (`useSlot.ts:52`, from `e4a04385f`). The callback's lines date from `0f0770391` (2026-07-12) ([§7](checks/feature-proof-r2-checks.txt)).
- **The workaround doesn't weaken the row.** The defect doesn't change the state the row asserts, since the row passes with whitespace too. Without whitespace, the row still fails under the wait removed, the first name only, `onlyStd` and the wrapper passing `[]`, in each engine.
- **The comment gives the reason** where the fixture differs from its neighbor's.
- **A caution for the defect's work item:** `mx-split-button`'s template has whitespace between the children of its own `mx-connected-button-group`. I didn't check whether the build removes it.

## Findings

### reviewer-3

**Tier C.** No committed row witnesses `SwitchCore`'s parent names.

- **Current behavior:** `SwitchCore.ts:79`–`82` passes `BUTTON_GROUP_ELEMENTS`. Both order rows use `mx-button`, which only `ButtonCore` serves. Every switch row in `SwitchCore.browser.test.ts` imports `connected-button-group.ts` statically, so the group is defined before any switch connects. There a synchronous request finds the provider as well.
- **Evidence** ([§4](checks/feature-proof-r2-checks.txt)): with `SwitchCore` passing `[]`, the whole material-x browser suite passes in each engine. A scratch row shows what that mutation breaks: parsed `<mx-connected-button-group value="b">` around two switch buttons, the group's module imported after the switches upgraded. At `3fc90ba36` the group selects `b` in each engine. With `SwitchCore` passing `[]`, the switches keep their own state, `[true, false]` where `[false, true]` is expected, in each engine.
- **Why it is a problem:** property 7 covers the group's buttons in every load order, and the switch buttons' selection is the connected group's main use. Proof 2 asks for a witness only for `ButtonCore`, so the unit doesn't deviate from its proofs. But nothing in the repository would catch a regression in `SwitchCore`'s argument. The behavior is correct today, so no consumer sees anything.
- **Required property:** the suite fails when `SwitchCore` doesn't name `mx-connected-button-group`: a switch button in that group, defined after the switches upgraded, follows the group's `value`.
- **Routed** to the architect, who owns the proof list, to decide whether the row is owed in this unit.

### reviewer-4

**Tier C.** `RF-69`'s re-plan states the sketch's size for `complete`, which the implementation doesn't reach.

- **Current text:** `00-index.md:3269`: _"Size, read from a scratch sketch: 9 to 22 B smaller than revision 1 on the button rows, and 50 B smaller on `complete`."_
- **Evidence:** at `3fc90ba36`, the button rows are 2 to 32 B smaller than revision 1, and `complete` is 10 B larger ([§5](checks/feature-proof-r2-checks.txt)). Question 1 above explains the difference.
- **Why it is a problem:** the line is labeled as the sketch's, so it isn't false, but the register now carries a size that no commit has. The architect will date `RF-69` at the merge. This entry is internal, so no consumer sees it.
- **Required property:** when `RF-69` is dated implemented, its size statement matches the measured sizes.
- **Routed** to the architect. The implementer's report already raises the difference under _Open_.

### Closed from revision 1

- **`reviewer-1`** (Tier B, to the implementer): **closed.** The four rows await the resolution, and A, B and C fail them again in each engine ([§3](checks/feature-proof-r2-checks.txt)).
- **`reviewer-2`** (Tier C, to the architect): **closed by decision 3.** The consumer uses no registry other than the global one, and `customElementRegistry` doesn't appear in `useContext.ts`.

## Next

- **The architect:** `reviewer-3` and `reviewer-4`. After the merge, date `RF-69` implemented.
- **The implementer:** nothing owed from this pass.
- **The coordinator:** the whitespace defect in `mx-connected-button-group`, which is already being queued. The note on `mx-split-button`'s template above belongs with it.