import motionEffects from '../../../../.tproc/default/motion-effects.ts';
import { t } from '../../../../.tproc/index.ts';
import css from './main.styles.css';

// Keep ripple motion token-driven: effect tokens control the fill/grow phase,
// while spatial tokens control the drift toward center.
const pack = t
  .set({
    'ripple.easing': motionEffects['expressive.fast-effects'],
    'ripple.duration': motionEffects['expressive.fast-effects.duration'],
    'ripple.drift.easing': motionEffects['expressive.default-spatial'],
    'ripple.drift.duration':
      motionEffects['expressive.default-spatial.duration'],
  })
  .build();

const styles: string = [pack.render(), css].join('\n\n');

export default styles;
