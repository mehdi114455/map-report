from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.session import get_db
from app.db.models import User


def sync_current_user(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    - First call per user inserts a row with role from the Firebase custom claim.
    - Subsequent calls update the role if the Firebase claim has changed.
    """
    claim_role = claims.get("role", "resident")
    user = db.get(User, claims["uid"])

    if user is None:
        user = User(
            user_id=claims["uid"],
            email=claims["email"],
            role=claim_role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.role != claim_role:  # Firebase is the source of truth for role.
        user.role = claim_role
        db.commit()
        db.refresh(user)

    return user