import { describe, expect, it } from 'vitest';
import { useState } from '../../src/controllers/useState.ts';
import { ControlledElement, getInternals } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(attribute: string, ...extra: string[]) {
  class Host extends ControlledElement {
    static observedAttributes = [attribute, ...extra];

    constructor() {
      super();
      useState(this, attribute as keyof Host & string);
    }
  }

  defineCE(nameCE(), Host);

  return new Host();
}

describe('useState', () => {
  it('should add the state when the attribute is set', () => {
    const host = createHost('checked');
    const internals = getInternals(host);

    host.setAttribute('checked', '');

    expect(internals.states.has('checked')).toBe(true);
  });

  it('should remove the state when the attribute is removed', () => {
    const host = createHost('checked');
    const internals = getInternals(host);

    host.setAttribute('checked', '');
    host.removeAttribute('checked');

    expect(internals.states.has('checked')).toBe(false);
  });

  it('should not add the state for an unrelated attribute change', () => {
    const host = createHost('checked', 'disabled');
    const internals = getInternals(host);

    host.setAttribute('disabled', '');

    expect(internals.states.has('checked')).toBe(false);
  });
});
