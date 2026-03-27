import { describe, expect, it, beforeEach } from 'vitest';
import attr, { Bool, Num, Str } from '../src/attribute.ts';

describe('attr', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
  });

  it('should read missing boolean attribute as false', () => {
    expect(attr.get(host, 'disabled', Bool)).toBe(false);
  });

  it('should read present boolean attribute as true', () => {
    host.setAttribute('disabled', '');

    expect(attr.get(host, 'disabled', Bool)).toBe(true);
  });

  it('should write true boolean value as empty attribute', () => {
    attr.set(host, 'disabled', true, Bool);

    expect(host.getAttribute('disabled')).toBe('');
  });

  it('should remove boolean attribute when writing false', () => {
    host.setAttribute('disabled', '');
    attr.set(host, 'disabled', false, Bool);

    expect(host.hasAttribute('disabled')).toBe(false);
  });

  it('should read integer attribute through Num converter', () => {
    host.setAttribute('tabindex', '42');

    expect(attr.get(host, 'tabindex', Num)).toBe(42);
  });

  it('should read decimal attribute through Num converter', () => {
    host.setAttribute('data-scale', '3.14');

    expect(attr.get(host, 'data-scale', Num)).toBe(3.14);
  });

  it('should read zero through Num converter', () => {
    host.setAttribute('tabindex', '0');

    expect(attr.get(host, 'tabindex', Num)).toBe(0);
  });

  it('should read missing numeric attribute as null', () => {
    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it('should read empty numeric attribute as null', () => {
    host.setAttribute('tabindex', '');

    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it('should read invalid numeric attribute as null', () => {
    host.setAttribute('tabindex', 'foo');

    expect(attr.get(host, 'tabindex', Num)).toBeNull();
  });

  it('should write numeric value as serialized string', () => {
    attr.set(host, 'tabindex', 42, Num);

    expect(host.getAttribute('tabindex')).toBe('42');
  });

  it('should remove numeric attribute when writing null', () => {
    host.setAttribute('tabindex', '42');
    attr.set(host, 'tabindex', null, Num);

    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('should remove numeric attribute when writing NaN', () => {
    host.setAttribute('tabindex', '42');
    attr.set(host, 'tabindex', Number.NaN, Num);

    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('should read missing string attribute as null', () => {
    expect(attr.get(host, 'aria-label', Str)).toBeNull();
  });

  it('should read string attribute unchanged through Str converter', () => {
    host.setAttribute('aria-label', 'Close');

    expect(attr.get(host, 'aria-label', Str)).toBe('Close');
  });

  it('should write string value unchanged through Str converter', () => {
    attr.set(host, 'aria-label', 'Close', Str);

    expect(host.getAttribute('aria-label')).toBe('Close');
  });

  it('should remove string attribute when writing null', () => {
    host.setAttribute('aria-label', 'Close');
    attr.set(host, 'aria-label', null, Str);

    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('should return raw attribute value through getRaw', () => {
    host.setAttribute('data-state', 'open');

    expect(attr.getRaw(host, 'data-state')).toBe('open');
  });

  it('should return null from getRaw when attribute is missing', () => {
    expect(attr.getRaw(host, 'data-state')).toBeNull();
  });

  it('should write raw attribute value through setRaw', () => {
    attr.setRaw(host, 'data-state', 'open');

    expect(host.getAttribute('data-state')).toBe('open');
  });

  it('should remove attribute when setRaw receives null', () => {
    host.setAttribute('data-state', 'open');
    attr.setRaw(host, 'data-state', null);

    expect(host.hasAttribute('data-state')).toBe(false);
  });
});
