import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-link-item.ts';

function createItem(
  tag: 'mx-list-button-item' | 'mx-list-link-item',
): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = 'Item';
  document.body.append(element);
  return element;
}

function getControl(element: HTMLElement): HTMLElement {
  const control = $<HTMLElement>(element, '.host');

  if (!control) {
    throw new Error('Missing internal list item control');
  }

  return control;
}

describe('mx-list-button-item', () => {
  it('should delegate focus to the native button', () => {
    const element = createItem('mx-list-button-item');

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });

  it('should leave focus where it was when the host is disabled', () => {
    const other = document.createElement('input');
    document.body.append(other);
    other.focus();
    const element = createItem('mx-list-button-item');
    element.toggleAttribute('disabled', true);

    element.focus();

    expect(document.activeElement).toBe(other);
  });
});

describe('mx-list-link-item', () => {
  it('should delegate focus to the native anchor', () => {
    const element = createItem('mx-list-link-item');
    element.setAttribute('href', '#target');

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });
});
