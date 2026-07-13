import attr from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { useConnected } from './useConnected.ts';
import { useMutationObserver } from './useMutationObserver.ts';

/**
 * Transforms a synchronized `aria-*` attribute value before it is written to
 * the target element.
 *
 * @param name - The `aria-*` attribute name being synchronized.
 * @param value - The current serialized attribute value from the host.
 * @returns The serialized value that should be written to the target.
 */
export type ARIATransformer = (
  name: string,
  value: string | null,
) => string | null;

/**
 * Synchronizes `aria-*` attributes from a host element to a target element.
 *
 * Existing `aria-*` attributes are copied when the host connects, and further
 * `aria-*` attribute mutations are mirrored through a `MutationObserver`.
 * Attributes outside the `aria-*` namespace are ignored.
 *
 * @param host - The host element whose `aria-*` attributes should be observed.
 * @param target - The target element that receives the synchronized values.
 * @param transform - Optional transformer applied before each write. Defaults
 *   to an identity transform.
 */
export function useARIA(
  host: ControlledElement,
  target: HTMLElement,
  transform: ARIATransformer = (_, value) => value,
): void {
  useConnected(host, () => {
    for (const { name } of host.attributes) {
      if (name.startsWith('aria-')) {
        attr.setRaw(target, name, transform(name, attr.getRaw(host, name)));
      }
    }
  });

  useMutationObserver(
    host,
    (records) => {
      for (const { type, attributeName: name } of records) {
        if (type === 'attributes' && name?.startsWith('aria-')) {
          attr.setRaw(target, name, transform(name, attr.getRaw(host, name)));
        }
      }
    },
    { attributes: true },
  );
}
