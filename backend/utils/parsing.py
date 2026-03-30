import ast
import json
from typing import Type, TypeVar
from json import JSONDecodeError
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

def parse_agent_output(raw: str, schema: Type[T]) -> T:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 1)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    try:
        data = json.loads(cleaned)
    except JSONDecodeError:
        # Fallback to Python literal parsing for loosely formatted JSON (e.g., single quotes)
        data = ast.literal_eval(cleaned)

    # Filter out invalid tasks before validation
    if "tasks" in data:
        data["tasks"] = [
            t
            for t in data["tasks"]
            if t.get("effort") in ("S", "M", "L")
            and t.get("epic") not in (None, "None", "")
            and "prd_draft" not in t.get("title", "").lower()
            and "prd_drafts" not in t.get("description", "").lower()
        ]

    if "dependencies" in data:
        seen = {}
        for dep in data["dependencies"]:
            title = dep.get("title")
            if not title:
                continue
            seen[title] = dep
        data["dependencies"] = list(seen.values())

    return schema.model_validate(data)
