# A connected group raises the button with keyboard focus — feature proof, `RF-126` (c)

**Files were read at:** `9c1834b30` (`material-x/group-focus-1`, slot `g`, clean, equal to `origin`, pull request #245, for #227). **Diff reviewed:** from the merge base `eddf39e7b`. `origin/main` is now `f9729a393`, records only, and merges without a conflict.

**Contract:** `repo:RF-126` in [`00-index.md`](../../00-index.md), from _the contract. Ready for an implementer_ to the implementer's last note. **Engines:** Playwright's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, on the elements built from the head.

**Lens:** feature proof. Nothing is repaired and no record is amended.

**Verdict: for the five buttons as members, the required properties hold in each way that focus was made to arrive, change or leave, except where an event doesn't reach the group (`reviewer-4`).** There are four findings. One is Tier A and goes to the architect, because the recorded costs are incomplete (`reviewer-1`). The others are Tier C.

## Required properties

| Property | Reading |
| --- | --- |
| 1. No other member covers the indicator | **Holds** for `mx-button`, `mx-switch-button` and the split button, each member, LTR and RTL, by pixels ([`rtl.txt`](checks/rtl.txt)). The three other kinds by the implementer's rows and by `keyboard-raise.mjs`, run again: equal to its saved reading |
| 2. The group is a stacking context exactly while a member's control matches `:focus-visible` | **Holds** for members in the cases below ([`state.txt`](checks/state.txt)). Exceptions: `reviewer-2`, `reviewer-4` |
| 3. No member is raised without it | **Holds** in each rendered case. In WebKit a member moved to `slot="none"`, which isn't rendered, keeps a computed `z-index` of 1 after focus left it |
| 4. Members alone | **Holds** for a button in a member, a popover or a wrapper. Not for another kind of child, `reviewer-2` |

**Ways read for properties 2 and 3**, each in the three engines, against `:focus-visible` of each member's own control:

- **Arriving:** script focus with no input, after a click and after Tab, `focus({ focusVisible: true })` on another member, `autofocus`, a modal dialog that holds the group, and a dialog elsewhere that gives focus back, from Tab and from a click.
- **While focused:** eight keys after a click, a click on the same member after Tab, a held press, a click on another member, focus moved between a control and a focusable element in its content, and back.
- **Leaving:** `blur()`, disabled, removed, replaced by a clone, re-appended, hidden, `visibility: hidden`, `inert`, slotted elsewhere; the group disabled, hidden, `inert`, removed and put back. After each: a key, a click on another member, and Tab in again.
- **Two groups:** focus moved from one to the other.
- **The split button:** Tab to the leading button, its content and the trailing one, then disabled, and removed and put back.
- **A window switch:** another page in front and back. The automation keeps the page's focus, so this reads little.

## Findings

### reviewer-1 — three changes inside a group with keyboard focus aren't among the recorded costs

**Tier A,** by consequence: rendering and hit testing differ from `main`. Routed to the architect. No required property is broken, because the properties speak of the group's outside and of rest.

- **Current behavior** ([`content.txt`](checks/content.txt), [`late.txt`](checks/late.txt)). The second reading of each is the same bundle with the two declarations, `isolation` and `z-index`, neutralized. The engines agree on these:
  1. **A badge with `z-index: 1` on the corner of an earlier member,** overhanging the next one, is cut while the next one has keyboard focus. Red pixels of a 20px badge: 1202 at rest, 768 focused (Chromium), 1201 and 752 (Firefox), 1202 and 769 (WebKit). Without the declarations it stays whole. With `z-index: 2` it stays whole.
  2. **A tooltip with `z-index: 10` in the focused member** is covered by an element with `z-index: 1` in a later member. Without the declarations it is on top.
  3. **A `z-index: -1` decoration in the focused member** is painted over the button's background. Without the declarations it is behind it, and not visible.
- **Why it is a problem.** The contract's third cost says that a page's badge slotted beside the members isn't covered with `z-index: 1`. That is so after the members. For a badge on an earlier member it isn't. The owner was told of two costs, and a notification badge on a button's corner is an ordinary use. Cause 2 and 3 are the raised box being a stacking context of its own.
- **Required property.** The record states what a page's content inside a member sees while a member has keyboard focus, and whoever accepts the costs has seen it.

### reviewer-2 — a child that isn't one of the five buttons makes the group a stacking context

**Tier C:** the slot is documented for buttons. Routed to the architect, because the contract's properties and its mechanism differ.

- **Current behavior.** The handler reads each child's `shadowRoot.activeElement`, as the mechanism says. With `mx-checkbox`, `mx-fab`, `mx-text-field` or a page's own element with a native button in its shadow tree as a child, the group is isolated while that child's control matches `:focus-visible`, in the three engines. For a text field that is also after a click ([`state.txt`](checks/state.txt), _what a child can be_). The child isn't raised.
- **Against.** Property 2 and 4 with the definition of a member, one of the five buttons. The implementer's note says that the code agrees with the contract. It agrees with the mechanism.
- **Required property.** The contract says which children count, once.

### reviewer-3 — two behaviors of property 2 have no row, or one that holds them by accident

**Tier C.** Mutations in the three engines, all 47 rows run ([`mutations.txt`](checks/mutations.txt)).

- **The last member isn't held.** With the last child left out of the read, all 47 pass in each engine. A connected group's last member, and a split button's trailing one, then get neither isolation nor raise with keyboard focus. Nothing covers the last member's indicator, so no consumer sees it, but property 2 says _one of its members_.
- **Keyboard and then pointer in one group is held by one row of another subject.** With a state that is never cleared, the rows B and E all pass, and D's _wrapper_ row alone fails in Chromium and WebKit, with the two popover rows also in Firefox. B and E click in a group that never had keyboard focus. The built head is right here: Tab, then a click on another member, gives `isolation: auto`.
- **Not findings.** The raise not bound to the state, and the raise by `:focus-within`, also pass all rows. They differ from the head only where the control is `:focus-visible` and the state isn't set.
- **Required property.** Each clause of property 2 fails a row of its own when broken.

### reviewer-4 — the state follows two events, so it is stale where neither reaches the group

**Tier C,** by rarity of the page that has it and because the result is `main`'s or lasts until the next event. Routed to the architect to accept or state.

- **`keydown` stopped by the page** on the member: after a click and a letter, the control is `:focus-visible` and the group isn't isolated, in Chromium and WebKit. The indicator is covered, as on `main`.
- **The group defined after its member has keyboard focus,** as with a lazy import: not isolated until the next key or focus, in the three engines ([`late.txt`](checks/late.txt)).
- **`moveBefore` of a focused member** (Chromium and Firefox; in WebKit the probe's optional call moved nothing): into a second group, that group isn't isolated until a key. In Chromium the group that it left stays isolated with no member focused, because its `:focus-within` still matches. In Firefox a clicked button moved into a group that had keyboard focus before isolates it, which is the pointer's case.
- **Required property.** Property 2 says _exactly while_. Either it holds in these, or the entry names them as limits.

## The implementer's statements

- **The button's own `--_focus-z-index: auto` is held by no row: confirmed.** _No declaration on the button_ passes all 47 in each engine. The row-D mutation with an unconditional raise fails without it.
- **The rule order has no effect: confirmed.** The two rules set different properties on different elements, so they can't compete. With them swapped in the source all 47 rows pass in the three engines, and with them swapped in the bundle `state.mjs` prints the same 384 lines.
- **Sizes: confirmed at the head.** `complete` 23126, `connected-button-group` 3893, `split-button` 7525, `text-field` 8511, `icon-button` 5136, `button` 4866, which are the recorded figures. The base's figures weren't built again.
- **Witnesses: confirmed.** `keyboard-raise-mutate.mjs` run again in the three engines gives the saved reading.
- **The proof's `stack.mjs` and `hit.mjs`:** against the head with the two declarations neutralized, `stack.mjs` differs in the two lines that the record has and `hit.mjs` in none. This stands in for the merge base, which wasn't built.
- **The five-button restriction, pages' sentences, files:** as the contract says. The split button's page says _the group_, a word that page doesn't introduce.

## Observations, no finding

- **RTL evidence.** The contract's _"the indicator is whole in RTL by the probe"_ samples straight edges only. In RTL the inner edges of the first and last member, and of both buttons of a split, are full arcs, so they have 0 samples and can't fail. By pixels they are whole (`rtl.txt`), and with the declarations neutralized 113 to 184 pixels are covered, so the new reading discriminates.
- **Why they are arcs, pre-existing:** the first button's outer corners are at the physical left in RTL (`20,8,8,20` in both directions), which is the inner side. `RF-134`'s required property, on `main`, therefore fails today. Not caused by this branch.
- **`:state(focus-visible)` on the group** can be matched by a page, and stays set after focus leaves. It isn't documented, and no document says that it is private.
- **A page that sets `isolation: auto` on the group** overrides the `:host` rule, by cascade, and gets the raise without the context. By reading, not run.
- **Buttons forwarded through another slot:** not isolated and not raised, as they have no `data-first` either. The group doesn't support forwarding.
- **`content.txt`'s pointer columns vary in Firefox** by the hover layer, from run to run. No claim rests on them.

## Not read

Safari itself, forced colors, screen readers, a real window switch, touch and pen, IME, the visual project locally, and the full suite. The merge base wasn't built. `mx-link-button`, `mx-icon-button` and `mx-switch-icon-button` weren't read by my own pixel probe. Nested groups and split buttons as members are outside the contract and weren't read beyond the implementer's probe. A page's own `z-index` on a member's host wasn't read. CI on the head is green. `state.mjs` uses `mx-button` members, and the split button's two: the ways of arriving and leaving weren't read with the other kinds.

## Verification

Probes: [`state.mjs`](probes/state.mjs), [`content.mjs`](probes/content.mjs), [`late.mjs`](probes/late.mjs), [`rtl.mjs`](probes/rtl.mjs), [`mutate.mjs`](probes/mutate.mjs). They need a bundle by the earlier proof's `bundle.mjs`. The neutralized bundle is that bundle with `isolation:isolate` and `z-index:var(...)` replaced by `auto`, one match each. `load()` runs the bundle again in one window, so each later load logs a duplicate definition, and `late.txt` counts 5. The mutation script restores its files. The tree was clean after it.