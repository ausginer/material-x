import { describe, expect, it, vi } from 'vitest';
import {
  $,
  $$,
  DEFAULT_EVENT_INIT,
  notify,
  toggleState,
} from '../../src/utils/DOM.ts';

function createHost(): HTMLDivElement {
  return document.createElement('div');
}

describe('$', () => {
  it('should query the host shadow root', () => {
    const host = createHost();
    const root = host.attachShadow({ mode: 'open' });
    const target = document.createElement('button');

    target.className = 'target';
    root.append(target);

    expect($(host, '.target')).toBe(target);
  });

  it('should return undefined when the host has no shadow root', () => {
    const host = createHost();

    expect($(host, '.target')).toBeUndefined();
  });
});

describe('$$', () => {
  it('should query all matching elements in the host shadow root', () => {
    const host = createHost();
    const root = host.attachShadow({ mode: 'open' });
    const first = document.createElement('button');
    const second = document.createElement('button');

    first.className = 'target';
    second.className = 'target';
    root.append(first, second);

    expect(Array.from($$(host, '.target') ?? [])).toEqual([first, second]);
  });

  it('should return undefined when the host has no shadow root', () => {
    const host = createHost();

    expect($$(host, '.target')).toBeUndefined();
  });
});

describe('DEFAULT_EVENT_INIT', () => {
  it('should expose bubbling composed cancelable defaults', () => {
    expect(DEFAULT_EVENT_INIT).toEqual({
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  });
});

describe('notify', () => {
  it('should dispatch all requested events', () => {
    const target = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();

    target.addEventListener('first', first);
    target.addEventListener('second', second);

    notify(target, 'first', 'second');

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('should dispatch bubbling composed cancelable events', () => {
    const target = document.createElement('div');
    const states: EventInit[] = [];

    target.addEventListener('test', (event) => {
      states.push({
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
      });
    });

    notify(target, 'test');

    expect(states).toEqual([
      {
        bubbles: true,
        cancelable: true,
        composed: true,
      },
    ]);
  });
});

describe('toggleState', () => {
  it('should add a state when condition is true', () => {
    const states = new Set<string>();

    toggleState(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      { states } as ElementInternals,
      'active',
      true,
    );

    expect(states.has('active')).toBe(true);
  });

  it('should remove a state when condition is false', () => {
    const states = new Set<string>(['active']);

    toggleState(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      { states } as ElementInternals,
      'active',
      false,
    );

    expect(states.has('active')).toBe(false);
  });
});
