# FAMSF viewer layouts

Mockups of the FAMSF artwork page viewer, built on stock
[Clover IIIF](https://samvera-labs.github.io/clover-iiif/) (pinned) against live
manifests from `art-api.famsf.org`. Switch layout and object from the bar at the
top; both are in the URL (`?layout=compact&object=shoe`).

```sh
npm install
npm run dev
```

Pushes to `main` deploy to GitHub Pages.

After changing the Clover version, run `rm -rf node_modules/.vite` and restart
the dev server. Vite otherwise keeps serving the old pre-bundled copy.
