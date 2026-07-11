import { useEvents } from 'ydin/controllers/useEvents.js';
import type { ControlledElement } from 'ydin/element.js';
import { createEventNotifier, type EventNotifier } from 'ydin/utils/DOM.js';

export const notify: EventNotifier<'change' | 'input' | 'secondaryaction'> =
  createEventNotifier({
    input: { cancelable: false },
    // `change` is not composed, so a native `change` fired inside the shadow
    // tree never crosses the host boundary — we re-emit it here. `input` and
    // `click` are composed and reach consumers on their own.
    change: { cancelable: false, composed: false },
    secondaryaction: { cancelable: false },
  });

/**
 * Delegates clicks originating directly on a custom-element host to its
 * internal native control.
 *
 * @remarks Clicks originating from the internal control pass through
 * unchanged. A direct host click is suppressed and replaced by the native
 * control's activation so consumers observe one native event sequence.
 *
 * @param host - Custom-element host receiving direct activation.
 * @param target - Internal native control that owns activation behavior.
 */
export function useClickActivation(
  host: ControlledElement,
  target: HTMLElement,
): void {
  useEvents(host, {
    click: [
      (event) => {
        if (event.composedPath()[0] !== host) {
          return;
        }

        // The host has no native click default of its own; `preventDefault`
        // guards the form-associated case, where activating the host would
        // otherwise trigger implicit submission alongside the delegated click.
        event.preventDefault();
        event.stopImmediatePropagation();
        target.click();
      },
      { capture: true },
    ],
  });
}
