// MDX runs components through solid-jsx. Spreading the opaque MDX props bag
// onto native elements triggers Solid "Unrecognized value" warnings (the bag
// can contain hast `node`s, camelCase style objects, etc.). To avoid that
// entirely we DO NOT override the native tags (h1/h2/p/a/pre/code/li/…) —
// they fall through to plain DOM, and `.docs-prose` selectors in app.css do
// all the styling.
//
// Only our custom MDX components live here. They're called explicitly from
// .mdx (e.g. `<Example slug="line-basic" />`) so they receive the props you'd
// expect, not the hast bag.

import { CodeBlock } from "./components/Code";
import { highlight } from "./highlighter";
import { Example } from "./components/Example";
import { InstallCommand } from "./components/InstallCommand";

export const mdxComponents = {
  Example,
  CodeBlock,
  InstallCommand,
};

export { highlight };
