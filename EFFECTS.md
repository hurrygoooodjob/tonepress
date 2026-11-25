# Mosh-Pro collection in Tonepress

[Open the collection](https://hurrygoooodjob.github.io/tonepress/?mosh&sample=video) · [Official Mosh-Pro effect guide](https://moshpro.app/guides/effects/)

The collection matches 74 public effect names to 74 selectable Tonepress implementations. Eight use filters from the original library. The other 66 extend it to 131 unique effects. Open a row to try it on the built-in media.

[Watch the synchronized Data Mosh exit in v13, v12, v11 and v10](https://hurrygoooodjob.github.io/tonepress/compare/?loop=exit#mosh-data-mosh) · [All 74 on the same photo and video](https://hurrygoooodjob.github.io/tonepress/compare/catalog/)

## Differences that affect the result

- Data Mosh holds a decoded frame, accumulates local motion and refreshes blocks as prediction errors increase. Feedback starts with neutral geometry and hue. Slit Scan combines slices held in a bounded frame history. Play a moving video to see these temporal effects. A seek starts a new history.
- Within the Mosh-Pro collection, Half Tone offers monochrome and color separations, Pixelate has independent axes, and Dither has dedicated controls. The main studio still opens with its subtle true-color ink screen.
- Push Draw and Mask Draw use editable 8 × 8 maps. Media places a second still image over the source. Texture accepts a texture image and includes generated paper. Uploaded layer images are scaled to a maximum edge of 768 pixels.
- Audio Visualizer reads a browser-decodable soundtrack from an imported video up to 96 MiB. The frame-numbered motion study includes a synthesized audio track.
- Masks modify the preceding layer. In first position they remove parts of the input itself, and PNG preserves the resulting transparency. Remove Background uses the local MediaPipe portrait model. It targets people, and fine hair, small figures and busy backgrounds can affect the matte.
- Algorithms, color presets and controls were independently implemented. This collection covers effects. MIDI routing, the reference application’s timeline, groups and asset library are outside this version.

## Time-Based

| Effect | Tonepress implementation |
| --- | --- |
| [Data Mosh](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-data-mosh&sample=video) | Match motion across video frames and carry the previous processed image forward in blocks. A still photo passes through. |
| [Optical Flow](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-optical-flow&sample=video) | Track motion in video and use local brightness to warp stills. |
| [Feedback](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-feedback&sample=video) | Transform and overlay the preceding processed frame. Zoom and rotation can produce tunnels or spirals. |
| [Watercolor](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-watercolor) | Soften and pool neighboring colors in a chosen direction. In video, colors from the previous frame briefly bleed through. |
| [Slit Scan](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-slit-scan&sample=video) | Assemble narrow strips from different moments into one image, stretching moving subjects along the slices. |

## Glitch

| Effect | Tonepress implementation |
| --- | --- |
| [Luma Mesh](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-luma-mesh) | Project brightness as a terrain height field and draw it with colored faces, scanlines, or glowing points. |
| [Jitter](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-jitter) | Shift the image rapidly in a chosen direction. A small amount resembles an unstable analog signal. |
| [Melt](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-melt) | Pull pixels downward through uneven channels, like softened paint running in streams. |
| [Shake](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-shake) | Simulate a camera being knocked with brief steps that move the whole frame. |
| [Bad TV](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-bad-tv) | Combine rolling analog distortion with fine line jitter to evoke a TV losing tracking. |
| [Soft Glitch](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-soft-glitch) | Separate red, green, and blue in drifting soft bands to create graded chromatic tears. |
| [Hard Glitch](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-hard-glitch) | Displace the image in bursts of horizontal bands and hard-edged blocks while separating its color channels. |
| [Pixel Sort](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=pixel-sort) | Sort runs of pixels within the luminance range while keeping the original pixel colors. |
| [Decimate](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-decimate&sample=video) | Capture new frames at fixed beats and repeat the last frame between updates. Keep some old blocks and tint incoming frames. |

## Reframing

| Effect | Tonepress implementation |
| --- | --- |
| [Transform](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-transform) | Move and rotate the image, scale each axis, and choose how to fill the edges. |
| [Transform 3D](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-transform-3d) | Rotate the image plane on all three axes and project it back with perspective. |

## Displacement

| Effect | Tonepress implementation |
| --- | --- |
| [Bulge](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-bulge) | Bulge the image around a movable center while the area outside the circle stays fixed. |
| [Slices](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-slices) | Slice the frame into independently drifting strips with a shared angle and separate travel speeds. |
| [Stretch](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-stretch) | Pull a local band in a direction, with waves or jagged edges along its boundary. |
| [Wave](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-wave) | Bend the image with a single sine wave whose wavelength, position, and angle are adjustable. |
| [Wobble](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-wobble) | Overlap slow waves across the frame to create rolling refraction. |
| [Smear](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-smear&sample=video) | Sweep pixels into directional brush marks. Moving video adds a short accumulating trail. |
| [Push Draw](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-push-draw) | Paint an 8×8 grid to move selected areas with soft edges, optional color separation, and motion. |

## Repetition

| Effect | Tonepress implementation |
| --- | --- |
| [Mirror](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-mirror) | Keep one side and reflect it across a movable axis. |
| [Tile](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-tile) | Repeat the source in a rotating grid with an optional animated offset on alternate rows. |
| [Kaleido](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-kaleido) | Reflect a sampled wedge around the center to create a rotatable radial pattern. |
| [Splitter](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-splitter) | Cut equal strips, offset them in order, and scale the image inside each strip. |

## Tone & Contrast

| Effect | Tonepress implementation |
| --- | --- |
| [Posterize](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-posterize) | Quantize continuous tones into a fixed number of bands. |
| [Solarize](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-solarize) | Apply a folded luminance curve to create a solarized image. |
| [Edges](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=edge) | Extract boundaries between light and dark to create line art. |
| [Bleach](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-bleach) | Lift the midtones and compress highlights while controlling how much original color remains. |
| [Sharpen](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-sharpen) | Use a Gaussian blur to isolate and strengthen edge contrast and detail. |

## Dots & Pixels

| Effect | Tonepress implementation |
| --- | --- |
| [Pixelate](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=pixel) | Average the source image over a grid with independently adjustable axes. |
| [Dot Matrix](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-dot-matrix) | Rebuild the image with display dots whose size follows source brightness. |
| [Polar](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-polar) | Map image coordinates to angle and radius, with an adjustable hole and repeats around the ring. |
| [8-Bit](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-8-bit) | Average color in pixel blocks, then match it to an original limited retro palette. |
| [Half Tone](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=halftone) | Screen the image using adjustable dots and monochrome or color separations. |
| [LinoCut](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-linocut) | Carve tapered marks through the midtones while highlights reveal paper and shadows retain ink. |
| [Dither](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=dither) | Quantize the image with an adjustable dither pattern. |
| [ASCII](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=ascii) | Redraw light and shadow with characters of varying density. |

## Color

| Effect | Tonepress implementation |
| --- | --- |
| [Color Correction](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-color-correction) | Adjust brightness, contrast, saturation and hue independently, or invert the result. |
| [Curves](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-curves) | Remap all colors or a single RGB channel with a smooth five-point curve. |
| [Hue Cycle](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-hue-cycle) | Rotate hue continuously. The default direction and rate were measured on video; the starting phase may differ between studio sessions. |
| [DuoTone](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-duotone) | Map source brightness continuously between a shadow color and a highlight color. |
| [Rainbow](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-rainbow) | Index a color ramp by brightness, with directional offset and timed cycling. |
| [InstaColor](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-instacolor) | The default Etikate-style grade lifts shadows with separate channel curves calibrated on a fully loaded studio preview. Four other grades are available. |

## Optics

| Effect | Tonepress implementation |
| --- | --- |
| [RGB Shift](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-rgb-shift) | Shift RGB channels in different directions to recreate color misregistration. |
| [Vignette](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-vignette) | Fade the frame corners to a chosen color with adjustable feathering and shape. |
| [Tilt Shift](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-tilt-shift) | Keep an angled focus band sharp while progressively blurring the surrounding image. |
| [Barrel Blur](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-barrel-blur) | Curve the lens coordinates and increase softening and color fringing toward the edges. |
| [Glow](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-glow) | Extract bright areas above a threshold so light spills beyond their edges. |
| [Blur](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-blur) | Uniformly soften the image with a Gaussian kernel. |
| [Light Streak](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-light-streak) | Stretch highlights into directional streaks with optional color separation and drift. |
| [Strobe](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-strobe) | Dim the image rhythmically, with an option for irregular pulses. |

## Screen & Film

| Effect | Tonepress implementation |
| --- | --- |
| [Super8](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-super8) | Simulate old film gate weave, a rolling dark band, light leaks and dust. |
| [VHS](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=vhs) | Simulate color bleed, line jitter, and noise that changes over time. |
| [CRT](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=crt) | Overlay phosphor texture and scanlines. |
| [ScanLines](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-scanlines) | Simulate CRT scanning with repeating light or dark lines that can be rotated. |
| [Grain](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-grain) | Layer animated digital noise or clustered film grain over the image. |

## Content

| Effect | Tonepress implementation |
| --- | --- |
| [Media](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-media) | Import a second still image, then adjust its scale and position. |
| [Caption](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-caption) | Set your own caption, position and ink color. |
| [Audio Visualizer](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-audio-visualizer) | Bars follow the sound in your video. Import a video under 96 MB with a decodable audio track. |
| [Texture](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-texture) | Multiply a texture image over the frame or use the built-in paper grain. |

## Generators

| Effect | Tonepress implementation |
| --- | --- |
| [Color Gradient](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-color-gradient) | Overlay a linear or radial gradient with two chosen colors. |
| [Noise](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-noise) | Layers of smooth noise drift between two colors. |
| [God Rays](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-god-rays) | Cast moving shafts of light from a chosen point. |
| [Plasma](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-plasma) | Intersecting waves generate a flowing color field. |
| [Grid](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-grid) | Move and rotate a grid or a set of stripes over the frame. |
| [Dots](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-dots) | Tile dots across the frame. Set their size, angle and color. |

## Masking

| Effect | Tonepress implementation |
| --- | --- |
| [Mask](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-mask) | Load a grayscale image. White keeps the previous layer and black reveals what was underneath. |
| [Mask Blocks](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-mask-blocks) | Reveal parts of the preceding layer through moving blocks. |
| [Mask Draw](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-mask-draw) | Paint the areas to keep on an 8 × 8 stencil, or import a monochrome pattern. |
| [ChromaKey](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-chroma-key) | Remove a chosen color within a tolerance. Use as the first layer for transparent PNG cutouts. |
| [Remove Background](https://hurrygoooodjob.github.io/tonepress/?mosh&effect=mosh-remove-background) | Detect people on your device and keep them while removing the background. Invert the mask, expand it, or soften its edges. |
