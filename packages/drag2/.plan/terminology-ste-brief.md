# Terminology and English clarity: agent brief

**Draft for the owner to refine with examples.** This brief prepares the [planned readability phase](plan.md#next-owner-directed-phase--terminology-and-comment-clarity). It does not approve the example renames or start a source migration. The guide uses ideas from Simplified Technical English; it does not claim formal STE compliance.

The reader knows software development but may not know this implementation or speak English as a first language. Help that reader understand the code without first reconstructing the author's private vocabulary. Russian conversation with the owner does not need the English simplification rules.

## 1. Translate the author's model into familiar technical concepts

Review identifiers and the comments that explain them together. A name can use common English words and still express an unfamiliar local metaphor.

- Establish what the code does by reading the implementation and its call sites. Identify the action, the object it acts on and any distinction the name must preserve.
- Prefer established platform or programming vocabulary when it describes that behavior accurately. Keep a useful domain term when ordinary vocabulary would lose a real distinction.
- Question local metaphors, unexplained abbreviations, several names for the same concept and one name used for different concepts. Do not replace them with a new metaphor or require a glossary to explain an avoidably unclear name.
- Read proposed names at their call sites. Use the surrounding class or module as context instead of repeating every detail in each identifier. Check related names together, but do not assume the whole family needs renaming.
- Identify where a proposed change reaches: a private name, an internal member, a published API or SPI, consumer documentation, current contract text, or a runtime message. A name shared with a published member does not make every private rename a public change. Names for different roles, such as starting an animation and supplying its timing, need not be identical.
- Preserve established technical terms such as `delta`, `vector`, `callback` and `transaction` when they are accurate. Explain how the concept applies rather than replacing its name with a less precise everyday word. For example, a viewport delta is a signed displacement; calling it a distance loses information. Registering a request and applying it are also different actions in this implementation.

Initial examples, read from the source before the first batch. That batch implemented the `#startTail` and `#movedLeaf` rows, so those two names no longer exist in the source:

| Name before the first batch | What it does | Candidate to evaluate |
| --- | --- | --- |
| `#startTail` | Starts the optional animation that reduces remaining displacement after presentation is released | `#startLandingAnimation` |
| `SeamDriver.runLeaf` | Runs a callback with the driver's failure handling; returns whether it succeeded | `runCallback` |
| `SeamDriver.runLeafValue` | Runs a callback with failure handling and returns its result or `undefined` on failure | `runCallbackWithResult` |
| `#movedLeaf` | Reuses a wrapper that calls `spec.moved` with the current frame and supplied lift | `#callMoved` |

These are discussion examples, not a replacement dictionary. In particular, evaluate the callback names as a family and check that their context makes the failure behavior clear enough.

The [first pilot](reviews/terminology-ste-pilot.md) identifies related names and their reach. Its full rename map is not approved. `BehaviorSpec.landingTail` and `LandingTail` are published SPI, while the private method starts the animation. `runLeafValue` has no production caller in the pilot's source search; deciding whether to remove it is a separate cleanup task.

## 2. Express the model in direct English

Once the concept is clear, check whether its English wording adds another translation task. Watch for idioms, figurative verbs, formal administrative language and words whose common technical meaning differs from the intended meaning.

Prefer a concrete subject and action. Name what is released, called, reported, retained or removed. Make references such as “it”, “this” and “the rest” explicit when more than one object could fit. Separate a long sentence when it contains several independent claims, while preserving conditions and ordering.

| Wording to examine | More direct wording for that meaning |
| --- | --- |
| “Dispose of the findings.” | “Decide how to handle each finding: fix it, accept the limitation, or defer it.” |
| “Record the disposition.” | “Record the decision and any remaining work.” |
| “The callback is hoisted to one controller-stable closure.” | “Create the callback once per controller and reuse it.” |
| “Hand the rest to the tail.” | Name the actual next action, such as “Start the landing animation after releasing presentation.” |

The first example concerns agent instructions, not resource cleanup. `dispose()` is an established name for resource cleanup and may be appropriate in code. Do not rename every occurrence of `dispose`, or replace every “dispose of” with “release resources”. Determine the intended action first.

These examples are preferences, not banned words. A familiar technical term can be clearer than a long substitute. Shorter wording is useful only if it preserves the meaning.

Look for recurring sentence patterns as well as individual words: “which is what makes…”, “the whole of why…” and “load-bearing” can often become a direct statement of the action or constraint. Do not turn those examples into mandatory substitutions. A clearer name should not need a whole explanatory sentence inside the identifier.

## 3. Reduce comments, then rewrite what remains

Fix an unclear name before adding a paragraph to explain it. Remove comments that only repeat the code or duplicate information already stated where readers need it. Preserve reasons that prevent a plausible mistake, ownership constraints, ordering requirements and caller preconditions.

For example, an introduction to the method that starts the landing animation can become:

```ts
/**
 * Starts the optional landing animation after releasing the visual.
 * The animation reduces the remaining displacement to zero.
 */
```

This replaces the introduction only. It does not replace the separate explanation of why the animation uses additive `translate` rather than `transform`, or how the displacement changes coordinate space.

The comment for the reused movement callback can explain its reason directly:

```ts
// Reuse this callback instead of creating one for each pointer sample.
// The wrapper preserves the receiver when the driver calls it.
// Read the current frame when the callback runs.
```

This explains one avoided allocation; it does not claim that the whole pointer-sample path allocates nothing.

Compare the rewrite with the original claim and the code. Preserve technical distinctions, conditions, ordering and degree of certainty. Do not turn “may” into “always”, describe an example as a complete list, or turn one implementation technique into the only possible solution. If the original claim appears false, report it instead of making it sound more authoritative through simpler wording.

Follow the [documentation model](../../../.agents/docs/documentation.md#5-source-comments): published JSDoc serves consumers; internal comments serve maintainers. Do not remove a precondition because the code trusts it. Preserve rationale according to the existing record rules rather than silently deleting the only explanation.

## 4. Apply the guide without changing the design

Begin with the small kernel sample in the plan. Show the owner representative names and comments before extending the approach. For each example, explain what meaning is preserved and what reading difficulty is removed. Keep alternatives limited to ones with a concrete advantage.

Keep identifier renames, prose edits and the separately planned named union variants distinguishable in the diff. Preserve behavior, ordering, failure handling and ownership. Public API or SPI renames follow the existing architecture process. Report a semantic conflict or possible code defect separately; do not repair it through a wording pass.

Unused-code removal and the pilot's possible behavior defects are separate work. Leave disputed passages for that work and continue with independent clarity changes. Do not make every reported question a prerequisite for the whole pass.

Apply the same two checks to the planned agent-instruction work and to future prompts and reports. Preserve obligations, role authority, evidence limits and the difference between measured, inferred, accepted and unresolved results. Do not add rigid sentence limits, word bans, report templates or new approval gates to enforce this guide. Prompts should not contain manual line breaks inside sentences; code and repository prose follow their existing formatting rules.

Do not rewrite or audit historical journals, decisions, measurements and review reports for clarity. Update current documentation that directly depends on an implemented rename under its existing ownership rules; a mixed document can contain both current instructions and dated history, so distinguish them at the passage being changed. Preserve historical entries rather than replacing their old names throughout the archive.

The compression pass also stays separate. Use checks appropriate to the edits under the existing workflow; prose-only work does not require statistical performance rounds. Identifier renames can change emitted property names, so use the existing size check when the edited names can affect bundle output.