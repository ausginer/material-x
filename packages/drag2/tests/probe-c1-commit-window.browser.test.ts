/**
 * **Probe C1 — the consumer commit window, for imperative renderers.**
 *
 * Throwaway. Delete it, or promote the cases that survive into the redesign's
 * own suite, when the API redesign lands. It is a *fixture*, not a feature test:
 * it exists to produce numbers for `.plan/probes/api-2-commit-window.md`.
 *
 * Synthesis v3 §9 promises that the consumer commit may reorder authored DOM
 * around library-owned presentation nodes and that "the library re-establishes
 * the placeholder from the frozen semantic proposal". The only evidence in the
 * repo is React-shaped (`tests/sortable/react.browser.test.ts:480-702`).
 * `replaceChildren`, `innerHTML` and `createPortal` appear nowhere in `tests/`
 * or `src/`. This file opens the same window with the **current** API —
 * `onReorder` → `controller.ready(request)` — and mutates the container the way
 * an imperative renderer does.
 */
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { Point } from '../src/drag.ts';
import { landing, type LandingStart } from '../src/sortable/landing.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { y } from '../src/sortable/y.ts';
import {
  ReorderResolution,
  type ReorderRequest,
  type SortableController,
  sortable,
} from '../src/sortable.ts';

const POINTER_ID = 31;
const ROW_HEIGHT = 40;
/** The list is offset so that a detached measurement (0,0) is not the origin. */
const LIST_LEFT = 50;
const LIST_TOP = 100;

type Box = Readonly<{ x: number; y: number; w: number; h: number }>;

type Placement = Readonly<{
  parent: string;
  index: number;
  connected: boolean;
  box: Box;
}>;

/** Everything one case observed, dumped at the end of the run. */
type Record_ = Readonly<{
  case: string;
  [key: string]: unknown;
}>;

/**
 * Flip to `true` to re-derive the numbers: the dump is thrown from `afterAll`,
 * because vitest's browser mode does not forward `console.log` to the terminal.
 * Everything it prints is pinned as an assertion below.
 */
const DUMP = false;

const dump: Record_[] = [];

afterAll(() => {
  // The probe's actual output. Browser-mode `console.log` is not forwarded to
  // the terminal, so the dump travels as a thrown message while the numbers are
  // being discovered; set `DUMP` to `false` once they are pinned as assertions.
  if (DUMP) {
    throw new Error(`PROBE-C1 ${JSON.stringify(dump, null, 2)}`);
  }
});

const boxOf = (element: Element): Box => {
  const rect = element.getBoundingClientRect();

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
  };
};

const placementOf = (node: HTMLElement): Placement => {
  const parent = node.parentElement;

  return {
    parent:
      parent === null ? 'none' : (parent.dataset['name'] ?? parent.tagName),
    index: parent === null ? -1 : [...parent.children].indexOf(node),
    connected: node.isConnected,
    box: boxOf(node),
  };
};

type CommitContext = Readonly<{
  /** The element the items are children of. Not necessarily the drag root. */
  container: HTMLElement;
  root: HTMLElement;
  /** The rows, by id, in their pre-commit identity. */
  rows: Map<string, HTMLElement>;
  /** The order the request asks for, as ids. */
  next: readonly string[];
  /** Tells the fixture the authored commit moved the rows somewhere else. */
  setContainer(next: HTMLElement): void;
}>;

/** Applies the authored commit and returns the collection the library must see. */
type Author = (context: CommitContext) => readonly HTMLElement[];

type Sighting = Readonly<{ target: Point; placeholder: Placement }>;

type Observations = {
  afterCommit?: Readonly<{
    placeholder: Placement;
    libraryItem: Placement;
    dom: readonly string[];
    /**
     * The frozen proposal's identity neighbours, as the commit left them. This
     * is what a re-establishment "from the frozen semantic proposal" would have
     * to anchor on, as opposed to the item's current siblinghood.
     */
    proposalAnchors: Readonly<{
      before: Placement | null;
      after: Placement | null;
    }>;
  }>;
  /** The provisional target, measured before readiness settled. */
  landingStart?: Sighting;
  /** The corrected target, measured after `ready()` released the gate. */
};

type Options = Readonly<{
  author: Author;
  /** Put the rows in a nested container inside the drag root. */
  nested?: boolean;
  /**
   * Install the shipped landing runner instead of the observing one, so the
   * trajectory the user actually sees can be sampled.
   */
  realLanding?: number;
}>;

type Fixture = Readonly<{
  root: HTMLElement;
  container: HTMLElement;
  controller: SortableController;
  rows: Map<string, HTMLElement>;
  /** The placeholder, captured from the DOM during the drag. */
  placeholder(): HTMLElement;
  /** The node the library is dragging, as the request reported it. */
  item(): HTMLElement;
  requests: ReorderRequest[];
  errors: unknown[];
  finishes: number;
  cancels: number;
  observations: Observations;
  order(): string;
}>;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

let styled = false;

function installStyle(): void {
  if (styled) {
    return;
  }

  styled = true;

  const style = document.createElement('style');

  style.textContent = `
    .c1-list {
      position: absolute;
      left: ${LIST_LEFT}px;
      top: ${LIST_TOP}px;
      width: 200px;
    }
    .c1-group { display: block; }
    .c1-row { display: block; width: 100px; height: ${ROW_HEIGHT}px; }
  `;
  document.head.append(style);
}

function mount(options: Options): Fixture {
  installStyle();

  const ids = ['a', 'b', 'c'];
  const root = document.createElement('div');

  root.className = 'c1-list';
  root.dataset['name'] = 'root';

  let container: HTMLElement =
    options.nested === true ? document.createElement('div') : root;

  if (container !== root) {
    container.className = 'c1-group';
    container.dataset['name'] = 'group';
    root.append(container);
  }

  const rows = new Map<string, HTMLElement>();

  for (const id of ids) {
    const row = document.createElement('div');

    row.className = 'c1-row';
    row.dataset['id'] = id;
    row.textContent = id;
    container.append(row);
    rows.set(id, row);
  }

  document.body.append(root);

  const requests: ReorderRequest[] = [];
  const errors: unknown[] = [];
  const observations: Observations = {};
  let finishes = 0;
  let cancels = 0;
  let placeholder: HTMLElement | null = null;
  let draggedItem: HTMLElement | null = null;

  const capture = (): HTMLElement => {
    placeholder ??= root.querySelector<HTMLElement>('[data-drag-placeholder]')!;

    return placeholder;
  };

  const run: LandingStart = (context, done) => {
    observations.landingStart = {
      target: context.target,
      placeholder: placementOf(capture()),
    };

    const frame = requestAnimationFrame(() => {
      done();
    });

    return {
      destroy(): void {
        cancelAnimationFrame(frame);
      },
    };
  };

  // Referenced from `onReorder`, which cannot run before the assignment lands.
  const controller = sortable(
    root,
    { items: () => ids.map((id) => rows.get(id)!) },
    y(),
    options.realLanding === undefined
      ? landing({ run })
      : landing({ duration: options.realLanding, easing: 'linear' }),
    {
      onReorder: (request): ReorderResolution => {
        requests.push(request);
        capture();

        // The element the library is dragging, taken from the request rather
        // than from the fixture's map: a commit that destroys item identity
        // replaces the map, and this is the node the library still holds.
        const { item } = request;

        draggedItem = item;

        const order = ids.slice();
        const [moved] = order.splice(request.from, 1);

        order.splice(request.to, 0, moved!);

        options.author({
          container,
          root,
          rows,
          next: order,
          setContainer: (element): void => {
            container = element;
          },
        });

        observations.afterCommit = {
          placeholder: placementOf(capture()),
          libraryItem: placementOf(item),
          dom: [...container.children].map(
            (child) => (child as HTMLElement).dataset['id'] ?? '_',
          ),
          proposalAnchors: {
            before:
              request.before === null ? null : placementOf(request.before),
            after: request.after === null ? null : placementOf(request.after),
          },
        };

        // The imperative shape: the commit is synchronous, so returning is
        // the acknowledgement. **This is what D-41's serial order makes the
        // only shape** — the resolution does not return until the authored
        // DOM is final, so there is nothing left to acknowledge separately.
        // D-44: the collection is a pull source, so the commit is announced
        // rather than handed over. `items()` here maps `ids`, producing a new
        // array identity on every call, which is the structural branch.
        controller.invalidate();

        return ReorderResolution.accept();
      },
      onFinish(): void {
        finishes += 1;
      },
      onCancel(): void {
        cancels += 1;
      },
      onError(error): void {
        errors.push(error);
      },
    },
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return {
    root,
    get container(): HTMLElement {
      return container;
    },
    controller,
    rows,
    placeholder: capture,
    item: () => draggedItem!,
    requests,
    errors,
    get finishes(): number {
      return finishes;
    },
    get cancels(): number {
      return cancels;
    },
    observations,
    order: () =>
      [...container.children]
        .map((child) => (child as HTMLElement).dataset['id'] ?? '_')
        .join(''),
  };
}

/** Everything a case reports once the drag has settled. */
function record(name: string, fixture: Fixture, origin: Box): void {
  dump.push({
    case: name,
    origin,
    request: fixture.requests.map(({ from, to }) => ({ from, to }))[0],
    ...fixture.observations,
    final: {
      order: fixture.order(),
      /** The node the library dragged, wherever the commit left it. */
      libraryItem: placementOf(fixture.item()),
      placeholder: placementOf(fixture.placeholder()),
      placeholdersInDocument: document.querySelectorAll(
        '[data-drag-placeholder]',
      ).length,
    },
    errors: fixture.errors.map(String),
    finishes: fixture.finishes,
    cancels: fixture.cancels,
  });
}

const press = (target: HTMLElement, clientY: number): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: LIST_LEFT + 10,
      clientY,
    }),
  );
};

const pointerEvent = (type: string, clientY: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: LIST_LEFT + 10,
      clientY,
    }),
  );
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const settle = async (): Promise<void> => {
  await nextFrame();
  await nextFrame();
  await nextFrame();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * Drags row 0 into slot 1 and settles. Returns the origin rect the kernel
 * captured — measured here from the same element, one statement before the
 * activating move.
 */
const dragFirstIntoSecond = async (fixture: Fixture): Promise<Box> => {
  const item = fixture.rows.get('a')!;

  press(item, LIST_TOP + 10);

  const origin = boxOf(item);

  pointerEvent('pointermove', LIST_TOP + 30);
  await nextFrame();
  pointerEvent('pointermove', LIST_TOP + 55);
  await nextFrame();
  pointerEvent('pointerup', LIST_TOP + 55);
  await settle();

  return origin;
};

describe('probe C1 — an imperative commit', () => {
  it('case 1: replaceChildren detaches the placeholder', async () => {
    const fixture = mount({
      author: ({ container, rows, next }) => {
        const items = next.map((id) => rows.get(id)!);

        container.replaceChildren(...items);

        return items;
      },
    });

    const origin = await dragFirstIntoSecond(fixture);

    record('1-replaceChildren', fixture, origin);

    const { afterCommit, landingStart } = fixture.observations;

    expect(fixture.order()).toBe('bac');
    // Detached, so `item.parentElement === placeholder.parentElement` fails and
    // the re-anchor never runs — on either measurement.
    expect(afterCommit!.placeholder.connected).toBe(false);
    expect(landingStart!.target).toEqual({ x: -50, y: -100 });
    // `origin + target` is the viewport origin; the row's real slot is (50,140).
    expect(boxOf(fixture.item())).toEqual({ x: 50, y: 140, w: 100, h: 40 });
    // Nothing is classified, and the drop is reported as a clean success.
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
    expect(fixture.cancels).toBe(0);
    expect(document.querySelectorAll('[data-drag-placeholder]')).toHaveLength(
      0,
    );
    // Both frozen neighbours survived the commit, in the container the rows now
    // live in — and the one the placeholder would be inserted *before* already
    // stands at exactly the y the correct landing target has. A repair anchored
    // on the proposal had somewhere to go; the item-relative one did not.
    expect(afterCommit!.proposalAnchors.after!.connected).toBe(true);
    expect(afterCommit!.proposalAnchors.after!.parent).toBe('root');
    expect(afterCommit!.proposalAnchors.after!.box.y).toBe(140);
    expect(afterCommit!.proposalAnchors.before!.connected).toBe(true);
  });

  it('case 2: innerHTML plus a rebuild destroys item identity', async () => {
    const fixture = mount({
      author: ({ container, rows, next }) => {
        container.innerHTML = '';

        const items = next.map((id) => {
          const row = document.createElement('div');

          row.className = 'c1-row';
          row.dataset['id'] = id;
          row.textContent = id;
          container.append(row);
          rows.set(id, row);

          return row;
        });

        return items;
      },
    });

    const origin = await dragFirstIntoSecond(fixture);

    record('2-innerHTML-rebuild', fixture, origin);

    const { afterCommit, landingStart } = fixture.observations;

    expect(fixture.order()).toBe('bac');
    // Both the placeholder and the node the library is dragging are detached.
    expect(afterCommit!.placeholder.connected).toBe(false);
    expect(afterCommit!.libraryItem.connected).toBe(false);
    expect(landingStart!.target).toEqual({ x: -50, y: -100 });
    // The lifted visual is landed onto a node that is no longer in the page.
    expect(boxOf(fixture.item())).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    // The frozen neighbours were destroyed with everything else, so no repair
    // anchored on the proposal could have helped here either.
    expect(afterCommit!.proposalAnchors.after!.connected).toBe(false);
    expect(afterCommit!.proposalAnchors.before!.connected).toBe(false);
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
    expect(fixture.cancels).toBe(0);
  });

  it('case 3: an append loop pushes the placeholder to index 0', async () => {
    const fixture = mount({
      author: ({ container, rows, next }) => {
        const items = next.map((id) => rows.get(id)!);

        // Sketch A's own code. The placeholder is not in `items`, so every
        // append pushes it one slot earlier; it ends at index 0 — still
        // connected, and still in the right container.
        for (const item of items) {
          container.append(item);
        }

        return items;
      },
    });

    const origin = await dragFirstIntoSecond(fixture);

    record('3-append-loop', fixture, origin);

    const { afterCommit, landingStart } = fixture.observations;

    expect(fixture.order()).toBe('bac');
    // The commit left it at the head of the list.
    expect(afterCommit!.placeholder.index).toBe(0);
    expect(afterCommit!.dom).toEqual(['_', 'b', 'a', 'c']);
    // **D-41's win, and it is visible right here.** This used to be
    // provisional — measured before readiness settled, so still at the head at
    // `{ x: 0, y: 0 }` — and only the readiness-time retarget corrected it. The
    // single authoritative measurement lands on the row's final rect the first
    // time: `origin + target` is where the item actually ends up.
    expect(origin.y + landingStart!.target.y).toBe(boxOf(fixture.item()).y);
    expect(boxOf(fixture.item())).toEqual({ x: 50, y: 140, w: 100, h: 40 });
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
  });

  it('case 4: a morphdom-style patch around the placeholder', async () => {
    const fixture = mount({
      author: ({ rows, next }) => {
        const item = rows.get('a')!;
        const b = rows.get('b')!;
        const c = rows.get('c')!;

        // Detach the subset the patch decided has moved, then reinsert it
        // relative to the node that stayed. The placeholder is an unkeyed node
        // the patcher does not know about, so it is neither removed nor used as
        // a reference — it simply ends up at the tail.
        b.remove();
        c.remove();
        item.before(b);
        item.after(c);

        return next.map((id) => rows.get(id)!);
      },
    });

    const origin = await dragFirstIntoSecond(fixture);

    record('4-morphdom-patch', fixture, origin);

    const { afterCommit, landingStart } = fixture.observations;

    expect(fixture.order()).toBe('bac');
    // The patch stranded it at the tail — two slots below where it belongs.
    expect(afterCommit!.dom).toEqual(['b', 'a', 'c', '_']);
    // **D-41.** The single authoritative measurement is taken after the
    // patch has run — the re-anchor from the frozen proposal has already put
    // the placeholder back beside the item — so the first and only target is
    // the row's final rect. This used to read `2 * ROW_HEIGHT`, the stranded
    // tail slot, and be corrected by a readiness-time retarget.
    expect(landingStart!.target).toEqual({ x: 0, y: ROW_HEIGHT });
    expect(origin.y + landingStart!.target.y).toBe(boxOf(fixture.item()).y);
    expect(boxOf(fixture.item())).toEqual({ x: 50, y: 140, w: 100, h: 40 });
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
  });

  it('case 1b: what the user sees while the landing runs', async () => {
    // Case 1 again, with the shipped runner, sampling the lifted row every
    // frame between release and the join. This is the visible form of the
    // number case 1 reports as a target.
    const fixture = mount({
      realLanding: 200,
      author: ({ container, rows, next }) => {
        const items = next.map((id) => rows.get(id)!);

        container.replaceChildren(...items);

        return items;
      },
    });

    const item = fixture.rows.get('a')!;

    press(item, LIST_TOP + 10);
    pointerEvent('pointermove', LIST_TOP + 30);
    await nextFrame();
    pointerEvent('pointermove', LIST_TOP + 55);
    await nextFrame();
    pointerEvent('pointerup', LIST_TOP + 55);

    const trajectory: Box[] = [];

    for (let i = 0; i < 20; i += 1) {
      // Sequential by nature: this samples successive frames.
      // oxlint-disable-next-line no-await-in-loop
      await nextFrame();
      trajectory.push(boxOf(item));
    }

    await settle();

    dump.push({
      case: '1b-visible-trajectory',
      trajectory,
      final: boxOf(item),
      errors: fixture.errors.map(String),
      finishes: fixture.finishes,
    });

    // The row travels the whole way to the viewport origin and then teleports
    // into its slot when the join pins and presentation is released. Bounds
    // rather than exact samples: which frame the landing ends on is scheduling.
    expect(Math.min(...trajectory.map(({ y }) => y))).toBeLessThanOrEqual(12);
    expect(Math.min(...trajectory.map(({ x }) => x))).toBeLessThanOrEqual(4);
    expect(boxOf(item)).toEqual({ x: 50, y: 140, w: 100, h: 40 });
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
  });

  it('case 5: the commit removes the container the placeholder was in', async () => {
    const fixture = mount({
      nested: true,
      author: ({ root, rows, next, setContainer }) => {
        const items = next.map((id) => rows.get(id)!);
        const group = document.createElement('div');

        group.className = 'c1-group';
        group.dataset['name'] = 'group2';
        group.append(...items);
        // The old group — with the placeholder still inside it — leaves the
        // document entirely.
        root.replaceChildren(group);
        setContainer(group);

        return items;
      },
    });

    const origin = await dragFirstIntoSecond(fixture);

    record('5-container-removed', fixture, origin);

    const { afterCommit, landingStart } = fixture.observations;

    expect(fixture.order()).toBe('bac');
    // Still parented — by the container that left the document.
    expect(afterCommit!.placeholder.parent).toBe('group');
    expect(afterCommit!.placeholder.connected).toBe(false);
    expect(afterCommit!.libraryItem.parent).toBe('group2');
    expect(landingStart!.target).toEqual({ x: -50, y: -100 });
    expect(boxOf(fixture.item())).toEqual({ x: 50, y: 140, w: 100, h: 40 });
    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toBe(1);
    // Teardown still reaches into the discarded subtree: no residue.
    expect(fixture.placeholder().parentElement).toBeNull();
    // The frozen neighbours followed the rows into the *new* container, which
    // an anchor-based repair would have followed too.
    expect(afterCommit!.proposalAnchors.after!.parent).toBe('group2');
    expect(afterCommit!.proposalAnchors.before!.parent).toBe('group2');
  });
});

/**
 * **Case 6 — the api-1 residue.**
 *
 * api-1 established the footprint rule `boxPre.height − boxPost.height` on a
 * static fixture with no library code. This checks it during a live drag with
 * `layoutAnimation()` installed and transforming the same elements. `box()` does
 * not exist in the current API, so it is modelled: `{ visual:  }` resolves to a
 * descendant `.c6-card` of the item, and the item element itself is the wrapper
 * this test measures by hand. This is layout arithmetic, not a library feature.
 */
describe('probe C1 — the api-1 footprint rule under a live drag', () => {
  const ROW_H = 60;
  const CARD_H = 60;
  const ASIDE_H = 30;

  let c6Styled = false;

  const installC6Style = (): void => {
    if (c6Styled) {
      return;
    }

    c6Styled = true;

    const style = document.createElement('style');

    style.textContent = `
      .c6-list {
        position: absolute;
        left: ${LIST_LEFT}px;
        top: ${LIST_TOP}px;
        width: 200px;
        display: flex;
        flex-direction: column;
      }
      .c6-row { display: flex; }
      .c6-card { width: 100px; height: ${CARD_H}px; background: #cfc; }
      .c6-aside { width: 80px; height: ${ASIDE_H}px; background: #fcc; }
    `;
    document.head.append(style);
  };

  it('should keep boxPre − boxPost correct while displacements are in flight', async () => {
    installC6Style();

    const root = document.createElement('div');

    root.className = 'c6-list';

    const rows: HTMLElement[] = [];

    for (const id of ['a', 'b', 'c']) {
      const row = document.createElement('div');

      row.className = 'c6-row';
      row.dataset['id'] = id;
      row.innerHTML = '<div class="c6-card"></div><div class="c6-aside"></div>';
      root.append(row);
      rows.push(row);
    }

    document.body.append(root);

    const errors: unknown[] = [];
    const landingTargets: Point[] = [];
    const run: LandingStart = (context, done) => {
      landingTargets.push(context.target);

      const frame = requestAnimationFrame(() => {
        done();
      });

      return {
        destroy(): void {
          cancelAnimationFrame(frame);
        },
      };
    };

    const controller = sortable(
      root,
      { items: () => rows },
      y(),
      { visual: (item) => item.querySelector<HTMLElement>('.c6-card')! },
      // Long enough that every displacement is still in flight when the
      // measurements below are taken.
      layoutAnimation({ duration: 4000, easing: 'linear' }),
      landing({ run }),
      {
        onReorder: (): ReorderResolution => ReorderResolution.accept(),
        onError(error): void {
          errors.push(error);
        },
      },
    );

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};

    cleanup.push(() => {
      void controller.destroy();
      root.remove();
    });

    const [a, b] = rows as [HTMLElement, HTMLElement, HTMLElement];
    const card = a.querySelector<HTMLElement>('.c6-card')!;
    const listBefore = boxOf(root);

    press(card, LIST_TOP + 10);

    // The pre-lift wrapper read, taken where `src/kernel/kernel.ts:899`
    // already measures the visual.
    const boxPre = boxOf(a);

    pointerEvent('pointermove', LIST_TOP + 30);
    await nextFrame();

    // The post-lift wrapper read, taken where `src/sortable/placement.ts:64-65`
    // already measures the visual's offset box.
    const boxPost = boxOf(a);
    const placeholder = root.querySelector<HTMLElement>(
      '[data-drag-placeholder]',
    )!;
    const afterLift = {
      boxPre,
      boxPost,
      difference: boxPre.h - boxPost.h,
      placeholder: boxOf(placeholder),
      cardOffsetHeight: card.offsetHeight,
      listBefore,
      listDuring: boxOf(root),
    };

    // Cross b's midpoint so the placeholder moves past it and `layoutAnimation`
    // starts a 4s displacement on b.
    pointerEvent('pointermove', LIST_TOP + 125);
    await nextFrame();

    const inFlight = {
      order: [...root.children].map(
        (child) => (child as HTMLElement).dataset['id'] ?? '_',
      ),
      animations: b.getAnimations().length,
      bRect: boxOf(b),
      // The untransformed layout position of the same wrapper.
      bLayoutTop: LIST_TOP + b.offsetTop,
      bOffsetHeight: b.offsetHeight,
      // The dragged item's wrapper, re-read while a displacement is running.
      draggedBox: boxOf(a),
    };

    pointerEvent('pointerup', LIST_TOP + 125);
    await settle();

    // The only remaining route to a corrupted `boxPre`: re-grab a row the
    // previous drag displaced, while its 4s translate would still be running.
    const bCard = b.querySelector<HTMLElement>('.c6-card')!;
    const regrabAnimations = b.getAnimations().length;

    press(bCard, LIST_TOP + 70);

    const regrabPre = boxOf(b);

    pointerEvent('pointermove', LIST_TOP + 90);
    await nextFrame();

    const regrabPost = boxOf(b);

    controller.cancel();
    await settle();

    dump.push({
      case: '6-footprint-under-layout-animation',
      regrab: {
        animationsBeforeRegrab: regrabAnimations,
        boxPre: regrabPre,
        boxPost: regrabPost,
        difference: regrabPre.h - regrabPost.h,
        layoutTop: LIST_TOP + b.offsetTop,
      },
      afterLift,
      inFlight,
      afterRelease: {
        animationsOnB: b.getAnimations().length,
        order: [...root.children].map(
          (child) => (child as HTMLElement).dataset['id'] ?? '_',
        ),
        bRect: boxOf(b),
        bLayoutTop: LIST_TOP + b.offsetTop,
        listAfter: boxOf(root),
      },
      landingTargets,
      errors: errors.map(String),
    });

    expect(errors).toEqual([]);
    // api-1's L-1, reproduced live: the difference rule is the correct
    // footprint, and neither `box` nor `visual` height is.
    expect(boxPre.h).toBe(ROW_H);
    expect(boxPost.h).toBe(ASIDE_H);
    expect(boxPre.h - boxPost.h).toBe(30);
    // What the library actually sizes the placeholder from, and the 30px of
    // spurious list height that follows from it.
    expect(afterLift.placeholder.h).toBe(CARD_H);
    expect(afterLift.listBefore.h).toBe(180);
    expect(afterLift.listDuring.h).toBe(210);
    // A running `layoutAnimation()` translate offsets the wrapper's *top* by
    // the full in-flight delta and leaves its *height* untouched.
    expect(inFlight.animations).toBe(1);
    expect(inFlight.bRect.y - inFlight.bLayoutTop).toBe(60);
    expect(inFlight.bRect.h).toBe(inFlight.bOffsetHeight);
    // The dragged item is never animated, so its own two reads are clean.
    expect(inFlight.draggedBox.h).toBe(ASIDE_H);
    // No offset survives the operation, so no later grab can inherit one.
    expect(regrabAnimations).toBe(0);
    expect(regrabPre.y).toBe(LIST_TOP + 60);
    expect(regrabPre.h - regrabPost.h).toBe(30);
  });
});
