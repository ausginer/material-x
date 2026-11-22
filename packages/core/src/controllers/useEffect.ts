import {
  effect,
  type Accessors,
  type Dispose,
  type EffectCleanup,
  type EffectOptions,
  type Source,
} from '@ydinjs/signals';
import { use, type ControlledElement } from '../element.ts';

/**
 * Binds an effect from `@ydinjs/signals` to the host's connection.
 *
 * Each connect creates the effect, which runs once at once, and each
 * disconnect disposes it, which runs its cleanup. So a reconnected host has a
 * new effect, and a disconnected host keeps no subscription to the inputs.
 *
 * @param host - The host whose connection the effect follows.
 * @param inputs - Every node the effect may read.
 * @param fn - The effect. It may return a cleanup, which runs before the next
 *   run and on disconnect.
 * @param options - The effect's name.
 */
export function useEffect<const I extends readonly Source[]>(
  host: ControlledElement,
  inputs: I,
  // oxlint-disable-next-line typescript/no-invalid-void-type
  fn: (...accessors: Accessors<I>) => EffectCleanup | void,
  options?: EffectOptions,
): void {
  let dispose: Dispose;

  use(host, {
    connected() {
      dispose = effect(inputs, fn, options);
    },
    disconnected() {
      dispose();
    },
  });
}
