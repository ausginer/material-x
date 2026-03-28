import type { Constructor } from 'type-fest';
import { describe, expect, it, vi } from 'vitest';
import {
  transfer,
  useAttributes,
  type UpdateCallback,
} from '../../src/controllers/useAttributes.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createTransferredHost(): readonly [
  ctr: Constructor<ControlledElement>,
  target: HTMLDivElement,
] {
  const target = document.createElement('div');

  class Host extends ControlledElement {
    static observedAttributes = ['data-state'];

    constructor() {
      super();
      useAttributes(this, {
        'data-state': transfer(target, 'data-state'),
      });
    }
  }

  return [Host, target] as const;
}

function createObservedHost(
  callback: UpdateCallback,
  observedAttributes: readonly string[] = ['data-state'],
): Constructor<ControlledElement> {
  return class Host extends ControlledElement {
    static observedAttributes = observedAttributes;

    constructor() {
      super();
      useAttributes(this, {
        'data-state': callback,
      });
    }
  };
}

describe('useAttributes', () => {
  it('should transfer attribute updates through the transfer helper', () => {
    const [Host, target] = createTransferredHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('data-state', 'open');

    expect(target).toHaveAttribute('data-state', 'open');
  });

  it('should call a custom update callback with old and new values', () => {
    const callback = vi.fn<UpdateCallback>();
    const Host = createObservedHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('data-state', 'open');
    host.setAttribute('data-state', 'closed');

    expect(callback).toHaveBeenNthCalledWith(1, null, 'open');
    expect(callback).toHaveBeenNthCalledWith(2, 'open', 'closed');
  });

  it('should ignore attribute changes without a registered handler', () => {
    const callback = vi.fn<UpdateCallback>();
    const Host = class extends ControlledElement {
      static observedAttributes = ['data-state'];

      constructor() {
        super();
        useAttributes(this, { 'aria-label': callback });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('data-state', 'open');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should ignore attribute changes when old and new values are equal', () => {
    const callback = vi.fn<UpdateCallback>();
    const Host = createObservedHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('data-state', 'open');
    callback.mockClear();
    host.setAttribute('data-state', 'open');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should react to observed attribute initialization via attrChanged', () => {
    const callback = vi.fn<UpdateCallback>();
    const Host = createObservedHost(callback);
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('data-state', 'open');

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(null, 'open');
  });

  it('should react to preset attributes during upgrade', () => {
    const callback = vi.fn<UpdateCallback>();
    const Host = createObservedHost(callback);
    const tag = nameCE();

    document.body.innerHTML = `<${tag} data-state="open"></${tag}>`;
    defineCE(tag, Host);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(null, 'open');
  });
});
