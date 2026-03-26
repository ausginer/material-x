import type { Constructor } from 'type-fest';
import { describe, expect, it, vi } from 'vitest';
import {
  ControlledElement,
  getInternals,
  use,
  type ElementController,
} from '../src/element.ts';
import { defineCE, nameCE } from './browser.ts';

function createHost(
  controllers: readonly ElementController[],
  observedAttributes?: readonly string[],
): Constructor<ControlledElement> {
  return class Host extends ControlledElement {
    static readonly observedAttributes = observedAttributes;

    constructor() {
      super();

      for (const controller of controllers) {
        use(this, controller);
      }
    }
  };
}

describe('ControlledElement', () => {
  it('should call connected hooks for all registered controllers', () => {
    const firstConnected = vi.fn();
    const secondConnected = vi.fn();
    const Host = createHost([
      { connected: firstConnected },
      { connected: secondConnected },
    ]);
    const tag = nameCE();

    defineCE(tag, Host);
    document.body.append(document.createElement(tag));

    expect(firstConnected).toHaveBeenCalledOnce();
    expect(secondConnected).toHaveBeenCalledOnce();
  });

  it('should call disconnected hooks for all registered controllers', () => {
    const firstDisconnected = vi.fn();
    const secondDisconnected = vi.fn();
    const Host = createHost([
      { disconnected: firstDisconnected },
      { disconnected: secondDisconnected },
    ]);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = document.createElement(tag);

    document.body.append(host);
    host.remove();

    expect(firstDisconnected).toHaveBeenCalledOnce();
    expect(secondDisconnected).toHaveBeenCalledOnce();
  });

  it('should forward observed attribute changes to attrChanged hooks', () => {
    const attrChanged = vi.fn();
    const Host = createHost([{ attrChanged }], ['data-state']);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = document.createElement(tag);

    host.setAttribute('data-state', 'on');
    host.removeAttribute('data-state');

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
    const Host = createHost(
      [
        {
          connected: () => {
            calls.push('first:connected');
          },
          attrChanged: () => {
            calls.push('first:attrChanged');
          },
          disconnected: () => {
            calls.push('first:disconnected');
          },
        },
        {
          connected: () => {
            calls.push('second:connected');
          },
          attrChanged: () => {
            calls.push('second:attrChanged');
          },
          disconnected: () => {
            calls.push('second:disconnected');
          },
        },
      ],
      ['data-state'],
    );
    const tag = nameCE();

    defineCE(tag, Host);

    const host = document.createElement(tag);

    document.body.append(host);
    host.setAttribute('data-state', 'on');
    host.remove();

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
    const Host = createHost([{}, { connected, attrChanged }], ['data-state']);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = document.createElement(tag);

    document.body.append(host);
    host.setAttribute('data-state', 'on');

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

    const Host = createHost([
      { connected: firstConnected },
      { connected: secondConnected },
    ]);

    const tag = nameCE();

    defineCE(tag, Host);
    document.body.append(document.createElement(tag));

    expect(firstConnected).toHaveBeenCalledOnce();
    expect(secondConnected).toHaveBeenCalledOnce();
    expect(calls).toEqual(['first:start', 'second']);
  });

  it('should return the same ElementInternals instance for the same host', () => {
    const Host = createHost([]);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    expect(getInternals(host)).toBe(getInternals(host));
  });
});
