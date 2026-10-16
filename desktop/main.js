// CleanBridge GH for Windows: a desktop window around the live site, packaged as
// CleanBridge-GH-Setup.exe by electron-builder (see package.json "build").
// The site does all the work, so a new website deploy updates the app too.
const { app, BrowserWindow, shell, session, Menu, screen } = require("electron");
const path = require("path");

const SITE = "https://cleanbridge-gh.onrender.com";
const START_URL = `${SITE}/?source=desktop`;
// Google sign-in and Paystack checkout leave the site and come back; these hosts stay in the window.
const IN_APP_HOSTS = new Set([new URL(SITE).host, "fullbackendd.onrender.com", "accounts.google.com", "checkout.paystack.com", "standard.paystack.co"]);

// Google blocks sign-in from browsers that announce "Electron", so present the
// plain Chrome user agent this Electron build is based on.
app.userAgentFallback = app.userAgentFallback.replace(/\s(Electron|CleanBridge-GH|cleanbridge-gh-desktop)\/\S+/gi, "");

// One window only: opening the app again focuses it.
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
	// Fit the screen it opens on: most of a laptop screen, a roomy window on a big
	// monitor, and full screen on a TV or other huge display.
	const area = screen.getPrimaryDisplay().workAreaSize;
	const huge = area.width >= 2400;
	win = new BrowserWindow({
		width: Math.min(Math.round(area.width * 0.9), 1600),
		height: Math.min(Math.round(area.height * 0.9), 1000),
		minWidth: Math.min(380, area.width),
		minHeight: Math.min(560, area.height),
		center: true,
		title: "CleanBridge GH",
		backgroundColor: "#1B2D2F",
		icon: path.join(__dirname, "build", "icon.png"),
		autoHideMenuBar: true,
		show: false,
		webPreferences: { contextIsolation: true, sandbox: true },
	});
	win.once("ready-to-show", () => {
		if (huge) win.maximize();
		win.show();
	});
	win.loadURL(START_URL);

	const isInApp = (url) => {
		try {
			return IN_APP_HOSTS.has(new URL(url).host);
		} catch {
			return false;
		}
	};
	// Anything outside the app (WhatsApp, Paystack receipts, map directions) opens in the normal browser.
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (isInApp(url)) return { action: "allow" };
		shell.openExternal(url);
		return { action: "deny" };
	});
	win.webContents.on("will-navigate", (event, url) => {
		if (!isInApp(url)) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});
	// The site is offline / asleep: show a friendly retry page instead of a blank window.
	win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
		if (!isMainFrame || code === -3) return; // -3 = navigation aborted (normal)
		win.loadURL(
			"data:text/html," +
				encodeURIComponent(`<body style="background:#1B2D2F;color:#fff;font-family:Segoe UI,sans-serif;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h2>Can't reach CleanBridge GH</h2><p style="color:#aaa">Check your internet connection.</p>
<button onclick="location.href='${START_URL}'" style="background:#21927b;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer">Try again</button></div></body>`)
		);
	});
}

app.on("second-instance", () => {
	if (!win) return;
	if (win.isMinimized()) win.restore();
	win.focus();
});

app.whenReady().then(() => {
	Menu.setApplicationMenu(null);
	// Location (pickup pin, collector live GPS), notifications and clipboard - only for our own site.
	session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
		const allowed = ["geolocation", "notifications", "clipboard-sanitized-write", "clipboard-read"];
		callback(allowed.includes(permission) && wc.getURL().startsWith(SITE));
	});
	createWindow();
});

app.on("window-all-closed", () => app.quit());
