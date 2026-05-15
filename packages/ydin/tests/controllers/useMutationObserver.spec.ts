import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMutationObserver } from '../../src/controllers/useMutationObserver.ts';
import { host } from '../browser.ts';

type MockMutationObserverInstance = Readonly<{
  callback: MutationCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
}>;

function mockMutationObserver(): readonly MockMutationObserverInstance[] {
  const instances: MockMutationObserverInstance[] = [];

  class MockMutationObserver {
    readonly observe = vi.fn();
    readonly disconnect = vi.fn();

    constructor(callback: MutationCallback) {
      instances.push({
        callback,
        disconnect: this.disconnect,
        observe: this.observe,
      });
    }
  }

  vi.stubGlobal(
    'MutationObserver',
    MockMutationObserver as unknown as typeof MutationObserver,
  );

  return instances;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMutationObserver', () => {
  it('should observe the host by default', () => {
    const instances = mockMutationObserver();
    const callback = vi.fn<MutationCallback>();
    const options = { attributes: true } satisfies MutationObserverInit;
    const el = host([], (h) => {
      useMutationObserver(h, callback, options);
    });

    document.body.append(el);

    expect(instances).toHaveLength(1);
    expect(instances[0]?.observe).toHaveBeenCalledOnce();
    expect(instances[0]?.observe).toHaveBeenCalledWith(el, options);
  });

  it('should observe a provided target instead of the host', () => {
    const instances = mockMutationObserver();
    const callback = vi.fn<MutationCallback>();
    const target = document.createElement('div');
    const el = host([], (h) => {
      useMutationObserver(h, callback, { childList: true }, target);
    });

    document.body.append(el);

    expect(instances[0]?.observe).toHaveBeenCalledWith(target, {
      childList: true,
    });
  });

  it('should forward observer options to observe', () => {
    const instances = mockMutationObserver();
    const callback = vi.fn<MutationCallback>();
    const options = {
      attributes: true,
      attributeOldValue: true,
    } satisfies MutationObserverInit;

    document.body.append(
      host([], (h) => {
        useMutationObserver(h, callback, options);
      }),
    );

    expect(instances[0]?.observe).toHaveBeenCalledWith(
      expect.anything(),
      options,
    );
  });

  it('should disconnect the observer on host disconnect', () => {
    const instances = mockMutationObserver();
    const el = host([], (h) => {
      useMutationObserver(h, vi.fn(), { attributes: true });
    });

    document.body.append(el);
    el.remove();

    expect(instances[0]?.disconnect).toHaveBeenCalledOnce();
  });

  it('should resume observation after reconnect', () => {
    const instances = mockMutationObserver();
    const el = host([], (h) => {
      useMutationObserver(h, vi.fn(), { attributes: true });
    });

    document.body.append(el);
    el.remove();
    document.body.append(el);

    expect(instances[0]?.observe).toHaveBeenCalledTimes(2);
  });
});
