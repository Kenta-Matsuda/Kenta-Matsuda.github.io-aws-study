@echo off
setlocal enabledelayedexpansion

set "dir=c:\Users\lindb\OneDrive\ドキュメント\repos\Kenta-Matsuda.github.io-aws-study.worktrees\copilot-worktree-2026-03-20T05-42-28\js\data"
set passCount=0
set failCount=0

echo.
echo ========================================
echo Node Syntax Check Results
echo ========================================
echo.

for %%F in (clf-c02.js soa-c03.js dva-c02.js sap-c02.js dop-c02.js ans-c01.js scs-c03.js) do (
    echo File: %%F
    node --check "!dir!\%%F" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Status: PASS
        set /a passCount+=1
    ) else (
        echo Status: FAIL
        for /f "delims=" %%E in ('node --check "!dir!\%%F" 2^>^&1') do (
            echo Error: %%E
        )
        set /a failCount+=1
    )
    echo.
)

echo ========================================
echo Summary
echo ========================================
echo Total PASS: %passCount%
echo Total FAIL: %failCount%
