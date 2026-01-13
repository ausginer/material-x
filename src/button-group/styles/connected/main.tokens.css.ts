import { connectedTokens } from './tokens.ts';

const styles: string = connectedTokens
  .map((set) => set.value.render())
  .join('\n\n');

export default styles;
