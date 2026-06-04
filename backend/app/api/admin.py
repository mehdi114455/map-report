"""
Admin-only endpoints for the System Dashboard.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Float
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_X, ST_Y, ST_Centroid, ST_Collect
from geoalchemy2 import Geometry

from app.api.reports import require_admin
from app.db.session import get_db
from app.db.models import Report, DuplicateCluster, Location, User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def system_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Top-of-dashboard counters."""
    total = db.scalar(select(func.count()).select_from(Report))
    open_count = db.scalar(
        select(func.count()).select_from(Report)
        .where(Report.current_status.in_(["pending", "reviewing", "in_progress"]))
    )
    resolved = db.scalar(
        select(func.count()).select_from(Report)
        .where(Report.current_status == "resolved")
    )
    clusters = db.scalar(select(func.count()).select_from(DuplicateCluster))

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_count = db.scalar(
        select(func.count()).select_from(Report)
        .where(Report.created_at >= week_ago)
    )

    return {
        "total": total or 0,
        "open": open_count or 0,
        "resolved": resolved or 0,
        "clusters": clusters or 0,
        "this_week": week_count or 0,
    }


@router.get("/hotspots")
def hotspots(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Returns clustered report hotspots for the dashboard map.
    """
    # JOIN clusters -> reports -> locations, group by cluster, compute centroid.
    stmt = (
        select(
            DuplicateCluster.cluster_id,
            DuplicateCluster.repeated_count,
            DuplicateCluster.cluster_status,
            func.avg(Location.latitude).label("lat"),
            func.avg(Location.longitude).label("lng"),
        )
        .join(Report, Report.cluster_id == DuplicateCluster.cluster_id)
        .join(Location, Report.location_id == Location.location_id)
        .group_by(
            DuplicateCluster.cluster_id,
            DuplicateCluster.repeated_count,
            DuplicateCluster.cluster_status,
        )
    )
    rows = db.execute(stmt).all()
    return [
        {
            "cluster_id": r.cluster_id,
            "repeated_count": r.repeated_count,
            "cluster_status": r.cluster_status,
            "latitude": float(r.lat),
            "longitude": float(r.lng),
        }
        for r in rows
    ]


@router.get("/urgent")
def urgent_reports(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 10,
) -> list[dict]:
    """
    Reports that need admin attention, grouped by cluster. Each cluster is
    represented once; standalone reports appear as-is. Sorted by repeated_count
    (highest first), then recency.
    """
    stmt = (
        select(Report, DuplicateCluster.repeated_count)
        .outerjoin(DuplicateCluster, Report.cluster_id == DuplicateCluster.cluster_id)
        .where(Report.current_status.in_(["pending", "reviewing"]))
        .order_by(
            func.coalesce(DuplicateCluster.repeated_count, 1).desc(),
            Report.created_at.desc(),
        )
    )
    rows = db.execute(stmt).all()

    seen_clusters: set[int] = set()
    out: list[dict] = []
    for r in rows:
        rep = r.Report
        if rep.cluster_id is not None:
            if rep.cluster_id in seen_clusters:
                continue
            seen_clusters.add(rep.cluster_id)
        out.append({
            "report_id": rep.report_id,
            "cluster_id": rep.cluster_id,
            "title": rep.title or rep.description[:80],
            "description": rep.description,
            "category_id": rep.category_id,
            "category_name": rep.category.category_name,
            "current_status": rep.current_status,
            "repeated_count": r.repeated_count or 1,
            "image_url": rep.image_url,
            "city": rep.location.city,
            "latitude": rep.location.latitude,
            "longitude": rep.location.longitude,
            "created_at": rep.created_at.isoformat(),
        })
        if len(out) >= limit:
            break
    return out