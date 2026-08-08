import { DEA_C01 } from './js/data/dea-c01.js';

// Basic structure check
console.log('✓ File imported successfully');
console.log(`  Domains: ${DEA_C01.domains.length}`);

let totalTasks = 0;
let totalBlackbelts = 0;
let totalDocs = 0;

for (const domain of DEA_C01.domains) {
  console.log(`\n  Domain ${domain.id}: ${domain.jpTitle} (${domain.tasks.length} tasks)`);
  for (const task of domain.tasks) {
    totalTasks++;
    const bb = task.resources.find(r => r.key === 'blackbelts');
    const docs = task.resources.find(r => r.key === 'docs');
    const bbCount = bb ? bb.items.length : 0;
    const docsCount = docs ? docs.items.length : 0;
    totalBlackbelts += bbCount;
    totalDocs += docsCount;
    const bbStatus = bb ? `✓ ${bbCount} items` : '✗ MISSING';
    const docsStatus = docs ? `✓ ${docsCount} items` : '✗ MISSING';
    console.log(`    Task ${task.id}: blackbelts=${bbStatus}, docs=${docsStatus}`);
  }
}

console.log(`\n✓ Total: ${totalTasks} tasks, ${totalBlackbelts} blackbelt items, ${totalDocs} doc items`);
console.log('✓ No syntax errors detected');
