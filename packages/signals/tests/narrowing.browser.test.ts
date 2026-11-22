import { describe, expect, it, vi } from 'vitest';
import { computed, effect, signal, type Accessor } from '../src/index.ts';
import { activeSourceNames, subscriberCount } from './support/graph.ts';

function createBranch() {
  const show = signal(true, { name: 'show' });
  const archived = signal('archived', { name: 'archived' });
  const active = signal('active', { name: 'active' });

  return { show, archived, active };
}

describe('laziness (P4)', () => {
  it('should not run an unobserved computed on a write', () => {
    const a = signal(1);
    const runs = vi.fn((a: Accessor<number>) => a() + 1);
    const c = computed([a], runs);
    c.get();
    runs.mockClear();

    a.set(2);

    expect(runs).not.toHaveBeenCalled();
  });

  it('should leave no subscription on the source of a computed that was read', () => {
    const a = signal(1);
    const c = computed([a], (a) => a() + 1);

    expect(c.get()).toBe(2);
    expect(subscriberCount(a)).toBe(0);
  });

  it('should run an unobserved computed once per write when read', () => {
    const a = signal(1);
    const runs = vi.fn((a: Accessor<number>) => a() + 1);
    const c = computed([a], runs);

    c.get();
    c.get();
    a.set(2);
    c.get();
    c.get();

    expect(runs).toHaveBeenCalledTimes(2);
    expect(c.get()).toBe(3);
  });

  it('should unsubscribe a computed from its sources when its last observer is disposed', () => {
    const a = signal(1);
    const c = computed([a], (a) => a() + 1);
    const dispose = effect([c], (c) => {
      c();
    });

    expect(subscriberCount(a)).toBe(1);

    dispose();

    expect(subscriberCount(a)).toBe(0);
    expect(subscriberCount(c)).toBe(0);
  });

  it('should be current when read after its last observer is disposed', () => {
    const a = signal(1);
    const c = computed([a], (a) => a() + 1);
    const dispose = effect([c], (c) => {
      c();
    });
    dispose();

    a.set(5);

    expect(c.get()).toBe(6);
  });
});

describe('narrowing of a computed (P5)', () => {
  it('should subscribe to exactly the inputs the run read', () => {
    const { show, archived, active } = createBranch();
    const visible = computed(
      [show, archived, active],
      (show, archived, active) => (show() ? archived() : active()),
    );
    effect([visible], (visible) => {
      visible();
    });

    expect(activeSourceNames(visible)).toEqual(['show', 'archived']);
  });

  it('should not rerun on a write to an input no longer read after a branch switch', () => {
    const { show, archived, active } = createBranch();
    const runs = vi.fn(
      (
        show: Accessor<boolean>,
        archived: Accessor<string>,
        active: Accessor<string>,
      ) => (show() ? archived() : active()),
    );
    const visible = computed([show, archived, active], runs);
    effect([visible], (visible) => {
      visible();
    });

    show.set(false);
    runs.mockClear();
    archived.set('other');

    expect(runs).not.toHaveBeenCalled();
    expect(subscriberCount(archived)).toBe(0);
  });

  it('should rerun on a write to the newly read input after a branch switch', () => {
    const { show, archived, active } = createBranch();
    const visible = computed(
      [show, archived, active],
      (show, archived, active) => (show() ? archived() : active()),
    );
    const seen: string[] = [];
    effect([visible], (visible) => {
      seen.push(visible());
    });

    show.set(false);
    active.set('changed');

    expect(seen).toEqual(['archived', 'active', 'changed']);
  });

  it('should narrow an unobserved computed too', () => {
    const { show, archived, active } = createBranch();
    const runs = vi.fn(
      (
        show: Accessor<boolean>,
        archived: Accessor<string>,
        active: Accessor<string>,
      ) => (show() ? archived() : active()),
    );
    const visible = computed([show, archived, active], runs);
    visible.get();
    runs.mockClear();

    active.set('changed');
    visible.get();

    expect(runs).not.toHaveBeenCalled();
  });
});

describe('narrowing of an effect (P6)', () => {
  it('should not rerun on a write to an input no longer read after a branch switch', () => {
    const { show, archived, active } = createBranch();
    const seen: string[] = [];
    effect([show, archived, active], (show, archived, active) => {
      seen.push(show() ? archived() : active());
    });

    show.set(false);
    archived.set('other');

    expect(seen).toEqual(['archived', 'active']);
  });

  it('should rerun on a write to the newly read input after a branch switch', () => {
    const { show, archived, active } = createBranch();
    const seen: string[] = [];
    effect([show, archived, active], (show, archived, active) => {
      seen.push(show() ? archived() : active());
    });

    show.set(false);
    active.set('changed');

    expect(seen).toEqual(['archived', 'active', 'changed']);
  });

  it('should not rerun when an input it declares and never reads changes', () => {
    const tick = signal(0);
    const runs = vi.fn();
    effect([tick], () => {
      runs();
    });
    runs.mockClear();

    tick.set(1);

    expect(runs).not.toHaveBeenCalled();
    expect(subscriberCount(tick)).toBe(0);
  });

  it('should not evaluate a declared computed that the run does not read', () => {
    const enabled = signal(false);
    const runs = vi.fn(() => 1);
    const expensive = computed([], runs);
    effect([enabled, expensive], (enabled, expensive) => {
      if (enabled()) {
        expensive();
      }
    });

    expect(runs).not.toHaveBeenCalled();
  });
});

describe('escaped reads (P7)', () => {
  it('should read the current value and mark no edge when called from a timer', async () => {
    const a = signal(1);
    const b = signal(10);
    let escaped: Accessor<number> | undefined;
    const runs = vi.fn();
    effect([a, b], (a, b) => {
      a();
      escaped = b;
      runs();
    });
    runs.mockClear();

    b.set(20);
    const value = await new Promise<number>((resolve) => {
      setTimeout(() => resolve(escaped!()), 0);
    });
    b.set(30);

    expect(value).toBe(20);
    expect(runs).not.toHaveBeenCalled();
    expect(subscriberCount(b)).toBe(0);
  });

  it('should read the current value and mark no edge after an await', async () => {
    const a = signal(1);
    const b = signal(10);
    const reads: number[] = [];
    let settled: Promise<void> | undefined;
    const runs = vi.fn();
    effect([a, b], (a, b) => {
      a();
      runs();
      settled = (async () => {
        await Promise.resolve();
        reads.push(b());
      })();
    });
    await settled;
    runs.mockClear();

    b.set(20);

    expect(reads).toEqual([10]);
    expect(runs).not.toHaveBeenCalled();
    expect(subscriberCount(b)).toBe(0);
  });

  it('should read through a computed accessor outside the run', () => {
    const a = signal(1);
    const doubled = computed([a], (a) => a() * 2);
    let escaped: Accessor<number> | undefined;
    const c = computed([doubled], (doubled) => {
      escaped = doubled;
      return 0;
    });
    c.get();

    a.set(4);

    expect(escaped!()).toBe(8);
  });
});

describe('get()', () => {
  it('should subscribe to nothing inside a run', () => {
    const a = signal(1);
    const b = signal(1);
    const seen: number[] = [];
    effect([a], (a) => {
      seen.push(a() + b.get());
    });

    b.set(2);

    expect(seen).toEqual([2]);
    expect(subscriberCount(b)).toBe(0);
  });
});
