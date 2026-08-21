import { app, BrowserWindow, shell } from "electron";
import * as path from "path";

const APP_URL = "https://www.chatgiza.com/chatgiza";

// Anything on chatgiza.com stays inside the app window; Google's domains
// are allowed too since sign-in needs to complete there and redirect
// back. Everything else (footer Terms/Privacy/support links, any other
// external domain) opens in the user's real default browser instead.
function isAllowedInAppHost(hostname: string): boolean {
  return (
    hostname === "chatgiza.com" ||
    hostname.endsWith(".chatgiza.com") ||
    hostname === "google.com" ||
    hostname.endsWith(".google.com")
  );
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    // frame: false + titleBarOverlay looked better (no black bar) but
    // turned out to genuinely break the window on this setup -- minimize/
    // close stopped responding at all, confirmed after two attempts at
    // tuning it (a static color, then a dynamic one via IPC). A window
    // that can't be closed is a real, blocking bug, not a cosmetic
    // trade-off worth keeping -- back to a normal, guaranteed-working
    // native frame until a fully custom (page-drawn) title bar can
    // replace it properly instead of relying on titleBarOverlay.
    frame: true,
    autoHideMenuBar: true,
    // A transparent 1x1 icon, not the real logo -- the real icon.png is
    // still what electron-builder embeds in the .exe/Start Menu shortcut
    // (see package.json's "build.win.icon"), this only controls what
    // Windows draws in the top-left corner of the title bar itself, which
    // the user wants blank alongside the already-blank title text.
    icon: path.join(__dirname, "..", "build", "icon-blank.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Keep the OS title bar blank -- by default Electron shows whatever the
  // loaded page's <title> is ("ChatGiZa", "Build", ...), which the user
  // wants gone entirely, not just shortened.
  mainWindow.setTitle("");
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  // A plain BrowserWindow never matches CSS "display-mode: standalone"
  // (that's PWA-manifest-driven) -- this UA marker is how chatgiza.com's
  // own code (src/lib/useInstallPrompt.ts's isStandaloneApp()) recognizes
  // it's running inside this desktop app and shows the Home/Code app UI
  // instead of the plain website. Appended, not replaced, so Google's
  // OAuth browser-sniffing still sees a normal Chrome UA.
  const ua = mainWindow.webContents.session.getUserAgent();
  mainWindow.webContents.setUserAgent(`${ua} ChatGiZaDesktop/1.0`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { hostname } = new URL(url);
      if (isAllowedInAppHost(hostname)) {
        return { action: "allow" };
      }
    } catch {
      // malformed URL -- fall through to deny/external
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const { hostname } = new URL(url);
      if (!isAllowedInAppHost(hostname)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
