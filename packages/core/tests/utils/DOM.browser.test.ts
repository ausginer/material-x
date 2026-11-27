import { describe, expect, it } from 'vitest';
import { switchState, toggleState } from '../../src/utils/DOM.ts';

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
