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