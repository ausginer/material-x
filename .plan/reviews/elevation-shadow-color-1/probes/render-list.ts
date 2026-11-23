const root = process.argv[2];
const mod = await import(`${root}/src/list/styles/item/tokens.ts`);
for (const [name, value] of Object.entries(mod)) {
  const v = (value as any)?.value ?? value;
  if (typeof v?.render === 'function') {
    const css = v.render();
    console.log(
      name,
      css
        .split('\n')
        .filter((l: string) => l.includes('shadow'))
        .join('\n'),
    );
  }
}
