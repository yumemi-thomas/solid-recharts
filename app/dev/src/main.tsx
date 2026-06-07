import { render } from "@solidjs/web";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element not found");
}
render(() => <App />, root);
