import { describe, expect, it, vi } from 'vitest';
import {
  useDisableableLinkable,
  useLinkable,
} from '../../src/traits/linkable.ts';
import { host } from '../browser.ts';

describe('useLinkable', () => {
  it('should mirror href to the anchor', () => {
    const native = document.createElement('a');
    const el = host(['href', 'target'], (h) => {
      useLinkable(h, native);
      h.append(native);
    });

    el.setAttribute('href', '/settings');

    expect(native).toHaveAttribute('href', '/settings');
  });

  it('should mirror target to the anchor', () => {
    const native = document.createElement('a');
    const el = host(['href', 'target'], (h) => {
      useLinkable(h, native);
      h.append(native);
    });

    el.setAttribute('target', '_blank');

    expect(native.target).toBe('_blank');
  });
});

describe('useDisableableLinkable', () => {
  it('should disable native navigation and focus while disabled', () => {
    const native = document.createElement('a');
    const el = host(
      ['aria-disabled', 'disabled', 'href', 'tabindex', 'target'],
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
    );

    el.setAttribute('href', '/settings');
    el.setAttribute('disabled', '');

    expect(native).not.toHaveAttribute('href');
    expect(native.ariaDisabled).toBe('true');
    expect(native.tabIndex).toBe(-1);
  });

  it('should restore the latest host href when re-enabled', () => {
    const native = document.createElement('a');
    const el = host(
      ['aria-disabled', 'disabled', 'href', 'tabindex', 'target'],
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
    );

    el.setAttribute('disabled', '');
    el.setAttribute('href', '/settings');

    expect(native).not.toHaveAttribute('href');

    el.removeAttribute('disabled');

    expect(native).toHaveAttribute('href', '/settings');
  });

  it('should clear href set by useLinkable when href changes while disabled', () => {
    // useLinkable fires first (sets href), then useDisableableLinkable fires
    // and overrides it (clears href). This relies on controller registration
    // order — useLinkable must be called before useDisableableLinkable.
    const native = document.createElement('a');
    const el = host(
      ['aria-disabled', 'disabled', 'href', 'tabindex', 'target'],
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
    );

    el.setAttribute('disabled', '');
    el.setAttribute('href', '/new-page');

    expect(native).not.toHaveAttribute('href');
  });

  it('should restore host-provided tabindex and aria-disabled when re-enabled', () => {
    const native = document.createElement('a');
    const el = host(
      ['aria-disabled', 'disabled', 'href', 'tabindex', 'target'],
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
    );

    el.setAttribute('aria-disabled', 'false');
    el.setAttribute('tabindex', '3');
    el.setAttribute('disabled', '');

    expect(native.ariaDisabled).toBe('true');
    expect(native.tabIndex).toBe(-1);

    el.removeAttribute('disabled');

    expect(native.ariaDisabled).toBe('false');
    expect(native).toHaveAttribute('tabindex', '3');
  });

  it('should prevent disabled click activation', () => {
    const native = document.createElement('a');
    const click = vi.fn();
    const el = host(
      ['aria-disabled', 'disabled', 'href', 'tabindex', 'target'],
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
    );
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    el.setAttribute('disabled', '');
    el.addEventListener('click', click);
    document.body.append(el);
    native.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });
});
