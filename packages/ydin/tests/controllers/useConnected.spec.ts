import { describe, expect, it, vi } from 'vitest';
import { useConnected } from '../../src/controllers/useConnected.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(callback: () => void): CustomElementConstructor {
  return class Host extends ControlledElement {
    constructor() {
      super();
      useConnected(this, callback);
    }
  };
}

describe('useConnected', () => {
  it('should call the callback when the host connects', () => {
    const callback = vi.fn();
    const Host = createHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    document.body.append(new Host());

    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not call the callback before connection', () => {
    const callback = vi.fn();
    const Host = createHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    new Host();

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call the callback again after reconnect', () => {
    const callback = vi.fn();
    const Host = createHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.remove();
    document.body.append(host);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
