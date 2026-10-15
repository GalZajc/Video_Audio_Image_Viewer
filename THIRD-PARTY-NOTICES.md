The application bundles Electron (MIT and Chromium third-party licenses are included in its distribution) and FFmpeg (see `bin/FFmpeg-LICENSE.txt` and the build's configuration).

`raster-renderer.js` adapts the fixed-point sine and pixel-coordinate arithmetic of FFmpeg's `libavfilter/vf_rotate.c`, Copyright (c) 2013 Stefano Sabatini and Copyright (c) 2008 Vitor Sessak. That arithmetic is used under the GNU Lesser General Public License, version 2.1 or any later version. The source remains editable in this portable project and application package. The WebGL rendering and UI integration are additions to that arithmetic.

Original source: https://github.com/FFmpeg/FFmpeg/blob/master/libavfilter/vf_rotate.c

License text: https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

The OneOCR bridge uses ABI information documented by b1tg (https://github.com/b1tg/win11-oneocr) and AuroraWright/oneocr (https://github.com/AuroraWright/oneocr, MIT). The C# worker and Electron integration are implemented in this project. Microsoft OneOCR DLLs and model files are obtained solely from the user's installed Microsoft Snipping Tool and cached privately in DATA; they are not redistributed in the public application archive.
