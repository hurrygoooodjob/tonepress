# Tonepress · 印相室

Tonepress is a browser studio for photo and video effects. It opens with a rotatable 3D CRT and starts with a fine halftone that preserves the original colors. Try 131 effects, layer them, compare against the original, or start from one of 14 built-in presets. Editing and export happen on your device.

[Open Tonepress](https://hurrygoooodjob.github.io/tonepress/) · [Open the studio](https://hurrygoooodjob.github.io/tonepress/?studio) · [Open all effects](https://hurrygoooodjob.github.io/tonepress/?library)

The interface and effect search are available in English, 日本語, 简体中文, and 한국어. The browser remembers your language and custom presets.

## Mosh-Pro collection

The collection includes independently implemented counterparts to all 74 effects in the public Mosh-Pro guide. It combines 66 additions with eight existing Tonepress effects. Choose **Mosh-Pro** in the bottom strip to browse the 13 categories. Try Luma Mesh on a still, or play a video through Data Mosh, Feedback or Slit Scan. Audition several effects before applying one. Cancel returns to the applied parameters and video position.

[Compare three effects in motion](https://hurrygoooodjob.github.io/tonepress/compare/) · [Compare photos and video frames for all 74](https://hurrygoooodjob.github.io/tonepress/compare/catalog/) · [Edit the identical motion study](https://hurrygoooodjob.github.io/tonepress/?mosh&sample=motion&effect=mosh-data-mosh) · [All 74 effects and implementation differences](EFFECTS.md) · [Official reference guide](https://moshpro.app/guides/effects/)

Remove Background runs a bundled MediaPipe portrait model on your device. The hosted edition loads it on first use. The standalone file contains both the model and its runtime. [Model and runtime credits](assets/person/NOTICE) · [Apache 2.0 license](assets/person/LICENSE)

## Same-source comparison

The v11 benchmarks use the same Vernazza photo and a four-second, 24 fps study with a moving target, an occluder, frame numbers and an original test soundtrack. The playback comparison starts each temporal effect from a verified source frame, then pairs the complete watermarked Mosh-Pro visitor preview with Tonepress. Data Mosh now defaults to v12, alongside v11 and v10. [Loop the pillar crossing](https://hurrygoooodjob.github.io/tonepress/compare/?loop=crossing#mosh-data-mosh) from 1.25 to 3.50 seconds to compare block trails. Slit Scan and Feedback retain their v11 and v10 recordings. Mosh-Pro preview recordings are silent. The gallery pairs each of the 74 effects on the still and at three observed video playhead times. Guest preview timing, tear patterns and procedural noise can differ between runs.

## Import and export

Open a photo or a single video from your device, or try the built-in harbor photo and four-second clip. Import formats depend on the browser's image and video decoders.

| Output | Format and limits |
| --- | --- |
| Photo or current video frame | PNG, up to 4096 px on the long edge |
| Full video or four-second photo animation | MP4 when supported, with WebM as a fallback. Up to 1920 px on the long edge, targeting 30 fps. |

Video export records in real time and retains source audio when the browser can read it. Keep the tab in the foreground while recording. A static CRT illustration is shown when WebGL is unavailable.

## Run locally

The source is plain HTML, CSS, and JavaScript. From the repository root, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

[Open the local studio](http://127.0.0.1:8000/).

For offline use, download [tonepress.html](offline/tonepress.html) and open it directly in your browser. Run `python3 pack.py` to rebuild that file from the source, including the sample media. GitHub Pages can serve this repository directly from its root.

## Sample credits

*Beautiful Vernazza and the Sea, Cinque Terre, Italy* is by MedCruiseGuide.com and is available under Creative Commons Attribution 2.0 Generic. The bundled JPEG is resized and recompressed. The silent sample MP4 pans across a crop of the same photograph. The motion study adds a moving marker, an occluder, a counter, and a synthesized calibration sound. The comparison plates and short video demonstrations use the same credited image. Mosh-Pro is credited for its studio interface and visitor previews. The image on the CRT uses a green halftone treatment of the harbor. [Photographer](https://www.medcruiseguide.com/) · [Original photograph](https://www.flickr.com/photos/150594450@N07/36165241890/) · [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Vernazza_and_the_sea,_Cinque_Terre,_Italy.jpg) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)

The CRT model is built procedurally for Tonepress. The fallback poster is a render of that model and includes the adapted photograph on its screen.
