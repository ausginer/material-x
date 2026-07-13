import attr, { Str, type ConverterOf } from '../attribute.ts';
import { useAttributes } from '../controllers/useAttributes.ts';
import { useEvents } from '../controllers/useEvents.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $linkable: unique symbol = Symbol('Linkable');

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
export const Linkable: Trait<
  { href: string | null; target: string | null },
  typeof $linkable
> = trait(LINKABLE_ATTRS, $linkable);

/**
 * Branded instance interface derived from {@link Linkable}.
 */
export type Linkable = Interface<typeof Linkable>;

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
      attr.setRaw(target, 'href', value);
    },
  });
}

/**
 * Manages `disabled` state on a shadow-DOM anchor, keeping `href` and focus
 * in sync with the host's disabled attribute.
 *
 * @remarks
 * Call after {@link useLinkable}. While disabled: clears `href`, sets
 * `tabIndex` to `-1`, marks `aria-disabled`; on re-enable, restores
 * host-authored values. Also blocks click propagation while disabled.
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
        attr.setRaw(target, 'href', null);
      }
    },
    disabled(_, value) {
      if (value != null) {
        target.ariaDisabled = 'true';
        target.tabIndex = -1;
        attr.setRaw(target, 'href', null);
      } else {
        target.ariaDisabled = attr.getRaw(host, 'aria-disabled');
        attr.setRaw(target, 'tabindex', attr.getRaw(host, 'tabindex'));
        attr.setRaw(target, 'href', attr.getRaw(host, 'href'));
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
