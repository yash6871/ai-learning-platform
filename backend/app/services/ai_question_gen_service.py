from uuid import UUID

from sqlalchemy.orm import Session

from app.models.shared_refs import AIUsage
from app.repositories.question_repository import QuestionRepository
from app.schemas.question_bank import AIQuestionGenerateRequest, AIQuestionGenerateResponse, QuestionOut
from app.services.ai_provider import get_ai_client

PROMPT_TEMPLATE = """You are an assessment question generator for a technical training platform.
Generate {count} {difficulty} difficulty "{type}" type questions on the topic: "{topic}".

Return STRICT JSON with this exact shape (a JSON array), no extra text:
[
  {{
    "questionText": "...",
    "marks": 1,
    "data": {{ ... type-specific fields ... }},
    "starterCode": "... (only if type is coding, else null)",
    "language": "python (only if type is coding, else null)",
    "testCases": [ {{"input": "...", "expectedOutput": "...", "isHidden": false}} ]  // only if type is coding
  }}
]

Rules per type:
- mcq: data must be {{"options": ["<option 1 text>", "<option 2 text>", "<option 3 text>", "<option 4 text>"], "correctOption": "<must be an EXACT copy of one of the strings in options>"}}. Do NOT use letters like "A"/"B" for correctOption — copy the full option text.
- sql: data must be {{"schema": "...", "expectedQuery": "..."}}
- descriptive: data must be {{"guidelines": "key points expected in the answer"}}
- coding: The code is executed as a full Python script: it is fed the testCase "input" on stdin, and its printed stdout is compared verbatim against "expectedOutput". Follow ALL of these or the question is unsolvable:
  1. questionText MUST explicitly state the exact input format (what to read from stdin, e.g. "Read a single line string") and the exact output format (what to print, e.g. "Print True or False").
  2. starterCode MUST already include the boilerplate that reads from stdin (e.g. `s = input()`) and prints the result (e.g. `print(is_palindrome(s))`) — the student only fills in the function body between a `# TODO: implement` marker. Never hand back a starterCode that only defines a function signature with no I/O wrapper.
  3. Every testCase's "expectedOutput" MUST be the exact stdout the reference solution would print (correct capitalization, e.g. Python's bare `print(True)` prints "True", not "true" or "Yes") for the given "input".
  4. include starterCode, language, and 3-5 testCases (at least 1 not hidden).
"""


class AIQuestionGenService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = QuestionRepository(db)
        self.client = get_ai_client()

    @staticmethod
    def _normalize_mcq(item: dict) -> None:
        """If the model returned a letter label (A/B/C/D) for correctOption instead of
        the literal option text, resolve it against the options list in place."""
        data = item.get("data") or {}
        options = data.get("options")
        correct = data.get("correctOption")
        if not isinstance(options, list) or correct in options:
            return
        if isinstance(correct, str) and len(correct.strip()) == 1:
            idx = "abcd".find(correct.strip().lower())
            if 0 <= idx < len(options):
                data["correctOption"] = options[idx]

    @staticmethod
    def _is_valid_item(item: dict, type_: str) -> bool:
        if not item.get("questionText"):
            return False
        data = item.get("data") or {}
        if type_ == "mcq":
            options = data.get("options")
            correct = data.get("correctOption")
            return (
                isinstance(options, list) and len(options) >= 2
                and all(isinstance(o, str) and o.strip() for o in options)
                and correct in options
            )
        if type_ == "sql":
            return bool(data.get("expectedQuery"))
        if type_ == "descriptive":
            return bool(data.get("guidelines"))
        if type_ == "coding":
            return bool(item.get("testCases"))
        return True

    def generate(self, payload: AIQuestionGenerateRequest, requested_by: UUID) -> AIQuestionGenerateResponse:
        prompt = PROMPT_TEMPLATE.format(
            count=payload.count, difficulty=payload.difficulty,
            type=payload.type, topic=payload.topic,
        )
        items, tokens_used = self.client.generate_json(prompt)

        if payload.type == "mcq":
            for item in items:
                self._normalize_mcq(item)

        valid_items = [item for item in items if self._is_valid_item(item, payload.type)]

        generated: list[QuestionOut] = []
        for item in valid_items:
            if payload.saveToBank:
                q = self.repo.create(
                    question_text=item["questionText"], type_=payload.type,
                    marks=item.get("marks", 1), created_by=requested_by,
                    tags=[payload.topic, "ai-generated"], data=item.get("data"),
                )
                if payload.type == "coding":
                    self.repo.attach_coding_details(
                        question_id=q.id, starter_code=item.get("starterCode"),
                        language=item.get("language", "python"),
                        test_cases=item.get("testCases", []),
                    )
                generated.append(QuestionOut(
                    id=q.id, questionText=q.question_text, type=q.type, marks=q.marks,
                    tags=q.tags, data=q.data, createdBy=q.created_by, createdAt=q.created_at,
                ))
            else:
                # not persisted - return as preview only, no DB id
                generated.append(QuestionOut(
                    id=None, questionText=item["questionText"], type=payload.type,
                    marks=item.get("marks", 1), tags=[payload.topic], data=item.get("data"),
                    createdBy=requested_by, createdAt=None,
                ))

        self.db.add(AIUsage(
            user_id=requested_by, module="faculty_ai_question_generation",
            tokens_used=tokens_used, cost=0,
        ))
        self.db.commit()

        return AIQuestionGenerateResponse(
            generated=generated, tokensUsed=tokens_used,
            skippedCount=len(items) - len(valid_items),
        )
