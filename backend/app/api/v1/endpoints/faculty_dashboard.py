from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import faculty_or_trainer, CurrentUser
from app.db.session import get_db
from app.schemas.batch import BatchCreate, BatchOut, StudentInBatch, AddStudentsToBatch
from app.services.batch_service import BatchService

router = APIRouter(prefix="/faculty", tags=["Faculty Dashboard"])


@router.post("/batches", response_model=BatchOut, summary="Create a new batch (FAC-001)")
def create_batch(
    payload: BatchCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    return BatchService(db).create_batch(payload)


@router.get("/batches", response_model=List[BatchOut], summary="List batches assigned to me (FAC-001)")
def my_batches(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    is_admin = current_user.role in ("admin", "super_admin")
    return BatchService(db).list_my_batches(current_user.id, is_admin=is_admin)


@router.post("/batches/{batch_id}/students", summary="Add students to a batch (FAC-001)")
def add_students(
    batch_id: UUID,
    payload: AddStudentsToBatch,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    BatchService(db).add_students(batch_id, payload.studentIds)
    return {"message": "Students added to batch"}


@router.get("/batches/{batch_id}/students", response_model=List[StudentInBatch],
            summary="List students in a batch (FAC-001)")
def batch_students(
    batch_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    return BatchService(db).list_students(batch_id)
