import { ButtonLike } from '../button/ButtonCore.ts';
import type { ReactiveElement } from 'ydin/reactive-element.js';

export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;
export type ExistingSiblingUpdateCallback = (sibling: HTMLElement) => void;

export function getTarget(
  event: PointerEvent,
): (ButtonLike & ReactiveElement) | undefined {
  return event
    .composedPath()
    .find(
      (node): node is ButtonLike & ReactiveElement =>
        node instanceof ButtonLike,
    );
}
