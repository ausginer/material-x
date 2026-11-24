import { describe, expect, it, vi } from 'vitest';
import {
  setOwnARIA,
  useARIA,
  type ARIATransformer,
} from '../../src/controllers/useARIA.ts';
import { host, nextFrame } from '../browser.ts';

describe('useARIA', () => {
  it('should sync existing aria attributes on connect', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Launch');
  });

  it('should ignore non-aria attributes during initial sync', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    el.setAttribute('title', 'Launch');
    document.body.append(el);
    await nextFrame();

    expect(target).not.toHaveAttribute('title');
  });

  it('should sync aria attribute updates after connection', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    document.body.append(el);
    await nextFrame();

    el.setAttribute('aria-describedby', 'hint');
    await nextFrame();

    expect(target).toHaveAttribute('aria-describedby', 'hint');
  });

  it('should remove the target aria attribute when the host value becomes null', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();

    el.removeAttribute('aria-label');
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should apply the transformer before writing the aria value', async () => {
    const transform: ARIATransformer = (name, value) =>
      value == null ? null : `${name}:${value.toUpperCase()}`;
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target, transform);
      h.append(target);
    });

    el.setAttribute('aria-label', 'launch');
    document.body.append(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'aria-label:LAUNCH');
  });

  it('should ignore non-aria attribute mutations after connection', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    document.body.append(el);
    await nextFrame();

    el.setAttribute('data-state', 'open');
    await nextFrame();

    expect(target).not.toHaveAttribute('data-state');
  });

  it('should preserve multiple aria attributes independently', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
      h.append(target);
    });

    el.setAttribute('aria-label', 'Launch');
    el.setAttribute('aria-describedby', 'hint');
    document.body.append(el);
    await nextFrame();

    el.setAttribute('aria-label', 'Open');
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Open');
    expect(target).toHaveAttribute('aria-describedby', 'hint');
  });

  it('should remove the target attribute when the host attribute is removed while disconnected', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.remove();
    el.removeAttribute('aria-label');
    await nextFrame();
    document.body.append(el);
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should remove an attribute mirrored after connection when it is removed while disconnected', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    document.body.append(el);
    el.setAttribute('aria-label', 'Launch');
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.remove();
    el.removeAttribute('aria-label');
    await nextFrame();
    document.body.append(el);
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should remove the target attribute when the host loses it and disconnects in one task', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.removeAttribute('aria-label');
    el.remove();
    await nextFrame();
    document.body.append(el);
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should remove the target attribute when the host loses it and moves in one task', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.removeAttribute('aria-label');
    document.body.prepend(el);
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should write the transformed null when the host attribute is removed while disconnected', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target, (_, value) => value ?? 'Fallback');
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.remove();
    el.removeAttribute('aria-label');
    await nextFrame();
    document.body.append(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Fallback');
  });

  it('should keep an aria attribute of the target that the host never had on reconnect', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    target.setAttribute('aria-expanded', 'true');
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.remove();
    el.removeAttribute('aria-label');
    await nextFrame();
    document.body.append(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-expanded', 'true');
  });

  it("should keep the target's own value after the host lost its own while connected and moved", async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.removeAttribute('aria-label');
    await nextFrame();
    target.setAttribute('aria-label', 'Own');
    document.body.prepend(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Own');
  });

  it("should keep the target's own value written after the host lost its own while disconnected", async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.remove();
    el.removeAttribute('aria-label');
    await nextFrame();
    target.setAttribute('aria-label', 'Own');
    document.body.append(el);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Own');
  });

  it('should remove the lost attribute in the connect itself when the host loses it and moves in one task', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.removeAttribute('aria-label');
    document.body.prepend(el);

    expect(target).not.toHaveAttribute('aria-label');
  });

  it("should copy the host's value over the target's own on reconnect", async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();
    target.setAttribute('aria-label', 'Own');
    document.body.prepend(el);

    expect(target).toHaveAttribute('aria-label', 'Launch');
  });

  it('should sync a host that has never been connected', async () => {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target);
    });

    el.setAttribute('aria-label', 'Launch');
    await nextFrame();
    expect(target).toHaveAttribute('aria-label', 'Launch');

    el.removeAttribute('aria-label');
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should transform a name set just before the connect once', async () => {
    const transform = vi.fn<ARIATransformer>((_, value) => value);
    const el = host((h) => {
      useARIA(h, document.createElement('div'), transform);
    });

    el.setAttribute('aria-label', 'Launch');
    document.body.append(el);
    await nextFrame();

    expect(transform).toHaveBeenCalledExactlyOnceWith('aria-label', 'Launch');
  });
});

describe('setOwnARIA', () => {
  const NAME = 'aria-disabled';

  function createMirrored(
    transform?: ARIATransformer,
  ): Readonly<{ el: HTMLElement; target: HTMLElement }> {
    const target = document.createElement('div');
    const el = host((h) => {
      useARIA(h, target, transform);
    });

    return { el, target };
  }

  it('should write the attribute of a target with no mirror', () => {
    const target = document.createElement('div');

    setOwnARIA(target, NAME, 'true');

    expect(target).toHaveAttribute(NAME, 'true');
  });

  it('should remove the attribute of a target with no mirror for null', () => {
    const target = document.createElement('div');
    target.setAttribute(NAME, 'true');

    setOwnARIA(target, NAME, null);

    expect(target).not.toHaveAttribute(NAME);
  });

  it('should write the own value at once while the host gives none', () => {
    const { target } = createMirrored();

    setOwnARIA(target, NAME, 'true');

    expect(target).toHaveAttribute(NAME, 'true');
  });

  it('should give the own value again when the host loses its value', async () => {
    const { el, target } = createMirrored();
    document.body.append(el);
    setOwnARIA(target, NAME, 'true');
    el.setAttribute(NAME, 'false');
    await nextFrame();
    expect(target).toHaveAttribute(NAME, 'false');

    el.removeAttribute(NAME);
    await nextFrame();

    expect(target).toHaveAttribute(NAME, 'true');
  });

  it("should keep the host's value when the own value changes", async () => {
    const { el, target } = createMirrored();
    document.body.append(el);
    el.setAttribute(NAME, 'false');
    await nextFrame();

    setOwnARIA(target, NAME, 'true');

    expect(target).toHaveAttribute(NAME, 'false');
  });

  it('should give the own value that changed while the host gave the name', async () => {
    const { el, target } = createMirrored();
    document.body.append(el);
    setOwnARIA(target, NAME, 'true');
    el.setAttribute(NAME, 'false');
    await nextFrame();
    setOwnARIA(target, NAME, 'mixed');
    el.removeAttribute(NAME);
    await nextFrame();

    expect(target).toHaveAttribute(NAME, 'mixed');
  });

  it('should have no attribute after the loss when the own value is null', async () => {
    const { el, target } = createMirrored();
    document.body.append(el);
    setOwnARIA(target, NAME, 'true');
    el.setAttribute(NAME, 'false');
    await nextFrame();
    setOwnARIA(target, NAME, null);
    expect(target).toHaveAttribute(NAME, 'false');
    el.removeAttribute(NAME);
    await nextFrame();

    expect(target).not.toHaveAttribute(NAME);
  });

  it("should put the transformer's answer before the own value", async () => {
    const { el, target } = createMirrored((_, value) => value ?? 'Answer');
    document.body.append(el);
    setOwnARIA(target, NAME, 'true');
    await nextFrame();

    expect(target).toHaveAttribute(NAME, 'Answer');
  });

  it("should give the own value for the transformer's null", async () => {
    const { el, target } = createMirrored(() => null);
    document.body.append(el);
    setOwnARIA(target, NAME, 'true');
    el.setAttribute(NAME, 'false');
    await nextFrame();

    expect(target).toHaveAttribute(NAME, 'true');
  });

  describe('in the task of the loss', () => {
    const ORDERS: ReadonlyArray<
      Readonly<{
        order: string;
        change: (el: HTMLElement, target: HTMLElement) => void;
      }>
    > = [
      {
        order: 'the loss and then the own value',
        change(el, target) {
          el.removeAttribute(NAME);
          setOwnARIA(target, NAME, 'true');
        },
      },
      {
        order: 'the own value and then the loss',
        change(el, target) {
          setOwnARIA(target, NAME, 'true');
          el.removeAttribute(NAME);
        },
      },
    ];

    it.each(ORDERS)(
      'should give the own value after $order while connected',
      async ({ change }) => {
        const { el, target } = createMirrored();
        document.body.append(el);
        el.setAttribute(NAME, 'false');
        await nextFrame();
        change(el, target);
        await nextFrame();

        expect(target).toHaveAttribute(NAME, 'true');
      },
    );

    describe.each(ORDERS)('$order while out', ({ change }) => {
      async function reconnect(): Promise<HTMLElement> {
        const { el, target } = createMirrored();
        document.body.append(el);
        el.setAttribute(NAME, 'false');
        await nextFrame();
        el.remove();
        await nextFrame();
        change(el, target);
        document.body.append(el);

        return target;
      }

      it('should give the own value in the connect', async () => {
        expect(await reconnect()).toHaveAttribute(NAME, 'true');
      });

      it('should give the own value after the task', async () => {
        const target = await reconnect();
        await nextFrame();

        expect(target).toHaveAttribute(NAME, 'true');
      });
    });

    describe.each(ORDERS)('$order before the first connect', ({ change }) => {
      function connect(): HTMLElement {
        const { el, target } = createMirrored();
        el.setAttribute(NAME, 'false');
        change(el, target);
        document.body.append(el);

        return target;
      }

      it('should give the own value in the connect', () => {
        expect(connect()).toHaveAttribute(NAME, 'true');
      });

      it('should give the own value after the task', async () => {
        const target = connect();
        await nextFrame();

        expect(target).toHaveAttribute(NAME, 'true');
      });
    });
  });
});
