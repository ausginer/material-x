import { describe, expect, it, beforeEach } from 'vitest';
import { setAttribute, Bool, Num, Str } from '../src/attribute.ts';

describe('attribute', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
  });

  it('should read missing boolean attribute as false', () => {
    expect(Bool.from(host.getAttribute('disabled'))).toBeFalsy();
  });

  it('should read present boolean attribute as true', () => {
    host.setAttribute('disabled', '');

    expect(Bool.from(host.getAttribute('disabled'))).toBeTruthy();
  });

  it('should write true boolean value as empty attribute', () => {
    setAttribute(host, 'disabled', Bool.to(true));

    expect(host.getAttribute('disabled')).toBe('');
  });

  it('should remove boolean attribute when writing false', () => {
    host.setAttribute('disabled', '');
    setAttribute(host, 'disabled', Bool.to(false));

    expect(host.hasAttribute('disabled')).toBeFalsy();
  });

  it('should read integer attribute through Num converter', () => {
    host.setAttribute('tabindex', '42');

    expect(Num.from(host.getAttribute('tabindex'))).toBe(42);
  });

  it('should read decimal attribute through Num converter', () => {
    host.setAttribute('data-scale', '3.14');

    expect(Num.from(host.getAttribute('data-scale'))).toBe(3.14);
  });

  it('should read zero through Num converter', () => {
    host.setAttribute('tabindex', '0');

    expect(Num.from(host.getAttribute('tabindex'))).toBe(0);
  });

  it('should read missing numeric attribute as null', () => {
    expect(Num.from(host.getAttribute('tabindex'))).toBeNull();
  });

  it('should read empty numeric attribute as null', () => {
    host.setAttribute('tabindex', '');

    expect(Num.from(host.getAttribute('tabindex'))).toBeNull();
  });

  it('should read invalid numeric attribute as null', () => {
    host.setAttribute('tabindex', 'foo');

    expect(Num.from(host.getAttribute('tabindex'))).toBeNull();
  });

  it('should write numeric value as serialized string', () => {
    setAttribute(host, 'tabindex', Num.to(42));

    expect(host.getAttribute('tabindex')).toBe('42');
  });

  it('should remove numeric attribute when writing null', () => {
    host.setAttribute('tabindex', '42');
    setAttribute(host, 'tabindex', Num.to(null));

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it('should remove numeric attribute when writing undefined', () => {
    host.setAttribute('tabindex', '42');
    setAttribute(host, 'tabindex', Num.to(undefined));

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it('should remove numeric attribute when writing NaN', () => {
    host.setAttribute('tabindex', '42');
    setAttribute(host, 'tabindex', Num.to(Number.NaN));

    expect(host.hasAttribute('tabindex')).toBeFalsy();
  });

  it('should read missing string attribute as null', () => {
    expect(Str.from(host.getAttribute('aria-label'))).toBeNull();
  });

  it('should read string attribute unchanged through Str converter', () => {
    host.setAttribute('aria-label', 'Close');

    expect(Str.from(host.getAttribute('aria-label'))).toBe('Close');
  });

  it('should write string value unchanged through Str converter', () => {
    setAttribute(host, 'aria-label', Str.to('Close'));

    expect(host.getAttribute('aria-label')).toBe('Close');
  });

  it('should remove string attribute when writing null', () => {
    host.setAttribute('aria-label', 'Close');
    setAttribute(host, 'aria-label', Str.to(null));

    expect(host.hasAttribute('aria-label')).toBeFalsy();
  });

  it('should remove string attribute when writing undefined', () => {
    host.setAttribute('aria-label', 'Close');
    setAttribute(host, 'aria-label', Str.to(undefined));

    expect(host.hasAttribute('aria-label')).toBeFalsy();
  });

  it('should write attribute value through setAttribute', () => {
    setAttribute(host, 'data-state', 'open');

    expect(host.getAttribute('data-state')).toBe('open');
  });

  it('should remove attribute when setAttribute receives null', () => {
    host.setAttribute('data-state', 'open');
    setAttribute(host, 'data-state', null);

    expect(host.hasAttribute('data-state')).toBeFalsy();
  });
});
