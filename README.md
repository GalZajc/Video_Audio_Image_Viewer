# Video Audio Image Viewer

A portable, keyboard-driven Electron viewer for video, audio and images, with compact browser-style tabs, precise frame selection, cropping, rotation, pixel-level inspection and annotations.

[Download the Windows x64 release](https://github.com/GalZajc/Video_Audio_Image_Viewer/releases) · [Slovenian documentation](README.sl.md)

## Run the portable application

Extract the **entire** release ZIP into a writable folder, then double-click **Video Audio Image Viewer.vbs**. It creates a shortcut with the application icon in the same folder. You can copy the shortcut to your desktop or pin it to Start. Electron, FFmpeg and FFprobe are included; a separate Node.js or FFmpeg installation is unnecessary.

Open files with Ctrl+O or drag them into the window. The flags at the top of Settings select Slovenian or English. Every keyboard shortcut is remappable.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Space | Play / pause |
| Left / Right | Seek backward / forward by 5 seconds |
| Comma / Period | Previous / next actual frame, including variable-frame-rate media |
| S / D | Decrease / increase speed by 10 percentage points |
| I / O | Mark the first / last included frame of one export interval |
| Shift+S | Show / hide the spatial crop |
| Ctrl+S | Export: destination folders and settings for this export |
| R | Rotation controls; positive angles rotate counterclockwise |
| Shift+R / Ctrl+Shift+R | Mirror across the original Y / X axis |
| Ctrl+D | Drawing tools |
| Ctrl+Z / Ctrl+Y | Undo / redo an annotation |
| C / P | Toggle subtitles / timeline previews |
| Ctrl+Shift+Left / Right | Previous / next matching file in the same folder |
| Delete, then Enter | Confirm moving the current file to the Recycle Bin |
| Ctrl+O / Ctrl+T | Open files in new tabs |
| Ctrl+W / Ctrl+Shift+T | Close / restore a tab |
| Ctrl+Tab / Ctrl+Shift+Tab | Next / previous tab |
| Ctrl+Comma | Settings |
| F | Hide / show the tab bar inside the window |
| F11 or picture double-click | Actual fullscreen |
| Up / Down / M | Volume up / down / mute |
| Alt+R | Reset zoom and translation |
| Ctrl+Backspace | Clear the time interval and crop |

Escape acts on **key release**. It closes editing modes, leaves an expanded timeline while retaining I/O, resets the view, resets a nonzero rotation, then fits the window. Shift+Escape expands instead of shrinking the fitted window. Optional maximum-fit behavior is disabled by default. Hold Escape and press 1–7 to choose an individual step: drawing, rotation controls, crop, view reset, zero rotation, smaller fitted window, or optional maximum fitted window.

## Mouse controls and tabs

Ctrl+wheel zooms a paused video or image around the pointer; Ctrl+left drag pans, including while drawing. Pixels remain sharp square cells. R places a movable blue rotation pivot at the pointer, preserving its position and the current scale during rotation.

Tabs start at a fixed width and shrink when space is limited. Drag to reorder or tear a tab into another window. Settings control the vertical detach distance (28 pixels by default, one tab-bar height). The new window uses the source window's restored size even when the source is maximized. With one tab, the existing window moves directly instead of creating a duplicate. Hovering over another tab strip displays an animated insertion slot; release docks the tab there. Unused strip space stays available when dragging the rightmost tab. Middle-click or the close symbol closes a tab. Hover shows its full path; double-click reveals the file in Explorer. External file opens go to the last-used viewer window.

Click the media icon to choose any of the seven video/audio/image combinations for folder navigation. Settings control sorting and direction. Per-file view state and annotations are retained when cycling through a folder.

## Selection, rotation and drawing

I and O include both boundary frames. The selected interval is light blue. Double-click it to expand it across the timeline; double-click again to restore the whole recording. Identical I/O frames export a PNG.

The crop stays horizontal and vertical after rotation and can include the background corners of the rotated bounding box. Drawing and erasing work in those corners too. The background color and alpha are configurable; outer letterboxing stays black. View changes and exports retain crop, rotation, mirroring and annotations.

The gray drawing accordion offers freehand lines, filled arrows, open V arrows, text and an eraser. The tool preview uses the same pixel scale as the picture. Full-width color swatches open the shared HSV/RGBA picker, with alpha and normalized or byte values. Click a slider endpoint to edit that limit separately; double-click its thumb to enter an exact value.

Arrow orientation has two controls: **path length** (the retained path window) and **minimum wavelength** (the low-pass cutoff). The filter smooths both source-coordinate components as functions of distance along the path; the endpoint derivative determines orientation. Three cascaded low-pass stages suppress pixel jitter, and an unreliable derivative retains the previous direction. The displayed turn is bounded from the first movement. Larger values smooth more strongly but make the head follow bends more gradually. Filter terminology follows standard [signal filtering conventions](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.sosfilt.html); this viewer implements its own spatial filter in JavaScript. The recorded curve is retained through its endpoint. Shift+click adds polyline vertices; an existing vertex finishes it. Ctrl+Shift+click constrains segments to 45-degree increments. A polyline arrow uses its exact final segment.

Text is entered directly into an initially horizontal box. Height follows the wrapped text; the right-middle dot changes width and the top-right dot rotates around the center. Fonts: Arial, Helvetica, Verdana, Consolas and Comic Sans. Dimensions use source pixels. B/I select bold/italic; Ctrl+Enter or clicking outside finishes entry.

While dragging the eraser, only new stroke segments and the modified GPU texture region are processed. Pointer updates are batched to display frames, rather than replaying the full drawing history for every event. Undo/redo and export behavior are retained.

## Playback, previews and subtitles

Playback uses Chromium's HTML media engine, with range-based local file access and an open decoder across seeks. Unsupported formats are prepared locally with progress feedback. This is a local viewer with similar playback building blocks, not a copy of YouTube's private player. Seek latency still depends on the codec and keyframe spacing.

A second decoder prepares thumbnails in the background. Cached previews appear immediately while hovering, and the requested frame is refined without blocking playback. With **fit media aspect ratio** enabled, the configured width/height are maxima and the preview box fits the recording tightly.

C looks first for a matching SRT/VTT/ASS/SSA companion file, then an embedded text subtitle track, and finally offers a file picker. UTF-8 paths and subtitles are supported.

## Export

Ctrl+S offers the source folder, Downloads and Videos/Music/Pictures, followed by recent destinations. The current media type's folder is listed first among those three. The right column controls this export; global preferences supply its initial values.

Defaults are MP4, MP3 and PNG. Compatible unchanged content is copied when possible; a complete unchanged file in the same container may be copied byte-for-byte. Precise trims, crop, transforms and annotations generally require encoding. Video can also be saved without audio, or its audio can be exported separately or with a black video track.

The default **match source** option uses high-quality encoding without aggressive bitrate limits that could damage fine text. It approximates source quality; identical size or quality is not guaranteed for every codec. Disabling it selects lossless video encoding, which can produce much larger files. An unchanged extension does not imply unchanged encoding: MP4 is a container, while codecs compress its streams.

Exports use the original media rather than the playback proxy, and include all transforms and annotations. Playback speed does not affect export speed. Sources are never overwritten. PNG preserves image pixels and alpha; JPEG is lossy and still-image WebP is saved losslessly.

## Local data and systematic review

`config.json` centralizes parameters. `DATA/` holds preferences, tab history, cached media and the review checklist. `OUTPUT/` holds timestamped, reproducible export/test records, including parameters and FFmpeg commands. Neither directory is published in the repository or portable release.

**Review features.vbs** starts the local checklist at `127.0.0.1:41837`. It supports checked, failed, assumed and unreviewed states, successive notes, pasted screenshots, editable requirements and reversible archiving. It generates the next development prompt. Notes grow naturally with their text; adding a note preserves page position without collapsing and measuring a focused textarea. Paste images directly into the requirement or an individual note, including while creating a new requirement. Each image stays with its original phase when another note is added. Legacy unclassified images remain with the base requirement. The generated prompt includes phase labels for screenshots.

**Set default viewer.vbs** registers file types and opens Windows Settings for confirmation. On current consumer Windows editions, registration alone does not prove Explorer activation; SVG is excluded. After moving the folder, recreate the shortcut and re-register file types.

## Build and test

Source development requires Node.js. On Windows, double-click **setup_and_run.bat** to download a pinned, SHA-256-verified FFmpeg build if needed, install dependencies, build and create the shortcut. Dependencies stay inside the project folder. The portable release needs none of these setup tools.

For developers with a terminal already open in the repository:

```powershell
npm ci
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-ffmpeg.ps1
npm run build
npm test
npm run test:review-round5
npm run test:review-scroll
npm run test:review-phases
npm run test:tab-docking
npm run test:drawing-controls
```

Tests include real FFmpeg exports, inclusive frame boundaries, Unicode, VFR, pixel transforms, pointer-anchored zoom, arrow stability across repaint rates and reversals, full-size detached windows, 4K eraser updates, and checklist scrolling after a long note. Results are saved under timestamped `OUTPUT/` directories. Local timing measurements depend on hardware.

The supplied release is Windows x64. Other operating systems require an Electron build and appropriate FFmpeg/FFprobe binaries. Shell integration and VBS launchers are Windows-specific.

See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and the bundled license/source notices for Electron, Chromium and FFmpeg.

## Version 2.4.0

Ctrl+D opens two independent draggable native windows: drawing tools and the shared color picker. Selecting a tool updates the color picker; tool icons use their saved colors, and the selected tool receives a subtle RGB tint (config.drawing.selectedToolTint). The windows remember their positions and synchronize source-pixel sizes, editable ranges, live previews and undo/redo with the owning media tab.

Tab tear-outs reuse a preloaded viewer window and prepare its media at mouse-down. The source shows its next tab immediately. Entering another tab strip attaches the actual media view and a movable provisional tab before mouse-up; leaving reverses the attachment. Spare tab-strip space drags the native window.

Adding a review requirement saves it immediately without changing any visible page pixel or the scroll thumb. Its row is revealed on the next intentional scroll/navigation, or on filtering/reloading. Existing notes and phase-specific screenshots remain intact.

Arrow shafts are clipped to the exact head envelope, preserving the recorded curve and the previously accepted low-pass direction filter.

## Version 2.5.0

Detached tabs remain above ordinary windows while held and return to normal stacking after release. Local and docked reordering share the same half-slot threshold; the grab position scales with a tab when its width changes.

Drawing/color windows stay on top, size tightly around their contents (maximum 1000 px or the available screen height), and match the preview width to the tool buttons. Numeric dialogs accept Enter without leaving focus outlines, and number spinners fit their fields.

Each tab stores its selected tool, values and colors in its session state. Native viewer focus changes immediately update both tool windows; tabs with drawing disabled hide them. Settings can instead keep one shared tool profile across all tabs and windows. Tool commands carry the viewer and tab identity, so a late event cannot edit a newly selected tab.

Each freehand line/arrow tool has a separate whole-curve smoothing wavelength, in source pixels; zero disables it. The spatial Gaussian filter anchors both endpoints, uses odd boundary reflection and caches unchanged history. Integrated sampling bins avoid aliasing with large wavelengths. Polylines retain their straight segments. The original arrow-direction low-pass filter is unchanged.

Filled triangular heads optionally align to the displayed curve where it crosses their base. The fixed-point iteration uses a small angular tolerance, damping and a finite iteration limit; degenerate curves keep the best available estimate.

The shaft mask is restricted to the apex neighborhood. Earlier bends remain visible instead of being clipped by a rotating global half-plane. The same geometry and smoothing are used in previews, live drawing, retained history and raster export.
