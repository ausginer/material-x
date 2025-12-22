import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { state } from '../utils.ts';
import packs from './tokens.ts';

const square = attribute('shape', 'square');
const squareState = pseudoClass('state', 'square');
const noSquareAttribute = pseudoClass('not', attribute('shape'));
const checked = attribute('checked');

const styles: string = await prettify(css`
  ${state.default()},
  ${state.default(squareState, checked, noSquareAttribute)},
  ${state.default(square, checked)} {
    ${packs.round};
  }

  ${state.default(square)},
  ${state.default(squareState, noSquareAttribute)},
  ${state.default(checked)} {
    ${packs.square};
  }
`);

export default styles;
