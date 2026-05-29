from pydantic import BaseModel, Field, ConfigDict


class LocationIn(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    city: str | None = Field(None, max_length=120)


class LocationOut(BaseModel):
    location_id: int
    latitude: float
    longitude: float
    city: str | None = None

    model_config = ConfigDict(from_attributes=True)