"""Foundation module's user-management endpoints. `list_users` (ADM-001) and
`change_role` (ADM-005) overlap with the Admin Portal module's endpoints
(app.api.v1.endpoints.admin_platform, which owns GET/POST /admin/users and
PUT /admin/users/{id}/role) - that module's versions are canonical and are
mounted at /api/v1/admin. Only the two endpoints unique to this module
(revoke/restore access, sign-in log viewer) are kept here, mounted at
/api/v1/admin to extend the same namespace without path collisions.
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles, ADMIN_ROLES
from app.models.user import User
from app.services.admin_users_service import AdminService
from app.schemas.admin_users import UserListItem, RevokeAccessRequest, SignInLogOut, AssignBatchRequest

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Access & Sign-in Logs"])


@router.patch("/users/{user_id}/access", response_model=UserListItem)  # ADM-005 (revoke/restore access)
def set_access(
    user_id: uuid.UUID,
    payload: RevokeAccessRequest,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    user = AdminService(db).set_active_status(user_id, payload.isActive)
    return UserListItem(id=str(user.id), name=user.name, email=user.email, role=user.role, isActive=user.is_active, createdAt=user.created_at)


@router.post("/users/{user_id}/assign-batch", status_code=204)
def assign_batch(
    user_id: uuid.UUID,
    payload: AssignBatchRequest,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    """Enrols an already-registered student into a course+batch after the
    fact. Needed because students who sign up via the plain public
    /auth/register page (as opposed to an invite link) get no batch on
    creation, which makes them invisible to every batch-scoped view
    (Faculty Student Performance, batch rosters, attendance, etc)."""
    AdminService(db).assign_student_to_batch(user_id, payload.courseId, payload.batchId)


@router.get("/sign-in-logs")  # ADM-007
def sign_in_logs(
    skip: int = 0,
    limit: int = 50,
    user_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    items, total = AdminService(db).get_sign_in_logs(skip, limit, user_id)
    return {
        "total": total,
        "items": [
            SignInLogOut(
                id=str(l.id),
                userId=str(l.user_id),
                ipAddress=l.ip_address,
                userAgent=l.user_agent,
                status=l.status,
                createdAt=l.created_at,
            )
            for l in items
        ],
    }
