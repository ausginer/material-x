export type GroupSizeCase = Readonly<{
  name: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
  /** `size` attribute value, or `null` for the default (small) size. */
  attribute: string | null;
  /** Contract key registered in the token bridge, per variant. */
  standardContract: string;
  connectedContract: string;
}>;

export const GROUP_SIZE_CASES: readonly GroupSizeCase[] = [
  {
    name: 'xsmall',
    attribute: 'xsmall',
    standardContract: 'button-group.standard.xsmall',
    connectedContract: 'button-group.connected.xsmall',
  },
  {
    name: 'small',
    attribute: null,
    standardContract: 'button-group.standard.small',
    connectedContract: 'button-group.connected.small',
  },
  {
    name: 'medium',
    attribute: 'medium',
    standardContract: 'button-group.standard.medium',
    connectedContract: 'button-group.connected.medium',
  },
  {
    name: 'large',
    attribute: 'large',
    standardContract: 'button-group.standard.large',
    connectedContract: 'button-group.connected.large',
  },
  {
    name: 'xlarge',
    attribute: 'xlarge',
    standardContract: 'button-group.standard.xlarge',
    connectedContract: 'button-group.connected.xlarge',
  },
];
