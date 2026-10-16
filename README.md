# FAMSF viewer layouts

Mockups of the FAMSF artwork page viewer, built on stock
[Clover IIIF](https://samvera-labs.github.io/clover-iiif/) 3.17.0 against live
manifests from `art-api.famsf.org`. Switch layout and object from the bar at the
top; both are in the URL (`?layout=compact&object=shoe`).

Live: https://lukew-cogapp.github.io/famsf-viewer-layouts/

```sh
npm install
npm run dev
```

Pushes to `main` deploy to GitHub Pages.

After changing the Clover version, run `rm -rf node_modules/.vite` and restart
the dev server. Vite otherwise keeps serving the old pre-bundled copy.

## What we changed in Clover, and how

The aim is to change Clover as little as possible. Most of what we wanted is
built in. Two things needed CSS aimed at Clover's own markup, and one needed a
small plugin.

### Built in: Clover options

Passed as `options` to `<Viewer>`. Supported, documented, safe across upgrades.

| Change | Option |
|---|---|
| Hide title bar and IIIF badge | `showTitle: false`, `showIIIFBadge: false` |
| Hide the information panel | `informationPanel: { open: false, renderToggle: false }` |
| Hide the mini-map | `openSeadragon: { showNavigator: false }` |
| Hide the search button in the film strip | `showMediaSearch: false` |
| Taller image on big screens | `canvasHeight: "min(70svh, 50rem)"` |

### Built in: Clover CSS variables

Set in `src/style.css`. Clover reads these variables for its own styling, so
setting them is supported. We scope each one to part of the viewer so it doesn't
change colours elsewhere.

| Change | Variable |
|---|---|
| Square buttons | `--clover-radius-pill: 0` |
| Black buttons, white icons | `--clover-color-secondary`, `--clover-color-primary` |
| Smaller thumbnails | `--clover-thumbnail-width: 100px` |
| Black (not blue) active thumbnail | `--clover-color-accent` |

### Custom: plugin

**Caption directly under the image.** Clover has no option for this. Its only
plugin slot is inside the zoom toolbar, so our plugin (`CaptionPlugin` in
`src/main.tsx`) uses that slot to find out which image is showing, then adds its
own element just below the image. Uses Clover's documented plugin API; the
placement step relies on the `.clover-viewer-painting` class name.

### Custom: CSS on Clover's markup

These target Clover's class names rather than its supported settings. If a
Clover upgrade renames the classes, the change stops applying and Clover's
default comes back. Nothing breaks.

| Change | Why it needed CSS |
|---|---|
| Hide "Image 1", "Image 2" under thumbnails | No option to hide them. The image alt text keeps the label for screen readers. |
| Pager on the same row as the thumbnails ("Compact, tall" and "Image link" layouts) | Clover always puts the pager above the strip, pushed right. |
| Pager at the left, level with the caption and thumbnails ("Current" and "Current, compact") | Clover pushes it right, pads the counter pill and adds 20px above the strip. |
| Page-width padding round the strip and caption | Clover runs the strip edge to edge. |

### Worth asking Clover for

Small upstream options would remove all the custom work:

- an option to hide thumbnail labels
- a slot (or option) for content between the image and the thumbnail strip
- a choice of pager position

## Other notes

- **Switching layout or object reloads the page.** Clover goes blank if it is
  swapped out inside a page that already had a viewer, so each switch is a
  normal link.
- **Rights icons** in `public/rights/` are the rightsstatements.org set, used as
  supplied.
- **`uuid` override** in `package.json`: Clover depends on a `uuid` version with a
  known security advisory (GHSA-w5hq-g745-h8pq). The override forces the fixed
  version. Remove it once Clover updates its own dependency.
