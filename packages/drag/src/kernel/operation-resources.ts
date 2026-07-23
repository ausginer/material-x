import { createResourceScope, type ResourceScope } from './resource-scope.ts';

export type OperationResources = Readonly<{
  signal: AbortSignal;
  interaction: ResourceScope;
  presentation: ResourceScope;
  stopInteraction(): void;
  releasePresentation(): void;
  destroy(): void;
}>;

/** Owns the two ordered scopes and abort signal for one admitted operation. */
export function createOperationResources(
  report: (error: unknown) => void,
): OperationResources {
  const controller = new AbortController();
  const interaction = createResourceScope(report);
  const presentation = createResourceScope(report);
  let interactionStopped = false;
  let presentationReleased = false;

  const stopInteraction = (): void => {
    if (interactionStopped) {
      return;
    }

    interactionStopped = true;
    controller.abort();
    interaction.dispose();
  };

  const releasePresentation = (): void => {
    if (presentationReleased) {
      return;
    }

    presentationReleased = true;
    presentation.dispose();
  };

  return {
    signal: controller.signal,
    interaction,
    presentation,
    stopInteraction,
    releasePresentation,
    destroy() {
      stopInteraction();
      releasePresentation();
    },
  };
}
