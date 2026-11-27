import { describe, expect, it } from 'vitest';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-link-item.ts';

/** Every `aria-*` attribute of the item's control. */
function readControlARIA(item: Element): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Array.from(
      item.shadowRoot!.querySelector('.host')!.attributes,
      ({ name, value }) => [name, value] as const,
    ).filter(([name]) => name.startsWith('aria-')),
  );
}

describe.each([
  { tag: 'mx-list-button-item', current: 'true' },
  { tag: 'mx-list-link-item', current: 'page' },
] as const)('$tag selection', ({ tag, current }) => {
  it('should give the control no ARIA when the item was never selected', () => {
    const item = document.createElement(tag);
    document.body.append(item);

    expect(readControlARIA(item)).toEqual({});
  });

  it(`should give the control only aria-current="${current}" when selected before the connect`, () => {
    const item = document.createElement(tag);
    item.toggleAttribute('selected', true);
    document.body.append(item);

    expect(readControlARIA(item)).toEqual({ 'aria-current': current });
  });

  it(`should give the control only aria-current="${current}" when selected after the connect`, () => {
    const item = document.createElement(tag);
    document.body.append(item);
    item.toggleAttribute('selected', true);

    expect(readControlARIA(item)).toEqual({ 'aria-current': current });
  });

  it(`should give a disabled item's control aria-current="${current}" and no aria-selected when selected before the connect`, () => {
    const item = document.createElement(tag);
    item.toggleAttribute('disabled', true);
    item.toggleAttribute('selected', true);
    document.body.append(item);
    const aria = readControlARIA(item);

    expect(aria).toHaveProperty('aria-current', current);
    expect(aria).not.toHaveProperty('aria-selected');
  });

  it(`should give a disabled item's control aria-current="${current}" and no aria-selected when selected after the connect`, () => {
    const item = document.createElement(tag);
    item.toggleAttribute('disabled', true);
    document.body.append(item);
    item.toggleAttribute('selected', true);
    const aria = readControlARIA(item);

    expect(aria).toHaveProperty('aria-current', current);
    expect(aria).not.toHaveProperty('aria-selected');
  });

  it('should give the control no ARIA after the item is deselected', () => {
    const item = document.createElement(tag);
    document.body.append(item);
    item.toggleAttribute('selected', true);
    item.toggleAttribute('selected', false);

    expect(readControlARIA(item)).toEqual({});
  });
});
