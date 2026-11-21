# phase.py <log>: optimizations and deoptimizations per phase between the probe's marks.
import sys, re, collections
phase = 'pre'; c = collections.defaultdict(collections.Counter)
first_row_done = False
for line in open(sys.argv[1], errors='replace'):
    m = re.search(r'PROBE-MARK ([\w-]+)', line)
    if m:
        phase = m.group(1); c[phase]['marks'] += 1; continue
    if 'pw:browser' not in line: continue
    if 'dependent property cell changed' in line: c[phase]['cell-deopt'] += 1
    elif 'for deoptimization' in line or 'bailout' in line: c[phase]['other-deopt'] += 1
    if 'for optimization to' in line:
        name = re.search(r'<JSFunction ([^ ]*) ?\(sfi', line)
        n = name.group(1) if name else '?'
        c[phase]['opt'] += 1
        if n in ('handleEvent','enter','move','translate','resolve','updateInsertion','#move'):
            c[phase]['opt:'+n+':'+re.search(r'to (\w+)', line).group(1)] += 1
for k in ['pre','warm-start','window-start','window-end']:
    print(k, dict(c[k]))
