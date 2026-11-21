# assemble.py <dir holding head.md and runs/> <out.md>: the reading, from its prose and table.py.
import sys, re, subprocess
S = sys.argv[1]; out_path = sys.argv[2]
head = open(f"{S}/head.md").read()
extra = "One more run of arm B, at 3,000 moves before the timeout was raised, timed out at 15 s and isn't in the table. In its `DRF-2` row, which ran warm after it, `handleEvent` read 108 B.\n\n"
raw = subprocess.run(["python3", f"{S}/table.py", S], capture_output=True, text=True).stdout
heads = {
"A": "### A: Playwright's mouse, a 300-move warm-up, as on `main`",
"B": "### B: Playwright's mouse, a 3,000-move warm-up",
"C": "### C: CDP moves, a 300-move warm-up: the repair\n\n`fullraw-1` and `fullraw-2` are full runs of drag's suite, `aube exec just test` in `packages/drag`, with 938 tests. Every test passed in both.",
"D": "### D: CDP moves, a 300-move warm-up, `handleEvent` kept in Sparkplug",
"E": "### E: CDP moves, 1,000- and 3,000-move warm-ups",
"M": "### M: CDP moves, a 300-move warm-up, one escaping `{ x, y }` per sample in `#move`",
"F": "### F: Playwright's mouse, a 300-move warm-up, in a full run of drag's suite\n\nThe row was the only one of the 938 tests that failed.",
}
header = "| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |\n| --- | --- | --- | --- | --- | --- | --- | --- |"
lines = []
for line in raw.split("\n"):
    m = re.match(r"## (\w):", line)
    if m:
        lines += [heads[m.group(1)], "", header]; continue
    if line.startswith("run |") or not line.strip():
        if not line.strip(): lines.append("")
        continue
    cols = line.split(" | ")
    cols[0] = f"`{cols[0]}`"
    if cols[1:] and "no reading" in cols[-1]:
        cols = [cols[0], "—", "—", "—", "—", "—", "not traced", "pass, with no reading"]
    cols = [("not traced" if c == "-" else c) for c in cols]
    cols = [c.replace(" -> ", " → ") for c in cols]
    lines.append("| " + " | ".join(cols) + " |")
open(out_path, "w").write(head + extra + "\n".join(lines).rstrip() + "\n")
