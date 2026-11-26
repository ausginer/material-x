# A list item's long texts (RF-139, #254, #286): recheck of the remediation

**Files were read at:** `c7b7a3e3245651f157a24d28b6e9bfd08fc29bff`, the head of `material-x/item-overflow-1`, in slot `c`, equal to `origin`. **Diff reviewed:** `e81cfdc6b..c7b7a3e32`. The mutations and the size base changed the sheets of the list item and of `mx-button` for a run and restored them, and `packages/` is unchanged. Playwright's Chromium 158, Firefox 159 and WebKit 27.2, one at a time.

**Contract:** `repo:RF-139` in [`00-index.md`](../../00-index.md), as the architect's note of 2026-11-26 narrows it, and the remediation that the note owes. The proof that the note triages is [`feature-proof-claude.md`](feature-proof-claude.md). The implementer's note of 2026-11-26 states what was done.

**Verdict: the remediation is implemented as ruled and holds in the three engines,** in each part that the ruling names for the recheck. **One finding, Tier A, for the architect:** `mx-button`'s declaration also applies outside a list, where a page's own `overflow-wrap` no longer reaches the label (`recheck-1`). The implementer's departure in the 41–49% row is accepted (below).

## Readings

**Rows.** `tests/list` and `tests/button`: Chromium 1217 passed; Firefox 1200 passed, 1 expected failure and 6 skipped; WebKit 1211 passed and 6 skipped. The 504 rows of `list-item-overflow.spec.browser.test.ts` pass in each engine. CI is green at this head in the three engines.

**Witnesses**, the implementer's script on the 504 rows ([Chromium](checks/recheck-witnesses-chromium.txt), [Firefox](checks/recheck-witnesses-firefox.txt), [WebKit](checks/recheck-witnesses-webkit.txt), [script](../../item-overflow-1/probes/mutate.mjs)). The Chromium reading is the same as [the implementer's](../../item-overflow-1/checks/witnesses-remediation.txt), line for line. WebKit gives the same lines. Firefox gives the same lines except one mutation: when the trail slot grows, 10 rows fail, not 6. The 4 more are `Download` in the button item at 240 and 280px. A mutation that fails more rows in one engine isn't a defect. Each witness that the ruling names fails its row in each engine:

| Mutation | Fails | Rows |
| --- | --: | --- |
| Without the button's declaration | 12 | `Download` at 240 and 280px, `Two words` at 240px |
| `.content` doesn't grow; the trail slot grows | 6; 6 (Firefox 10) | 1 |
| Half is 45%; half is 40% | 8; 12 | 2: 45% fails in the button and link items only, 40% in each item |
| The trail slot's minimum is `auto` | 6 | 3 |
| `.lead` shrinks | 6 | 4 |

Without the button's declaration, `Two words` at 280 and 300px and `Download` at 300px pass. There `Two words` breaks between its words anyway, and `Download` isn't narrowed. So in the three engines, half of the ruling's 24 rows fail without the declaration, and each of the two kinds of row fails at least once.

**The review's mutations** on the 504 rows ([Chromium](checks/recheck-mutations-chromium.txt), [Firefox](checks/recheck-mutations-firefox.txt), [WebKit](checks/recheck-mutations-webkit.txt), [script](probes/mutations.mjs)). The six of `reviewer-4` that passed all 450 rows now fail: the trail slot's minimum is `auto` 6, half is 45% 8, half is 40% 12, the trail slot grows 6, `.content` doesn't grow 6, and `.lead` shrinks 6. The trail slot without a minimum fails 22, not 16. The mutations that passed and that the proof accepted still pass: 16%, the trail slot shrinks by 100, `.lead` starts from `auto`, and the trail slot clips. The engines differ only as above.

**The proof's parts, read again** on the package built from this head, in Roboto ([probe](probes/contents.mjs); `recheck-<part>-<engine>.txt` in [`checks/`](checks/)):

- **`labels`:** no label breaks inside a word, in any engine, list width, item or lead. `Download` keeps its 95px and one line everywhere. `Two words` has two lines, `Two /words`, and doesn't leave its 40px box or the item. Only `Download` beside the large video at 240px passes the item's end: by 9px (Firefox 9.8px), in the static and button items. This is the cost that the ruling accepted, with property 1 narrowed.
- **`survivors`:** two lines differ from the proof, in each engine. Beside the video with the label _Hi_, `Unsubscribe` now keeps its 111.3 to 112.1px and one line in both items, and the label yields to 31.9 to 32.7px, as on `main`. The proof read 99px with two lines in the static item and 103.8px in the button item. The lines of `reviewer-4` are unchanged, because the list item's sheet is unchanged. The rows now hold each of them.
- **`fit`:** four lines differ from the proof, in each engine, all of them `Two words` in a `min-content` list. The item is 155.9 to 156px, not 127.7px in WebKit, and the button has 2 lines, not 3 to 6. The other 212 readings of the subject are the proof's, which the ruling accepted as a limit, and `list.mdx` now gives it.
- **`sides`:** the same as the proof in each engine. The ruling narrowed property 3 to this, and `list.mdx` now says it.

**The departure in row 2** ([probe](probes/recheck-band.ts), [reading](checks/recheck-band.txt)). The rows run in the engine's fallback font and not in Roboto. In this container the three engines give the same widths within 0.05px: the text is 128.95px and the button 128.41px at 1000px. That is 43.0% and 42.8% of the static item's 300px, and 48.1% and 47.9% of the button and link items' 268px. The tightest margin is the text against 49% in the button and link items, 2.37px. The row asserts the band itself, so a font that moves the widths out of it makes the row fail, and doesn't make it pass without holding the property. The proof's texts were 39 to 42% of the static item, so the ruling's _"between 41 and 49%"_ needed new ones. **Accepted.** In the static item the band is witnessed by 40% only: 45% of 300px is 135px, wider than both children.

**Size** ([reading](checks/recheck-sizes.txt)), Brotli, local, against this tree with the merge base's sheets of the list item and `mx-button`. The numbers are the implementer's, byte for byte: `button/button` 4936 to 4947 (+11), `button/icon-button` +10, `button/link-button` +6, `button/switch-button` +12, `button/switch-icon-button` −15, `button/split-button` +3, `button-group/button-group` +5, `button-group/connected-button-group` +10, `list/list-item` +21, `list/list-button-item` +14, `list/list-link-item` +36, `text-field/text-field` −2, `complete` 25869 to 25922 (+53). The size gate passes.

**Documentation.** `list.mdx` has the three sentences that the ruling owes: a page's own control and `overflow-wrap: normal`, a list as wide as its contents, and children side by side in half of the item. It also says that a control is never narrower than its longest word. The PR description keeps `Closes #254`.

## Scope

**Covered:** the above, the diff's source, rows and prose, and `mx-button` outside a list ([probe](probes/recheck-outside.mjs), `recheck-outside-*`). **Not covered:** the full suite, the visual project, `docs-build`, Safari, screen readers, and other library controls with the item's break. The proof's `kinds`, `zoom`, `lift`, `breaks` and `buttons` parts were not read again, because the ruling doesn't name them for the recheck.

## Findings

### recheck-1 — Outside a list, a page's own `overflow-wrap` no longer reaches `mx-button`'s label

Tier A, for the architect: a change to `mx-button`'s behavior that the ruling read only in a list item.

- **Finding:** `overflow-wrap: normal` is on the button's `.host`, in its shadow tree. So the label doesn't inherit a page's `overflow-wrap: anywhere`, and a rule on `mx-button` itself doesn't reach the label either.
- **Current behavior** ([Chromium](checks/recheck-outside-chromium.txt), [Firefox](checks/recheck-outside-firefox.txt), [WebKit](checks/recheck-outside-webkit.txt)), `Download` in a 60px container. `base` is this head with `overflow-wrap: inherit` adopted on `.host`:

  | Page rule | `base` | Head |
  | --- | --- | --- |
  | `overflow-wrap: anywhere` on the container | 60px, 3 lines | 95 to 95.8px, 1 line, 35 to 35.8px past the container |
  | `overflow-wrap: anywhere` on `mx-button` | 60px, 3 lines | the same as above |
  | `overflow-wrap: anywhere` on `::part(impl)` | 60px, 3 lines | 60px, 3 lines |
  | `word-break: break-all` on the container | 60px, 3 lines | 60px, 3 lines |
  | `overflow-wrap: break-word`, or no rule | 95 to 95.8px, 1 line | the same |

- **Contract:** the ruling's candidate says that the control owns its words, so that _"its label doesn't inherit the item's break"_. It reads the declaration in a list item only. Property 4 is a property of a control in `trail`. Neither `button.mdx`, `list.mdx`, the implementer's note nor the PR description says that the declaration also applies outside a list, or that `::part(impl)` reaches the label.
- **Why it is a problem:** a page that relied on its own break to keep a button inside a narrow container now gets a button that runs out of it. In `base`, the broken label runs out of the 40px button's box instead (56 to 57px high). Each outcome has a cost, and the choice between them is `mx-button`'s contract, not the list's.
- **Required property:** `mx-button`'s contract says whether a page's `overflow-wrap` reaches its label outside a list, and how a page gets the break when it wants it.

**Null result:** nothing was found against the ruling's remediation: the declaration, the 54 rows, the witnesses, the three sentences of `list.mdx` and the sizes are as the note of 2026-11-26 owes. No difference between the engines was found in any property.