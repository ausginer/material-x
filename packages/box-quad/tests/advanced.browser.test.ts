import { afterEach, describe, expect, it } from 'vitest';
import { cache } from '../src/index.ts';
import {
  createBox,
  createFrame,
  createFlowBox,
  createShadowBox,
  expectQuad,
  readQuad,
  readSuccessfulQuad,
  resetDocument,
  sentinels,
  settleLayout,
  type Styles,
} from './support/fixtures.ts';

afterEach(resetDocument);

function createMultilineInline(): HTMLElement {
  const container = createFlowBox({
    styles: { width: '48px', lineHeight: '10px' },
  });
  const source = createFlowBox({
    parent: container,
    tag: 'span',
    styles: { display: 'inline', width: 'auto', height: 'auto' },
  });
  source.textContent = 'one two three four five';
  return source;
}

function createColumnFragment(): HTMLElement {
  const container = createFlowBox({
    styles: {
      width: '100px',
      height: '30px',
      columnCount: '2',
      columnGap: '0px',
      columnFill: 'auto',
    },
  });

  return createFlowBox({
    parent: container,
    styles: { display: 'block', width: '50px', height: '80px' },
  });
}

function createUnsupportedAncestor(
  styles: Readonly<Partial<Styles>>,
): HTMLElement {
  const ancestor = createBox({
    styles: { width: '100px', height: '100px', ...styles },
  });
  return createBox({ parent: ancestor });
}

describe('positioning, zoom, and scrolling', () => {
  // POSITION-01
  it('should keep a fixed source in viewport coordinates while the document scrolls', async () => {
    createBox({
      styles: { position: 'static', width: '1px', height: '2000px' },
    });
    const source = createBox({
      styles: { position: 'fixed', left: '30px', top: '40px' },
    });
    window.scrollTo(0, 400);
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // POSITION-02
  it('should include a transformed fixed containing block', () => {
    const parent = createBox({
      styles: {
        width: '100px',
        height: '100px',
        transform: 'translate(10px, 20px)',
      },
    });
    const source = createBox({
      parent,
      styles: { position: 'fixed', left: '5px', top: '7px' },
    });

    expectQuad(readSuccessfulQuad(source), [15, 27, 35, 27, 35, 37, 15, 37]);
  });

  // POSITION-03
  it('should read a sticky source before its inset threshold', async () => {
    const scroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    createFlowBox({
      parent: content,
      styles: { width: '100px', height: '60px' },
    });
    const source = createBox({
      parent: content,
      styles: { position: 'sticky', left: '0px', top: '30px' },
    });
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [0, 60, 20, 60, 20, 70, 0, 70]);
  });

  // POSITION-04
  it('should report a sticky source at its current stuck viewport position', async () => {
    const scroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    createFlowBox({
      parent: content,
      styles: { width: '100px', height: '60px' },
    });
    const source = createBox({
      parent: content,
      styles: { position: 'sticky', left: '0px', top: '30px' },
    });
    scroller.scrollTop = 40;
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [0, 30, 20, 30, 20, 40, 0, 40]);
  });

  // POSITION-05
  it('should convert fixed and sticky source geometry into an unrelated target', async () => {
    const target = createBox({ styles: { left: '50px', top: '60px' } });
    const source = createBox({
      styles: { position: 'fixed', left: '30px', top: '40px' },
    });
    await settleLayout();
    const out = new Float64Array(8);

    expect(readQuad(source, out, target)).toBe(true);
    expectQuad(out, [-20, -20, 0, -20, 0, -10, -20, -10]);
  });

  it.each([
    // ZOOM-01
    {
      description: 'integer ancestor zoom',
      parentStyles: { zoom: '2' },
      sourceStyles: { left: '10px', top: '15px' },
      expected: [20, 30, 60, 30, 60, 50, 20, 50],
      nested: false,
    },
    // ZOOM-02
    {
      description: 'fractional ancestor zoom',
      parentStyles: { zoom: '1.5' },
      sourceStyles: { left: '10px', top: '15px' },
      expected: [15, 22.5, 45, 22.5, 45, 37.5, 15, 37.5],
      nested: false,
    },
    // ZOOM-03
    {
      description: 'nested ancestor zoom',
      parentStyles: { zoom: '2' },
      sourceStyles: { left: '10px', top: '15px' },
      expected: [30, 45, 90, 45, 90, 75, 30, 75],
      nested: true,
    },
  ] as const)(
    'should compose $description into viewport geometry',
    ({ parentStyles, sourceStyles, expected, nested }) => {
      const outer = createBox({
        styles: { width: '200px', height: '200px', ...parentStyles },
      });
      const parent = nested
        ? createBox({
            parent: outer,
            styles: { width: '100px', height: '100px', zoom: '1.5' },
          })
        : outer;
      const source = createBox({ parent, styles: sourceStyles });

      expectQuad(readSuccessfulQuad(source), expected);
    },
  );

  // ZOOM-04
  it('should include source-owned zoom in its local-to-viewport space', () => {
    const source = createBox({
      styles: { left: '10px', top: '15px', zoom: '2' },
    });

    expectQuad(readSuccessfulQuad(source), [20, 30, 60, 30, 60, 50, 20, 50]);
  });

  // ZOOM-05
  it('should remove target zoom for target-local output', () => {
    const target = createBox({
      styles: { width: '100px', height: '100px', zoom: '2' },
    });
    const source = createBox({
      parent: target,
      styles: { left: '10px', top: '15px' },
    });

    expectQuad(
      readSuccessfulQuad(source, target),
      [10, 15, 30, 15, 30, 25, 10, 25],
    );
  });

  // ZOOM-06
  it('should compose each source and target branch independently', () => {
    const sourceParent = createBox({
      styles: { left: '20px', width: '100px', height: '100px', zoom: '2' },
    });
    const targetParent = createBox({
      styles: { left: '200px', width: '100px', height: '100px', zoom: '1.5' },
    });
    const source = createBox({
      parent: sourceParent,
      styles: { left: '10px', top: '15px' },
    });
    const target = createBox({
      parent: targetParent,
      styles: { left: '20px', top: '10px' },
    });

    expectQuad(
      readSuccessfulQuad(source, target),
      [-180, 10, -153.333333, 10, -153.333333, 23.333333, -180, 23.333333],
    );
  });

  // ZOOM-07
  it('should compose zoom and an ancestor transform', () => {
    const parent = createBox({
      styles: {
        width: '100px',
        height: '100px',
        zoom: '2',
        transform: 'translate(10px, 20px)',
      },
    });
    const source = createBox({ parent, styles: { left: '5px', top: '7px' } });

    expectQuad(readSuccessfulQuad(source), [30, 54, 70, 54, 70, 74, 30, 74]);
  });

  // ZOOM-08
  it('should apply a zoomed scroller offset once', async () => {
    const scroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto', zoom: '2' },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({
      parent: content,
      styles: { left: '10px', top: '100px' },
    });
    scroller.scrollTop = 30;
    await settleLayout();

    expectQuad(
      readSuccessfulQuad(source),
      [20, 140, 60, 140, 60, 160, 20, 160],
    );
  });

  // SCROLL-01
  it('should remain in layout viewport coordinates across page scroll', async () => {
    createBox({
      styles: { position: 'static', width: '1px', height: '2000px' },
    });
    const source = createBox({ styles: { top: '500px' } });
    window.scrollTo(0, 200);
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [0, 300, 20, 300, 20, 310, 0, 310]);
  });

  // SCROLL-02
  it('should apply one overflow scroller offset once', async () => {
    const scroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({ parent: content, styles: { top: '100px' } });
    scroller.scrollTop = 30;
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [0, 70, 20, 70, 20, 80, 0, 80]);
  });

  // SCROLL-03
  it('should compose nested overflow scroller offsets once each', async () => {
    const outer = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const outerContent = createBox({
      parent: outer,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const inner = createBox({
      parent: outerContent,
      styles: { width: '100px', height: '80px', overflow: 'auto', top: '80px' },
    });
    const innerContent = createBox({
      parent: inner,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({
      parent: innerContent,
      styles: { top: '100px' },
    });
    outer.scrollTop = 20;
    inner.scrollTop = 30;
    await settleLayout();

    expectQuad(readSuccessfulQuad(source), [0, 130, 20, 130, 20, 140, 0, 140]);
  });

  // SCROLL-04
  it('should cancel a shared scroll contribution in target-relative output', async () => {
    const scroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const target = createBox({ parent: content, styles: { top: '30px' } });
    const source = createBox({ parent: content, styles: { top: '100px' } });
    scroller.scrollTop = 20;
    await settleLayout();

    expectQuad(
      readSuccessfulQuad(source, target),
      [0, 70, 20, 70, 20, 80, 0, 80],
    );
  });

  // SCROLL-05
  it('should compose source and target independent scrollers through viewport space', async () => {
    const sourceScroller = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const sourceContent = createBox({
      parent: sourceScroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({
      parent: sourceContent,
      styles: { top: '100px' },
    });
    const targetScroller = createBox({
      styles: {
        left: '200px',
        width: '100px',
        height: '80px',
        overflow: 'auto',
      },
    });
    const targetContent = createBox({
      parent: targetScroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const target = createBox({
      parent: targetContent,
      styles: { top: '50px' },
    });
    sourceScroller.scrollTop = 20;
    targetScroller.scrollTop = 10;
    await settleLayout();

    expectQuad(
      readSuccessfulQuad(source, target),
      [-200, 40, -180, 40, -180, 50, -200, 50],
    );
  });

  // SCROLL-06
  it('should combine transformed and zoomed scrolling without duplicate offsets', async () => {
    const scroller = createBox({
      styles: {
        width: '100px',
        height: '80px',
        overflow: 'auto',
        zoom: '2',
        transform: 'translate(10px, 20px)',
      },
    });
    const content = createBox({
      parent: scroller,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({ parent: content, styles: { top: '100px' } });
    scroller.scrollTop = 30;
    await settleLayout();

    expectQuad(
      readSuccessfulQuad(source),
      [20, 180, 60, 180, 60, 200, 20, 200],
    );
  });
});

describe('relative targets, shadow trees, and physical writing modes', () => {
  it.each([
    // REL-01
    { description: 'a direct ancestor', distant: false },
    // REL-02
    { description: 'a distant ancestor', distant: true },
  ] as const)(
    'should convert source corners to $description local border-box space',
    ({ distant }) => {
      const targetStyles = {
        left: '30px',
        top: '40px',
        width: '100px',
        height: '100px',
      };
      const target = createBox({ styles: targetStyles });
      const parent = distant
        ? createBox({
            parent: target,
            styles: {
              left: '10px',
              top: '10px',
              width: '60px',
              height: '60px',
            },
          })
        : target;
      const source = createBox({ parent, styles: { left: '5px', top: '7px' } });

      expectQuad(
        readSuccessfulQuad(source, target),
        distant
          ? [15, 17, 35, 17, 35, 27, 15, 27]
          : [5, 7, 25, 7, 25, 17, 5, 17],
      );
    },
  );

  // REL-03
  it('should convert through independent viewport spaces for a non-ancestor target', () => {
    const source = createBox({ styles: { left: '30px', top: '40px' } });
    const target = createBox({ styles: { left: '100px', top: '200px' } });

    expectQuad(
      readSuccessfulQuad(source, target),
      [-70, -160, -50, -160, -50, -150, -70, -150],
    );
  });

  // REL-04
  it('should invert a transformed target space', () => {
    const source = createBox({ styles: { left: '20px', top: '10px' } });
    const target = createBox({
      styles: { transform: 'scale(2)', width: '100px', height: '100px' },
    });

    expectQuad(
      readSuccessfulQuad(source, target),
      [10, 5, 20, 5, 20, 10, 10, 10],
    );
  });

  // REL-05
  it('should report target-local CSS coordinates for a zoomed target', () => {
    const target = createBox({
      styles: { width: '100px', height: '100px', zoom: '2' },
    });
    const source = createBox({
      parent: target,
      styles: { left: '10px', top: '5px' },
    });

    expectQuad(
      readSuccessfulQuad(source, target),
      [10, 5, 30, 5, 30, 15, 10, 15],
    );
  });

  // REL-06
  it('should use target border space without subtracting target scroll twice', async () => {
    const target = createBox({
      styles: { width: '100px', height: '80px', overflow: 'auto' },
    });
    const content = createBox({
      parent: target,
      styles: { position: 'relative', width: '100px', height: '300px' },
    });
    const source = createBox({ parent: content, styles: { top: '100px' } });
    target.scrollTop = 30;
    await settleLayout();

    expectQuad(
      readSuccessfulQuad(source, target),
      [0, 70, 20, 70, 20, 80, 0, 80],
    );
  });

  // REL-07
  it('should return local corners for an invertible self target', () => {
    const source = createBox({ styles: { transform: 'rotate(90deg)' } });

    expectQuad(
      readSuccessfulQuad(source, source),
      [0, 0, 20, 0, 20, 10, 0, 10],
    );
  });

  it.each([
    // REL-08
    { description: 'a separate non-invertible target', self: false },
    // REL-09
    { description: 'a non-invertible self target', self: true },
  ] as const)('should fail atomically for $description', ({ self }) => {
    const source = createBox({ styles: { transform: 'scale(0)' } });
    const target = self
      ? source
      : createBox({ styles: { transform: 'scale(0)' } });
    const out = sentinels();

    expect(readQuad(source, out, target)).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  // REL-10
  it('should not detect boxes measured in different documents', () => {
    // Documented precondition, not a guarantee: `projection` is pure numeric
    // work over caller-owned arrays, so it has no document to compare. The old
    // single-call read could check because it held both elements; splitting
    // measurement from projection deliberately gives that up rather than
    // carrying hidden metadata in a `Float64Array`.
    const source = createBox();
    const target = createFrame().createElement('div');
    target.style.cssText = 'position:absolute;width:20px;height:10px';
    target.ownerDocument.body.append(target);
    const out = sentinels();

    expect(readQuad(source, out, target)).toBe(true);
  });

  // REL-11
  it('should invert a content-box-referenced target into its border-box coordinates', () => {
    const source = createBox({ styles: { left: '38px', top: '19px' } });
    const target = createBox({
      styles: {
        width: '50px',
        height: '30px',
        borderLeft: '2px solid black',
        borderRight: '4px solid black',
        borderTop: '3px solid black',
        borderBottom: '5px solid black',
        padding: '4px 8px 6px 6px',
        transformBox: 'content-box',
        transform: 'scale(2)',
        transformOrigin: '100% 100%',
      },
    });

    expectQuad(
      readSuccessfulQuad(source, target),
      [38, 19, 48, 19, 48, 24, 38, 24],
    );
  });

  it.each([
    // SHADOW-01
    { description: 'an open shadow root', mode: 'open' },
    // SHADOW-02
    { description: 'a closed shadow root', mode: 'closed' },
  ] as const)('should include host geometry for $description', ({ mode }) => {
    const { source } = createShadowBox(mode);

    expectQuad(readSuccessfulQuad(source), [30, 35, 50, 35, 50, 45, 30, 45]);
  });

  // SHADOW-03
  it('should follow a transformed rendered slot rather than light-DOM parentNode', () => {
    const host = createBox({ styles: { width: '100px', height: '100px' } });
    const root = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    slot.style.cssText =
      'display:block;transform:translate(10px, 20px);transform-origin:0 0';
    root.append(slot);
    const source = createBox({ parent: host, styles: { position: 'static' } });

    expectQuad(readSuccessfulQuad(source), [10, 20, 30, 20, 30, 30, 10, 30]);
  });

  // SHADOW-04
  it('should convert across a same-document shadow boundary', () => {
    const { source } = createShadowBox('open');
    const target = createBox({ styles: { left: '100px', top: '100px' } });

    expectQuad(
      readSuccessfulQuad(source, target),
      [-70, -65, -50, -65, -50, -55, -70, -55],
    );
  });

  // SHADOW-05
  it('should apply nested host and slot transforms once', () => {
    const host = createBox({
      styles: {
        width: '100px',
        height: '100px',
        transform: 'translate(10px, 20px)',
      },
    });
    const root = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    slot.style.cssText =
      'display:block;transform:translate(5px, 7px);transform-origin:0 0';
    root.append(slot);
    const source = createBox({
      parent: host,
      styles: { position: 'static', zoom: '2' },
    });

    expectQuad(readSuccessfulQuad(source), [15, 27, 55, 27, 55, 47, 15, 47]);
  });

  it.each([
    // WRITING-01
    {
      description: 'vertical-rl writing',
      styles: { writingMode: 'vertical-rl' },
    },
    // WRITING-02
    {
      description: 'vertical-lr writing',
      styles: { writingMode: 'vertical-lr' },
    },
    // WRITING-03
    { description: 'right-to-left direction', styles: { direction: 'rtl' } },
  ] as const)(
    'should keep source corners in physical p1-to-p4 order for $description',
    ({ styles }) => {
      expectQuad(
        readSuccessfulQuad(createBox({ styles })),
        [0, 0, 20, 0, 20, 10, 0, 10],
      );
    },
  );

  // WRITING-04
  it('should keep target-relative axes physical across writing modes', () => {
    const source = createBox({
      styles: { left: '30px', top: '40px', writingMode: 'vertical-rl' },
    });
    const target = createBox({ styles: { writingMode: 'vertical-lr' } });

    expectQuad(
      readSuccessfulQuad(source, target),
      [30, 40, 50, 40, 50, 50, 30, 50],
    );
  });

  // WRITING-05
  it('should apply ordinary transform and zoom composition to vertical writing', () => {
    const source = createBox({
      styles: {
        writingMode: 'vertical-rl',
        zoom: '2',
        transform: 'translate(5px, 7px)',
      },
    });

    expectQuad(readSuccessfulQuad(source), [10, 14, 50, 14, 50, 34, 10, 34]);
  });
});

describe('recognized unsupported geometry and cache epochs', () => {
  it.each([
    // UNSUPPORTED-01
    {
      description: 'a multiline inline source',
      create: createMultilineInline,
      fragmented: true,
    },
    // UNSUPPORTED-02
    {
      description: 'a genuinely 3D transform',
      create: () => createBox({ styles: { transform: 'rotateX(20deg)' } }),
      fragmented: false,
    },
    {
      description: 'a genuinely 3D individual rotation',
      create: () => createBox({ styles: { rotate: 'x 90deg' } }),
      fragmented: false,
    },
    // UNSUPPORTED-03
    {
      description: 'perspective',
      create: () => createUnsupportedAncestor({ perspective: '100px' }),
      fragmented: false,
    },
    // UNSUPPORTED-04
    {
      description: 'preserve-3d',
      create: () =>
        createUnsupportedAncestor({ transformStyle: 'preserve-3d' }),
      fragmented: false,
    },
    // UNSUPPORTED-05
    {
      description: 'fragmented layout',
      create: createColumnFragment,
      fragmented: true,
    },
  ] as const)(
    'should fail atomically for $description',
    ({ create, fragmented }) => {
      const source = create();
      const out = sentinels();

      if (fragmented) {
        expect(source.getClientRects().length).toBeGreaterThan(1);
      }

      expect(readQuad(source, out)).toBe(false);
      expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
    },
  );

  it('should fail atomically for a fragmented target', () => {
    const source = createBox();
    const target = createColumnFragment();
    const out = sentinels();

    expect(target.getClientRects().length).toBeGreaterThan(1);
    expect(readQuad(source, out, target)).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  // CACHE-01
  it('should return correct unchanged geometry within one measurement epoch', () => {
    const recache = cache();
    const source = createBox();
    const first = new Float64Array(8);
    const second = new Float64Array(8);

    expect(readQuad(source, first, undefined, recache)).toBe(true);
    expect(readQuad(source, second, undefined, recache)).toBe(true);
    expectQuad(first, second);
  });

  // CACHE-04
  it('should permit a stale observation while one cache identity is reused', () => {
    const recache = cache();
    const source = createBox();
    const first = readSuccessfulQuad(source, undefined, recache);
    source.style.left = '30px';
    const later = readSuccessfulQuad(source, undefined, recache);

    expect([Array.from(first), [30, 0, 50, 0, 50, 10, 30, 10]]).toContainEqual(
      Array.from(later),
    );
  });

  // CACHE-05
  it('should observe changed geometry when a new cache starts an epoch', () => {
    const recache = cache();
    const source = createBox();
    readSuccessfulQuad(source, undefined, recache);
    source.style.left = '30px';

    expectQuad(
      readSuccessfulQuad(source, undefined, cache()),
      [30, 0, 50, 0, 50, 10, 30, 10],
    );
  });

  // CACHE-06
  it('should perform fresh reads when no cache is supplied', () => {
    const source = createBox();
    const first = new Float64Array(8);
    const second = new Float64Array(8);

    expect(readQuad(source, first)).toBe(true);
    source.style.left = '30px';
    expect(readQuad(source, second)).toBe(true);
    expectQuad(second, [30, 0, 50, 0, 50, 10, 30, 10]);
  });

  // CACHE-11
  it('should remeasure cached geometry after cross-document adoption', () => {
    const firstDocument = createFrame();
    const secondDocument = createFrame();
    const source = firstDocument.createElement('div');
    source.style.cssText =
      'position:absolute;left:10px;top:20px;width:20px;height:10px;box-sizing:border-box';
    firstDocument.body.append(source);
    const recache = cache();

    expectQuad(
      readSuccessfulQuad(source, undefined, recache),
      [10, 20, 30, 20, 30, 30, 10, 30],
    );

    secondDocument.adoptNode(source);
    source.style.left = '40px';
    source.style.top = '60px';
    secondDocument.body.append(source);
    const target = secondDocument.createElement('div');
    target.style.cssText =
      'position:absolute;left:10px;top:20px;width:20px;height:10px;box-sizing:border-box';
    secondDocument.body.append(target);

    expectQuad(
      readSuccessfulQuad(source, target, recache),
      [30, 40, 50, 40, 50, 50, 30, 50],
    );
  });
});
