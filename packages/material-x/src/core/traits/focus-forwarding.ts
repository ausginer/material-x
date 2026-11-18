import type { ControlledElement } from '@ydinjs/core/element.js';
import { trait, type Trait } from '@ydinjs/core/traits/primitives.js';
import type { Constructor } from 'type-fest';

const $focusForwarding: unique symbol = Symbol('FocusForwarding');

const controls = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Makes `host.focus()` focus the control that {@link useFocusForwarding}
 * registered, the element that delegating focus picks. Firefox doesn't delegate
 * focus from a host whose box is `display: contents`, which every adopter's host
 * is, so the shadow root's `delegatesFocus` alone leaves focus where it was
 * there (`repo:RF-33`). The shadow root still delegates focus, and this trait
 * goes once Firefox delegates through such a host.
 *
 * `focus()` is a method of the prototype, so a subclass overrides it and
 * reaches the control through `super.focus()`.
 */
export const FocusForwarding: Trait<
  {},
  {},
  typeof $focusForwarding,
  ControlledElement
> = trait(
  (base: Constructor<ControlledElement>) =>
    class extends base {
      override focus(options?: FocusOptions): void {
        controls.get(this)!.focus(options);
      }
    },
  $focusForwarding,
);

/** Branded instance interface of {@link FocusForwarding}. */
export type FocusForwarding = Readonly<Record<typeof $focusForwarding, true>>;

/** Registers `control` as the element that `host.focus()` focuses. */
export function useFocusForwarding(
  host: FocusForwarding & ControlledElement,
  control: HTMLElement,
): void {
  controls.set(host, control);
}
