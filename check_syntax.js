const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = 'c:\\Users\\lindb\\OneDrive\\ドキュメント\\repos\\Kenta-Matsuda.github.io-aws-study.worktrees\\copilot-worktree-2026-03-20T05-42-28\\js\\data';
const files = ['clf-c02.js', 'soa-c03.js', 'dva-c02.js', 'sap-c02.js', 'dop-c02.js', 'ans-c01.js', 'scs-c03.js'];

let passCount = 0;
let failCount = 0;

console.log('\n========================================');
console.log('Node Syntax Check Results');
console.log('========================================\n');

for (const file of files) {
    const filePath = path.join(dir, file);
    console.log(`File: ${file}`);
    
    try {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        console.log('Status: PASS');
        passCount++;
    } catch (error) {
        console.log('Status: FAIL');
        console.log(`Error: ${error.stderr || error.stdout || error.message}`);
        failCount++;
    }
    console.log();
}

console.log('========================================');
console.log('Summary');
console.log('========================================');
console.log(`Total PASS: ${passCount}`);
console.log(`Total FAIL: ${failCount}`);
