# Heap-test comment handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff.

**Governing records:** `DRF-41` in [`00-index.md`](00-index.md), §Disposition of the final cleanup, and CONTRIBUTING §Comments and JSDoc. The [feature proof](reviews/final-cleanup/proof-reviewer.md) reports the defect as `final-cleanup-reviewer-1`, with rows 3 and 4 of its heap table as evidence.

**Goal:** after this unit, the comment beside `assertType(behavior)` in the destruction heap test states what that read does.

## Boundaries

**In scope:** the two comment lines at `tests/destruction.browser.test.ts:411` and `:412`, in `drag:DRI-10 destruction` › "should retain no item, behavior, view or behavior instance after 3 operations and destruction". They read: "The callback reads `behavior`, so the controller keeps it reachable until the controller is released."

**Out of scope.** Don't change anything else, even in the same test:

- the read `assertType(behavior)`, the `behavior = null` assignment, the `WeakRef` list, any assertion and the test's title;
- the behavior sentinel's coverage. That is `DRF-42`, which changes what the test asserts and is routed separately;
- any file under `src/` or `bench/`, and any other test.

## Required properties

1. The comment states what the read does, in the present tense: the callback captures the variable `behavior`, not the object, so the object stays reachable only while the variable holds it. The test clears the variable after destruction, so whether the object is released doesn't depend on whether the controller is.
2. It claims nothing that rows 3 and 4 of the proof's heap table contradict. In particular, it doesn't say that the controller keeps the object reachable.
3. It carries no finding id, review name or commit, as CONTRIBUTING §Comments and JSDoc requires.

One wording that meets them, which you can adjust:

```ts
// The callback captures the variable, not its object, so clearing
// `behavior` below releases the object whether or not the controller is.
```

**Return to the architect** if the comment can't be made true without changing a line of code.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for the test file and the report. Run these in `packages/drag`:

| Check | Required result |
| --- | --- |
| `npx just lint` | Exit 0 |
| `npx just typecheck` | Only drag2's two `TS2724` errors, which are expected |
| `git diff -U0 <base>..HEAD -- tests` | Only comment lines change, all in the one test |
| `git diff --stat <base>..HEAD -- src bench` | Empty |
| The one test in Chromium, `browser` project | Passes. Report the count |

No full suite, mutation, build comparison, size reading or other engine is owed: no executable line changes. The full suite stays tied to `27c60a9ac` (§Disposition of the final cleanup), and the report says so.

**Report** in `heap-comment-report.md`, with the commit, the outputs above and the stopping point. The unit closes nothing. The architect reads it and decides `DRF-41`.