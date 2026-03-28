import { ButtonLike } from '../button/ButtonCore.ts';
import type { ControlledElement } from 'ydin/element.js';

export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;
export type ExistingSiblingUpdateCallback = (sibling: HTMLElement) => void;

export function getTarget(
  event: PointerEvent,
): (ButtonLike & ControlledElement) | undefined {
  return event
    .composedPath()
    .find(
      (node): node is ButtonLike & ControlledElement =>
        node instanceof ButtonLike,
    );
}
