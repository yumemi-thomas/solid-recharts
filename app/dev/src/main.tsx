import { render } from "@solidjs/web";
import { installDiagnosticsBridge } from "@solidjs/diagnostics/browser";
import { App } from "./App";

// Expose Solid's diagnostics + attribution channels to the Playwright e2e gate
// (`captureBrowserArtifact` from `@solidjs/diagnostics/playwright` drives this
// bridge from Node). It must be bundled WITH the app so it shares the app's
// `@solidjs/signals` instance, and it needs a development build of the runtime, so
// only install it under `vp dev` (it throws in a production build). A static import
// + a synchronous call keeps it ready before the page's `load` event, which is when
// Playwright's `goto` resolves — a top-level `await import()` would race with it.
if (import.meta.env.DEV) {
  installDiagnosticsBridge();
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element not found");
}
render(() => <App />, root);
