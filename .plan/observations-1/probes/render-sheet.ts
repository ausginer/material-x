// Prints the text that a `.css.ts` module's default export evaluates to, the
// way the build evaluates it: run with the build's `.styles.css` load hook.
//
//   node --import ../vite-custom-element-assets/src/css/styles-import.ts \
//     ../../.plan/observations-1/probes/render-sheet.ts <absolute .css.ts path>
//
// from packages/material-x.
const sheet: { default: string } = await import(process.argv[2]!);
process.stdout.write(sheet.default);
