PROMPT_VERSION = "v2"

BLOOMS_LEVELS = frozenset({"remember", "understand", "apply", "analyze", "evaluate", "create"})


def _blooms_instruction(levels: list[str] | None) -> str:
    if not levels:
        return ""
    return f"Bloom's Taxonomy levels to target: {', '.join(levels)}.\n"


def _format_syllabus_context(entries: list) -> str:
    if not entries:
        return ""
    lines = []
    for e in entries:
        parts = [e.subject, e.topic]
        if e.chapter:
            parts.append(f"Chapter: {e.chapter}")
        if e.unit:
            parts.append(f"Unit: {e.unit}")
        if e.learning_outcomes:
            parts.append(f"Outcomes: {e.learning_outcomes}")
        lines.append(" - " + " | ".join(parts))
    return "Base these questions on the following syllabus entries:\n" + "\n".join(lines) + "\n\n"


SYSTEM_GENERATE = "You are an expert exam question writer. Return only valid JSON."


def prompt_generate_topic(
    subject: str,
    topic: str,
    difficulties: list[str],
    types: list[str],
    count: int,
    marks: int,
    blooms_levels: list[str] | None = None,
    syllabus_context: str = "",
    prompt_version: str = PROMPT_VERSION,
) -> str:
    diffs = ", ".join(difficulties)
    types_str = ", ".join(types)
    blooms = _blooms_instruction(blooms_levels)
    return (
        f"{syllabus_context}"
        f"Generate {count} questions about {topic} in {subject}.\n"
        f"Difficulties to include: {diffs}.\n"
        f"Question types to include: {types_str}.\n"
        f"Marks per question: {marks}.\n"
        f"{blooms}"
        "Return ONLY a JSON object with a \"questions\" key containing an array of objects with these fields:\n"
        f"- subject: \"{subject}\"\n"
        f"- topic: \"{topic}\"\n"
        f"- difficulty: one of {diffs}\n"
        f"- question_type: one of {types_str}\n"
        "- question_text: the question\n"
        "- options: array of strings (only for mcq, at least 2, null otherwise)\n"
        "- correct_answer: the correct answer\n"
        f"- marks: {marks}\n"
        "- blooms_level: one of remember, understand, apply, analyze, evaluate, create\n"
        "- explanation: brief explanation of the answer\n"
        "Valid JSON only, no markdown, no code fences."
    )


def prompt_generate_equivalent(
    question_text: str,
    subject: str,
    topic: str,
    difficulty: str,
    question_type: str,
    marks: int,
    options_str: str,
    correct_answer: str,
    explanation: str | None,
    count: int = 1,
    blooms_level: str | None = None,
) -> str:
    blooms_line = f"\nBloom's level: {blooms_level}" if blooms_level else ""
    return (
        f"Create {count} equivalent version(s) of the following exam question.\n"
        "The equivalent question must:\n"
        "- Test the SAME learning outcome\n"
        "- Have DIFFERENT wording (rephrase completely)\n"
        f"- Maintain the SAME difficulty level ({difficulty})\n"
        f"- Keep the SAME marks ({marks})\n"
        f"- Be the SAME question type ({question_type})\n"
        "- Have a DIFFERENT correct answer (but still correct)\n"
        f"- Be relevant to the SAME subject ({subject}) and topic ({topic}){blooms_line}\n\n"
        "Original question:\n"
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n"
        f"Type: {question_type}\n"
        f"Marks: {marks}\n"
        f"Question: {question_text}\n"
        f"{options_str}"
        f"Answer: {correct_answer}\n"
        f"Explanation: {explanation or 'None'}\n\n"
        f"Return ONLY a JSON object with a \"questions\" key containing an array of {count} object(s) with these fields:\n"
        f"- subject: \"{subject}\"\n"
        f"- topic: \"{topic}\"\n"
        f"- difficulty: \"{difficulty}\"\n"
        f"- question_type: \"{question_type}\"\n"
        "- question_text: the rephrased question\n"
        "- options: array of strings (only for mcq, at least 2, null otherwise)\n"
        "- correct_answer: the new correct answer\n"
        f"- marks: {marks}\n"
        "- blooms_level: one of remember, understand, apply, analyze, evaluate, create\n"
        "- explanation: brief explanation of the answer\n"
        "Valid JSON only, no markdown, no code fences."
    )


def prompt_suggest_improvements(
    question_text: str,
    subject: str,
    topic: str,
    difficulty: str,
    question_type: str,
    correct_answer: str,
    explanation: str | None,
) -> str:
    return (
        "Review this exam question and suggest 3 specific improvements:\n\n"
        f"Question: {question_text}\n"
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n"
        f"Type: {question_type}\n"
        f"Answer: {correct_answer}\n"
        f"Explanation: {explanation or 'None'}\n\n"
        'Return ONLY valid JSON with a "suggestions" key containing an array of 3 strings, '
        "each being a specific, actionable improvement suggestion.\n"
        "Valid JSON only, no markdown, no code fences."
    )


def validate_ai_output(questions: list[dict]) -> list[str]:
    errors = []
    for i, q in enumerate(questions):
        if not q.get("question_text"):
            errors.append(f"Question {i+1}: missing question_text")
        if q.get("question_type") == "mcq":
            opts = q.get("options")
            if not opts or not isinstance(opts, list) or len(opts) < 2:
                errors.append(f"Question {i+1}: MCQ must have at least 2 options")
            else:
                cleaned = [o.strip().lower() for o in opts if o.strip()]
                ans = q.get("correct_answer", "").strip().lower()
                if ans and cleaned and ans not in cleaned:
                    errors.append(f"Question {i+1}: correct_answer \"{ans}\" not found in options")
        if not q.get("correct_answer"):
            errors.append(f"Question {i+1}: missing correct_answer")
    return errors