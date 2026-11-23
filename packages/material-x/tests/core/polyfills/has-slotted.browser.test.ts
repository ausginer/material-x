import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../src/text-field/text-field.ts';

describe('has-slotted', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should neither append to the document nor compute a style when imported', async () => {
    const append = vi.spyOn(document.body, 'append');
    const computeStyle = vi.spyOn(window, 'getComputedStyle');

    // The query makes the dev server load a fresh instance of the module.
    const url = new URL(
      '../../../src/core/polyfills/has-slotted.ts',
      import.meta.url,
    );
    url.search = '?fresh-import';
    await import(/* @vite-ignore */ url.href);

    expect([append.mock.calls.length, computeStyle.mock.calls.length]).toEqual([
      0, 0,
    ]);
  });

  it("should set the host's has-<slot> state in every engine", async () => {
    const element = document.createElement('mx-text-field');
    const lead = document.createElement('span');
    lead.slot = 'lead';
    lead.textContent = 'Lead';
    element.append(lead);
    document.body.append(element);

    await expect.poll(() => element.matches(':state(has-lead)')).toBe(true);
  });
});
