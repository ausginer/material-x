import { describe, expect, it, vi } from 'vitest';
import { internals, use } from '../src/element.ts';
import { host } from './browser.ts';

describe('ControlledElement', () => {
  it('should call connected hooks for all registered controllers', () => {
    const firstConnected = vi.fn();
    const secondConnected = vi.fn();

    const h = host([], (h) => {
      use(h, { connected: firstConnected });
      use(h, { connected: secondConnected });
    });

    document.body.append(h);

    expect(firstConnected).toHaveBeenCalledOnce();
    expect(secondConnected).toHaveBeenCalledOnce();
  });

  it('should call disconnected hooks for all registered controllers', () => {
    const firstDisconnected = vi.fn();
    const secondDisconnected = vi.fn();

    const h = host([], (h) => {
      use(h, { disconnected: firstDisconnected });
      use(h, { disconnected: secondDisconnected });
    });

    document.body.append(h);
    h.remove();

    expect(firstDisconnected).toHaveBeenCalledOnce();
    expect(secondDisconnected).toHaveBeenCalledOnce();
  });

  it('should forward observed attribute changes to attrChanged hooks', () => {
    const attrChanged = vi.fn();
    const h = host(['data-state'], (h) => {
      use(h, { attrChanged });
    });

    h.setAttribute('data-state', 'on');
    h.removeAttribute('data-state');

    expect(attrChanged).toHaveBeenCalledTimes(2);
    expect(attrChanged).toHaveBeenNthCalledWith(
      1,
      'data-state',
      null,
      'on',
      null,
    );
    expect(attrChanged).toHaveBeenNthCalledWith(
      2,
      'data-state',
      'on',
      null,
      null,
    );
  });

  it('should preserve controller registration order for host callbacks', () => {
    const calls: string[] = [];

    const h = host(['data-state'], (h) => {
      use(h, {
        connected() {
          calls.push('first:connected');
        },
        attrChanged() {
          calls.push('first:attrChanged');
        },
        disconnected() {
          calls.push('first:disconnected');
        },
      });

      use(h, {
        connected() {
          calls.push('second:connected');
        },
        attrChanged() {
          calls.push('second:attrChanged');
        },
        disconnected() {
          calls.push('second:disconnected');
        },
      });
    });

    document.body.append(h);
    h.setAttribute('data-state', 'on');
    h.remove();

    expect(calls).toEqual([
      'first:connected',
      'second:connected',
      'first:attrChanged',
      'second:attrChanged',
      'first:disconnected',
      'second:disconnected',
    ]);
  });

  it('should ignore controllers without matching hooks', () => {
    const connected = vi.fn();
    const attrChanged = vi.fn();

    const h = host(['data-state'], (h) => {
      use(h, {});
      use(h, { connected, attrChanged });
    });

    document.body.append(h);
    h.setAttribute('data-state', 'on');

    expect(connected).toHaveBeenCalledOnce();
    expect(attrChanged).toHaveBeenCalledOnce();
  });

  it('should continue dispatching when a controller hook returns a Promise', () => {
    const calls: string[] = [];

    const firstConnected = vi.fn(async () => {
      calls.push('first:start');
      return await Promise.resolve();
    });
    const secondConnected = vi.fn(() => {
      calls.push('second');
    });

    const h = host(['data-state'], (h) => {
      use(h, { connected: firstConnected });
      use(h, { connected: secondConnected });
    });

    document.body.append(h);

    expect(firstConnected).toHaveBeenCalledOnce();
    expect(secondConnected).toHaveBeenCalledOnce();
    expect(calls).toEqual(['first:start', 'second']);
  });

  it('should return the same ElementInternals instance for the same host', () => {
    const h = host([], () => {});

    expect(internals(h)).toBe(internals(h));
  });
});
