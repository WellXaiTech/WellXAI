import { contextBridge, ipcRenderer } from "electron";

// The one native capability exposed to the page: telling the title-bar
// overlay (the native minimize/maximize/close buttons Windows draws, not
// something the page's own CSS controls) to switch between light and dark
// coloring. Needed because that strip is drawn by the OS, entirely outside
// the page -- it has no way to otherwise react to a dark modal (like
// Settings) opening over what's normally a light page. contextIsolation
// stays on (see main.ts); this is the only thing bridged.
contextBridge.exposeInMainWorld("chatGizaDesktop", {
  setTitleBarDark: (isDark: boolean) => ipcRenderer.send("set-titlebar-dark", isDark),
});
