// Architect probe for repo:RF-77: every current shadow-colour token, the list's
// elevation and reorder tokens, and whether surface-tint is deprecated.
import store from '../../../packages/tproc/src/store/index.ts';

for (const t of store.tokens) {
  if (/shadow-color$/.test(t.tokenName) && !store.isTokenDeprecated(t)) {
    console.log('SHADOW', t.tokenName, JSON.stringify(store.select(t).value));
  }
}
for (const t of store.tokens) {
  if (
    /^md\.comp\.list\.(reorder\.list-item\.shadow-color|list-item\.(dragged\.)?container\.elevation)$/.test(
      t.tokenName,
    )
  ) {
    console.log(
      'LIST',
      t.tokenName,
      store.getTokenSet(t)?.tokenSetName,
      JSON.stringify(
        store.select(t).entry?.resolvedValue ?? store.select(t).value,
      ),
    );
  }
}
for (const name of [
  'md.sys.color.surface-tint',
  'md.sys.color.shadow',
  'md.comp.button.filled.container.elevation',
]) {
  const t = store.getToken(name)!;
  console.log(
    'TOKEN',
    name,
    'deprecated:',
    store.isTokenDeprecated(t),
    JSON.stringify(
      store.select(t).entry?.resolvedValue ?? store.select(t).value,
    ),
  );
}
