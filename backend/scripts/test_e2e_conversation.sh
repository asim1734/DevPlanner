#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:8001}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"
SSE_MAX_TIME="${SSE_MAX_TIME:-300}"
SLEEP_BETWEEN_CHAT="${SLEEP_BETWEEN_CHAT:-2}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! command -v "$PYTHON_BIN" > /dev/null 2>&1; then
  echo "ERROR: Python interpreter '$PYTHON_BIN' not found in PATH"
  exit 1
fi

PASS=0
FAIL=0
TOTAL=0
FAILED_CHECKS=()

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

SESSION_ID=""
PROJECT_ID=""
SSE_FILE="$TMP_DIR/sse.txt"


echo "Step 1 — Start conversation with a vague idea"
STEP1_FILE="$TMP_DIR/step1.json"
STEP1_STATUS=$(request_json "POST" "$BASE_URL/chat" '{"message":"I want to build something for restaurants"}' "$STEP1_FILE")
if [[ "$STEP1_STATUS" == "200" ]]; then
  STEP1_OK=$($PYTHON_BIN - "$STEP1_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
message = (data.get("message") or "").strip()
is_final = data.get("is_final")
prd_draft = data.get("prd_draft")
session_id = data.get("session_id")
print("ok" if message and is_final is False and prd_draft is None and session_id else "bad")
print(session_id or "")
PY
  )
  STEP1_RESULT=$(echo "$STEP1_OK" | head -n 1)
  SESSION_ID=$(echo "$STEP1_OK" | tail -n 1)
  if [[ "$STEP1_RESULT" == "ok" && -n "$SESSION_ID" ]]; then
    record_pass "Step 1: clarifying question returned"
  else
    record_fail "Step 1: clarifying question returned"
  fi
else
  record_fail "Step 1: clarifying question returned"
fi

sleep "$SLEEP_BETWEEN_CHAT"


echo "Step 2 — Answer the clarifying question"
STEP2_FILE="$TMP_DIR/step2.json"
STEP2_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "It's an app where restaurants can manage their table reservations and waitlists in real time"}))
PY
)
STEP2_STATUS=$(request_json "POST" "$BASE_URL/chat" "$STEP2_PAYLOAD" "$STEP2_FILE")
if [[ "$STEP2_STATUS" == "200" ]]; then
  STEP2_OK=$($PYTHON_BIN - "$STEP2_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
message = (data.get("message") or "").strip()
is_final = data.get("is_final")
print("ok" if message and is_final is False else "bad")
PY
  )
  if [[ "$STEP2_OK" == "ok" ]]; then
    record_pass "Step 2: agent continues with clarifying or scope"
  else
    record_fail "Step 2: agent continues with clarifying or scope"
  fi
else
  record_fail "Step 2: agent continues with clarifying or scope"
fi

sleep "$SLEEP_BETWEEN_CHAT"


echo "Step 3 — Provide more detail"
STEP3_FILE="$TMP_DIR/step3.json"
STEP3_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({
  "session_id": sys.argv[1],
  "message": "Target users are small restaurant owners. Core features should be: table management, waitlist, real-time availability, basic reporting. Tech stack should be Next.js, FastAPI, PostgreSQL"
}))
PY
)
STEP3_STATUS=$(request_json "POST" "$BASE_URL/chat" "$STEP3_PAYLOAD" "$STEP3_FILE")
if [[ "$STEP3_STATUS" == "200" ]]; then
  STEP3_OK=$($PYTHON_BIN - "$STEP3_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
message = (data.get("message") or "").strip()
is_final = data.get("is_final")
print("ok" if message and is_final is False else "bad")
PY
  )
  if [[ "$STEP3_OK" == "ok" ]]; then
    record_pass "Step 3: agent converging toward PRD"
  else
    record_fail "Step 3: agent converging toward PRD"
  fi
else
  record_fail "Step 3: agent converging toward PRD"
fi

sleep "$SLEEP_BETWEEN_CHAT"


echo "Step 4 — Request finalization"
STEP4_FILE="$TMP_DIR/step4.json"
STEP4_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "That sounds good, please finalize the PRD now"}))
PY
)
STEP4_STATUS=$(request_json "POST" "$BASE_URL/chat" "$STEP4_PAYLOAD" "$STEP4_FILE")
if [[ "$STEP4_STATUS" == "200" ]]; then
  STEP4_OK=$($PYTHON_BIN - "$STEP4_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
prd = data.get("prd_draft") or {}
tech = prd.get("tech_stack") or {}
core = prd.get("core_features") or []
out_of_scope = prd.get("out_of_scope") or []
project_name = (prd.get("project_name") or "").strip()
frontend = (tech.get("frontend") or "").lower()
backend = (tech.get("backend") or "").lower()
checks = [
    data.get("is_final") is True,
    bool(prd),
    bool(project_name),
    isinstance(core, list) and len(core) > 0,
    "next" in frontend,
    "fast" in backend,
    isinstance(out_of_scope, list) and len(out_of_scope) > 0,
]
print("ok" if all(checks) else "bad")
print(json.dumps(prd, indent=2))
PY
  )
  STEP4_RESULT=$(echo "$STEP4_OK" | head -n 1)
  PRD_JSON=$(echo "$STEP4_OK" | tail -n +2)
  if [[ "$STEP4_RESULT" == "ok" ]]; then
    record_pass "Step 4: PRD finalized"
  else
    record_fail "Step 4: PRD finalized"
  fi
  echo "Full PRD:"
  echo "$PRD_JSON"
else
  record_fail "Step 4: PRD finalized"
fi


echo "Step 5 — Lock the session"
STEP5_FILE="$TMP_DIR/step5.json"
STEP5_STATUS=$(request_json "POST" "$BASE_URL/chat/$SESSION_ID/lock" "" "$STEP5_FILE")
if [[ "$STEP5_STATUS" == "200" ]]; then
  record_pass "Step 5: lock session returns 200"
else
  record_fail "Step 5: lock session returns 200"
fi


echo "Step 6 — Verify locked session rejects messages"
STEP6_FILE="$TMP_DIR/step6.json"
STEP6_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
import json
import sys
print(json.dumps({"session_id": sys.argv[1], "message": "actually add one more feature"}))
PY
)
STEP6_STATUS=$(request_json "POST" "$BASE_URL/chat" "$STEP6_PAYLOAD" "$STEP6_FILE")
if [[ "$STEP6_STATUS" == "400" ]]; then
  record_pass "Step 6: locked session returns 400"
else
  record_fail "Step 6: locked session returns 400"
fi


echo "Step 7 — Run generation"
GEN_PAYLOAD=$($PYTHON_BIN - "$SESSION_ID" <<'PY'
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
  -d "$GEN_PAYLOAD" | tee "$SSE_FILE"

STEP7_OK=$($PYTHON_BIN - "$SSE_FILE" <<'PY'
import json
import sys
required = {"prd", "architect", "scrum", "dag_validation", "saving", "complete"}

events = []
with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("data: "):
            events.append(json.loads(line[6:].strip()))

if not events:
    print("bad")
    sys.exit(0)

stages = {e.get("stage") for e in events}
missing = required - stages
final = events[-1]
if missing:
    print("bad")
    sys.exit(0)
if final.get("stage") != "complete" or final.get("status") != "success" or "project_id" not in final:
    print("bad")
    sys.exit(0)
print(final.get("project_id", ""))
PY
)
if [[ "$STEP7_OK" == "bad" || -z "$STEP7_OK" ]]; then
  record_fail "Step 7: generation SSE completes"
else
  PROJECT_ID="$STEP7_OK"
  record_pass "Step 7: generation SSE completes"
  echo "Project ID: $PROJECT_ID"
fi


echo "Step 8 — Verify generated project quality"
STEP8_FILE="$TMP_DIR/step8.json"
if [[ -n "$PROJECT_ID" ]]; then
  STEP8_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID" "" "$STEP8_FILE")
else
  STEP8_STATUS=""
fi
if [[ "$STEP8_STATUS" == "200" ]]; then
  STEP8_OK=$($PYTHON_BIN - "$STEP8_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
name = (data.get("name") or "").lower()
prd = data.get("prd_json") or {}
problem = (prd.get("problem_statement") or "").lower()
target = (prd.get("target_users") or "").lower()
features = prd.get("core_features") or []
diagrams = data.get("diagrams_json") or {}
diagram_list = diagrams.get("diagrams") if isinstance(diagrams, dict) else None
checks = [
  "restaurant" in name or "restaurant" in problem or "restaurant" in target,
    isinstance(features, list) and len(features) > 0,
    isinstance(diagram_list, list) and len(diagram_list) >= 2,
    (data.get("tasks_count") or 0) >= 10,
    (data.get("dependencies_count") or 0) >= 5,
]
print("ok" if all(checks) else "bad")
print("Project name:", data.get("name"))
print("Core features:", features)
print("Diagrams keys:", list(diagrams.keys()) if isinstance(diagrams, dict) else [])
print("Tasks count:", data.get("tasks_count"))
print("Dependencies count:", data.get("dependencies_count"))
PY
  )
  STEP8_RESULT=$(echo "$STEP8_OK" | head -n 1)
  STEP8_DETAILS=$(echo "$STEP8_OK" | tail -n +2)
  if [[ "$STEP8_RESULT" == "ok" ]]; then
    record_pass "Step 8: project quality checks"
  else
    record_fail "Step 8: project quality checks"
  fi
  echo "$STEP8_DETAILS"
else
  record_fail "Step 8: project quality checks"
fi


echo "Step 9 — Verify graph quality"
STEP9_FILE="$TMP_DIR/step9.json"
if [[ -n "$PROJECT_ID" ]]; then
  STEP9_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID/graph" "" "$STEP9_FILE")
else
  STEP9_STATUS=""
fi
if [[ "$STEP9_STATUS" == "200" ]]; then
  STEP9_OK=$($PYTHON_BIN - "$STEP9_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

nodes = data.get("nodes") or []
edges = data.get("edges") or []
print("ok" if len(nodes) >= 10 and len(edges) >= 5 else "bad")
print("Nodes:")
for node in nodes:
    print(f"- {node.get('title')}")
print("Edges:")
for edge in edges:
  print(f"- {edge.get('source')} -> {edge.get('target')}")
PY
  )
  STEP9_RESULT=$(echo "$STEP9_OK" | head -n 1)
  STEP9_DETAILS=$(echo "$STEP9_OK" | tail -n +2)
  if [[ "$STEP9_RESULT" == "ok" ]]; then
    record_pass "Step 9: graph quality checks"
  else
    record_fail "Step 9: graph quality checks"
  fi
  echo "$STEP9_DETAILS"
else
  record_fail "Step 9: graph quality checks"
fi


echo "Step 10 — Verify task status updates"
TASK_ID=$($PYTHON_BIN - "$STEP9_FILE" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
nodes = data.get("nodes") or []
print(nodes[0].get("id", "") if nodes else "")
PY
)

if [[ -n "$TASK_ID" ]]; then
  PATCH_FILE="$TMP_DIR/step10_patch.json"
  PATCH_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"in_progress"}' "$PATCH_FILE")
  if [[ "$PATCH_STATUS" == "200" ]]; then
    record_pass "Step 10: patch in_progress"
  else
    record_fail "Step 10: patch in_progress"
  fi

  PATCH_STATUS=$(request_json "PATCH" "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID" '{"status":"complete"}' "$PATCH_FILE")
  if [[ "$PATCH_STATUS" == "200" ]]; then
    record_pass "Step 10: patch complete"
  else
    record_fail "Step 10: patch complete"
  fi
else
  record_fail "Step 10: patch in_progress"
  record_fail "Step 10: patch complete"
fi


echo "SUMMARY"
echo "Total checks: $TOTAL"
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "Failed checks:"
  for check in "${FAILED_CHECKS[@]}"; do
    echo "- $check"
  done
fi

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

exit 0
