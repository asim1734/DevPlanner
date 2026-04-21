#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! command -v "$PYTHON_BIN" > /dev/null 2>&1; then
  echo "ERROR: Python interpreter '$PYTHON_BIN' not found in PATH"
  echo "Set PYTHON_BIN to a valid interpreter, e.g. PYTHON_BIN=python3"
  exit 1
fi

request_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local outfile="$4"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -o "$outfile" \
      -w "%{http_code}" \
      -d "$body"
  else
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -o "$outfile" \
      -w "%{http_code}"
  fi
}

echo "[1/8] Checking API health at $BASE_URL/health"
if ! curl -fsS "$BASE_URL/health" > /dev/null; then
  echo "ERROR: API is not reachable at $BASE_URL"
  echo "Start it first: cd backend && uvicorn main:app --reload --port 8000"
  exit 1
fi

echo "[2/8] Creating chat session"
CREATE_BODY_FILE="$TMP_DIR/create.json"
CREATE_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":"I want to build an internal feature flag dashboard."}' "$CREATE_BODY_FILE")
if [[ "$CREATE_STATUS" != "200" ]]; then
  echo "ERROR: /chat failed with status $CREATE_STATUS"
  cat "$CREATE_BODY_FILE"
  exit 1
fi

SESSION_ID=$("$PYTHON_BIN" - "$CREATE_BODY_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data["session_id"])
PY
)

echo "Session ID: $SESSION_ID"

echo "[3/8] Finalizing PRD"
FINALIZE_BODY_FILE="$TMP_DIR/finalize.json"
FINALIZE_PAYLOAD=$("$PYTHON_BIN" - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({
    "session_id": sys.argv[1],
    "message": "Finalize this PRD now."
}))
PY
)
FINALIZE_STATUS=$(request_json "POST" "$BASE_URL/chat" "$FINALIZE_PAYLOAD" "$FINALIZE_BODY_FILE")
if [[ "$FINALIZE_STATUS" != "200" ]]; then
  echo "ERROR: PRD finalize /chat failed with status $FINALIZE_STATUS"
  cat "$FINALIZE_BODY_FILE"
  exit 1
fi

IS_FINAL=$("$PYTHON_BIN" - "$FINALIZE_BODY_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(str(bool(data.get("is_final"))).lower())
PY
)
if [[ "$IS_FINAL" != "true" ]]; then
  echo "ERROR: PRD was not finalized (is_final=$IS_FINAL)"
  cat "$FINALIZE_BODY_FILE"
  exit 1
fi

echo "[4/8] Locking session"
LOCK_BODY_FILE="$TMP_DIR/lock.json"
LOCK_STATUS=$(request_json "POST" "$BASE_URL/chat/$SESSION_ID/lock" "" "$LOCK_BODY_FILE")
if [[ "$LOCK_STATUS" != "200" ]]; then
  echo "ERROR: lock endpoint failed with status $LOCK_STATUS"
  cat "$LOCK_BODY_FILE"
  exit 1
fi

echo "[5/8] Running /generate SSE stream"
SSE_FILE="$TMP_DIR/sse.txt"
GEN_PAYLOAD=$("$PYTHON_BIN" - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1]}))
PY
)
curl -sN -X POST "$BASE_URL/generate" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d "$GEN_PAYLOAD" > "$SSE_FILE"

"$PYTHON_BIN" - "$SSE_FILE" <<'PY'
import json
import sys

required_stages = {"prd", "architect", "scrum", "dag_validation", "saving", "complete"}

events = []
with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("data: "):
            events.append(json.loads(line[6:].strip()))

if not events:
    print("ERROR: No SSE events were received")
    sys.exit(1)

stages = [event.get("stage") for event in events]
print("SSE events:", len(events))
print("SSE stages:", stages)

missing = sorted(required_stages - set(stages))
if missing:
    print("ERROR: Missing expected stages:", missing)
    sys.exit(1)

final = events[-1]
if final.get("stage") != "complete" or final.get("status") != "success" or "project_id" not in final:
    print("ERROR: Final SSE event is not successful complete payload")
    print(final)
    sys.exit(1)

print("SSE final event OK:", final)
PY

echo "[5b/8] Verify project exists in DB"
PROJECT_ID=$("$PYTHON_BIN" - "$SSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("data: "):
            event = json.loads(line[6:].strip())
            if event.get("stage") == "complete":
                print(event["project_id"])
                break
PY
)

PROJ_CHECK_FILE="$TMP_DIR/proj_check.json"
PROJ_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID" "" "$PROJ_CHECK_FILE")
if [[ "$PROJ_STATUS" != "200" ]]; then
  echo "ERROR: project $PROJECT_ID not found in DB after generation"
  cat "$PROJ_CHECK_FILE"
  exit 1
fi
echo "Project verified in DB: $PROJECT_ID"

echo "[6/8] Negative check: missing session returns 404"
MISSING_BODY_FILE="$TMP_DIR/missing.json"
MISSING_STATUS=$(request_json "POST" "$BASE_URL/generate" '{"session_id":"00000000-0000-0000-0000-000000000000"}' "$MISSING_BODY_FILE")
if [[ "$MISSING_STATUS" != "404" ]]; then
  echo "ERROR: expected 404 for missing session, got $MISSING_STATUS"
  cat "$MISSING_BODY_FILE"
  exit 1
fi

echo "[7/8] Negative check: unlocked session returns 400"
UNLOCKED_CREATE_FILE="$TMP_DIR/unlocked_create.json"
UNLOCKED_CREATE_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":"new idea"}' "$UNLOCKED_CREATE_FILE")
if [[ "$UNLOCKED_CREATE_STATUS" != "200" ]]; then
  echo "ERROR: could not create unlocked session"
  cat "$UNLOCKED_CREATE_FILE"
  exit 1
fi
UNLOCKED_ID=$("$PYTHON_BIN" - "$UNLOCKED_CREATE_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data["session_id"])
PY
)
UNLOCKED_GEN_FILE="$TMP_DIR/unlocked_generate.json"
UNLOCKED_GEN_PAYLOAD=$("$PYTHON_BIN" - "$UNLOCKED_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1]}))
PY
)
UNLOCKED_STATUS=$(request_json "POST" "$BASE_URL/generate" "$UNLOCKED_GEN_PAYLOAD" "$UNLOCKED_GEN_FILE")
if [[ "$UNLOCKED_STATUS" != "400" ]]; then
  echo "ERROR: expected 400 for unlocked session, got $UNLOCKED_STATUS"
  cat "$UNLOCKED_GEN_FILE"
  exit 1
fi

echo "[8/8] Negative check: already generated session returns 400"
REPEAT_FILE="$TMP_DIR/repeat.json"
REPEAT_STATUS=$(request_json "POST" "$BASE_URL/generate" "$GEN_PAYLOAD" "$REPEAT_FILE")
if [[ "$REPEAT_STATUS" != "400" ]]; then
  echo "ERROR: expected 400 for already-generated session, got $REPEAT_STATUS"
  cat "$REPEAT_FILE"
  exit 1
fi

echo "All Phase 12 manual checks passed."
