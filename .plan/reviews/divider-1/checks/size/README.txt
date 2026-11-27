Size readings, Brotli, `node .scripts/size-reading.ts <file>` in slot c, one after the other:
- head.json: at 540c238a9.
- head-divider-names-last.json: at 540c238a9 with this edit to .scripts/css/collect-props.ts, restored after:
    const filenames = await Array.fromAsync(glob(['**/*.css.ts', '**/*.ctr.css'], { cwd: srcDir }));
    filenames.sort((a, b) => Number(a.startsWith('divider/')) - Number(b.startsWith('divider/')));
    for (const filename of filenames) { ... }
- base.json: at 2ed4b96ab, the merge base.
Each file is identical, row for row and byte for byte, to the implementer's file of the same name in .plan/divider-1/checks/size/.
