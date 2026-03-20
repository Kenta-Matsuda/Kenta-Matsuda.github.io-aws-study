const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, 'js', 'data');
const files = [
  'saa-c03.js',
  'clf-c02.js',
  'sap-c02.js',
  'ans-c01.js',
  'dva-c02.js',
  'soa-c03.js',
  'mla-c01.js',
  'dop-c02.js',
  'scs-c03.js',
  'aip-c01.js',
  'aif-c01.js',
  'dea-c01.js'
];

const passed = [];
const failed = [];

console.log('=== JavaScript Syntax Check ===');
console.log(`Checking ${files.length} files in: ${dir}\n`);

files.forEach(file => {
  const filePath = path.join(dir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`✗ ${file} - FILE NOT FOUND`);
    failed.push(file);
    return;
  }
  
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    console.log(`✓ ${file} - PASS`);
    passed.push(file);
  } catch (error) {
    console.log(`✗ ${file} - FAIL`);
    console.log(`  Error: ${error.message}`);
    failed.push(file);
  }
});

console.log('\n=== SUMMARY ===');
console.log(`Total files checked: ${files.length}`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);

if (passed.length > 0) {
  console.log('\n✓ PASSING FILES:');
  passed.forEach(f => console.log(`  - ${f}`));
}

if (failed.length > 0) {
  console.log('\n✗ FAILING FILES:');
  failed.forEach(f => console.log(`  - ${f}`));
}

process.exit(failed.length > 0 ? 1 : 0);
