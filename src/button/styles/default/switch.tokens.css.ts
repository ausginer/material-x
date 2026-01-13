import { defaultSizeSwitchTokens } from '../size/tokens.ts';
import { SELECTION_STATES, BUTTON_STATES } from '../utils.ts';
import { defaultSwitchFilledTokens, defaultSwitchTokens } from './tokens.ts';

const styles: string = SELECTION_STATES.flatMap((selection) =>
  BUTTON_STATES.map((state) => `${selection}.${state}` as const),
)
  .flatMap((state) => {
    const opts = { state };

    return [
      defaultSwitchTokens.value.render(opts),
      defaultSwitchFilledTokens.value.render(opts),
      defaultSizeSwitchTokens.value.render(opts),
    ];
  })
  .join('\n\n');

export default styles;
