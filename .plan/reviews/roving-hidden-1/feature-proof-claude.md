# A member that can't take focus gives up the tab stop (RF-143): feature proof

**Lens:** `reviewer`, feature proof of [`RF-143`](../../00-index.md) with its notes and `RF-141`'s last choice, for #273 and pull request #287. Requested by the coordinator.

**Commit read:** `810cffceb` on `core/roving-hidden-1`. "`main`" below is the three sources of the unit at `2485fb2df`, with core built from them.

**Outcome:** properties 1 to 5 hold in Chromium and Firefox, and in WebKit except `reviewer-1`. `reviewer-1` to `reviewer-3` are tier A. `reviewer-2` and `reviewer-3` are new with this unit, and `reviewer-1` is the part of the finding that stays.

## Scope and method

- **Read with real input,** in Playwright's Chromium, Firefox and WebKit, one at a time, on sources with core built: 203 readings for each engine ([probe](probes/proof.browser.test.ts.txt), [readings](checks/readings.txt)), and the same on `main`. Each is of the real group with `mx-switch-button` or `mx-switch-icon-button`: the tab stop, Tab, Shift+Tab, the six keys and the marks of the ends.
- **Read beside them:** the group while it or an ancestor isn't rendered ([probe](probes/proof-unrendered.browser.test.ts.txt), [readings](checks/unrendered.txt)), a group defined before its members ([probe](probes/proof-late.browser.test.ts.txt), [readings](checks/late.txt)), the time to connect ([probe](probes/proof-cost.browser.test.ts.txt), [readings](checks/cost.txt)), and the sizes of the parts ([probe](probes/size.mjs.txt), [readings](checks/sizes.txt)).
- **The rows of the affected files:** core's `useRovingTabindex` (95) and material-x's `tests/button-group` without the visual file (140) pass in the three engines.
- The probes were untracked and are removed. The sources and core's build are restored.
- **Not read:** Safari, screen readers, the rest of the suites (CI's are separate), the docs build, the group's own `disabled`, the standard group with a hidden member, memory, and a framework's render. WebKit's time to connect was read for 200 groups alone. My own mutations were run in Chromium alone.

## Findings

### `reviewer-1` — tier A, WebKit — a member that is hidden while the group isn't rendered keeps the tab stop, and Tab passes the group

- **Current behavior:** the group is `hidden`, or an ancestor is `hidden` or `display: none`, as in an inactive tab panel. A member, the tab stop, is hidden then. When the group is shown, Tab passes the whole group. With a hidden ancestor, the first shown member has the inner corners too. A member that is added hidden there gets the tab stop in none of the engines.
- **Contract:** property 1, _"A member with `display: none` [...] is never the tab stop [...] whenever the hook chooses"_, property 2, and property 4 for the ends.
- **Cause, read:** in WebKit the computed `display` of an element in an unrendered subtree stays `contents` after its `hidden` is set, at once and a frame later. A plain element with a `:host([hidden])` rule reads the same. Chromium and Firefox read `none`. So eligibility is stale in WebKit, and no change of the member comes when the group is shown. In the other direction, a member shown again there isn't given the tab stop back.
- **Evidence:** [`unrendered.txt`](checks/unrendered.txt), `hidden` in the sets _group hidden_, _ancestor hidden_ and _ancestor display_: WebKit `stop a | tab body`, Chromium and Firefox `stop b | tab b`. `main` has the same in WebKit, so it isn't a regression. `disabled` there, a closed `details`, `content-visibility` and a group that is _built_ in an unrendered ancestor hold in the three engines.
- **Why it is a problem:** the unit's finding is that Tab passes the group, and this leaves it for the engine and the place where options are hidden most: a panel that isn't shown.
- **Required property:** in WebKit, after a member is hidden while the group isn't rendered, Tab reaches the first member that is shown, once the group is. Or the entry says it is a limit.

### `reviewer-2` — tier A, new — a page that hides elements until they are defined loses the outer corners

- **Current behavior:** the page has `:not(:defined) { display: none }`, and `mx-connected-button-group` is defined before its members. No member has an outer corner, for as long as the page stays. The tab stop is right.
- **Contract:** property 4: the outer corners are on the first and the last member that isn't `display: none`. A definition isn't a page's style change alone: the hook is told of it, by `RF-141`, and chooses again. The ends aren't.
- **Evidence:** [`late.txt`](checks/late.txt), three engines: corners 8 px on both members, and 20 px on the ends on `main`. Without the rule, the ends are right at the head.
- **Why it is a problem:** it is ordinary use that worked. The rule is common against a flash of unstyled content, and a module that is loaded later, or imported after the group's, defines the members later.
- **Required property:** after its members are defined, the group's ends have the outer corners, as on `main`.

### `reviewer-3` — tier A, new, and no property states it — connecting groups takes several times longer

- **Current behavior:** the group reads the members' computed `display` at its connect and at its first slot change, and between the reads it writes their marks. By reading, each group makes the engine calculate style again several times.
- **Evidence,** [`cost.txt`](checks/cost.txt): medians of seven, Chromium, the head and `main` in turn, three times, at a load of 20 to 33 on 12 cores, so the ratios count and not the times:

  | Appended in one task |            Head |        `main` |
  | -------------------- | --------------: | ------------: |
  | 20 groups of four    |     38 to 84 ms |   10 to 12 ms |
  | 100 groups of four   |   193 to 234 ms |   40 to 53 ms |
  | 300 groups of four   |   605 to 743 ms | 120 to 184 ms |
  | 20 split buttons     |    41 to 118 ms |   12 to 23 ms |
  | 100 split buttons    |   289 to 439 ms |   39 to 80 ms |
  | 300 split buttons    | 1270 to 1414 ms |  97 to 189 ms |

  Firefox reads 2 to 6 times (not in turn), and WebKit 1089 ms for 230 (200 groups). **It is the group and not the hook:** with `main`'s group and the new hook the time is `main`'s, and with the new group and `main`'s hook it is the head's.

- **Why it is a problem:** every `mx-split-button` has a connected group, and its two members are never hidden by a page. A list with a split button in each row pays it.
- **Required property, the architect's call:** whether a group without a hidden member may cost this.

## What was read for each property

| Property | Result |
| --- | --- |
| 1 | Holds, by `hidden`, `disabled` and `display: none`, in the markup and later, in the tab stop, Tab, Shift+Tab, the arrows, Home and End, with RTL, for both members' tags. A page's own `display` shows a hidden member, and it counts. Except `reviewer-1`. |
| 2 | Holds: two microtasks later, off again, on the value's member, on the member that focus chose, for a member added later and for a removed one. After `hidden` is gone, the value's member has the tab stop back. `RF-141`'s choice holds also where focus moved off the value's member: another member's change gives it to the value's, which is the accepted limit. Except `reviewer-1`. |
| 3 | Holds: built while out, changed while out, changed back in the task of the connect, moved, cloned from a template, parsed, and in an ancestor that isn't rendered at first. |
| 4 | Holds, with the only shown member. Except `reviewer-1` and `reviewer-2`. |
| 5 | Holds: no tab stop, and Tab passes. |

**Engines differ,** apart from `reviewer-1`, where a member is hidden or disabled while it has focus, which the entry lists as not read: the tab stop moves in each, and where the next Tab starts is the engine's. `hidden="until-found"` on the focused member ends its focus in Chromium alone. Where Tab goes when it passes the group also varies, and isn't the group's.

## The departure: accepted

A member that is the only one shown is the first and the last, so property 4 asks for outer corners on all sides. Without the rule it has the last member's, two inner and two outer. It also changes a group with one member, in every page, from `8 20 20 8` to `20 20 20 20`. That follows from the same sentence, and I find no text that asks for the former. It is a visible change outside hidden members, and neither the page nor the JSDoc says it. I find nothing that needs it to.

## The sizes: what the design needs

| Part                   | connected-button-group | split-button | complete |
| ---------------------- | ---------------------: | -----------: | -------: |
| The hook alone         |                    +75 |          +59 |      +79 |
| The group's code alone |                    +85 |          +75 |     +135 |
| The sheet alone        |                     +6 |          −13 |      +49 |
| Together               |                   +145 |         +121 |     +166 |

The hook is the candidate's +68, with the read at the connect. The other half is property 4, which the candidate didn't read. Of it, the group's `MutationObserver` is 42 bytes of the head. Nothing in it is unused: each part fails a row when it is removed. `split-button` pays for hidden members that it doesn't have, because it has the group. Whether property 4 has to cost the split button that, in size and in `reviewer-3`, is the architect's.

## Mutations

- **Run by me in the three engines,** ten: _no display_, _no disabled_, _`hidden` not heard_, _`disabled` not heard_, _no choice at the connect_, _former items still heard_, _the ends without display_, _the ends not marked at the connect_, _`hidden` not heard by the group_ and _no rule for the only member_. The counts are the same in each engine, and the record's, but for the pressed row below. The rest was read from the record ([`witnesses.txt`](../../roving-hidden-1/checks/witnesses.txt)): its Chromium and Firefox counts are complete, and WebKit's first five. I didn't run WebKit for the three of `main` and for `item.hidden`, whose counts the record has.
- **My own nine,** Chromium, each fails a row ([`mutations.txt`](checks/mutations.txt)): no observer of the items, the focused item recorded without eligibility, Home and End without it, the arrows without display, the value's item without it, the former marks kept, only the last end by display, the group hearing its own attribute only, and no marks at a slot change.
- **The pressed inner corners:** no failure in 20 runs of the spec file beside four busy processes, ten in Firefox and ten in Chromium ([`pressed.txt`](checks/pressed.txt)), nor in the 39 runs of the suite under a mutation, in the three engines. So the cause stays unread. The row holds a real pointer press with one shared pointer, and the hook isn't in its path. I have no evidence that it is this unit's.

## Observations, not findings

- **`visibility: hidden`:** a member so hidden keeps the tab stop and stops the arrows, as on `main`. The entry names `display` alone.
- **A style that hides the tab stop's member alone** leaves Tab passing the group until the next change, which the entry doesn't require, and the page says so.
- **Members through a slot in the group's own content** are no items and no ends, as on `main`.