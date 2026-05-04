import ast
import json
import re
import logging
from typing import Type, TypeVar, Optional
from json import JSONDecodeError
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _escape_newlines_in_json(text: str) -> str:
    """
    Escape literal newlines inside JSON string values.
    
    This handles cases where an LLM returns JSON with unescaped newlines like:
    {"title": "foo
    bar"}
    
    Converts to valid JSON: {"title": "foo\\nbar"}
    """
    # Match quoted strings and replace literal newlines with \\n
    def replace_newlines_in_string(match: re.Match) -> str:
        s = match.group(0)
        # Replace literal newlines with escaped newlines
        return s.replace('\n', '\\n').replace('\r', '\\r')
    
    # Pattern: match quoted strings (handling escaped quotes)
    # This regex matches: a quote, then any number of (non-quote-non-newline OR escaped-anything), then a quote
    pattern = r'"(?:[^"\n]|\\")*(?:\n[^"]*)*"'
    result = re.sub(pattern, replace_newlines_in_string, text)
    return result


def parse_agent_output(raw: str, schema: Type[T], session_id: Optional[str] = None) -> T:
    logger = logging.getLogger("devplanner")
    cleaned = raw.strip()
    
    # Remove code-fence markers (``` or ```json)
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]  # Remove opening ```
        # Handle optional language identifier (e.g., "json")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        # Remove leading whitespace/newline after opening fence
        cleaned = cleaned.lstrip()
    
    # Remove closing code-fence if present
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]  # Remove closing ```
        cleaned = cleaned.rstrip()
    
    cleaned = cleaned.strip()
    
    # Pre-process: escape unescaped newlines inside JSON strings
    # This is a best-effort fix for LLM-generated JSON with literal newlines
    cleaned = _escape_newlines_in_json(cleaned)
    
    schema_name = getattr(schema, "__name__", str(schema))
    
    try:
        data = json.loads(cleaned)
    except JSONDecodeError as e:
        # Log detailed context for debugging
        try:
            logger.error(
                "JSON parse failed for schema %s: %s",
                schema_name,
                str(e),
                exc_info=True,
            )
            logger.debug("Raw agent output:\n%s", raw)
            logger.debug("Cleaned agent output (post-escape):\n%s", cleaned)
        except Exception:
            pass

        # Attempt to save failure record for analysis
        try:
            from .failure_logger import log_parse_failure
            log_parse_failure(
                raw_payload=raw[:65535],  # Truncate to DB column limit
                cleaned_payload=cleaned[:65535],
                schema_name=schema_name,
                error_message=str(e),
                error_type="JSONDecodeError",
                session_id=session_id,
                metadata={"line": e.lineno, "column": e.colno, "pos": e.pos},
            )
        except Exception as log_err:
            logger.debug("Failed to log parse failure: %s", str(log_err))

        # Fallback to Python literal parsing for loosely formatted JSON (e.g., single quotes)
        try:
            data = ast.literal_eval(cleaned)
        except Exception as exc2:
            try:
                logger.error(
                    "Fallback python literal_eval also failed for schema %s",
                    schema_name,
                    exc_info=True,
                )
            except Exception:
                pass
            
            # Attempt to save failure record for the fallback error too
            try:
                from .failure_logger import log_parse_failure
                log_parse_failure(
                    raw_payload=raw[:65535],
                    cleaned_payload=cleaned[:65535],
                    schema_name=schema_name,
                    error_message=str(exc2),
                    error_type=type(exc2).__name__,
                    session_id=session_id,
                    metadata={"fallback_failed": True},
                )
            except Exception as log_err:
                logger.debug("Failed to log parse failure: %s", str(log_err))
            
            # Re-raise original JSON error with more context
            raise ValueError(f"Failed to parse JSON (line {e.lineno}): {e.msg}") from e

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
