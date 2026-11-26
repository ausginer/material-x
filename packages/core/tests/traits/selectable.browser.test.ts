import { describe, expect, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import { compose, type Composed } from '../../src/traits/composition.ts';
import type { Selectable } from '../../src/traits/selectable.ts';
import { defineCE, nameCE } from '../browser.ts';

function createElement<T extends CustomElementConstructor>(
  element: T,
): InstanceType<T> {
  const tag = nameCE();

  defineCE(tag, element);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return document.createElement(tag) as InstanceType<T>;
}

const SelectableBase: Composed<typeof ControlledElement, [typeof Selectable]> =
  compose(ControlledElement);

class SelectableElement extends SelectableBase {}

function createSelectableClass() {
  return class extends SelectableElement {};
}

describe('Selectable', () => {
  it('should read a missing selected field as false', () => {
    const element = createElement(createSelectableClass());

    expect(element.selected).toBeFalsy();
  });

  it('should write selected through a generated accessor', () => {
    const element = createElement(createSelectableClass());

    element.selected = true;

    expect(element.getAttribute('selected')).toBe('');
  });
});
