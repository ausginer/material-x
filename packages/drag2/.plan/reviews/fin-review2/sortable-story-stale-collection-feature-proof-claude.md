# Sortable stories: second drag fails or misplaces — feature proof

**Tree read:** `abbdd67fb` (`drag2/fin-review2`), clean working tree. The Storybook dev server on `:6006` was serving the same tree.

**Scope.** This is a single-lens investigation of one reported symptom: in `Drag2/Sortable › List`, a downward drag works until it crosses a boundary, and then the row returns to its origin. It covers:

- `List` and `CustomPlaceholder`, with `Grid` (`xy()`) used as a control;
- `y()` resolve, `LinearShift.moved`/`refresh`, the `DEV` equivalence instrument, `layoutAnimation()` and `landing()` (each switched off in turn), and the story's React integration;
- whether #10 introduced it, checked by rerunning the same probe at `9884b1fb1`.

It does **not** cover:

- `ZoomedContext`. It uses the same `SortableDemo`, so it is affected by construction, but it was not driven.
- The production (`__DEV__ = false`) behaviour of `y()` under the same fault.
- Any other part of the package. This is not a review round.

No production or story code was changed. The probes were scratch files and have been removed.

## Result

**One finding, Tier B.** The library behaves as D-44 specifies. The defect is in the package's reference React integration, which never tells the controller that the collection changed. Every drag after the first therefore runs against the construction-time snapshot.

Under `y()` the failure is loud: the operation **fails**. The `DEV` G3-linear instrument throws, `onError` would receive it at `FAILURE_ACTION_PREPARE`, and the lift unwinds home. The story installs no `onError`, so nothing is logged. Under `xy()` the drag **completes with a wrong position**: it is a no-op instead of the drop the user released. "Grid works" is true only of the first drag.

---

### reviewer-1 — the Sortable stories never signal a committed reorder, so every later drag uses a stale collection

**Tier B.** No correctly integrated consumer is affected. The package's own demo, and the prose that presents it as the reference integration, show an integrator an `onReorder` that the contract says is incomplete.

#### Current behavior / contract

- **D-44** (contract 01 §"`snapshot` is fed by a pull source"; trace 06 rows 799–805; ledger row `SortableController.updateItems`): `items()` is pulled at construction, and after that **only on `controller.invalidate()`**. A new array identity is what stages a new snapshot (`src/sortable/spec.ts:1071–1108`). The ledger states the migration literally: _"What a consumer writes now: `setOrder(next); controller.invalidate();`"_.
- `src/sortable.stories.tsx:113–153` (`SortableDemo`): `onReorder` does `orderRef.current = next; flushSync(() => setOrder(next)); return ReorderResolution.accept();`. **There is no `controller.invalidate()` anywhere in the file.**
- The story nonetheless says it makes that call:
  - `:90–91` reads _"the config's `items()` reads it and each commit signals `controller.invalidate()`"_;
  - `:57` reads _"the resolution returning **is** the signal"_;
  - `README.md:32` describes the integration as _"the two statements in `onReorder`"_.
- The tested reference fixture does make the call: `tests/sortable/react.browser.test.ts:214` has `controller?.invalidate()`. The story and the fixture diverge.
- **Origin.** `452bdc574` ("apply the revised public API") removed the story's `onFinish: () => controller.updateItems(items())` and replaced it with nothing.

#### Mechanism, traced through the first failing crossing

The trace below is `CustomPlaceholder`, pass 2, live Storybook. `List` is identical.

1. After drag 1 the DOM is `Drafts,Sent,Archive,Inbox,Spam`. The snapshot is still the construction pull, `[Inbox,Drafts,Sent,Archive,Spam]`, so the destination view is `[Inbox,Sent,Archive,Spam]`. Slot 0 (`Inbox`) is physically the **fourth** row. `y()` and G3-linear both assume that slot order is flow order.
2. At `dy=28` the nearest centre is `Sent` (slot 1), which lies below the anchor, so the gap is 2 and `insertionAt` gives `Sent|Archive`. The DOM becomes `Drafts,Sent,_,Archive,Inbox,Spam`. This is visually correct by coincidence. `LinearShift.moved(2)` advances span `[1,2)` and measures the constant.
3. At `dy=80` the gap is 3, which is `insertionAt` → `Archive|Spam`. The placeholder is written before `Spam`: `Drafts,Sent,Archive,Inbox,_,Spam`. It **skips a row**, jumping over `Inbox`. `moved(3)` advances only span `[2,3)` (`Archive`). `Inbox` physically moved too, but its slot 0 was not advanced.
4. On the next spatial frame `LinearShift.refresh` runs `verifyEquivalence` (`src/sortable/linear-shift.ts:256`). It throws `drag: the predicted insertion geometry disagreed with a full scan at slot 0; G3-linear does not hold for this list` (`src/sortable/rect-index.ts:667`). With an `onError` attached, that error arrives with stage `4` (`FAILURE_ACTION_PREPARE`). The operation fails and the lift returns to its rest position (`liftTop 1021 → 941`, the rest top). The order is unchanged.

The owner's "near the first insertion boundary" is the first crossing **that the stale order makes non-adjacent**. On a fresh page, the first drag of the session works.

#### Isolation (Vitest browser, real Playwright pointer, same row geometry as the story)

| Configuration | Second drag |
| --- | --- |
| Story composition (`y()` + `landing()` + `layoutAnimation()`), React + `flushSync` | fails |
| `y()` with no `landing()`, no `layoutAnimation()` | fails |
| **Vanilla DOM** (no React), `y()` bare, the commit reorders nodes with no `invalidate()` | fails, `onError` stage 4 at slot 0 |
| Story composition + `controller.invalidate()` after the commit | **correct** |
| `xy()` story composition, React | placeholder re-homes; drop is a no-op; no error |

The smallest responsible unit is therefore `SortableDemo`'s `onReorder` in `src/sortable.stories.tsx`. The failure is **not** in:

- `y()`, `LinearShift` or `RectIndex`, which behave correctly against a snapshot that matches the tree;
- `layoutAnimation()` or `landing()`;
- React or `flushSync`, because the failure reproduces with none of them.

`y()` only makes the fault visible.

**Not introduced by #10.** The same vanilla probe at `9884b1fb1` fails the same way, through that tree's predecessor instrument: _"the incremental insertion refresh disagreed with a full scan at slot 0; the span hypothesis does not hold for this list"_. No bisect was run between `452bdc574` and `9884b1fb1`.

#### Live Storybook evidence (`:6006`, synthetic pointer events at 4 px/frame)

- **`List`.** The first drag gives the final order `Drafts,Sent,Archive,Inbox,Spam` (correct). The second drag goes `Drafts,_,…` → `Drafts,Sent,_,…` → `Drafts,Sent,Archive,Inbox,_,Spam` (skips `Inbox`). The placeholder then disappears, the row returns to `top=926`, and the final order is unchanged. The result is the same at every cadence tried: 1–20 px steps, 0–120 ms dwell.
- **`CustomPlaceholder`.** Same sequence as `List` (as traced above).
- **`Grid`.** Pass 2 goes `2,3,1,_,4…` → `2,3,_,1,4…` → `2,_,3,1,…`, and the final order `2,3,1,…` is unchanged. Pass 3 is the same.
- The console shows no errors or warnings, because the story has no `onError`.

#### Why it is a problem

The demo is the package's documented React integration (README §32, the `SortableDemo` docblock). It is broken for every drag after the first, and it breaks silently. Its prose asserts a call the code does not make. An integrator who copies it gets the same stale collection. With `y()` in a dev build the drag fails. With `xy()` the drop silently lands wrong.

#### Required property

- Every commit a story makes to the order it serves through `items()` reaches the controller as the D-44 signal before the next operation needs that collection.
- The story's prose and `README.md:32` describe the integration that actually runs.

#### Proposed regression test (fails on `abbdd67fb`)

The proposed location is `tests/sortable/stories.browser.test.ts`, routed by the existing `tests/**/*.browser.test.ts` browser project. It would be the first test to import a story module. Importing the story module (CSS module plus the `@storybook/react-vite` type import) was verified to resolve under the browser project.

- **On the current tree:** all three cases fail. `List` and `CustomPlaceholder` stay at `Drafts,Sent,Archive,Inbox,Spam`, and `Grid` stays at `2,3,1,…`.
- **As a control:** the same test was run against a scratch copy of the story with `controller.invalidate()` added after `flushSync`, and all three cases passed.

```ts
import type { StoryObj } from '@storybook/react-vite';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { commands } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import '../support/browser-commands.ts';
import { CustomPlaceholder, Grid, List } from '../../src/sortable.stories.tsx';

const frame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

async function mount(story: StoryObj): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  flushSync(() => root.render(createElement(story.render as () => never)));
  cleanup.push(() => {
    root.unmount();
    host.remove();
  });
  await frame();
  await frame();
  return host.querySelector<HTMLElement>('[role="list"]')!;
}

const labels = (list: HTMLElement): string[] =>
  [...list.children].map(
    (child) => (child as HTMLElement).dataset['label'] ?? '_',
  );

/** Press the first item, travel `(dx, dy)` 4 px per frame, release, settle. */
async function drag(list: HTMLElement, dx: number, dy: number): Promise<void> {
  const box = list.children[0]!.getBoundingClientRect();
  const x = box.left + 20;
  const y = box.top + box.height / 2;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));

  await commands.pointerPress(x, y);

  for (let travelled = 4; travelled <= distance; travelled += 4) {
    // oxlint-disable-next-line no-await-in-loop
    await commands.pointerSweep(
      x + (dx * travelled) / distance,
      y + (dy * travelled) / distance,
      1,
    );
    // oxlint-disable-next-line no-await-in-loop
    await frame();
  }

  await commands.pointerRelease();

  for (let i = 0; i < 30; i += 1) {
    // oxlint-disable-next-line no-await-in-loop
    await frame();
  }
}

describe('Drag2/Sortable stories survive a committed reorder', () => {
  it('List: a second drag lands where it was released', async () => {
    const list = await mount(List);

    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Drafts',
      'Sent',
      'Archive',
      'Inbox',
      'Spam',
    ]);

    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Sent',
      'Archive',
      'Inbox',
      'Drafts',
      'Spam',
    ]);
  });

  it('CustomPlaceholder: a second drag lands where it was released', async () => {
    const list = await mount(CustomPlaceholder);

    await drag(list, 0, 128);
    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Sent',
      'Archive',
      'Inbox',
      'Drafts',
      'Spam',
    ]);
  });

  it('Grid: a second drag lands where it was released', async () => {
    const list = await mount(Grid);

    await drag(list, 160, 0);
    expect(labels(list)).toEqual(['2', '3', '1', '4', '5', '6', '7', '8']);

    await drag(list, 160, 0);
    expect(labels(list)).toEqual(['3', '1', '2', '4', '5', '6', '7', '8']);
  });
});
```

The `Grid` case is included deliberately. It fails **without** any instrument, which is what shows that the fault is the collection rather than `y()`.

#### Routed, not answered

- **Architect: re-pulling at activation.** This one is a contract question. Should activation re-pull `items()`, so that an omitted `invalidate()` after an accepted reorder is harmless rather than a stale-snapshot drag? D-44 currently says it should not ("re-taken only when that call returns a NEW array identity" on `invalidate()`). The story's docblock (`:57`, _"the resolution returning **is** the signal"_) reads as though someone expected it to. Whether it should is a public-surface call on D-44, and this pass does not decide it.

#### Incidental observation (not a finding of this pass)

`tests/sortable/g3-conformance.browser.test.ts:192` says the instrument _"throws through `FAILURE_INVALIDATION`"_. The stage observed here for a throw from a spatial resolve is `FAILURE_ACTION_PREPARE` (4). This was not investigated further.
---

## Closure check — reviewer-1 at `fb9ddd6f1`

**Verdict: closed.** No remaining defect in scope. The activation re-pull question is still routed to the architect and was not checked here.

**Tree read:** `fb9ddd6f1` (`drag2/fin-review2`). The diff checked is `5efc494bb..fb9ddd6f1`, which touches `src/sortable.stories.tsx`, `README.md`, `tests/COVERAGE.md` and the new `tests/sortable/stories.browser.test.ts`.

### Against D-44

- **The call.** `SortableDemo`'s `onReorder` now commits through `flushSync`, then calls `controller.invalidate()`, then returns `accept()`.
- **Pull sites.** `items()` is still pulled in exactly two places: at construction (`src/sortable/behavior.ts:114`) and in the invalidation prepare (`src/sortable/spec.ts:1071`). The new prose, _"pulled at construction and afterwards only on `invalidate()`"_, is accurate.
- **The structural signal.** The story's `items()` maps and filters, so it returns a new identity on every pull. That identity is what takes the structural branch. The story invalidates only after a commit, so the fresh-array pattern never costs a spurious reconcile here.

### Timing during settlement

`onReorder` runs at `RELEASING` or later, so the invalidation's prepare takes the `phase >= RELEASING` branch (`spec.ts:1117`). That branch publishes the new snapshot without rewriting the operation's frozen one, and it cannot stage a cancel.

I checked this with a scratch copy of the fixed story that recorded `onEnd`/`onError`, over three consecutive drags in `List` and in `Grid` with real Playwright input:

- **Terminals.** Every terminal was `accepted`, and there was no `onError`.
- **Snapshot versions.** Each drop's `proposal.snapshot` kept the version it was resolved against (0, 1, 2). Each published snapshot advanced the version by exactly one per commit.
- **Requests.** Every request's neighbours were the committed DOM neighbours.
- **Settled state.** The dragged row settled in its slot with its inline style cleared, and no placeholder was left behind.

### The reproduced failure

The new test runs `List`, `CustomPlaceholder` and `Grid`, dragging twice in each. It passes all three at `fb9ddd6f1`.

The same test was pointed at a scratch copy of the pre-fix story (`5efc494bb`) and fails all three with the original signatures:

- `List` and `CustomPlaceholder` stay at `Drafts,Sent,Archive,Inbox,Spam`;
- `Grid` stays at `2,3,1,…`.

The test therefore distinguishes the old behaviour from the fix, under both `y()` and `xy()`.

### Reference prose

- **The story docblock.** It now places `invalidate()` in the serial sequence, and it states the consequence of omitting the call under each axis rule.
- **The inline comments.** They now describe what the code does.
- **`README.md:32`.** It names the call, cites D-44, and states why the call is required. The phrase _"three statements"_ counts `flushSync`, `invalidate()` and `accept()`, not the handler's literal statement count. That reading is interpretive, not wrong.

### Hygiene

- `oxlint` and `eslint` are clean on both changed source files.
- `tsc -p tsconfig.json` reports nothing for either file.
- **Not a defect:** the new `COVERAGE.md` row cites the `List` and `Grid` tests, but not the `CustomPlaceholder` one.

---

## Re-check after the owner's report — a failure that is still reproducible at `f5dfa9dca`

The owner still sees failures in Storybook after the fix: sometimes one relocation succeeds, and only once per page reload. **reviewer-1's closure stands.** The stale-collection fault is gone on every mouse path tried. The re-check found a **separate, input-dependent** defect, reported below as **reviewer-2**. Whether it is the owner's failure depends on the owner's input device, which this pass does not know.

**Tree read:** `f5dfa9dca`. Storybook (`:6006`) was confirmed to serve the fixed story module, `controller.invalidate()` present.

### Mouse paths: no failure

Each matrix below was run on the live story, with `onError` and `onEnd` injected into the served module so that failures are not silent. Every drag ended `accepted`, or `noop` when it returned home. None raised an error.

- **Relocation patterns:**
  - 1→2 and back, repeated four times in a row;
  - 1→3;
  - 1→2→1 and 1→3→1 within a single drag;
  - 1→4→2 followed by 2→5;
  - the last row dragged up two rows, then back down.
- **Input environments:**
  - Vitest with Playwright mouse input;
  - the bare story iframe, with synthetic events and with a real Playwright mouse;
  - the manager UI, with the story in its preview iframe.
- **Stress variables:**
  - 2, 10, 40 and 300 interpolated moves per waypoint;
  - 0, 50, 150 and 300 ms between drags;
  - device scale factors of 1, 1.25, 1.5 and 2;
  - fractional row geometry (`line-height: 19.37px`, `padding-block: 12.3px`, `gap: 8.4px`, `font-size: 15.3px`);
  - clicks, double-clicks and sub-threshold presses between drags.

### reviewer-2 — any touch or pen drag cancels right after it activates

**Tier A.** A correctly integrated consumer sees every touch or pen drag start and then cancel. The kernel is the defect, not the story: `List`, `CustomPlaceholder` and `Grid` are affected alike, and the proposed test below reproduces it without any story.

#### Current behavior

- **The listener.** At admission the kernel arms document-level listeners for `pointermove`, `pointerup`, `pointercancel` and `lostpointercapture` (`src/kernel/pointer.ts:22–46`, armed at `src/kernel/kernel.ts:975`). The only filter is `pointerId` (`kernel.ts:828`). Any `lostpointercapture` with that id, from **any** target, becomes `CANCEL_INTERRUPTED` (`kernel.ts:844–847`).
- **The trigger.** At activation the kernel calls `root.setPointerCapture(pointerId)` (`kernel.ts:1256`, which D-17 makes kernel-owned on `root`).
- **What touch and pen do.** For those pointer types the platform has already given the pressed element **implicit** capture. Moving capture to `root` fires `lostpointercapture` on the pressed element, and the event bubbles to the document. The kernel reads its own capture transfer as the pointer stream ending.
- **Mouse is unaffected.** A mouse press has no implicit capture, so there is nothing to transfer.

#### Evidence

- **Live Storybook `List`, CDP `Input.dispatchTouchEvent`, no dispatch stubs.** Five of five drags ended `canceled`, and the order never changed. The same result held with `isMobile` on. The event trace for one drag:

  ```text
  pointerdown@SPAN                 (the handle glyph)
  gotpointercapture@SPAN           implicit capture
  lostpointercapture@SPAN  moves=4 placeholder present — activation moved capture to root
  gotpointercapture@list
  lostpointercapture@list  moves=5 placeholder gone — the kernel cancelled and released
  pointerup@SPAN           moves=20
  ```

- **A Vitest fixture with a Playwright mouse.** It builds three 40 px rows and `y()`, with a commit that calls `invalidate()`. The same press-drag-release was run with and without a `pointerdown` listener on each row that calls `row.setPointerCapture(event.pointerId)`, which reproduces touch's implicit capture on a real mouse.
  - Without the listener: `accepted`, order `bac`.
  - With it: **`canceled`**, order `abc`.
- **Coverage.** No existing test drives touch or pen. Every existing `lostpointercapture` row (`COVERAGE.md` §D-154) dispatches a synthetic event with capture stubbed, so implicit capture never occurs in the suite.

#### Required property

Only a loss of the operation's own capture ends the pointer stream: capture held by `root` for the operation's pointer. A capture transfer the kernel itself performs, from the element that held implicit capture to `root`, must not end the operation. This leaves D-154's classification (`pointercancel` and `lostpointercapture` as one `CANCEL_INTERRUPTED` origin) as it is. The dispute is only which `lostpointercapture` counts.

#### Relation to the owner's symptom

Unconfirmed. Touch or pen input would fail **every** drag in Chromium, including the first. The owner reports that one relocation sometimes succeeds. That could fit an engine or device whose capture-transfer timing differs, or a different cause. The next step is the owner's browser and input device (mouse, trackpad, touchscreen or pen; emulated or not).

#### Proposed regression test (fails at `f5dfa9dca`)

The proposed location is `tests/kernel/pointer-capture.browser.test.ts`, or the sortable suite. It uses real Playwright mouse input. The `pointerdown` listener stands in for the implicit capture that touch and pen get from the platform, which keeps the test independent of touch emulation.

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../support/browser-commands.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type ReorderTransactionResult,
  sortable,
} from '../../src/sortable.ts';

async function frame(): Promise<void> {
  return await new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

describe('pointer capture held by the pressed element', () => {
  it('should not cancel when activation moves implicit capture to the root', async () => {
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;left:0;top:0;width:200px;';
    const rows = ['a', 'b', 'c'].map((id) => {
      const row = document.createElement('div');
      row.dataset['id'] = id;
      row.style.cssText = 'height:40px;touch-action:none;';
      // What a touch or pen press does implicitly.
      row.addEventListener('pointerdown', (event) => {
        row.setPointerCapture(event.pointerId);
      });
      root.append(row);
      return row;
    });
    document.body.append(root);

    let order = rows;
    const ends: ReorderTransactionResult[] = [];
    const controller = sortable(root, {
      items: () => order,
      axis: y(),
      onEnd: (result) => void ends.push(result),
      onReorder: (request) => {
        order = order.filter((row) => row !== request.item);
        order.splice(request.to, 0, request.item);
        root.append(...order);
        controller.invalidate();
        return ReorderResolution.accept();
      },
    });
    cleanup.push(() => {
      void controller.destroy();
      root.remove();
    });

    await commands.pointerPress(20, 20);
    for (let dy = 4; dy <= 60; dy += 4) {
      // oxlint-disable-next-line no-await-in-loop
      await commands.pointerSweep(20, 20 + dy, 1);
      // oxlint-disable-next-line no-await-in-loop
      await frame();
    }
    await commands.pointerRelease();
    for (let i = 0; i < 20; i += 1) {
      // oxlint-disable-next-line no-await-in-loop
      await frame();
    }

    expect(ends.map((end) => end.type)).toEqual(['accepted']);
    expect(
      [...root.children].map((child) => (child as HTMLElement).dataset['id']),
    ).toEqual(['b', 'a', 'c']);
  });
});
```

The same test without the `pointerdown` listener passes at `f5dfa9dca`, so the listener is the whole difference. The test has not been run against a fix, because none exists yet.

#### Not verified

- **Free drag.** It shares this kernel path, so it is presumably affected as well. A touch probe of the `Free drag › Interactive` story was inconclusive: the probe's own locator failed to move the box even with a mouse.
- **Other engines.** WebKit and Gecko were not available and were not driven.

---

## The owner's Firefox failure — identified

The owner narrowed the failure to Firefox and ran the `List` story there with temporary diagnostic logging, which is now reverted. The input was a trusted mouse pointer (`pointerType: "mouse"`), so **reviewer-2 (touch and pen) is not this failure** and stands on its own. The log identifies a third finding.

**Tree read:** `c6c8364dc`, plus uncommitted logging that was removed after the run.

### reviewer-3 — the `DEV` G3-linear instrument rejects correct predictions in Firefox

**Tier B.** No shipped behaviour changes, because `DEV` folds to `false` in the published bundle and the instrument is dropped with it. Two things break:

- **The instrument is unsound.** It is the whole of G3-linear enforcement, and in Firefox it produces false positives. Every development build and every Storybook session fails drags there.
- **A documented assumption is false.** The comment justifying the slack (`src/sortable/rect-index.ts:615–625`) says the only error sources are of order `1e-5` px. In Firefox that does not hold.

#### What the log shows

The owner's first drag failed at the first committed move:

1. `shift.moved` measured the constant, with `Drafts` moving from 221 to 167 (`delta −54`). It advanced slot 0 to top 167, and `layoutAnimation()` started a `translate` of `+54` px on `Drafts`, decaying to zero.
2. On the next spatial frame, `LinearShift.refresh` ran `verifyEquivalence`, which rebuilt the cache by full scan:
   - Firefox reported `Drafts`, mid-animation, at `top = 211.817`. That is exactly `211 + 49/60`, a whole number of 1/60 px units.
   - The sink's settle walk subtracted the analytically computed offset, `54 × remaining` with `remaining = 0.83` (progress 0.17 at `currentTime` 17 ms).
   - The rebuild therefore produced a settled top of `167.004`.
3. The prediction was `167`. The difference, about `0.004` px, exceeds `slack = 1/256 ≈ 0.0039` px. The instrument threw `…disagreed with a full scan at slot 0; G3-linear does not hold for this list`. It was classified at `FAILURE_ACTION_PREPARE` (stage 4), and the operation ended `canceled` with that error as its reason.

**Mechanism.** Firefox reports layout geometry in **app units** (1/60 CSS px), and that includes an element carrying an in-flight transform. The exact presented position at that instant was `167 + 54 × 0.829864 ≈ 211.8127`, and Firefox rounded it to the nearest 1/60 px, `211.8167`. The settle walk assumes the reported rect is the exact presented position. It is exact in Chromium, which is why every Chromium run in this report passed. In Firefox the rounding error can reach `1/120 ≈ 0.0083` px, more than twice the slack.

- **Why it is intermittent.** The rounding error depends on the animation's progress at the instant of the rebuild. Whether a given committed move trips the instrument is timing-dependent, and the error exceeds the slack at roughly half of all instants. That matches "sometimes one relocation works".
- **When it cannot happen.** The failure needs a displacement contribution in flight during a rebuild, so `layoutAnimation()` must be composed and a committed move must have just occurred. Without displacement, every position the scan reads is a whole number of app units and the prediction matches exactly. `xy()` has no instrument.

#### Evidence

- **The owner's Firefox log.** It shows the sequence above, including the `verify.MISMATCH` dump: predicted slot 0 `[506.667, 167, 866.667, 213, …]` against scanned `[506.667, 167.004, 866.667, 213.004, …]`, with every other slot and the hole identical.
- **Arithmetic.**
  - `211.817 × 60 = 12709.02`, so the reported value is the nearest 1/60 px step.
  - Backing out the exact presented top from the logged settled value gives `211.8127`, a rounding error of `0.0040` px.
- **A deterministic Chromium fixture.** Four 43 px rows, `y()` plus `layoutAnimation({ duration: 160, easing: 'linear' })`. Every displacement animation is paused at `currentTime = 13` so the result does not depend on frame timing. The first boundary is dragged across with Playwright mouse input.
  - With exact geometry: `onError` stays empty.
  - With `getBoundingClientRect` rounded to 1/60 px, which is Firefox's reporting granularity: `onError` receives the G3-linear error.
  - At that instant the exact offset is `43 × 147/160 = 39.50625` px, which reports as `39.5`, an error of `0.00625` px.

#### Required property

The instrument must not reject a prediction that is correct to within the precision the engine reports geometry at. In practice: comparing a settled rebuild against a prediction must tolerate Firefox's 1/60 px rounding of a transformed element's rect. Otherwise the instrument must not rely on analytic settling of reported geometry that the engine has quantized. Loosening it must not hide a real violation; the negative fixtures in `tests/sortable/g3-conformance.browser.test.ts` are wrong by a row, not a fraction of a pixel.

#### Proposed regression test (fails at `c6c8364dc`)

This belongs in `tests/sortable/g3-conformance.browser.test.ts`, beside the positive cases. Run as written, the quantized case fails with the G3-linear error, and the same body without the `getBoundingClientRect` override passes.

```ts
it('should hold under Firefox app-unit geometry while displacement is in flight', async () => {
  const nativeRect = Element.prototype.getBoundingClientRect;
  const nativeAnimate = Element.prototype.animate;
  const appUnit = (v: number): number => Math.round(v * 60) / 60;

  // Firefox reports geometry in app units: 1/60 CSS px.
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const r = nativeRect.call(this);
    const left = appUnit(r.left);
    const top = appUnit(r.top);
    return new DOMRect(
      left,
      top,
      appUnit(r.right) - left,
      appUnit(r.bottom) - top,
    );
  };
  // Every displacement frozen at one off-grid instant, so the result does not
  // depend on frame timing.
  Element.prototype.animate = function (
    this: Element,
    ...args: Parameters<Element['animate']>
  ): Animation {
    const animation = nativeAnimate.apply(this, args);
    animation.pause();
    animation.currentTime = 13;
    return animation;
  };
  cleanup.push(() => {
    Element.prototype.getBoundingClientRect = nativeRect;
    Element.prototype.animate = nativeAnimate;
  });

  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;left:0;top:0;width:200px;';
  const rows = ['a', 'b', 'c', 'd'].map(() => {
    const row = document.createElement('div');
    row.style.height = '43px';
    root.append(row);
    return row;
  });
  document.body.append(root);

  const errors: Array<DraggableError | DraggableWarning> = [];
  const controller = sortable(
    root,
    {
      items: () => rows,
      axis: y(),
      onError: (error) => void errors.push(error),
      onReorder: () => ReorderResolution.accept(),
    },
    layoutAnimation({ duration: 160, easing: 'linear' }),
  );
  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  // Real input (`commands` from 'vitest/browser', plus the
  // `../support/browser-commands.ts` side-effect import); this file's own
  // `press`/`pointerEvent` helpers work the same way.
  await commands.pointerPress(20, 20);
  for (let dy = 4; dy <= 40; dy += 4) {
    // oxlint-disable-next-line no-await-in-loop
    await commands.pointerSweep(20, 20 + dy, 1);
    // oxlint-disable-next-line no-await-in-loop
    await nextFrame();
  }
  await commands.pointerRelease();

  expect(errors).toEqual([]);
});
```

#### Not verified

- **Shipped build in Firefox.** A Firefox run of a `__DEV__ = false` build was not made. By construction the instrument is absent there, and the settled cache is off by at most `1/120` px, which no insertion decision can observe.
- **The two other Firefox-sensitive readings of the same settle arithmetic.** These are the fold in `layoutAnimation().report` and `LinearShift.moved`'s one-row settle. They were not examined for user-visible effect. Both are sub-pixel by the same bound.

---

## Remediation check — reviewer-3 at `9598fc6d3`

**Tree read:** `9598fc6d3` (`drag2/fin-review2`). The diff checked is `13ef14077..9598fc6d3`:

- `src/sortable/rect-index.ts`: `slack` goes from `1/256` to `1/16`, with a derivation of the `4ε` bound;
- `tests/sortable/g3-conformance.browser.test.ts`: `compose()` now takes feature fragments, and a new app-unit case is added;
- `tests/COVERAGE.md`: one new row.

The probes ran in a throwaway worktree, which has been removed. No implementation code was changed.

**Verdict.**

- **reviewer-3:** resolved in substance. It **stays open** on one outstanding item: a confirmation run in Firefox, which this pass could not make.
- **reviewer-4 (new, below):** the remediation commit leaves the lint and format gates red.

### The new test distinguishes the original defect

The new case is _should predict every gap under app-unit geometry with a displacement in flight_. It rounds every rect to 1/60 px and freezes every displacement at 13 ms into a linear 160 ms slide, so the exact 39.50625 px offset reports as 39.5. It then sweeps down across every boundary and back.

- **At `9598fc6d3`:** all 12 cases in the file pass.
- **With `slack` put back to `1/256`, in the worktree only:** exactly this case fails, with the original error (`…disagreed with a full scan at slot 0; G3-linear does not hold for this list`). The other 11 pass.

The test therefore fails for the original defect and passes on the fix.

### Does `1/16` cover the measurement error while still rejecting bad layouts?

I measured the margins directly, by recording every absolute difference the instrument compares, in the worktree only.

- **Correct predictions.** The matrix was 120 drags, each down and back across every boundary, all on the 1/60 px grid with a displacement in flight:
  - 15 frozen instants, 1–155 ms of a 160 ms linear slide;
  - 4 row geometries: 43, 43.3 and 51.37 px uniform, and 70/55/30/90 px unequal;
  - flex gaps of 0 and 8.4 px.

  The largest difference was **0.0232 px**. That is inside the commit's derived bound `4ε = 1/30 ≈ 0.0333` px and 2.7× under the new slack. No drag raised an error.

- **Violating layouts.** The two negative fixtures, a two-column grid and a wrapping flex row, were driven with and without app-unit rounding. Each was rejected, and the triggering difference was **100 px** (a whole cell) every time, 1600× the slack. Both negative cases in the committed file still pass, which means they are still rejected.
- **The derivation.** The prediction is a cached reading plus a constant, where the constant is the difference of two readings of one row. That gives `3ε`. The rebuild's own reading adds `ε`, for `4ε`. This matches the measured worst case. `1/16` is the next power of two above `4ε` plus the `1e-5` terms.
- **What it does not catch.** A G3-linear violation smaller than 1/16 px now passes silently. Every violation the contract names (wrapping, cellular layout, position-sensitive margin collapse) is wrong by a row or a margin, not by a fraction of a pixel, so this is recorded rather than raised.

### reviewer-4 — the remediation commit leaves the lint and format gates red

**Tier C.** Nothing a consumer sees. But the unit was handed off in a state the repository's own gates reject.

- **Lint.** `npx just lint tests/sortable/g3-conformance.browser.test.ts` reports **2 errors**, both `@typescript-eslint/unbound-method`. They are the detached reads `Element.prototype.getBoundingClientRect` (`:382`) and `Element.prototype.animate` (`:383`).
  - These are genuine rule hits, not formatting, and `lint-fix` cannot fix them.
  - `handoff.md` says to list such errors rather than resolve them by hand, so **reporting them was procedurally correct**.
  - The repository already has a convention for this exact pattern: `// eslint-disable-next-line @typescript-eslint/unbound-method` above the detached read (`tests/sortable/displacement.browser.test.ts:478`, `:575`; also `placement.browser.test.ts:168`, `features.browser.test.ts:1322`, `kernel/presentation.browser.test.ts:522`). Applying it is the implementer's step, not this pass's.
- **Format.** `npx just fmt-check` fails on the same file. `function  getBoundingClientRect(` and `function  animate(` each carry a double space. This was **not** among the reported errors. It is also reproducible, and caused by the handoff order itself:
  - oxlint's `func-names: ["error", "always"]` (`.oxlintrc.json:277`) autofixes an anonymous `function (` into `function  name(`, with the double space.
  - `handoff.md` runs `fmt` **before** `lint-fix`, so a `lint-fix` autofix whose output is not format-clean survives into the commit.
  - In the worktree, `fmt` on the committed file removes both double spaces, and a later `lint-fix` leaves them removed. Starting from anonymous functions, `fmt` then `lint-fix` reproduces the committed double space exactly.
- **Routed to the owner, not answered here.** `handoff.md` already calls a lint rule that re-decides formatting "a defect in the gate rather than in the file". This is the mirror case: an autofix that emits unformatted output. Whether the fix is a closing `fmt` pass or a change to the rule's autofix is not decided here.

### What remains unverified without a Firefox run

The fix is verified against a **model** of Gecko's geometry: rounding to the nearest 1/60 px. That model rests on one real sample, the owner's log (`211.817 = 211 + 49/60`). What only Firefox can confirm:

1. **Rounding, not snapping, across display settings.** The sample was one device-pixel ratio and zoom level. If Firefox snapped an in-flight transformed rect to **device pixels** at some DPR or zoom, the error would be up to half a device pixel (0.25 px at DPR 2, 0.5 px at DPR 1), far over `1/16`. The sample (`…49/60`, not a half-pixel) rules this out for the owner's setup only.
2. **Real animation timing.** The test freezes animations. In Firefox the settle walk reads `getComputedTiming().progress` and the rect in the same task, and the model assumes both see the same animation time. That was not observed for compositor-driven animations.
3. **Transformed or zoomed contexts in Firefox.** `ZoomedContext`, ancestor transforms (`space` not null), and authored `rotate`/`scale` rows were not driven in Firefox. The model predicts the same `ε` in viewport space.
4. **The owner's end-to-end check.** No Firefox run of `9598fc6d3` exists. The confirming run is: repeated relocations in the `List` story (1→2, 1→3, 1→2→1, back and forth), with no "row returns to origin" and no `G3-linear` error.

**Closure condition for reviewer-3:** item 4 passes in the owner's Firefox. If it does, items 1–3 stay recorded as untested ground, not open defects.