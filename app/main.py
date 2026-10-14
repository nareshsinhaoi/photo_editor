from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

from app.config import STATIC_DIR, TEMPLATES_DIR
from app.routes import upload, process, export, metadata, canvas_fit, layers, collage

app = FastAPI(title="Pixel Studio")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

app.include_router(upload.router,     tags=["upload"])
app.include_router(process.router,    tags=["process"])
app.include_router(export.router,     tags=["export"])
app.include_router(metadata.router,   tags=["metadata"])
app.include_router(canvas_fit.router, tags=["canvas"])
app.include_router(layers.router,     tags=["layers"])
app.include_router(collage.router,    tags=["collage"])

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})