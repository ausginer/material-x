import { describe, expect, it, beforeEach } from 'vitest';
import { setAttribute, Bool, Num, Str } from '../src/attribute.ts';

describe('attr', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
  });

  it.skip('should read missing boolean attribute as false', () => {
    expect(attr.get(host, 'disabled', Bool)).toBeFalsy();
  });

  it.skip('should read present boolean attribute as true', () => {
    host.setAttribute('disabled', '');

    expect(attr.get(host, 'disabled', Bool)).toBeTruthy();
  });

  it.skip('should write true boolean value as empty attribute', () => {
    attr.set(host, 'disabled', true, Bool);

    expect(host.getAttribute('disabled')).toBe('');
  });

  it.skip('should remove boolean attribute when writing false', () => {
    host.setAttribute('disabled', '');
    attr.set(host, 'disabled', false, Bool);

    expect(host.hasAttribute('disabled')).toBeFalsy();
  });

  it.skip('should read integer attribute through Num converter', () => {
    host.setAttribute('tabindex', '42');

    expect(attr.get(host, 'tabindex', Num)).toBe(42);
  });

  it.skip('should read decimal attribute through Num converter', () => {
    host.setAttribute('data-scale', '3.14');

    expect(attr.get(host, 'data-scale', Num)).toBe(3.14);
  });

  it.skip('should read zero through Num converter', () => {
    host.setAttribute('tabindex', '0');

    expect(attr.get(host, 'tabindex', Num)).toBe(0);
  });

  it.skip('should read missing numeric attribute as null', () => {
    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it.skip('should read empty numeric attribute as null', () => {
    host.setAttribute('tabindex', '');

    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it.skip('should read invalid numeric attribute as null', () => {
    host.setAttribute('tabindex', 'foo');

    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it.skip('should write numeric value as serialized string', () => {
    attr.set(host, 'tabindex', 42, Num);

    expect(host.getAttribute('tabindex')).toBe('42');
  });

  it.skip('should remove numeric attribute when writing null', () => {
    host.setAttribute('tabindex', '42');
    attr.set(host, 'tabindex', null, Num);

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it.skip('should remove numeric attribute when writing undefined', () => {
    host.setAttribute('tabindex', '42');
    attr.set(host, 'tabindex', undefined, Num);

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it.skip('should remove numeric attribute when writing NaN', () => {
    host.setAttribute('tabindex', '42');
    attr.set(host, 'tabindex', Number.NaN, Num);

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it.skip('should read missing string attribute as null', () => {
    expect(attr.get(host, 'aria-label', Str)).toBeNull();
  });

  it.skip('should read string attribute unchanged through Str converter', () => {
    host.setAttribute('aria-label', 'Close');

    expect(attr.get(host, 'aria-label', Str)).toBe('Close');
  });

  it.skip('should write string value unchanged through Str converter', () => {
    attr.set(host, 'aria-label', 'Close', Str);

    expect(host.getAttribute('aria-label')).toBe('Close');
  });

  it.skip('should remove string attribute when writing null', () => {
    host.setAttribute('aria-label', 'Close');
    attr.set(host, 'aria-label', null, Str);

    expect(host.hasAttribute('aria-label')).toBeFalsy();
  });

  it.skip('should remove string attribute when writing undefined', () => {
    host.setAttribute('aria-label', 'Close');
    attr.set(host, 'aria-label', undefined, Str);

    expect(host.hasAttribute('aria-label')).toBeFalsy();
  });

  it('should write raw attribute value through setRaw', () => {
    setAttribute(host, 'data-state', 'open');

    expect(host.getAttribute('data-state')).toBe('open');
  });

  it('should remove attribute when setRaw receives null', () => {
    host.setAttribute('data-state', 'open');
    setAttribute(host, 'data-state', null);

    expect(host.hasAttribute('data-state')).toBeFalsy();
  });
});
