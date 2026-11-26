#### DRD-36 — A `CallbackList` inserts at its kind's end and runs from the array's end

**Status:** active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `2bec0c431` ([`insertion-edit.diff.txt`](../probes/callback-list/insertion-edit.diff.txt)). Amends `DRD-35`, and `DRO-12`'s figures. Implemented at `50ed18a17` from [`callback-list-completion-handoff.md`](../callback-list-completion-handoff.md), reported at `36dbd55db` ([report](../callback-list-completion-report.md)). Read by the architect ([assessment](../callback-list-completion-assessment.md)): conforms. Its costs are accepted under `DRO-12`. **Amended on 2026-11-12 by `DRD-53`:** module factories in `kernel/callbacks.ts`, and insertion through the stored array method

**Each list holds the name of the array method it inserts with. `CallbackList.queue()` makes a list that adds with `unshift`, and `CallbackList.stack()` one that adds with `push`. `run` is the same for both: it removes the last entry with `pop` and calls it. No list holds a function of its own.**

Decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit to `src/kernel/callback-list.ts` on `2bec0c431`. The architect saved it as [`insertion-edit.diff.txt`](../probes/callback-list/insertion-edit.diff.txt) (SHA-256 `8b3b9b97…ff58`) and checked it with the edit in place, changing nothing ([probe README](../probes/callback-list/README.md#the-owners-insertion-edit-as-read-for-drd-36)). Typecheck, `oxlint` and ESLint pass, and the list, request, release and `classes` tests pass in Chromium. [`callback-list-completion-handoff.md`](../callback-list-completion-handoff.md) completes and commits it.

**The owner's direction:**

- **The current uncommitted `CallbackList` is chosen:** insertion by `push` or `unshift`, and one `pop`-based run.
- **It replaces the per-list direction function** that `DRD-35` required.
- **No alternative prototype, no timing, and no budget re-base.**

**Required properties:**

1. **Insertion decides the order.** `queue()` gives the private constructor `'unshift'` and `stack()` gives it `'push'`, and the list keeps that name in a private read-only field. `add` inserts the callback and its receiver with that method in one call, so they stay adjacent and in that order. A queue holds its newest entry first, and a stack holds it last.
2. **One `run` for both.** `run(argument)` removes the receiver and then the callback from the end of the array, and calls the callback on the receiver. So a queue runs its oldest entry and a stack its newest. `run` doesn't branch on the kind, and it is called only when an entry waits.
3. **No function per list.** The factories create no closure, and a list holds no function. The method's name is a string literal, so a list is its object and its array.
4. **Unchanged from `DRD-35` property 5:** callback and receiver in two adjacent slots of one private array, with no object per entry; the private constructor and the two factories; `empty`; `has`, which finds a pair whatever the order; `add`, which always adds; `clear`; removal before the call, so a throw leaves the list consistent; a list that decides nothing about when its entries run and handles no throw; and the three instances.
5. **A step that requests its own pair again while it runs** is added as a new entry. In a queue it runs after every entry already waiting, as before.
6. **The comments state this representation.** The class comment and `add`'s JSDoc say where each kind inserts and that `run` takes the last entry. No comment says that a list holds a direction function, or that `add` appends for both kinds.
7. **Every other property of `DRD-35` holds,** as `DRD-37` amends it. DRI-8, DRI-9 and DRI-10 are unchanged.

**What this amends in `DRD-35`:**

- **Its direction "The per-list direction function is intentional"** is superseded by the owner's later choice.
- **Property 5's third bullet,** the per-list direction function, is replaced by properties 1 to 3 above.
- **Property 5's fourth bullet:** "`add` always appends" now reads "`add` always adds".

**Not adopted:** the per-list direction function implemented at `53c87f988`. The representations that `DRD-35` deferred stay deferred, on the same conditions. This decision compares nothing and reopens nothing.

**Cost.** `DRO-12`, as amended. By reading, a list loses its direction function. A queue's `add` now moves the waiting entries, where the previous version's `run` moved them. Timing stays deferred, so nothing measures that.

**Amended 2026-11-12 by `DRD-53`:** properties 1, 3 and 4. A list holds the array method itself, the factories are module functions, and the class is exported only as a type. The text above is unchanged.