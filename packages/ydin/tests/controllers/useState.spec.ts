import { describe, expect, it } from 'vitest';
import {
  useState,
  type StateCondition,
} from '../../src/controllers/useState.ts';
import { ControlledElement, getInternals } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createHost(
  attribute: string,
  extra: readonly string[] = [],
  state?: string,
  condition?: StateCondition,
) {
  class Host extends ControlledElement {
    static observedAttributes = [attribute, ...extra];

    constructor() {
      super();
      useState(this, attribute as keyof Host & string, state, condition);
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
    const host = createHost('checked', ['disabled']);
    const internals = getInternals(host);

    host.setAttribute('disabled', '');

    expect(internals.states.has('checked')).toBe(false);
  });

  it('should use a custom state name when provided', () => {
    const host = createHost('aria-disabled', [], 'disabled');
    const internals = getInternals(host);

    host.setAttribute('aria-disabled', '');

    expect(internals.states.has('disabled')).toBe(true);
    expect(internals.states.has('aria-disabled')).toBe(false);
  });

  it('should apply a custom condition to determine state presence', () => {
    const condition: StateCondition = (value) => value === 'true';
    const host = createHost('active', [], undefined, condition);
    const internals = getInternals(host);

    host.setAttribute('active', 'true');
    expect(internals.states.has('active')).toBe(true);

    host.setAttribute('active', 'false');
    expect(internals.states.has('active')).toBe(false);

    host.removeAttribute('active');
    expect(internals.states.has('active')).toBe(false);
  });

  it('should reflect a pre-set attribute as state after upgrade', () => {
    const tag = nameCE();

    document.body.innerHTML = `<${tag} checked></${tag}>`;

    class Host extends ControlledElement {
      static observedAttributes = ['checked'];

      constructor() {
        super();
        useState(this, 'checked' as keyof Host & string);
      }
    }

    defineCE(tag, Host);

    const host = document.querySelector(tag) as Host;
    const internals = getInternals(host);

    expect(internals.states.has('checked')).toBe(true);
  });

  it('should manage multiple states independently on the same host', () => {
    class Host extends ControlledElement {
      static observedAttributes = ['checked', 'disabled'];

      constructor() {
        super();
        useState(this, 'checked' as keyof Host & string);
        useState(this, 'disabled' as keyof Host & string);
      }
    }

    defineCE(nameCE(), Host);

    const host = new Host();
    const internals = getInternals(host);

    host.setAttribute('checked', '');

    expect(internals.states.has('checked')).toBe(true);
    expect(internals.states.has('disabled')).toBe(false);

    host.setAttribute('disabled', '');

    expect(internals.states.has('checked')).toBe(true);
    expect(internals.states.has('disabled')).toBe(true);

    host.removeAttribute('checked');

    expect(internals.states.has('checked')).toBe(false);
    expect(internals.states.has('disabled')).toBe(true);
  });
});
