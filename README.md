Here is the cleaned-up, GitHub-ready `README.md` for your Photo Studio project. You can copy it directly into your repository.

Photo Studio

# Photo Studio

An advanced, web-based photo editor built with **FastAPI, Pillow, NumPy, and Vanilla JavaScript**. Edit images directly in your browser with powerful editing tools, custom-sized canvases, layers, collage creation, and metadata management.

---

## Features

### Image Editing

* **Adjustments** — Brightness, exposure, contrast, saturation, temperature, sharpness, blur, vignette, and grain.

* **Filters** — Black & white, sepia, vintage, vivid, cool, and warm.

* **Crop** — Free cropping, preset aspect ratios, draggable handles, and rule-of-thirds guides.

* **Transform** — Rotate 90° clockwise or counterclockwise and flip horizontally or vertically.

* **Canvas Resize** — Extend the canvas vertically, horizontally, or to custom dimensions without cropping the original image. Supports blurred, solid-color, and transparent backgrounds.

### Layers & Collage

* **Layers** — Create a custom-sized canvas and add multiple images as draggable and resizable layers. Reorder, rename, hide, and adjust layer opacity.

* **Collage Maker** — Choose from 9 templates supporting 2, 3, 4, 6, or 9 images, including asymmetric layouts. Customize spacing, borders, corner radius, and background colors. Adjust zoom and position independently for each frame.

### Metadata & Export

* **Metadata Editor** — Read and edit EXIF metadata, GPS information, artist details, and copyright information. Remove all metadata when needed.

* **Export** — Save images as PNG, JPG, or WebP with a quality slider and output at the actual canvas dimensions.

* **Undo & Redo** — Reverse or restore editing actions using `Ctrl + Z` and `Ctrl + Y`.

### Responsive Design

* Optimized layouts for desktop, tablet, and mobile devices.

* Browser-based editing interface.

* No frontend build step or bundler required.

---

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Backend    | FastAPI, Pillow, NumPy, Jinja2                     |
| Frontend   | HTML5 Canvas, Vanilla JavaScript (ES Modules), CSS |
| Web Server | Uvicorn                                            |
| Language   | Python 3.11+                                       |

---

## Getting Started

Follow these steps to run Photo Studio locally.

### 1. Clone the Repository

Replace `<your-repo-url>` with your Git repository URL.

```
git clone <your-repo-url> photo-editor
cd photo-editor
```

### 2. Create a Virtual Environment

**Windows:**

```
py -3.13 -m venv .venv
```

Alternatively, use your installed Python version:

```
python -m venv .venv
```

**macOS/Linux:**

```
python3 -m venv .venv
```

### 3. Activate the Virtual Environment

**Windows — Command Prompt:**

```
.venv\Scripts\activate
```

**Windows — PowerShell:**

```
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```
source .venv/bin/activate
```

### 4. Install Dependencies

Ensure your virtual environment is active, then run:

```
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Start the Application

```
python run.py
```

### 6. Open Photo Studio

Open the following URL in your browser:

[**http://127.0.0.1:8000**](http://127.0.0.1:8000)

You can now start editing images, creating layers, building collages, and exporting your work.

To stop the server, press `Ctrl + C` in the terminal.

---

## Project Structure

```
photo-editor/
├── run.py
├── requirements.txt
├── .venv/
├── templates/
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── README.md
```

*Note: The directory structure above is illustrative. Adjust it to match your actual project structure.*

---

## Requirements

* Python 3.11 or later.

* Pip package manager.

* A modern web browser.

* Internet access may be required to install dependencies.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.

2. Create a feature branch.

3. Commit your changes.

4. Submit a pull request.

---

**Photo Studio — Edit, Design, Create, and Export.**

Before committing: Verify that your actual project uses the listed `templates/` and `static/` directories, that `requirements.txt` includes all required packages, and that a `LICENSE` file exists. The project structure section is illustrative and should be adjusted to match your repository.
