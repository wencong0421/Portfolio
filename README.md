# Wong Man Chong Ivan · Portfolio

Source for [wongmanchongivan.netlify.app](https://wongmanchongivan.netlify.app/): my portfolio as a
Business Analyst working across Power BI, Azure data engineering and automation.

A hand-written static site with no framework and no build step for the page itself:

- **Animated project diagrams** (`site/js/project-viz.js`): each project told as an SVG timeline with GSAP.
- **Recruiter chat** (`site/js/chat/`): a scripted assistant that runs entirely in the browser,
  with no AI model and no network calls. It normalises and stems questions, corrects typos by edit
  distance, scores intents, falls back to BM25 search over the profile, and keeps conversation
  context. It only answers from `knowledge.js`.
- **Motion system**: a Three.js particle field, GSAP ScrollTrigger reveals, spring-based
  micro-interactions, and a reduced-motion fallback for every effect.
- **Two themes** (`?theme=v1` dark, `?theme=v2` light), built by `tools/build-themes.mjs`.
- **Contact form** on Netlify Forms, with inline validation.

## Run it locally

```bash
python3 tools/dev-server.py
```

Then open http://localhost:4173.

## Tests

```bash
node --test "tests/*.test.mjs"
```

## Deploy

Netlify builds `deploy/v2` from `site/` on every push to `main` (see `netlify.toml`).

The Three.js and GSAP bundles in `site/vendor/` are rebuilt from `vendor-src/`
(`npm install && npm run build`).
