import { ATTRIBUTE } from '../elements/attribute.ts';
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

export function useAttributeTransfer(
  host: ReactiveElement,
  target: HTMLElement,
  attrs: Readonly<Record<string, string>>,
): void {
  for (const [hostAttr, targetAttr] of Object.entries(attrs)) {
    useAttribute(host, hostAttr, (_, value) =>
      ATTRIBUTE.setRaw(target, targetAttr, value),
    );
  }
}
