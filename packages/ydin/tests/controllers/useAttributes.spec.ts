import { describe, expect, it, vi } from 'vitest';
import {
  toState,
  transfer,
  useAttributes,
  type StateCondition,
  type UpdateCallback,
} from '../../src/controllers/useAttributes.ts';
import { type ControlledElement, getInternals } from '../../src/element.ts';
import { host, nameCE } from '../browser.ts';

describe('useAttributes', () => {
  it('should transfer attribute updates through the transfer helper', () => {
    const target = document.createElement('div');
    const el = host(['data-state'], (h) => {
      useAttributes(h, { 'data-state': transfer(target, 'data-state') });
    });

    el.setAttribute('data-state', 'open');

    expect(target).toHaveAttribute('data-state', 'open');
  });

  it('should call a custom update callback with old and new values', () => {
    const callback = vi.fn<UpdateCallback>();
    const el = host(['data-state'], (h) => {
      useAttributes(h, { 'data-state': callback });
    });

    el.setAttribute('data-state', 'open');
    el.setAttribute('data-state', 'closed');

    expect(callback).toHaveBeenNthCalledWith(1, null, 'open');
    expect(callback).toHaveBeenNthCalledWith(2, 'open', 'closed');
  });

  it('should ignore attribute changes without a registered handler', () => {
    const callback = vi.fn<UpdateCallback>();
    const el = host(['data-state'], (h) => {
      useAttributes(h, { 'aria-label': callback });
    });

    el.setAttribute('data-state', 'open');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should ignore attribute changes when old and new values are equal', () => {
    const callback = vi.fn<UpdateCallback>();
    const el = host(['data-state'], (h) => {
      useAttributes(h, { 'data-state': callback });
    });

    el.setAttribute('data-state', 'open');
    callback.mockClear();
    el.setAttribute('data-state', 'open');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should react to observed attribute initialization via attrChanged', () => {
    const callback = vi.fn<UpdateCallback>();
    const el = host(['data-state'], (h) => {
      useAttributes(h, { 'data-state': callback });
    });

    el.setAttribute('data-state', 'open');

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(null, 'open');
  });

  it('should react to preset attributes during upgrade', () => {
    const callback = vi.fn<UpdateCallback>();
    const tag = nameCE();

    document.body.innerHTML = `<${tag} data-state="open"></${tag}>`;
    host(
      ['data-state'],
      (h) => {
        useAttributes(h, { 'data-state': callback });
      },
      tag,
    );

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(null, 'open');
  });
});

describe('toState', () => {
  it('should add the state when the attribute is set', () => {
    const el = host(['checked'], (h) => {
      useAttributes(h, { checked: toState(getInternals(h), 'checked') });
    });

    el.setAttribute('checked', '');

    expect(getInternals(el).states.has('checked')).toBe(true);
  });

  it('should remove the state when the attribute is removed', () => {
    const el = host(['checked'], (h) => {
      useAttributes(h, { checked: toState(getInternals(h), 'checked') });
    });

    el.setAttribute('checked', '');
    el.removeAttribute('checked');

    expect(getInternals(el).states.has('checked')).toBe(false);
  });

  it('should not affect an unrelated state when a different attribute changes', () => {
    const el = host(['checked', 'disabled'], (h) => {
      useAttributes(h, { checked: toState(getInternals(h), 'checked') });
    });

    el.setAttribute('disabled', '');

    expect(getInternals(el).states.has('checked')).toBe(false);
  });

  it('should use a custom state name when provided', () => {
    const el = host(['aria-disabled'], (h) => {
      useAttributes(h, {
        'aria-disabled': toState(getInternals(h), 'disabled'),
      });
    });

    el.setAttribute('aria-disabled', '');

    expect(getInternals(el).states.has('disabled')).toBe(true);
    expect(getInternals(el).states.has('aria-disabled')).toBe(false);
  });

  it('should apply a custom condition to determine state presence', () => {
    const condition: StateCondition = (_, newValue) => newValue === 'true';
    const el = host(['active'], (h) => {
      useAttributes(h, {
        active: toState(getInternals(h), 'active', condition),
      });
    });

    el.setAttribute('active', 'true');
    expect(getInternals(el).states.has('active')).toBe(true);

    el.setAttribute('active', 'false');
    expect(getInternals(el).states.has('active')).toBe(false);

    el.removeAttribute('active');
    expect(getInternals(el).states.has('active')).toBe(false);
  });

  it('should reflect a pre-set attribute as state after upgrade', () => {
    const tag = nameCE();

    document.body.innerHTML = `<${tag} checked></${tag}>`;
    host(
      ['checked'],
      (h) => {
        useAttributes(h, { checked: toState(getInternals(h), 'checked') });
      },
      tag,
    );

    const el = document.querySelector(tag) as ControlledElement;

    expect(getInternals(el).states.has('checked')).toBe(true);
  });

  it('should manage multiple states independently on the same host', () => {
    const el = host(['checked', 'disabled'], (h) => {
      useAttributes(h, {
        checked: toState(getInternals(h), 'checked'),
        disabled: toState(getInternals(h), 'disabled'),
      });
    });

    el.setAttribute('checked', '');

    expect(getInternals(el).states.has('checked')).toBe(true);
    expect(getInternals(el).states.has('disabled')).toBe(false);

    el.setAttribute('disabled', '');

    expect(getInternals(el).states.has('checked')).toBe(true);
    expect(getInternals(el).states.has('disabled')).toBe(true);

    el.removeAttribute('checked');

    expect(getInternals(el).states.has('checked')).toBe(false);
    expect(getInternals(el).states.has('disabled')).toBe(true);
  });
});
