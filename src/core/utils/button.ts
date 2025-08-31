import type CoreButton from '../../button/core-button.ts';
import SpringAnimationController from '../animations/spring.ts';
import { use } from '../elements/core.ts';

export function useSpringAnimationController(self: CoreButton): void {
  use(
    self,
    new SpringAnimationController(
      self,
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
    ),
  );
}
