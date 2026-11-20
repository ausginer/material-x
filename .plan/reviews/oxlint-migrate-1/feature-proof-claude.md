# The oxlint-migrate recipe split — feature proof, `RF-49`

**Files were read at:** `e2a33205d` (`repo/oxlint-migrate-1`, PR #80), in a scratch worktree of my own. **Diff reviewed:** `d69e3ddbc` to `e2a33205d`, two commits. **Records read at the same commit.**

**Governing record:** `repo:RF-49` in [`00-index.md`](../../00-index.md): _Decision_, _Required properties_ 1 to 4, and the _Closure_ this branch adds.

**Lens:** feature proof. Each claim below is my own reading or my own capture. I didn't reuse the implementer's capture script: mine runs the same commands from my worktree, and I resolve effective rule state with my own scripts. Nothing is repaired, and no record is amended.

**Verdict: the split, the recipe and the rule state meet properties 1 to 3. One finding blocks the merge.** The reason `.oxlintrc.json` gives for turning off oxlint's `typescript/unbound-method` is wrong about what the two implementations differ on, and the closure says the same thing. There are also two Tier C findings that don't block, and one pre-existing Tier B reading for the architect.

## Scope

**Covered.**

- **Property 1, the ESLint split.** `eslint.base.config.ts` against `d69e3ddbc`'s `eslint.config.ts` above the spread. The only differences are the dropped `oxlint` import and a reworded cross-reference. No package's `eslint.config.ts` changed.
- **Property 2, the oxlint split, from source.** At `b02f4f635`, `.oxlintrc.migrated.json`'s `rules` equal the old file's `rules`. Its 5 overrides followed by `.oxlintrc.json`'s 1 equal the old file's 6 overrides in order. `env` is in the migrated file. `plugins`, `categories`, `options` and `ignorePatterns` are in the hand-written file.
- **Property 3.1, the split witness.** I captured both linters' `--print-config` (17 ESLint and 17 oxlint captures, the implementer's file set) at `d69e3ddbc`, `b02f4f635` and `e2a33205d`:
  - ESLint's 17 captures are byte-identical at the split.
  - oxlint's 8 package captures are byte-identical.
  - The 9 root captures differ only in `extends` and in five top-level rules printed without their options.
  - I didn't rerun the `return-await` probe. Its transcript is consistent with the printed form.
- **Property 3.2, the regeneration.**
  - I ran `aube exec just oxlint-migrate` twice on `e2a33205d`. Both runs exit 0, and `git diff --exit-code .oxlintrc.json .oxlintrc.migrated.json` passes after each. No `.bak` file is left behind. `oxfmt --check` passes on both files.
  - The old recipe, run on `d69e3ddbc`, rewrites `.oxlintrc.json` with 164 insertions and 126 deletions, and `git diff --exit-code` exits 1.
- **Rule state, `d69e3ddbc` to `e2a33205d`.**
  - oxlint, effective state on and off for a `.ts` file and a `.test.ts` file: all 17 captures give the same change set. That set is the record's 14 rules turned on, plus `typescript/dot-notation` turned off.
  - ESLint: the rule changes match the record's witness.
  - I also resolved effective severity **with options** from the committed source files. That found one change the record doesn't list ([`reviewer-2`](#reviewer-2)).
- **Lint results.** I built `box-quad`, `core`, `tproc`, `drag` and `material-x`, then ran both linters per package from its directory and at the root, as `just lint` does. At all three commits every run exits 0 with 0 messages, and the results are identical. ESLint lints one more root file, `eslint.base.config.ts`.
  - On an unbuilt tree, both linters report hundreds of messages from imports they can't resolve. Those messages were identical across the three commits too.
  - The implementer's baseline (190 ESLint messages in `material-x`, and oxlint exiting 1 in two packages) points to a partly built slot. Their comparison is like for like, so it doesn't change the claim.
- **Claim 5.** Without `plugins` in `.oxlintrc.json`, `--print-config` gives `["unicorn","typescript","oxc"]`: `import` is dropped and `oxc` is added. Without `categories`, it gives `{}`, so `correctness` is back on. Neither key is taken from the extended file.
- **The owner's question.** For `.ts` files, `no-use-before-define` (with `typedefs: true`) and `import/no-duplicates` (with `prefer-inline: true`) are on in oxlint at `d69e3ddbc` with these options, and ESLint's forms are off. `e2a33205d` keeps both rules on with the same options, so keeping them on is exactly what ran before.
- **Turning a rule off hides nothing that ran before.**
  - `no-unsafe-type-assertion`, `promise-function-async`, `unbound-method` and `no-generated-empty-object-type` aren't in `d69e3ddbc`'s `.oxlintrc.json`.
  - ESLint's forms are `0` at `d69e3ddbc`, except `unbound-method`. That one stays `2` outside `drag` and `0` in `drag` (`drag:DRD-37`).
  - The rules the new generated override turns off (`no-shadow`, `import/no-unassigned-import`, `import/prefer-default-export`, `typescript/method-signature-style`) were already off for `.ts` files at `d69e3ddbc`.
- **Handoff.** Neither commit message has a session link or a closing keyword. The PR body has `Closes #47`, no session link and no bare `@name`. The closure's links to `oxlint-migrate-1/checks/` resolve.

**Not covered.** The implementer's raw captures, which aren't committed. Any CI run. Whether each newly enabled oxlint port behaves exactly like the ESLint rule it replaces: the tree gives identical results, and that is all I checked.

## Findings

### reviewer-1 — blocking

**Tier C. The reason given for `"typescript/unbound-method": "off"` misstates the difference between the two implementations, and the closure repeats it.**

- **Current text.** `.oxlintrc.json`: _"ESLint's `@typescript-eslint/unbound-method` … is the instrument for a method read without a receiver. Oxlint's port also reports a method passed together with its receiver, as in `drag.use(this.#release, this)`, which ESLint accepts."_ The closure: _"ESLint's form … stays the instrument and reports none. Oxlint's port also reports a method passed with its receiver."_
- **Evidence.**
  - With the root `eslint.config.ts`, ESLint reports `unbound-method` on 30 lines in `packages/drag`. Several are a method passed with its receiver, such as `src/sortable.ts:59` `kernel.use(displacement.retire, displacement)` and `src/sortable/behavior.ts:204`. That is the reason `drag:DRD-37` turns ESLint's form off in `drag`: _"it reports every such call"_.
  - ESLint reports none from `drag`'s directory only because `DRD-37` turns it off there.
  - Oxlint's port reports 48 lines in `drag`. They include all 30 of ESLint's lines. The 18 extra lines are all a **private** `#method`, such as `drop-targets.ts:73`, `kernel/gesture.ts:195` and `kernel/session.ts:335`.
  - A probe class with `const privateRead = this.#privateMethod; const publicRead = this.publicMethod;` (`.scripts/zz-ub-probe.ts`, now removed): ESLint reports only the public read (line 15). Oxlint's port reports both (lines 14 and 15).
- **Why it matters.** The decision requires every override in `.oxlintrc.json` to carry its reason. This reason says ESLint's form is the complete instrument and oxlint's port over-reports, but the evidence shows the reverse: the port is the stricter one, and the extra reports are private methods. A future decision on whether to run the port outside `drag`, where it reports 0 lines, would start from a false premise. The record is append-only, so the closure's wording stays once it merges.
- **Required property.** The comment and the closure bullet describe the observed difference: on public methods the port reports what ESLint reports, it also reports private `#` methods, and in `drag` neither linter ran the rule before. The effective state, off, is not in question, because it matches `d69e3ddbc`.

### reviewer-2

**Tier C. The record's list of the rules the regeneration changed leaves out an option change: `no-shadow-restricted-names` gains `reportGlobalThis: true`.**

- **Evidence.** `--print-config` at `d69e3ddbc` gives `"no-shadow-restricted-names": "deny"`. At `e2a33205d` it gives `["deny", [{"reportGlobalThis": true}]]`, from the root and from a package's directory. The closure's list and `witness-regeneration.txt` don't mention it. The implementer's resolver compares only on and off.
- **Why it matters.** Property 3.2 requires the record to list _"each rule the regeneration changed"_. The rule now also reports shadowing `globalThis`. ESLint's form already has that option and is off. The tree has no finding.
- **Required property.** The closure lists option changes as well as changes of state.

### reviewer-3

**Tier C. The recipe's post-processing, `retargetJsOnlyOverrides`, is inert.**

- **Evidence.** Both recipes print _"JS-only overrides retargeted to TS: 0"_: the old one at `d69e3ddbc` and the new one at `e2a33205d`. The tool now writes the first override with both a JavaScript and a TypeScript glob, so `hasSameFiles` never matches. The closure notes the wider glob and says it has no effect.
- **Why it matters.** Property 2 says the script's post-processing reads and writes the migrated file. Its only transformation no longer applies to anything. This is code-discipline machinery, already present before this unit. It is for the `cleanup` lens or the architect, and it doesn't block.
- **Required property.** The record says whether the retargeting is still wanted.

### Reading for the architect, pre-existing

**Tier B. ESLint's `@typescript-eslint/unbound-method` doesn't report a private method read without its receiver**, as the probe in [`reviewer-1`](#reviewer-1--blocking) shows. The `eslint.config.ts` comment calls it _"the only instrument in the pipeline for a method read without a receiver"_ (`D-170`). Inside a class, a private method passed as a callback without its receiver is outside what that instrument reports. Oxlint 1.93.0's port reports it. This was true before this unit, and the unit doesn't change it. It is not registered here.

## Not findings

- **`no-use-before-define` and `import/no-duplicates`** keep exactly what ran before. Whether they should stay on remains the owner's question, as the PR says.
- **A package's oxlint configuration** runs with the `oxc` plugin and `correctness` on. My captures confirm the closure's reading, and it is unchanged from `d69e3ddbc`.

## Re-review, 2026-11-20

**Files were read at:** `cb0b2004c` (`repo/oxlint-migrate-1`, PR #80), in a scratch worktree of my own. **Diff reviewed:** `e2a33205d` to `cb0b2004c`, one commit. **Subject:** the fixes for `reviewer-1` to `reviewer-3`, and the owner's ruling as the coordinator relayed it: _"`import/no-duplicates` оставляем (включаем), а `no-use-before-define` предлагаю выключить."_

**Verdict: nothing blocks. The three findings are resolved, the ruling is applied as stated, and nothing else changed.**

### Scope

**Covered.**

- **What the commit touches.** Four files: `.oxlintrc.json`, `.scripts/oxlint-migrate.ts`, `.plan/00-index.md` (one appended block in `RF-49`, after the unchanged closure) and this record. Nothing else in the tree changed.
- **Effective rule state, `e2a33205d` to `cb0b2004c`.** I captured both linters' `--print-config` again, with the same 17 captures as before, and both linters' results over the tree after I built the packages.
  - ESLint's 17 captures are byte-identical.
  - Each of the 17 oxlint captures differs in one entry only: `no-use-before-define` in the custom override goes from `["deny", [{classes, functions, variables, typedefs: true}]]` to `"allow"`.
  - Resolved for `a.ts`, `a.test.ts`, `a.spec.ts`, `a.js`, `a.mjs` and `a.test.js`: in all 17 captures, the only change is `no-use-before-define` from on to off for the three TypeScript names. The JavaScript names don't change. `import/no-duplicates` keeps `prefer-inline`.
  - `eslint.base.config.ts` still turns off `@typescript-eslint/no-use-before-define` and `import-x/no-duplicates` for TypeScript files, so no linter runs `no-use-before-define` on them now. This is what the ruling asks for.
- **Lint results at `cb0b2004c`.** In the 8 packages and at the root, oxlint exits 0 with no diagnostic, and ESLint exits 0 with 0 messages. The results are byte-identical to `e2a33205d`'s. `aube exec just lint` at the root exits 0.
- **`reviewer-1`.** The new reason in `.oxlintrc.json` matches my measurement and the captures: ESLint's form is `2` in every package except `drag`, where `drag`'s `eslint.config.ts` turns it off (`DRD-37`). The port reports what ESLint reports there, and also reports private `#method` reads. Outside `drag`, it reports nothing. The appended block in `RF-49` gives the same three measurements and leaves the closure's bullets as written. The record is append-only, so this meets the required property.
- **`reviewer-2`.** The appended block lists `no-shadow-restricted-names` with `reportGlobalThis: true`, and that ESLint's form has the option and is off. That is my reading.
- **`reviewer-3`.** `retargetJsOnlyOverrides`, its helpers, the re-read and the re-write of the migrated file are removed. The script runs the tool and removes the `.bak` copy. I ran `aube exec just oxlint-migrate` twice on `cb0b2004c`. Each run exits 0, no `.bak` file remains, and `git diff --exit-code .oxlintrc.json .oxlintrc.migrated.json` passes after each run. So the script's own `JSON.stringify` write wasn't needed for byte-identical output: the recipe's `oxfmt` step gives the same file.
- **Formatting and handoff.** `oxfmt --check` passes on the four changed files. `git diff --check e2a33205d cb0b2004c` passes. The commit message has no session link and no closing keyword. The PR is open, with head `cb0b2004c`, no auto-merge, and `Closes #47` in its body.
- **This record as committed at `cb0b2004c`.** Its text is my draft unchanged, except for the final newline. `oxfmt` **removes** a Markdown file's final newline; it doesn't add one, and my draft with a final newline fails `oxfmt --check`. Only the anchor to `reviewer-1` was broken, because that heading's GitHub slug is `reviewer-1--blocking`. I've corrected that link in this commit. The `reviewer-2` heading has no suffix, and its anchor resolves.

**Not covered.** Any CI run. I didn't re-measure `unbound-method` per line, because the rule's state and the tree didn't change since my first pass. I didn't review the ruling itself, which is the owner's.

### Findings

None.

### Not findings

- **Property 2 names "the script's post-processing".** After `reviewer-3`, the script has no post-processing, and the appended block calls the recipe's `oxfmt` step property 2's post-processing. What the property protects still holds: nothing in the recipe writes `.oxlintrc.json`, and `.oxlintrc.migrated.json` is exactly what the recipe writes, as `just fmt` leaves it. If the property's wording should name the recipe instead of the script, that is the architect's call. It doesn't block.
- **The new reason for `no-use-before-define` quotes the owner in Russian, with an English translation.** The quotation is the decision itself. The record already quotes the owner in Russian, and the comment gives an English translation beside it. I found no rule in `technical-english.md` or `AGENTS.md` that this breaks.