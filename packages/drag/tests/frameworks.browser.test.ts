/**
 * A consumer whose framework commits a reorder on its own schedule: React, with the
 * verdict resolved from a real `useLayoutEffect`, and a keyed reconciler that writes
 * the whole list with `replaceChildren`.
 */
import {
  createElement,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { landing } from '../src/sortable/landing.ts';
import { y } from '../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableController,
  type SortableResult,
} from '../src/sortable.ts';
import {
  commands,
  faultMessages,
  frames,
  grab,
  onCleanup,
  release,
  wait,
} from './support/harness.ts';

type Commit = Readonly<{
  rows: readonly string[];
  banner?: boolean;
  /** Runs after the layout effect has committed this state. */
  committed?(): void;
}>;

type ReactFixture = Readonly<{
  list: HTMLElement;
  commit(next: Commit): void;
  order(): string[];
  results: SortableResult[];
  controller(): SortableController;
  /** The `onReorder` handed to the sortable, which the test replaces. */
  setOnReorder(
    handler: (from: number, to: number) => Promise<ReorderResolution>,
  ): void;
  rows(): readonly string[];
}>;

function mountReact(initial: readonly string[]): ReactFixture {
  const host = document.createElement('div');

  document.body.append(host);

  let setCommit: (next: Commit) => void = () => {};
  let current: Commit = { rows: initial };

  const App = (): ReactNode => {
    const [commit, set] = useState<Commit>(current);

    setCommit = set;
    current = commit;
    useLayoutEffect(() => {
      commit.committed?.();
    }, [commit]);

    return createElement(
      'div',
      { id: 'list', style: { width: 200 } },
      commit.banner
        ? createElement(
            'div',
            { key: 'banner', id: 'banner', style: { height: 40 } },
            'banner',
          )
        : null,
      commit.rows.map((id) =>
        createElement(
          'div',
          {
            key: id,
            id,
            className: 'row',
            style: { height: 40, touchAction: 'none', userSelect: 'none' },
          },
          id,
        ),
      ),
    );
  };

  const root = createRoot(host);

  flushSync(() => {
    root.render(createElement(App));
  });

  const list = host.querySelector<HTMLElement>('#list')!;
  const results: SortableResult[] = [];
  let onReorder: (
    from: number,
    to: number,
  ) => Promise<ReorderResolution> = () =>
    Promise.resolve(ReorderResolution.accept());
  const controller = sortable(list, {
    items: () => [...list.querySelectorAll<HTMLElement>('.row')],
    axis: y(),
    landing: landing({ duration: 100 }),
    onReorder: ({ from, to }) => onReorder(from, to),
    onEnd(result) {
      results.push(result);
    },
  });

  onCleanup(async () => {
    await controller.requestDestroy();
    root.unmount();
  });

  return {
    list,
    commit(next) {
      flushSync(() => {
        setCommit(next);
      });
    },
    order: () =>
      [...list.querySelectorAll('.row')].map((element) => element.id),
    results,
    controller: () => controller,
    setOnReorder(handler) {
      onReorder = handler;
    },
    rows: () => current.rows,
  };
}

const reordered = (
  rows: readonly string[],
  from: number,
  to: number,
): string[] => {
  const next = [...rows];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved!);
  return next;
};

describe('a React consumer', () => {
  it('should resolve the verdict from a real layout effect', async () => {
    const fixture = mountReact(['a', 'b', 'c', 'd']);

    fixture.setOnReorder(
      (from, to) =>
        new Promise((resolve) => {
          // A later task, on React's schedule rather than inside the drop.
          setTimeout(() => {
            fixture.commit({
              rows: reordered(fixture.rows(), from, to),
              committed() {
                resolve(ReorderResolution.accept());
              },
            });
          });
        }),
    );
    await grab('#a', 0, 90);
    await commands.pointerUp();
    await wait(30);
    await frames();
    expect(fixture.order()).toEqual(['b', 'c', 'a', 'd']);
    expect(fixture.results[0]?.type).toBe('accepted');
    expect(fixture.list.querySelector('[data-drag-placeholder]')).toBeNull();
  });

  it('should keep the placeholder in place until the commit lands', async () => {
    const fixture = mountReact(['a', 'b', 'c']);
    let finish: (() => void) | null = null;

    fixture.setOnReorder(
      (from, to) =>
        new Promise((resolve) => {
          finish = () => {
            fixture.commit({
              rows: reordered(fixture.rows(), from, to),
              committed() {
                resolve(ReorderResolution.accept());
              },
            });
          };
        }),
    );
    await grab('#a', 0, 50);
    await commands.pointerUp();
    await frames();
    expect(
      fixture.list.querySelector('[data-drag-placeholder]'),
    ).not.toBeNull();
    finish!();
    await wait(0);
    await frames();
    expect(fixture.list.querySelector('[data-drag-placeholder]')).toBeNull();
    expect(fixture.results[0]?.type).toBe('accepted');
  });

  it('should accept a commit that inserts content above the placeholder', async () => {
    const fixture = mountReact(['a', 'b', 'c']);

    fixture.setOnReorder(
      (from, to) =>
        new Promise((resolve) => {
          fixture.commit({
            rows: reordered(fixture.rows(), from, to),
            banner: true,
            committed() {
              resolve(ReorderResolution.accept());
            },
          });
        }),
    );
    await grab('#b', 0, 45);
    await release();
    expect(fixture.results[0]?.type).toBe('accepted');
    expect(document.querySelector('#banner')).not.toBeNull();
    expect(fixture.order()).toEqual(['a', 'c', 'b']);
  });

  it('should accept a commit that mounts a new keyed row into the gap', async () => {
    const fixture = mountReact(['a', 'b', 'c']);

    fixture.setOnReorder(
      (from, to) =>
        new Promise((resolve) => {
          const rows = reordered(fixture.rows(), from, to);

          rows.splice(to, 0, 'new');
          fixture.commit({
            rows,
            committed() {
              resolve(ReorderResolution.accept());
            },
          });
        }),
    );
    await grab('#a', 0, 50);
    await release();
    expect(fixture.results[0]?.type).toBe('accepted');
    expect(fixture.order()).toEqual(['b', 'new', 'a', 'c']);
  });

  it('should see a list the framework rerendered during a press', async () => {
    const fixture = mountReact(['a', 'b', 'c']);
    const start = document.querySelector('#b')!.getBoundingClientRect();

    await commands.pointerMove(start.left + 20, start.top + 20);
    await commands.pointerDown();
    fixture.commit({ rows: ['z', 'a', 'b', 'c'] });
    await commands.pointerMove(start.left + 20, start.top + 40, 3);
    await frames();
    await release();
    expect(['accepted', 'noop']).toContain(fixture.results[0]?.type);
    expect(faultMessages()).toEqual([]);
  });

  it('should finish, report and stay usable when the commit unmounts the dragged item', async () => {
    const fixture = mountReact(['a', 'b', 'c']);

    fixture.setOnReorder(
      () =>
        new Promise((resolve) => {
          fixture.commit({
            rows: fixture.rows().filter((id) => id !== 'a'),
            committed() {
              resolve(ReorderResolution.accept());
            },
          });
        }),
    );
    await grab('#a', 0, 50);
    await release();
    expect(fixture.results[0]?.type).toBe('accepted');
    expect(faultMessages()).toEqual(['sortable/landing-placeholder-lost']);
    expect(fixture.list.querySelector('[data-drag-placeholder]')).toBeNull();

    fixture.setOnReorder(() => Promise.resolve(ReorderResolution.reject('no')));
    await grab('#b', 0, 45);
    await release();
    expect(fixture.results[1]?.type).toBe('rejected');
  });

  it('should deliver no callback during an unmount', async () => {
    const fixture = mountReact(['a', 'b', 'c']);

    await grab('#a', 0, 50);
    await fixture.controller().requestDestroy();
    expect(fixture.results).toEqual([]);
    expect(fixture.list.querySelector('[data-drag-placeholder]')).toBeNull();
  });
});

describe('a keyed reconciler that rewrites the whole list', () => {
  /** Keeps the rows it owns and appends them all, in order. */
  function reconcile(list: HTMLElement, ids: readonly string[]): void {
    const byId = new Map(
      [...list.children].map((element) => [element.id, element]),
    );

    list.replaceChildren(...ids.map((id) => byId.get(id)!));
  }

  function mountList(): HTMLElement {
    const list = document.createElement('div');

    list.style.cssText = 'width:200px';

    for (const id of ['a', 'b', 'c', 'd']) {
      const row = document.createElement('div');

      row.id = id;
      row.tabIndex = 0;
      row.style.cssText = 'height:40px;touch-action:none;user-select:none';
      list.append(row);
    }

    document.body.append(list);
    return list;
  }

  it('should survive a commit that removes the placeholder with everything else', async () => {
    const list = mountList();
    const results: SortableResult[] = [];
    let ids = ['a', 'b', 'c', 'd'];
    const controller = sortable(list, {
      items: () => ids.map((id) => list.querySelector<HTMLElement>(`#${id}`)!),
      axis: y(),
      onReorder({ from, to }) {
        ids = reordered(ids, from, to);
        reconcile(list, ids);
        return ReorderResolution.accept();
      },
      onEnd(result) {
        results.push(result);
      },
    });

    onCleanup(() => controller.requestDestroy());
    await grab('#a', 0, 90);
    await release();
    expect(results[0]?.type).toBe('accepted');
    expect([...list.children].map((element) => element.id)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);

    await grab('#c', 0, 45);
    await release();
    expect(results[1]?.type).toBe('accepted');
    expect(faultMessages()).toEqual([]);
  });

  it('should keep keyboard focus through a rewrite', async () => {
    const list = mountList();
    let ids = ['a', 'b', 'c', 'd'];
    const controller = sortable(list, {
      items: () => ids.map((id) => list.querySelector<HTMLElement>(`#${id}`)!),
      axis: y(),
      onReorder({ from, to }) {
        ids = reordered(ids, from, to);
        reconcile(list, ids);
        return ReorderResolution.accept();
      },
    });

    onCleanup(() => controller.requestDestroy());
    document.querySelector<HTMLElement>('#a')!.focus();
    await commands.keyPress('ArrowDown');
    await commands.keyPress('ArrowDown');
    await frames();
    expect(ids).toEqual(['b', 'c', 'a', 'd']);
    expect(document.activeElement?.id).toBe('a');
  });
});
