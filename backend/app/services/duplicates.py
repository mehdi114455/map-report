"""
Duplicate detection: combines geographic proximity (PostGIS) with
semantic similarity (sentence embeddings).

1. Use ST_DWithin on the geography column to find reports within RADIUS_METERS
   of the new report's location.
2. For each candidate, compute cosine similarity between embeddings.
3. If the best match clears SIMILARITY_THRESHOLD, link to that report's
   cluster (creating one if it doesn't have one yet).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_DWithin

from app.db.models import Report, DuplicateCluster, Location
from app.services.embedder import cosine_similarity
from app.db.models import Location


# Two reports must be within 100m AND ≥ 0.80 cosine similar to be merged.
# Admin can merge manually as well

RADIUS_METERS = 100
SIMILARITY_THRESHOLD = 0.80
RECENT_WINDOW_DAYS = 30   # So that reports don't merge against older reports


def find_duplicate_cluster(
    db: Session,
    new_embedding: list[float],
    geog,                   # GeoAlchemy2 WKBElement for the new location
    exclude_report_id: Optional[int] = None,
) -> tuple[Optional[Report], float]:
    """
    Return (best_matching_report, similarity_score) or (None, 0.0).

    The matched report is linked with the new report to via cluster.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_WINDOW_DAYS)

    stmt = (
        select(Report)
        .join(Location, Report.location_id == Location.location_id)
        .where(
            ST_DWithin(Location.geog, geog, RADIUS_METERS),
            Report.created_at >= cutoff,
            Report.description_embedding.isnot(None),
        )
    )
    if exclude_report_id is not None:
        stmt = stmt.where(Report.report_id != exclude_report_id)

    candidates = db.scalars(stmt).all()

    best_report: Optional[Report] = None
    best_score = 0.0
    for cand in candidates:
        score = cosine_similarity(new_embedding, cand.description_embedding)
        if score > best_score:
            best_score = score
            best_report = cand

    if best_score >= SIMILARITY_THRESHOLD:
        return best_report, best_score
    return None, best_score


def link_to_cluster(db: Session, new_report: Report, match: Report) -> DuplicateCluster:
    """
    Link new_report to the same cluster as match. Creates a cluster if match
    doesn't already belong to one. Increments repeated_count.
    """
    if match.cluster_id is not None:
        cluster = db.get(DuplicateCluster, match.cluster_id)
        cluster.repeated_count += 1
    else:
        cluster = DuplicateCluster(
            representative_report_id=match.report_id,
            cluster_status="open",
            repeated_count=2,   # match + new_report
        )
        db.add(cluster)
        db.flush()  # get cluster_id
        match.cluster_id = cluster.cluster_id

    new_report.cluster_id = cluster.cluster_id
    return cluster