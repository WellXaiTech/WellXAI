"use client";

import { memo, useMemo } from "react";

type Files = Record<string, string>;

// Client-side-only live preview -- no backend compute, no third-party
// bundler service of our own (this replaces an earlier Sandpack-based
// version, which routed rendering through CodeSandbox's own hosted
// infrastructure and was unreliable enough to be worth removing outright
// rather than patching). Everything here happens in one plain iframe via
// srcDoc: for a static site, the project's own index.html with its local
// <link>/<script> files inlined; for a React project (package.json
// declares "react"), a small HTML shell that loads React/ReactDOM/Babel
// from a CDN and runs /App.js as an inline Babel-transformed script. No
// module bundler exists here, so cross-file imports inside a React project
// won't resolve -- matches the agent's own instructions (buildAgentTools.ts)
// to keep a React build to the single /App.js entry point.

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function findFile(files: Files, ...names: string[]): string | null {
  const wanted = new Set(names.map((n) => normalizePath(n).toLowerCase()));
  for (const [path, content] of Object.entries(files)) {
    if (wanted.has(normalizePath(path).toLowerCase())) return content;
  }
  return null;
}

function isReactProject(files: Files): boolean {
  const pkgRaw = findFile(files, "package.json");
  if (!pkgRaw) return false;
  try {
    const pkg = JSON.parse(pkgRaw);
    return Boolean(pkg?.dependencies?.react || pkg?.devDependencies?.react);
  } catch {
    return false; // malformed package.json mid-edit -- fall back to treating it as a static site rather than crash the preview
  }
}

function resolveGlobalForModule(mod: string): string | null {
  if (mod === "react") return "React";
  if (mod === "react-dom" || mod === "react-dom/client") return "ReactDOM";
  return null; // no bundler here -- any other package can't be resolved
}

// Rewrites one import clause ("Foo", "{ a, b as c }", "Foo, { a }", "* as Foo")
// into const-destructuring off the matching CDN global (React/ReactDOM),
// since those arrive as globals here instead of real modules.
function convertImportClause(clause: string, globalName: string): string {
  const trimmed = clause.trim();

  const nsMatch = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (nsMatch) return `const ${nsMatch[1]} = ${globalName};`;

  const braceMatch = trimmed.match(/^([^,{]+,\s*)?\{([^}]*)\}$/);
  if (braceMatch) {
    const statements: string[] = [];
    const defaultPart = braceMatch[1]?.replace(/,\s*$/, "").trim();
    if (defaultPart) statements.push(`const ${defaultPart} = ${globalName};`);
    const named = braceMatch[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ": "))
      .join(", ");
    if (named) statements.push(`const { ${named} } = ${globalName};`);
    return statements.join(" ");
  }

  return `const ${trimmed} = ${globalName};`;
}

// Strips ES module import/export syntax so a file written against a real
// bundler's conventions can still run as one inline <script>: named imports
// from "react"/"react-dom" (e.g. `import { useState } from "react"`) become
// destructuring off the CDN globals -- dropping them outright, as an earlier
// version of this did, left hooks like useState undefined at runtime. Imports
// from anything else can't be resolved without a bundler and are dropped.
// "export default" just becomes a plain declaration since there's only ever
// one component file executed.
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"];?\s*$/gm, (full, clause: string, mod: string) => {
      const globalName = resolveGlobalForModule(mod);
      return globalName ? convertImportClause(clause, globalName) : "";
    })
    .replace(/^\s*import\s+['"][^'"]*['"];?\s*$/gm, "")
    .replace(/export\s+default\s+/g, "")
    .replace(/^(\s*)export\s+/gm, "$1");
}

// Hides the scrollbar entirely inside the preview iframe -- it's a
// separate document (via srcDoc), so the app's own `.sidebar-scroll`
// styling never reaches it; per feedback, this preview specifically should
// have no visible scrollbar/arrows at all, scrolling only by wheel/trackpad.
const PREVIEW_SCROLLBAR_CSS =
  "<style>html,body{scrollbar-width:none;-ms-overflow-style:none;}*::-webkit-scrollbar{width:0;height:0;}</style>";

function buildReactDocument(files: Files): string {
  const appCode = findFile(files, "App.js", "src/App.js") ?? "function App() { return null; }";
  const css = Object.entries(files)
    .filter(([path]) => path.toLowerCase().endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>html,body,#root{height:100%;margin:0;}body{font-family:system-ui,-apple-system,sans-serif;}</style>
${PREVIEW_SCROLLBAR_CSS}
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js"></script>
<script type="text/babel" data-presets="react">
function showPreviewError(detail) {
  document.getElementById("root").innerHTML =
    "<pre style=\\"color:#c00;white-space:pre-wrap;padding:16px;font-size:13px;\\">" +
    String(detail).replace(/</g, "&lt;") + "</pre>";
}
// The browser masks the real message as generic "Script error." for errors
// thrown out of this Babel-transformed script, so prefer the Error object's
// own stack/message (the 5th onerror arg) over the masked one.
window.onerror = function (message, source, lineno, colno, error) {
  showPreviewError((error && (error.stack || error.message)) || message);
};
try {
${stripModuleSyntax(appCode)}

  // createRoot renders on React's own scheduler, so an error thrown while
  // rendering App never reaches this try/catch (it surfaces only as a masked
  // "Script error." via window.onerror) -- an error boundary is the reliable
  // way to catch it, with the full message intact.
  class PreviewErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    render() {
      if (this.state.error) {
        var detail = this.state.error.stack || this.state.error.message || String(this.state.error);
        return React.createElement(
          "pre",
          { style: { color: "#c00", whiteSpace: "pre-wrap", padding: 16, fontSize: 13 } },
          detail
        );
      }
      return this.props.children;
    }
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(
      PreviewErrorBoundary,
      null,
      React.createElement(typeof App !== "undefined" ? App : () => null)
    )
  );
} catch (err) {
  showPreviewError(err && (err.stack || err.message) ? err.stack || err.message : String(err));
}
</script>
</body>
</html>`;
}

function buildStaticDocument(files: Files): string {
  const html = findFile(files, "index.html");
  if (!html) {
    return `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px;color:#666;">No index.html yet.</body></html>`;
  }

  // Inline any local stylesheet/script the page links to by path -- there's
  // no dev server here to actually serve those files, so the browser would
  // 404 on every relative <link>/<script src> otherwise.
  let combined = html.replace(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      const css = findFile(files, href);
      return css ? `<style>${css}</style>` : match;
    }
  );
  combined = combined.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src: string) => {
    const js = findFile(files, src);
    return js ? `<script>${js}</script>` : match;
  });
  // Added to the preview copy only -- never written back into the user's
  // own index.html -- right after <head> if one exists, otherwise just
  // prepended (browsers tolerate a <style> before <html>/<head>).
  combined = /<head[^>]*>/i.test(combined)
    ? combined.replace(/<head[^>]*>/i, (match) => `${match}${PREVIEW_SCROLLBAR_CSS}`)
    : `${PREVIEW_SCROLLBAR_CSS}${combined}`;
  return combined;
}

function buildDocument(files: Files): string {
  if (Object.keys(files).length === 0) return "";
  return isReactProject(files) ? buildReactDocument(files) : buildStaticDocument(files);
}

function BuildPreviewFrame({ files }: { files: Files }) {
  // Re-derives the HTML document only when the `files` object reference
  // actually changes -- useBuildAgent only ever replaces (never mutates)
  // that reference when a tool call writes/edits/deletes something, so
  // this stays cheap during the many re-renders that happen while the
  // model is just streaming narration text between tool calls.
  const html = useMemo(() => buildDocument(files), [files]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        The live preview will appear here once ChatGiZa starts building.
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      title="Live preview"
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts allow-forms allow-modals allow-popups"
    />
  );
}

export default memo(BuildPreviewFrame);
