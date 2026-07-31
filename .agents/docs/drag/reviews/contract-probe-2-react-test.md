We have one product-level uncertainty that seems worth resolving with code rather than further architectural reasoning.

The current sortable model imperatively inserts a placeholder element among children owned by a controlled React list. On reorder, the consumer updates React state while the placeholder remains in the DOM during landing and presentation readiness.

We would like to investigate what React actually does to that unmanaged sibling during reconciliation.

This is an exploratory implementation task rather than an architecture task. A small focused fixture, automated browser tests, and a short findings note would be more useful than a broad design document.

## Question

Suppose React owns a keyed list:

    <div ref={root}>
      {items.map(item => <Item key={item.id} ... />)}
    </div>

The drag library imperatively inserts an unmanaged placeholder element between two React-owned children:

    A
    B
    [placeholder]
    C
    D

The consumer then commits a reordered keyed list while the placeholder remains attached.

What happens to the placeholder?

In particular:

- Does React leave it at the same physical DOM position?
- Does it move relative to React-owned siblings?
- Can it be detached or replaced?
- Does the result depend on whether children are reordered, inserted, removed, or resized?
- Is its resulting position consistent with the semantic destination gap?
- Does React Strict Mode change anything relevant?
- Does the behavior differ between browsers supported by the existing test setup?

## Suggested approach

Please inspect the current repository and add the smallest practical React fixture and Playwright-style browser tests needed to answer this.

The fixture should use a controlled keyed array and expose enough information to observe:

- DOM child order before the React update;
- DOM child order immediately after the React commit;
- whether the placeholder is still connected;
- its `previousSibling` and `nextSibling`;
- its viewport rect before and after the commit;
- the viewport rect of the authored destination item after the commit.

Please avoid relying on jsdom for the conclusion, since layout and real DOM reconciliation behavior are central here.

A useful baseline sequence would be:

1. Render a keyed list.
2. Imperatively insert a placeholder at a known gap.
3. Record the DOM order and relevant rects.
4. Trigger a controlled React state update.
5. Observe the DOM in `useLayoutEffect`, representing the readiness point used by the drag protocol.
6. Record the resulting order, siblings, connectivity and geometry.

## Scenarios worth covering

Please keep the matrix focused, but include at least:

- move an item downward across the placeholder;
- move an item upward across the placeholder;
- placeholder at the start of the list;
- placeholder at the end of the list;
- remove a neighbouring item during the commit;
- insert a new neighbouring item during the commit;
- change item height during the commit;
- reorder with stable keys but newly created React elements;
- the same basic reorder under Strict Mode, if the fixture supports it cheaply.

It would also be useful to distinguish two presentation variants:

### Variant A — injected sibling

The real dragged item is lifted out of normal presentation and an unmanaged placeholder is inserted as a sibling.

### Variant B — real item remains the footprint

The real item remains in the React-owned child sequence as the layout footprint, while a separate visual clone is moved above it.

Variant B does not need to become a production implementation. It is only a control experiment showing whether the reconciliation problem is specific to an injected sibling.

## Landing-related observation

This experiment should also verify the related target-staleness scenario:

    landing target measured
      → React commits the accepted order
      → layout changes
      → placeholder/destination rect measured in useLayoutEffect
      → landing completes

We are trying to determine whether re-measuring the placeholder at completion is a reliable minimum guarantee.

A frozen collection snapshot is not relevant evidence here: it freezes semantic intent, not DOM geometry.

## Boundaries

Please do not redesign the kernel/behavior architecture as part of this task.

Please also avoid implementing a full new placeholder strategy unless the experiment needs a tiny prototype to compare behavior.

The main deliverables could be:

1. the focused React fixture;
2. browser-level automated tests or an executable diagnostic;
3. a concise findings note, perhaps:

       .agents/docs/drag/react-placeholder-probe.md

The note should describe observed behavior rather than proposing a large architecture. Screenshots, DOM-order logs, or small diagrams are welcome when they make a surprising result easier to understand.

## Questions the findings should answer

Please finish with a compact verdict:

- Is an imperatively injected placeholder reliable inside a React-reconciled keyed list?
- Under which tested mutations does it move or become semantically incorrect?
- Is completion-time remeasurement of that placeholder trustworthy?
- Does an optional mid-flight retarget solve the problem, or only hide stale geometry?
- Does keeping the real item as the footprint avoid the issue?
- What is the smallest next design decision supported by the evidence?

It is completely acceptable for the result to be “the injected placeholder works in these tested conditions.” The purpose is to replace our assumptions with an executable observation, not to prove that the current mechanism is broken.