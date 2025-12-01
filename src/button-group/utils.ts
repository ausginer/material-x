import { isButtonLike, type ButtonLike } from '../button/useButtonCore.ts';

export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;

export function applyToSiblings(
  target: HTMLElement,
  prev?: SiblingUpdateCallback,
  next?: SiblingUpdateCallback,
): void {
  const { previousElementSibling, nextElementSibling } = target;

  prev?.(
    previousElementSibling instanceof HTMLElement
      ? previousElementSibling
      : undefined,
  );

  next?.(
    nextElementSibling instanceof HTMLElement ? nextElementSibling : undefined,
  );
}

export function getTarget(event: PointerEvent): ButtonLike | undefined {
  return event.composedPath().find((node) => isButtonLike(node));
}
