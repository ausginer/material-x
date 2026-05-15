import attr, {
  Bool,
  type AttributePrimitive,
  type ConverterOf,
  type NullablePrimitive,
} from '../attribute.ts';
import { use, type ControlledElement } from '../element.ts';
import { toggleState } from '../utils/DOM.js';

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

export type ConvertedUpdateCallback<
  T extends AttributePrimitive = AttributePrimitive,
> = (oldValue: NullablePrimitive<T>, newValue: NullablePrimitive<T>) => void;

/**
 * Wraps an update callback with a converter, passing typed values instead of
 * raw serialized strings.
 *
 * @param converter - Converter used to deserialize old and new attribute values.
 * @param callback - Callback that receives the converted typed values.
 *
 * @returns Update callback that deserializes both values before forwarding.
 */
export function via<T extends AttributePrimitive = AttributePrimitive>(
  { from }: ConverterOf<T>,
  callback: ConvertedUpdateCallback<T>,
): UpdateCallback {
  return (oldValue, newValue) => callback(from(oldValue), from(newValue));
}

/**
 * Condition evaluated on each attribute change to determine whether a custom
 * state should be present.
 *
 * Receives both the previous and next serialized attribute values so that
 * transition-sensitive conditions (e.g. "was absent, now present") are
 * expressible.
 */
export type StateCondition = (
  oldValue: string | null,
  newValue: string | null,
) => boolean;

/**
 * Creates an update callback that toggles a custom state on the host
 * `ElementInternals` in response to an attribute change.
 *
 * @param host - Host element whose internals carry the custom state.
 * @param attribute - Observed attribute that drives the state. Typed against
 *   the host so only known attribute names are accepted.
 * @param state - Custom state token to toggle. Defaults to `attribute`.
 * @param condition - Predicate that maps old and new attribute values to a
 *   boolean. Defaults to presence-based `Bool.from` applied to the new value.
 *
 * @returns Update callback suitable for use inside a `useAttributes` map.
 */
export function toState(
  internals: ElementInternals,
  state: string,
  condition: StateCondition = (_, value) => Bool.from(value),
): UpdateCallback {
  return (oldValue, newValue) =>
    toggleState(internals, state, condition(oldValue, newValue));
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
