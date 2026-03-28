import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMutationObserver } from '../../src/controllers/useMutationObserver.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

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
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useMutationObserver(this, callback, options);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);

    expect(instances).toHaveLength(1);
    expect(instances[0]?.observe).toHaveBeenCalledOnce();
    expect(instances[0]?.observe).toHaveBeenCalledWith(host, options);
  });

  it('should observe a provided target instead of the host', () => {
    const instances = mockMutationObserver();
    const callback = vi.fn<MutationCallback>();
    const target = document.createElement('div');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useMutationObserver(this, callback, { childList: true }, target);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);

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
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useMutationObserver(this, callback, options);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    document.body.append(new Host());

    expect(instances[0]?.observe).toHaveBeenCalledWith(
      expect.anything(),
      options,
    );
  });

  it('should disconnect the observer on host disconnect', () => {
    const instances = mockMutationObserver();
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useMutationObserver(this, vi.fn(), { attributes: true });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.remove();

    expect(instances[0]?.disconnect).toHaveBeenCalledOnce();
  });

  it('should resume observation after reconnect', () => {
    const instances = mockMutationObserver();
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useMutationObserver(this, vi.fn(), { attributes: true });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.remove();
    document.body.append(host);

    expect(instances[0]?.observe).toHaveBeenCalledTimes(2);
  });
});
