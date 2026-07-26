import { afterEach, describe, expect, it } from 'vitest';
import { createCache, getBoxQuad, readBoxQuad } from '../src/index.js';
import {
  createBox,
  createFrame,
  expectQuad,
  resetDocument,
  sentinels,
} from './support/fixtures.ts';

afterEach(resetDocument);

describe('public API', () => {
  // API-01
  it('should write all corners into the caller-owned output', () => {
    const source = createBox({ styles: { left: '100px', top: '50px' } });
    const out = sentinels();

    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [100, 50, 120, 50, 120, 60, 100, 60]);
  });

  // API-02
  it('should reuse and replace the supplied output on repeated reads', () => {
    const source = createBox();
    const out = sentinels();

    expect(readBoxQuad(source, out)).toBe(true);
    source.style.left = '30px';
    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [30, 0, 50, 0, 50, 10, 30, 10]);
  });

  // API-03
  it('should preserve every output sentinel on a recognized failure', () => {
    const source = createBox();
    const out = sentinels();

    source.remove();

    expect(readBoxQuad(source, out)).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  // API-04
  it('should return the low-level geometry in a new Float64Array', () => {
    const source = createBox({ styles: { left: '100px', top: '50px' } });
    const direct = new Float64Array(8);

    expect(readBoxQuad(source, direct)).toBe(true);
    const wrapped = getBoxQuad(source);

    expect(wrapped).toBeInstanceOf(Float64Array);
    expectQuad(wrapped!, direct);
  });

  // API-05
  it('should allocate distinct wrapper outputs', () => {
    const source = createBox();
    const first = getBoxQuad(source);
    const second = getBoxQuad(source);

    expect(first).not.toBe(second);
    expectQuad(first!, second!);
  });

  // API-06
  it('should map a low-level failure to null', () => {
    const source = createBox();
    source.remove();

    expect(getBoxQuad(source)).toBeNull();
  });

  // API-07
  it('should let an unexpected platform exception escape', () => {
    const source = createBox();
    const out = sentinels();
    const original = Object.getOwnPropertyDescriptor(source, 'ownerDocument');

    try {
      Object.defineProperty(source, 'ownerDocument', {
        configurable: true,
        get() {
          throw new Error('owner document failed');
        },
      });

      expect(() => readBoxQuad(source, out)).toThrow('owner document failed');
    } finally {
      if (original) {
        Object.defineProperty(source, 'ownerDocument', original);
      } else {
        Reflect.deleteProperty(source, 'ownerDocument');
      }
    }
  });

  // API-08
  it('should not delegate to native getBoxQuads', () => {
    const source = createBox();
    const out = new Float64Array(8);
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'getBoxQuads',
    );

    try {
      Object.defineProperty(Element.prototype, 'getBoxQuads', {
        configurable: true,
        value() {
          throw new Error('native getBoxQuads must not be called');
        },
      });

      expect(readBoxQuad(source, out)).toBe(true);
    } finally {
      if (descriptor) {
        Object.defineProperty(Element.prototype, 'getBoxQuads', descriptor);
      } else {
        Reflect.deleteProperty(Element.prototype, 'getBoxQuads');
      }
    }
  });

  // API-09
  it('should read source and target wholly inside their iframe document', () => {
    const frameDocument = createFrame();
    const source = frameDocument.createElement('div');
    source.style.cssText =
      'position:absolute;left:40px;top:60px;width:20px;height:10px;box-sizing:border-box';
    frameDocument.body.append(source);
    const target = frameDocument.createElement('div');
    target.style.cssText =
      'position:absolute;left:10px;top:20px;width:40px;height:30px;box-sizing:border-box';
    frameDocument.body.append(target);
    const out = new Float64Array(8);

    expect(readBoxQuad(source, out, target)).toBe(true);
    expectQuad(out, [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // API-09
  it('should use an iframe document viewport for default output', () => {
    const frameDocument = createFrame();
    const source = frameDocument.createElement('div');
    source.style.cssText =
      'position:absolute;left:40px;top:60px;width:20px;height:10px;box-sizing:border-box';
    frameDocument.body.append(source);

    expectQuad(getBoxQuad(source)!, [40, 60, 60, 60, 60, 70, 40, 70]);
  });

  // API-10
  it('should use the source document DOMMatrix without changing wrapper array realm', () => {
    const frameDocument = createFrame();
    const frameWindow = frameDocument.defaultView!;
    const source = frameDocument.createElement('div');
    source.style.cssText =
      'position:absolute;width:20px;height:10px;box-sizing:border-box';
    frameDocument.body.append(source);
    const OriginalDOMMatrix = frameWindow.DOMMatrix;
    let constructed = 0;

    frameWindow.DOMMatrix = class extends OriginalDOMMatrix {
      constructor(...args: ConstructorParameters<typeof DOMMatrix>) {
        super(...args);
        constructed += 1;
      }
    };

    let result: Float64Array | null;

    try {
      result = getBoxQuad(source);
    } finally {
      frameWindow.DOMMatrix = OriginalDOMMatrix;
    }

    expect(constructed).toBeGreaterThan(0);
    expect(result).toBeInstanceOf(Float64Array);
    expect(result).not.toBeInstanceOf(frameWindow.Float64Array);
  });

  // CACHE-10
  it('should keep separate caches independent', () => {
    const source = createBox();
    const first = createCache();
    const second = createCache();
    const firstOut = new Float64Array(8);
    const secondOut = new Float64Array(8);

    expect(readBoxQuad(source, firstOut, undefined, first)).toBe(true);
    source.style.left = '30px';
    expect(readBoxQuad(source, secondOut, undefined, second)).toBe(true);
    expectQuad(secondOut, [30, 0, 50, 0, 50, 10, 30, 10]);
  });
});
