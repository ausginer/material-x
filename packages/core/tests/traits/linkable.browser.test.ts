import { describe, expect, it, vi, type Mock } from 'vitest';
import { useARIA } from '../../src/controllers/useARIA.ts';
import {
  useDisableableLinkable,
  useLinkable,
} from '../../src/traits/linkable.ts';
import { host, nextFrame } from '../browser.ts';

const LINKABLE_ATTRS = ['href', 'target'] as const;
const DISABLEABLE_LINKABLE_ATTRS = [
  'aria-disabled',
  'disabled',
  'href',
  'tabindex',
  'target',
] as const;

describe('useLinkable', () => {
  it('should mirror href to the anchor', () => {
    const native = document.createElement('a');
    const el = host(
      (h) => {
        useLinkable(h, native);
        h.append(native);
      },
      { observed: LINKABLE_ATTRS },
    );

    el.setAttribute('href', '/settings');

    expect(native).toHaveAttribute('href', '/settings');
  });

  it('should mirror target to the anchor', () => {
    const native = document.createElement('a');
    const el = host(
      (h) => {
        useLinkable(h, native);
        h.append(native);
      },
      { observed: LINKABLE_ATTRS },
    );

    el.setAttribute('target', '_blank');

    expect(native.target).toBe('_blank');
  });
});

describe('useDisableableLinkable', () => {
  it('should disable native navigation and focus while disabled', () => {
    const native = document.createElement('a');
    const el = host(
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
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
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
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
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
    );

    el.setAttribute('disabled', '');
    el.setAttribute('href', '/new-page');

    expect(native).not.toHaveAttribute('href');
  });

  it('should restore host-provided tabindex when re-enabled', () => {
    const native = document.createElement('a');
    const el = host(
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
    );

    el.setAttribute('tabindex', '3');
    el.setAttribute('disabled', '');

    expect(native.tabIndex).toBe(-1);

    el.removeAttribute('disabled');

    expect(native).toHaveAttribute('tabindex', '3');
  });

  it('should leave a host-provided aria-disabled on a mirrored anchor when re-enabled', async () => {
    const native = document.createElement('a');
    const el = host(
      (h) => {
        useLinkable(h, native);
        useARIA(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
    );

    document.body.append(el);
    el.setAttribute('aria-disabled', 'false');
    el.setAttribute('disabled', '');
    await nextFrame();
    el.removeAttribute('disabled');
    await nextFrame();

    expect(native.ariaDisabled).toBe('false');
  });

  it('should prevent disabled click activation', () => {
    const native = document.createElement('a');
    const click: Mock<EventListener> = vi.fn();
    const el = host(
      (h) => {
        useLinkable(h, native);
        useDisableableLinkable(h, native);
        h.append(native);
      },
      { observed: DISABLEABLE_LINKABLE_ATTRS },
    );
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    el.setAttribute('disabled', '');
    el.addEventListener('click', click);
    document.body.append(el);
    native.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTruthy();
    expect(click).not.toHaveBeenCalled();
  });
});
