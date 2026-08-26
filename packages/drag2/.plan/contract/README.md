# The contract directory

Eight numbered documents and one appendix. `00-index.md` is the entry point: it carries the precedence and freeze rule that 01–07 are read with, the decision ledger, the findings register and the deferred-decision registry.

Read 00 §Normative precedence and freeze first. It is not restated here.

## What is in which file

| File | Register | Tense |
| --- | --- | --- |
| `00-index.md` §Status, §The model, §Verdict, §Artifacts, §What would falsify this model | Normative and descriptive | Present |
| `00-index.md` §Decision ledger | Dated acts. A row stands as it stood; a later row supersedes it rather than editing it | Past |
| `00-index.md` §Findings, §Decisions not yet implemented | Live registers. A row is open or closed **now**, and `tests/decisions.node.test.ts` reads the second one | Present |
| `01-construction-ownership.md` … `07-free-drag-contract.md` | The contract terms | Present, revised in place |
| `challenge-response.md` | The six challenge rounds behind the accepted contract | Past |

## 01–07 carry their amendment history inline

These are **revised-in-place normative documents**, not a distilled effective contract. A term that a later decision changed is struck where it stands and its replacement follows, so a section reads as its own revision history.

**The term in force is the unstruck text.** Struck text is provenance: it records what the contract said, so that a review citing the older wording can be read against it. Nothing struck is normative, and nothing struck is deleted.

That is why the boundary between record and contract does not run between files here. It runs inside every one of them, sentence by sentence, and separating it would be a rewrite rather than a move.

## How things are addressed

- A contract citation is `NN §Heading`, with `NN` from `00` to `07`. `tests/references.node.test.ts` resolves every one of them against a real heading or a declared row id.
- Decision, finding and invariant ids — `D-`, `F-`, `I-`, `E-`, `Q-` — are declared in `00-index.md` and cited from anywhere in the package, including from `src/` and `bench/`.
- A backticked repository path is resolved on disk by the same instrument. A path or symbol that is deliberately gone is written struck, which is how the instrument tells a retired reference from a broken one.

## What is not here

- **What is still owed** is in `.plan/obligations.md`, in the present tense, together with the standing conditions a decision reopens on. A live clause is carried there rather than inside a ledger row.
- **Reviews and measurements** are in `.plan/reviews/` and `.plan/measurements/`. They were correct when written and are not maintained against the current tree.
- **Executable fixtures** — the typed SPI probes and the compiled revision surfaces — are in `tests/probes/` and `tests/revision/`, because the toolchain has to see them. Their write-ups are in `.plan/probes/`.