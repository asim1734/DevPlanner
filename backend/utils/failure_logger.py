"""
Parse failure logging utility.
Saves parse failures to the database for debugging and analysis.
"""
import logging
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlmodel import Session

from database import engine
from models.parse_failure import ParseFailure


def log_parse_failure(
    raw_payload: str,
    cleaned_payload: Optional[str],
    schema_name: str,
    error_message: str,
    error_type: str,
    session_id: Optional[UUID] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Save a parse failure record to the database for post-mortem analysis.
    
    Args:
        raw_payload: The raw LLM output that failed to parse
        cleaned_payload: The cleaned output (after code-fence stripping, etc.)
        schema_name: Name of the schema that failed to parse
        error_message: The error message from the parser
        error_type: Type of error (e.g., 'JSONDecodeError')
        session_id: Associated chat session ID (optional)
        metadata: Additional context (agent name, attempt number, etc.)
    """
    logger = logging.getLogger("devplanner")
    
    try:
        with Session(engine) as session:
            failure = ParseFailure(
                raw_payload=raw_payload,
                cleaned_payload=cleaned_payload,
                schema_name=schema_name,
                error_message=error_message,
                error_type=error_type,
                session_id=session_id,
                context=metadata or {},
                created_at=datetime.utcnow(),
            )
            session.add(failure)
            session.commit()
            logger.info(
                "Saved parse failure record for schema %s (ID: %s)",
                schema_name,
                failure.id,
            )
    except Exception as e:
        logger.error(
            "Failed to save parse failure record for schema %s: %s",
            schema_name,
            str(e),
            exc_info=True,
        )
