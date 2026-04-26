import attr from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { useAttributes } from './useAttributes.ts';
import { useEvents } from './useEvents.ts';

/**
 * Mirrors navigation attributes from a host element to a shadow-DOM anchor.
 *
 * @remarks
 * The controller treats `disabled` as host-owned state. While disabled, the
 * target anchor is removed from native navigation and focus by clearing `href`
 * and setting `tabIndex` to `-1`; when re-enabled, host-authored `href`,
 * `tabindex`, and `aria-disabled` values are restored.
 *
 * The host must observe `href`, `target`, and `disabled` for those updates to
 * be forwarded through {@link useAttributes}.
 *
 * @param host - Host element that owns anchor attributes.
 * @param target - Shadow-DOM anchor that performs native navigation.
 */
export function useAnchor(
  host: ControlledElement,
  target: HTMLAnchorElement,
): void {
  useAttributes(host, {
    target: (_, value) => {
      target.target = value ?? '';
    },
    href: (_, value) => {
      if (!host.hasAttribute('disabled')) {
        attr.setRaw(target, 'href', value);
      }
    },
    disabled: (_, value) => {
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
