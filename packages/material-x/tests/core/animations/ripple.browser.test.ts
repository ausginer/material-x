import { describe, expect, it, onTestFinished } from 'vitest';
import { commands } from 'vitest/browser';
import { nextFrame } from '../../browser.ts';

type Reading = Readonly<{
  pressed: boolean;
  errors: readonly string[];
}>;

/**
 * Presses an element that connected while its iframe was `display: none`, after
 * the iframe is shown, and reads whether the press started its ripple and the
 * errors that the iframe reported.
 */
async function pressAfterShow(tag: string, module: string): Promise<Reading> {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'display: none; width: 400px; height: 200px';
  frame.srcdoc = `<script>window.errors = []; addEventListener('error', (event) => errors.push(event.message));</script>
<${tag}>A</${tag}>
<script type="module">
await import(${JSON.stringify(module)});
document.body.dataset.ready = '';
</script>`;
  document.body.append(frame);
  onTestFinished(async () => {
    await commands.pointerRelease();
    frame.remove();
  });
  await expect
    .poll(() => frame.contentDocument?.body.dataset['ready'], {
      timeout: 10_000,
    })
    .toBe('');

  frame.style.display = 'block';
  await nextFrame();
  await nextFrame();

  const view = frame.contentWindow as Window &
    typeof globalThis &
    Readonly<{ errors: readonly string[] }>;
  const { shadowRoot } = frame.contentDocument!.querySelector(tag)!;
  const outer = frame.getBoundingClientRect();
  const inner = shadowRoot!
    .querySelector('.host, input')!
    .getBoundingClientRect();
  await commands.pointerPress(
    outer.left + frame.clientLeft + inner.left + inner.width / 2,
    outer.top + frame.clientTop + inner.top + inner.height / 2,
  );
  // The ripple alone is neither a CSS transition nor a CSS animation.
  const isRipple = (animation: Animation): boolean =>
    !(animation instanceof view.CSSTransition) &&
    !(animation instanceof view.CSSAnimation);
  await expect
    .poll(() => shadowRoot!.getAnimations().some(isRipple), { timeout: 1000 })
    .toBe(true)
    .catch(() => {});

  return {
    pressed: shadowRoot!.getAnimations().some(isRipple),
    errors: view.errors,
  };
}

describe('useRipple', () => {
  it.each([
    [
      'mx-button',
      new URL('../../../src/button/button.ts', import.meta.url).href,
    ],
    ['mx-fab', new URL('../../../src/fab/fab.ts', import.meta.url).href],
    [
      'mx-checkbox',
      new URL('../../../src/checkbox/checkbox.ts', import.meta.url).href,
    ],
    ['mx-radio', new URL('../../../src/radio/radio.ts', import.meta.url).href],
    [
      'mx-list-button-item',
      new URL('../../../src/list/list-button-item.ts', import.meta.url).href,
    ],
  ])(
    'should show the press of %s that connected in a hidden iframe',
    async (tag, module) => {
      expect(await pressAfterShow(tag, module)).toEqual({
        pressed: true,
        errors: [],
      });
    },
  );
});
