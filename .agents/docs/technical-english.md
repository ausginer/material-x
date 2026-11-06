# Technical English and self-documenting code

Write for a developer who knows programming but does not know this implementation and may not speak English as a first language. These guidelines apply to new identifiers, comments, documentation, agent instructions and reports. They use ideas from Simplified Technical English without requiring formal STE compliance. Russian conversation with the owner does not need simplified language.

## Name the concept clearly

- Establish what the code does from its implementation and callers. Name the operation and its subject, or the value and the distinction it carries.
- Prefer established programming, platform and domain terms. Keep precise words such as `delta`, `vector`, `callback` and `transaction`, and `dispose` for resource cleanup, when they fit. Explain their application rather than replacing them with less accurate everyday words.
- Question local metaphors, unexplained abbreviations and unnecessary synonyms. One concept should have a consistent name; different concepts need a visible distinction. For example, requesting cancellation and applying it are different actions.
- Read names at their call sites. Use the class or module as context, and avoid repeating that context or turning the identifier into a sentence.
- If a comment mainly translates an identifier, improve the identifier. `startLandingAnimation` describes an action that `startTail` leaves implicit; `runCallback` is clearer than `runLeaf` when the operation runs a callback. These are examples, not a replacement dictionary.
- Keep a domain-specific term when it describes a necessary distinction. Define it briefly where the concept is introduced. A glossary does not justify an avoidably obscure name.

## Let code explain its structure

Use names, types and direct control flow to make responsibilities and data flow visible. Comments explain the constraints and reasons that the code cannot show. Adding a comment to every function or statement does not make code self-documenting.

Do not add wrappers, allocations or abstraction layers solely to make an explanation read more smoothly. The performance priorities in [CONTRIBUTING.md](../../CONTRIBUTING.md) still apply. A short comment can explain an efficient implementation.

## Keep the comments a reader needs

Remove narration, duplicate explanations and obsolete text before simplifying what remains. Keep non-obvious reasons, ownership boundaries, ordering constraints, caller preconditions and useful performance explanations. State a rule where the reader needs it, without repeating the same argument at every call site.

Compare a rewrite with both the original meaning and the current code. Preserve negation, conditions, order and certainty: “may” does not mean “always”, and examples do not establish a complete list. Report a false or disputed claim for the appropriate fix; simpler English must not make it look proven.

Published JSDoc explains what a consumer can do and must guarantee. Internal comments explain what a maintainer needs to preserve. [The documentation model](documentation.md#5-source-comments) owns that distinction and the rules for history and rationale.

## Use direct English

Prefer concrete subjects, active verbs and explicit references. Replace an ambiguous “it” or “this” with the object when more than one could fit. Split independent claims when that helps reading, while keeping their conditions and order clear.

Avoid idioms, decorative emphasis and formal administrative wording when a direct expression says the same thing. For example, “record the decision and remaining work” is clearer than “record the disposition”; “create the callback once per controller and reuse it” explains the lifetime directly. `dispose()` can still be the correct name for resource cleanup.

These are preferences, not word bans or fixed sentence limits. Do not replace precise technical terms, invent a new vocabulary, or lengthen a simple statement just to avoid a familiar word.

## Instructions and reports

State the task or outcome early. Make completed work, evidence, limitations, decisions needed and the next action easy to find. Use the same terms as the code and API. Keep observed, inferred, estimated, accepted and unresolved results distinct. Apply the existing [handoff](handoff.md) and [prompt format](agent-workflow.md#prompt-format); this guide adds no report template or approval gate.

In prompts, let the client wrap prose rather than inserting line breaks inside sentences. Code and repository files follow their existing formatting rules.

Apply the guide to future work and current documentation within the task's scope. Do not rewrite or audit historical journals, decisions, measurements or review reports for language. A naming or wording task does not authorize changing behavior, public contracts or role authority.