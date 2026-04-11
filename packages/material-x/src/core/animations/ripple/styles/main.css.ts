import motionEffects from '../../../../.tproc/default/motion-effects.ts';
import { t } from '../../../../.tproc/index.ts';
import css from './main.styles.css';

const pack = t
  .set({
    'ripple.easing': motionEffects['expressive.default-spatial'],
    'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  })
  .build();

const styles: string = [pack.render(), css].join('\n\n');

export default styles;
