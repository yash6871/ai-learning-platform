from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    isActive: bool
    createdAt: datetime


class ChangeRoleRequest(BaseModel):
    role: str


class RevokeAccessRequest(BaseModel):
    isActive: bool


class AssignBatchRequest(BaseModel):
    courseId: str  # UUID, course code, or course name — resolved server-side
    batchId: str   # UUID or batch name — resolved server-side


class SignInLogOut(BaseModel):
    id: str
    userId: str
    userEmail: Optional[str] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    status: str
    createdAt: datetime
