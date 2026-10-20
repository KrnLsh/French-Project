# L’Art du Jeu

An independent digital museum tracing French video game history from the home-computing scene to the contemporary renaissance.

## Run

Requires Node.js 20 or later. There is no installation or build step.

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:4173. Deploy the contents of `dist/` to any static HTTPS host.

```sh
node --check dist/app.js
node scripts/check.mjs
```

## Structure

- `dist/index.html`: semantic exhibition content, accessible artifact dialogs, and sources.
- `dist/styles.css`: responsive museum design, typography, cursor states, and reduced-motion layouts.
- `dist/app.js`: GSAP / ScrollTrigger choreography, Lenis scrolling, Three.js shader fields and image planes, SplitType line masks, procedural ambient audio, charts, and interactive exhibits.
- `dist/assets/`: locally hosted typefaces, pinned library distributions, archival game imagery, and credits.

## Interaction and accessibility

The entrance headline opens with staggered Klein Blue blocks sweeping from left to right. Each block then collapses toward its right edge, uncovering the lettering as it slides into place. Reduced motion shows the complete title immediately.

Desktop: scroll through a pinned horizontal exhibition, drag the gallery, or use its previous/next controls. Select artifacts to read notes. Explore the studio chart by pointer or keyboard, switch the curatorial themes, and hover modern works for a floating preview.

The desktop cursor expands into a round inversion lens over text, images, diagrams, and controls, including inside exhibit drawers. The artwork and lettering remain visible through the ball with their colors inverted. It returns to a small outline over empty gallery space and never intercepts clicks.

Touch: the horizontal exhibition uses native scrolling with snap points. All artifact notes remain available by tapping. Core content remains readable if JavaScript or WebGL is unavailable.

The system reduced-motion preference is respected. The footer also offers a persistent motion setting. Reduced motion removes momentum, pins, split-text motion, custom cursor effects, and image shaders. Ambient sound is generated locally, off by default, and only starts after a user gesture. Explicitly positioned, accessible overlay drawers work in embedded browsers without relying on native dialog top layers. They provide focus containment, Escape and backdrop dismissal, internal scrolling, and reliable scroll restoration.

The seven-studio founding chart is explicitly a cumulative, selected archival sample—not a measure of the entire industry. The visual theme map is interpretive, not quantitative. Game dates refer to original releases, while some imagery depicts later commercial editions. Sources and image credits are available in the exhibition and in `dist/assets/image-credits.json`.

## Dependencies

GSAP 3.12.5, ScrollTrigger 3.12.5, Lenis 1.0.42, Three.js 0.158.0, SplitType 0.3.4. Bundled unmodified from their official npm distributions. Instrument Serif, Inter, and Space Mono are locally hosted from Google Fonts. Respect the licenses included in each distribution and the copyright of game imagery. This exhibition is an independent editorial project, not an official studio or publisher site.

## Performance

The ambient shader follows the display refresh rate, with a two-million-pixel rendering budget and derivative-based contour antialiasing. Exact critically damped springs smooth the pointer and its trailing wake; elapsed-time damping keeps the response consistent across refresh rates. Click ripples fade in and out, and the animation clock pauses with hidden tabs and reduced motion so it cannot jump on return. A compositor-transformed CSS contour field provides a smooth fallback when WebGL is unavailable. Image shader loops run only for visible, active image planes and interpolate pointer position and strength using elapsed time. Offscreen and background rendering is suspended. The layout reserves image aspect ratios and waits for locally hosted fonts before line splitting. Resize rebuilding reverts prior motion contexts and text splitting before recreating triggers.

## First GitHub commit

This folder contains the complete editable website source. The `dist/` folder is the site itself and should be committed, along with `scripts/`, `package.json`, this README, `.gitignore`, and `.gitattributes`.

From this folder, run:

```sh
git init -b main
git add .
git commit -m "Initial commit: L'Art du Jeu"
```

To preview the website, run `npm run dev`. To check source syntax and local asset references, run `npm run check`. No dependency installation is needed.

Create a repository on GitHub and use its instructions to add a remote and push this initial commit. For static hosting, publish the contents of `dist/`.
