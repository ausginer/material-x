import { describe, expect, it } from 'vitest';
import {
  $,
  $$,
  createEventNotifier,
  DEFAULT_EVENT_INIT,
  switchState,
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

describe('createEventNotifier', () => {
  it('should dispatch requested events in order', () => {
    const target = document.createElement('div');
    const types: string[] = [];
    const notifyEvent = createEventNotifier({ first: {}, second: {} });

    target.addEventListener('first', (event) => {
      types.push(event.type);
    });
    target.addEventListener('second', (event) => {
      types.push(event.type);
    });

    notifyEvent(target, 'first', 'second');

    expect(types).toEqual(['first', 'second']);
  });

  it('should create a fresh event for every dispatch', () => {
    const target = document.createElement('div');
    const events: Event[] = [];
    const notifyEvent = createEventNotifier({ test: {} });

    target.addEventListener('test', (event) => {
      events.push(event);
    });

    notifyEvent(target, 'test', 'test');

    expect(events[0]).not.toBe(events[1]);
  });

  it('should merge definitions over the default initialization', () => {
    const target = document.createElement('div');
    const states: EventInit[] = [];
    const notifyEvent = createEventNotifier({
      test: { cancelable: false, composed: false },
    });

    target.addEventListener('test', (event) => {
      states.push({
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
      });
    });

    notifyEvent(target, 'test');

    expect(states).toEqual([
      {
        bubbles: true,
        cancelable: false,
        composed: false,
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

    expect(states.has('active')).toBeTruthy();
  });

  it('should remove a state when condition is false', () => {
    const states = new Set<string>(['active']);

    toggleState(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      { states } as ElementInternals,
      'active',
      false,
    );

    expect(states.has('active')).toBeFalsy();
  });
});

describe('switchState', () => {
  it('should add the new state when oldState is null', () => {
    const states = new Set<string>();

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    switchState({ states } as ElementInternals, null, 'elevated');

    expect(states.has('elevated')).toBeTruthy();
  });

  it('should remove the old state when newState is null', () => {
    const states = new Set<string>(['elevated']);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    switchState({ states } as ElementInternals, 'elevated', null);

    expect(states.has('elevated')).toBeFalsy();
  });

  it('should switch from old state to new state', () => {
    const states = new Set<string>(['elevated']);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    switchState({ states } as ElementInternals, 'elevated', 'outlined');

    expect(states.has('elevated')).toBeFalsy();
    expect(states.has('outlined')).toBeTruthy();
  });

  it('should do nothing when both are null', () => {
    const states = new Set<string>();

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    switchState({ states } as ElementInternals, null, null);

    expect(states.size).toBe(0);
  });
});
