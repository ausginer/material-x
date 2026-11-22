// Feature-proof probe for RF-70 (PR #120). Not part of the branch.
// Copied into packages/material-x/tests/core/ of a scratch export and run there.
import { afterEach, describe, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/fab/fab.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

const OUT = (globalThis as any).__RF70_OUT__ ?? 'rf70';

function boxOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
}

function centerOf(element: HTMLElement): readonly [number, number] {
  const { left, top, width, height } = element.getBoundingClientRect();
  return [left + width / 2, top + height / 2];
}

function sysShadow(): string {
  const probe = document.createElement('div');
  probe.style.color = 'var(--md-sys-color-shadow, magenta)';
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function resolvedColor(box: Element): string {
  const raw = getComputedStyle(box).getPropertyValue('--_shadow-color');
  const probe = document.createElement('div');
  probe.style.color = raw;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return `${raw.trim()} -> ${value}`;
}

afterEach(async () => {
  await commands.pointerRelease().catch(() => {});
  document.body.replaceChildren();
});

describe('rf70 probe', () => {
  it('shadow colours', async () => {
    const button = document.createElement('mx-button');
    button.setAttribute('color', 'elevated');
    button.textContent = 'B';
    const fab = document.createElement('mx-fab');
    const list = document.createElement('mx-list');
    const items = [
      'mx-list-item',
      'mx-list-button-item',
      'mx-list-link-item',
    ].map((tag) => {
      const item = document.createElement(tag);
      if (tag === 'mx-list-link-item') item.setAttribute('href', '#');
      item.textContent = tag;
      return item;
    });
    list.append(...items);
    document.body.append(button, fab, list);
    await nextFrame();
    const lines = [`md-sys-color-shadow: ${sysShadow()}`];
    for (const el of [button, fab, ...items]) {
      const box = boxOf(el);
      lines.push(
        `${el.localName}: --_shadow-color ${resolvedColor(box)}; --_container-shadow-color '${getComputedStyle(box).getPropertyValue('--_container-shadow-color').trim()}'; --_level '${getComputedStyle(box).getPropertyValue('--_level').trim()}'; box-shadow '${getComputedStyle(box).boxShadow}'`,
      );
    }
    for (const [contract, token] of [
      ['button.color.elevated', 'container.shadow-color'],
      ['button.color.elevated', 'shadow.color'],
      ['fab.color.default', 'container.shadow-color'],
      ['fab.color.default', 'shadow.color'],
      ['list-item.default', 'shadow.color'],
      ['elevation', 'shadow-color'],
    ] as const) {
      const r = await commands
        .resolveTokenContract({ contract, state: 'default', tokens: [token] })
        .then((x) => JSON.stringify(x.values[token]))
        .catch((e: unknown) => `ERROR ${String(e).slice(0, 120)}`);
      lines.push(`token ${contract} ${token}: ${r}`);
    }
    console.log(`RF70-COLOURS\n${lines.join('\n')}`);
    expect(true).toBe(true);
  });

  it.each([
    { tag: 'mx-list-button-item', noNativeDrag: false },
    { tag: 'mx-list-link-item', noNativeDrag: false },
    { tag: 'mx-list-link-item', noNativeDrag: true },
  ])(
    'pointer drag lifts? $tag noNativeDrag=$noNativeDrag',
    async ({ tag, noNativeDrag }) => {
      const list = document.createElement('mx-sortable-list');
      list.style.setProperty('--_drag-duration', '0s');
      const items = ['A', 'B'].map((label) => {
        const item = document.createElement(tag);
        if (tag === 'mx-list-link-item') item.setAttribute('href', '#');
        item.textContent = label;
        return item;
      });
      list.append(...items);
      document.body.append(list);
      await nextFrame();
      const box = boxOf(items[0]!);
      if (noNativeDrag) box.setAttribute('draggable', 'false');
      const events: string[] = [];
      for (const type of [
        'pointerdown',
        'pointermove',
        'pointercancel',
        'dragstart',
        'lostpointercapture',
      ]) {
        items[0]!.addEventListener(
          type,
          () => {
            if (events.at(-1) !== type) events.push(type);
          },
          { capture: true },
        );
      }
      const [x, y] = centerOf(box);
      await commands.pointerPress(x, y);
      await commands.pointerMove(x, y + 12, 3);
      let lifted = false;
      for (let i = 0; i < 20 && !lifted; i += 1) {
        await nextFrame();
        lifted = items[0]!.matches(':state(drag)');
      }
      console.log(
        `RF70-DRAG ${tag} noNativeDrag=${noNativeDrag} lifted=${lifted} events=${events.join(',')}`,
      );
      expect(true).toBe(true);
    },
  );

  it('screenshots at rest', async () => {
    const list = document.createElement('mx-list');
    list.style.cssText =
      'display:block;width:240px;padding:24px;background:white';
    for (const tag of [
      'mx-list-item',
      'mx-list-button-item',
      'mx-list-link-item',
    ]) {
      const item = document.createElement(tag);
      if (tag === 'mx-list-link-item') item.setAttribute('href', '#');
      item.textContent = tag;
      list.append(item);
    }
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:inline-block;padding:32px;background:white';
    const fab = document.createElement('mx-fab');
    wrap.append(fab);
    document.body.append(list, wrap);
    await nextFrame();
    await nextFrame();
    const engine = navigator.userAgent.includes('Firefox')
      ? 'firefox'
      : navigator.userAgent.includes('Chrome')
        ? 'chromium'
        : 'webkit';
    await page.screenshot({
      element: list,
      path: `__rf70__/${OUT}-${engine}-list.png`,
    });
    await page.screenshot({
      element: wrap,
      path: `__rf70__/${OUT}-${engine}-fab.png`,
    });
    expect(true).toBe(true);
  });
});
