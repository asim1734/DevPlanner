#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PROJECT_ID="${PROJECT_ID:-}"
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

echo "[1/4] Checking API health at $BASE_URL/health"
if ! curl -fsS "$BASE_URL/health" > /dev/null; then
  echo "ERROR: API is not reachable at $BASE_URL"
  echo "Start it first: cd backend && uvicorn main:app --reload --port 8000"
  exit 1
fi

echo "[2/4] Listing projects"
LIST_FILE="$TMP_DIR/list.json"
LIST_STATUS=$(request_json "GET" "$BASE_URL/projects" "" "$LIST_FILE")
if [[ "$LIST_STATUS" != "200" ]]; then
  echo "ERROR: /projects failed with status $LIST_STATUS"
  cat "$LIST_FILE"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID=$("$PYTHON_BIN" - "$LIST_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

if not data:
    print("")
else:
    print(data[0]["id"])
PY
  )
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: No projects found. Generate one first."
  echo "Run: ./scripts/test_phase12_generate.sh"
  exit 1
fi

echo "Using project_id: $PROJECT_ID"

echo "[3/4] Fetching project detail"
DETAIL_FILE="$TMP_DIR/detail.json"
DETAIL_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID" "" "$DETAIL_FILE")
if [[ "$DETAIL_STATUS" != "200" ]]; then
  echo "ERROR: /projects/$PROJECT_ID failed with status $DETAIL_STATUS"
  cat "$DETAIL_FILE"
  exit 1
fi

"$PYTHON_BIN" - "$DETAIL_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

missing = [key for key in ("id", "name", "prd_json", "tasks_count", "dependencies_count") if key not in data]
if missing:
    print("ERROR: Missing fields in project detail:", missing)
    sys.exit(1)

print("Project detail OK:", {"id": data["id"], "tasks_count": data["tasks_count"], "dependencies_count": data["dependencies_count"]})
PY

echo "[4/4] Fetching project graph"
GRAPH_FILE="$TMP_DIR/graph.json"
GRAPH_STATUS=$(request_json "GET" "$BASE_URL/projects/$PROJECT_ID/graph" "" "$GRAPH_FILE")
if [[ "$GRAPH_STATUS" != "200" ]]; then
  echo "ERROR: /projects/$PROJECT_ID/graph failed with status $GRAPH_STATUS"
  cat "$GRAPH_FILE"
  exit 1
fi

"$PYTHON_BIN" - "$GRAPH_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

if "nodes" not in data or "edges" not in data:
    print("ERROR: Graph payload missing nodes/edges")
    sys.exit(1)

print("Graph OK: nodes=", len(data["nodes"]), "edges=", len(data["edges"]))
PY

echo "Phase 13 project endpoints checks passed."
