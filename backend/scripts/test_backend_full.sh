#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:8001}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"
SSE_MAX_TIME="${SSE_MAX_TIME:-300}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! command -v "$PYTHON_BIN" > /dev/null 2>&1; then
  echo "ERROR: Python interpreter '$PYTHON_BIN' not found in PATH"
  exit 1
fi

PASS=0
FAIL=0
FAILED_CHECKS=()
TOTAL=0

record_pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "[PASS] $1"
}

record_fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  FAILED_CHECKS+=("$1")
  echo "[FAIL] $1"
}

request_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local outfile="$4"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      --connect-timeout "$CURL_CONNECT_TIMEOUT" \
      --max-time "$CURL_MAX_TIME" \
      -H "Content-Type: application/json" \
      -o "$outfile" \
      -w "%{http_code}" \
      -d "$body"
  else
    curl -sS -X "$method" "$url" \
      --connect-timeout "$CURL_CONNECT_TIMEOUT" \
      --max-time "$CURL_MAX_TIME" \
      -H "Content-Type: application/json" \
      -o "$outfile" \
      -w "%{http_code}"
  fi
}

echo "SECTION 1 — Health & Infrastructure"
if curl -fsS "$BASE_URL/health" \
  --connect-timeout "$CURL_CONNECT_TIMEOUT" \
  --max-time "$CURL_MAX_TIME" > /dev/null; then
  record_pass "GET /health returns 200"
else
  record_fail "GET /health returns 200"
fi

DB_REACHABLE=$([[ $FAIL -eq 0 ]] && echo "true" || echo "false")
if [[ "$DB_REACHABLE" == "true" ]]; then
  record_pass "Database is reachable (health check)"
else
  record_fail "Database is reachable (health check)"
fi

SESSION_ID=""
LOCKED_SESSION_ID=""
PROJECT_ID=""
TASK_ID=""
GEN_PAYLOAD=""
SSE_FILE="$TMP_DIR/sse.txt"


echo "SECTION 2 — Chat & Session Flow"
CREATE_BODY_FILE="$TMP_DIR/create.json"
CREATE_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":"I want to build an internal feature flag dashboard."}' "$CREATE_BODY_FILE")
if [[ "$CREATE_STATUS" == "200" ]]; then
  SESSION_ID=$($PYTHON_BIN - "$CREATE_BODY_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data.get("session_id", ""))
PY
  )
  if [[ -n "$SESSION_ID" ]]; then
    record_pass "POST /chat creates new session"
  else
    record_fail "POST /chat creates new session"
  fi
else
  record_fail "POST /chat creates new session"
fi

CONTINUE_BODY_FILE="$TMP_DIR/continue.json"
CONTINUE_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "Continue with more details."}))
PY
)
CONTINUE_STATUS=$(request_json "POST" "$BASE_URL/chat" "$CONTINUE_PAYLOAD" "$CONTINUE_BODY_FILE")
if [[ "$CONTINUE_STATUS" == "200" ]]; then
  CONT_SESSION_ID=$($PYTHON_BIN - "$CONTINUE_BODY_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data.get("session_id", ""))
PY
  )
  if [[ "$CONT_SESSION_ID" == "$SESSION_ID" ]]; then
    record_pass "POST /chat continues conversation"
  else
    record_fail "POST /chat continues conversation"
  fi
else
  record_fail "POST /chat continues conversation"
fi

INVALID_UUID_FILE="$TMP_DIR/invalid_uuid.json"
INVALID_UUID_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"session_id":"not-a-uuid","message":"hello"}' "$INVALID_UUID_FILE")
if [[ "$INVALID_UUID_STATUS" == "422" ]]; then
  record_pass "POST /chat with invalid UUID returns 422"
else
  record_fail "POST /chat with invalid UUID returns 422"
fi

EMPTY_MESSAGE_FILE="$TMP_DIR/empty_message.json"
EMPTY_MESSAGE_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":""}' "$EMPTY_MESSAGE_FILE")
if [[ "$EMPTY_MESSAGE_STATUS" == "422" ]]; then
  record_pass "POST /chat with empty message returns 422"
else
  record_fail "POST /chat with empty message returns 422"
fi

FINALIZE_BODY_FILE="$TMP_DIR/finalize.json"
FINALIZE_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "Finalize this PRD now."}))
PY
)
FINALIZE_STATUS=$(request_json "POST" "$BASE_URL/chat" "$FINALIZE_PAYLOAD" "$FINALIZE_BODY_FILE")
if [[ "$FINALIZE_STATUS" == "200" ]]; then
  record_pass "POST /chat finalize returns 200"
else
  record_fail "POST /chat finalize returns 200"
fi

LOCK_FILE="$TMP_DIR/lock.json"
LOCK_STATUS=$(request_json "POST" "$BASE_URL/chat/$SESSION_ID/lock" "" "$LOCK_FILE")
if [[ "$LOCK_STATUS" == "200" ]]; then
  LOCKED_SESSION_ID="$SESSION_ID"
  record_pass "POST /chat/{id}/lock on unlocked session returns 200"
else
  record_fail "POST /chat/{id}/lock on unlocked session returns 200"
fi

LOCK_AGAIN_FILE="$TMP_DIR/lock_again.json"
LOCK_AGAIN_STATUS=$(request_json "POST" "$BASE_URL/chat/$SESSION_ID/lock" "" "$LOCK_AGAIN_FILE")
if [[ "$LOCK_AGAIN_STATUS" == "400" ]]; then
  record_pass "POST /chat/{id}/lock on already locked session returns 400"
else
  record_fail "POST /chat/{id}/lock on already locked session returns 400"
fi

LOCKED_CHAT_FILE="$TMP_DIR/locked_chat.json"
LOCKED_CHAT_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "One more message"}))
PY
)
LOCKED_CHAT_STATUS=$(request_json "POST" "$BASE_URL/chat" "$LOCKED_CHAT_PAYLOAD" "$LOCKED_CHAT_FILE")
if [[ "$LOCKED_CHAT_STATUS" == "400" ]]; then
  record_pass "POST /chat on locked session returns 400"
else
  record_fail "POST /chat on locked session returns 400"
fi


echo "SECTION 3 — Generation Flow"
MISSING_GEN_FILE="$TMP_DIR/gen_missing.json"
MISSING_GEN_STATUS=$(request_json "POST" "$BASE_URL/generate" '{"session_id":"00000000-0000-0000-0000-000000000000"}' "$MISSING_GEN_FILE")
if [[ "$MISSING_GEN_STATUS" == "404" ]]; then
  record_pass "POST /generate on missing session returns 404"
else
  record_fail "POST /generate on missing session returns 404"
fi

UNLOCKED_SESSION_FILE="$TMP_DIR/unlocked_session.json"
UNLOCKED_SESSION_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":"new idea"}' "$UNLOCKED_SESSION_FILE")
UNLOCKED_SESSION_ID=""
if [[ "$UNLOCKED_SESSION_STATUS" == "200" ]]; then
  UNLOCKED_SESSION_ID=$($PYTHON_BIN - "$UNLOCKED_SESSION_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data.get("session_id", ""))
PY
  )
fi

UNLOCKED_GEN_FILE="$TMP_DIR/gen_unlocked.json"
UNLOCKED_GEN_PAYLOAD=$($PYTHON_BIN - "$UNLOCKED_SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1]}))
PY
)
UNLOCKED_GEN_STATUS=$(request_json "POST" "$BASE_URL/generate" "$UNLOCKED_GEN_PAYLOAD" "$UNLOCKED_GEN_FILE")
if [[ "$UNLOCKED_GEN_STATUS" == "400" ]]; then
  record_pass "POST /generate on unlocked session returns 400"
else
  record_fail "POST /generate on unlocked session returns 400"
fi

if [[ -n "$LOCKED_SESSION_ID" ]]; then
  GEN_PAYLOAD=$($PYTHON_BIN - "$LOCKED_SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1]}))
PY
  )
  curl -sN -X POST "$BASE_URL/generate" \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    --max-time "$SSE_MAX_TIME" \
    -H "Accept: text/event-stream" \
    -H "Content-Type: application/json" \
    -d "$GEN_PAYLOAD" > "$SSE_FILE"

  $PYTHON_BIN - "$SSE_FILE" <<'PY'
import json
import sys

required = {"prd", "architect", "scrum", "dag_validation", "saving", "complete"}

events = []
with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("data: "):
            events.append(json.loads(line[6:].strip()))

if not events:
    print("FAIL_NO_EVENTS")
    sys.exit(1)

stages = {e.get("stage") for e in events}
missing = sorted(required - stages)
if missing:
    print("FAIL_MISSING_STAGES", ",".join(missing))
    sys.exit(1)

final = events[-1]
if final.get("stage") != "complete" or final.get("status") != "success" or "project_id" not in final:
    print("FAIL_FINAL_EVENT")
    sys.exit(1)

print(final.get("project_id", ""))
PY
  EVENT_PARSE_STATUS=$?
  if [[ $EVENT_PARSE_STATUS -eq 0 ]]; then
    PROJECT_ID=$($PYTHON_BIN - "$SSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("data: "):
            event = json.loads(line[6:].strip())
            if event.get("stage") == "complete":
                print(event.get("project_id", ""))
                break
PY
    )
    if [[ -n "$PROJECT_ID" ]]; then
      record_pass "POST /generate on valid locked session returns SSE success"
    else
      record_fail "POST /generate on valid locked session returns SSE success"
    fi
  else
    record_fail "POST /generate on valid locked session returns SSE success"
  fi
else
  record_fail "POST /generate on valid locked session returns SSE success"
fi

REPEAT_GEN_FILE="$TMP_DIR/gen_repeat.json"
if [[ -n "$GEN_PAYLOAD" ]]; then
  REPEAT_GEN_STATUS=$(request_json "POST" "$BASE_URL/generate" "$GEN_PAYLOAD" "$REPEAT_GEN_FILE")
  if [[ "$REPEAT_GEN_STATUS" == "400" ]]; then
    record_pass "POST /generate on already-generated session returns 400"
  else
    record_fail "POST /generate on already-generated session returns 400"
  fi
else
  record_fail "POST /generate on already-generated session returns 400"
fi


echo "SECTION 4 — Project Read Endpoints"
LIST_FILE="$TMP_DIR/projects_list.json"
LIST_STATUS=$(request_json "GET" "$BASE_URL/projects" "" "$LIST_FILE")
if [[ "$LIST_STATUS" == "200" ]]; then
  NONEMPTY=$($PYTHON_BIN - "$LIST_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("true" if data else "false")
PY
  )
  if [[ "$NONEMPTY" == "true" ]]; then
    record_pass "GET /projects returns 200 and non-empty list"
  else
    record_fail "GET /projects returns 200 and non-empty list"
  fi
else
  record_fail "GET /projects returns 200 and non-empty list"
fi

if [[ -n "$PROJECT_ID" ]]; then
  DETAIL_FILE="$TMP_DIR/projects_detail.json"
  DETAIL_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID" "" "$DETAIL_FILE")
  if [[ "$DETAIL_STATUS" == "200" ]]; then
    DETAIL_OK=$($PYTHON_BIN - "$DETAIL_FILE" <<'PY'
import json
import sys
required = {"id","name","prd_json","diagrams_json","tasks_count","dependencies_count","status","created_at"}
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
missing = sorted(required - set(data.keys()))
print("ok" if not missing else "missing")
PY
    )
    if [[ "$DETAIL_OK" == "ok" ]]; then
      record_pass "GET /projects/{id} returns required fields"
    else
      record_fail "GET /projects/{id} returns required fields"
    fi
  else
    record_fail "GET /projects/{id} returns required fields"
  fi

  GRAPH_FILE="$TMP_DIR/projects_graph.json"
  GRAPH_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID/graph" "" "$GRAPH_FILE")
  if [[ "$GRAPH_STATUS" == "200" ]]; then
    GRAPH_OK=$($PYTHON_BIN - "$GRAPH_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
if not data.get("nodes") or not data.get("edges"):
    print("bad")
else:
    print("ok")
PY
    )
    if [[ "$GRAPH_OK" == "ok" ]]; then
      record_pass "GET /projects/{id}/graph returns nodes and edges"
    else
      record_fail "GET /projects/{id}/graph returns nodes and edges"
    fi
  else
    record_fail "GET /projects/{id}/graph returns nodes and edges"
  fi
else
  record_fail "GET /projects/{id} returns required fields"
  record_fail "GET /projects/{id}/graph returns nodes and edges"
fi

NOT_FOUND_FILE="$TMP_DIR/projects_404.json"
NOT_FOUND_STATUS=$(request_json "GET" "$BASE_URL/projects/00000000-0000-0000-0000-000000000000" "" "$NOT_FOUND_FILE")
if [[ "$NOT_FOUND_STATUS" == "404" ]]; then
  record_pass "GET /projects/nonexistent-uuid returns 404"
else
  record_fail "GET /projects/nonexistent-uuid returns 404"
fi


echo "SECTION 5 — Task Status Updates"
if [[ -n "$PROJECT_ID" ]]; then
  GRAPH_FILE="$TMP_DIR/projects_graph_for_task.json"
  GRAPH_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID/graph" "" "$GRAPH_FILE")
  if [[ "$GRAPH_STATUS" == "200" ]]; then
    TASK_ID=$($PYTHON_BIN - "$GRAPH_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data.get("nodes", [{}])[0].get("id", ""))
PY
    )
  fi
fi

if [[ -n "$TASK_ID" ]]; then
  PATCH_FILE="$TMP_DIR/task_patch.json"
  PATCH_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"in_progress"}' "$PATCH_FILE")
  if [[ "$PATCH_STATUS" == "200" ]]; then
    record_pass "PATCH task to in_progress returns 200"
  else
    record_fail "PATCH task to in_progress returns 200"
  fi

  PATCH_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"complete"}' "$PATCH_FILE")
  if [[ "$PATCH_STATUS" == "200" ]]; then
    record_pass "PATCH task to complete returns 200"
  else
    record_fail "PATCH task to complete returns 200"
  fi

  PATCH_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"todo"}' "$PATCH_FILE")
  if [[ "$PATCH_STATUS" == "200" ]]; then
    record_pass "PATCH task to todo returns 200"
  else
    record_fail "PATCH task to todo returns 200"
  fi

  INVALID_FILE="$TMP_DIR/task_invalid.json"
  INVALID_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"invalid"}' "$INVALID_FILE")
  if [[ "$INVALID_STATUS" == "422" ]]; then
    record_pass "PATCH task with invalid status returns 422"
  else
    record_fail "PATCH task with invalid status returns 422"
  fi

  MISSING_FILE="$TMP_DIR/task_missing.json"
  MISSING_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/00000000-0000-0000-0000-000000000000" '{"status":"todo"}' "$MISSING_FILE")
  if [[ "$MISSING_STATUS" == "404" ]]; then
    record_pass "PATCH task with nonexistent task_id returns 404"
  else
    record_fail "PATCH task with nonexistent task_id returns 404"
  fi
else
  record_fail "PATCH task to in_progress returns 200"
  record_fail "PATCH task to complete returns 200"
  record_fail "PATCH task to todo returns 200"
  record_fail "PATCH task with invalid status returns 422"
  record_fail "PATCH task with nonexistent task_id returns 404"
fi


echo "SECTION 6 — Summary"
TOTAL_CHECKS=$TOTAL
PASSED=$PASS
FAILED=$FAIL

echo "Total checks: $TOTAL_CHECKS"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [[ $FAILED -gt 0 ]]; then
  echo "Failed checks:"
  for check in "${FAILED_CHECKS[@]}"; do
    echo "- $check"
  done
  exit 1
fi

echo "✅ Backend fully verified"
exit 0
