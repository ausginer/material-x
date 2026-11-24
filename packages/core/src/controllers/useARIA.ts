import { setAttribute } from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { useConnected } from './useConnected.ts';

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
 * Each change of a host's `aria-*` attribute is written to the target once, in
 * a microtask, or at the next connect if that is first. It doesn't matter
 * whether the host is connected. An attribute that the host loses is
 * transformed from `null`. The host's current `aria-*` attributes are also
 * copied on each connect, so there the host's value wins.
 *
 * The target's own writer may set the same attribute, and the last write
 * stands. A connect doesn't remove what was written to the target after the
 * host's loss, nor an `aria-*` attribute that the host has never had.
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
  const sync = (name: string | null): void => {
    if (name?.startsWith('aria-')) {
      setAttribute(target, name, transform(name, host.getAttribute(name)));
    }
  };

  // It isn't tied to the connection, because an attribute that the host loses
  // while disconnected is a change too.
  const observer = new MutationObserver((records) => {
    for (const { attributeName } of records) {
      sync(attributeName);
    }
  });

  observer.observe(host, { attributes: true });

  // The pending records are taken, so that the target has no lost value after
  // the connect. One `Set` with the host's names writes each name once.
  useConnected(host, () => {
    new Set([
      ...observer.takeRecords().map(({ attributeName }) => attributeName),
      ...host.getAttributeNames(),
    ]).forEach(sync);
  });
}
