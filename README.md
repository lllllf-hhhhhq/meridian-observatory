# Meridian Observatory

Corresponding source for the Meridian Observatory static astronomy site.

## Layout

- `public/` — the site itself: HTML pages, styles, scripts, and the astronomy data used by the sky viewer.
- `netlify/` — the serverless function behind the visit-reservation form.
- `netlify.toml` — build and redirect configuration.
- `.github/workflows/build-engine.yml` — rebuilds the Stellarium Web Engine from upstream source.

## Licence

This repository is licensed under the **GNU Affero General Public License, version 3.0** (AGPL-3.0). The full text is in [LICENSE](LICENSE).

The deployed site runs a build of Stellarium Web Engine, which is itself AGPL-3.0. Because the site is served to users over a network, section 13 of the licence requires that those users be offered the Corresponding Source; the site links back to this repository for that purpose.

Attributions for the engine, the astronomy data, the reference catalogues and the typefaces are recorded in [NOTICE](NOTICE) and on the site's own `public/credits.html` page.

## Engine

`public/vendor/swe/stellarium-web-engine.js` and `public/vendor/swe/stellarium-web-engine.wasm` are compiled from [Stellarium Web Engine](https://github.com/Stellarium/stellarium-web-engine) (AGPL-3.0).

To rebuild them from source, run the **Build Stellarium Web Engine** workflow. It clones the upstream engine with submodules, builds it with the Emscripten SDK, and publishes the resulting `.js` and `.wasm` as release assets.

## Astronomy data

Files under `public/data/` are taken from the Stellarium Web CDN. The exact datasets, the directories they populate and the source URLs are listed in [NOTICE](NOTICE).
