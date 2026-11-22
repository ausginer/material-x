import store from '@ydinjs/tproc/store/index.js';
import { describe, expect, it } from 'vitest';

/** The token whose opacity the disabled item's sheet renders on every slot. */
const RENDERED_OPACITY = 'md.comp.list.list-item.disabled.label-text.opacity';

const CONTENT_OPACITY_TOKENS = [
  'md.comp.list.list-item.disabled.label-text.opacity',
  'md.comp.list.list-item.disabled.leading-icon.opacity',
  'md.comp.list.list-item.disabled.trailing-icon.opacity',
  'md.comp.list.list-item.disabled.overline.opacity',
  'md.comp.list.list-item.disabled.supporting-text.opacity',
  'md.comp.list.list-item.selected.disabled.label-text.opacity',
  'md.comp.list.list-item.selected.disabled.leading-icon.opacity',
  'md.comp.list.list-item.selected.disabled.trailing-icon.opacity',
  'md.comp.list.list-item.selected.disabled.overline.opacity',
  'md.comp.list.list-item.selected.disabled.supporting-text.opacity',
  'md.comp.list.list-item.selected.disabled.trailing-supporting-text.opacity',
] as const;

function readValue(tokenName: string): unknown {
  const token = store.getToken(tokenName);
  return token && store.select(token)?.value;
}

/*
 * The sheet gives every slot of a disabled item one opacity, so it holds only
 * while each slot's own token equals the one it renders.
 */
describe('list item disabled content opacity tokens', () => {
  it.each(CONTENT_OPACITY_TOKENS)(
    'should give %s the opacity the sheet renders',
    (tokenName) => {
      const rendered = readValue(RENDERED_OPACITY);

      expect(rendered).toBeDefined();
      expect(readValue(tokenName)).toEqual(rendered);
    },
  );
});
