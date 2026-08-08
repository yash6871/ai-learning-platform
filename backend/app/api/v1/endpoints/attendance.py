from datetime import date
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import faculty_or_trainer, CurrentUser
from app.db.session import get_db
from app.schemas.attendance import AttendanceMarkRequest, AttendanceOut, AttendanceFaceRecognitionHook
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("", response_model=List[AttendanceOut], summary="Mark/update attendance for a batch (FAC-002)")
def mark_attendance(
    payload: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    return AttendanceService(db).mark_attendance(payload, marked_by=current_user.id)


@router.get("/batch/{batch_id}", response_model=List[AttendanceOut],
            summary="Review attendance for a batch on a date (FAC-002)")
def get_batch_attendance(
    batch_id: UUID,
    for_date: date,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    return AttendanceService(db).get_batch_attendance(batch_id, for_date)


@router.get("/student/{student_id}", response_model=List[AttendanceOut],
            summary="Attendance history for a student (FAC-002)")
def get_student_attendance(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    return AttendanceService(db).get_student_history(student_id)


@router.post("/face-recognition-hook", summary="Placeholder hook to trigger face-recognition attendance (FAC-002)")
async def face_recognition_hook(
    payload: AttendanceFaceRecognitionHook,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(faculty_or_trainer),
):
    """
    Forwards to the separately-built face recognition service (see AIRA
    project) and returns whatever it detects. Actual face-matching model is
    NOT implemented in this phase - this is a structural placeholder only.
    """
    return await AttendanceService(db).trigger_face_recognition(payload)
