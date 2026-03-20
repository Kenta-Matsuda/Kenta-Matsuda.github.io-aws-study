#!/usr/bin/env python3
import subprocess
import sys
import os

# Set the directory path
dir_path = r"C:\Users\lindb\OneDrive\ドキュメント\repos\Kenta-Matsuda.github.io-aws-study.worktrees\copilot-worktree-2026-03-20T05-42-28\js\data"

# List of files to check
files = [
    "saa-c03.js",
    "clf-c02.js",
    "sap-c02.js",
    "ans-c01.js",
    "dva-c02.js",
    "soa-c03.js",
    "mla-c01.js",
    "dop-c02.js",
    "scs-c03.js",
    "aip-c01.js",
    "aif-c01.js",
    "dea-c01.js"
]

passed = []
failed = []
failed_details = []

print("=== JavaScript Syntax Check ===")
print(f"Checking {len(files)} files in: {dir_path}\n")

for file in files:
    file_path = os.path.join(dir_path, file)
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"✗ {file} - FILE NOT FOUND")
        failed.append(file)
        failed_details.append((file, "FILE NOT FOUND"))
        continue
    
    # Run node --check
    try:
        result = subprocess.run(
            ["node", "--check", file_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print(f"✓ {file} - PASS")
            passed.append(file)
        else:
            print(f"✗ {file} - FAIL")
            error_msg = result.stderr or result.stdout
            print(f"  Error: {error_msg.strip()}")
            failed.append(file)
            failed_details.append((file, error_msg.strip()))
    except subprocess.TimeoutExpired:
        print(f"✗ {file} - TIMEOUT")
        failed.append(file)
        failed_details.append((file, "TIMEOUT"))
    except Exception as e:
        print(f"✗ {file} - ERROR: {str(e)}")
        failed.append(file)
        failed_details.append((file, str(e)))

# Summary
print("\n=== SUMMARY ===")
print(f"Total files checked: {len(files)}")
print(f"Passed: {len(passed)}")
print(f"Failed: {len(failed)}")

if passed:
    print(f"\n✓ PASSING FILES ({len(passed)}):")
    for f in passed:
        print(f"  - {f}")

if failed:
    print(f"\n✗ FAILING FILES ({len(failed)}):")
    for f in failed:
        print(f"  - {f}")
    print("\nDETAILS:")
    for file, error in failed_details:
        print(f"  {file}: {error}")

sys.exit(1 if failed else 0)
