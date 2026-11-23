import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../../src/button/button.ts';
import '../../../src/checkbox/checkbox.ts';
import '../../../src/radio/radio.ts';
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

/** The window's uncaught errors and unhandled rejections, kept from the runner. */
function collectErrors(): readonly string[] {
  const errors: string[] = [];
  const controller = new AbortController();
  const collect = (event: Event, message: string): void => {
    errors.push(message);
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener(
    'error',
    (event) => {
      collect(event, event.message);
    },
    { capture: true, signal: controller.signal },
  );
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      collect(event, String(event.reason));
    },
    { capture: true, signal: controller.signal },
  );
  onTestFinished(() => controller.abort());
  return errors;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function create(tag = 'mx-button'): Promise<HTMLElement> {
  const element = document.createElement(tag);

  if (tag === 'mx-button') {
    element.textContent = 'A';
  }

  document.body.append(element);
  await nextFrame();
  return element;
}

function controlOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host, input')!;
}

/** Playwright's mouse makes no touch, so the press is dispatched. */
function touch(element: HTMLElement, pointerId: number): void {
  controlOf(element).dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      isPrimary: true,
      pointerType: 'touch',
      pointerId,
      buttons: 1,
    }),
  );
}

function rippleAnimations(element: HTMLElement): readonly Animation[] {
  return element
    .shadowRoot!.getAnimations()
    .filter((animation) => !(animation instanceof CSSTransition));
}

function isFade(animation: Animation): boolean {
  return (animation.effect as KeyframeEffect)
    .getKeyframes()
    .some((keyframe) => 'opacity' in keyframe);
}

/** Clicks `element`, and returns once its press fades. */
async function clickUntilFade(element: HTMLElement): Promise<void> {
  controlOf(element).click();

  while (!rippleAnimations(element).some(isFade)) {
    // oxlint-disable-next-line no-await-in-loop
    await nextFrame();
  }
}

async function press(element: HTMLElement): Promise<void> {
  const { left, top, width, height } =
    controlOf(element).getBoundingClientRect();
  await commands.pointerPress(left + width / 2, top + height / 2);
}

describe('useRipple when the host disconnects', () => {
  afterEach(async () => {
    vi.useRealTimers();
    await commands.pointerRelease().catch(() => {});
  });

  it('should report no error for a touch whose element is removed within the delay', async () => {
    const errors = collectErrors();
    const element = await create();

    touch(element, 7);
    await nextFrame();
    element.remove();
    await wait(300);

    expect(errors).toEqual([]);
  });

  it('should report no error for a press whose element moves and leaves before the fade', async () => {
    const errors = collectErrors();
    const element = await create();

    controlOf(element).click();
    document.body.append(element);
    element.remove();
    await wait(400);

    expect(errors).toEqual([]);
  });

  it('should report no error for a removal during the fade', async () => {
    const errors = collectErrors();
    const element = await create();

    await clickUntilFade(element);
    element.remove();
    await wait(300);

    expect(errors).toEqual([]);
  });

  it('should start no fade after a removal', async () => {
    const element = await create();
    const ripple = element.shadowRoot!.querySelector<HTMLElement>('.ripple')!;
    const animate = vi.spyOn(ripple, 'animate');

    controlOf(element).click();
    element.remove();
    await wait(400);

    // The scale and the drift of the press.
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('should end a press whose element moves', async () => {
    const element = await create();

    await press(element);
    document.body.append(element);

    expect(rippleAnimations(element)).toEqual([]);
  });

  it('should start the ripple of a touch after a removal and a put-back', async () => {
    collectErrors();
    const element = await create();

    touch(element, 7);
    element.remove();
    await wait(300);
    document.body.append(element);
    await nextFrame();
    const left = rippleAnimations(element);
    touch(element, 9);
    await wait(300);
    const started = rippleAnimations(element).filter(
      (animation) => !left.includes(animation),
    );

    expect(started).toHaveLength(2);
  });

  it('should give a touch after a put-back its whole delay', async () => {
    const element = await create();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    touch(element, 7);
    vi.advanceTimersByTime(100);
    element.remove();
    document.body.append(element);
    touch(element, 9);
    vi.advanceTimersByTime(100);
    const early = rippleAnimations(element).length;
    vi.advanceTimersByTime(100);

    expect([early, rippleAnimations(element).length]).toEqual([0, 2]);
  });

  it('should leave no animation on an element that is put back', async () => {
    const element = await create();

    await press(element);
    await wait(300);
    element.remove();
    await nextFrame();
    document.body.append(element);
    await nextFrame();

    expect(rippleAnimations(element)).toEqual([]);
  });
});

describe('useRipple when a press starts during the fade', () => {
  it('should report no unhandled rejection', async () => {
    const errors = collectErrors();
    const element = await create();

    await clickUntilFade(element);
    controlOf(element).click();
    await wait(500);

    expect(errors).toEqual([]);
  });

  it('should show the ripple of the new press', async () => {
    collectErrors();
    const element = await create();

    await clickUntilFade(element);
    controlOf(element).click();

    expect([
      rippleAnimations(element).length,
      rippleAnimations(element).some(isFade),
    ]).toEqual([2, false]);
  });
});

describe('useRipple fade', () => {
  type Interaction = 'mouse' | 'keyboard';

  const ORDERS: ReadonlyArray<
    Readonly<{ name: string; order: readonly Interaction[] }>
  > = [
    { name: 'a mouse press', order: ['mouse'] },
    { name: 'a keyboard press', order: ['keyboard'] },
    {
      name: 'a mouse press and a keyboard press',
      order: ['mouse', 'keyboard'],
    },
    {
      name: 'a keyboard press and a mouse press',
      order: ['keyboard', 'mouse'],
    },
  ];

  /**
   * Records the circle's painted opacity before each fade and at the fade's
   * start.
   */
  function recordFades(
    element: HTMLElement,
  ): ReadonlyArray<readonly [before: string, start: string]> {
    const fades: Array<readonly [before: string, start: string]> = [];
    const ripple = element.shadowRoot!.querySelector<HTMLElement>('.ripple')!;
    const animate = ripple.animate.bind(ripple);
    const painted = (): string => getComputedStyle(ripple, '::after').opacity;
    ripple.animate = (keyframes, options) => {
      const before = painted();
      const animation = animate(keyframes, options);

      if (isFade(animation)) {
        animation.currentTime = 0;
        fades.push([before, painted()]);
      }

      return animation;
    };
    return fades;
  }

  async function activate(
    element: HTMLElement,
    interaction: Interaction,
  ): Promise<void> {
    const control = controlOf(element);

    if (interaction === 'keyboard') {
      control.focus();
      await userEvent.keyboard(' ');
      return;
    }

    await userEvent.hover(control);
    await press(element);
    await commands.pointerRelease();
  }

  describe.each(['mx-button', 'mx-checkbox', 'mx-radio'])('%s', (tag) => {
    it.each(ORDERS)(
      'should start from the painted opacity in $name',
      async ({ order }) => {
        const element = await create(tag);
        const fades = recordFades(element);

        for (const [index, interaction] of order.entries()) {
          // oxlint-disable-next-line no-await-in-loop
          await activate(element, interaction);
          // oxlint-disable-next-line no-await-in-loop
          await expect.poll(() => fades.length).toBe(index + 1);
          // oxlint-disable-next-line no-await-in-loop
          await userEvent.hover(document.body, { position: { x: 1, y: 1 } });
          // The fade ends and the state layer settles.
          // oxlint-disable-next-line no-await-in-loop
          await wait(300);
        }

        expect(fades.map(([, start]) => start)).toEqual(
          fades.map(([before]) => before),
        );
      },
    );
  });
});
