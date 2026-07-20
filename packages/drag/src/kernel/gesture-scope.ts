/**
 * Owns cancellation and disposal for one admitted operation. Created only after
 * pointer or keyboard admission. Composes a general operation `AbortController`,
 * one interaction `ResourceScope`, and one presentation `ResourceScope`.
 *
 * Non-resolution async work tests {@link GestureScope.signal} instead of a
 * free-floating generation/destroyed pair. Consumer resolvers never receive this
 * signal; they receive the dedicated signal owned by their resolution effect.
 *
 * There is deliberately no aggregate `destroy()`: the scope does not own the
 * landing runner, so only the feature effects interpreter can preserve the
 * required interaction-dispose -> runner-destroy -> presentation-dispose order.
 */
import { createResourceScope, type ResourceScope } from './resource-scope.ts';

export type GestureScope = Readonly<{
  /** The general operation signal, aborted when interaction work ends. */
  signal: AbortSignal;
  /** Document input, invalidation, capture, scheduled work, resolvers. */
  interaction: ResourceScope;
  /** Top-layer state, inline styles, placeholder presence — survives landing. */
  presentation: ResourceScope;
  /** Aborts and disposes interaction resources for a gesture that never activated. */
  disarm(): void;
  /** Aborts and disposes interaction resources while retaining presentation. */
  settle(): void;
  /** Disposes presentation after landing. */
  finish(): void;
}>;

export function createGestureScope(
  report: (error: unknown) => void,
): GestureScope {
  const controller = new AbortController();
  const interaction = createResourceScope(report);
  const presentation = createResourceScope(report);

  const abortAndDisposeInteraction = (): void => {
    if (!controller.signal.aborted) {
      controller.abort();
    }

    interaction.dispose();
  };

  return {
    signal: controller.signal,
    interaction,
    presentation,
    disarm: abortAndDisposeInteraction,
    settle: abortAndDisposeInteraction,
    finish() {
      presentation.dispose();
    },
  };
}
