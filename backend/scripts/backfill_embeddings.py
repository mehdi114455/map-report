"""
Backfill description_embedding for any reports that don't have one.

Skips reports that already have an embedding.

Usage:
    python -m scripts.backfill_embeddings
"""
from app.db.session import SessionLocal
from app.db.models import Report
from app.services.embedder import embed


def main() -> None:
    with SessionLocal() as db:
        missing = db.query(Report).filter(Report.description_embedding.is_(None)).all()
        if not missing:
            print("No reports need backfill.")
            return
        print(f"Backfilling {len(missing)} reports…")
        for r in missing:
            r.description_embedding = embed(r.description)
            print(f"  ✓ report #{r.report_id}")
        db.commit()
        print("Done.")


if __name__ == "__main__":
    main()