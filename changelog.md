# Changelog

## v1.4.0 - 2026-11-02

### Fixed

- Fixed exported PNG, JPEG, and WebP images losing metadata saved in the Metadata panel.
- Fixed layer exports so they preserve metadata from the source image.
- Fixed saved EXIF values so they are written explicitly to the uploaded PNG and can be read after export.

## v1.3.0 - 2026-11-01

### Added

- Added an Elements panel to the left toolbar.
- Added support for attaching local images as editable canvas layers.
- Added shape elements with selectable colors.
- Added emoji and graphics elements.
- Added more abstract graphics, including panels, blobs, frames, ribbons, waves, leaves, stamp shapes, and burst shapes.
- Added category filters for All, Shapes, Graphics, and Uploads.
- Added text layer creation on blank canvases without requiring an uploaded image first.
- Added text layer editing through a dedicated modal.
- Added text editing controls for content, font, weight, size, text color, text background, padding, letter spacing, alignment, shadow, and outline.
- Added Edit Text Layer buttons to text layers and selected-layer controls.
- Added support for double-clicking text layers to edit them.
- Added text, sticker, graphics, and attached-image layers to the layer workflow with drag, resize, rotate, flip, reorder, visibility, rename, opacity, and delete support.
- Added compact styling for selected-layer action buttons.

### Fixed

- Fixed text layer updates so changed text renders on the canvas and updates the layer name.
- Fixed text-layer dimensions so the existing layer center is preserved when text changes.
- Fixed image attachment handling and image layer creation.
- Fixed module caching for updated JavaScript files by cache-busting the main editor modules.
- Fixed left-toolbar panel switching after module-loading updates.
- Fixed text and element controls being unusable after an uploaded image was required for blank-canvas operations.

### Changed

- Replaced the old sticker-only panel with the broader Elements panel.
- Updated the application version displayed in the footer to v1.3.0.
