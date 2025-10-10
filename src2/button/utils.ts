import { group } from '../core/tokens/group.ts';
import { pseudoClass, selector } from '../core/tokens/selector.ts';
import { CSSVariable, type CSSVariableSet } from '../core/tokens/variable.js';

function groupCallback(tokenName: string): readonly string[] {
  const groups: string[] = [];
  let remaining = tokenName;

  // Level 1: Selection state
  if (remaining.includes('unselected.')) {
    groups.push('unselected');
    remaining = remaining.replace('unselected.', '');
  } else if (remaining.includes('selected.')) {
    groups.push('selected');
    remaining = remaining.replace('selected.', '');
  }

  // Level 2: Interaction state
  if (remaining.includes('focused.')) {
    groups.push('focused');
    remaining = remaining.replace('focused.', '');
  } else if (remaining.includes('hovered.')) {
    groups.push('hovered');
    remaining = remaining.replace('hovered.', '');
  } else if (remaining.includes('pressed.')) {
    groups.push('pressed');
    remaining = remaining.replace('pressed.', '');
  } else if (remaining.includes('disabled.')) {
    groups.push('disabled');
    remaining = remaining.replace('disabled.', '');
  } else {
    groups.push('default');
  }

  return [...groups, remaining];
}

export type SimpleButtonStates<T> = Readonly<{
  default: T;
  hovered?: T;
  focused?: T;
  pressed?: T;
  disabled?: T;
}>;

export type ButtonStates<T> = SimpleButtonStates<T> &
  Readonly<{
    selected: SimpleButtonStates<T>;
    unselected: SimpleButtonStates<T>;
  }>;

export function groupForButtons(
  set: CSSVariableSet,
): ButtonStates<CSSVariableSet> {
  return group(set, groupCallback) as ButtonStates<CSSVariableSet>;
}

export type ButtonPrefixData = Readonly<{
  state: string;
  type?: string;
  selectedState?: string;
}>;

export function createPrefix({
  state,
  type,
  selectedState,
}: ButtonPrefixData): string {
  return `md-${type ? `${type}-` : ''}button-${selectedState ? `${selectedState}-` : ''}${state}`;
}

export type PackGroup = ButtonStates<string>;

export function createShapeTransformer(
  vars: Readonly<Record<string, CSSVariable>>,
): (variable: CSSVariable, path: readonly string[]) => CSSVariable {
  return (variable, path) => {
    const containerHeight = vars['container.height'];

    if (!containerHeight) {
      throw new Error(
        'container.height variable is required for shape transformation.',
      );
    }

    if (
      path.some((p) => p.includes('container.shape')) &&
      variable.value === 'full'
    ) {
      return CSSVariable.withValue(
        variable,
        `calc(${containerHeight.ref} / 2)`,
      );
    }

    return variable;
  };
}

export const state = {
  default(...params: readonly string[]): string {
    return selector(':host', ...params);
  },
  hovered(...params: readonly string[]): string {
    return selector(':host', pseudoClass('hover'), ...params);
  },
  focused(...params: readonly string[]): string {
    return selector(':host', pseudoClass('focus-visible'), ...params);
  },
  pressed(...params: readonly string[]): string {
    return selector(':host', pseudoClass('active'), ...params);
  },
  disabled(...params: readonly string[]): string {
    return selector(':host', pseudoClass('disabled'), ...params);
  },
} as const;
