import { describe, expect, it, vi } from 'vitest';
import { useKeyboard } from '../../src/controllers/useKeyboard.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(
  listeners: Parameters<typeof useKeyboard>[1],
  target?: HTMLElement,
): readonly [ctr: CustomElementConstructor, target: HTMLElement] {
  const resolvedTarget = target ?? document.createElement('button');

  class Host extends ControlledElement {
    constructor() {
      super();
      if (target) {
        useKeyboard(this, listeners, resolvedTarget);
        this.append(resolvedTarget);
      } else {
        useKeyboard(this, listeners);
      }
    }
  }

  return [Host, resolvedTarget] as const;
}

describe('useKeyboard', () => {
  it('should call the down listener for a matching keydown event', () => {
    const down = vi.fn();
    const [Host] = createHost({ Enter: { down } });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(down).toHaveBeenCalledOnce();
  });

  it('should call the up listener for a matching keyup event', () => {
    const up = vi.fn();
    const [Host] = createHost({ Enter: { up } });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(up).toHaveBeenCalledOnce();
  });

  it('should ignore keys without listeners', () => {
    const down = vi.fn();
    const [Host] = createHost({ Enter: { down } });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(down).not.toHaveBeenCalled();
  });

  it('should not call the wrong phase listener', () => {
    const down = vi.fn();
    const [Host] = createHost({ Enter: { down } });
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    host.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(down).not.toHaveBeenCalled();
  });

  it('should attach keyboard listeners to a custom target when provided', () => {
    const down = vi.fn();
    const target = document.createElement('button');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useKeyboard(this, { Enter: { down } }, target);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(down).toHaveBeenCalledOnce();
  });
});
