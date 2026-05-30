"""
Promote (or demote) a Firebase user by email.

Usage:
    python -m scripts.promote_to_admin user@example.com admin
    python -m scripts.promote_to_admin user@example.com resident
"""
import sys
from app.core.firebase import init_firebase
from firebase_admin import auth as fb_auth


def set_role(email: str, role: str) -> None:
    if role not in {"admin", "resident"}:
        raise SystemExit(f"Invalid role '{role}'. Must be 'admin' or 'resident'.")

    init_firebase()
    user = fb_auth.get_user_by_email(email)

    # Preserve any existing claims, just update role.
    existing = user.custom_claims or {}
    existing["role"] = role
    fb_auth.set_custom_user_claims(user.uid, existing)

    print(f"✓ Set role={role} on {email} (uid={user.uid}).")
    print("  The user must sign out and back in for the new role.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    set_role(sys.argv[1], sys.argv[2])