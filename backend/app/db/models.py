from datetime import datetime
from typing import Optional, List
from sqlalchemy import (String, Integer, Text, DateTime, ForeignKey, Index, func, CheckConstraint,)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography
from app.db.base import Base


# ---------- User ----------
class User(Base):
    __tablename__ = "users"

    # Firebase UID is our primary key — keeps the auth and DB layers in sync.
    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="resident")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("role IN ('resident', 'admin')", name="users_role_check"),
    )

    reports: Mapped[List["Report"]] = relationship(back_populates="user")


# ---------- Category ----------
class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True)
    category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    reports: Mapped[List["Report"]] = relationship(back_populates="category")


# ---------- Location ----------
class Location(Base):
    __tablename__ = "locations"

    location_id: Mapped[int] = mapped_column(primary_key=True)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(120))
    # PostGIS Geography(Point, 4326). Lets us do ST_DWithin / ST_Distance in meters.
    geog: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    reports: Mapped[List["Report"]] = relationship(back_populates="location")


# ---------- DuplicateCluster ----------
class DuplicateCluster(Base):
    __tablename__ = "duplicate_clusters"

    cluster_id: Mapped[int] = mapped_column(primary_key=True)
    # FK back to Report — circular relationship, handled with use_alter so Alembic
    # can create both tables and then add this FK as a separate ALTER.
    representative_report_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("reports.report_id", use_alter=True, name="fk_cluster_rep_report"),
        nullable=True,
    )
    cluster_status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    repeated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    reports: Mapped[List["Report"]] = relationship(
        back_populates="cluster", foreign_keys="Report.cluster_id"
    )


# ---------- Report ----------
class Report(Base):
    __tablename__ = "reports"

    report_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.category_id"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.location_id"), nullable=False)
    cluster_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("duplicate_clusters.cluster_id"), nullable=True, index=True
    )

    title: Mapped[Optional[str]] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority_level: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    current_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    # Image URL returned by Firebase Storage (added in Part 7; nullable for now).
    image_url: Mapped[Optional[str]] = mapped_column(String(1024))

    # Confidence of the AI category prediction (0.0–1.0). Surfaced to admins
    # so they can prioritize reviewing low-confidence classifications.
    ai_confidence: Mapped[Optional[float]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "priority_level IN ('low', 'normal', 'high', 'critical')",
            name="reports_priority_check",
        ),
        CheckConstraint(
            "current_status IN ('pending', 'reviewing', 'in_progress', 'resolved', 'rejected')",
            name="reports_status_check",
        ),
    )

    user: Mapped["User"] = relationship(back_populates="reports")
    category: Mapped["Category"] = relationship(back_populates="reports")
    location: Mapped["Location"] = relationship(back_populates="reports")
    cluster: Mapped[Optional["DuplicateCluster"]] = relationship(
        back_populates="reports", foreign_keys=[cluster_id]
    )
    status_history: Mapped[List["StatusHistory"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )


# ---------- StatusHistory ----------
class StatusHistory(Base):
    __tablename__ = "status_history"

    status_id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.report_id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    status_note: Mapped[Optional[str]] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    report: Mapped["Report"] = relationship(back_populates="status_history")


# GiST index for fast geospatial queries (hotspots, duplicate detection by distance).
Index("ix_locations_geog", Location.__table__.c.geog, postgresql_using="gist")