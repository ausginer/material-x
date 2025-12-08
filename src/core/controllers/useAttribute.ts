import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type UpdateCallback = (
  oldValue: string | null,
  newValue: string | null,
) => void;

export function useAttribute(
  host: ReactiveElement,
  name: string,
  update: UpdateCallback,
): void {
  use(host, {
    attrChanged(attributeName, oldValue, newValue) {
      if (attributeName === name && oldValue !== newValue) {
        update(oldValue, newValue);
      }
    },
  });
}
