from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.session import get_db
from app.db.models import User


def sync_current_user(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),) -> User:
    user = db.get(User, claims["uid"])
    if user is None:
        user = User(
            user_id=claims["uid"],
            email=claims["email"],
            role=claims.get("role", "resident"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user