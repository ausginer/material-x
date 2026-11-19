import css from "./notched-outline.ctr.css.js";
import tpl from "./notched-outline.tpl.html.js";
import { $ } from "@ydinjs/core/utils/DOM.js";
import { useResizeObserver } from "@ydinjs/core/controllers/useResizeObserver.js";
// src/core/animations/notched-outline/notched-outline.ts
const NOTCH_WIDTH_VAR_NAME = "--gs";
function useNotchedOutline(host, label, container = host.shadowRoot) {
	host.shadowRoot.adoptedStyleSheets.push(css);
	container.prepend(tpl.content.cloneNode(true));
	const outline = $(host, ".notched-outline");
	useResizeObserver(host, (entries) => {
		if (entries[0]?.contentBoxSize[0]) outline.style.setProperty(NOTCH_WIDTH_VAR_NAME, `${entries[0].contentBoxSize[0].inlineSize}px`);
	}, { box: "content-box" }, [label]);
}
export { useNotchedOutline };

//# sourceMappingURL=notched-outline.js.map