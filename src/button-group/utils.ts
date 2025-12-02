import { isButtonLike, type ButtonLike } from '../button/useButtonCore.ts';

export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;
export type ExistingSiblingUpdateCallback = (sibling: HTMLElement) => void;

export function getTarget(event: PointerEvent): ButtonLike | undefined {
  return event.composedPath().find((node) => isButtonLike(node));
}
