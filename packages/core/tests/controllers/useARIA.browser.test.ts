import { describe, expect, it } from 'vitest';
import {
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
});
