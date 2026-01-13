import { standardTokens } from './tokens.ts';

const styles: string = standardTokens
  .map((set) => set.value.render())
  .join('\n\n');

export default styles;
