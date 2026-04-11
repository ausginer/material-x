import { t } from '../../../.tproc/index.ts';

const SET_NAME = 'md.comp.checkbox';

export const tokens = {
  'indicator.color': `${SET_NAME}.focus.indicator.color`,
  'indicator.thickness': `${SET_NAME}.focus.indicator.thickness`,
  'indicator.outline.offset': `${SET_NAME}.focus.indicator.outline.offset`,
};

const pack = t.set(tokens).build();

const styles: string = pack.render();

export default styles;
