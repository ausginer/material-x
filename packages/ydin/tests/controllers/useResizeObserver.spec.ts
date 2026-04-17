// oxlint-disable no-new
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResizeObserver } from '../../src/controllers/useResizeObserver.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

type MockResizeObserverInstance = Readonly<{
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
}>;

function mockResizeObserver(): readonly [
  instances: MockResizeObserverInstance[],
  created: ResizeObserver[],
] {
  const instances: MockResizeObserverInstance[] = [];
  const created: ResizeObserver[] = [];

  class MockResizeObserver {
    readonly observe = vi.fn();
    readonly disconnect = vi.fn();

    constructor(_: ResizeObserverCallback) {
      instances.push({
        disconnect: this.disconnect,
        observe: this.observe,
      });
      created.push(this as unknown as ResizeObserver);
    }
  }

  vi.stubGlobal(
    'ResizeObserver',
    MockResizeObserver as unknown as typeof ResizeObserver,
  );

  return [instances, created] as const;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useResizeObserver', () => {
  it('should observe the host by default', () => {
    const [instances] = mockResizeObserver();
    const options = { box: 'content-box' } satisfies ResizeObserverOptions;
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useResizeObserver(this, vi.fn(), options);
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

  it('should observe all provided targets', () => {
    const [instances] = mockResizeObserver();
    const first = document.createElement('div');
    const second = document.createElement('div');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useResizeObserver(this, vi.fn(), { box: 'border-box' }, [
          first,
          second,
        ]);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    document.body.append(new Host());

    expect(instances[0]?.observe).toHaveBeenNthCalledWith(1, first, {
      box: 'border-box',
    });
    expect(instances[0]?.observe).toHaveBeenNthCalledWith(2, second, {
      box: 'border-box',
    });
  });

  it('should forward observe options to each observed target', () => {
    const [instances] = mockResizeObserver();
    const target = document.createElement('div');
    const options = { box: 'device-pixel-content-box' } as const;
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useResizeObserver(this, vi.fn(), options, [target]);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    document.body.append(new Host());

    expect(instances[0]?.observe).toHaveBeenCalledWith(target, options);
  });

  it('should disconnect the observer on host disconnect', () => {
    const [instances] = mockResizeObserver();
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useResizeObserver(this, vi.fn(), { box: 'content-box' });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.remove();

    expect(instances[0]?.disconnect).toHaveBeenCalledOnce();
  });

  it('should resume observing after reconnect', () => {
    const [instances] = mockResizeObserver();
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useResizeObserver(this, vi.fn(), { box: 'content-box' });
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

  it('should return the created ResizeObserver instance', () => {
    const [_, created] = mockResizeObserver();
    let observer: ResizeObserver | undefined;
    const Host = class extends ControlledElement {
      constructor() {
        super();
        observer = useResizeObserver(this, vi.fn(), { box: 'content-box' });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    new Host();

    expect(observer).toBe(created[0]);
  });
});
