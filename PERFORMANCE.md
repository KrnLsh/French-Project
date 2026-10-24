# Rendering Performance

The site now targets native display cadence without a JavaScript FPS cap. At
165 Hz, the interval is `1000 / 165 = 6.0606 ms`. This is a target, not a measured
guarantee: JavaScript cannot force GPU selection, reserve CPU cores, or prevent
browser/driver scheduling delays.

## Replacement code

Keep the existing `dist/assets/` directory. The replacement HTML loads the shared
frame utilities before the graphics features. Serve over HTTP using `npm run dev`;
opening `index.html` as a local file does not provide a reliable Worker origin.

| Files | Work removed from recurring main-thread frames |
| --- | --- |
| `hero-ascii.js`, `hero-ascii-renderer.js`, `hero-ascii-worker.js` | Thousands of glyph calculations and draw calls move to an OffscreenCanvas worker with its own animation clock. Pointer input uses one recycled transferable Float32Array with backpressure. The former ~30 FPS gate is removed. |
| `signature.js` | A vertex shader evaluates the sculpture; geometry buffers remain immutable after initialization. Frames update a few shared uniforms instead of rebuilding ~2,500 vertices and uploading three dynamic buffers. |
| `chronicle-plot.js`, `chronicle.js` | A GPU plot replaces continuously mutated SVG paths and bar dimensions. SVG axes, descriptions, labels, and controls remain accessible. |
| `render-performance.js`, `cursor.js`, `image-planes.js` | A shared read/write pipeline coalesces geometry invalidations and pointer storms. Input handlers reuse scalar/typed-array state. |
| `footer-trail.js`, `cursor-fog.js` | One canvas replaces 108 footer DOM cells, event handlers, and timers. Fog uses a fixed typed-array pool and small dirty regions. |
| CSS, `theme.js`, `app.js` | Dialog morphs use fixed geometry with transform/opacity animation. Color interpolation, animated padding/dimensions, blur backdrops, and repeated palette sampling are removed. Promotion and containment target bounded graphics surfaces, preserving sticky/pinned ancestors. |

## Compatibility and visual changes

Unsupported or failed workers recover to the main-thread ASCII renderer, replacing
the canvas if ownership was already transferred. WebGL failure retains SVG/image
fallbacks. Reduced motion, hidden tabs, offscreen graphics, and reading panels
suspend the relevant continuous renderers.

Themes and hover colors now change immediately. Dialog/entrance reveals use scale
and opacity; the loader uses fading strokes and fixed glitch masks. Canvas and
WebGL still rasterize pixels. Initial layout, content changes, resizing, fallback
SVG drawing, DOM transform strings, third-party library internals, and worker
message wrappers are not claimed to be allocation-free or paint-free.

`powerPreference: 'high-performance'` is a browser hint, as specified by
[WebGL](https://registry.khronos.org/webgl/specs/latest/1.0/). Layer promotion is
selective because excessive layers increase memory and compositing costs; see
[the browser animation guidance](https://web.dev/articles/animations-guide).

## Validation and profiling

Run `npm run check` for syntax, asset/accessibility references, and all five test
suites. In this editing session, the equivalent syntax checks, repository
validator, and 26 regression assertions passed in the bundled JavaScript runtime.
The shell had no Node/npm executable on PATH. Browser automation was unavailable;
GPU shader compilation, appearance, and actual frame times need browser review.

1. Open the HTTP-served site on the 165 Hz display. Wait for the entrance and
   shader warmup. Confirm the hero canvas has `data-renderer="worker"` in Elements.
2. Record a Performance trace while scrolling through the chart and sculpture,
   moving the pointer over images, opening/closing dialogs, and visiting the footer.
3. Inspect Main, Frames, the ASCII worker, GPU activity, and dropped frames. Look
   for recurring layout/paint, GC pauses, and intervals near 12.12 ms (missed slots).
   Evaluate scripting/rendering costs against 6.06 ms; an average FPS alone is
   insufficient.
4. Review narrow layouts, both themes, keyboard navigation, reduced motion, tab
   hiding/restoration, and WebGL context-loss recovery before deployment.
