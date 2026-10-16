// TV remote support. A TV has no mouse or touchscreen, only arrow keys, OK and Back,
// so on a TV the arrow keys move focus to the nearest button or link in that
// direction (a green outline shows where you are) and OK presses it.
// Back is the browser's own history back. Phones and computers are left alone.
// main.jsx imports this file once.

const TV_UA = /\b(Android TV|GoogleTV|BRAVIA|AFT\w*|SMART-TV|SmartTV|Tizen|Web0S|webOS|HbbTV|CrKey)\b/i;

// `?tv=1` turns it on in any browser, for testing.
export const isTv = () =>
	typeof window !== "undefined" &&
	(TV_UA.test(navigator.userAgent) || window.matchMedia?.("(pointer: none)").matches === true || /[?&]tv=1\b/.test(location.search));

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), video[controls]';
const TYPING = /^(INPUT|TEXTAREA|SELECT)$/;
const NATIVE_ENTER = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/;

const visible = (el) => {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

// Inside an open dialog (post viewer, menus, modals) only its own buttons count.
const scope = () => {
	const dialogs = [...document.querySelectorAll('[role="dialog"], [role="menu"]')].filter(visible);
	return dialogs[dialogs.length - 1] || document;
};

const DIRS = {
	ArrowUp: { axis: "y", sign: -1 },
	ArrowDown: { axis: "y", sign: 1 },
	ArrowLeft: { axis: "x", sign: -1 },
	ArrowRight: { axis: "x", sign: 1 },
};

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function nearest(from, dir) {
	const a = from ? center(from.getBoundingClientRect()) : { x: 0, y: 0 };
	let best = null;
	let bestScore = Infinity;
	for (const el of scope().querySelectorAll(FOCUSABLE)) {
		if (el === from || !visible(el)) continue;
		const b = center(el.getBoundingClientRect());
		const main = (dir.axis === "x" ? b.x - a.x : b.y - a.y) * dir.sign;
		if (main <= 1) continue; // not in that direction
		const side = Math.abs(dir.axis === "x" ? b.y - a.y : b.x - a.x);
		const score = main + side * 2; // prefer things straight ahead over diagonal ones
		if (score < bestScore) {
			bestScore = score;
			best = el;
		}
	}
	return best;
}

function onKey(e) {
	if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
	const active = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;

	// OK on a clickable box that isn't a real button.
	if (e.key === "Enter" && active && !NATIVE_ENTER.test(active.tagName) && active.getAttribute("role") === "button") {
		e.preventDefault();
		active.click();
		return;
	}

	const dir = DIRS[e.key];
	if (!dir) return;
	// Left/Right move the cursor inside a text box; Up/Down still leave it.
	if (active && (TYPING.test(active.tagName) || active.isContentEditable) && dir.axis === "x") return;

	const next = nearest(active, dir);
	if (!next) return; // nothing that way: let the page scroll
	e.preventDefault();
	next.focus({ preventScroll: true });
	next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

if (isTv()) {
	document.documentElement.classList.add("tv");
	window.addEventListener("keydown", onKey);
}
