import store from '../../../packages/tproc/src/store/index.ts';
for (const t of store.tokens) {
  if (
    /^md\.comp\.list\.list-item\.(selected\.|unselected\.)?disabled\..*opacity$/.test(
      t.tokenName,
    )
  ) {
    const s = store.select(t);
    console.log(
      t.tokenName,
      JSON.stringify(s.value),
      JSON.stringify(s.entry?.resolvedValue),
    );
  }
}
