from datetime import datetime

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

from app.config import STATIC_DIR, TEMPLATES_DIR
from app.routes import upload, process, export, metadata, canvas_fit, layers, collage, bg, admin

app = FastAPI(title="Kite Studio")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

app.include_router(upload.router,     tags=["upload"])
app.include_router(process.router,    tags=["process"])
app.include_router(export.router,     tags=["export"])
app.include_router(metadata.router,   tags=["metadata"])
app.include_router(canvas_fit.router, tags=["canvas"])
app.include_router(layers.router,     tags=["layers"])
app.include_router(collage.router,    tags=["collage"])
app.include_router(bg.router,         tags=["background"])
app.include_router(admin.router,      tags=["admin"])


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "year": datetime.now().year,
        "title": "Pixel Studio"
    })


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin/\n"
        "Disallow: /static/uploads/\n"
        "Sitemap: https://photo-editor.wasmer.app/sitemap.xml\n"
    )


@app.get("/sitemap.xml")
def sitemap():
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://photo-editor.wasmer.app/</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"""
    return Response(content=xml, media_type="application/xml")