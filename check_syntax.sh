#!/bin/bash

DIR='C:/Users/lindb/OneDrive/ドキュメント/repos/Kenta-Matsuda.github.io-aws-study.worktrees/copilot-worktree-2026-03-20T05-42-28/js/data'

FILES=(
  "saa-c03.js"
  "clf-c02.js"
  "sap-c02.js"
  "ans-c01.js"
  "dva-c02.js"
  "soa-c03.js"
  "mla-c01.js"
  "dop-c02.js"
  "scs-c03.js"
  "aip-c01.js"
  "aif-c01.js"
  "dea-c01.js"
)

PASSED=0
FAILED=0

echo "=== JavaScript Syntax Check ==="
echo "Checking ${#FILES[@]} files in: $DIR"
echo ""

for file in "${FILES[@]}"
do
  if node --check "$DIR/$file" > /dev/null 2>&1; then
    echo "✓ $file - PASS"
    ((PASSED++))
  else
    echo "✗ $file - FAIL"
    node --check "$DIR/$file" 2>&1
    ((FAILED++))
  fi
done

echo ""
echo "=== SUMMARY ==="
echo "Total files checked: ${#FILES[@]}"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

exit $FAILED
