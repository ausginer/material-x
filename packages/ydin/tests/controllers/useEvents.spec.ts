import { describe, expect, it, vi } from 'vitest';
import {
  useEvents,
  type HTMLElementEventListenerMap,
} from '../../src/controllers/useEvents.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(
  listeners: HTMLElementEventListenerMap,
  target?: HTMLElement,
): readonly [ctr: CustomElementConstructor, target: HTMLElement] {
  const resolvedTarget = target ?? document.createElement('button');

  class Host extends ControlledElement {
    constructor() {
      super();
      if (target) {
        useEvents(this, listeners, resolvedTarget);
        this.append(resolvedTarget);
      } else {
        useEvents(this, listeners);
      }
    }
  }

  return [Host, resolvedTarget] as const;
}

describe('useEvents', () => {
  it('should attach listeners on connect', () => {
    const click = vi.fn();
    const [Host] = createHost({ click });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledOnce();
  });

  it('should ignore dispatched events before connection', () => {
    const click = vi.fn();
    const [Host] = createHost({ click });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();
    host.dispatchEvent(new MouseEvent('click'));

    expect(click).not.toHaveBeenCalled();
  });

  it('should remove listeners on disconnect', () => {
    const click = vi.fn();
    const [Host] = createHost({ click });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.remove();
    host.dispatchEvent(new MouseEvent('click'));

    expect(click).not.toHaveBeenCalled();
  });

  it('should reattach listeners after reconnect', () => {
    const click = vi.fn();
    const [Host] = createHost({ click });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new MouseEvent('click'));
    host.remove();
    document.body.append(host);
    host.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledTimes(2);
  });

  it('should attach listeners to a custom target when provided', () => {
    const click = vi.fn();
    const target = document.createElement('button');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useEvents(this, { click }, target);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    target.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledOnce();
  });
});
