"""Read + write image metadata (EXIF, GPS, and basic file info)."""
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS, GPSTAGS

# Reverse map: tag name -> numeric id
TAG_BY_NAME = {v: k for k, v in TAGS.items()}
GPS_TAG_BY_NAME = {v: k for k, v in GPSTAGS.items()}


def _decode(value):
    """Make EXIF values JSON-safe."""
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", "ignore").strip("\x00")
        except Exception:
            return value.hex()
    if isinstance(value, (tuple, list)):
        return [_decode(v) for v in value]
    if hasattr(value, "numerator") and hasattr(value, "denominator"):
        return float(value)
    return value


def read_metadata(img: Image.Image) -> dict:
    out = {
        "format": img.format,
        "mode": img.mode,
        "size": {"width": img.width, "height": img.height},
        "exif": {},
        "gps": {},
        "info": {},
    }

    # Basic Pillow info (DPI, ICC, comments, etc.)
    for k, v in (img.info or {}).items():
        if k in ("exif", "icc_profile"):
            continue
        out["info"][k] = _decode(v)

    exif = img.getexif()
    if exif:
        for tag_id, value in exif.items():
            name = TAGS.get(tag_id, str(tag_id))
            out["exif"][name] = _decode(value)

        # GPS block lives in IFD 34853
        gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
        if gps_ifd:
            for tag_id, value in gps_ifd.items():
                name = GPSTAGS.get(tag_id, str(tag_id))
                out["gps"][name] = _decode(value)

    return out


def write_metadata(img: Image.Image, updates: dict, strip: bool = False) -> Image.Image:
    """Return a copy of `img` with EXIF fields updated (or all stripped)."""
    if strip:
        # Drop all EXIF by creating a fresh image
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))
        return clean

    exif = img.getexif()
    for name, value in (updates or {}).items():
        if not value and value != 0:
            # Empty string / None -> remove tag
            tag_id = TAG_BY_NAME.get(name)
            if tag_id and tag_id in exif:
                del exif[tag_id]
            continue
        tag_id = TAG_BY_NAME.get(name)
        if tag_id:
            exif[tag_id] = value

    out = img.copy()
    out.info["exif"] = exif.tobytes()
    return out