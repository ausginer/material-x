# Documentation model

A document's home is decided by **what makes it wrong**, not by what it is about.

Four things go wrong in four different ways, and mixing them is what produced the state this model replaces: a size policy that a reader must diff against itself to extract the current rule, a coding convention living in a vendor's agent file in two drifted copies, and a published type surface in which decision narrative outweighs the library it describes by seven to one.

| Kind | Answers | Goes wrong when | Home |
| --- | --- | --- | --- |
| **Convention** | What do I write? | someone decides to write it differently | `.agents/docs/` |
| **Policy** | What may I spend, and what must I prove? | a measurement falsifies it | `CODE_OF_SIZE.md` |
| **Operation** | How do I run things here? | the tooling changes | `AGENTS.md`, `CLAUDE.md` |
| **Record** | Why is it like this? | never — it is what happened | `packages/*/.plan/` |

The record is the only one of the four that is **append-only**. The other three are **current-state**: they are rewritten in place, and what they used to say is not their business.

That single asymmetry produces every rule below.

---

## 1. Current-state documents state the current state

A rulebook that keeps its withdrawn rules asks the reader to compute the rule before applying it. That is a cost paid on every read, by every reader, to serve one reader who wanted to know what changed — and that reader has a record.

- **No strikethrough.** A struck sentence is a claim the reader must first determine is false.
- **No dates on rules.** A rule is in force or it is not; when it came into force is a record question.
- **No amendment narrative.** _Corrected on…_, _this section used to argue…_, _sharpened…_ are all the record's voice.
- **No rejected alternatives.** Why the other design lost is the most valuable thing in the record and the least useful thing in a rulebook.
- **No worked examples carrying live numbers.** See §4.

What survives the move is not the argument but its **conclusion**, and conclusions are usually one sentence.

### The one thing the record cannot replace

A rule that a **measurement falsified** must say so, or the same measurement gets commissioned again. The satisfying form is a single evidence line under the rule, naming the finding and linking the record — not the argument, and never the falsified wording:

> Measured: thirteen exported numeric constants cost a bundling consumer 0 B and 0 modules — followed by a link to the record.

One line, and the reader who wants the fourteen compositions follows the link.

---

## 2. Citations bind section numbers, not sentences

`CODE_OF_SIZE.md` kept its withdrawn wording inline on the stated ground that _other documents cite it_. They do not. All 55 citations in this repository address a section number — `§1.1`, `§4`, `§13` — and none quotes a struck sentence.

So the compatibility obligation a current-state document actually carries is **numbering stability**, and struck text does nothing for it:

- **A section number is permanent once anything cites it.** Numbers are never reused and never re-sorted. A section whose rule is withdrawn keeps its number and says what replaced it in one line.
- **New rules take the next free number**, even where a lower one would read better.
- **Renumbering is a breaking change** to every citing document and is done, if ever, with the citations updated in the same commit.

---

## 3. One copy, and it is vendor-neutral

Two files holding the same conventions drift, and the drift is silent because neither is wrong on its face.

- **`AGENTS.md` is the durable root.** Vendor-neutral name, read by humans and by every agent harness that can be pointed at a file.
- **`CLAUDE.md` imports it** with a bare `@AGENTS.md` line and adds only what is specific to Claude Code — tool-availability protocol, skills routing, sub-agent policy. It states no convention of its own.
- **`.agents/docs/` holds the conventions themselves**, one subject per file, imported where they must be resident and referenced where they are looked up.

### Residency is a real property and costs real context

An imported file is loaded into every session's prompt whether or not it is needed; a referenced file is read only when someone goes looking. Choose deliberately:

- **Import** what is applied without being consulted — the things an author would otherwise violate silently. Code style is the paradigm.
- **Reference** what is consulted when the relevant work begins — architecture, test layering, a package's contract. These are long, and a reader who needs them knows to open them.

Imports are resolved relative to the importing file and nest up to four hops, which is enough for `CLAUDE.md` → `AGENTS.md` → a conventions file.

**A path inside backticks is not an import.** That is the mechanism by which this document can name `@AGENTS.md` without loading it, and it is also the trap: un-backticking a path in prose silently adds a file to every session's context. Write bare `@` lines only where residency is the intent, and keep them together so the resident set is readable at a glance.

---

## 4. A durable rule cites a record; it does not copy the record's numbers

A number has an owner — the instrument that produces it and the pass that re-bases it. A copy of that number in a rulebook has neither, so it goes stale without anything failing.

`CODE_OF_SIZE.md` §18 illustrated tight budgets with _a 121 B vocabulary root with 29 B of slack_. That row has since been re-based twice; the sentence describes no instrument that exists. The rule it illustrates is durable and correct. The illustration was a fact about one file in one package, and facts about files belong to those files.

- **State the rule generically.** _A deliberately tight row is tight on purpose_ needs no byte figure.
- **Where a figure is the evidence, link it** rather than transcribing it.
- **Anonymised is not the same as durable.** _One package carries…_ still goes stale; it just makes the staleness harder to find.

---

## 5. Source comments

The audience split is **mechanical**, and it is worth stating in those terms because it removes the judgment call:

> A JSDoc block attached to a declaration that appears in a published `.d.ts` is **consumer documentation and part of the shipped surface**. Everything else — line comments, JSDoc on declarations that do not survive the declaration prune, internal module headers — is a **maintainer note**.

The two have different readers, different obligations and different costs, and the current tree writes them the same way.

### 5.1 Published JSDoc

It ships. It is fetched at install, rendered on hover in a consumer's editor, and published by TypeDoc. `CODE_OF_SIZE.md` §4 (c) already priced this class and drew the conclusion in passing — _when a vocabulary looks expensive, check whether you are pricing the values or the prose about them_. This is that observation as a rule.

**It contains only what a reader outside this repository can act on.**

- Present tense, describing what the declaration is and what the caller must guarantee.
- **Preconditions the compiler cannot state belong here and are load-bearing** — _its coordinates must both be finite_, _a duration is finite_, _the elements are distinct_. `CODE_OF_SIZE.md` §1.1 deletes runtime guards on the strength of these sentences existing, so deleting one silently converts a documented boundary into an undocumented one.
- **No internal identifiers**: no `D-`, `F-`, `I-`, `E-` or `Q-` numbers, no `§` citations of internal documents, no `.plan/` links, no phase numbers, no dates, no commit references.
- **No strikethrough and no supersession**: not _was X until_, not _corrected_, not _this used to_.
- **No rejected alternatives, and no defence of the design.** A consumer cannot act on why the other shape lost.

Length is proportional to what the caller must do — never to what it took to decide.

### 5.2 Internal comments

They do not ship, so they are free of install weight and consumer confusion. They are not free of the current-state rule, because the reader is someone changing this code now.

- **State a constraint that holds and the consequence of breaking it.** _Neither 12 nor 13 is reused: a stage constant is inlined into a consumer's build_ is a working comment. It stops a specific edit.
- **One bare pointer is allowed** — `(D-74)` — as an index entry into the record. It carries no argument; it says where the argument is.
- **No strikethrough.** A superseded sentence is deleted here. If it needs to be preserved, the record preserves it.
- **No dates, no phase numbers, no review-file narration, no vote counts.**
- **If the comment is longer than the code and is arguing a choice, it is a record entry with a pointer left behind.**

### 5.3 Two tests

For deciding whether a sentence is a comment at all:

> If this became false tomorrow, is deleting it enough — or would someone have to be **told** it used to be true?

Deleting is enough → comment. Someone must be told → record entry.

For deciding whether a sentence belongs in published JSDoc:

> Could a reader act on this **without access to this repository**?

No → it is not consumer documentation, whatever it is attached to.

---

## 6. What the record is for

Everything the four rules above evict. The record is where a repository's actual reasoning lives, and none of this diminishes it:

- the argument, the alternatives and why each lost;
- the measurement, its instrument, its injection and its numbers;
- the wording a rule used to carry, with the date it changed and what falsified it;
- the finding that reopened a settled question.

A record entry is **append-only and dated**, and a superseded entry is amended in place with its supersession named rather than rewritten. The obligation runs the other way from the current-state documents: a record that quietly drops what it used to say has destroyed the only copy.

**Nothing may be deleted from a current-state document or a source comment into the record unless the record already carries it.** Where it does not, it is written there first, in the same change.

---

## 7. Witnesses

A convention with no instrument is a convention that decays, and the classes above differ in how checkable they are.

| Property | Instrument |
| --- | --- |
| No internal identifier reaches a published `.d.ts` | a pattern assertion over the built declaration set, in the package's node suite |
| The published declaration weight is visible | a reported figure in the package's size bench |
| Cross-document links resolve | the existing reference tests |
| Section numbers are never reused | none available; held by the rule in §2 |

**Report a figure before budgeting it.** A ceiling whose calibrating injection cannot be re-run is not calibrated, and the published-declaration weight has no measured regression behind it yet.

---

## 8. Where things are

| Path | Kind |
| --- | --- |
| `AGENTS.md` | Operation — the durable root, and the only copy |
| `CLAUDE.md` | Operation — Claude Code overlay, imports the root |
| `CODE_OF_SIZE.md` | Policy — size and ownership, permanently numbered sections |
| `.agents/docs/code-style.md` | Convention — source shape, resident |
| `.agents/docs/documentation.md` | Convention — this document |
| `.agents/docs/architecture.md`, `css-inheritance.md`, `accessibility.md`, `attribute-vs-state-styling.md`, `trait-flattener-plugin.md`, `test-architecture.md` | Convention and design reference — consulted, not resident |
| `.claude/skills/` | Operation — task-scoped procedure |
| `packages/*/.plan/` | Record |
| `packages/*/README.md` | Consumer documentation for that package |

This document is itself governed by the model it describes: it states the rules in force and carries no history of its own.