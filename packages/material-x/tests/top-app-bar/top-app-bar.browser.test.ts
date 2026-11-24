import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/icon-button.ts';
import '../../src/top-app-bar/top-app-bar.ts';
import { nextFrame } from '../browser.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

/** Takes its children out when it connects, before their own callbacks run. */
class EmptyingContainer extends HTMLElement {
  connectedCallback(): void {
    this.replaceChildren();
  }
}

customElements.define('test-emptying-container', EmptyingContainer);

/** Inserts the bar in a container that removes it in the same insertion. */
function insertAndRemove(bar: HTMLElement): void {
  const container = document.createElement('test-emptying-container');
  container.append(bar);
  document.body.append(container);
}

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
    await observed();
    const before = isScrolled(bar);
    await scrollPage(top);

    expect([before, scrollY > 0, isScrolled(bar)]).toEqual([false, true, true]);
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

  it('should report no error when another element removes the bar as it connects', () => {
    const errors: string[] = [];
    const listeners = new AbortController();
    onTestFinished(() => listeners.abort());
    window.addEventListener(
      'error',
      (event) => {
        event.preventDefault();
        errors.push(event.message);
      },
      { signal: listeners.signal },
    );
    const bar = document.createElement('mx-top-app-bar');

    insertAndRemove(bar);

    expect([bar.isConnected, errors]).toEqual([false, []]);
  });

  it.each([
    ['the start', 0],
    ['a scrolled position', 300],
  ] as const)(
    'should match %s when a bar removed as it connected is inserted there',
    async (_, top) => {
      createPage().remove();
      const bar = document.createElement('mx-top-app-bar');
      insertAndRemove(bar);
      await scrollPage(top);
      document.body.prepend(bar);
      await observed();
      const inserted = isScrolled(bar);
      // The other position, so that a bar without an observer doesn't match.
      await scrollPage(300 - top);

      expect([inserted, isScrolled(bar)]).toEqual([top > 0, top === 0]);
    },
  );

  it('should keep its value while the bar is disconnected', async () => {
    const bar = createPage();
    await observed();
    bar.remove();
    await scrollPage(300);

    expect(isScrolled(bar)).toBe(false);
  });

  it.each([
    'html { margin-top: 46px; }',
    'html { position: relative; top: 20px; }',
    'body { position: absolute; inset: 0 0 auto; }',
    'html { height: 0; }',
    'html { height: 100%; }',
  ])('should follow the scroll position with %s', async (css) => {
    addPageRule(css);
    const bar = createPage();
    const read: Array<readonly [number, boolean]> = [];
    const positions = [0, 1, innerHeight * 2, 0];

    for (const top of positions) {
      // oxlint-disable-next-line no-await-in-loop -- each position is a crossing
      await scrollPage(top);
      read.push([scrollY, isScrolled(bar)]);
    }

    expect(read).toEqual(positions.map((top) => [top, top > 0]));
  });

  it('should follow the block axis of a wide page scrolled sideways past one viewport', async () => {
    addPageRule('body { width: max-content; } #content { width: 6000px; }');
    const bar = createPage();
    const left = innerWidth * 2;
    const read: Array<readonly [number, number, boolean]> = [];

    for (const top of [0, 300]) {
      // oxlint-disable-next-line no-await-in-loop -- the second follows the first
      await scrollPage(top, left);
      read.push([scrollX, scrollY, isScrolled(bar)]);
    }

    expect(read).toEqual([
      [left, 0, false],
      [left, 300, true],
    ]);
  });

  it('should be off when a scrolled page becomes too short to scroll', async () => {
    // Vitest's page gives `body` the viewport's height, and its padding scrolls.
    addPageRule('body { min-block-size: 0 !important; }');
    const bar = createPage();
    await scrollPage(300);
    const before = isScrolled(bar);
    document.querySelector('#content')!.remove();
    await observed();

    expect([before, scrollY, isScrolled(bar)]).toEqual([true, 0, false]);
  });

  it('should be on when a bar hidden at the start is shown at a scrolled position', async () => {
    const bar = createPage();
    await observed();
    bar.style.display = 'none';
    await scrollPage(300);
    bar.style.display = '';
    await observed();

    expect(isScrolled(bar)).toBe(true);
  });

  it('should change once over many scroll steps away from the start', async () => {
    // Vitest's page gives `window` an `addEventListener` of its own.
    const listeners = [EventTarget.prototype, window].map((target) =>
      vi.spyOn(target, 'addEventListener'),
    );
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
      listeners: listeners
        .flatMap(({ mock }) => mock.calls)
        .filter(([type]) => type === 'scroll').length,
    }).toEqual({ changes: 1, listeners: 0 });
  });
});

describe('mx-top-app-bar position', () => {
  it('should take its space in the flow', () => {
    const bar = createPage();

    expect(bar.nextElementSibling!.getBoundingClientRect().top).toBe(
      bar.getBoundingClientRect().bottom,
    );
  });

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
  it('should hold only its three slots and the scroll start in its shadow root', () => {
    const bar = createPage();

    expect(
      [...bar.shadowRoot!.children].map(
        (child) => `${child.localName}.${child.className}`,
      ),
    ).toEqual(['slot.lead', 'slot.headline', 'slot.trail', 'div.scroll-start']);
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
