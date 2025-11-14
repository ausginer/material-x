import { useSpring } from '../animations/useSpring.ts';
import { ReactiveElement, use } from '../elements/reactive-element.ts';

export function usePressAnimation(element: ReactiveElement): void {
  useSpring(
    element,
    {
      pointerdown(_, animation) {
        animation.playbackRate = 1;
        animation.play();
      },
      pointerup(_, animation) {
        animation.playbackRate = -1;
        animation.play();
      },
    },
    {
      damping: 'press-damping',
      stiffness: 'press-stiffness',
      duration: 'press-duration',
      factor: 'press-factor',
    },
  );
}
