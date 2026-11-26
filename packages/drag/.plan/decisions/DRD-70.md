#### DRD-70 — Grab mode as an opt-in `sortable` feature on a kernel hold: proposed, and deferred by the owner

**Status:** proposed on 2026-11-20 and deferred by the owner the same day. Not in force

**Deferred by the owner on 2026-11-20, before any implementation. Not in force.** No kernel hold and no `grab()` is scheduled. drag's release (#57) doesn't wait for this entry, and `DRD-33` C10, _"The kernel doesn't change"_, stands unamended. His words, relayed by the coordinator, answering `repo:RD-31` Q5: _"Так, фичу с захватом откладываем. Мне не очень нравится направление, тут надо, наверное, посидеть и отдельно подумать 🤔 Особенно мне не нравится идея "операция живёт между нажатиями", это прям подножка текущей архитектуре"_ ("So, we're deferring the grab feature. I don't much like the direction; I probably need to sit down and think about it separately. I especially dislike the idea that 'an operation lives across key presses'. That really trips up the current architecture."). **A later keyboard design starts from his own thinking, not from this text.** The properties below are the proposal as it was written, kept as the record of what was proposed and why.

**Proposed 2026-11-20 by the architect** (until the deferral this line read _"Decided"_), on the owner's direction for `repo:RD-31`'s Q2, relayed by the coordinator: _"надо его предусмотреть. Т.к. мы делаем универсальную библиотеку, то надо, чтобы такая опция была. Но важно, чтобы это нам не портило размер (ну или не сильно портило 🤔). Я думаю, можно отдельной фичей сделать"_ ("it has to be provided for. Since we're building a general-purpose library, that option should exist. But it mustn't hurt our size, or not much. I think it can be a separate feature"), and _"фичей — в смысле sortable feature"_ ("a feature, as in a sortable feature"). Registered on `repo/list-sortable-1`, from `origin/main` at `e4b0e475d`. `DRD-69` is the highest `DRD-` on any branch on `origin`. The research and the comparison are in [`list-sortable-plan.md`](../../../../.plan/list-sortable-1/list-sortable-plan.md#q2-the-keyboard-model).

**What the status said before the deferral:** **Status: unimplemented.** Property 6 needs the owner's acceptance of the kernel's cost, `repo:RD-31` Q5. drag's release (#57) waits for this decision's implementation, because it adds public API.

**Properties.**

1. **A capability fills a new `sortable` slot, `keyboard`:** `grab(options?)` from `@ydinjs/drag/sortable/grab.js`, a new public entry. It is a stateless value or an installer under `DRD-33` C2. Without it, `sortable` keeps today's one-step arrow commands, unchanged.
2. **With `grab()`, a keyboard operation is one operation across key presses:**
   - Space or Enter on the item's keyboard handle activates it.
   - An arrow key moves the placeholder one slot, and the visual follows it.
   - Space or Enter drops it, with one `onReorder` verdict for the whole move.
   - Escape cancels it, and the item lands home.
   - Tab, and focus leaving the item, cancel it.
   - An arrow key that would leave the collection does nothing. While the operation is active, no arrow key's default runs.
   - The one-step arrow commands are off.
3. **The keyboard handle** is `options.handle(item)` when given, and otherwise `sortable`'s `handle`. So a consumer can drag a whole item by pointer and grab it by keyboard only through a focusable handle. Space and Enter on an interactive item keep activating it.
4. **Hooks for the consumer's announcements and roles:** an `onGrab(item)` option, called at activation, and an `onMove(request)` option, called after each step with the request the drop would make. `onEnd` reports the result as it does today. The library still announces nothing and writes no role (`DRD-9`).
5. **Focus and the lift:** focus stays where it was inside the item through the operation, as `DRD-9` and `DRD-15` require. `DRD-14`'s ownership of the visual holds.
6. **The kernel holds a keyboard operation for a behavior that asks.** The rest of the kernel doesn't change: a command's operation then stays active after activation, and the session passes its key presses and the item's loss of focus to the operation until the operation requests its drop. The capability itself listens for nothing (`DRD-33` C5). This is the one amendment to `DRD-33` C10, _"The kernel doesn't change"_. **Its cost in every composition is measured, "draggable alone" included,** and the owner accepts it before adoption (`DRO-20`). The estimate is tens of bytes Brotli, not a reading.
7. **Size.** `grab` adds nothing to a composition that doesn't import it, beyond the slot's call sites (`DRD-33` C7). Its cost appears in a new row, "sortable + y + landing + grab". The existing rows' ceilings move under `DRO-20` once the owner accepts the change.
8. **Tests.** Browser rows cover each key in property 2, the handle in property 3, the hooks in property 4, focus, and a cancel after several steps that lands home. They run in Chromium, Firefox and WebKit, and in the consumer project against the published build (`DRD-54`). The contract and the README describe the feature.

**Why.**

- **Grab mode is the established keyboard model for sortable lists,** and the more correct one for screen-reader users (`repo:RD-31` Q2 has the sources). drag's one-step model stays the default because it is smaller and still correct for sighted keyboard users.
- **A slot, because that is how sortable's features are composed** (`DRD-33`). The owner asked for _"sortable feature"_, and a consumer who doesn't import it pays only the call sites.
- **A real operation, not steps:** a grab built from one-step commands would commit and land at every arrow press, and Escape couldn't put the item home without a second reorder. Holding one operation needs the kernel's help, because today the kernel drops a command right after it activates (`Session`'s constructor and `#activate`).
- **Its own keyboard handle,** because `handle` gates pointer presses and commands alike. `repo:RD-31` Q3 needs a whole-surface pointer drag with a keyboard grab on a handle.