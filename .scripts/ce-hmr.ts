type HMREntry = {
  current: CustomElementConstructor;
  instances: Set<WeakRef<HTMLElement>>;
  options?: ElementDefinitionOptions;
  refreshQueued: boolean;
  wrapper: CustomElementConstructor;
};

type HMRState = {
  entries: Map<string, HMREntry>;
  originalDefine: CustomElementRegistry['define'];
};

const STATE_KEY = Symbol.for('mx.custom-elements.hmr.state');

function patchCustomElementsRegistry(): void {
  const { prototype } = CustomElementRegistry;

  // Not patched yet
  if (!(STATE_KEY in prototype.define)) {
    const define: CustomElementRegistry['define'] & { [STATE_KEY]: HMRState } =
      Object.assign(
        function (this: CustomElementRegistry, name, constructor, options) {
          const existingEntry = define[STATE_KEY].entries.get(name);

          if (existingEntry) {
            existingEntry.current = constructor;
            Object.setPrototypeOf(
              existingEntry.wrapper.prototype,
              constructor.prototype,
            );
            existingEntry.options = options ?? existingEntry.options;
            queueRemount(name, existingEntry);
            return;
          }

          if (this.get(name) !== undefined) {
            return;
          }

          const entry: HMREntry = {
            current: constructor,
            instances: new Set<WeakRef<HTMLElement>>(),
            options,
            refreshQueued: false,
            wrapper: class HMRWrapper extends constructor {},
          };

          define[STATE_KEY].entries.set(name, entry);

          define[STATE_KEY].originalDefine.call(
            this,
            name,
            entry.wrapper,
            options,
          );
        } as CustomElementRegistry['define'],
        {
          [STATE_KEY]: {
            entries: new Map(),
            originalDefine: CustomElementRegistry.prototype.define,
          },
        },
      );

    Object.defineProperty(CustomElementRegistry.prototype, 'define', {
      configurable: true,
      enumerable: false,
      value: define,
      writable: true,
    });
  }
}

function createReplacement(
  name: string,
  options: ElementDefinitionOptions | undefined,
  ownerDocument: Document,
): HTMLElement {
  const replacement =
    options?.extends === undefined
      ? ownerDocument.createElement(name)
      : ownerDocument.createElement(options.extends, { is: name });

  if (!(replacement instanceof HTMLElement)) {
    throw new TypeError(`Expected HTMLElement replacement for "${name}"`);
  }

  return replacement;
}

function cleanup(refSet: Set<WeakRef<object>>): void {
  requestIdleCallback(() => {
    for (const ref of refSet) {
      if (ref.deref() === undefined) {
        refSet.delete(ref);
      }
    }
  });
}

function remountConnectedElements(name: string, entry: HMREntry): void {
  if (typeof document === 'undefined') {
    return;
  }

  for (const currentElement of entry.instances
    .values()
    .map((ref) => ref.deref())
    .filter(
      (element): element is HTMLElement =>
        !!element?.isConnected && element.parentNode != null,
    )
    .toArray()) {
    const replacement = createReplacement(
      name,
      entry.options,
      currentElement.ownerDocument,
    );

    const shouldRestoreFocus =
      currentElement.ownerDocument.activeElement === currentElement;

    for (const attributeName of currentElement.getAttributeNames()) {
      const attributeValue = currentElement.getAttribute(attributeName);
      if (attributeValue !== null) {
        replacement.setAttribute(attributeName, attributeValue);
      }
    }

    while (currentElement.firstChild !== null) {
      replacement.append(currentElement.firstChild);
    }

    currentElement.replaceWith(replacement);

    if (shouldRestoreFocus) {
      queueMicrotask(() => replacement.focus());
    }
  }

  cleanup(entry.instances);
}

function queueRemount(name: string, entry: HMREntry): void {
  if (entry.refreshQueued) {
    return;
  }

  entry.refreshQueued = true;

  queueMicrotask(() => {
    entry.refreshQueued = false;
    remountConnectedElements(name, entry);
  });
}

if (
  typeof CustomElementRegistry !== 'undefined' &&
  typeof customElements !== 'undefined'
) {
  patchCustomElementsRegistry();
}

export {};
