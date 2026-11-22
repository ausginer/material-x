// Prints each `<selection>.<state>` path of the list item's tokens on its own,
// as `renderListItemSelectableStyles` renders them, so each block's path is
// visible. Run from packages/material-x:
//
//   node --import ../vite-custom-element-assets/src/css/styles-import.ts \
//     ../../.plan/observations-2/probes/selection-paths.ts
const base = new URL(
  '../../../packages/material-x/src/list/styles/',
  import.meta.url,
);
const { LIST_ITEM_SELECTION_STATES, LIST_ITEM_STATES } = await import(
  new URL('utils.ts', base).href
);
const { listItemTokens } = await import(new URL('item/tokens.ts', base).href);

for (const selection of [...LIST_ITEM_SELECTION_STATES, null]) {
  for (const state of LIST_ITEM_STATES) {
    const path = selection ? `${selection}.${state}` : state;
    const text: string = listItemTokens.value.render({ state: path });
    process.stdout.write(`## ${path}\n${text.trim() || '(empty)'}\n\n`);
  }
}
