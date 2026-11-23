import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/icon-button.ts';
import '../../src/top-app-bar/top-app-bar.ts';
import { nextFrame } from '../browser.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

function addPageRule(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  onTestFinished(() => style.remove());
}

/** A page taller than the viewport, with a bar as a child of `body`. */
function createPage(): HTMLElement {
  const bar = document.createElement('mx-top-app-bar');
  bar.id = 'bar';
  bar.textContent = 'Headline';
  const content = document.createElement('div');
  content.id = 'content';
  content.style.cssText = 'position: relative; block-size: 5000px;';
  document.body.append(bar, content);

  return bar;
}

/**
 * Resolves after the bar's observer has reported the current scroll position.
 * This observer is created later than the bar's and its first report is due in
 * the same frame, so the bar's callback has run before it.
 */
async function observed(): Promise<void> {
  await nextFrame();
  await new Promise<void>((resolve) => {
    const observer = new IntersectionObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(document.body);
  });
  await nextFrame();
}

async function scrollPage(top: number, left = 0): Promise<void> {
  scrollTo({ top, left, behavior: 'instant' });
  await observed();
}

function isScrolled(bar: HTMLElement): boolean {
  return bar.matches(':state(scrolled)');
}

afterEach(() => {
  scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

describe('mx-top-app-bar scrolled state', () => {
  it("should be off at the document's start", async () => {
    const bar = createPage();
    await observed();

    expect(isScrolled(bar)).toBe(false);
  });

  it.each([
    ['1px', 1],
    ['a jump to the end', 1e6],
  ] as const)('should be on after %s', async (_, top) => {
    const bar = createPage();
    await scrollPage(top);

    expect([scrollY > 0, isScrolled(bar)]).toEqual([true, true]);
  });

  it('should be off again at the start', async () => {
    const bar = createPage();
    await scrollPage(1e6);
    await scrollPage(0);

    expect(isScrolled(bar)).toBe(false);
  });

  it('should be on when the bar connects to a scrolled page', async () => {
    createPage();
    await scrollPage(300);
    const bar = document.createElement('mx-top-app-bar');
    document.body.prepend(bar);
    await observed();

    expect(isScrolled(bar)).toBe(true);
  });

  it.each([
    ['the start', 300, 0],
    ['a scrolled position', 0, 300],
  ] as const)(
    'should match %s when the bar reconnects there',
    async (_, before, after) => {
      const bar = createPage();
      await scrollPage(before);
      bar.remove();
      await scrollPage(after);
      document.body.prepend(bar);
      await observed();

      expect(isScrolled(bar)).toBe(after > 0);
    },
  );

  it('should keep its value while the bar is disconnected', async () => {
    const bar = createPage();
    await observed();
    bar.remove();
    await scrollPage(300);

    expect(isScrolled(bar)).toBe(false);
  });

  it('should stay on past one viewport with html { height: 100% }', async () => {
    addPageRule('html { height: 100%; }');
    const bar = createPage();
    await scrollPage(1);
    await scrollPage(innerHeight * 2);

    expect(isScrolled(bar)).toBe(true);
  });

  it('should stay on when a wide page is scrolled sideways past one viewport', async () => {
    addPageRule('body { width: max-content; } #content { width: 6000px; }');
    const bar = createPage();
    await scrollPage(300);
    await scrollPage(300, innerWidth * 2);

    expect([scrollX, isScrolled(bar)]).toEqual([innerWidth * 2, true]);
  });

  it('should change once over many scroll steps away from the start', async () => {
    const listen = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const add = vi.spyOn(CustomStateSet.prototype, 'add');
    const remove = vi.spyOn(CustomStateSet.prototype, 'delete');
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const changes = () =>
      [...add.mock.calls, ...remove.mock.calls].filter(
        ([state]) => state === 'scrolled',
      ).length;
    createPage();
    await observed();
    const before = changes();

    for (let step = 1; step <= 50; step += 1) {
      scrollTo({ top: step * 20, behavior: 'instant' });
      // oxlint-disable-next-line no-await-in-loop -- one frame per step
      await nextFrame();
    }
    await observed();

    expect({
      changes: changes() - before,
      listeners: listen.mock.calls.filter(([type]) => type === 'scroll').length,
    }).toEqual({ changes: 1, listeners: 0 });
  });
});

describe('mx-top-app-bar position', () => {
  it('should stay at the top of a scrolled page', async () => {
    const bar = createPage();
    await scrollPage(300);

    expect(bar.getBoundingClientRect().top).toBe(0);
  });

  it('should keep positioned content under it', async () => {
    const bar = createPage();
    await scrollPage(300);
    const { left, width, height } = bar.getBoundingClientRect();
    const hit = document.elementFromPoint(left + width / 2, height / 2);

    expect(hit).toBe(bar);
  });

  it("should be unpinned by a page's position: static", async () => {
    addPageRule('mx-top-app-bar { position: static; }');
    const bar = createPage();
    const { top } = bar.getBoundingClientRect();
    await scrollPage(300);

    expect(bar.getBoundingClientRect().top).toBe(top - 300);
  });
});

describe('mx-top-app-bar accessibility', () => {
  it('should hold only its three slots in its shadow root', () => {
    const bar = createPage();

    expect(
      [...bar.shadowRoot!.children].map(
        (child) => `${child.localName}.${child.className}`,
      ),
    ).toEqual(['slot.lead', 'slot.headline', 'slot.trail']);
  });

  it('should add no role attribute and no tabindex to its host', async () => {
    const bar = createPage();
    await observed();

    expect([
      bar.hasAttribute('role'),
      bar.hasAttribute('tabindex'),
      bar.tabIndex,
    ]).toEqual([false, false, -1]);
  });

  it('should take focus in the order lead, headline, trail', async () => {
    const bar = createPage();
    const lead = document.createElement('mx-icon-button');
    const headline = document.createElement('a');
    const trail = document.createElement('mx-icon-button');
    const before = document.createElement('button');
    const after = document.createElement('button');
    lead.slot = 'lead';
    headline.href = '#target';
    headline.textContent = 'Headline';
    trail.slot = 'trail';
    bar.replaceChildren(lead, headline, trail);
    bar.before(before);
    bar.after(after);
    await nextFrame();
    before.focus();
    const reached: Array<Element | null> = [];

    for (let step = 0; step < 4; step += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one key press per step
      await userEvent.keyboard(TAB);
      reached.push(document.activeElement);
    }

    expect(reached).toEqual([lead, headline, trail, after]);
  });

  describe.runIf(server.browser === 'chromium')(
    "Chromium's accessibility tree",
    () => {
      it('should expose no landmark of its own', async () => {
        createPage();
        await nextFrame();
        const tree = await commands.readAccessibilityTree('#bar');

        expect(tree.role).toBe('generic');
      });

      it("should expose a consumer's role=banner", async () => {
        createPage().setAttribute('role', 'banner');
        await nextFrame();
        const tree = await commands.readAccessibilityTree('#bar');

        expect(tree.role).toBe('banner');
      });
    },
  );
});
