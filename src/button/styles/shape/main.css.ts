import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { state } from '../utils.ts';
import packs from './tokens.ts';

const square = attribute('shape', 'square');

const styles: string = await prettify(css`
  ${state.default()} {
    ${packs.round};
  }

  ${state.default(square)} {
    ${packs.square};
  }
`);

export default styles;
