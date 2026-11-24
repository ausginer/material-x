import { setAttribute } from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { useConnected } from './useConnected.ts';

/**
 * Transforms a synchronized `aria-*` attribute value before it is written to
 * the target element.
 *
 * @param name - The `aria-*` attribute name being synchronized.
 * @param value - The current serialized attribute value from the host, or
 *   `null` if the host doesn't have the attribute.
 * @returns The serialized value to write to the target, or `null` to give it
 *   the component's own value, set through {@link setOwnARIA}, or no attribute
 *   if there is none.
 */
export type ARIATransformer = (
  name: string,
  value: string | null,
) => string | null;

const ownWriters = new WeakMap<
  HTMLElement,
  (name: string, value: string | null) => void
>();

/**
 * Sets the component's own value of an `aria-*` attribute of `target`.
 *
 * If {@link useARIA} mirrors a host to `target`, the value is kept, and
 * `target` has it while the mirrored value is `null`. The mirrored value is the
 * transformer's answer, or the host's value if there is no transformer. If no
 * host is mirrored to `target`, the value is written to it.
 *
 * @remarks Call it after {@link useARIA}. A value set before is written, but
 * isn't kept.
 *
 * @param target - The element that has the attribute.
 * @param name - The `aria-*` attribute name.
 * @param value - The serialized value, or `null` for none.
 */
export function setOwnARIA(
  target: HTMLElement,
  name: string,
  value: string | null,
): void {
  const write = ownWriters.get(target);

  if (write) {
    write(name, value);
  } else {
    setAttribute(target, name, value);
  }
}

/**
 * Synchronizes `aria-*` attributes from a host element to a target element.
 *
 * Each change of a host's `aria-*` attribute is written to the target in a
 * microtask, or at the next connect if that is first. A call of
 * {@link setOwnARIA} for that name before then writes it at once, and the
 * microtask or the connect writes it again. It doesn't matter whether the host
 * is connected. An attribute that the host loses is transformed from `null`.
 * The host's current `aria-*` attributes are also copied on each connect.
 *
 * If the transformed value is `null`, the target has the component's own value,
 * set through {@link setOwnARIA}, or no attribute if there is none. Otherwise
 * it has the transformed value, whatever the order in which the host's
 * attribute and the own value changed.
 *
 * A value that is written to the target in any other way isn't kept, and the
 * last write stands. A connect doesn't remove what was written to the target
 * after the host's loss was written, nor an `aria-*` attribute that the host
 * has never had. Attributes outside the `aria-*` namespace are ignored.
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
  const own = new Map<string, string | null>();

  const sync = (name: string | null): void => {
    if (name?.startsWith('aria-')) {
      setAttribute(
        target,
        name,
        transform(name, host.getAttribute(name)) ?? own.get(name) ?? null,
      );
    }
  };

  ownWriters.set(target, (name, value) => {
    own.set(name, value);
    sync(name);
  });

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
