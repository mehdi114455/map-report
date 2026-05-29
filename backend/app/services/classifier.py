"""
Stub category classifier — keyword matching.

TODO: Replaced with scikit-learn pipeline (TF-IDF + LinearSVC)
"""
from sqlalchemy.orm import Session
from app.db.models import Category


KEYWORDS = {
    "Road Infrastructure": ["pothole", "road", "asphalt", "pavement crack", "street damage"],
    "Sidewalk Issues":     ["sidewalk", "curb", "walkway", "accessibility"],
    "Public Utilities":    ["streetlight", "street light", "lamp", "power", "water main", "hydrant"],
    "Sanitation":          ["trash", "garbage", "litter", "bin", "dumping", "recycle", "recycling"],
    "Vandalism":           ["graffiti", "vandalism", "spray paint", "tagging"],
    "Abandoned Items":     ["abandoned", "dumped", "left behind", "abandoned vehicle"],
}

DEFAULT_CATEGORY = "Road Infrastructure"


def classify(description: str, db: Session) -> Category:
    """Return the best-matching Category row for the given description."""
    text = description.lower()
    scored = {cat: sum(1 for kw in kws if kw in text) for cat, kws in KEYWORDS.items()}
    best = max(scored, key=scored.get)
    if scored[best] == 0:
        best = DEFAULT_CATEGORY
    return db.query(Category).filter(Category.category_name == best).one()