from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.location import LocationIn, LocationOut
from app.schemas.category import CategoryOut


class ReportCreate(BaseModel):
    # Description: required, 5–2000 chars. Blocks single-character spam.
    description: str = Field(..., min_length=5, max_length=2000)
    location: LocationIn
    title: str | None = Field(None, max_length=200)
    image_url: str | None = Field(None, max_length=1024)


class ReportOut(BaseModel):
    report_id: int
    user_id: str
    title: str | None = None
    description: str
    priority_level: str
    current_status: str
    image_url: str | None = None
    ai_confidence: float | None = None
    created_at: datetime
    updated_at: datetime
    category: CategoryOut
    location: LocationOut

    model_config = ConfigDict(from_attributes=True)