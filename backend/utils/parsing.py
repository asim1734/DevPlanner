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

    # Normalize architect diagrams (syntax -> mermaid, add default titles)
    if "diagrams" in data:
        normalized_diagrams = []
        for idx, diag in enumerate(data["diagrams"]):
            d = dict(diag)
            if "mermaid" not in d and "syntax" in d:
                d["mermaid"] = d.pop("syntax")
            if "title" not in d or not d.get("title"):
                default_title = "System Architecture" if d.get("type") == "architecture" else "Entity Relationship Diagram"
                d["title"] = default_title
            normalized_diagrams.append(d)
        data["diagrams"] = normalized_diagrams

    # Normalize PRD fields that frequently arrive as single strings.
    if "tech_stack" in data and isinstance(data["tech_stack"], dict):
        other = data["tech_stack"].get("other")
        if isinstance(other, str):
            data["tech_stack"]["other"] = [other]
        elif other is None:
            data["tech_stack"]["other"] = []

    if "core_features" in data and isinstance(data["core_features"], str):
        data["core_features"] = [data["core_features"]]

    if "out_of_scope" in data and isinstance(data["out_of_scope"], str):
        data["out_of_scope"] = [data["out_of_scope"]]

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

    # Deduplicate dependencies by title
    if "dependencies" in data:
        seen = {}
        for dep in data["dependencies"]:
            title = dep.get("title")
            if not title:
                continue
            seen[title] = dep
        data["dependencies"] = list(seen.values())

    return schema.model_validate(data)
