import type { Constructor } from 'type-fest';
import { describe, expect, it } from 'vitest';
import {
  useARIA,
  type ARIATransformer,
} from '../../src/controllers/useARIA.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE, nextFrame } from '../browser.ts';

function createHost(
  transform?: ARIATransformer,
): readonly [ctr: Constructor<ControlledElement>, target: HTMLDivElement] {
  const target = document.createElement('div');

  const Host = class extends ControlledElement {
    constructor() {
      super();
      useARIA(this, target, transform);
      this.append(target);
    }
  };

  return [Host, target] as const;
}

describe('useARIA', () => {
  it('should sync existing aria attributes on connect', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('aria-label', 'Launch');
    document.body.append(host);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Launch');
  });

  it('should ignore non-aria attributes during initial sync', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('title', 'Launch');
    document.body.append(host);
    await nextFrame();

    expect(target).not.toHaveAttribute('title');
  });

  it('should sync aria attribute updates after connection', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    await nextFrame();

    host.setAttribute('aria-describedby', 'hint');
    await nextFrame();

    expect(target).toHaveAttribute('aria-describedby', 'hint');
  });

  it('should remove the target aria attribute when the host value becomes null', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('aria-label', 'Launch');
    document.body.append(host);
    await nextFrame();

    host.removeAttribute('aria-label');
    await nextFrame();

    expect(target).not.toHaveAttribute('aria-label');
  });

  it('should apply the transformer before writing the aria value', async () => {
    const [Host, target] = createHost((name, value) =>
      value == null ? null : `${name}:${value.toUpperCase()}`,
    );
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('aria-label', 'launch');
    document.body.append(host);
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'aria-label:LAUNCH');
  });

  it('should ignore non-aria attribute mutations after connection', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    document.body.append(host);
    await nextFrame();

    host.setAttribute('data-state', 'open');
    await nextFrame();

    expect(target).not.toHaveAttribute('data-state');
  });

  it('should preserve multiple aria attributes independently', async () => {
    const [Host, target] = createHost();
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    host.setAttribute('aria-label', 'Launch');
    host.setAttribute('aria-describedby', 'hint');
    document.body.append(host);
    await nextFrame();

    host.setAttribute('aria-label', 'Open');
    await nextFrame();

    expect(target).toHaveAttribute('aria-label', 'Open');
    expect(target).toHaveAttribute('aria-describedby', 'hint');
  });
});
