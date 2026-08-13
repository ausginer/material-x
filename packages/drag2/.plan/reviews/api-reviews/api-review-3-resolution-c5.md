# Resolution C-5 — the fragment shape

Blocks probe B, whose fixture has to construct fragments. Decided here so B is not designed against a placeholder.

Input: `api-review-3-summary.md` §2, `api-review-3-probe-plan.md` S-1 and C-5.

---

## 1. What is already true

Two things the summary treats as open are settled by reading `src/`.

**Inertness is already a documented contract, not a new requirement.** `src/sortable/feature.ts:170-176` states it of `FeatureFactory`:

> A factory is **externally inert**: it may allocate and capture, but it may not attach a listener, write the DOM, or acquire anything needing release. Every acquisition happens inside a kernel-owned operation lifetime.

And `y()` (`src/sortable/y.ts:80-81`) returns `brandFeature(factory)` where `brandFeature` is a declaration-only cast (`feature.ts:193-197`), so `createRectIndex()` runs at install, not at `y()`.

§2's prohibition list is stricter than that contract in one respect — it forbids allocation ("allocate a rect index") where the contract permits it. The discrepancy is only apparent: §2's list applies to **the fragment before installation**, and every item on it already happens after installation. No change is required to satisfy §2's inertness clause. Record it as a clarification, not a constraint.

**The real cost is ordering, not inertness.** `src/sortable/assemble.ts:66` invokes the factory, and detects a slot collision at `:44` **from the returned contribution**. Last-wins requires selecting the winner _before_ invoking anyone, which requires a fragment to declare what it claims without being invoked. A branded opaque function cannot.

## 2. The constraint the existing design imposes

`feature.ts:143-149` is explicit, and it is the taste this decision has to respect:

> One flat type, fixed key names, **no discriminator**. There is deliberately no `type`, `kind` or `phase` field: a discriminator invites a runtime `switch`, which is exactly what the composition model exists to avoid.

That is stated of the _contribution_. It does not forbid a tag on the _fragment_, but it does forbid the tag turning into runtime dispatch. The shape below reads a tag and writes a keyed slot; it never branches on its value.

## 3. Decision

Three fragment kinds, discriminated at zero cost, merged by three different rules.

```text
config object      plain object, no brand
                   → scalar/function slots, last-wins per key

strategy fragment  branded function carrying a slot tag
                   → atomic capability, last-wins per slot,
                     the loser is never invoked

plugin fragment    branded function, no slot tag
                   → appended in argument order,
                     retired in reverse
```

**Runtime discrimination is two checks, no switch.** A fragment is a function (`typeof`); a strategy fragment additionally carries the tag as a property on that function. A config object is neither. The tag is a module-private key in the same style as `FEATURE_BRAND` — see §5 for why it need not be public.

**Merge, in one pass, before anything is invoked:**

| kind | rule | on conflict |
| --- | --- | --- |
| config-object key (`items`, `threshold`, `visual`, `handle`, `placeholder`, `onReorder`, `onStart`, `onEnd`, `onError`) | later contribution wins | none — a scalar cannot half-win |
| strategy slot (insertion axis, landing) | later fragment wins; **the loser's installer never runs** | none |
| plugin | append | — |
| a plugin's contribution claiming an already-claimed single-writer slot | — | **throw**, as today (`assemble.ts:44`, with the slot named) |

Defaults are derived after the merge completes, per §2.

## 4. Why last-wins is now safe, and why the throw stays where it is

My round-3 objection R3-10 was that `sortable(root, y(), xy())` runs both factories before it knows which lost, so either a capability is retired having never been used or the loser's allocations leak. Selection-before-invocation dissolves it: **the loser is never constructed, so there is nothing to retire.** `tests/sortable/assemble.browser.test.ts:329`, which today asserts the rejected contribution _is_ retired, becomes obsolete rather than violated — the state it describes can no longer occur.

The throw survives in the one place it is still protective. A plugin that claims a single-writer slot is not expressing a preference between two strategies; it is a second author reaching for a slot the first author is using, and last-wins would silently disable one of them. Keeping the throw there costs nothing that §2 wanted: §2's stated benefit is `sortable(root, y(), xy())` resolving cleanly, and it does.

## 5. The tag does not need to be public

§2 implies a public tag, because third-party strategy authors would need to name a slot. It does not follow, and the narrower rule is better:

> **First-party fragments claim atomic capability slots. Third-party fragments are plugins.**

A third party who wants a custom insertion axis is asking to _replace_ a first-party capability — precisely the collision case where a throw is right. So the tag stays module-private, exactly like `FEATURE_BRAND`, and D-30's opacity guarantee survives intact: a consumer can still name a fragment and pass it, and still cannot construct one outside the package.

This is the difference between last-wins as a **merge rule for a closed set** and last-wins as an **extension mechanism**. Only the first is being adopted.

## 6. What the tag buys back

Recording this because it answers my own R3-11, which held that last-wins forecloses compile-time completeness checking.

It does not, once the tag is in the _type_. `assemble` today throws at runtime for a missing axis (`assemble.browser.test.ts:246-301`). With slot tags carried in a variadic tuple type, `sortable(root, config)` with no axis fragment can be a **type error** instead. The tag pays twice: once for selection before invocation, once for a runtime check becoming a compile-time one.

**Open, and for probe B to check rather than assume:** the typed constraint degrades under a spread (`sortable(root, ...fragments)` where `fragments` is `Fragment[]` — the tuple identity is lost). Keep the runtime check regardless; the compile-time check is an upgrade for the common literal call, not a replacement.

## 7. Consequences for the rest of the model

- §2's two categories become load-bearing at the type level rather than descriptive prose. Its sentence "consumers … **do** know whether they are supplying a configuration/strategy fragment or installing a plugin" becomes enforced rather than advisory.
- `y()`, `xy()`, `landing()` become strategy fragments; `layoutAnimation()` stays a plugin. This matches §2's own examples exactly, which is evidence the split was already latent in the design.
- `landing()`'s construction-time `requireFinite` (`src/sortable/landing.ts:66`) stays. It throws before installation, which is not on §2's prohibited list, and `feature.ts:114-129` gives the reason: the offending call is still on the stack.
- A fragment that would contribute both an atomic slot and pipeline hooks must choose a kind. Anything contributing pipelines is a plugin; a plugin claiming a single-writer slot throws. No fragment straddles.

## 8. For probe B

Construct fixtures with all three kinds. B should confirm, incidentally to its main question:

1. `sortable(root, config, y(), xy())` installs `xy` and **never invokes** `y`'s installer — observable by making `y`'s installer record a side effect;
2. two config objects merge last-wins per key without either being deep-merged;
3. a plugin claiming `getVisual` when the config object already supplied it still throws, and the diagnostic still names the slot;
4. the typed completeness constraint behaves as §6 predicts under a literal call and degrades as predicted under a spread.

None of these is B's falsifier. They are cheap to carry in the same fixture and they close the last of C-5.