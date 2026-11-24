import { setAttribute, Str, type ConverterOf } from '../attribute.ts';
import { setOwnARIA } from '../controllers/useARIA.ts';
import { useAttributes } from '../controllers/useAttributes.ts';
import { useEvents } from '../controllers/useEvents.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const LINKABLE_ATTRS: Readonly<{
  href: ConverterOf<string>;
  target: ConverterOf<string>;
}> = {
  href: Str,
  target: Str,
};

/**
 * Element trait that exposes `href` and `target` navigation fields.
 */
@trait
@attributes(LINKABLE_ATTRS)
export class Linkable extends AnyElement {
  accessor href!: string | null;
  accessor target!: string | null;
}

/**
 * Framework-facing props derived from {@link Linkable}.
 */
export type LinkableProps = Props<typeof Linkable>;

/**
 * Mirrors `href` and `target` from `host` to a shadow-DOM anchor.
 *
 * @param host - Host element that owns the navigation attributes.
 * @param target - Shadow-DOM anchor that performs native navigation.
 */
export function useLinkable(
  host: ControlledElement,
  target: HTMLAnchorElement,
): void {
  useAttributes(host, {
    target(_, value) {
      target.target = value ?? '';
    },
    href(_, value) {
      setAttribute(target, 'href', value);
    },
  });
}

/**
 * Manages `disabled` state on a shadow-DOM anchor, keeping `href` and focus
 * in sync with the host's disabled attribute.
 *
 * @remarks
 * Call after {@link useLinkable}. While disabled: clears `href`, sets
 * `tabIndex` to `-1`, and sets the component's own `aria-disabled`. On
 * re-enable: removes that value, and restores the host's `href` and `tabindex`.
 * A host's `aria-disabled` is `useARIA`'s. Also blocks click propagation while
 * disabled.
 *
 * @param host - Host element that owns navigation and disabled attributes.
 * @param target - Shadow-DOM anchor that performs native navigation.
 */
export function useDisableableLinkable(
  host: ControlledElement,
  target: HTMLAnchorElement,
): void {
  useAttributes(host, {
    href() {
      if (host.hasAttribute('disabled')) {
        setAttribute(target, 'href', null);
      }
    },
    disabled(_, value) {
      if (value != null) {
        setOwnARIA(target, 'aria-disabled', 'true');
        target.tabIndex = -1;
        setAttribute(target, 'href', null);
      } else {
        setOwnARIA(target, 'aria-disabled', null);
        setAttribute(target, 'tabindex', host.getAttribute('tabindex'));
        setAttribute(target, 'href', host.getAttribute('href'));
      }
    },
  });

  useEvents(
    host,
    {
      click: (event) => {
        if (host.hasAttribute('disabled')) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
    target,
  );
}
