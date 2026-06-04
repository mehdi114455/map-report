from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.api.deps import sync_current_user
from app.db.session import get_db
from app.db.models import User, Report, Location, StatusHistory, DuplicateCluster
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
    group_by_cluster: bool = True,
    category_id: int | None = None,
) -> list[Report]:
    """
    Residents see their own reports + reports in clusters.
    Admins see everything.
    """
    stmt = select(Report).order_by(Report.created_at.desc())

    if user.role != "admin":
        # Residents see:
        #   (a) reports they submitted themselves, plus
        #   (b) any cluster they have at least one report in

        own_clusters = select(Report.cluster_id).where(
            Report.user_id == user.user_id, Report.cluster_id.isnot(None)
        )
        stmt = stmt.where(
            (Report.user_id == user.user_id) | (Report.cluster_id.in_(own_clusters))
        )

    if category_id is not None:
        stmt = stmt.where(Report.category_id == category_id)

    rows = list(db.scalars(stmt).all())

    if not group_by_cluster:
        return rows

    # Collapse: keep standalone reports, plus one representative per cluster.
    seen_clusters: set[int] = set()
    out: list[Report] = []
    for r in rows:
        if r.cluster_id is None:
            out.append(r)
            continue
        if r.cluster_id in seen_clusters:
            continue
        seen_clusters.add(r.cluster_id)
        rep = next((x for x in rows if x.cluster_id == r.cluster_id
                    and x.cluster and x.report_id == x.cluster.representative_report_id), r)
        out.append(rep)
    return out


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

@router.get("/{report_id}/detail")
def get_report_detail(
    report_id: int,
    user: User = Depends(sync_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Full detail view for a report. If the report is part of a cluster, also
    returns every report in that cluster.
    """
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")


    if user.role != "admin":
        if report.user_id != user.user_id:
            if report.cluster_id is None:
                raise HTTPException(404, "Report not found.")
            # Check if user has any report in this cluster.
            ok = db.scalar(
                select(func.count()).select_from(Report).where(
                    Report.cluster_id == report.cluster_id,
                    Report.user_id == user.user_id,
                )
            )
            if not ok:
                raise HTTPException(404, "Report not found.")

    cluster_members: list[Report] = []
    if report.cluster_id is not None:
        cluster_members = list(db.scalars(
            select(Report).where(Report.cluster_id == report.cluster_id)
            .order_by(Report.created_at.asc())
        ).all())


    history = db.scalars(
        select(StatusHistory).where(StatusHistory.report_id == report.report_id)
        .order_by(StatusHistory.updated_at.desc())
    ).all()

    def serialize_report(r: Report) -> dict:
        return {
            "report_id": r.report_id,
            "user_id": r.user_id,
            "title": r.title,
            "description": r.description,
            "current_status": r.current_status,
            "priority_level": r.priority_level,
            "image_url": r.image_url,
            "ai_confidence": r.ai_confidence,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
            "category": {
                "category_id": r.category.category_id,
                "category_name": r.category.category_name,
            },
            "location": {
                "latitude": r.location.latitude,
                "longitude": r.location.longitude,
                "city": r.location.city,
            },
        }

    return {
        "report": serialize_report(report),
        "cluster": (
            {
                "cluster_id": report.cluster.cluster_id,
                "repeated_count": report.cluster.repeated_count,
                "cluster_status": report.cluster.cluster_status,
                "members": [serialize_report(m) for m in cluster_members],
            } if report.cluster else None
        ),
        "history": [
            {
                "status": h.status,
                "status_note": h.status_note,
                "updated_at": h.updated_at.isoformat(),
            } for h in history
        ],
    }



def require_admin(user: User = Depends(sync_current_user)) -> User:
    """Dependency that 403s non-admins."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return user


@router.patch("/{report_id}/status", response_model=list[ReportOut])
def update_status(
    report_id: int,
    payload: ReportStatusUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Report]:
    """
    Update a report's status. If the report belongs to a cluster, ALL reports
    in that cluster get the same status.

    Returns the list of updated reports.
    """
    target = db.get(Report, report_id)
    if target is None:
        raise HTTPException(404, "Report not found.")

    # Find all reports in the same cluster (just the target itself if no cluster).
    if target.cluster_id is not None:
        reports = db.scalars(
            select(Report).where(Report.cluster_id == target.cluster_id)
        ).all()
    else:
        reports = [target]

    # Skip no-op (every report already at the desired status, no note added).
    if all(r.current_status == payload.status for r in reports) and not payload.status_note:
        return reports

    note = payload.status_note
    if target.cluster_id is not None and len(reports) > 1 and not note:
        note = f"Cluster status update — {len(reports)} reports affected."

    for r in reports:
        r.current_status = payload.status
        db.add(StatusHistory(
            report_id=r.report_id,
            status=payload.status,
            status_note=note,
        ))

    # If the cluster is being resolved, close the cluster too.
    if target.cluster_id is not None and payload.status == "resolved":
        cluster = db.get(DuplicateCluster, target.cluster_id)
        if cluster:
            cluster.cluster_status = "resolved"

    db.commit()
    for r in reports:
        db.refresh(r)

    # Broadcast one event per affected report. Each event reaches both the
    # report's owner and all admins.
    from app.api.ws import broadcast_status_change
    import asyncio
    for r in reports:
        asyncio.create_task(broadcast_status_change(r))

    return reports