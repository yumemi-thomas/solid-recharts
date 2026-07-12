// oxlint-disable solid/no-innerhtml
import { For, Show, createMemo, createSignal, onCleanup, onSettled } from "solid-js";
import { highlight } from "../highlighter";

type Manager = "pnpm" | "npm" | "yarn" | "bun";

const managers: { id: Manager; label: string; cmd: (pkg: string, dev: boolean) => string }[] = [
  { id: "pnpm", label: "pnpm", cmd: (p, dev) => `pnpm add ${dev ? "-D " : ""}${p}` },
  { id: "npm", label: "npm", cmd: (p, dev) => `npm install ${dev ? "-D " : ""}${p}` },
  { id: "yarn", label: "yarn", cmd: (p, dev) => `yarn add ${dev ? "-D " : ""}${p}` },
  { id: "bun", label: "bun", cmd: (p, dev) => `bun add ${dev ? "-d " : ""}${p}` },
];

export function InstallCommand(props: { pkg: string; dev?: boolean; default?: Manager }) {
  const [active, setActive] = createSignal<Manager>("pnpm");
  const command = createMemo(() => {
    const m = managers.find((x) => x.id === active());
    if (m === undefined) throw new Error(`Unknown package manager: ${active()}`);
    return m.cmd(props.pkg, props.dev ?? false);
  });
  const highlighted = createMemo(() => highlight(command(), "bash"));

  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onSettled(() => {
    if (props.default !== undefined) setActive(props.default);
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command());
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 1600);
  };
  onCleanup(() => {
    if (resetTimer) clearTimeout(resetTimer);
  });

  return (
    <figure class="not-prose my-6 overflow-hidden rounded-[12px] border border-border bg-card">
      <header class="flex items-center gap-1 border-b border-border bg-card/60 px-2 py-1.5">
        <ul class="flex items-center gap-0.5">
          <For each={managers}>
            {(m) => (
              <ManagerTab
                id={m.id}
                label={m.label}
                active={active() === m.id}
                onSelect={() => setActive(m.id)}
              />
            )}
          </For>
        </ul>
        <span class="flex-1" />
        <button
          type="button"
          onClick={copy}
          aria-label="Copy install command"
          class="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/40 px-2 py-1 font-mono text-[0.6875rem] text-fg-muted transition hover:border-border-strong hover:text-fg"
        >
          <Show
            when={copied()}
            fallback={
              <>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </>
            }
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Copied</span>
          </Show>
        </button>
      </header>
      <div class="install-command-host shiki-host" innerHTML={highlighted()} />
    </figure>
  );
}

function ManagerTab(props: { id: Manager; label: string; active: boolean; onSelect: () => void }) {
  const className = () =>
    `relative rounded-md px-2.5 py-1 font-mono text-[0.75rem] transition-colors duration-200 ${
      props.active ? "text-fg" : "text-fg-muted hover:text-fg"
    }`;

  return (
    <li class="relative">
      <Show when={props.active}>
        {/* `-z-10` keeps the pill behind the button text. Otherwise the
            absolute span (rendered before the button in DOM order) ends up
            painting over the label, so the active tab reads as an empty
            capsule. */}
        <span class="absolute inset-0 -z-10 rounded-md border border-border-strong bg-bg shadow-soft" />
      </Show>
      {/* Solid 2.0 types aria-* enumerated attributes as the strings
          "true" | "false", not boolean. */}
      <button
        type="button"
        onClick={() => props.onSelect()}
        aria-selected={props.active ? "true" : "false"}
        class={className()}
      >
        {props.label}
      </button>
    </li>
  );
}
