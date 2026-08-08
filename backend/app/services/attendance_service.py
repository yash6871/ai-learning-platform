from datetime import date
from typing import List
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.attendance_repository import AttendanceRepository
from app.schemas.attendance import AttendanceMarkRequest, AttendanceOut, AttendanceFaceRecognitionHook


class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AttendanceRepository(db)

    def mark_attendance(self, payload: AttendanceMarkRequest, marked_by: UUID) -> List[AttendanceOut]:
        results = []
        for entry in payload.entries:
            record = self.repo.upsert_entry(
                batch_id=payload.batchId, student_id=entry.studentId,
                entry_date=payload.date, status=entry.status,
                marked_by=marked_by, method=payload.method,
            )
            results.append(self._to_out(record))
        return results

    def get_batch_attendance(self, batch_id: UUID, entry_date: date) -> List[AttendanceOut]:
        records = self.repo.list_for_batch_date(batch_id, entry_date)
        return [self._to_out(r) for r in records]

    def get_student_history(self, student_id: UUID) -> List[AttendanceOut]:
        records = self.repo.list_for_student(student_id)
        return [self._to_out(r) for r in records]

    async def trigger_face_recognition(self, payload: AttendanceFaceRecognitionHook) -> dict:
        """
        Placeholder hook only. The actual face-recognition model/service is
        being built in a separate phase (AIRA). This just forwards the
        request and expects back a list of {studentId, status} entries which
        the caller can then pass into mark_attendance().
        """
        if not settings.FACE_RECOGNITION_SERVICE_URL:
            return {"status": "not_configured", "detected": []}

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.FACE_RECOGNITION_SERVICE_URL}/detect-attendance",
                json={
                    "batchId": str(payload.batchId),
                    "date": payload.date.isoformat(),
                    "imageUrl": payload.imageUrl,
                },
            )
            resp.raise_for_status()
            return resp.json()

    def _to_out(self, record) -> AttendanceOut:
        return AttendanceOut(
            id=record.id, batchId=record.batch_id, studentId=record.student_id,
            date=record.date, status=record.status, method=record.method,
            markedBy=record.marked_by, createdAt=record.created_at,
        )
