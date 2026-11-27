import { internals, type ControlledElement } from '../element.ts';
import type { Typeable } from '../traits/typeable.ts';
import { useEvents } from './useEvents.ts';

/**
 * Wires outer-form participation for a form-associated button host.
 *
 * @remarks On activation the host acts like a native submit/reset button of the
 * ancestor form reached through its `ElementInternals`: `type="submit"` (the
 * default) requests submission and attributes it to the host as the submitter,
 * `type="reset"` resets the form, and `type="button"` does nothing. The
 * internal native control lives in the shadow tree and cannot reach the outer
 * form on its own, so the host drives the form explicitly. A click whose
 * default was prevented does nothing: that includes the host click that
 * `useClickActivation` cancels and replaces with its control's click.
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
