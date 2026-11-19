import type { ControlledElement } from '@ydinjs/core/element.js';
import { Controlled } from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

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
export class FocusForwarding extends Controlled {
  static {
    trait(this);
  }

  // The field exists for its type: it makes the trait nominal, because its
  // members are its bound's.
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;

  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}

/** Registers `control` as the element that `host.focus()` focuses. */
export function useFocusForwarding(
  host: FocusForwarding & ControlledElement,
  control: HTMLElement,
): void {
  controls.set(host, control);
}
