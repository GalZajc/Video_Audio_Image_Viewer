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

## Version 2.6.0

Ctrl+C copies the current image with exactly the PNG export transform/crop/annotation pipeline, followed by a brief green flash. It leaves the clipboard unchanged for audio/video. The encoded image is piped directly into the clipboard; temporary input rasters are removed.

Ctrl+O opens folder choices and a paged, lazy thumbnail gallery of the Windows Screenshots known folder, newest first. Clicking a screenshot opens a new tab. Redirected Screenshots folders are read from the current user's known-folder setting.

Ctrl+Shift+O opens a separate selectable-text overlay using the local [Windows OCR engine](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine). Images use their original decoded pixels; paused videos extract their source frame through FFmpeg. Crop, drawings, flips, rotation, pan and zoom do not enter recognition. Non-text regions are dimmed, words can be selected and Ctrl+C copies plain text. Escape restores the previous editing view. Large images are scaled to the engine limit and word rectangles are mapped back to source coordinates. Recognition uses installed Windows languages, including the user profile language; other platforms report that this backend requires Windows.

Text boxes use their text color for the frame and handles, provide a center translation handle, and rotate the resize cursor with the displayed box. Tool labels and native menu captions follow SL/EN. Both tool windows keep a small symmetric bottom inset; collapsed headers have a single border and the open-arrow options omit the redundant first separator.

Tab reordering excludes the held tab from sibling animations, cancels superseded animations and adds a small hysteresis to the shared slot threshold. Held tabs retain ownership of drawing palettes. Detachment waits for actual media content and reuses metadata when file size/mtime are unchanged, avoiding the empty logo frame.

Arrow rasterization now tapers only the terminal arc. Earlier visits to the same region remain in a separate opaque coverage mask; the final color/alpha is applied once, preserving transparent self-crossings. The existing direction and whole-curve smoothing filters remain unchanged.

## Version 2.7.0

Drawing previews retain the held tab's full tool configuration and media scale during tear-out/docking. Resizing the viewer updates the preview immediately. Delayed palette saves update only drawing preferences, preventing them from overwriting a newer shared-tool setting.

Freehand drawing caches the committed raster and repaints/uploads only the active path's affected region. Committing a fully rendered stroke reuses that raster. Gaussian geometry, arrow direction and export output are unchanged. In a local 4K fixture with 80,000 committed points, 130 updates and a 256-pixel smoothing wavelength, p95 repaint times fell from 100.7/43.0/56.9 ms to 10.5/7.8/9.2 ms for lines/filled arrows/open arrows. Full-reference pixel comparisons and mouse-up comparisons were identical. These measurements depend on hardware and stroke shape.

Ctrl+O also shows images in the **current clipboard**, importing them into private DATA for persistent tabs. Pixel-identical Screenshots entries are suppressed, independent of their file encoding. This does not read Windows clipboard history.

Moving rotated text boxes forces a clean raster refresh beneath the DOM editor. Rotation and resize cursors share the text color and line style.

Windows OCR now analyzes text orientation off the UI thread and deskews up to three localized regions in addition to the original image. Native OCR text-angle geometry and each region's inverse transform produce selectable source-space polygons. This improves mixed upright/slanted text without rotating the entire image; recognition still depends on the installed Windows OCR languages and image quality. The overlay has a neutral background, hides editing controls temporarily and preserves pending text edits. No private Snipping Tool APIs or external recognition service are used.

Validation: 35 unit/real-export checks, native tool ownership and live smoothing, clipboard deduplication, mixed-angle OCR, text movement pixel comparisons and the 4K drawing benchmark. Run `npm run test:review-round10` and `npm run test:drawing-performance`; optional `VAP_OCR_SAMPLE` selects a local comparison image without bundling it.

## Version 2.8.0

Ctrl+O now combines the current clipboard image with images returned by the official [Windows clipboard history API](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.datatransfer.clipboard.gethistoryitemsasync). Images are ordered newest first within the clipboard group and deduplicated by decoded pixels, including matching Screenshots entries. History is read only when opening the gallery; it is not enabled, cleared, changed or monitored in the background. If Windows reports disabled history or denied access, the gallery explains that state. Current clipboard images and the screenshot folder remain available. Imported images stay in private DATA for restored tabs.

A small C# bridge keeps native WinRT stream interfaces strongly typed. Windows PowerShell compiles the included source into a private DATA cache using the Windows .NET Framework compiler and system metadata; no SDK download or developer installation is needed. The history backend requires Windows 10 version 1809 or later and enabled clipboard history.

Showing a held tear-out window requests its current drawing state again, so previews immediately use the restored window's scale when tearing a tab from a maximized source. Preview lines, arrows and text are rasterized at source-pixel resolution and enlarged with nearest-neighbor sampling; the preview allocation is bounded by config.drawing.previewMaximumPixels. Expanded headers and outer frames share one border shade, and the hue-wheel edge uses fractional pixel coverage.

Text move and insertion cursors match the existing resize/rotation cursor style, follow the displayed text angle and use its color. OCR insertion cursors follow each recognized word polygon; their light-blue color is set in config.extras.ocrCursorColor.

Validation includes unchanged real Windows clipboard content while all three available history images are imported, gallery pixel deduplication, native maximized-window tear-out before mouse release, exact 8×8 preview pixel blocks, fractional hue-wheel edge alpha, rotated editor/OCR cursor geometry, and the previous tool/profile/OCR/text-trail scenarios. `npm run test:clipboard-history` reads the current Windows history without adding test entries; `npm run test:review-round11` uses generated media in OUTPUT.

## Version 2.9.0

Ctrl+O uses nearly the entire viewer window. Screenshots load independently in the main gallery; clipboard images load in a separate column on the right. Pixel-identical items are shown only under Screenshots. Reopening or refocusing the dialog requests a fresh clipboard snapshot, and obsolete asynchronous replies cannot repopulate a newer view.

Clipboard PNG copies remain in private DATA to restore opened tabs. **Show previously copied images no longer in the clipboard** is disabled by default: cached files are not a live clipboard source. Enabling the setting adds an explicitly labeled archive. Current WinRT history remains the authoritative list of live history items.

Ctrl+C now shows a 600 ms light-blue overlay, configured in extras.copyFlashMs/copyFlashColor/copyFlashOpacity. The overlay does not enter the copied/exported pixels. Clipboard image tests use per-write Windows options that exclude their generated images from history and roaming.

OCR groups local glyphs by line orientation, size and color, handles each region in both reading directions, and enlarges small regions before native recognition. Direction selection considers language plausibility and isolated digits. True polygon intersection prevents parallel slanted rows from being mistaken for duplicate words. Compatible line orientations are kept together in reading order. Recognition displays preparation progress and an active indicator during the Windows batch.

The seeded [20-orientation test image](Images/ocr-20-orientations.png) and its [rendering parameters](Images/ocr-20-orientations.json) cover five fonts, 26–56 px sizes, colors, dark/light backgrounds, bold/italic and rotations through nearly a full turn. All 20 target words were recognized in the local test. This is a reproducible fixture result, not a guarantee for every image or character. Run `npm run test:ocr-stress`; results, the rendered image and all parameters are saved to OUTPUT. Optional VAP_OCR_SAMPLE and VAP_OCR_EXPECTED_JSON select a private comparison image and expected strings; those inputs are not bundled.

Ctrl+O fills the viewer window. Screenshots and the fixed-width clipboard column have matching thumbnail sizes and narrow scrollbars. Both location menus (Ctrl+O / Ctrl+S) include compact close buttons and bundled Windows folder icons; no shell icon lookup is needed at runtime. `scripts/capture-folder-icons.ps1` can refresh these PNG assets during development on Windows.

## Version 2.11.0 — OCR replacement

OCR now runs the OneOCR engine from the **installed Microsoft Snipping Tool**, once on the original image. The former glyph-pair/orientation search and 97-pass region merge are no longer in the recognition path. Native line order, word confidence and word polygons are preserved without dictionary substitutions. The model is reused in an isolated hidden worker; an eight-entry image-content cache makes reopening the same image immediate. Unchanged overlays are retained, and all word regions are restored with one clipped image draw.

On a private 580×771 browser screenshot, the previous pipeline took 20.9 s (97 passes). OneOCR inference took about 1.8–2.7 s (one pass); first use also initializes/copies the model. In a manually transcribed 1,618-character / 263-word body region, character edit errors fell from 214 to 4. Four remaining word substitutions included AI/Al. These are sample measurements, not a guarantee of perfect OCR. Reopening a cached image took 40–50 ms in the native UI test. A separate ordinary English/Slovenian fixture checks čšž/ČŠŽ, links, punctuation and digits; the 20-orientation fixture passes 20/20 spatial word checks.

The app discovers the installed Snipping Tool and keeps a private versioned copy of its OCR runtime in DATA/cache/oneocr-runtime. Microsoft DLLs/models are **not included** in source control or release ZIPs. WindowsApps file restrictions require this private copy on some systems. An embedded UTF-8 process manifest preserves Slovenian paths without renaming folders or relying on short paths. If Snipping Tool is unavailable/incompatible, a bounded single-pass legacy Windows OCR fallback remains available. Its reason and engine name are recorded in the returned diagnostic data.

The portable build compiles the included C# bridge with the Windows .NET Framework compiler and includes the resulting executable; no Python, SDK install, cloud API or image upload is needed. Engine limits, timeouts, CPU count, idle lifetime and cache size are centralized in config.extras.ocrEngine. After five idle minutes the model process exits. Run npm run test:ocr-native; optional VAP_OCR_SAMPLE and VAP_OCR_EXPECTED_JSON verify a private sample without publishing it. Tests intercept copying and leave the Windows clipboard untouched.
