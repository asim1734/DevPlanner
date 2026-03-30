import json
from typing import Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

def parse_agent_output(raw: str, schema: Type[T]) -> T:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 1)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    data = json.loads(cleaned)

    # Filter out invalid tasks before validation
    if "tasks" in data:
        data["tasks"] = [
            t
            for t in data["tasks"]
            if t.get("effort") in ("S", "M", "L")
            and t.get("epic") not in (None, "None", "")
        ]

    return schema.model_validate(data)
