from uuid import UUID
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.batch_repository import BatchRepository
from app.models.shared_refs import User
from app.models.course import Course
from app.schemas.batch import BatchCreate, BatchOut, StudentInBatch


class BatchService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BatchRepository(db)

    def _resolve_course_id(self, course_name):
        if not course_name:
            return None
        course = (
            self.db.query(Course)
            .filter((Course.name == course_name) | (Course.code == course_name))
            .first()
        )
        return course.id if course else None

    def create_batch(self, payload: BatchCreate) -> BatchOut:
        # batches.course_id is NOT NULL. An unresolvable course name used to
        # pass None straight through and surface as an IntegrityError 500.
        course_id = self._resolve_course_id(payload.course)
        if course_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(f"Unknown course '{payload.course}'" if payload.course
                        else "A course is required to create a batch"),
            )
        batch = self.repo.create(
            name=payload.name, course_id=course_id,
            faculty_id=payload.facultyId, trainer_id=payload.trainerId,
            start_date=payload.startDate, end_date=payload.endDate,
        )
        return self._to_out(batch)

    def list_my_batches(self, faculty_id: UUID, is_admin: bool = False) -> List[BatchOut]:
        batches = self.repo.list_for_faculty(faculty_id, is_admin=is_admin)
        return [self._to_out(b) for b in batches]

    def add_students(self, batch_id: UUID, student_ids: List[UUID]) -> None:
        self.repo.add_students(batch_id, student_ids)

    def list_students(self, batch_id: UUID) -> List[StudentInBatch]:
        student_ids = self.repo.list_students(batch_id)
        if not student_ids:
            return []
        users = self.db.query(User).filter(User.id.in_(student_ids)).all()
        return [StudentInBatch(id=u.id, name=u.name, email=u.email) for u in users]

    def _to_out(self, batch) -> BatchOut:
        course_name = batch.course.name if batch.course else None
        return BatchOut(
            id=batch.id, name=batch.name, course=course_name,
            facultyId=batch.faculty_id, trainerId=batch.trainer_id,
            startDate=batch.start_date, endDate=batch.end_date,
            createdAt=batch.created_at, studentCount=self.repo.student_count(batch.id),
        )
