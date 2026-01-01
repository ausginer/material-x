import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, selector } from '../../../core/tokens/selector.ts';
import packs from './tokens.ts';

const numeric = attribute('mode', 'numeric');

const styles: string = await prettify(css`
  :host {
    ${packs};
  }

  #steppers {
    display: none;
    flex-direction: column;
    align-self: center;

    mx-icon {
      height: 10px;
    }
  }

  ${selector(':host', numeric)} #steppers {
    grid-area: steppers;
    display: flex;
  }
`);

export default styles;
