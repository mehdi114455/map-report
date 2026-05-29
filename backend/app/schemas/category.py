from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    category_id: int
    category_name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)