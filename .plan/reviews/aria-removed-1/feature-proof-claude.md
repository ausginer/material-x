# `useARIA` after a reconnect (RF-124, #223) — feature proof

**Files were read at:** `6e0ca1d4f`, the head of #224 (`core/use-aria-1`), in slot `e`. The base is `origin/main` at `114270083`. Where a reading says `main`, this tree has `useARIA.ts` as at `114270083` and core rebuilt. The file was restored and core rebuilt afterward. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** `repo:RF-124` in [`00-index.md`](../../00-index.md) with the implementer's dated paragraph, the [readings and probes](../../aria-removed-1/), and the diff `114270083...6e0ca1d4f`.

**Verdict: the required property holds as written, for every `aria-*` name, in the three engines. The property itself has a consequence that the entry doesn't name, and the branch introduces it: after the host has once had and lost an `aria-*`, each connect removes the value that the component itself writes to that name (`reviewer-1`, tier A, the architect's). Until that is ruled, I don't count the proof as a pass. Two smaller findings, tier C.**

## Scope

**Covered** ([readings](checks/readings.txt), [mutations](checks/mutations.txt); probes of [core](probes/core.browser.test.ts.txt), [material-x](probes/material-x.browser.test.ts.txt) and the [component's own values](probes/own-out.browser.test.ts.txt)). At the head, the three engines' readings are identical.

- **Each kind and each loss.** 54 names: the ARIA attributes and one unknown `aria-x-unknown`. Each was set before the connect, and again after it, so that the observer mirrors it. In each of eleven losses the target ends without the attribute:
  - while connected, and while out;
  - removed and taken out in one task, and put back later;
  - removed and moved, removed and reinserted, and removed with a move of its ancestor, each in one task;
  - taken out, removed and reinserted in one task, and reinserted then removed;
  - removed in a fragment, in another document, and with `moveBefore`.

  On `main`, nine of the eleven keep the old value. The two that don't are the removal while connected and the reinsertion before the removal. `moveBefore` disconnects and reconnects the host where the engine has it. The reading of WebKit on `main` differs there alone, because it has none.

- **Re-added or changed while out.** `B`, the empty string, and removed then added again, within a task and across frames: the target has the host's value.
- **Never mirrored.** `role`, `title`, `data-*` and a name without the hyphen aren't touched, and the transformer isn't called. Nor are an `aria-*` that the host had only while out, or only within one task before a move: neither was mirrored, and the target's own value survives.
- **The target's own `aria-*`,** for a name that the host has never had: survives each connect, in the probes and in nine component rows. For a name that the host had once, see `reviewer-1`.
- **Several connects.** Over eight steps, the target has what the host's current attributes give. A lost name is transformed from `null` again on every later connect, and a name that returns is copied. Two hooks on one host keep their own transformers.
- **Every caller,** with five attributes and four ways each: `mx-button`, `mx-icon-button`, `mx-link-button`, the two switch buttons, `mx-fab`, the two interactive list items, and the two text fields. After each, the control has what it has after a removal while connected. The text fields return to `label` and to `support counter`, synchronously in the connect. They follow a label that is added or removed while out, and a second move. `mx-split-button` mirrors nothing, before or after.
- **The sortable list.** A button item that loses its `aria-description` while out, or in a move, gets the list's description back. On `main` it kept the old text. After a loss while connected, the reading is as on `main`.
- **The `Set` is needed.** The entry's reason holds in the direction that it states: no other record has the mirrored names. I tried the one way that I found without it, an observer that also runs while the host is out. It passes every row. But it writes in a microtask after the connect, so in the connect itself the text fields still hold the lost label, and it mirrors what the host has only while out. So the `Set` buys the property at the connect. It must also be one per hook: one shared by all hooks removes other components' own values (`reviewer-2`).
- **The rows fail without what they guard.** The entry's counts reproduce: with the `Set` emptied before each connect, which is `main`'s behavior, five core rows and four text-field rows fail in each engine. Without the sync on connect, nine and eight fail. The namespace tests guard both filters. I read the implementer's four mutations and their counts, and didn't rerun them.
- **README and JSDoc.** The README's row is true. The JSDoc's statements are true, and silent on `reviewer-1`'s case. The `Set`'s comment is true of `useMutationObserver`.
- **Suites.** Core's 235 rows pass in each engine. Material-x passes: 558 in Chromium, and 547 with 1 expected failure and 10 skipped in Firefox. In WebKit 547 passed, 10 were skipped and one failed, `useRipple … should report no unhandled rejection`, on a host that ran other suites. Its file passes in three further runs of 30 rows, and CI's `webkit` job passes. The change doesn't reach the ripple. Both typechecks, format and lint pass on the changed files. CI on `6e0ca1d4f` passes.

**Not covered:** Safari, screen readers, the visual project, and the sizes, which I took from the record.

## Findings

### reviewer-1

**Tier A.** After the host has had and lost an `aria-*`, each connect removes the component's own value of that name from the control.

- **Finding.** `useARIA` syncs, on each connect, every name that it has ever mirrored. For a name that the host no longer has, the transformer gives `null`, so the hook removes whatever the target has then. That includes a value that the component wrote after the host lost the name, or while it was out. The component doesn't write it again, because its own source, such as `disabled`, hasn't changed.
- **Current behavior / contract.** The required property asks for this: _"for every `aria-*` that the hook has ever mirrored … the target holds what the transformer gives … and no attribute if that is `null`"_. Its exception, _"because the component may have set it on the target itself"_, covers only names that the host has never had. The entry doesn't name the case. The code does what the property says, so this is a finding on the property.
- **Why it is a problem.** The component's own value is right on `main` and missing on the branch. The state stays (`disabled`, `checked`), and assistive technology no longer hears it.
- **Evidence,** the same in the three engines. The host has the name, loses it while connected, and then the component sets its own. The last two columns are the control's attribute after a move.

  | Element, the component's own source | Name | Before the move | `main` | Branch |
  | --- | --- | --- | --- | --- |
  | `mx-link-button`, `mx-list-link-item`, `disabled` | `aria-disabled` | `true` | `true` | absent |
  | `mx-list-link-item`, `selected` | `aria-current` | `page` | `page` | absent |
  | `mx-list-button-item`, `selected` | `aria-selected` | `true` | `true` | absent |
  | `mx-switch-button`, `checked` | `aria-checked` | `true` | `true` | absent |
  | the text fields, `mx-switch-button`, `error` | `aria-invalid` | `true` | `true` | absent |
  | `mx-text-field`, `required` | `aria-required` | `true` | `true` | absent |

  A second case: the host loses the name while out, and the component's own source is set, before or during that time. `main` has the component's value after the connect, and the branch has none. Read for `aria-disabled`, `aria-current`, `aria-checked`, `aria-invalid` and `aria-required`. A removal while connected already does this on `main`, with the source set before it. The first case has no counterpart on `main` at all, and it repeats on every later connect.

- **How a correct page meets it.** `useDisableableLinkable` reads the host's `aria-disabled` on purpose, and a link's `aria-current` is the page's to give. A page that uses either and then switches to `disabled` or `selected` meets this at the next move. Validation states are less likely: the JSDoc asks for `error` and `required` instead. `mx-sortable-list` reorders by moves, so every reorder runs it.
- **The branch's rows don't see it.** _Keep an aria attribute of the target that the host never had_ is the one row about the target's own value.
- **A measured limit on the choice.** The behavior in the table isn't needed for the three cases of the entry. When a name leaves the `Set` once it has been synced from `null`, on the connect or in the observer, all 13 and 62 rows pass in each engine. In Chromium, the first case then reads as on `main`, and the property's readings above stay. I didn't read the second case there. This is evidence, not a proposal.
- **Required property.** A connect doesn't remove a value that the component wrote for itself after the host lost the name, unless the architect rules that it may.
- **Route:** the architect, because the contract asks for the behavior. Then the implementer if the property changes.

### reviewer-2

**Tier C.** No row fails when one `Set` serves every hook.

- **Evidence.** With `mirrored` at module level, all 13 core rows and 62 text-field rows pass in each engine. The probe then reads the branch's defect across instances: an `mx-list-link-item` whose host never had `aria-disabled` loses its own after a move, because another element once had it. The same happens to `aria-invalid` on `mx-switch-button` and on `mx-multiline-text-field`. The core target loses its own `aria-expanded` too.
- **Why it is a problem.** The entry's exception, for a name that _this_ host has never had, is what the one row guards. It holds only because `aria-expanded` is mirrored by no other test in the file. The code is right.
- **Required property.** A row fails when a host's own history is mixed with another host's.
- **Route:** the implementer.

### reviewer-3

**Tier C.** The record's _"The set is needed. No other place records which names were mirrored"_ reads as covering the whole required property.

- **Evidence.** The observer that runs while the host is out passes all the rows without a `Set`. What fails is the property at the connect itself, above, and no row reads it synchronously. All the rows wait a frame.
- **Why it is a problem.** The reason given isn't the one that decides. The next reader can't tell from the record or the rows that the `Set` buys the timing.
- **Required property.** The record states what the `Set` buys, or a row does.
- **Route:** the implementer, with the record.

## Observations, no finding

- `.agents/docs/accessibility.md` says in §Text Field that the host's `aria-*` are mirrored _"via `useARIATransfer`"_, which doesn't exist, and cites `src/core/controllers/useARIA.ts` and `useSlot.ts` at missing paths, also in §FAB. `repo:host-invariant-1`'s report lists the paths. Outside this unit.
- A name that the host has now is also written again on each connect, as on `main`, so the host's value wins over the component's own there. Unchanged.