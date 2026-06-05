"""
Lightweight in-process WebSocket broadcaster.
"""
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from app.core.firebase import verify_id_token
from app.db.models import Report

router = APIRouter()


class ConnectionManager:
    """Tracks active connections keyed by user_id."""
    def __init__(self) -> None:
        self._conns: dict[str, Set[WebSocket]] = {}
        self._admin_conns: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket, user_id: str, role: str) -> None:
        await ws.accept()
        self._conns.setdefault(user_id, set()).add(ws)
        if role == "admin":
            self._admin_conns.add(ws)

    def disconnect(self, ws: WebSocket, user_id: str) -> None:
        if user_id in self._conns:
            self._conns[user_id].discard(ws)
            if not self._conns[user_id]:
                del self._conns[user_id]
        self._admin_conns.discard(ws)

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        dead = []
        for ws in self._conns.get(user_id, set()):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._conns[user_id].discard(ws)

    async def send_to_admins(self, payload: dict) -> None:
        dead = []
        for ws in self._admin_conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._admin_conns.discard(ws)


manager = ConnectionManager()


@router.websocket("/ws/reports")
async def reports_ws(ws: WebSocket):
    # The browser passes ?token=<idToken> in the URL
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        claims = verify_id_token(token)
    except Exception:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = claims["uid"]
    role = claims.get("role", "resident")
    await manager.connect(ws, user_id, role)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws, user_id)


async def broadcast_status_change(
    report_id: int,
    current_status: str,
    updated_at: str,
    user_id: str,
) -> None:
    """Send a status change event to the report's owner and all admins."""
    payload = {
        "type": "status_change",
        "report_id": report_id,
        "current_status": current_status,
        "updated_at": updated_at,
    }
    await manager.send_to_user(user_id, payload)
    await manager.send_to_admins(payload)