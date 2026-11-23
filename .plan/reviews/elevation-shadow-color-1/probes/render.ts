const root = process.argv[2];
const { elevationTokens } = await import(
  `${root}/src/core/styles/elevation/tokens.ts`
);
console.log(elevationTokens.value.render());
