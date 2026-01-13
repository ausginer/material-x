import { shapeTokens } from './tokens.ts';

const styles: string = shapeTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
