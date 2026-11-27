import { describe, expect, it } from 'vitest';
import { AttributeClaimer } from '../../src/utils/AttributeClaimer.ts';

/** Lets the observer receive the records of the writes made before it. */
async function observed(): Promise<void> {
  await Promise.resolve();
}

function setup(): readonly [element: HTMLElement, claimer: AttributeClaimer] {
  const element = document.createElement('div');
  document.body.append(element);

  return [element, new AttributeClaimer(element)];
}

describe('AttributeClaimer', () => {
  it('should write a value on an element without the attribute', () => {
    const [element, claimer] = setup();

    claimer.set({ role: 'button' });

    expect(element.getAttribute('role')).toBe('button');
  });

  it('should rewrite a value while it is still its own', async () => {
    const [element, claimer] = setup();
    claimer.set({ tabindex: '0' });
    await observed();

    claimer.set({ tabindex: '-1' });

    expect(element.getAttribute('tabindex')).toBe('-1');
  });

  it('should write a value again after another writer removed it', async () => {
    const [element, claimer] = setup();
    claimer.set({ role: 'button' });
    await observed();
    element.removeAttribute('role');
    await observed();

    claimer.set({ role: 'button' });

    expect(element.getAttribute('role')).toBe('button');
  });

  it('should keep a value that the element has before the claim', () => {
    const [element, claimer] = setup();
    element.setAttribute('role', 'tab');

    claimer.set({ role: 'button' });

    expect(element.getAttribute('role')).toBe('tab');
  });

  it('should remove its own value for null', async () => {
    const [element, claimer] = setup();
    claimer.set({ 'aria-disabled': 'true' });
    await observed();

    claimer.set({ 'aria-disabled': null });

    expect(element.hasAttribute('aria-disabled')).toBe(false);
  });

  it("should keep another writer's value for null", () => {
    const [element, claimer] = setup();
    element.setAttribute('aria-disabled', 'true');

    claimer.set({ 'aria-disabled': null });

    expect(element.getAttribute('aria-disabled')).toBe('true');
  });

  it('should leave an attribute that the values do not name', async () => {
    const [element, claimer] = setup();
    claimer.set({ role: 'button', tabindex: '0' });
    await observed();

    claimer.set({ tabindex: '-1' });

    expect(element.getAttribute('role')).toBe('button');
  });

  it('should remove only its own values on release', async () => {
    const [element, claimer] = setup();
    element.setAttribute('aria-label', 'Move');
    claimer.set({ role: 'button', 'aria-label': 'Reorder' });
    await observed();

    claimer.release();

    expect({
      role: element.getAttribute('role'),
      label: element.getAttribute('aria-label'),
    }).toStrictEqual({ role: null, label: 'Move' });
  });

  describe('when another writer changes a claimed attribute', () => {
    it("should keep that writer's value on a later set", async () => {
      const [element, claimer] = setup();
      claimer.set({ role: 'button' });
      await observed();
      element.setAttribute('role', 'tab');
      await observed();

      claimer.set({ role: 'link' });

      expect(element.getAttribute('role')).toBe('tab');
    });

    it("should keep that writer's value on release", async () => {
      const [element, claimer] = setup();
      claimer.set({ role: 'button' });
      await observed();
      element.setAttribute('role', 'tab');
      await observed();

      claimer.release();

      expect(element.getAttribute('role')).toBe('tab');
    });
  });

  describe('when another writer changes a claimed attribute in the same task', () => {
    it("should keep that writer's value on set", async () => {
      const [element, claimer] = setup();
      claimer.set({ role: 'button' });
      await observed();

      element.setAttribute('role', 'tab');
      claimer.set({ role: 'link' });

      expect(element.getAttribute('role')).toBe('tab');
    });

    it("should keep that writer's value on release", async () => {
      const [element, claimer] = setup();
      claimer.set({ role: 'button' });
      await observed();

      element.setAttribute('role', 'tab');
      claimer.release();

      expect(element.getAttribute('role')).toBe('tab');
    });
  });

  it('should keep the claim after its own writes', async () => {
    const [element, claimer] = setup();
    claimer.set({ role: 'button' });
    await observed();

    claimer.set({ role: null });

    expect(element.hasAttribute('role')).toBe(false);
  });
});
