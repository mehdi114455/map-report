from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.api.deps import sync_current_user
from app.db.session import get_db
from app.db.models import User, Report, Location, StatusHistory
from app.schemas.report import ReportCreate, ReportOut, ReportStatusUpdate
from app.services.sanitize import sanitize_text
# from app.services.classifier import classify
from app.services.classifier import classify_with_confidence
from app.services.embedder import embed
from app.services.duplicates import find_duplicate_cluster, link_to_cluster



router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    user: User = Depends(sync_current_user),
    db: Session = Depends(get_db),
) -> Report:
    # XSS sanitization on free-text fields.
    clean_desc = sanitize_text(payload.description)
    clean_title = sanitize_text(payload.title) if payload.title else None

    # After sanitizing, an all-tag string ('<script></script>') would be empty.
    if not clean_desc or len(clean_desc) < 5:
        raise HTTPException(
            status_code=422,
            detail="Description is required and must contain at least 5 characters of text.",
        )

    # Create Location row first
    point = Point(payload.location.longitude, payload.location.latitude)  # lon, lat order!
    loc = Location(
        latitude=payload.location.latitude,
        longitude=payload.location.longitude,
        city=payload.location.city,
        geog=from_shape(point, srid=4326),
    )
    db.add(loc)
    db.flush()

    # AI/NLP step: classify category.
    category, confidence, _uncertain = classify_with_confidence(clean_desc, db)

    # Semantic embedding (used for duplicate detection now and any future
    # similar-search features).
    embedding = embed(clean_desc)

    report = Report(
        user_id=user.user_id,
        category_id=category.category_id,
        location_id=loc.location_id,
        title=clean_title,
        description=clean_desc,
        priority_level="normal",
        current_status="pending",
        image_url=payload.image_url,
        ai_confidence=confidence,
        description_embedding=embedding,
    )
    db.add(report)
    db.flush()  # get report_id

    # Duplicate detection, search for nearby semantically-similar reports.
    match, score = find_duplicate_cluster(
        db, embedding, loc.geog, exclude_report_id=report.report_id
    )
    if match is not None:
        link_to_cluster(db, report, match)

    # Initial status history entry.
    db.add(StatusHistory(report_id=report.report_id, status="pending", status_note="Auto-created."))

    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportOut])
def list_my_reports(
    user: User = Depends(sync_current_user),
    db: Session = Depends(get_db),
) -> list[Report]:
    """Residents only see their own reports. Admins see everything."""
    stmt = select(Report).order_by(Report.created_at.desc())
    if user.role != "admin":
        stmt = stmt.where(Report.user_id == user.user_id)
    return list(db.scalars(stmt).all())


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    user: User = Depends(sync_current_user),
    db: Session = Depends(get_db),
) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")
    # Residents can only fetch their own; admins can fetch any.
    if user.role != "admin" and report.user_id != user.user_id:
        raise HTTPException(404, "Report not found.")
    return report



def require_admin(user: User = Depends(sync_current_user)) -> User:
    """Dependency that 403s non-admins."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return user


@router.patch("/{report_id}/status", response_model=ReportOut)
def update_status(
    report_id: int,
    payload: ReportStatusUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")

    # Skip no-op updates (admin clicked Save without changing anything).
    if report.current_status == payload.status and not payload.status_note:
        return report

    report.current_status = payload.status
    db.add(StatusHistory(
        report_id=report.report_id,
        status=payload.status,
        status_note=payload.status_note,
    ))
    db.commit()
    db.refresh(report)

    # Broadcasting the change so any logged-in resident gets the update without a manual refresh.
    from app.api.ws import broadcast_status_change
    import asyncio
    asyncio.create_task(broadcast_status_change(report))

    return report