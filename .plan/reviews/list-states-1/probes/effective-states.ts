// Feature-proof probe for RF-71 (#151): what effective() of the list-item.default
// contract holds for each path the rows and the probe resolve. Copied into
// packages/material-x/tests/list/ to run, removed after it:
// node tests/list/effective-states.ts
import { listItemTokens } from '../../src/list/styles/item/tokens.ts';
const keys = [
  'container.color',
  'container.expressive.shape',
  'label-text.color',
  'leading-icon.color',
  'trailing-icon.color',
  'overline.color',
  'supporting-text.color',
  'container.elevation',
  'container.opacity',
  'opacity',
];
for (const path of [
  'default',
  'hovered',
  'focused',
  'dragged',
  'pressed',
  'disabled',
  'selected.default',
  'selected.hovered',
  'selected.focused',
  'selected.dragged',
  'selected.pressed',
  'selected.disabled',
  'unselected.default',
  'unselected.hovered',
  'unselected.disabled',
]) {
  const e = listItemTokens.value.effective(path);
  console.log(
    path,
    e
      ? JSON.stringify(Object.fromEntries(keys.map((k) => [k, e[k] ?? null])))
      : 'MISSING',
  );
}
