import type { Constructor } from 'type-fest';
import { describe, expect, it, vi } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import {
  useDisableableLinkable,
  useLinkable,
} from '../../src/traits/linkable.ts';
import { defineCE, nameCE } from '../browser.ts';

function createLinkableHost(): readonly [
  ctr: Constructor<ControlledElement>,
  target: HTMLAnchorElement,
] {
  const target = document.createElement('a');

  class Host extends ControlledElement {
    static observedAttributes = ['href', 'target'] as string[];

    constructor() {
      super();
      useLinkable(this, target);
      this.append(target);
    }
  }

  return [Host, target] as const;
}

function createDisableableHost(): readonly [
  ctr: Constructor<ControlledElement>,
  target: HTMLAnchorElement,
] {
  const native = document.createElement('a');

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
      useLinkable(this, native);
      useDisableableLinkable(this, native);
      this.append(native);
    }
  }

  return [Host, native] as const;
}

describe('useLinkable', () => {
  it('should mirror href to the anchor', () => {
    const [Host, native] = createLinkableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('href', '/settings');

    expect(native).toHaveAttribute('href', '/settings');
  });

  it('should mirror target to the anchor', () => {
    const [Host, native] = createLinkableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('target', '_blank');

    expect(native.target).toBe('_blank');
  });
});

describe('useDisableableLinkable', () => {
  it('should disable native navigation and focus while disabled', () => {
    const [Host, native] = createDisableableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('href', '/settings');
    host.setAttribute('disabled', '');

    expect(native).not.toHaveAttribute('href');
    expect(native.ariaDisabled).toBe('true');
    expect(native.tabIndex).toBe(-1);
  });

  it('should restore the latest host href when re-enabled', () => {
    const [Host, native] = createDisableableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('disabled', '');
    host.setAttribute('href', '/settings');

    expect(native).not.toHaveAttribute('href');

    host.removeAttribute('disabled');

    expect(native).toHaveAttribute('href', '/settings');
  });

  it('should clear href set by useLinkable when href changes while disabled', () => {
    // useLinkable fires first (sets href), then useDisableableLinkable fires
    // and overrides it (clears href). This relies on controller registration
    // order — useLinkable must be called before useDisableableLinkable.
    const [Host, native] = createDisableableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('disabled', '');
    host.setAttribute('href', '/new-page');

    expect(native).not.toHaveAttribute('href');
  });

  it('should restore host-provided tabindex and aria-disabled when re-enabled', () => {
    const [Host, native] = createDisableableHost();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.setAttribute('aria-disabled', 'false');
    host.setAttribute('tabindex', '3');
    host.setAttribute('disabled', '');

    expect(native.ariaDisabled).toBe('true');
    expect(native.tabIndex).toBe(-1);

    host.removeAttribute('disabled');

    expect(native.ariaDisabled).toBe('false');
    expect(native).toHaveAttribute('tabindex', '3');
  });

  it('should prevent disabled click activation', () => {
    const [Host, native] = createDisableableHost();
    const click = vi.fn();

    defineCE(nameCE(), Host);

    const host = new Host();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    host.setAttribute('disabled', '');
    host.addEventListener('click', click);
    document.body.append(host);
    native.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });
});
