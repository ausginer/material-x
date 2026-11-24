// The store (packages/tproc/tokens), read by itself. Copy into packages/material-x to run.
import store from '@ydinjs/tproc/store/index.js';
for (const s of store.sets.filter((x) =>
  x.tokenSetName.startsWith('md.comp.slider'),
)) {
  console.log('##', s.tokenSetName, s.displayName);
  for (const t of s.tokens) {
    const e = store.select(t);
    console.log(
      store.isTokenDeprecated(t) ? ' D' : '  ',
      t.tokenName.replace(s.tokenSetName + '.', ''),
      JSON.stringify(e?.value).slice(0, 90),
      JSON.stringify(e?.entry?.resolvedValue)?.slice(0, 110),
    );
  }
}
