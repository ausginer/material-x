import { defaultSizeSwitchTokens } from '../size/tokens.ts';
import { BUTTON_STATES } from '../utils.ts';
import { defaultSwitchFilledTokens, defaultSwitchTokens } from './tokens.ts';

const styles: string = BUTTON_STATES.flatMap((state) => {
  const opts = { state };

  return [
    defaultSwitchTokens.value.render(opts),
    defaultSwitchFilledTokens.value.render(opts),
    defaultSizeSwitchTokens.value.render(opts),
  ];
}).join('\n\n');

export default styles;
