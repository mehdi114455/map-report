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
from sqlalchemy import select, func, cast
from sqlalchemy.orm import Session
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin, ST_SetSRID, ST_MakePoint

from app.db.models import Report, DuplicateCluster, Location
from app.services.embedder import cosine_similarity

# Two reports must be within 100m AND ≥ 0.65 cosine similar to be merged.
RADIUS_METERS = 100
SIMILARITY_THRESHOLD = 0.45
RECENT_WINDOW_DAYS = 30


def find_duplicate_cluster(
    db: Session,
    new_embedding: list[float],
    latitude: float,
    longitude: float,
    exclude_report_id: Optional[int] = None,
) -> tuple[Optional[Report], float]:
    """
    Return (best_matching_report, similarity_score) or (None, 0.0).
    Builds the comparison point from raw lat/lng so PostGIS receives a clean
    geography value (avoids issues with passing freshly-flushed WKBElements).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_WINDOW_DAYS)

    # Build a Geography point inline in SQL — most reliable way to feed
    # ST_DWithin a fresh value without ORM-side quirks.
    new_point = cast(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
        Geography(geometry_type="POINT", srid=4326),
    )

    stmt = (
        select(Report)
        .join(Location, Report.location_id == Location.location_id)
        .where(
            ST_DWithin(Location.geog, new_point, RADIUS_METERS),
            Report.created_at >= cutoff,
            Report.description_embedding.isnot(None),
        )
    )
    if exclude_report_id is not None:
        stmt = stmt.where(Report.report_id != exclude_report_id)

    candidates = db.scalars(stmt).all()
    print(f"[DUPES] {len(candidates)} candidate(s) within {RADIUS_METERS}m (excluding #{exclude_report_id})")

    best_report: Optional[Report] = None
    best_score = 0.0
    for cand in candidates:
        score = cosine_similarity(new_embedding, cand.description_embedding)
        print(f"[DUPES]   #{cand.report_id}: similarity = {score:.3f}")
        if score > best_score:
            best_score = score
            best_report = cand

    print(f"[DUPES] best={best_score:.3f} threshold={SIMILARITY_THRESHOLD}")
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
            repeated_count=2,
        )
        db.add(cluster)
        db.flush()
        match.cluster_id = cluster.cluster_id

    new_report.cluster_id = cluster.cluster_id
    return cluster