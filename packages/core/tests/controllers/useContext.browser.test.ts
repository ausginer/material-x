import type { Constructor } from 'type-fest';
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  createContext,
  useContext,
  useProvider,
  type ContextEffect,
} from '../../src/controllers/useContext.ts';
import { ControlledElement } from '../../src/element.ts';
import {
  EventEmitter,
  type Unsubscribe,
  type UpdateCallback,
} from '../../src/emitter.ts';
import { defineCE, nameCE } from '../browser.ts';

type ContextValue = Readonly<{
  emitter: EventEmitter<[string]>;
  name: string;
}>;

type ContextToken = ReturnType<typeof createContext<ContextValue>>;

function createProvider(
  ctx: ContextToken,
  value: ContextValue,
): Constructor<ControlledElement> {
  return class Provider extends ControlledElement {
    constructor() {
      super();
      useProvider(this, ctx, value);
    }
  };
}

function createMutableProvider(
  ctx: ContextToken,
  value: ContextValue,
): Constructor<ControlledElement & { value: ContextValue }> {
  return class Provider extends ControlledElement {
    value = value;

    constructor() {
      super();
      useProvider(this, ctx, this.value);
    }
  };
}

function createConsumerWithEffect(
  ctx: ContextToken,
  parents: readonly string[],
  effect: Mock<ContextEffect<ContextValue>>,
): Constructor<ControlledElement> {
  return class Consumer extends ControlledElement {
    constructor() {
      super();
      useContext(this, ctx, parents, effect);
    }
  };
}

function createConsumer(
  ctx: ContextToken,
  parents: readonly string[],
): readonly [
  effectMock: Mock<ContextEffect<ContextValue>>,
  updateMock: Mock<UpdateCallback<[string]>>,
  ctr: Constructor<ControlledElement>,
] {
  const updateMock = vi.fn<UpdateCallback<[string]>>();
  const effectMock = vi.fn<ContextEffect<ContextValue>>((value) =>
    value?.emitter.on(updateMock),
  );

  return [
    effectMock,
    updateMock,
    createConsumerWithEffect(ctx, parents, effectMock),
  ];
}

function captureContextEvent(): Event {
  const ctx = createContext<ContextValue>();
  const effectMock = vi.fn<ContextEffect<ContextValue>>();
  const Consumer = createConsumerWithEffect(ctx, [], effectMock);
  const consumerTag = nameCE();
  let lookupEvent: Event | undefined;

  defineCE(consumerTag, Consumer);
  document.addEventListener(
    ctx,
    (event) => {
      lookupEvent = event;
    },
    { once: true },
  );
  document.body.append(new Consumer());

  if (!lookupEvent) {
    throw new Error('Expected a context lookup event.');
  }

  return lookupEvent;
}

/**
 * Lets a lookup that waits for an already defined parent run: its reaction is
 * queued at the connect, before this one.
 */
async function lookup(): Promise<void> {
  await Promise.resolve();
}

describe('createContext', () => {
  it('should create distinct string tokens where crypto.randomUUID is unavailable', () => {
    // An insecure page, such as plain HTTP from a LAN address, has no
    // `crypto.randomUUID`. The gate serves from `localhost`, which is secure.
    const descriptor = Object.getOwnPropertyDescriptor(
      Crypto.prototype,
      'randomUUID',
    )!;
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      ...descriptor,
      value: undefined,
    });

    try {
      const tokens = [createContext(), createContext()];

      expect([
        tokens.map((token) => typeof token),
        tokens[0] === tokens[1],
      ]).toEqual([['string', 'string'], false]);
    } finally {
      Object.defineProperty(Crypto.prototype, 'randomUUID', descriptor);
    }
  });
});

describe('context lookup event', () => {
  it('should bubble', () => {
    expect(captureContextEvent().bubbles).toBeTruthy();
  });

  it('should cross shadow DOM boundaries', () => {
    expect(captureContextEvent().composed).toBeTruthy();
  });

  it('should not be cancelable', () => {
    expect(captureContextEvent().cancelable).toBeFalsy();
  });
});

describe('useContext', () => {
  it('should call effect with undefined when no provider is found', () => {
    const ctx = createContext<ContextValue>();
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const Consumer = createConsumerWithEffect(ctx, [], effectMock);
    const consumerTag = nameCE();

    defineCE(consumerTag, Consumer);
    document.body.append(new Consumer());

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(undefined);
  });

  it('should resolve the provider value on connect', async () => {
    const ctx = createContext<ContextValue>();
    const value = {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    } as const;
    const Provider = createProvider(ctx, value);
    const providerTag = nameCE();
    const [effectMock, _, Consumer] = createConsumer(ctx, [providerTag]);
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    await lookup();

    expect(effectMock).toHaveBeenCalledWith(value);
  });

  it('should resolve the nearest provider when providers are nested', async () => {
    const ctx = createContext<ContextValue>();
    const outerValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'outer',
    } as const;
    const innerValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'inner',
    } as const;
    const OuterProvider = createProvider(ctx, outerValue);
    const InnerProvider = createProvider(ctx, innerValue);
    const outerTag = nameCE();
    const innerTag = nameCE();
    const [effectMock, _, Consumer] = createConsumer(ctx, [innerTag]);
    const consumerTag = nameCE();

    defineCE(outerTag, OuterProvider);
    defineCE(innerTag, InnerProvider);
    defineCE(consumerTag, Consumer);

    const outerProvider = new OuterProvider();
    const innerProvider = new InnerProvider();
    const consumer = new Consumer();

    innerProvider.append(consumer);
    outerProvider.append(innerProvider);
    document.body.append(outerProvider);
    await lookup();

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(innerValue);
  });

  it('should ignore providers registered for another context', async () => {
    const providerCtx = createContext<ContextValue>();
    const consumerCtx = createContext<ContextValue>();
    const Provider = createProvider(providerCtx, {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    });
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const providerTag = nameCE();
    const Consumer = createConsumerWithEffect(
      consumerCtx,
      [providerTag],
      effectMock,
    );
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    await lookup();

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(undefined);
  });

  it('should rerun provider lookup after reconnect', async () => {
    const ctx = createContext<ContextValue>();

    const firstValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'first',
    } as const;

    const secondValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'second',
    } as const;

    const FirstProvider = createProvider(ctx, firstValue);
    const SecondProvider = createProvider(ctx, secondValue);

    const firstProviderTag = nameCE();
    const secondProviderTag = nameCE();

    const [effectMock, _, Consumer] = createConsumer(ctx, [
      firstProviderTag,
      secondProviderTag,
    ]);
    const consumerTag = nameCE();

    defineCE(firstProviderTag, FirstProvider);
    defineCE(secondProviderTag, SecondProvider);
    defineCE(consumerTag, Consumer);

    const firstProvider = new FirstProvider();
    const secondProvider = new SecondProvider();
    const consumer = new Consumer();

    firstProvider.append(consumer);
    document.body.append(firstProvider, secondProvider);
    await lookup();
    secondProvider.append(consumer);
    await lookup();

    expect(effectMock).toHaveBeenNthCalledWith(1, firstValue);
    expect(effectMock).toHaveBeenNthCalledWith(2, secondValue);
  });

  it('should dispose previous subscription before rerunning effect after reconnect', async () => {
    const ctx = createContext<ContextValue>();
    const firstValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'first',
    } as const;
    const secondValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'second',
    } as const;
    const firstCleanup: Mock<Unsubscribe> = vi.fn();
    const secondCleanup: Mock<Unsubscribe> = vi.fn();
    const effectMock = vi
      .fn<ContextEffect<ContextValue>>()
      .mockReturnValueOnce(firstCleanup)
      .mockReturnValueOnce(secondCleanup);
    const firstProviderTag = nameCE();
    const secondProviderTag = nameCE();
    const Consumer = createConsumerWithEffect(
      ctx,
      [firstProviderTag, secondProviderTag],
      effectMock,
    );
    const FirstProvider = createProvider(ctx, firstValue);
    const SecondProvider = createProvider(ctx, secondValue);
    const consumerTag = nameCE();

    defineCE(firstProviderTag, FirstProvider);
    defineCE(secondProviderTag, SecondProvider);
    defineCE(consumerTag, Consumer);

    const firstProvider = new FirstProvider();
    const secondProvider = new SecondProvider();
    const consumer = new Consumer();

    firstProvider.append(consumer);
    document.body.append(firstProvider, secondProvider);
    await lookup();

    expect(effectMock).toHaveBeenNthCalledWith(1, firstValue);
    expect(firstCleanup).not.toHaveBeenCalled();

    secondProvider.append(consumer);
    await lookup();

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenNthCalledWith(2, secondValue);
    expect(secondCleanup).not.toHaveBeenCalled();
  });

  it('should rely on manual subscriptions inside the provided value', async () => {
    const ctx = createContext<ContextValue>();
    const emitter = new EventEmitter<[string]>();
    const Provider = createProvider(ctx, {
      emitter,
      name: 'provider',
    });
    const providerTag = nameCE();
    const [_, updateMock, Consumer] = createConsumer(ctx, [providerTag]);
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    await lookup();
    emitter.emit('first-update');

    expect(updateMock).toHaveBeenCalledWith('first-update');

    consumer.remove();
    emitter.emit('second-update');

    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe from the previous provider after moving to another provider', async () => {
    const ctx = createContext<ContextValue>();
    const firstEmitter = new EventEmitter<[string]>();
    const secondEmitter = new EventEmitter<[string]>();
    const FirstProvider = createProvider(ctx, {
      emitter: firstEmitter,
      name: 'first',
    });
    const SecondProvider = createProvider(ctx, {
      emitter: secondEmitter,
      name: 'second',
    });
    const firstProviderTag = nameCE();
    const secondProviderTag = nameCE();
    const [_, updateMock, Consumer] = createConsumer(ctx, [
      firstProviderTag,
      secondProviderTag,
    ]);
    const consumerTag = nameCE();

    defineCE(firstProviderTag, FirstProvider);
    defineCE(secondProviderTag, SecondProvider);
    defineCE(consumerTag, Consumer);

    const firstProvider = new FirstProvider();
    const secondProvider = new SecondProvider();
    const consumer = new Consumer();

    firstProvider.append(consumer);
    document.body.append(firstProvider, secondProvider);
    await lookup();

    firstEmitter.emit('first-update');

    expect(updateMock).toHaveBeenCalledWith('first-update');

    secondProvider.append(consumer);
    await lookup();
    firstEmitter.emit('stale-update');
    secondEmitter.emit('second-update');

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenNthCalledWith(2, 'second-update');
  });

  it('should call effect with undefined after reconnect without any provider', async () => {
    const ctx = createContext<ContextValue>();
    const value = {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    } as const;
    const Provider = createProvider(ctx, value);
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const providerTag = nameCE();
    const Consumer = createConsumerWithEffect(ctx, [providerTag], effectMock);
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    await lookup();
    document.body.append(consumer);

    expect(effectMock).toHaveBeenNthCalledWith(1, value);
    expect(effectMock).toHaveBeenNthCalledWith(2, undefined);
  });

  it('should not react to provider value replacement without reconnect', async () => {
    const ctx = createContext<ContextValue>();
    const firstEmitter = new EventEmitter<[string]>();
    const secondEmitter = new EventEmitter<[string]>();
    const firstValue = {
      emitter: firstEmitter,
      name: 'first',
    } as const;
    const secondValue = {
      emitter: secondEmitter,
      name: 'second',
    } as const;
    const Provider = createMutableProvider(ctx, firstValue);
    const providerTag = nameCE();
    const [effectMock, updateMock, Consumer] = createConsumer(ctx, [
      providerTag,
    ]);
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    await lookup();

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(firstValue);

    provider.value = secondValue;
    firstEmitter.emit('first-update');
    secondEmitter.emit('second-update');

    expect(effectMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith('first-update');
  });

  it('should keep multiple consumers isolated when one disconnects', async () => {
    const ctx = createContext<ContextValue>();
    const emitter = new EventEmitter<[string]>();
    const Provider = createProvider(ctx, {
      emitter,
      name: 'provider',
    });
    const providerTag = nameCE();
    const [_a, firstUpdateMock, FirstConsumer] = createConsumer(ctx, [
      providerTag,
    ]);
    const [_b, secondUpdateMock, SecondConsumer] = createConsumer(ctx, [
      providerTag,
    ]);
    const firstConsumerTag = nameCE();
    const secondConsumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(firstConsumerTag, FirstConsumer);
    defineCE(secondConsumerTag, SecondConsumer);

    const provider = new Provider();
    const firstConsumer = new FirstConsumer();
    const secondConsumer = new SecondConsumer();

    provider.append(firstConsumer, secondConsumer);
    document.body.append(provider);
    await lookup();
    emitter.emit('first-update');

    expect(firstUpdateMock).toHaveBeenCalledWith('first-update');
    expect(secondUpdateMock).toHaveBeenCalledWith('first-update');

    firstConsumer.remove();
    emitter.emit('second-update');

    expect(firstUpdateMock).toHaveBeenCalledTimes(1);
    expect(secondUpdateMock).toHaveBeenCalledTimes(2);
    expect(secondUpdateMock).toHaveBeenNthCalledWith(2, 'second-update');
  });
});

describe('useContext with a named parent', () => {
  function createValue(name: string): ContextValue {
    return { emitter: new EventEmitter<[string]>(), name };
  }

  /** An element of a provider name that isn't defined yet. */
  function createPending(): readonly [tag: string, element: HTMLElement] {
    const tag = nameCE();
    return [tag, document.createElement(tag)];
  }

  async function tasks(count: number): Promise<void> {
    for (let index = 0; index < count; index++) {
      // oxlint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    }
  }

  it('should resolve a provider defined after the consumer connected', async () => {
    const ctx = createContext<ContextValue>();
    const value = createValue('late');
    const [providerTag, provider] = createPending();
    const [effectMock, , Consumer] = createConsumer(ctx, [providerTag]);
    defineCE(nameCE(), Consumer);
    provider.append(new Consumer());
    document.body.append(provider);
    await tasks(1);

    defineCE(providerTag, createProvider(ctx, value));
    await lookup();

    expect(effectMock.mock.calls).toEqual([[value]]);
  });

  it('should not run the effect synchronously under a defined provider', () => {
    const ctx = createContext<ContextValue>();
    const Provider = createProvider(ctx, createValue('provider'));
    const providerTag = nameCE();
    const [effectMock, , Consumer] = createConsumer(ctx, [providerTag]);
    defineCE(providerTag, Provider);
    defineCE(nameCE(), Consumer);
    const provider = new Provider();
    provider.append(new Consumer());

    document.body.append(provider);

    expect(effectMock).not.toHaveBeenCalled();
  });

  it('should run the effect after one microtask under a defined provider', async () => {
    const ctx = createContext<ContextValue>();
    const value = createValue('provider');
    const Provider = createProvider(ctx, value);
    const providerTag = nameCE();
    const [effectMock, , Consumer] = createConsumer(ctx, [providerTag]);
    defineCE(providerTag, Provider);
    defineCE(nameCE(), Consumer);
    const provider = new Provider();
    provider.append(new Consumer());

    document.body.append(provider);
    await lookup();

    expect(effectMock.mock.calls).toEqual([[value]]);
  });

  it('should run the effect synchronously under a parent that is not a custom element', () => {
    const ctx = createContext<ContextValue>();
    const [effectMock, , Consumer] = createConsumer(ctx, [nameCE()]);
    defineCE(nameCE(), Consumer);
    const parent = document.createElement('div');
    parent.append(new Consumer());

    document.body.append(parent);

    expect(effectMock.mock.calls).toEqual([[undefined]]);
  });

  it('should run the effect synchronously under a defined provider that is not named', () => {
    const ctx = createContext<ContextValue>();
    const value = createValue('unnamed');
    const Provider = createProvider(ctx, value);
    const [effectMock, , Consumer] = createConsumer(ctx, [nameCE()]);
    defineCE(nameCE(), Provider);
    defineCE(nameCE(), Consumer);
    const provider = new Provider();
    provider.append(new Consumer());

    document.body.append(provider);

    expect(effectMock.mock.calls).toEqual([[value]]);
  });

  it('should resolve the second named provider while the first is never defined', async () => {
    const ctx = createContext<ContextValue>();
    const value = createValue('second');
    const [providerTag, provider] = createPending();
    const [effectMock, , Consumer] = createConsumer(ctx, [
      nameCE(),
      providerTag,
    ]);
    defineCE(nameCE(), Consumer);
    provider.append(new Consumer());
    document.body.append(provider);
    await tasks(1);

    defineCE(providerTag, createProvider(ctx, value));
    await lookup();

    expect(effectMock.mock.calls).toEqual([[value]]);
  });

  it('should do nothing for a connection that ended before the definition', async () => {
    const ctx = createContext<ContextValue>();
    const value = createValue('late');
    const [providerTag, provider] = createPending();
    const [effectMock, updateMock, Consumer] = createConsumer(ctx, [
      providerTag,
    ]);
    defineCE(nameCE(), Consumer);
    const consumer = new Consumer();
    provider.append(consumer);
    document.body.append(provider);
    consumer.remove();

    defineCE(providerTag, createProvider(ctx, value));
    await tasks(1);
    value.emitter.emit('update');

    expect([effectMock.mock.calls, updateMock.mock.calls]).toEqual([[], []]);
  });

  it('should resolve only the provider it moved to before either was defined', async () => {
    const ctx = createContext<ContextValue>();
    const firstValue = createValue('first');
    const secondValue = createValue('second');
    const [firstTag, first] = createPending();
    const [secondTag, second] = createPending();
    const [effectMock, , Consumer] = createConsumer(ctx, [firstTag, secondTag]);
    defineCE(nameCE(), Consumer);
    const consumer = new Consumer();
    first.append(consumer);
    document.body.append(first, second);
    second.append(consumer);

    defineCE(firstTag, createProvider(ctx, firstValue));
    await tasks(1);
    const afterFirst = [...effectMock.mock.calls];
    defineCE(secondTag, createProvider(ctx, secondValue));
    await tasks(1);

    expect([afterFirst, effectMock.mock.calls]).toEqual([[], [[secondValue]]]);
  });

  it('should not run the effect while the parent is never defined', async () => {
    const ctx = createContext<ContextValue>();
    const [providerTag, provider] = createPending();
    const [effectMock, , Consumer] = createConsumer(ctx, [providerTag]);
    defineCE(nameCE(), Consumer);
    provider.append(new Consumer());
    document.body.append(provider);

    await tasks(3);

    expect(effectMock).not.toHaveBeenCalled();
  });

  it('should run each cleanup once over connections that end before and after the lookup', async () => {
    const ctx = createContext<ContextValue>();
    const cleanup: Mock<Unsubscribe> = vi.fn();
    const effectMock = vi
      .fn<ContextEffect<ContextValue>>()
      .mockReturnValue(cleanup);
    const Provider = createProvider(ctx, createValue('provider'));
    const providerTag = nameCE();
    const [pendingTag, pending] = createPending();
    const Consumer = createConsumerWithEffect(
      ctx,
      [providerTag, pendingTag],
      effectMock,
    );
    defineCE(providerTag, Provider);
    defineCE(nameCE(), Consumer);
    const provider = new Provider();
    const consumer = new Consumer();
    document.body.append(provider, pending);

    provider.append(consumer);
    await lookup();
    consumer.remove();
    pending.append(consumer);
    consumer.remove();
    defineCE(pendingTag, createProvider(ctx, createValue('pending')));
    await tasks(1);

    expect([effectMock.mock.calls.length, cleanup.mock.calls.length]).toEqual([
      1, 1,
    ]);
  });
});
