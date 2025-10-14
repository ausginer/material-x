import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { state } from '../../utils.ts';
import packs from './tokens.ts';

const square = attribute('square');

const styles: string = await prettify(css`
  ${state.default()} {
    ${packs.round};
  }

  ${state.default(square)} {
    ${packs.square};
  }
`);

console.log(styles);

export default styles;
