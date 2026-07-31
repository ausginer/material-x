/**
 * A minimal React fixture for observing what reconciliation does to an
 * imperatively inserted, unmanaged sibling living inside a React-owned keyed
 * list.
 *
 * The fixture deliberately mirrors the sortable engine's shape rather than the
 * engine itself:
 *
 * - the dragged item is *lifted*, not removed — the engine promotes it with a
 *   manual popover and `position: fixed`, so it stays a React-owned child while
 *   leaving normal flow (see `kernel/presentation.ts`);
 * - the placeholder is an unmanaged element inserted with `item.after(...)` and
 *   later repositioned with `reference.before(...)`, exactly as the
 *   committed-insertion effect does;
 * - the readiness point is a `useLayoutEffect`, which is what the React
 *   integration in `sortable.stories.tsx` uses to resolve `presentationReady`.
 *
 * JSX is intentionally avoided: the drag package's browser project builds with
 * `createCoreViteConfig`, which carries no React plugin.
 */
import {
  createElement,
  StrictMode,
  useLayoutEffect,
  useState,
  type ReactElement,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';

/** Label used for the unmanaged placeholder in an observed DOM order. */
export const PLACEHOLDER = '[ph]';

/** One React-owned list entry. `height` drives the flow geometry. */
export type Item = Readonly<{
  id: string;
  height: number;
}>;

/** A `getBoundingClientRect()` reading reduced to the fields under test. */
export type Rect = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
}>;

/** Everything the probe can see about the list at one instant. */
export type Observation = Readonly<{
  /** DOM child order of the list root, placeholder included. */
  order: readonly string[];
  /** The same order minus lifted items — i.e. what actually occupies flow. */
  flow: readonly string[];
  /** Whether the placeholder is still attached. */
  connected: boolean;
  /** `data-id` of the placeholder's `previousSibling`, if any. */
  previousSibling: string | null;
  /** `data-id` of the placeholder's `nextSibling`, if any. */
  nextSibling: string | null;
  /** Viewport rect of the placeholder, or `null` when detached. */
  placeholder: Rect | null;
  /** Viewport rect of every React-owned item, by id. */
  items: ReadonlyMap<string, Rect>;
}>;

/** The sampling points around one React state commit. */
export type CommitRecord = Readonly<{
  /** Immediately before the state update is scheduled. */
  before: Observation;
  /** Inside `useLayoutEffect` — the drag protocol's readiness point. */
  layout: Observation;
  /**
   * Inside the same layout effect, after re-anchoring the placeholder to the
   * lifted item. `null` when {@link CommitOptions.repair} was not requested.
   */
  repaired: Observation | null;
  /** After the next paint, to catch anything that settles late. */
  after: Observation;
}>;

export type CommitOptions = Readonly<{
  /**
   * Re-anchor the placeholder immediately before this (lifted) item at the
   * readiness point, still inside the layout effect.
   */
  repair?: string;
}>;

export type ProbeOptions = Readonly<{
  items: readonly Item[];
  /** Wrap the list in `<StrictMode>`. */
  strict?: boolean;
  /**
   * Reuse the same React element objects across renders instead of creating
   * fresh ones. Only valid while item heights are stable.
   */
  reuse?: boolean;
}>;

export type Probe = Readonly<{
  /** The React-owned list root (`<div ref={root}>` in the brief). */
  root: HTMLElement;
  /** The unmanaged placeholder element. */
  placeholder: HTMLElement;
  /** Promotes an item out of flow the way a lift does. */
  lift(id: string): void;
  /** Inserts the placeholder directly after `id`, as the engine's grab does. */
  insertAfter(id: string): void;
  /**
   * Repositions the placeholder before `id`, or appends it when `id` is `null`
   * — the committed-insertion effect's only two moves.
   */
  moveBefore(id: string | null): void;
  observe(): Observation;
  /** Commits a new keyed order and samples around React's reconciliation. */
  commit(
    items: readonly Item[],
    options?: CommitOptions,
  ): Promise<CommitRecord>;
  /** Releases the presentation: drops the placeholder and un-lifts the item. */
  drop(id: string): Observation;
  destroy(): void;
}>;

type Handle = {
  root: HTMLElement | null;
  setItems: ((items: readonly Item[]) => void) | null;
  onCommit: (() => void) | null;
  reuse: boolean;
  elements: Map<string, ReactElement>;
};

const STYLE_ID = 'react-probe-style';

const STYLE_TEXT = `
.react-probe { position: absolute; top: 0; left: 0; width: 240px; }
.react-probe-item,
.react-probe-placeholder { box-sizing: border-box; width: 100%; }
.react-probe-item { border: 1px solid #333; }
.react-probe-placeholder { border: 2px dashed #6750a4; }
`;

function ensureStyle(): void {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.append(style);
  }
}

function renderItem(handle: Handle, item: Item): ReactElement {
  if (handle.reuse) {
    const cached = handle.elements.get(item.id);

    if (cached) {
      return cached;
    }
  }

  const element = createElement(
    'div',
    {
      key: item.id,
      'data-id': item.id,
      className: 'react-probe-item',
      style: { height: `${item.height}px` },
    },
    item.id,
  );

  handle.elements.set(item.id, element);
  return element;
}

type ProbeListProps = Readonly<{
  handle: Handle;
  initial: readonly Item[];
}>;

function ProbeList({ handle, initial }: ProbeListProps): ReactElement {
  const [items, setItems] = useState(initial);

  // Assigning during render keeps the setter reachable from the imperative
  // side before any effect has run; the setter identity is stable, so the
  // repeated write (including StrictMode's double render) is a no-op.
  handle.setItems = setItems;

  // The readiness point: React has written the DOM, the browser has not
  // painted. This is where `presentationReady` resolves in the real adapter.
  useLayoutEffect(() => {
    handle.onCommit?.();
  });

  return createElement(
    'div',
    {
      className: 'react-probe',
      ref: (element: HTMLElement | null) => {
        handle.root = element;
      },
    },
    items.map((item) => renderItem(handle, item)),
  );
}

function readRect(element: Element): Rect {
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

function isLifted(element: Element): boolean {
  return (element as HTMLElement).dataset['lifted'] != null;
}

function label(element: Element, placeholder: HTMLElement): string {
  return element === placeholder
    ? PLACEHOLDER
    : ((element as HTMLElement).dataset['id'] ?? '?');
}

function observeList(root: HTMLElement, placeholder: HTMLElement): Observation {
  const children = [...root.children];
  const order: string[] = [];
  const flow: string[] = [];
  const items = new Map<string, Rect>();

  for (const child of children) {
    const name = label(child, placeholder);
    order.push(name);

    if (!isLifted(child)) {
      flow.push(name);
    }

    if (child !== placeholder) {
      items.set(name, readRect(child));
    }
  }

  const connected = placeholder.parentNode === root;

  return {
    order,
    flow,
    connected,
    previousSibling:
      connected && placeholder.previousElementSibling
        ? label(placeholder.previousElementSibling, placeholder)
        : null,
    nextSibling:
      connected && placeholder.nextElementSibling
        ? label(placeholder.nextElementSibling, placeholder)
        : null,
    placeholder: placeholder.isConnected ? readRect(placeholder) : null,
    items,
  };
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/** Mounts the fixture and resolves once the first render has been committed. */
export async function mountProbe(options: ProbeOptions): Promise<Probe> {
  ensureStyle();

  const handle: Handle = {
    root: null,
    setItems: null,
    onCommit: null,
    reuse: options.reuse === true,
    elements: new Map(),
  };

  const container = document.createElement('div');
  document.body.append(container);

  const reactRoot: Root = createRoot(container);
  const mounted = new Promise<void>((resolve) => {
    handle.onCommit = () => {
      handle.onCommit = null;
      resolve();
    };
  });

  const tree = createElement(ProbeList, {
    handle,
    initial: options.items,
  });

  reactRoot.render(
    options.strict === true ? createElement(StrictMode, null, tree) : tree,
  );

  await mounted;

  const root = handle.root!;
  const placeholder = document.createElement('div');
  placeholder.className = 'react-probe-placeholder';
  placeholder.dataset['dragPlaceholder'] = '';
  placeholder.setAttribute('aria-hidden', 'true');

  const item = (id: string): HTMLElement =>
    root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;

  return {
    root,
    placeholder,

    lift(id) {
      // The engine keeps the element a React child and only takes it out of
      // flow; `position: fixed` at its own rect reproduces that without the
      // top-layer machinery, which plays no part in reconciliation.
      const element = item(id);
      const rect = element.getBoundingClientRect();
      element.dataset['lifted'] = '';
      element.style.position = 'fixed';
      element.style.top = `${rect.top}px`;
      element.style.left = `${rect.left}px`;
      element.style.width = `${rect.width}px`;
    },

    insertAfter(id) {
      const element = item(id);
      placeholder.style.height = `${element.offsetHeight}px`;
      element.after(placeholder);
    },

    moveBefore(id) {
      if (id === null) {
        root.append(placeholder);
      } else {
        item(id).before(placeholder);
      }
    },

    observe() {
      return observeList(root, placeholder);
    },

    async commit(items, options) {
      const before = observeList(root, placeholder);
      let layout!: Observation;
      let repaired: Observation | null = null;

      const committed = new Promise<void>((resolve) => {
        handle.onCommit = () => {
          handle.onCommit = null;
          const listRoot = handle.root!;
          layout = observeList(listRoot, placeholder);

          if (options?.repair != null) {
            // Still inside the layout effect: React has written the authored
            // DOM, the browser has not painted.
            listRoot
              .querySelector<HTMLElement>(`[data-id="${options.repair}"]`)!
              .before(placeholder);
            repaired = observeList(listRoot, placeholder);
          }

          resolve();
        };
      });

      handle.setItems!(items);
      await committed;
      await nextPaint();

      return {
        before,
        layout,
        repaired,
        after: observeList(handle.root!, placeholder),
      };
    },

    drop(id) {
      placeholder.remove();

      const element = item(id);
      delete element.dataset['lifted'];
      element.style.position = '';
      element.style.top = '';
      element.style.left = '';
      element.style.width = '';

      return observeList(root, placeholder);
    },

    destroy() {
      placeholder.remove();
      reactRoot.unmount();
      container.remove();
    },
  };
}

/** Builds a uniform-height item list from ids. */
export function items(ids: readonly string[], height = 40): readonly Item[] {
  return ids.map((id) => ({ id, height }));
}
