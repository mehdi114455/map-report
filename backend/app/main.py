from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.firebase import init_firebase
from app.core.security import get_current_user

app = FastAPI(title="Map Report API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_firebase()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "env": settings.APP_ENV}


@app.get("/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    """Protected endpoint — proves Firebase token verification works."""
    return user