# Fraym Web Agent

A Vite and React agent cockpit on the full Fraym shell (`FraymHost`): session rail,
composer, thread, and settings. It starts with the public Fraym replay fixture so
the whole interface works before you connect an engine.

## Install

```sh
bun install
```

## Develop

```sh
bun run dev
```

## Check, build, and preview

```sh
bun run check
bun run build
bun run preview
```

## Replace the demo driver

`src/driver.ts` is the only engine seam. It exports a `session` (a `SessionDriver`)
and the `workspace` it runs in. The default `session` wraps a replay of the public
coding-session fixture, so the shell renders a real recorded session — thread,
streaming deltas, reasoning, tool cards, and approvals — with no backend.

To go live, swap the `stream` for your runtime. Any `AgentEventStream` (ACP, Codex,
AI SDK, or your own adapter) becomes a full session through
`createEventStreamSessionDriver`; pass `prompt` / `cancel` / `setModel` to that
call to make the composer and model menu live. Or replace `session` entirely with a
bespoke `SessionDriver`. `src/App.tsx` stays engine-agnostic and mounts the pair
into `<FraymHost>`.
