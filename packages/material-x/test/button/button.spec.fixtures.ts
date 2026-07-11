export type ButtonSizeCase = Readonly<{
  name: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
  attribute: string | null;
  contract: string;
}>;

export const BUTTON_SIZE_CASES: readonly ButtonSizeCase[] = [
  {
    name: 'xsmall',
    attribute: 'xsmall',
    contract: 'button.size.xsmall',
  },
  { name: 'small', attribute: null, contract: 'button.size.small' },
  {
    name: 'medium',
    attribute: 'medium',
    contract: 'button.size.medium',
  },
  { name: 'large', attribute: 'large', contract: 'button.size.large' },
  {
    name: 'xlarge',
    attribute: 'xlarge',
    contract: 'button.size.xlarge',
  },
];
