import { ATTRIBUTE } from '../elements/attribute.ts';
import { type ReactiveElement, use } from '../elements/reactive-element.ts';

export type UpdateCallback = (
  oldValue: string | null,
  newValue: string | null,
) => void;

export function transfer(target: HTMLElement, attr: string): UpdateCallback {
  return (_, value) => ATTRIBUTE.setRaw(target, attr, value);
}

export function useAttributes(
  host: ReactiveElement,
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
