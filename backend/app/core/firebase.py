import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from app.core.config import settings

_app = None


def init_firebase() -> None:
    global _app
    if _app is None:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _app = firebase_admin.initialize_app(cred)


def verify_id_token(id_token: str) -> dict:
    """Returns decoded claims, raises on invalid/expired."""
    init_firebase()
    return fb_auth.verify_id_token(id_token)