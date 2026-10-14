"""Server-side geometry ops (used for final high-quality export)."""
from PIL import Image

def crop(img, box):
    """box = [x, y, w, h] in pixels."""
    x, y, w, h = box
    return img.crop((x, y, x + w, y + h))

def rotate(img, degrees: float, expand: bool = True):
    return img.rotate(degrees, expand=expand, resample=Image.BICUBIC)

def flip(img, direction: str):
    if direction == "horizontal":
        return img.transpose(Image.FLIP_LEFT_RIGHT)
    if direction == "vertical":
        return img.transpose(Image.FLIP_TOP_BOTTOM)
    return img

def resize(img, width: int, height: int):
    return img.resize((width, height), Image.LANCZOS)