#!/usr/bin/env bash
# TPI Scan — Git Pre-Commit Hook
#
# Installation:
#   cp pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Configuration (optional): create .tpi-scan.yml in project root
#   threshold: WARNING
#   patterns:
#     - "*.txt"
#     - "*.md"
#     - "*.json"
#     - "*.yml"
#     - "*.yaml"

set -euo pipefail

# Defaults
THRESHOLD="CRITICAL"
PATTERNS=("*.txt" "*.json" "*.md" "*.yml" "*.yaml")

# Load config if present
CONFIG_FILE=".tpi-scan.yml"
if [ -f "$CONFIG_FILE" ]; then
  # Parse threshold
  CFG_THRESHOLD=$(grep -E '^threshold:' "$CONFIG_FILE" | awk '{print $2}' | tr -d '"'"'" || true)
  if [ -n "$CFG_THRESHOLD" ]; then
    case "$CFG_THRESHOLD" in
      CRITICAL|WARNING|INFO) THRESHOLD="$CFG_THRESHOLD" ;;
      *) echo "[TPI Scan] Invalid threshold '${CFG_THRESHOLD}' in config, using default: CRITICAL" >&2 ;;
    esac
  fi

  # Parse patterns (simple YAML array parsing)
  CFG_PATTERNS=()
  IN_PATTERNS=false
  while IFS= read -r line; do
    if echo "$line" | grep -qE '^patterns:'; then
      IN_PATTERNS=true
      continue
    fi
    if [ "$IN_PATTERNS" = true ]; then
      if echo "$line" | grep -qE '^\s+-\s+'; then
        PATTERN=$(echo "$line" | sed 's/^\s*-\s*//' | tr -d '"'"'")
        CFG_PATTERNS+=("$PATTERN")
      else
        IN_PATTERNS=false
      fi
    fi
  done < "$CONFIG_FILE"

  if [ ${#CFG_PATTERNS[@]} -gt 0 ]; then
    PATTERNS=("${CFG_PATTERNS[@]}")
  fi
fi

# Collect staged files matching patterns
STAGED_FILES=()
for PATTERN in "${PATTERNS[@]}"; do
  while IFS= read -r file; do
    if [ -n "$file" ] && [ -f "$file" ]; then
      STAGED_FILES+=("$file")
    fi
  done < <(git diff --cached --name-only --diff-filter=ACM -- "$PATTERN" 2>/dev/null || true)
done

# Nothing to scan
if [ ${#STAGED_FILES[@]} -eq 0 ]; then
  exit 0
fi

echo "[TPI Scan] Scanning ${#STAGED_FILES[@]} staged file(s) (threshold: ${THRESHOLD})..."

# Scan each file
BLOCK=false
TOTAL_FINDINGS=0

for FILE in "${STAGED_FILES[@]}"; do
  RESULT=$(npx tpi-scan --file "$FILE" --format json --threshold "$THRESHOLD" 2>/dev/null || true)
  if [ -n "$RESULT" ]; then
    FINDINGS=$(echo "$RESULT" | node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        try{const r=JSON.parse(d);console.log(r.findings?.length??0)}
        catch{console.log(0)}
      })" 2>/dev/null || echo "0")
    VERDICT=$(echo "$RESULT" | node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        try{const r=JSON.parse(d);console.log(r.verdict??'ALLOW')}
        catch{console.log('ALLOW')}
      })" 2>/dev/null || echo "ALLOW")

    if [ "$FINDINGS" != "0" ]; then
      TOTAL_FINDINGS=$((TOTAL_FINDINGS + FINDINGS))
      echo "  ${FILE}: ${FINDINGS} finding(s) [${VERDICT}]"
    fi

    if [ "$VERDICT" = "BLOCK" ]; then
      BLOCK=true
    fi
  fi
done

if [ "$BLOCK" = true ]; then
  echo ""
  echo "[TPI Scan] BLOCKED: ${TOTAL_FINDINGS} finding(s) exceed ${THRESHOLD} threshold."
  echo "  Run 'npx tpi-scan --file <path>' for details."
  echo "  Use 'git commit --no-verify' to skip (not recommended)."
  exit 1
else
  if [ "$TOTAL_FINDINGS" -gt 0 ]; then
    echo "[TPI Scan] PASSED with ${TOTAL_FINDINGS} finding(s) below ${THRESHOLD} threshold."
  fi
  exit 0
fi
