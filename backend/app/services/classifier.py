"""
Category classifier: TF-IDF + LinearSVC.

"""
from pathlib import Path
from threading import Lock
from typing import Optional

import joblib
from sqlalchemy.orm import Session
from app.db.models import Category

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "category_classifier.joblib"
DEFAULT_CATEGORY = "Road Infrastructure"
MIN_CONFIDENCE = 0.35

_model = None
_model_lock = Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                if not MODEL_PATH.exists():
                    return None
                _model = joblib.load(MODEL_PATH)
    return _model


def predict(description: str) -> tuple[str, float]:
    """Return (predicted_category_name, confidence)."""
    model = _get_model()
    if model is None:
        return DEFAULT_CATEGORY, 0.0
    proba = model.predict_proba([description])[0]
    classes = model.classes_
    idx = proba.argmax()
    return classes[idx], float(proba[idx])


def classify(description: str, db: Session) -> Category:
    """Resolve the predicted category name to a Category row."""
    name, _ = predict(description)
    cat = db.query(Category).filter(Category.category_name == name).one_or_none()
    if cat is None:
        cat = db.query(Category).filter(Category.category_name == DEFAULT_CATEGORY).one()
    return cat


def classify_with_confidence(description: str, db: Session) -> tuple[Category, float, bool]:
    """Same as classify() but also returns confidence and an 'uncertain' flag.
    Used in places where admins want to see why a category was chosen."""
    name, conf = predict(description)
    cat = db.query(Category).filter(Category.category_name == name).one_or_none()
    if cat is None:
        cat = db.query(Category).filter(Category.category_name == DEFAULT_CATEGORY).one()
    return cat, conf, conf < MIN_CONFIDENCE