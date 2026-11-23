import sys
p='packages/material-x/src/core/animations/ripple/ripple.ts'; s=open(p).read()
i=s.index('    disconnected() {'); j=s.index('\n    },\n',i); d=s[i:j]
def drop(line):
    assert d.count(line)==1,line; return s[:i]+d.replace(line,'')+s[j:]
M={'no catch':lambda:s.replace('.finished.catch(() => {})','.finished'),
'no clearTimeout':lambda:drop('      clearTimeout(touchDelayTimer);\n'),
'no start event reset':lambda:drop('      startEvent = null;\n'),
'no state reset':lambda:drop('      state = INACTIVE;\n'),
'no context-menu flag reset':lambda:drop('      checkBoundsAfterContextMenu = false;\n'),
'no generation increment':lambda:drop('      animationGeneration += 1;\n'),
'no scale cancel':lambda:drop('      scaleAnimation?.cancel();\n'),
'no drift cancel':lambda:drop('      moveAnimation?.cancel();\n'),
'no fade cancel':lambda:drop('      opacityAnimation?.cancel();'),
'no clearTimeout and no state reset':lambda:drop('      state = INACTIVE;\n').replace('      clearTimeout(touchDelayTimer);\n',''),
'fade from a fixed 0.1':lambda:s.replace('{ opacity: 0 },','{ opacity: [0.1, 0] },'),
'no disconnect callback':lambda:s[:i]+'    disconnected() {'+s[j:]}
n=M[sys.argv[1]](); assert n!=s; open(p,'w').write(n)
