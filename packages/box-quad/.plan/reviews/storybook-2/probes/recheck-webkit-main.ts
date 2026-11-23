/**
 * The page errors that box-quad's docs page raises while it loads in WebKit at
 * 375 px, on a build of `main` and on a build of the pull request, in turn, in an
 * ordinary and in a very tall viewport.
 *
 * Run from the repository root against the two served builds:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/recheck-webkit-main.ts <main origin> <pull request origin>`.
 */
import { webkit } from 'playwright';
const b = await webkit.launch();
for (const height of [900, 5200])
  for (let round = 0; round < 2; round++)
    for (const [name, o] of [
      ['main', process.argv[2]!],
      ['pull request', process.argv[3]!],
    ] as const) {
      let pages = 0;
      const n = height === 900 ? 20 : 8;
      for (let k = 0; k < n; k++) {
        const p = await b.newPage({ viewport: { width: 375, height } });
        let e = 0;
        p.on('pageerror', () => {
          e++;
        });
        await p.goto(`${o}/iframe.html?id=box-quad--docs&viewMode=docs`);
        await p.waitForSelector('[class*="nested-stage"]');
        await p.waitForTimeout(1500);
        pages += +(e > 0);
        await p.close();
      }
      console.log(
        `375 x ${height} docs page, ${name}: ${pages} of ${n} loads raise a page error`,
      );
    }
await b.close();
