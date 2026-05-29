"""Seed reference data. Idempotent: safe to run multiple times."""
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Category

CATEGORIES = [
    ("Road Infrastructure", "Potholes, road damage, traffic signs, pavement cracks."),
    ("Sidewalk Issues", "Damaged sidewalks, accessibility issues, obstructions."),
    ("Public Utilities", "Streetlights, power lines, water mains."),
    ("Sanitation", "Trash, garbage bins, litter, illegal dumping, recycling."),
    ("Vandalism", "Graffiti, defacement of public property."),
    ("Abandoned Items", "Abandoned vehicles, furniture, large items left in public spaces."),
]


def seed_categories(db: Session) -> None:
    existing = {c.category_name for c in db.query(Category).all()}
    added = 0
    for name, desc in CATEGORIES:
        if name not in existing:
            db.add(Category(category_name=name, description=desc))
            added += 1
    db.commit()
    print(f"Seeded {added} new categories ({len(CATEGORIES)} total).")


if __name__ == "__main__":
    with SessionLocal() as db:
        seed_categories(db)