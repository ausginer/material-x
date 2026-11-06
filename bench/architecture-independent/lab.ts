/**
 * Page-side fixtures for probe.ts: a list, a live-reorder control, consumer
 * callbacks that misbehave on demand, and a position sampler.
 */
import {
  movable,
  slide,
  sortable,
  type Callbacks,
  type Controller,
  type Motion,
  type Outcome,
} from './drag.ts';

export { movable, slide, sortable };

export type ListSpec = Readonly<{
  count: number;
  heights?: readonly number[];
  /** Per-item bottom margins, for layouts that break the uniform-gap assumption. */
  margins?: readonly number[];
  display?: 'flex' | 'block';
  scroller?: boolean;
  /** Consumer styling that makes every item positioned. */
  positioned?: boolean;
  touchAction?: string;
  button?: boolean;
  link?: boolean;
}>;

export function mountList(spec: ListSpec): HTMLElement {
  const display = spec.display ?? 'flex';
  const list = document.createElement('ul');
  list.id = 'list';
  Object.assign(list.style, {
    display,
    flexDirection: 'column',
    gap: display === 'flex' ? '8px' : '0',
    listStyle: 'none',
    margin: '0',
    padding: '0',
  });
  for (let k = 0; k < spec.count; k += 1) {
    const item = document.createElement('li');
    item.dataset['k'] = String(k);
    item.tabIndex = 0;
    Object.assign(item.style, {
      height: `${spec.heights?.[k] ?? 60}px`,
      background: `hsl(${k * 37} 60% 70%)`,
      touchAction: spec.touchAction ?? 'none',
      marginBottom:
        spec.margins?.[k] === undefined ? '' : `${spec.margins[k]}px`,
      boxSizing: 'border-box',
      position: spec.positioned ? 'relative' : '',
    });
    if (display === 'block' && !spec.margins) {
      item.style.marginBottom = '8px';
    }
    if (spec.button) {
      const button = document.createElement('button');
      button.textContent = `action ${k}`;
      button.addEventListener('click', () => {
        log.clicks += 1;
      });
      item.append(button);
    }
    if (spec.link) {
      const link = document.createElement('a');
      link.href = '#x';
      link.textContent = 'link';
      item.append(link);
    }
    list.append(item);
  }
  list.addEventListener('click', () => {
    log.listClicks += 1;
  });
  if (spec.scroller) {
    const scroller = document.createElement('div');
    scroller.id = 'scroller';
    Object.assign(scroller.style, {
      height: '400px',
      overflow: 'auto',
      position: 'relative',
    });
    scroller.append(list);
    document.body.append(scroller);
  } else {
    document.body.append(list);
  }
  return list;
}

export function order(): string {
  return [...document.querySelectorAll<HTMLElement>('#list > li')]
    .map((item) => item.dataset['k'])
    .join('');
}

export function items(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('#list > li')];
}

export function item(k: number): HTMLElement {
  return document.querySelector<HTMLElement>(`#list > li[data-k="${k}"]`)!;
}

export function rectOf(k: number): Readonly<{
  top: number;
  bottom: number;
  x: number;
  y: number;
}> {
  const rect = item(k).getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.bottom,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export const log = {
  starts: 0,
  changes: 0,
  decides: 0,
  ends: [] as Outcome[],
  errors: 0,
  rejections: 0,
  aborts: 0,
  clicks: 0,
  listClicks: 0,
  moves: 0,
  last: undefined as unknown,
  tailsAtEnd: -1,
};

addEventListener('error', (event) => {
  event.preventDefault();
  log.errors += 1;
});
addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  log.rejections += 1;
});
document.addEventListener(
  'pointermove',
  () => {
    log.moves += 1;
  },
  { capture: true, passive: true },
);

export type Spec = {
  at: string;
  action: string;
  verdict: boolean;
  pending: boolean;
};

let settlers:
  | Readonly<{
      resolve(value: boolean): void;
      reject(error: unknown): void;
    }>
  | undefined;

export function settle(how: 'true' | 'false' | 'reject'): void {
  if (how === 'reject') {
    settlers?.reject(new Error('verdict failed'));
  } else {
    settlers?.resolve(how === 'true');
  }
  settlers = undefined;
}

export let controller: Controller;

/** Builds callbacks performing `spec.action` from the callback `spec.at`, once. */
export function misbehaving<Value>(spec: Spec): Callbacks<Value> {
  const act = (hook: string) => {
    if (hook !== spec.at) {
      return;
    }
    spec.at = '';
    switch (spec.action) {
      case 'cancel':
        controller.cancel();
        break;
      case 'destroy':
        controller.destroy();
        break;
      case 'throw':
        throw new Error('boom');
      case 'cancel+throw':
        controller.cancel();
        throw new Error('boom');
      case 'destroy+throw':
        controller.destroy();
        throw new Error('boom');
      default:
    }
  };
  return {
    onStart() {
      log.starts += 1;
      act('onStart');
    },
    onChange() {
      log.changes += 1;
      act('onChange');
    },
    decide(_value, signal) {
      log.decides += 1;
      signal.addEventListener('abort', () => {
        log.aborts += 1;
      });
      act('decide');
      if (spec.pending) {
        return new Promise<boolean>((resolve, reject) => {
          settlers = { resolve, reject };
        });
      }
      return spec.verdict;
    },
    onEnd(outcome) {
      log.ends.push(outcome);
      act('onEnd');
    },
  };
}

function motion(duration: number): Motion | undefined {
  return duration > 0 ? slide({ duration, easing: 'linear' }) : undefined;
}

export function mountSort(list: ListSpec, spec: Spec, duration: number): void {
  const element = mountList(list);
  controller = sortable(element, {
    ...misbehaving(spec),
    landing: motion(duration),
    neighbors: motion(duration),
  });
}

export function mountFree(spec: Spec, duration: number): void {
  const element = document.createElement('div');
  element.id = 'free';
  Object.assign(element.style, {
    position: 'absolute',
    left: '100px',
    top: '100px',
    width: '80px',
    height: '80px',
    background: 'tomato',
    touchAction: 'none',
  });
  document.body.append(element);
  controller = movable(element, {
    ...misbehaving(spec),
    landing: motion(duration),
  });
}

/** Reorders live on each crossing: the alternative the model rejects, tuned fairly. */
export function liveReorder(list: HTMLElement): void {
  let dragged: HTMLElement | undefined;
  let startY = 0;
  let startCentre = 0;
  let naturalCentre = 0;
  let step = 0;
  let lostCapture = 0;
  list.addEventListener('pointerdown', (event) => {
    dragged = (event.target as HTMLElement).closest('li') as HTMLElement;
    const rect = dragged.getBoundingClientRect();
    startY = event.clientY;
    startCentre = naturalCentre = rect.top + rect.height / 2;
    step = rect.height + 8;
    dragged.setPointerCapture(event.pointerId);
  });
  document.addEventListener(
    'pointermove',
    (event) => {
      if (!dragged) {
        return;
      }
      const centre = startCentre + event.clientY - startY;
      const next = dragged.nextElementSibling;
      const previous = dragged.previousElementSibling;
      if (next) {
        const rect = next.getBoundingClientRect();
        if (centre > rect.top + rect.height / 2) {
          // Moving the neighbour keeps the dragged node, and its capture, attached.
          dragged.before(next);
          naturalCentre += step;
        }
      }
      if (previous) {
        const rect = previous.getBoundingClientRect();
        if (centre < rect.top + rect.height / 2) {
          dragged.after(previous);
          naturalCentre -= step;
          lostCapture += dragged.hasPointerCapture(event.pointerId) ? 0 : 1;
        }
      }
      dragged.style.translate = `0px ${centre - naturalCentre}px`;
    },
    { capture: true, passive: true },
  );
  document.addEventListener('pointerup', () => {
    if (dragged) {
      dragged.style.translate = '';
      dragged = undefined;
      log.last = lostCapture;
    }
  });
}

export type Sample = Readonly<{ t: number; tops: readonly number[] }>;

const samples: Sample[] = [];
let sampling = false;

export function startSampling(keys: readonly number[]): void {
  samples.length = 0;
  sampling = true;
  const elements = keys.map(item);
  const tick = (t: number) => {
    if (sampling) {
      samples.push({
        t,
        tops: elements.map((element) => element.getBoundingClientRect().top),
      });
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export function stopSampling(): readonly Sample[] {
  sampling = false;
  return samples;
}

export function frames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const tick = (remaining: number) => {
      if (remaining === 0) {
        resolve();
      } else {
        requestAnimationFrame(() => {
          tick(remaining - 1);
        });
      }
    };
    tick(count);
  });
}

/** Seeded random consumer for the model-based fuzz. */
export function mountFuzz(seed: number, duration: number): void {
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const fuzz = {
    reference: [] as string[],
    expectedErrors: 0,
    active: 0,
    destroyed: false,
    pending: false,
  };
  const misbehave = (): void => {
    const roll = random();
    if (roll < 0.04) {
      controller.cancel();
    } else if (roll < 0.06) {
      controller.destroy();
    } else if (roll < 0.09) {
      fuzz.expectedErrors += 1;
      throw new Error('fuzz');
    }
  };
  const mount = () => {
    document.querySelector('#list')?.remove();
    const list = mountList({ count: 6 });
    fuzz.reference = items().map((element) => element.dataset['k']!);
    fuzz.active = 0;
    fuzz.pending = false;
    fuzz.destroyed = false;
    controller = sortable(list, {
      landing: motion(duration),
      neighbors: motion(duration),
      onStart() {
        fuzz.active += 1;
        misbehave();
      },
      onChange() {
        misbehave();
      },
      decide() {
        misbehave();
        const roll = random();
        if (roll < 0.4) {
          return true;
        }
        if (roll < 0.6) {
          return false;
        }
        fuzz.pending = true;
        return new Promise<boolean>((resolve, reject) => {
          settlers = { resolve, reject };
        });
      },
      onEnd(outcome, value) {
        fuzz.active -= 1;
        fuzz.pending = false;
        if (outcome === 'accepted') {
          const [moved] = fuzz.reference.splice(value.from, 1);
          fuzz.reference.splice(value.to, 0, moved!);
        }
        misbehave();
      },
    });
    const { destroy } = controller;
    controller = {
      cancel: controller.cancel,
      destroy() {
        fuzz.destroyed = true;
        destroy();
      },
    };
  };
  mount();
  Object.assign(globalThis, { fuzz, remount: mount });
}

export function fuzzCheck(): string | null {
  const { fuzz } = globalThis as unknown as {
    fuzz: { reference: string[]; active: number };
  };
  if (fuzz.active < 0 || fuzz.active > 1) {
    return `active=${fuzz.active}`;
  }
  const found = order();
  if (found !== fuzz.reference.join('')) {
    return `order ${found} vs reference ${fuzz.reference.join('')}`;
  }
  if (fuzz.active === 0) {
    for (const element of items()) {
      if (element.style.translate !== '') {
        return `leftover translate ${element.style.translate}`;
      }
    }
  }
  return null;
}
