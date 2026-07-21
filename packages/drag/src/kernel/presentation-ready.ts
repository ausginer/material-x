/**
 * The consumer-owned authored-presentation readiness barrier.
 *
 * An accepted (or rejected) resolution may carry a `presentationReady` promise
 * meaning "my persistent, authored presentation for this outcome has actually
 * been committed". The engine holds the temporary presentation — the lift and
 * the placeholder — until that promise settles, so the authored DOM is never
 * revealed before it exists.
 *
 * This module owns only the *waiting*: currency tagging, the bounded timeout,
 * and making stale settlement inert. It never observes slots, mutations,
 * collections, or framework state — readiness is an explicit consumer
 * acknowledgement, not something the kernel infers. Framework adapters supply
 * the promise however they like (React resolves it from `useLayoutEffect`, a
 * web component after the relevant `slotchange`, an imperative consumer
 * immediately after mutating the DOM).
 */
import type { ResolutionCurrency } from './protocol.ts';
import type { DOMRealm } from './realm.ts';
import type { Disposer } from './resource-scope.ts';

/**
 * How long to wait for a consumer's `presentationReady` before giving up.
 *
 * A promise that never settles would otherwise strand the gesture forever —
 * lift held, placeholder pinned, container undraggable — with no abort path.
 * Timing out is a presentation failure, but cleanup still runs: a late authored
 * render is a visual glitch, a stuck gesture is a broken component.
 */
export const PRESENTATION_READY_TIMEOUT = 500;

/**
 * Waits for `ready`, reporting exactly once through `onSettled` with the error
 * that failed it, or `null` on success. A timeout reports a `TimeoutError`
 * `DOMException`.
 *
 * `currency` is echoed back so the feature can drop a settlement belonging to an
 * operation or resolution that has since been superseded — a promise from an
 * abandoned gesture can never resolve into the next one.
 *
 * Disposing drops the watch: any later settlement or timeout becomes inert.
 */
export function watchPresentationReady(
  ready: PromiseLike<void>,
  currency: ResolutionCurrency,
  realm: DOMRealm,
  onSettled: (currency: ResolutionCurrency, error: unknown) => void,
): Disposer {
  let done = false;
  let timer = 0;

  const settle = (error: unknown): void => {
    if (done) {
      return;
    }

    done = true;
    realm.window.clearTimeout(timer);
    onSettled(currency, error);
  };

  timer = realm.window.setTimeout(() => {
    settle(
      new DOMException(
        `drag: presentationReady did not settle within ${PRESENTATION_READY_TIMEOUT}ms`,
        'TimeoutError',
      ),
    );
  }, PRESENTATION_READY_TIMEOUT);

  Promise.resolve(ready).then(
    () => {
      settle(null);
    },
    (error: unknown) => {
      settle(error);
    },
  );

  return () => {
    if (!done) {
      done = true;
      realm.window.clearTimeout(timer);
    }
  };
}
