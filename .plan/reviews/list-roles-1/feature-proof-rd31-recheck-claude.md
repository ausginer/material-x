# Re-check: `reviewer-1` and `reviewer-2` of the feature proof on RD-31 (PR #99)

**Read at** `0bf998d2f` on `material-x/list-roles-1`: the implementer's fix over the architect's ruling `d1df5e19d`. I read it against:

- the handoff's [The proof on `RD-31`: `reviewer-1`, ruled](../../list-roles-1/list-roles-handoff.md#the-proof-on-rd-31-reviewer-1-ruled), its required properties 1 to 6 and _What the implementer does_;
- the [report](../../list-roles-1/list-roles-report.md)'s [fix for `reviewer-1`](../../list-roles-1/list-roles-report.md#the-fix-for-reviewer-1) and its corrections for `reviewer-2`;
- this pass's [feature proof](feature-proof-rd31-claude.md) at `8efe7c009`, which read `de24d50d5`.

Reviewer: Claude, the same feature-proof pass, on the coordinator's task of 2026-11-21. **Everything ran in one private detached worktree at `0bf998d2f`,** installed and built with `aube exec just build`, in Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1. The branch's merge of `origin/main` (#106), which was under way during this pass, wasn't read.

**Scope:**

- **Covered:**
  - the claim record in `sortable-item.ts` against the ruling's properties 1 to 6;
  - the first pass's four probe cases;
  - the eight new rows and their mutation, including the two rows that survive it;
  - work and observation after a release;
  - the sizes;
  - `reviewer-2`'s two corrections, and `accessibility.md`'s list section.
- **Rerun** ([reading](checks/claim-observer.txt)):
  - [`consumer-writes.browser.test.ts`](probes/consumer-writes.browser.test.ts), unchanged from the first pass;
  - `sortable-list.browser.test.ts` in three engines: 228 passed;
  - the report's mutation and two more, in three engines;
  - `aube exec just size-reading`.
- **Probe of this pass:** [`claim-observer.browser.test.ts`](probes/claim-observer.browser.test.ts). It wraps `MutationObserver` before the list modules load. So for each item observer, the one whose `attributeFilter` is the claimed names, it reads whether the observer still observes and how often its callback runs. It also reads:
  - a button item that gets a consumer's description and a handle in one task;
  - a consumer's removal followed by the item's next update;
  - a handle's `touch-action` written by the consumer after the claim.
- **Not rerun:** the whole material-x suite, the root `aube exec just test`, `fmt`, `lint` and `typecheck`.

**Verdict:** `reviewer-1` is **closed**, and `reviewer-2` is **closed**. **This pass finds nothing new.**

## `reviewer-1`: closed

**The first pass's four cases now hold** in Chromium, Firefox and WebKit:

- a handle keeps a consumer's later `aria-label` once it leaves the item;
- a host keeps a consumer's later `tabindex="-1"` and `aria-description` in `mx-list`;
- a consumer's later `tabindex="0"` stays once the item gains a handle, and the item's description goes;
- a consumer's later `tabindex="0"` stays in `mx-list`, and `focus()` reaches the host.

| Ruling's property | Holds | Evidence |
| --- | --- | --- |
| 1. Whoever writes, the item yields | Yes | The four cases above. The same-task row. A button item's control keeps the description that the host forwards to it, after a handle and after leaving the list. With a consumer's description and a handle in one task, the control keeps `Mine` (probe) |
| 2. `touch-action` | Yes | A consumer's later `pan-y` stays, and a later `none`, the item's value, is removed (probe). The comment on `release` says so in one sentence |
| 3. The item's own writes don't count | Yes | `write()` drops the records of the item's own writes and removals with `takeRecords()` after running them. A handle change disconnects the observer, which empties its queue, after `takeRecords()` has applied the pending records. All 228 rows pass, including the existing static-item rows, so the item still releases its own values |
| 4. A consumer's removal ends ownership | Yes | A removal is a record, so `disown` drops the name. The item writes `tabindex` again only at its next update (a slot change), and then owns it again. The release removes it (probe: `null`, `"0"`, `null`) |
| 5. Nothing observes after the release | Yes | See _After the release_ below |
| 6. Only `list/sortable-list` grows, within 9,600 B | Yes | `list/sortable-list` 8,548 → 8,686 B (+138), and `complete` +181 B. The other 31 rows are unchanged against `de24d50d5`, including every plain list row |

**After the release** (probe, three engines):

- A move into `mx-list` leaves no item observer observing. Five rounds of writes on the static host and the button item's host afterwards run no item observer callback.
- Removing the item from the document also disconnects its observer.
- Twenty moves between two sortable lists create one observer per sort, 21 in all, and one observes at the end. That one belongs to the item's current list.
- `release` sets `handle` to `null` and empties both records.
- `ListItemCore`'s cleanup sets `update` to `undefined`, so no slot change reaches a released item.

**Other writers of the watched names.** I read every write of `tabindex`, `role`, `aria-label` and `aria-description` in `packages/drag/src`, `packages/material-x/src/list`, material-x's core utilities and core's controllers. Drag's lift writes `style` and `popover` on the item, and its placeholder's `aria-hidden` is on another element. The only library writer of a watched name on a claimed element is `useARIA`'s forwarding to an interactive control. The ruling counts that forwarding as the consumer's write.

**The mutations** (three engines each, then reverted; the clean file passes before and after):

| Mutation | Fails |
| --- | --- |
| The report's: `disown` iterates no record | 6 of the 8 new rows in each engine (18), the same six that the report names |
| `write()` drops the pending records instead of applying them | The same-task row only, in each engine (3) |
| The observer's callback applies nothing | The five rows whose consumer write is delivered before the next update, in each engine (15) |

So each of the two paths, the callback and the take before the item's writes, has a row that needs it.

**The two survivors of the report's mutation are sound.**

- **The button item that leaves the list.** Under the mutation, the release removes `Mine` from the control. Then the reconnect's `useARIA` copies the host's `aria-*` again, so the outcome holds whatever the record does. The record's effect on the control is witnessed by the handle variant of the row, which fails under the mutation.
- **The consumer's removal.** Under the mutation, the release removes an attribute that is already absent, which changes nothing. Whether a removal ends ownership changes no observable state: the item writes the attribute again only at its next update, in either case. Both rows read the ruling's outcome, and neither can tell whether the record is there.

**One note for the architect, not a finding.** Proof 5's new bullet in the handoff says that the ruling's rows fail in each engine. Two of the eight don't, for the reasons above, and the report says so.

## `reviewer-2`: closed

- **The report's rise row** now says that the frame after `onStart` can read 0 in Chromium, Firefox and WebKit, and it marks the correction.
- **The report's sizes** now give `complete` as +106 B in the build's own figure, 6 B over its estimate, and +100 B with the base's names, with the correction marked.
- **`accessibility.md`'s list section** now says that the item removes only the values still its own, and that a value anyone else writes or removes, at any time, is the consumer's.

## Scratch work

The worktree, its build and the probe copies are this pass's. They are removed after the commit.