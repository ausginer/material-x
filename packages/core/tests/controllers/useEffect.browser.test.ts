import { signal } from '@ydinjs/signals';
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from '../../src/controllers/useEffect.ts';
import { host } from '../browser.ts';

function createHost() {
  const count = signal(0);
  const log: string[] = [];
  const el = host((h) => {
    useEffect(h, [count], (count) => {
      const value = count();
      log.push(`run ${value}`);
      return () => {
        log.push(`cleanup ${value}`);
      };
    });
  });

  return { count, log, el };
}

describe('useEffect', () => {
  it('should not run the effect before the host connects', () => {
    const { log } = createHost();

    expect(log).toEqual([]);
  });

  it('should run the effect when the host connects', () => {
    const { log, el } = createHost();

    document.body.append(el);

    expect(log).toEqual(['run 0']);
  });

  it('should run the effect again on a change while connected', () => {
    const { count, log, el } = createHost();
    document.body.append(el);

    count.set(1);

    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1']);
  });

  it('should dispose the effect when the host disconnects', () => {
    const { count, log, el } = createHost();
    document.body.append(el);

    el.remove();
    count.set(1);

    expect(log).toEqual(['run 0', 'cleanup 0']);
  });

  it('should create a new effect when the host reconnects', () => {
    const { count, log, el } = createHost();
    document.body.append(el);
    el.remove();
    count.set(1);

    document.body.append(el);

    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1']);
  });

  it('should run the effect once for each connection', () => {
    const fn = vi.fn();
    const el = host((h) => {
      useEffect(h, [], fn);
    });

    document.body.append(el);
    el.remove();
    document.body.append(el);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
