# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A throwaway mockup for comparing layouts of the FAMSF artwork-page image viewer.
It is built on stock `@samvera/clover-iiif` and is deliberately light on Clover
customisation: anything not reachable through Clover's options, CSS custom
properties or a plugin is a cost, and is flagged as one. The real site is
`../famsf_collections_craft` (its `src/js/components/ImageViewer`); findings here
feed back there.

Live on GitHub Pages at https://lukew-cogapp.github.io/famsf-viewer-layouts/ (public
repo `lukew-cogapp/famsf-viewer-layouts`). Every push to `main` deploys via
`.github/workflows/pages.yml`, which runs `biome ci` then `npm run build`.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (the user runs this, not Claude) |
| Build + typecheck | `npm run build` (`tsc && vite build`) |
| Lint/format | `npm run check` (Biome, writes fixes) |

No tests. Verify changes in a browser at desktop and 390px widths, and check
`document.documentElement.scrollWidth` for sideways overflow.

**Vite dependency cache trap.** After changing the Clover version, run
`rm -rf node_modules/.vite` and restart the dev server. Vite otherwise keeps
serving the old pre-bundled Clover, and browser checks silently test the wrong
version (this happened once already: 3.14 was served after upgrading to 3.17).

## Structure

Almost everything is in `src/main.tsx`; global and Clover overrides in
`src/style.css`.

- **`objects`**: hand-entered real data for a few objects from the live index
  (`art-api.famsf.org/api/v1/develop/<id>`), chosen to exercise edge cases: a
  5-image book with download, a 1-image object with no download, a 36-image album
  (the most media of any object in the index). Each object's manifest is fetched
  live from `/api/v1/develop/<id>/manifest/v3`.
- **`layouts`**: each layout is Clover `options` plus a few flags (`height`,
  `split`, `actions`, `pagerInline`, `pagerLeft`). `siteOptions` mirrors the Craft
  ImageViewer's options, plus `showMediaSearch: false`.
- **Switching** layout or object is a plain link that reloads the page
  (`?layout=…&object=…`). Do not change this to client-side state: Clover does not
  reinitialise cleanly when remounted in a live page (OpenSeadragon binds by
  element id), and the viewer renders blank.
- **Page body** below the viewer follows the section order of the Craft site's
  `templates/_pages/artwork.twig` (Jon's `artwork-page-CW-29` branch).

## Clover: how each customisation is done

Prefer, in order: Clover option, Clover CSS custom property, plugin, then CSS on
Clover's public `clover-*` classes. Pinned to `@samvera/clover-iiif` 3.17.0.

- **Caption under the image** (`CaptionPlugin`): Clover has no slot between the
  canvas and the film strip, and its only plugin slot (`imageViewer.controls`)
  renders inside the toolbar. The plugin uses that slot to read state, then
  portals into its own element inserted after `.clover-viewer-painting`. Read the
  canvas `summary` from Clover's `vault`, not from the manifest object passed in:
  Clover normalises that object and its `summary` reads empty.
- **Square black buttons, thumbnail size, highlight colour**: Clover CSS
  variables (`--clover-radius-pill`, `--clover-color-*`,
  `--clover-thumbnail-width`), scoped to the toolbar or media wrapper so they do
  not leak into other Clover UI.
- **Hidden thumbnail labels**, **pager beside thumbnails** (`.pager-inline`) and
  **pager at the left** (`.pager-left`, layout flag `pagerLeft`): CSS on public
  classes, the real workarounds. `.pager-left` also zeroes the counter pill's
  left padding and the media wrapper's top padding so the pager lines up with
  the caption. Clover's own figcaption rule is
  `.clover-viewer-media-item figure figcaption`, so overrides need the extra
  `button` element to win.
- **Rights icons**: rightsstatements.org SVGs in `public/rights/`, used as
  supplied. They are excluded from Biome rather than edited. Paths go through
  `import.meta.env.BASE_URL` because `vite.config.ts` sets `base: "./"` for the
  Pages subpath.

The `uuid` override in `package.json` forces a patched version Clover's own
range excludes (GHSA-w5hq-g745-h8pq). Drop it once Clover widens its range.

Wider Clover findings (control flags, `canvasIdCallback`, upstream PRs) live in
`../clover-iiif-experiments/CLAUDE.md`.
