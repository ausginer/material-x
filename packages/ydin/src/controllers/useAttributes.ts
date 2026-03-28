import attr from '../attribute.ts';
import { type ControlledElement, use } from '../element.ts';

/**
 * Handles a serialized host attribute update.
 *
 * @param oldValue - The previous serialized attribute value.
 * @param newValue - The next serialized attribute value.
 */
export type UpdateCallback = (
  oldValue: string | null,
  newValue: string | null,
) => void;

/**
 * Creates an update callback that mirrors a host attribute to a target
 * attribute of the same serialized shape.
 *
 * @param target - Element that should receive the mirrored attribute value.
 * @param attribute - Target attribute name to write.
 * @param transform - Optional transformer applied before writing the value.
 *
 * @returns Update callback that forwards the new serialized value.
 */
export function transfer(
  target: HTMLElement,
  attribute: string,
  transform: (value: string | null) => string | null = (value) => value,
): UpdateCallback {
  return (_, value) => attr.setRaw(target, attribute, transform(value));
}

/**
 * Registers attribute update handlers on a host element.
 *
 * @remarks This helper reacts only to the host `attrChanged` lifecycle and
 * forwards updates only when `oldValue !== newValue`. The relevant attributes
 * still need to be listed in the host `observedAttributes`.
 *
 * @param host - Host element that emits attribute changes.
 * @param attributes - Mapping from observed attribute names to update handlers.
 */
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
