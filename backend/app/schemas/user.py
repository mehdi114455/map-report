from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str | None = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)