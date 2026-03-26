import { attr } from '../attribute.ts';
import { type ControlledElement, use } from '../controlled-element.ts';

export type UpdateCallback = (
  oldValue: string | null,
  newValue: string | null,
) => void;

export function transfer(
  target: HTMLElement,
  attribute: string,
): UpdateCallback {
  return (_, value) => attr.setRaw(target, attribute, value);
}

export function useAttributes(
  host: ControlledElement,
  attributes: Readonly<Record<string, UpdateCallback>>,
): void {
  use(host, {
    attrChanged(name, oldValue, newValue) {
      if (attributes[name] && oldValue !== newValue) {
        attributes[name](oldValue, newValue);
      }
    },
  });
}
