import { defaultSizeMainTokens } from '../size/tokens.ts';
import { BUTTON_STATES } from '../utils.ts';
import { defaultTokens, defaultFilledTokens } from './tokens.ts';

const styles: string = BUTTON_STATES.flatMap((state) => {
  const opts = { state };

  return [
    defaultTokens.value.render(opts),
    defaultFilledTokens.value.render(opts),
    defaultSizeMainTokens.value.render(opts),
  ];
}).join('\n\n');

export default styles;
