# Coordinator handoff check — cancellation before the consumer round-trip

**2026-11-01. Input:** `7721b3ef4` on `drag2/fin-review2`, the D-202 return. **Scope:** the FIFO guarantee in [the design record](request-application-claude.md) §2.7–2.8, `drag2:D-202` property 6, and the committed [reference model](../../probes/snapshot-units/model.ts.txt). This is a narrow coordinator check of a claim used to route the handoff, not an independent acceptance review. Production code and the owner's local edits are unchanged.

## Concern: a queued behavior action can request cancel after OPEN was queued

**Local label:** `coordinator-a`. **Tier B:** an unimplemented contract and its executable model disagree on a consumer-visible guarantee. No canonical finding ID is allocated here.

**Current contract.** D-202 property 6 and the record's §2.8 promise that no consumer round-trip opens after a cancel request for its operation has been registered. They attribute this to FIFO, with no additional cancel predicate at `OPEN_RESOLUTION` entry: current identity, `RELEASING`, and not previously opened are its stated conditions.

**Evidence.** Let `release.effect` dispatch behavior action A. The release unit then queues OPEN. A runs first and requests cancel for the same operation. The queue is now `[OPEN, CANCEL]`, so OPEN calls `onReorder` after cancellation was registered. The model ultimately reports `canceled AT_CONSUMER`.

This is within the model's intended domain: §2.8 explicitly permits work dispatched by `release.effect` before OPEN, and production [`Kernel.#handleBehaviorAction`](../../../src/kernel/kernel.ts) invokes the behavior's action seam. That action can call the controller. The committed model currently represents a behavior action only by logging its tag; the extension below supplies that permitted callback at exactly that point.

**Reproduction**, from the checkout root, without changing a file:

```sh
python3 - <<'PY'
from pathlib import Path
import subprocess

source = Path('packages/drag2/.plan/probes/snapshot-units/model.ts.txt').read_text()
needle = 'this.trace.push(`action ${action.tag}`);'
assert source.count(needle) == 1
source = source.replace(needle, needle + '''
        if (action.tag === 'request-cancel') {
          this.requestCancel('from queued behavior');
          this.trace.push('cancel registered by queued behavior');
        }
''')
source += '''
const extra = run({at: 'release.effect', act: s => s.dispatch('request-cancel')});
console.log('Additional trace:', JSON.stringify(extra.trace));
assert.ok(!extra.trace.includes('onReorder'),
  'D-202: no round-trip after cancel registration');
'''
result = subprocess.run(['node', '--input-type=module-typescript'],
    input=source, text=True)
raise SystemExit(result.returncode)
PY
```

**Observed:** the original R1–R14 all pass. The additional trace contains `action request-cancel`, `cancel registered by queued behavior`, `onReorder`, then `onEnd(canceled AT_CONSUMER)`. The additional assertion exits 1, as expected. This is evidence about D-202's proposed ordering and model, not a newly implemented production regression. The browser probes were not rerun here.

**Why it matters.** Registration before OPEN runs does not imply registration before OPEN was queued. The stronger guarantee cannot be inferred from FIFO. An implementer otherwise has to choose between the promised guarantee and the stated entry predicates, making an unrecorded contract decision.

**Required property.** D-202's cancellation/application policy, OPEN entry conditions and consumer-visible guarantee must agree for a cancel requested by an earlier queued action. Record the intended order and cancellation stage and add a discriminating executable case. Resolving the semantic choice belongs to the architect; this handoff check selects no repair and adds no in-unit guard.

**Next:** return this single case to the authoring architect before using the current D-202 handoff unchanged for implementation. Preserve the request/effect separation mandate. A resolution does not itself establish implementation or independent acceptance of D-202 or D-200.