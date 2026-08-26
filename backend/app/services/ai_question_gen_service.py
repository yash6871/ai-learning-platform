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
- sql: Write in the exact LeetCode question style, matching this structure precisely. `questionText` must contain, in order, using literal newlines (as \\n in the JSON string):
  (1) A one-sentence problem description.
  (2) For each table involved, a schema block:
      "Table: <Name>\\n\\n+-------------+------+\\n| Column Name | Type |\\n+-------------+------+\\n| <col1>      | <type1> |\\n| <col2>      | <type2> |\\n+-------------+------+\\n\\n<one sentence on the primary key / what each row represents>"
      (pad the box-drawing characters so columns visually line up, like a real LeetCode schema box; use 2+ tables if the problem naturally needs a join).
  (3) "Write a solution to <restate the task in one sentence>."
  (4) "Example:\\nInput:\\n<Table name> table:\\n+----+--------+\\n| col | col |\\n+----+--------+\\n| ... sample rows ...\\n+----+--------+\\n\\nOutput:\\n+---------------+\\n| <ResultColumn> |\\n+---------------+\\n| ... expected rows ...\\n+---------------+"
  `data` must be {{"schemaSql": "<valid SQLite CREATE TABLE + INSERT statements that build the EXACT same example rows shown in questionText's Example section>", "schemaDisplay": "<the Table/columns box(es) from step 2, for the UI to render separately>"}}.
  `testCases`: exactly 2 items, "input" left as an empty string. "expectedOutput" is NOT shown to students and is only used for automated grading, so keep it simple regardless of how fancy questionText is: one row per line, values separated by " | ", header row first (e.g. "salary\\n200" or "name | salary | department\\nAmit | 70000 | IT").
  Keep schemaSql itself simple and syntactically correct SQLite — that part is executed for real, so correctness there matters far more than in the display text.
- descriptive: data must be {{"guidelines": "key points expected in the answer"}}
- coding: include starterCode, language, and 3-5 testCases (at least 1 not hidden)
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
            return bool(data.get("schemaSql")) and bool(item.get("testCases"))
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

        if not isinstance(items, list):
            # The AI didn't return valid JSON for this prompt (this
            # happens more often on complex prompts, like SQL questions
            # with a schema + example tables) — fail cleanly with a
            # retryable message instead of crashing on the next line.
            from fastapi import HTTPException
            raise HTTPException(
                status_code=502,
                detail="The AI didn't return a valid set of questions this time. Please try generating again.",
            )

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
                if payload.type in ("coding", "sql"):
                    self.repo.attach_coding_details(
                        question_id=q.id, starter_code=item.get("starterCode"),
                        language=item.get("language", "python") if payload.type == "coding" else "sql",
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
