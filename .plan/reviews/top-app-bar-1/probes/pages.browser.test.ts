// @ts-nocheck
import { it } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import '../../src/top-app-bar/top-app-bar.ts';
import '../../src/checkbox/checkbox.ts';
import '../../src/list/list-item.ts';
import { nextFrame } from '../browser.ts';
const wait = async () => {
  for (let i = 0; i < 4; i++) await nextFrame();
  await new Promise((r) => setTimeout(r, 60));
};
const PAGES = {
  plain: '',
  'test body padding 0': 'body{padding:0!important}',
  'html margin-top 46px': 'html{margin-top:46px}',
  'html padding-top 46px': 'html{padding-top:46px}',
  'html border-top 10px': 'html{border-top:10px solid}',
  'body absolute': 'body{position:absolute;inset:0 0 auto;padding:0!important}',
  'body absolute, bar fixed':
    'body{position:absolute;inset:0 0 auto;padding:0!important}mx-top-app-bar{position:fixed}',
  'html height 0': 'html{height:0}',
  'body float': 'body{float:left;width:100%}',
  'all content absolute, bar fixed':
    'body{margin:0;padding:0!important}mx-top-app-bar{position:fixed}#tall{position:absolute!important}',
  'html,body height 100%': 'html,body{height:100%}',
  'html overflow-x hidden': 'html{overflow-x:hidden}',
  'html,body overflow-x hidden': 'html,body{overflow-x:hidden}',
  'body overflow-x clip': 'body{overflow-x:clip}',
  'html contain paint': 'html{contain:paint}',
  'html content-visibility': 'html{content-visibility:auto}',
  'html zoom 1.5': 'html{zoom:1.5}',
  'body zoom 0.5': 'body{zoom:.5}',
  'html transform': 'html{transform:translateY(0)}',
  'html relative top 20': 'html{position:relative;top:20px}',
  'body display contents': 'body{display:contents}',
  'html display grid': 'html{display:grid}',
  'html scroll-snap': 'html{scroll-snap-type:y proximity}',
  'html vertical-rl': 'html{writing-mode:vertical-rl}#tall{block-size:6000px}',
  'html clip-path': 'html{clip-path:inset(0)}',
  'html visibility hidden': 'html{visibility:hidden}',
  'html opacity 0': 'html{opacity:0}',
};
it('pages', async () => {
  const out = [];
  for (const [name, css] of Object.entries(PAGES)) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
    const bar = document.createElement('mx-top-app-bar');
    bar.textContent = 'H';
    const tall = document.createElement('div');
    tall.id = 'tall';
    tall.style.cssText = 'position:relative;height:5000px;width:200px';
    document.body.append(bar, tall);
    const r = [];
    for (const y of [0, 1, 20, 45, 47, 300, 2000, 1e6, 0]) {
      scrollTo({ top: y, behavior: 'instant' });
      await wait();
      const s = bar.matches(':state(scrolled)');
      const t = Math.round(bar.getBoundingClientRect().top);
      r.push(
        `${Math.round(scrollY)}:${s === scrollY > 0 ? '' : 'WRONG '}${s ? 'on' : 'off'}(top ${t})`,
      );
    }
    const bad = r.some((x) => x.includes('WRONG'));
    out.push(
      `${bad ? 'BAD' : 'ok '} ${name} html=${document.documentElement.getBoundingClientRect().height} ${bad || r.some((x) => /top -/.test(x)) ? r.join(' ') : ''}`,
    );
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
    bar.remove();
    tall.remove();
    st.remove();
    await wait();
  }
  // wheel + keys
  const bar = document.createElement('mx-top-app-bar');
  bar.textContent = 'H';
  const tall = document.createElement('div');
  tall.style.cssText = 'height:5000px';
  document.body.append(bar, tall);
  await wait();
  const step = async (l, f) => {
    try {
      await f();
      await wait();
      await new Promise((r) => setTimeout(r, 700));
      out.push(
        `real ${l}: y=${Math.round(scrollY)} ${bar.matches(':state(scrolled)')} ${bar.matches(':state(scrolled)') === scrollY > 0 ? 'ok' : 'WRONG'}`,
      );
    } catch (e) {
      out.push(`real ${l}: ${String(e).slice(0, 90)}`);
    }
  };
  await step('wheel down', () =>
    userEvent.wheel(document.body, { delta: { y: 200 } }),
  );
  await step('wheel up', () =>
    userEvent.wheel(document.body, { delta: { y: -400 } }),
  );
  await step('wheel 1px', () =>
    userEvent.wheel(document.body, { delta: { y: 1 } }),
  );
  tall.tabIndex = 0;
  tall.focus({ preventScroll: true });
  await step('End', () => userEvent.keyboard('{End}'));
  await step('Home', () => userEvent.keyboard('{Home}'));
  // hidden
  const h = document.createElement('mx-top-app-bar');
  h.hidden = true;
  h.textContent = 'x';
  document.body.prepend(h);
  out.push(`hidden: display ${getComputedStyle(h).display}`);
  // smooth scroll
  scrollTo({ top: 1500, behavior: 'smooth' });
  await new Promise((r) => setTimeout(r, 1500));
  out.push(`smooth: y=${scrollY} ${bar.matches(':state(scrolled)')}`);
  scrollTo({ top: 0, behavior: 'instant' });
  // list item leak for comparison
  const li = document.createElement('mx-list-item');
  li.innerHTML = '<mx-checkbox slot=lead></mx-checkbox>';
  document.body.append(li);
  await wait();
  out.push(
    `checkbox in list-item: ${getComputedStyle(li.firstElementChild, '::after').backgroundColor} list-item --_container-color=${getComputedStyle(li).getPropertyValue('--_container-color')}`,
  );
  throw new Error(`@@ ${server.browser}\n` + out.join('\n'));
}, 200000);
