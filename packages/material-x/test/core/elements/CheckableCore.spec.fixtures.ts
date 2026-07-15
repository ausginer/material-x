/**
 * Bindings for the `CheckableCore` visual contract: which tproc contract backs
 * each checkable, and where to observe the shared tokens on the rendered
 * element. These carry semantics only — the resolved Material values come from
 * the bridge (`commands.resolveTokenContract`) at runtime.
 */
export type CheckableSpecCase = Readonly<{
  name: string;
  tag: 'mx-checkbox' | 'mx-radio';
  /** Contract ID registered in `test/support/visual-contracts.node.ts`. */
  contract: string;
  /**
   * Shadow selector for the element carrying `icon.size`. Checkbox renders one
   * glyph; radio renders a separate unselected (`.off`) and selected (`.on`)
   * glyph, which are sized identically, so `.off` represents both.
   */
  iconSelector: string;
}>;

export const CHECKABLE_SPEC_CASES: readonly CheckableSpecCase[] = [
  {
    name: 'mx-checkbox',
    tag: 'mx-checkbox',
    contract: 'checkbox.default',
    iconSelector: '.icon',
  },
  {
    name: 'mx-radio',
    tag: 'mx-radio',
    contract: 'radio.default',
    iconSelector: '.off',
  },
];
