import { describe, expect, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import {
  Selectable,
  type Selectable as SelectableInterface,
  useSelectable,
} from '../../src/traits/selectable.ts';
import { impl } from '../../src/traits/traits.ts';
import { defineCE, nameCE } from '../browser.ts';

function createElement<T extends CustomElementConstructor>(
  element: T,
): InstanceType<T> {
  const tag = nameCE();

  defineCE(tag, element);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return document.createElement(tag) as InstanceType<T>;
}

function createSelectableClass() {
  return impl(ControlledElement, [Selectable] as const);
}

function createHostWithTarget() {
  const SelectableElement = createSelectableClass();
  const native = document.createElement('div');

  class Host extends SelectableElement {
    constructor() {
      super();
      useSelectable(this as SelectableInterface & ControlledElement, native);
    }
  }

  return [Host, native] as const;
}

describe('Selectable', () => {
  it('should read a missing selected field as false', () => {
    const element = createElement(createSelectableClass());

    expect(element.selected).toBe(false);
  });

  it('should write selected through a generated accessor', () => {
    const element = createElement(createSelectableClass());

    element.selected = true;

    expect(element.getAttribute('selected')).toBe('');
  });

  it('should write true aria-selected on the target when selected is present', () => {
    const [Host, native] = createHostWithTarget();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.selected = true;

    expect(native.ariaSelected).toBe('true');
  });

  it('should write false aria-selected on the target when selected is removed', () => {
    const [Host, native] = createHostWithTarget();

    defineCE(nameCE(), Host);

    const host = new Host();

    host.selected = true;
    host.selected = false;

    expect(native.ariaSelected).toBe('false');
  });
});
