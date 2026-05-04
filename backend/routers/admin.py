"""
Admin endpoints for DevPlanner.
Provides debugging and monitoring tools.
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from datetime import datetime, timedelta
from database import get_session
from models.parse_failure import ParseFailure

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
)


@router.get("/parse-failures")
def list_parse_failures(
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    hours: int = Query(24, ge=1, le=720),
    schema_name: str = Query(None),
):
    """
    List recent parse failures for debugging.
    
    Query Parameters:
    - limit: Number of records to return (default: 50, max: 500)
    - offset: Pagination offset (default: 0)
    - hours: Look back this many hours (default: 24, max: 720)
    - schema_name: Filter by schema name (optional)
    
    Returns:
        List of parse failure records with raw and cleaned payloads.
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(ParseFailure).where(ParseFailure.created_at >= cutoff)
    
    if schema_name:
        query = query.where(ParseFailure.schema_name == schema_name)
    
    # Order by most recent first
    query = query.order_by(ParseFailure.created_at.desc())
    
    # Count total
    count_query = select(ParseFailure).where(ParseFailure.created_at >= cutoff)
    if schema_name:
        count_query = count_query.where(ParseFailure.schema_name == schema_name)
    total = len(session.exec(count_query).all())
    
    # Fetch page
    failures = session.exec(query.offset(offset).limit(limit)).all()
    
    return {
        "total": total,
        "count": len(failures),
        "offset": offset,
        "limit": limit,
        "failures": [
            {
                "id": str(f.id),
                "schema_name": f.schema_name,
                "error_type": f.error_type,
                "error_message": f.error_message,
                "raw_payload": f.raw_payload,
                "cleaned_payload": f.cleaned_payload,
                "session_id": str(f.session_id) if f.session_id else None,
                "context": f.context,
                "created_at": f.created_at.isoformat(),
            }
            for f in failures
        ],
    }


@router.get("/parse-failures/stats")
def parse_failures_stats(
    session: Session = Depends(get_session),
    hours: int = Query(24, ge=1, le=720),
):
    """
    Get statistics about recent parse failures.
    
    Query Parameters:
    - hours: Look back this many hours (default: 24, max: 720)
    
    Returns:
        Statistics including total failures and breakdown by schema/error type.
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(ParseFailure).where(ParseFailure.created_at >= cutoff)
    failures = session.exec(query).all()
    
    # Breakdown by schema
    by_schema = {}
    for f in failures:
        if f.schema_name not in by_schema:
            by_schema[f.schema_name] = 0
        by_schema[f.schema_name] += 1
    
    # Breakdown by error type
    by_error_type = {}
    for f in failures:
        if f.error_type not in by_error_type:
            by_error_type[f.error_type] = 0
        by_error_type[f.error_type] += 1
    
    return {
        "total_failures": len(failures),
        "hours": hours,
        "by_schema": by_schema,
        "by_error_type": by_error_type,
    }


@router.delete("/parse-failures/{failure_id}")
def delete_parse_failure(
    failure_id: str,
    session: Session = Depends(get_session),
):
    """
    Delete a specific parse failure record.
    """
    from uuid import UUID
    try:
        failure_uuid = UUID(failure_id)
    except ValueError:
        return {"error": "Invalid failure ID format"}
    
    failure = session.get(ParseFailure, failure_uuid)
    if not failure:
        return {"error": "Failure record not found"}
    
    session.delete(failure)
    session.commit()
    return {"deleted": str(failure.id)}


@router.delete("/parse-failures")
def delete_parse_failures(
    session: Session = Depends(get_session),
    hours: int = Query(None, ge=1, le=720),
    schema_name: str = Query(None),
):
    """
    Delete parse failure records matching criteria.
    
    Query Parameters:
    - hours: Delete records older than this many hours (optional)
    - schema_name: Delete only records for this schema (optional)
    
    Returns:
        Number of records deleted.
    """
    query = select(ParseFailure)
    
    if hours:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.where(ParseFailure.created_at < cutoff)
    
    if schema_name:
        query = query.where(ParseFailure.schema_name == schema_name)
    
    failures = session.exec(query).all()
    count = len(failures)
    
    for failure in failures:
        session.delete(failure)
    session.commit()
    
    return {"deleted": count}
