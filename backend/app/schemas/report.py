from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.schemas.location import LocationIn, LocationOut
from app.schemas.category import CategoryOut


class ReportCreate(BaseModel):
    description: str = Field(..., min_length=5, max_length=2000)
    location: LocationIn
    title: str | None = Field(None, max_length=200)
    image_url: str | None = Field(None, max_length=1024)

    @field_validator("image_url")
    @classmethod
    def _check_image_host(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        # Only accept Firebase Storage download URLs from our bucket.
        if not v.startswith("https://firebasestorage.googleapis.com/"):
            raise ValueError("image_url must be a Firebase Storage download URL.")
        return v


class ClusterOut(BaseModel):
    cluster_id: int
    repeated_count: int
    cluster_status: str

    model_config = ConfigDict(from_attributes=True)


class ReportOut(BaseModel):
    report_id: int
    user_id: str
    title: str | None = None
    description: str
    priority_level: str
    current_status: str
    image_url: str | None = None
    ai_confidence: float | None = None
    cluster: ClusterOut | None = None
    created_at: datetime
    updated_at: datetime
    category: CategoryOut
    location: LocationOut

    model_config = ConfigDict(from_attributes=True)