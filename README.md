# Photo Studio

A web-based advanced photo editor built with FastAPI, Pillow, and vanilla JavaScript. Runs locally in the browser and supports layers, collage, and metadata editing.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- **Adjustments** — brightness, exposure, contrast, saturation, temperature, sharpness, blur, vignette, grain
- **Filters** — B&W, sepia, vintage, vivid, cool, warm
- **Crop** — free + preset aspect ratios, draggable handles, rule-of-thirds guides
- **Transform** — rotate 90° CW/CCW, flip horizontal/vertical
- **Canvas resize** — extend vertical → horizontal (or any shape) without cropping, with blur/color/transparent backgrounds
- **Layers** — create a custom-sized canvas, add multiple images as draggable/resizable layers, reorder, rename, hide, opacity
- **Collage** — 9 templates (2/3/4/6/9 images + asymmetric), spacing/border/radius/background controls, per-frame zoom & pan
- **Metadata** — read and edit EXIF, GPS, artist, copyright; strip all metadata
- **Export** — PNG / JPG / WebP with quality slider, at true canvas dimensions
- **History** — undo/redo with `Ctrl+Z` / `Ctrl+Y`
- **Responsive** — desktop, tablet, and mobile layouts

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | FastAPI, Pillow, NumPy, Jinja2                |
| Frontend  | HTML5 canvas, vanilla JS (ES modules), CSS    |
| Server    | Uvicorn                                       |

No frontend build step. No bundler. Just open the browser.

---

## Getting Started

### 1. Clone and enter the project

```bash
git clone <your-repo-url> photo-editor
cd photo-editor
>.venv\Scripts\activate
>pip install -r requirements.txt
>.venv\Scripts\deactivate
 