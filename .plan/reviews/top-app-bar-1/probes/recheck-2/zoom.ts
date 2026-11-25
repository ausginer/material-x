// A zoomed frame and a zoomed root: where the state is wrong, with the built
// area and the former one, and what the observer reports there.
import { browser, ENGINE, code } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const swap = (a: string, b: string, s: string) => {
  if (s.split(a).length !== 2) throw Error(a);
  return s.replace(a, () => b);
};
const VARIANTS: Record<string, string> = {
  built: code,
  'former (8f5ad01db)': swap(
    'block-size:1px;inline-size:1px',
    'block-size:0;inline-size:0',
    swap(
      'entries.at(-1).boundingClientRect.top < 0',
      '!entries.at(-1).isIntersecting',
      swap(
        '"10000000px 1000000px -100%"',
        '"0px 1000000px"',
        swap('threshold: 1e-9', 'threshold: 0', code),
      ),
    ),
  ),
};
const BODY =
  '<mx-top-app-bar id=bar>T</mx-top-app-bar><div style="height:5000px"></div>';
for (const [v, js] of Object.entries(VARIANTS))
  for (const where of ['iframe', 'ancestor', 'root'])
    for (const z of [1, 0.5, 0.67, 0.8, 0.9, 1.1, 1.25, 1.5, 2, 2.2, 3]) {
      const ctx = await browser.newContext({
        viewport: { width: 800, height: 600 },
      });
      const page = await ctx.newPage();
      await page.setContent(
        '<!doctype html><style>body{margin:0}</style>' +
          (where === 'root'
            ? ''
            : `<div style="${where === 'ancestor' ? `zoom:${z}` : ''}"><iframe style="border:0;width:400px;height:300px;${where === 'iframe' ? `zoom:${z}` : ''}"></iframe></div>`),
      );
      const f = where === 'root' ? page : page.frames()[1]!;
      await f.setContent(
        `<!doctype html><style>body{margin:0}${where === 'root' ? `html{zoom:${z}}` : ''}</style>${BODY}`,
      );
      await f.addScriptTag({ content: js });
      const r = await f.evaluate(async () => {
        const w = async (y: number) => {
          scrollTo(0, y);
          await new Promise((r) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setTimeout(r, 50)),
            ),
          );
          return [
            scrollY,
            document.getElementById('bar')!.matches(':state(scrolled)'),
          ] as const;
        };
        const wrong: string[] = [];
        for (const y of [
          0, 1, 2, 5, 20, 100, 150, 300, 600, 1500, 1e6, 0, 300, 0, 3, 0,
        ]) {
          const [s, on] = await w(y);
          if (on !== s > 0) wrong.push(`${on ? 'on' : 'off'}@${+s.toFixed(2)}`);
        }
        const b = await new Promise<string>((r) =>
          new IntersectionObserver(
            (e) => {
              const x = e[0]!;
              r(
                `rootBounds ${x.rootBounds!.width}x${x.rootBounds!.height}, html ${x.boundingClientRect.width}`,
              );
            },
            { root: document },
          ).observe(document.documentElement),
        );
        return `${wrong.join(' ') || 'right'} | ${b}, inner ${innerWidth}x${innerHeight}, client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`;
      });
      console.log(`${v} | ${where} zoom ${z} | ${r}`);
      await ctx.close();
    }
await browser.close();
