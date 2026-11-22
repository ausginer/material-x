# ydinjs signals — brainstorming notes

The idea is a small TypeScript signals runtime with explicit dependencies and a browser DevTools panel. In Readymag, a Solid effect can call a helper or a class method and subscribe to signals read several calls down. That makes it hard to tell what can trigger the effect, or what actually triggered it during a particular update. A standalone runtime could make its own dependencies explicit and coexist with Solid while individual computations migrate. These are design ideas from the discussion, with open questions at the end.

## API and dependency model

```ts
const visibleItems = computed(
  [showArchived, archivedItems, activeItems],
  (show, archived, active) => (show() ? archived() : active()),
);

const dispose = effect([visibleItems], (items) => {
  applyHighlight(items(), debugLabel.get());
});
```

The input array contains the possible direct dependencies. The callback receives positional accessor functions, typed from the input tuple. Calling an accessor during evaluation records a read for that node. Passing the function to a helper leaves the read lazy. An ordinary `get()` reads the current value without subscribing. In the effect example, `visibleItems` is the trigger and `debugLabel` is context sampled when the effect runs.

`visibleItems` declares three possible edges. A run with the archive open reads `showArchived` and `archivedItems`. Switching branches changes the active edges. The same idea works with nested `if` statements, loops, `continue`, and early returns. A scan for the first matching row only tracks the row fields and thresholds it actually reads, up to and including the match. The full set of row inputs can be declared when the collection is fixed. A collection whose members change at runtime raises a separate question about how its possible edges are declared and updated.

We also considered JSX, a signal-level `if(condition, then, else)`, and a dedicated `firstDefined` operation. They make branching or search visible as separate graph nodes, at the cost of expressing normal control flow through library calls. Positional accessors let ordinary JavaScript express those cases. Compared with getter objects, function references can be passed around or destructured without reading the underlying value.

## Runtime sketch

An accessor can know its source and consuming node in advance. During evaluation, it marks its edge as used. Afterward, the runtime can drop previous subscriptions that went unused. Cleanup can iterate the previously active edges instead of scanning the full declared input array. This avoids the ambient tracking and dependency lookup that an ordinary signal read needs in Preact's model.

The rest is familiar signals machinery. Lazy `computed`, equality checks, batching, effect cleanup and disposal, and consistent propagation through chains of computed values still need semantics. One rough estimate was 600–900 lines of TypeScript for a narrow core, against roughly 1,300 lines in the Preact core source file examined during the discussion. That was an estimate without a prototype or feature parity. One potential cost is allocating accessors for a large input array when the computation usually reads only a few entries.

## Browser DevTools panel

The panel could open on a named signal, computed, or effect and let you follow its sources and subscribers. Three questions came up:

- **What could this depend on?** Show declared edges, including both branches, even before a ydin computation first runs.
- **What did it actually read?** Show the edges used during its latest evaluation and which subscriptions are currently live.
- **Why did it run this time?** Trace writes, invalidations, recomputations, unchanged outputs, and effect runs. A batch can give one run several causes. A graph snapshot describes the relationships, while recorded events explain an actual update.

A dev-only collector inside the app could provide a passive metadata snapshot and an event stream. The browser extension could request the snapshot and receive subsequent changes through a content script. The graph comes from live runtime instances. Source metadata can help link a node back to the code that created it. Inspecting the graph should leave lazy computations unevaluated.

## Bridges and extension points

- **Runtime interop.** `get()` and `subscribe(listener)` with an unsubscribe function are a candidate contract for adapters. `toSolid(signal)` exposes a Solid accessor backed by the ydin signal. `fromSolid(() => editor.selection()?.id)` uses a Solid computation to forward its result to a readable ydin node. Bridge lifetime follows an owner or disposer. Each runtime has its own scheduling and batching.
- **Inspection.** A small interface could expose `snapshot()` and `subscribe(listener)` for graph events. Adapters can report declared edges, observed edges, and update events according to what their runtime exposes. The Solid collector runs in the app and uses the dev hooks of the same Solid instance. Solid 1.x and 2 have different APIs and coverage.
- **Cross-runtime edges.** A bridge can register a directed edge between its endpoints using a runtime ID plus a node ID. The panel can follow a chain from the original Solid sources through a ydin computation to the Solid UI. A Solid-only adapter could also be useful in Readymag before any migration. Preact and Vue came up as other candidates. Preact has an existing debug channel, and Vue exercises dependencies on individual object properties.

## Open questions

- Should `effect` use accessor calls to select its active dependencies, like `computed`, or should every entry in its input array always trigger it? The example works under either interpretation.
- How do dynamic collections declare their potential edges, and what happens if an accessor escapes the callback or gets called after an `await`?
- How much of Solid's update history can the adapter capture, and what would cross-runtime batching guarantee if several bridges fire together?