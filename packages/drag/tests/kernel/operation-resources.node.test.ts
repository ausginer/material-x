import { describe, expect, it, vi } from 'vitest';
import { createOperationResources } from '../../src/kernel/operation-resources.ts';

describe('createOperationResources', () => {
  it('should destroy interaction before presentation in lifecycle order', () => {
    const order: string[] = [];
    const resources = createOperationResources(vi.fn());

    resources.signal.addEventListener(
      'abort',
      () => {
        order.push('abort');
      },
      { once: true },
    );
    resources.interaction.use(() => order.push('interaction-first'));
    resources.interaction.use(() => order.push('interaction-last'));
    resources.presentation.use(() => order.push('presentation-first'));
    resources.presentation.use(() => order.push('presentation-last'));

    resources.destroy();

    expect(order).toEqual([
      'abort',
      'interaction-last',
      'interaction-first',
      'presentation-last',
      'presentation-first',
    ]);
  });

  it('should release every resource only once', () => {
    const interaction = vi.fn();
    const presentation = vi.fn();
    const resources = createOperationResources(vi.fn());

    resources.interaction.use(interaction);
    resources.presentation.use(presentation);

    resources.stopInteraction();
    resources.stopInteraction();
    resources.releasePresentation();
    resources.releasePresentation();
    resources.destroy();

    expect(interaction).toHaveBeenCalledOnce();
    expect(presentation).toHaveBeenCalledOnce();
  });

  it('should keep presentation live after stopping interaction', () => {
    const presentation = vi.fn();
    const resources = createOperationResources(vi.fn());

    resources.presentation.use(presentation);
    resources.stopInteraction();

    expect(presentation).not.toHaveBeenCalled();

    resources.releasePresentation();

    expect(presentation).toHaveBeenCalledOnce();
  });

  it('should keep interaction live after releasing presentation', () => {
    const interaction = vi.fn();
    const resources = createOperationResources(vi.fn());

    resources.interaction.use(interaction);
    resources.releasePresentation();

    expect(interaction).not.toHaveBeenCalled();

    resources.stopInteraction();

    expect(interaction).toHaveBeenCalledOnce();
  });

  it('should continue ordered teardown after a disposer failure', () => {
    const failure = new Error('interaction failed');
    const report = vi.fn();
    const order: string[] = [];
    const resources = createOperationResources(report);

    resources.interaction.use(() => order.push('interaction-first'));
    resources.interaction.use(() => {
      throw failure;
    });
    resources.presentation.use(() => order.push('presentation'));

    resources.destroy();

    expect(order).toEqual(['interaction-first', 'presentation']);
    expect(report).toHaveBeenCalledExactlyOnceWith(failure);
  });
});
