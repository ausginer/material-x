# table.py <dir holding runs/>: the reading's tables, by arm.
import sys, re, json, glob, os
S = sys.argv[1]
groups = [
 ('A', 'Playwright mouse, warm-up 300 (as on main)', ['base-1','base-2','base-3','base-4','base-5','base-6','base-7','base-8','base-9','base-10','base-11','quiet-1','prof-1','prof-2','prof-3','trace-1','trace-2','trace-3','nofilt-1','nofilt-2','nofilt-3','nofilt-4','nofilt-5','nofilt-6','d2w300-1','d2w300-2','d2w300-3']),
 ('B', 'Playwright mouse, warm-up 3000', ['w3000-1','w3000-2','trace-w3000','d2w3000-1','d2w3000-2','d2w3000-3']),
 ('C', 'CDP moves, warm-up 300 (the repair)', [f'raw300-{i}' for i in range(1,9)] + [f'rawclean-{i}' for i in range(1,13)] + ['fullraw-1','fullraw-2']),
 ('D', 'CDP moves, warm-up 300, handleEvent kept unoptimized', [f'rawnoopt-{i}' for i in range(1,4)]),
 ('E', 'CDP moves, warm-up 1000 and 3000', [f'raw1000-{i}' for i in range(1,4)] + [f'raw3000-{i}' for i in range(1,4)]),
 ('M', 'CDP moves, warm-up 300, mutation: one {x, y} per sample in #move', [f'mutraw-{i}' for i in range(1,6)]),
 ('F', 'Playwright mouse, warm-up 300, in a full drag run', ['fullbase-1']),
]
def churn(t):
    phase='pre'; c=0; marks=False
    for line in t.splitlines():
        m = re.search(r'PROBE-MARK ([\w-]+)', line)
        if m: phase=m.group(1); marks=True; continue
        if phase=='window-start' and 'dependent property cell changed' in line: c+=1
    traced = 'pw:browser' in t
    return c if (marks and traced) else None
for g, title, names in groups:
    print(f'## {g}: {title}')
    print('run | kernel B/move | handleEvent B | #move B | lift.ts:translate key | tier before -> after window | recompiles of Playwright script in window | row')
    for n in names:
        f = os.path.join(S, 'runs', n + '.log')
        if not os.path.exists(f): print(n, 'missing'); continue
        t = open(f, errors='replace').read()
        m = re.search(r'PROBE (\{.*\})', t)
        if not m:
            row = 'fail' if re.search(r'× should allocate per sample only', t) else 'pass'
            print(f"{n} | — | — | — | — | — | — | {row} (no reading: vitest printed the probe only for a failing row)"); continue
        d = json.loads(m.group(1)); b = d['bytes']
        kern = sum(v for k, v in b.items() if k.startswith('kernel/') or k.startswith('draggable.ts:'))/300
        tier = {16385:'Sparkplug', 25:'Maglev', 41:'TurboFan'}
        row = 'fail' if re.search(r'× should allocate per sample only', t) else 'pass'
        c = churn(t)
        print(f"{n} | {kern:.2f} | {b.get('kernel/session.ts:handleEvent',0)} | {b.get('kernel/session.ts:#move',0)} | {'yes' if 'lift.ts:translate' in b else 'no'} | {tier.get(d['statusBefore'],d['statusBefore'])} -> {tier.get(d['statusAfter'],d['statusAfter'])} | {'-' if c is None else c} | {row}")
    print()
