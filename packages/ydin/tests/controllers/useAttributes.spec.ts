import { describe, expect, it, vi } from 'vitest';
import {
  transfer,
  useAttributes,
  type UpdateCallback,
} from '../../src/controllers/useAttributes.ts';
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
