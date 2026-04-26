import type { Constructor } from 'type-fest';
import { describe, expect, it, vi } from 'vitest';
import { useAnchor } from '../../src/controllers/useAnchor.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(): readonly [
  ctr: Constructor<ControlledElement>,
  target: HTMLAnchorElement,
] {
  const target = document.createElement('a');

  class Host extends ControlledElement {
    static observedAttributes = [
      'aria-disabled',
      'disabled',
      'href',
      'tabindex',
      'target',
    ];

    constructor() {
      super();
      useAnchor(this, target);
      this.append(target);
    }
  }

  return [Host, target] as const;
}

describe('useAnchor', () => {
  it('should mirror href and target while enabled', () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('href', '/settings');
    host.setAttribute('target', '_blank');

    expect(target).toHaveAttribute('href', '/settings');
    expect(target.target).toBe('_blank');
  });

  it('should disable native navigation and focus while disabled', () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('href', '/settings');
    host.setAttribute('disabled', '');

    expect(target).not.toHaveAttribute('href');
    expect(target.ariaDisabled).toBe('true');
    expect(target.tabIndex).toBe(-1);
  });

  it('should restore the latest host href when re-enabled', () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('disabled', '');
    host.setAttribute('href', '/settings');

    expect(target).not.toHaveAttribute('href');

    host.removeAttribute('disabled');

    expect(target).toHaveAttribute('href', '/settings');
  });

  it('should restore host-provided tabindex and aria-disabled when re-enabled', () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('aria-disabled', 'false');
    host.setAttribute('tabindex', '3');
    host.setAttribute('disabled', '');

    expect(target.ariaDisabled).toBe('true');
    expect(target.tabIndex).toBe(-1);

    host.removeAttribute('disabled');

    expect(target.ariaDisabled).toBe('false');
    expect(target).toHaveAttribute('tabindex', '3');
  });

  it('should prevent disabled click activation', () => {
    const [Host, target] = createHost();
    const tag = nameCE();
    const click = vi.fn();

    defineCE(tag, Host);

    const host = new Host();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    host.setAttribute('disabled', '');
    host.addEventListener('click', click);
    document.body.append(host);
    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });
});
