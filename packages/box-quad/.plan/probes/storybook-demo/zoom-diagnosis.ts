/**
 * Separates the causes of `native-parity.ts`'s nested difference: the demo
 * geometry read under ancestor `zoom`, `rotate` and scroll one at a time, with
 * box-quad's quad (`bq`) beside Firefox's native `getBoxQuads()` (`n`).
 * Run from the repository root after `aube exec just build` in
 * `packages/box-quad`.
 */
import { readFile } from 'node:fs/promises';
import { firefox } from 'playwright';
const src = await readFile(
  new URL('../../../index.js', import.meta.url),
  'utf8',
);
const html = (
  outer: string,
) => `<!doctype html><style>body{margin:0}.stage{position:relative;width:640px;min-height:420px;padding:28px;box-sizing:border-box}.stack{position:relative;min-height:364px}.card{position:absolute}.base{left:90px;top:110px;width:300px;height:200px;border:2px solid}.target{left:170px;top:146px;width:220px;height:120px;padding:20px 28px;border:8px solid;transform-origin:center;transform:rotate(-18deg) skewX(8deg)}</style>
<div style="${outer}"><div class="stage"><div class="stack"><div class="card base"></div><div class="card target"></div></div></div></div>
<script type="module">import {coordinates,projection} from './b.js';const st=document.querySelector('.stage'),t=document.querySelector('.target');const a=new Float64Array(8),b=new Float64Array(8),q=new Float64Array(8);const ok=coordinates(t,a)&&coordinates(st,b)&&projection(a,q,b);let n=null;if(t.getBoxQuads){const [x]=t.getBoxQuads({box:'border',relativeTo:st});n=[x.p1,x.p2,x.p3,x.p4].flatMap(p=>[+p.x.toFixed(2),+p.y.toFixed(2)]);}window.r={ok,bq:Array.from(q,v=>+v.toFixed(2)),n,stageW:b[6],w:a[6]};</script>`;
const b = await firefox.launch({
  firefoxUserPrefs: { 'layout.css.getBoxQuads.enabled': true },
});
const p = await b.newPage();
for (const outer of [
  '',
  'zoom:1.25',
  'rotate:12deg',
  'margin:40px;height:300px;overflow:auto',
]) {
  await p.route('http://p.test/**', (r) =>
    new URL(r.request().url()).pathname === '/b.js'
      ? r.fulfill({ contentType: 'text/javascript', body: src })
      : r.fulfill({ contentType: 'text/html', body: html(outer) }),
  );
  await p.goto('http://p.test/');
  await p.waitForFunction(() => (window as any).r);
  console.log(
    JSON.stringify(outer),
    JSON.stringify(await p.evaluate(() => (window as any).r)),
  );
  await p.unrouteAll();
}
await b.close();
