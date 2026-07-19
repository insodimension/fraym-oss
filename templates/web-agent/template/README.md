# Fraym Web Agent

A Vite and React agent cockpit powered by Fraym. It starts with the public Fraym fixture driver so the interface works before you connect an engine.

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

`src/driver.ts` is the only engine seam. Replace its fixture session driver and session reference with your runtime adapter while continuing to export the `drivers` bundle and active `sessionRef`. `src/App.tsx` stays engine-agnostic and mounts that pair into `<Fraym>`.
