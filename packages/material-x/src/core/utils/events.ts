import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import type { Typeable } from '@ydinjs/core/traits/typeable.js';
import {
  createEventNotifier,
  type EventNotifier,
} from '@ydinjs/core/utils/DOM.js';

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

/**
 * Wires outer-form participation for a form-associated button host.
 *
 * @remarks On activation the host acts like a native submit/reset button of the
 * ancestor form reached through its `ElementInternals`: `type="submit"` (the
 * default) requests submission and attributes it to the host as the submitter,
 * `type="reset"` resets the form, and `type="button"` does nothing. The
 * internal native control lives in the shadow tree and cannot reach the outer
 * form on its own, so the host drives the form explicitly.
 *
 * @param host - Form-associated custom-element host. Its optional `type` field
 *   selects the behavior and defaults to `"submit"`.
 */
export function useFormActivation(host: ControlledElement & Typeable): void {
  const innards = internals(host);

  useEvents(host, {
    click(event) {
      // Skip the suppressed host-origin click (see `useClickActivation`) and any
      // activation a consumer already cancelled.
      if (event.defaultPrevented) {
        return;
      }

      const { form } = innards;
      if (!form) {
        return;
      }

      const type = host.type ?? 'submit';
      if (type === 'button') {
        return;
      }

      if (type === 'reset') {
        form.reset();
        return;
      }

      // Attribute the submission to the host so `submit` listeners observe it as
      // the submitter, matching a native submit button.
      form.addEventListener(
        'submit',
        (submitEvent) => {
          Object.defineProperty(submitEvent, 'submitter', {
            configurable: true,
            value: host,
          });
        },
        { once: true, capture: true },
      );
      form.requestSubmit();
    },
  });
}
