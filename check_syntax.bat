@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\lindb\OneDrive\ドキュメント\repos\Kenta-Matsuda.github.io-aws-study.worktrees\copilot-worktree-2026-03-20T05-42-28\js\data"

set "files=saa-c03.js clf-c02.js sap-c02.js ans-c01.js dva-c02.js soa-c03.js mla-c01.js dop-c02.js scs-c03.js aip-c01.js aif-c01.js dea-c01.js"

echo ===== JAVASCRIPT SYNTAX CHECK RESULTS =====
echo.

set /a passCount=0
set /a failCount=0

for %%F in (%files%) do (
    node --check "%%F" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [PASS] %%F
        set /a passCount+=1
    ) else (
        echo [FAIL] %%F
        set /a failCount+=1
        echo   Error:
        node --check "%%F" 2>&1 | findstr /V "^$"
        echo.
    )
)

echo.
echo ===== SUMMARY =====
echo Total Files Checked: %passCount% + %failCount% = %passCount+failCount%
echo Files Passed: %passCount%
echo Files Failed: %failCount%
