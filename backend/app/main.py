from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.firebase import init_firebase
from app.api.deps import sync_current_user
from app.api import reports, categories, ws, admin
from app.db.models import User
from app.schemas.user import UserOut

app = FastAPI(title="Map Report API", version="0.2.0")

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


@app.get("/me", response_model=UserOut)
def me(user: User = Depends(sync_current_user)) -> User:
    """Returns the current user's DB row, creating it on first call."""
    return user


app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(ws.router)
app.include_router(admin.router)