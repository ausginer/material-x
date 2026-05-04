import { Bool } from '../attribute.ts';
import { getInternals, type ControlledElement } from '../element.ts';
import { toggleState } from '../utils/DOM.ts';
import { useAttributes, via } from './useAttributes.ts';

export function useState<T extends ControlledElement>(
  host: T,
  attribute: keyof T & string,
): void {
  const internals = getInternals(host);

  useAttributes(host, {
    [attribute]: via(Bool, (_, value) =>
      toggleState(internals, attribute, value),
    ),
  });
}
