import { Bool } from '../attribute.ts';
import { getInternals, type ControlledElement } from '../element.ts';
import { toggleState } from '../utils/DOM.ts';
import { useAttributes } from './useAttributes.ts';

export type StateCondition = (value: string | null) => boolean;

export function useState<T extends ControlledElement>(
  host: T,
  attribute: keyof T & string,
  state: string = attribute,
  condition: StateCondition = Bool.from,
): void {
  const internals = getInternals(host);

  useAttributes(host, {
    [attribute](_, value) {
      toggleState(internals, state, condition(value));
    },
  });
}
