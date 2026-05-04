from fastapi import APIRouter, Request
import logging

router = APIRouter(prefix="/logs", tags=["logs"]) 
logger = logging.getLogger("frontend")

@router.post("")
async def ingest_log(request: Request):
    payload = await request.json()
    level = payload.get("level", "info").lower()
    message = payload.get("message", "")
    context = payload.get("context", {})

    log_msg = f"CLIENT LOG - {message} | context={context}"

    if level == "debug":
        logger.debug(log_msg)
    elif level == "warning":
        logger.warning(log_msg)
    elif level == "error":
        logger.error(log_msg)
    else:
        logger.info(log_msg)

    return {"status": "ok"}
